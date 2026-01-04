"""
FastAPI Main Application for InsightSheet-lite (Meldra)
Privacy-first data analysis platform with AI-powered insights
"""

import os
import logging
from typing import Optional, List
from datetime import datetime, timedelta
from io import BytesIO

from fastapi import FastAPI, Depends, HTTPException, status, UploadFile, File, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, JSONResponse
from fastapi.security import HTTPBearer
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database import get_db, User, Subscription, LoginHistory, UserActivity, FileProcessingHistory, Review, init_db
from app.utils.auth import (
    authenticate_user, create_access_token, get_current_user, get_current_admin_user,
    get_password_hash, verify_password
)
from app.services.ai_service import invoke_llm, generate_image, generate_formula, analyze_data, suggest_chart_type
from app.services.excel_to_ppt import ExcelToPPTService
from app.services.zip_processor import ZipProcessorService
from app.services.pl_builder import PLBuilderService
from app.services.file_analyzer import FileAnalyzerService
from app.services.excel_builder import ExcelBuilderService

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(
    title="InsightSheet-lite API",
    description="Privacy-first data analysis platform with AI-powered insights",
    version="1.0.0"
)

# CORS Middleware
CORS_ORIGINS = os.getenv("CORS_ORIGINS", "http://localhost:5173,http://localhost:3000,https://meldra.ai,https://www.meldra.ai").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# HTTP Bearer security
security = HTTPBearer()

# Startup event
@app.on_event("startup")
async def startup_event():
    """Initialize database on startup"""
    try:
        init_db()
        logger.info("Database initialized successfully")
    except Exception as e:
        logger.error(f"Database initialization error: {str(e)}")


# ============================================================================
# PYDANTIC MODELS
# ============================================================================

class UserRegister(BaseModel):
    email: EmailStr
    password: str
    full_name: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserUpdate(BaseModel):
    full_name: Optional[str] = None

class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str

class LLMRequest(BaseModel):
    prompt: str
    add_context_from_internet: bool = False
    response_json_schema: Optional[dict] = None

class ImageGenerateRequest(BaseModel):
    prompt: str
    size: str = "1024x1024"

class FormulaRequest(BaseModel):
    description: str
    context: Optional[str] = None

class AnalyzeRequest(BaseModel):
    data_summary: str
    question: str

class ChartSuggestRequest(BaseModel):
    columns: List[dict]
    data_preview: List[dict]

class PLGenerationRequest(BaseModel):
    prompt: str
    company_name: str = "Company"
    currency: str = "USD"
    period_type: str = "monthly"

class ExcelBuildRequest(BaseModel):
    prompt: str
    include_formulas: bool = True
    include_charts: bool = True

class ReviewCreate(BaseModel):
    rating: int  # 1-5
    title: Optional[str] = None
    comment: str
    feature_rated: Optional[str] = None

class ReviewUpdate(BaseModel):
    helpful: Optional[bool] = None

class ActivityLogRequest(BaseModel):
    activity_type: str
    page_name: str
    details: Optional[str] = None


# ============================================================================
# AUTHENTICATION ENDPOINTS
# ============================================================================

