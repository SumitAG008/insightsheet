"""
FastAPI Backend for InsightSheet-lite
Privacy-first data analysis platform with ZERO data storage
"""
from fastapi import FastAPI, HTTPException, Depends, UploadFile, File, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, JSONResponse
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from pydantic import BaseModel, EmailStr
from typing import Optional, Dict, Any, List
from datetime import timedelta, datetime
import os
import logging
from logging.handlers import RotatingFileHandler
import io
import secrets

from dotenv import load_dotenv
from sqlalchemy.orm import Session

# Import local modules
from app.database import get_db, User, Subscription, LoginHistory, UserActivity, FileProcessingHistory, init_db
from app.utils.auth import (
    authenticate_user, create_access_token, get_current_user, get_current_admin_user,
    get_password_hash, ACCESS_TOKEN_EXPIRE_MINUTES
)
from app.services.ai_service import (
    invoke_llm, generate_image, generate_formula, analyze_data, suggest_chart_type
)
from app.services.zip_processor import ZipProcessorService
from app.services.excel_to_ppt import ExcelToPPTService

load_dotenv()

# Logging configuration
LOG_DIR = "logs"
os.makedirs(LOG_DIR, exist_ok=True)

formatter = logging.Formatter(
    '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

file_handler = RotatingFileHandler(
    os.path.join(LOG_DIR, 'app.log'),
    maxBytes=10485760,  # 10MB
    backupCount=5
)
file_handler.setFormatter(formatter)

logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)
logger.addHandler(file_handler)

# Initialize FastAPI app
app = FastAPI(
    title="InsightSheet-lite Backend",
    description="Privacy-first data analysis platform with AI-powered insights",
    version="1.0.0"
)

# CORS Configuration - Allow ALL origins for development
# CRITICAL: This MUST be the first middleware added
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins
    allow_credentials=False,  # Must be False when using allow_origins=["*"]
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"]
)

logger.info("CORS middleware configured with allow_origins=['*']")

# Initialize database on startup
@app.on_event("startup")
async def startup_event():
    """Initialize database tables on startup"""
    init_db()
    logger.info("Database initialized")


# Pydantic Models
class UserRegister(BaseModel):
    email: EmailStr
    password: str
    full_name: Optional[str] = None


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class LLMRequest(BaseModel):
    prompt: str
    add_context_from_internet: bool = False
    response_json_schema: Optional[Dict[str, Any]] = None


class ImageGenerationRequest(BaseModel):
    prompt: str
    size: str = "1024x1024"


class FormulaRequest(BaseModel):
    description: str
    context: Optional[str] = None


class DataAnalysisRequest(BaseModel):
    data_summary: str
    question: Optional[str] = None


class ChartSuggestionRequest(BaseModel):
    columns: List[Dict[str, str]]
    data_preview: Optional[List[Dict]] = None


class ZipProcessingOptions(BaseModel):
    allowed_chars: Optional[str] = None
    disallowed_chars: Optional[str] = None
    replace_char: str = "_"
    remove_spaces: bool = False
    max_length: int = 255
    languages: Optional[List[str]] = None


class ActivityLog(BaseModel):
    activity_type: str
    page_name: Optional[str] = None
    details: Optional[str] = None


# ============================================================================
# CORS TEST ENDPOINT
# ============================================================================

@app.get("/api/cors-test")
async def cors_test():
    """Simple endpoint to test CORS configuration"""
    return {
        "message": "CORS is working!",
        "cors_configured": True,
        "timestamp": datetime.utcnow().isoformat()
    }

@app.options("/api/auth/register")
async def register_options():
    """Handle OPTIONS preflight for register endpoint"""
    return JSONResponse(content={}, status_code=200)

@app.options("/api/auth/login")
async def login_options():
    """Handle OPTIONS preflight for login endpoint"""
    return JSONResponse(content={}, status_code=200)

# ============================================================================
# AUTHENTICATION ENDPOINTS
# ============================================================================

@app.post("/api/auth/register")
async def register(user_data: UserRegister, db: Session = Depends(get_db)):
    """Register new user"""
    try:
        # Check if user exists
        existing_user = db.query(User).filter(User.email == user_data.email).first()
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )

        # Create new user
        hashed_password = get_password_hash(user_data.password)
        new_user = User(
            email=user_data.email,
            full_name=user_data.full_name,
            hashed_password=hashed_password,
            role="admin" if user_data.email == "sumitagaria@gmail.com" else "user"
        )

        db.add(new_user)
        db.commit()
        db.refresh(new_user)

        # Create free subscription
        subscription = Subscription(
            user_email=user_data.email,
            plan="free",
            status="active",
            ai_queries_limit=5,
            ai_queries_used=0
        )
        db.add(subscription)
        db.commit()

        logger.info(f"New user registered: {user_data.email}")

        return {
            "message": "User registered successfully",
            "email": new_user.email
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Registration error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Registration failed"
        )


@app.post("/api/auth/login")
async def login(user_data: UserLogin, request: Request, db: Session = Depends(get_db)):
    """Login user and return JWT token"""
    try:
        # Authenticate user
        user = authenticate_user(db, user_data.email, user_data.password)

        if not user:
            # Log failed login
            login_history = LoginHistory(
                user_email=user_data.email,
                event_type="failed_login",
                ip_address=request.client.host
            )
            db.add(login_history)
            db.commit()

            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect email or password"
            )

        # Create access token
        access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = create_access_token(
            data={"sub": user.email, "role": user.role},
            expires_delta=access_token_expires
        )

        # Log successful login
        login_history = LoginHistory(
            user_email=user.email,
            event_type="login",
            ip_address=request.client.host
        )
        db.add(login_history)
        db.commit()

        logger.info(f"User logged in: {user.email}")

        return {
            "access_token": access_token,
            "token_type": "bearer",
            "user": {
                "email": user.email,
                "full_name": user.full_name,
                "role": user.role
            }
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Login error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Login failed"
        )


@app.get("/api/auth/me")
async def get_me(current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    """Get current user info"""
    user = db.query(User).filter(User.email == current_user["email"]).first()
    return {
        "id": user.id,
        "email": user.email,
        "full_name": user.full_name,
        "role": user.role,
        "created_date": user.created_date
    }


@app.post("/api/auth/forgot-password")
async def forgot_password(email: EmailStr, db: Session = Depends(get_db)):
    """Request password reset email"""
    try:
        # Find user
        user = db.query(User).filter(User.email == email).first()

        if not user:
            # Don't reveal if email exists - return success anyway
            return {"message": "If the email exists, a reset link has been sent"}

        # Generate reset token
        reset_token = secrets.token_urlsafe(32)
        reset_token_expires = datetime.utcnow() + timedelta(hours=1)

        # Update user
        user.reset_token = reset_token
        user.reset_token_expires = reset_token_expires
        db.commit()

        # In production, send email here
        # For now, just log the token (REMOVE IN PRODUCTION!)
        reset_url = f"http://localhost:5173/reset-password?token={reset_token}"
        logger.info(f"Password reset requested for {email}")
        logger.info(f"Reset URL: {reset_url}")

        # TODO: Send email with reset_url
        # For development, return the URL (REMOVE IN PRODUCTION!)
        return {
            "message": "If the email exists, a reset link has been sent",
            "reset_url": reset_url  # REMOVE IN PRODUCTION!
        }

    except Exception as e:
        logger.error(f"Error in forgot password: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to process request"
        )


@app.post("/api/auth/reset-password")
async def reset_password(
    token: str,
    new_password: str,
    db: Session = Depends(get_db)
):
    """Reset password with token"""
    try:
        # Find user with valid token
        user = db.query(User).filter(
            User.reset_token == token,
            User.reset_token_expires > datetime.utcnow()
        ).first()

        if not user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid or expired reset token"
            )

        # Update password
        user.hashed_password = get_password_hash(new_password)
        user.reset_token = None
        user.reset_token_expires = None
        db.commit()

        logger.info(f"Password reset successful for {user.email}")

        return {"message": "Password reset successful"}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error resetting password: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to reset password"
        )