@app.post("/api/auth/register")
async def register(user_data: UserRegister, db: Session = Depends(get_db)):
    """Register a new user"""
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
            role="user",
            is_active=True
        )

        db.add(new_user)
        db.commit()
        db.refresh(new_user)

        # Create free subscription
        subscription = Subscription(
            user_id=new_user.id,
            plan_type="free",
            status="active"
        )
        db.add(subscription)
        db.commit()

        logger.info(f"User registered: {user_data.email}")

        return {
            "message": "Registration successful",
            "user": {
                "email": new_user.email,
                "full_name": new_user.full_name
            }
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
        from app.utils.auth import ACCESS_TOKEN_EXPIRE_MINUTES
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
async def forgot_password(request: ForgotPasswordRequest, db: Session = Depends(get_db)):
    """Request password reset email"""
    try:
        # Find user
        user = db.query(User).filter(User.email == request.email).first()
        if not user:
            # Don't reveal if user exists
            return {"message": "If the email exists, a password reset link has been sent"}

        # Generate reset token (simplified - in production, use proper token generation)
        reset_token = create_access_token(data={"sub": user.email, "type": "password_reset"}, expires_delta=timedelta(hours=1))

        # TODO: Send email with reset link
        # For now, just log it
        logger.info(f"Password reset requested for {user.email}, token: {reset_token[:20]}...")

        return {"message": "If the email exists, a password reset link has been sent"}
    except Exception as e:
        logger.error(f"Forgot password error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to process request")


@app.post("/api/auth/reset-password")
async def reset_password(request: ResetPasswordRequest, db: Session = Depends(get_db)):
    """Reset password with token"""
    try:
        from app.utils.auth import decode_token
        
        # Decode token
        payload = decode_token(request.reset_token)
        if payload.get("type") != "password_reset":
            raise HTTPException(status_code=400, detail="Invalid token")

        # Find user
        user = db.query(User).filter(User.email == payload["sub"]).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        # Update password
        user.hashed_password = get_password_hash(request.new_password)
        db.commit()

        return {"message": "Password reset successful"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Reset password error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to reset password")


# ============================================================================
# AI/LLM ENDPOINTS
# ============================================================================

@app.post("/api/integrations/llm/invoke")
async def invoke_llm_endpoint(
    request: LLMRequest,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Invoke LLM for data analysis"""
    try:
        response = await invoke_llm(
            prompt=request.prompt,
            add_context=request.add_context_from_internet,
            response_schema=request.response_json_schema
        )
        return {"response": response}
    except Exception as e:
        logger.error(f"LLM invoke error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/integrations/image/generate")
async def generate_image_endpoint(
    request: ImageGenerateRequest,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Generate image using DALL-E"""
    try:
        # Check subscription
        user = db.query(User).filter(User.email == current_user["email"]).first()
        subscription = db.query(Subscription).filter(Subscription.user_id == user.id).first()
        
        if subscription and subscription.plan_type != "premium":
            raise HTTPException(status_code=403, detail="Image generation requires Premium plan")

        image_url = await generate_image(prompt=request.prompt, size=request.size)
        return {"image_url": image_url}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Image generation error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/ai/formula")
async def generate_formula_endpoint(
    request: FormulaRequest,
    current_user: dict = Depends(get_current_user)
):
    """Generate Excel formula from description"""
    try:
        formula = await generate_formula(request.description, request.context)
        return {"formula": formula}
    except Exception as e:
        logger.error(f"Formula generation error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/ai/analyze")
async def analyze_data_endpoint(
    request: AnalyzeRequest,
    current_user: dict = Depends(get_current_user)
):
    """Analyze data and answer questions"""
    try:
        analysis = await analyze_data(request.data_summary, request.question)
        return {"analysis": analysis}
    except Exception as e:
        logger.error(f"Data analysis error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/ai/suggest-chart")
async def suggest_chart_endpoint(
    request: ChartSuggestRequest,
    current_user: dict = Depends(get_current_user)
):
    """Suggest chart type based on data"""
    try:
        chart_type = await suggest_chart_type(request.columns, request.data_preview)
        return {"chart_type": chart_type}
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
    """Convert Excel/CSV/PDF to PowerPoint"""
    try:
        # Read file
        file_content = await file.read()
        
        # Process
        service = ExcelToPPTService()
        ppt_bytes = await service.convert_to_ppt(file_content, file.filename)
        
        # Log processing
        user = db.query(User).filter(User.email == current_user["email"]).first()
        processing_log = FileProcessingHistory(
            user_id=user.id,
            processing_type="excel_to_ppt",
            original_filename=file.filename,
            file_size_mb=len(file_content) / (1024 * 1024)
        )
        db.add(processing_log)
        db.commit()

        return StreamingResponse(
            BytesIO(ppt_bytes),
            media_type="application/vnd.openxmlformats-officedocument.presentationml.presentation",
            headers={"Content-Disposition": f'attachment; filename="{file.filename.replace(".xlsx", "").replace(".xls", "").replace(".csv", "").replace(".pdf", "")}.pptx"'}
        )
    except Exception as e:
        logger.error(f"Excel to PPT error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/files/process-zip")
async def process_zip(
    file: UploadFile = File(...),
    options: Optional[str] = None,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Process ZIP file - clean and rename files"""
    try:
        import json
        
        file_content = await file.read()
        zip_options = json.loads(options) if options else {}
        
        service = ZipProcessorService()
        processed_zip = await service.process_zip(file_content, zip_options)
        
        # Log processing
        user = db.query(User).filter(User.email == current_user["email"]).first()
        processing_log = FileProcessingHistory(
            user_id=user.id,
            processing_type="zip_processing",
            original_filename=file.filename,
            file_size_mb=len(file_content) / (1024 * 1024)
        )
        db.add(processing_log)
        db.commit()

        return StreamingResponse(
            BytesIO(processed_zip),
            media_type="application/zip",
            headers={"Content-Disposition": f'attachment; filename="processed_{file.filename}"'}
        )
    except Exception as e:
        logger.error(f"ZIP processing error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/files/generate-pl")
async def generate_pl(
    request: PLGenerationRequest,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Generate P&L Excel file from natural language"""
    try:
        service = PLBuilderService()
        excel_bytes = await service.generate_pl(
            prompt=request.prompt,
            company_name=request.company_name,
            currency=request.currency,
            period_type=request.period_type
        )

        return StreamingResponse(
            BytesIO(excel_bytes),
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": f'attachment; filename="P&L_{request.company_name}.xlsx"'}
        )
    except Exception as e:
        logger.error(f"P&L generation error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/files/analyze-file")
async def analyze_file(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    """Analyze uploaded Excel/CSV file using AI"""
    try:
        file_content = await file.read()
        service = FileAnalyzerService()
        analysis = await service.analyze_file(file_content, file.filename)
        return analysis
    except Exception as e:
        logger.error(f"File analysis error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/files/build-excel")
async def build_excel(
    request: ExcelBuildRequest,
    current_user: dict = Depends(get_current_user)
):
    """Build complex Excel file with formulas and charts"""
    try:
        service = ExcelBuilderService()
        excel_bytes = await service.build_excel(
            prompt=request.prompt,
            include_formulas=request.include_formulas,
            include_charts=request.include_charts
        )

        return StreamingResponse(
            BytesIO(excel_bytes),
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": 'attachment; filename="generated_spreadsheet.xlsx"'}
        )
    except Exception as e:
        logger.error(f"Excel build error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# REVIEW ENDPOINTS
# ============================================================================

@app.post("/api/reviews")
async def create_review(
    review_data: ReviewCreate,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a customer review"""
    try:
        # Validate rating
        if review_data.rating < 1 or review_data.rating > 5:
            raise HTTPException(status_code=400, detail="Rating must be between 1 and 5")
        
        # Create review
        new_review = Review(
            user_email=current_user["email"],
            user_name=current_user.get("full_name", current_user["email"]),
            rating=review_data.rating,
            title=review_data.title,
            comment=review_data.comment,
            feature_rated=review_data.feature_rated,
            is_approved=False  # Requires moderation
        )
        
        db.add(new_review)
        db.commit()
        db.refresh(new_review)
        
        logger.info(f"Review created by {current_user['email']}")
        
        return {
            "message": "Review submitted successfully. It will be published after moderation.",
            "review": new_review.to_dict()
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Review creation error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to create review")


@app.get("/api/reviews")
async def get_reviews(
    feature: Optional[str] = None,
    approved_only: bool = True,
    limit: int = 50,
    db: Session = Depends(get_db)
):
    """Get reviews (public endpoint)"""
    try:
        query = db.query(Review)
        
        if approved_only:
            query = query.filter(Review.is_approved == True)
        
        if feature:
            query = query.filter(Review.feature_rated == feature)
        
        reviews = query.order_by(Review.created_date.desc()).limit(limit).all()
        
        # Calculate average rating
        avg_rating = db.query(func.avg(Review.rating)).filter(
            Review.is_approved == True
        ).scalar() or 0
        
        return {
            "reviews": [r.to_dict() for r in reviews],
            "average_rating": round(float(avg_rating), 2),
            "total_reviews": len(reviews)
        }
    except Exception as e:
        logger.error(f"Get reviews error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get reviews")


@app.post("/api/reviews/{review_id}/helpful")
async def mark_helpful(
    review_id: int,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Mark review as helpful"""
    try:
        review = db.query(Review).filter(Review.id == review_id).first()
        if not review:
            raise HTTPException(status_code=404, detail="Review not found")
        
        review.helpful_count += 1
        db.commit()
        
        return {"message": "Marked as helpful", "helpful_count": review.helpful_count}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Mark helpful error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to mark helpful")


@app.get("/api/reviews/stats")
async def get_review_stats(db: Session = Depends(get_db)):
    """Get review statistics (public)"""
    try:
        total = db.query(Review).filter(Review.is_approved == True).count()
        avg_rating = db.query(func.avg(Review.rating)).filter(
            Review.is_approved == True
        ).scalar() or 0
        
        rating_distribution = {}
        for i in range(1, 6):
            count = db.query(Review).filter(
                Review.is_approved == True,
                Review.rating == i
            ).count()
            rating_distribution[i] = count
        
        return {
            "total_reviews": total,
            "average_rating": round(float(avg_rating), 2),
            "rating_distribution": rating_distribution
        }
    except Exception as e:
        logger.error(f"Review stats error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get stats")


# ============================================================================
# SUBSCRIPTION ENDPOINTS
# ============================================================================

@app.get("/api/subscriptions/me")
async def get_my_subscription(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get current user's subscription"""
    try:
        user = db.query(User).filter(User.email == current_user["email"]).first()
        subscription = db.query(Subscription).filter(Subscription.user_id == user.id).first()
        
        if not subscription:
            # Create free subscription if none exists
            subscription = Subscription(
                user_id=user.id,
                plan_type="free",
                status="active"
            )
            db.add(subscription)
            db.commit()
            db.refresh(subscription)
        
        return {
            "plan_type": subscription.plan_type,
            "status": subscription.status,
            "start_date": subscription.start_date.isoformat() if subscription.start_date else None,
            "end_date": subscription.end_date.isoformat() if subscription.end_date else None
        }
    except Exception as e:
        logger.error(f"Get subscription error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get subscription")


@app.post("/api/subscriptions/upgrade")
async def upgrade_subscription(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Upgrade to premium (simplified - integrate Stripe in production)"""
    try:
        user = db.query(User).filter(User.email == current_user["email"]).first()
        subscription = db.query(Subscription).filter(Subscription.user_id == user.id).first()
        
        if not subscription:
            subscription = Subscription(
                user_id=user.id,
                plan_type="free",
                status="active"
            )
            db.add(subscription)
        
        subscription.plan_type = "premium"
        subscription.status = "active"
        db.commit()
        
        return {"message": "Upgraded to premium successfully"}
    except Exception as e:
        logger.error(f"Upgrade error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to upgrade")


# ============================================================================
# ACTIVITY ENDPOINTS
# ============================================================================

@app.post("/api/activity/log")
async def log_activity(
    activity: ActivityLogRequest,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Log user activity"""
    try:
        user = db.query(User).filter(User.email == current_user["email"]).first()
        
        activity_log = UserActivity(
            user_id=user.id,
            activity_type=activity.activity_type,
            page_name=activity.page_name,
            details=activity.details
        )
        db.add(activity_log)
        db.commit()
        
        return {"message": "Activity logged"}
    except Exception as e:
        logger.error(f"Activity log error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to log activity")


@app.get("/api/activity/history")
async def get_activity_history(
    limit: int = 50,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get user activity history"""
    try:
        user = db.query(User).filter(User.email == current_user["email"]).first()
        activities = db.query(UserActivity).filter(
            UserActivity.user_id == user.id
        ).order_by(UserActivity.created_date.desc()).limit(limit).all()
        
        return {
            "activities": [a.to_dict() for a in activities]
        }
    except Exception as e:
        logger.error(f"Get activity history error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get activity history")


# ============================================================================
# ADMIN ENDPOINTS
# ============================================================================

@app.get("/api/admin/users")
async def get_all_users(
    current_user: dict = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """Get all users (admin only)"""
    try:
        users = db.query(User).all()
        return {
            "users": [{
                "id": u.id,
                "email": u.email,
                "full_name": u.full_name,
                "role": u.role,
                "is_active": u.is_active,
                "created_date": u.created_date.isoformat() if u.created_date else None
            } for u in users]
        }
    except Exception as e:
        logger.error(f"Get users error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get users")


@app.get("/api/admin/subscriptions")
async def get_all_subscriptions(
    current_user: dict = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """Get all subscriptions (admin only)"""
    try:
        subscriptions = db.query(Subscription).all()
        return {
            "subscriptions": [s.to_dict() for s in subscriptions]
        }
    except Exception as e:
        logger.error(f"Get subscriptions error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get subscriptions")


# ============================================================================
# HEALTH CHECK
# ============================================================================

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "timestamp": datetime.utcnow().isoformat()}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