# ============================================================================
# AI/LLM ENDPOINTS
# ============================================================================

@app.post("/api/integrations/llm/invoke")
async def invoke_llm_endpoint(
    request: LLMRequest,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Invoke LLM for data analysis
    ZERO STORAGE: Prompt NOT stored, response NOT stored
    """
    try:
        # Check subscription and limits
        subscription = db.query(Subscription).filter(
            Subscription.user_email == current_user["email"]
        ).first()

        if not subscription:
            raise HTTPException(status_code=404, detail="Subscription not found")

        # Check AI query limit (unlimited for premium)
        if subscription.plan != "premium":
            if subscription.ai_queries_used >= subscription.ai_queries_limit:
                raise HTTPException(
                    status_code=429,
                    detail=f"AI query limit reached. Upgrade to Premium for unlimited queries."
                )

        # Invoke LLM
        response = await invoke_llm(
            prompt=request.prompt,
            add_context=request.add_context_from_internet,
            response_schema=request.response_json_schema
        )

        # Update usage (only if not premium)
        if subscription.plan != "premium":
            subscription.ai_queries_used += 1
            db.commit()

        # Log activity (NO content stored)
        activity = UserActivity(
            user_email=current_user["email"],
            activity_type="ai_query",
            page_name="llm_invoke"
        )
        db.add(activity)
        db.commit()

        logger.info(f"LLM invoked by {current_user['email']}")

        return {"response": response}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"LLM invocation error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/integrations/image/generate")
async def generate_image_endpoint(
    request: ImageGenerationRequest,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Generate image using DALL-E"""
    try:
        # Check subscription
        subscription = db.query(Subscription).filter(
            Subscription.user_email == current_user["email"]
        ).first()

        if subscription.plan != "premium":
            raise HTTPException(
                status_code=403,
                detail="Image generation is a Premium feature"
            )

        # Generate image
        image_url = await generate_image(request.prompt, request.size)

        # Log activity
        activity = UserActivity(
            user_email=current_user["email"],
            activity_type="image_generation"
        )
        db.add(activity)
        db.commit()

        return {"image_url": image_url}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Image generation error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/ai/formula")
async def generate_formula_endpoint(
    request: FormulaRequest,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Generate Excel formula from description"""
    try:
        formula_data = await generate_formula(request.description, request.context)

        # Log activity
        activity = UserActivity(
            user_email=current_user["email"],
            activity_type="formula_generation"
        )
        db.add(activity)
        db.commit()

        return formula_data

    except Exception as e:
        logger.error(f"Formula generation error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/ai/analyze")
async def analyze_data_endpoint(
    request: DataAnalysisRequest,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Analyze data and provide insights"""
    try:
        analysis = await analyze_data(request.data_summary, request.question)

        # Log activity
        activity = UserActivity(
            user_email=current_user["email"],
            activity_type="data_analysis"
        )
        db.add(activity)
        db.commit()

        return analysis

    except Exception as e:
        logger.error(f"Data analysis error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/ai/suggest-chart")
async def suggest_chart_endpoint(
    request: ChartSuggestionRequest,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Suggest best chart type for data"""
    try:
        suggestion = await suggest_chart_type(request.columns, request.data_preview)

        # Log activity
        activity = UserActivity(
            user_email=current_user["email"],
            activity_type="chart_suggestion"
        )
        db.add(activity)
        db.commit()

        return suggestion

    except Exception as e:
        logger.error(f"Chart suggestion error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# FILE PROCESSING ENDPOINTS
# ============================================================================

@app.post("/api/files/excel-to-ppt")
async def excel_to_ppt(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Convert Excel file to PowerPoint
    ZERO STORAGE: File content NOT stored, only processing history
    """
    try:
        # Check file size based on subscription
        subscription = db.query(Subscription).filter(
            Subscription.user_email == current_user["email"]
        ).first()

        max_size_mb = 500 if subscription and subscription.plan == "premium" else 10
        max_size_bytes = max_size_mb * 1024 * 1024

        # Read file size
        file_content = await file.read()
        file_size_mb = len(file_content) / (1024 * 1024)

        if len(file_content) > max_size_bytes:
            raise HTTPException(
                status_code=413,
                detail=f"File size ({file_size_mb:.1f}MB) exceeds {max_size_mb}MB limit"
            )

        # Validate file type
        if not file.filename.endswith(('.xlsx', '.xls', '.csv')):
            raise HTTPException(status_code=400, detail="Invalid file type")

        # Convert to PPT
        ppt_service = ExcelToPPTService()
        ppt_data = await ppt_service.convert_excel_to_ppt(
            io.BytesIO(file_content),
            file.filename
        )

        # Log processing history (NO file content)
        processing_history = FileProcessingHistory(
            user_email=current_user["email"],
            processing_type="excel_to_ppt",
            original_filename=file.filename,
            file_size_mb=file_size_mb,
            status="success"
        )
        db.add(processing_history)
        db.commit()

        logger.info(f"Excel to PPT conversion: {file.filename} by {current_user['email']}")

        # Return file as download
        return StreamingResponse(
            io.BytesIO(ppt_data),
            media_type="application/vnd.openxmlformats-officedocument.presentationml.presentation",
            headers={
                "Content-Disposition": f"attachment; filename={file.filename.replace('.xlsx', '').replace('.xls', '')}_presentation.pptx"
            }
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Excel to PPT error: {str(e)}")

        # Log failed processing
        processing_history = FileProcessingHistory(
            user_email=current_user["email"],
            processing_type="excel_to_ppt",
            original_filename=file.filename,
            file_size_mb=file_size_mb if 'file_size_mb' in locals() else 0,
            status="failed",
            error_message=str(e)
        )
        db.add(processing_history)
        db.commit()

        raise HTTPException(status_code=500, detail=f"Conversion failed: {str(e)}")


@app.post("/api/files/process-zip")
async def process_zip(
    file: UploadFile = File(...),
    options: str = None,  # JSON string of options
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Process ZIP file with filename cleaning
    ZERO STORAGE: File content NOT stored
    """
    try:
        import json

        # Check file size
        subscription = db.query(Subscription).filter(
            Subscription.user_email == current_user["email"]
        ).first()

        max_size_mb = 500 if subscription and subscription.plan == "premium" else 10
        max_size_bytes = max_size_mb * 1024 * 1024

        file_content = await file.read()
        file_size_mb = len(file_content) / (1024 * 1024)

        if len(file_content) > max_size_bytes:
            raise HTTPException(
                status_code=413,
                detail=f"File size ({file_size_mb:.1f}MB) exceeds {max_size_mb}MB limit"
            )

        # Validate file type
        if not file.filename.endswith('.zip'):
            raise HTTPException(status_code=400, detail="Invalid file type. Please upload a ZIP file.")

        # Parse options
        processing_options = json.loads(options) if options else {}

        # Get language replacements
        zip_service = ZipProcessorService()
        languages = processing_options.get('languages', [])
        language_replacements = zip_service.get_language_replacements(languages)

        # Update options with language replacements
        processing_options['language_replacements'] = language_replacements

        # Process ZIP
        processed_data = await zip_service.process_zip(io.BytesIO(file_content), processing_options)

        # Log processing history
        processing_history = FileProcessingHistory(
            user_email=current_user["email"],
            processing_type="zip_cleaning",
            original_filename=file.filename,
            file_size_mb=file_size_mb,
            status="success"
        )
        db.add(processing_history)
        db.commit()

        logger.info(f"ZIP processing: {file.filename} by {current_user['email']}")

        # Return processed ZIP
        output_filename = f"processed_{secrets.token_hex(4)}.zip"
        return StreamingResponse(
            io.BytesIO(processed_data),
            media_type="application/zip",
            headers={
                "Content-Disposition": f"attachment; filename={output_filename}"
            }
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"ZIP processing error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Processing failed: {str(e)}")


# ============================================================================
# SUBSCRIPTION ENDPOINTS
# ============================================================================

@app.get("/api/subscriptions/me")
async def get_my_subscription(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get current user's subscription"""
    subscription = db.query(Subscription).filter(
        Subscription.user_email == current_user["email"]
    ).first()

    if not subscription:
        # Create free subscription if doesn't exist
        subscription = Subscription(
            user_email=current_user["email"],
            plan="free",
            status="active",
            ai_queries_limit=5,
            ai_queries_used=0
        )
        db.add(subscription)
        db.commit()
        db.refresh(subscription)

    return {
        "id": subscription.id,
        "user_email": subscription.user_email,
        "plan": subscription.plan,
        "status": subscription.status,
        "ai_queries_used": subscription.ai_queries_used,
        "ai_queries_limit": subscription.ai_queries_limit,
        "files_uploaded": subscription.files_uploaded,
        "payment_status": subscription.payment_status,
        "created_date": subscription.created_date
    }


@app.post("/api/subscriptions/upgrade")
async def upgrade_subscription(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Upgrade to premium (simplified - integrate Stripe for real payments)"""
    subscription = db.query(Subscription).filter(
        Subscription.user_email == current_user["email"]
    ).first()

    if subscription:
        subscription.plan = "premium"
        subscription.ai_queries_limit = -1  # Unlimited
        subscription.payment_status = "paid"
        subscription.subscription_start_date = datetime.utcnow()
        db.commit()

    return {"message": "Subscription upgraded to Premium"}


# ============================================================================
# ACTIVITY & ANALYTICS ENDPOINTS
# ============================================================================

@app.post("/api/activity/log")
async def log_activity(
    activity: ActivityLog,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Log user activity"""
    try:
        user_activity = UserActivity(
            user_email=current_user["email"],
            activity_type=activity.activity_type,
            page_name=activity.page_name,
            details=activity.details
        )
        db.add(user_activity)
        db.commit()

        return {"message": "Activity logged"}

    except Exception as e:
        logger.error(f"Activity logging error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to log activity")


@app.get("/api/activity/history")
async def get_activity_history(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
    limit: int = 50
):
    """Get user's activity history"""
    activities = db.query(UserActivity).filter(
        UserActivity.user_email == current_user["email"]
    ).order_by(UserActivity.created_date.desc()).limit(limit).all()

    return [
        {
            "id": a.id,
            "activity_type": a.activity_type,
            "page_name": a.page_name,
            "details": a.details,
            "created_date": a.created_date
        }
        for a in activities
    ]


# ============================================================================
# ADMIN ENDPOINTS
# ============================================================================

@app.get("/api/admin/users")
async def get_all_users(
    current_user: dict = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """Get all users (admin only)"""
    users = db.query(User).all()
    return [
        {
            "id": u.id,
            "email": u.email,
            "full_name": u.full_name,
            "role": u.role,
            "is_active": u.is_active,
            "created_date": u.created_date
        }
        for u in users
    ]


@app.get("/api/admin/subscriptions")
async def get_all_subscriptions(
    current_user: dict = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """Get all subscriptions (admin only)"""
    subscriptions = db.query(Subscription).all()
    return [
        {
            "id": s.id,
            "user_email": s.user_email,
            "plan": s.plan,
            "status": s.status,
            "ai_queries_used": s.ai_queries_used,
            "ai_queries_limit": s.ai_queries_limit,
            "created_date": s.created_date
        }
        for s in subscriptions
    ]


# ============================================================================
# HEALTH CHECK
# ============================================================================

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "InsightSheet-lite Backend",
        "version": "1.0.0",
        "timestamp": datetime.utcnow().isoformat()
    }


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "InsightSheet-lite Backend API",
        "version": "1.0.0",
        "docs": "/docs",
        "health": "/health"
    }


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", "8000"))
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=port,
        reload=True
    )
