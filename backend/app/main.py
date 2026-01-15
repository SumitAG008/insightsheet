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
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

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
from app.services.file_analyzer import FileAnalyzerService
from app.services.pl_builder import PLBuilderService
from app.services.email_service import send_password_reset_email, send_welcome_email, send_verification_email
from app.services.db_connection_service import DatabaseConnectionService

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

# CORS Configuration - SECURITY: Only HTTPS in production
# Detect if we're in production (Railway/Vercel) or local development
ENVIRONMENT = os.getenv("ENVIRONMENT", "production").lower()
IS_PRODUCTION = ENVIRONMENT == "production" or os.getenv("RAILWAY_ENVIRONMENT") is not None

# Base production origins (always HTTPS)
PRODUCTION_ORIGINS = [
    "https://meldra.ai",
    "https://insight.meldra.ai",
    "https://meldra-six.vercel.app",
    "https://insightsheet-jpci.vercel.app",
    "https://meldra-q8c867yf4-sumit-ags-projects.vercel.app",
    "https://meldra-git-main-sumit-ags-projects.vercel.app",
    "https://meldra-ln9n3ezi7-sumit-ags-projects.vercel.app",
]

# Parse CORS_ORIGINS from environment (comma-separated)
CORS_ORIGINS_ENV = os.getenv("CORS_ORIGINS", "")
if CORS_ORIGINS_ENV:
    # Filter to only HTTPS origins in production
    env_origins = [origin.strip() for origin in CORS_ORIGINS_ENV.split(",")]
    if IS_PRODUCTION:
        # In production: ONLY allow HTTPS origins
        env_origins = [origin for origin in env_origins if origin.startswith("https://")]
    # Add environment origins
    PRODUCTION_ORIGINS.extend(env_origins)

# Add localhost ONLY in development
if not IS_PRODUCTION:
    PRODUCTION_ORIGINS.extend([
        "http://localhost:3000",
        "http://localhost:5173",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173",
    ])

# Remove duplicates while preserving order
ALLOWED_ORIGINS = list(dict.fromkeys(PRODUCTION_ORIGINS))

logger.info(f"CORS configured for environment: {ENVIRONMENT}")
logger.info(f"Allowed origins: {ALLOWED_ORIGINS}")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,  # Required for cookies/auth
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["*"],
    expose_headers=["*"],
)

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


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str


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
    details: Optional[Any] = None  # Can be str, dict, or None - accepts any type


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

        # Validate password strength
        if len(user_data.password) < 10:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Password must be at least 10 characters"
            )
        
        # Bcrypt has 72-byte limit, warn if password is very long
        password_bytes = user_data.password.encode('utf-8')
        if len(password_bytes) > 72:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Password is too long. Maximum 72 bytes allowed (your password is {len(password_bytes)} bytes). Please use a shorter password or remove special characters."
            )

        # Generate verification token
        verification_token = secrets.token_urlsafe(32)
        verification_expires = datetime.utcnow() + timedelta(hours=24)  # Token expires in 24 hours
        
        # Create new user (unverified by default)
        hashed_password = get_password_hash(user_data.password)
        new_user = User(
            email=user_data.email,
            full_name=user_data.full_name,
            hashed_password=hashed_password,
            role="admin" if user_data.email == "sumitagaria@gmail.com" else "user",
            is_verified=False,  # Account not verified until email is confirmed
            verification_token=verification_token,
            verification_token_expires=verification_expires
        )

        db.add(new_user)
        db.commit()
        db.refresh(new_user)

        # Create free subscription (but user can't use it until verified)
        subscription = Subscription(
            user_email=user_data.email,
            plan="free",
            status="active",
            ai_queries_limit=5,
            ai_queries_used=0
        )
        db.add(subscription)
        db.commit()

        logger.info(f"New user registered (unverified): {user_data.email}")
        
        # Send verification email
        # SECURITY: Use HTTPS production URL by default, not localhost
        frontend_url = os.getenv("FRONTEND_URL", "https://insight.meldra.ai")
        verification_link = f"{frontend_url}/verify-email?token={verification_token}"
        
        try:
            email_sent = await send_verification_email(user_data.email, user_data.full_name, verification_link)
            if not email_sent:
                logger.warning(f"Verification email not sent to {user_data.email} (SMTP not configured). Verification link: {verification_link}")
        except Exception as e:
            logger.warning(f"Failed to send verification email: {str(e)}")

        return {
            "message": "Registration successful! Please check your email to verify your account.",
            "email": new_user.email,
            "verification_required": True
        }

    except HTTPException:
        raise
    except Exception as e:
        import traceback
        error_traceback = traceback.format_exc()
        logger.error(f"Registration error: {str(e)}\n{error_traceback}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Registration failed: {str(e)}"
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
        
        # Check if email is verified
        if not user.is_verified:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Please verify your email address before logging in. Check your inbox for the verification link."
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

        # Create response with token
        response_data = {
            "access_token": access_token,
            "token_type": "bearer",
            "user": {
                "email": user.email,
                "full_name": user.full_name,
                "role": user.role
            }
        }

        # SECURITY: Optionally set secure cookie (if USE_SECURE_COOKIES is enabled)
        # Currently using Bearer token in Authorization header (more secure for SPAs)
        # If you want to use cookies instead, uncomment below and set USE_SECURE_COOKIES=true
        use_cookies = os.getenv("USE_SECURE_COOKIES", "false").lower() == "true"
        if use_cookies:
            from fastapi.responses import JSONResponse
            response = JSONResponse(content=response_data)
            # SECURITY: Set secure cookie with proper flags for Safari/iOS
            response.set_cookie(
                key="access_token",
                value=access_token,
                httponly=True,  # Prevent XSS attacks
                secure=True,    # Only send over HTTPS
                samesite="none",  # Required for cross-origin requests
                max_age=ACCESS_TOKEN_EXPIRE_MINUTES * 60,  # Match token expiry
                path="/",
            )
            return response

        return response_data

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Login error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Login failed"
        )


@app.post("/api/auth/forgot-password")
async def forgot_password(request: ForgotPasswordRequest, db: Session = Depends(get_db)):
    """Request password reset - sends reset token to email"""
    try:
        user = db.query(User).filter(User.email == request.email).first()
        
        # Always return success (security: don't reveal if email exists)
        if not user:
            logger.warning(f"Password reset requested for non-existent email: {request.email}")
            return {
                "message": "If an account with that email exists, a password reset link has been sent."
            }
        
        # Generate reset token
        reset_token = secrets.token_urlsafe(32)
        reset_token_expires = datetime.utcnow() + timedelta(hours=1)  # Token valid for 1 hour
        
        # Save token to database (check if columns exist)
        if hasattr(user, 'reset_token'):
            user.reset_token = reset_token
        else:
            logger.error("reset_token column does not exist in database. Please run migration.")
            # Still return success for security
            return {
                "message": "If an account with that email exists, a password reset link has been sent."
            }
            
        if hasattr(user, 'reset_token_expires'):
            user.reset_token_expires = reset_token_expires
        else:
            logger.error("reset_token_expires column does not exist in database. Please run migration.")
            return {
                "message": "If an account with that email exists, a password reset link has been sent."
            }
            
        db.commit()
        
        # Generate reset link
        # SECURITY: Use HTTPS production URL by default, not localhost
        frontend_url = os.getenv('FRONTEND_URL', 'https://insight.meldra.ai')
        reset_link = f"{frontend_url}/reset-password?token={reset_token}"
        
        logger.info(f"Password reset token generated for {request.email}: {reset_link}")
        
        # Send email with reset link
        logger.info(f"Calling send_password_reset_email for {user.email}")
        email_sent = await send_password_reset_email(user.email, reset_link)
        logger.info(f"Email sending result: {'SUCCESS' if email_sent else 'FAILED'}")
        
        if not email_sent:
            # If email sending fails, still return success (security)
            # But log the reset link for manual use
            logger.error(f"❌ Email sending FAILED for {request.email}")
            logger.error(f"   Reset link (for manual use): {reset_link}")
            logger.error(f"   Check Railway logs above for SMTP error details")
            # Only return reset_link in development (when ENVIRONMENT is not production)
            # Never show reset link in production for security
            environment = os.getenv("ENVIRONMENT", "development")
            if environment.lower() != "production" and not os.getenv("SMTP_USER"):
                return {
                    "message": "If an account with that email exists, a password reset link has been sent.",
                    "reset_link": reset_link  # Only in development when SMTP not configured
                }
        
        return {
            "message": "If an account with that email exists, a password reset link has been sent."
        }
        
    except Exception as e:
        logger.error(f"Password reset error: {str(e)}")
        # Still return success for security
        return {
            "message": "If an account with that email exists, a password reset link has been sent."
        }


@app.post("/api/auth/reset-password")
async def reset_password(request: ResetPasswordRequest, db: Session = Depends(get_db)):
    """Reset password using token"""
    try:
        # Find user by reset token
        # Handle case where reset_token column might not exist yet
        try:
            user = db.query(User).filter(User.reset_token == request.token).first()
        except Exception as db_error:
            # If column doesn't exist, log and return error
            logger.error(f"Database error in reset_password: {str(db_error)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Database schema error. Please contact support."
            )
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid or expired reset token"
            )
        
        # Check if token expired
        if hasattr(user, 'reset_token_expires') and user.reset_token_expires and user.reset_token_expires < datetime.utcnow():
            # Clear expired token
            if hasattr(user, 'reset_token'):
                user.reset_token = None
            if hasattr(user, 'reset_token_expires'):
                user.reset_token_expires = None
            db.commit()
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Reset token has expired. Please request a new one."
            )
        
        # Validate password strength
        if len(request.new_password) < 10:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Password must be at least 10 characters"
            )
        
        # Bcrypt has 72-byte limit, validate and handle
        password_bytes = request.new_password.encode('utf-8')
        password_char_length = len(request.new_password)
        password_byte_length = len(password_bytes)
        
        logger.info(f"Password reset attempt - Characters: {password_char_length}, Bytes: {password_byte_length}")
        
        if password_byte_length > 72:
            logger.warning(f"Password too long: {password_byte_length} bytes (max 72)")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Password is too long. Maximum 72 bytes allowed (your password is {password_byte_length} bytes). Please use a shorter password or remove special characters."
            )
        
        # Update password (get_password_hash handles truncation internally, but we validate first)
        try:
            user.hashed_password = get_password_hash(request.new_password)
        except ValueError as e:
            # If bcrypt still complains, provide user-friendly error
            logger.error(f"Bcrypt error during password hash: {str(e)}")
            if "72 bytes" in str(e) or "longer than 72" in str(e):
                password_byte_length = len(request.new_password.encode('utf-8'))
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Password is too long. Maximum 72 bytes allowed (your password is {password_byte_length} bytes). Please use a shorter password or remove special characters."
                )
            # Re-raise other errors
            raise
        
        # Clear reset token if columns exist
        if hasattr(user, 'reset_token'):
            user.reset_token = None
        if hasattr(user, 'reset_token_expires'):
            user.reset_token_expires = None
        
        # SECURITY: Automatically verify email when password is reset
        # If user clicked reset link sent to their email, they proved email ownership
        if hasattr(user, 'is_verified') and not user.is_verified:
            user.is_verified = True
            logger.info(f"Email automatically verified for {user.email} after password reset (proved email ownership)")
            
        db.commit()
        
        logger.info(f"Password reset successful for {user.email}")
        
        return {
            "message": "Password has been reset successfully. You can now login with your new password."
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Password reset error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Password reset failed: {str(e)}"
        )


@app.get("/api/auth/verify-email")
async def verify_email(token: str, db: Session = Depends(get_db)):
    """Verify user email using verification token"""
    try:
        # Find user by verification token
        user = db.query(User).filter(User.verification_token == token).first()
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid verification token"
            )
        
        # Check if token expired
        if hasattr(user, 'verification_token_expires') and user.verification_token_expires:
            if user.verification_token_expires < datetime.utcnow():
                # Clear expired token
                user.verification_token = None
                user.verification_token_expires = None
                db.commit()
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Verification token has expired. Please request a new verification email."
                )
        
        # Verify the user
        user.is_verified = True
        user.verification_token = None
        user.verification_token_expires = None
        db.commit()
        
        logger.info(f"Email verified successfully for {user.email}")
        
        return {
            "message": "Email verified successfully! You can now login.",
            "email": user.email
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Email verification error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Email verification failed: {str(e)}"
        )


@app.post("/api/auth/resend-verification")
async def resend_verification(request: ForgotPasswordRequest, db: Session = Depends(get_db)):
    """Resend verification email to user"""
    try:
        user = db.query(User).filter(User.email == request.email).first()
        
        # Always return success (security: don't reveal if email exists)
        if not user:
            logger.warning(f"Verification resend requested for non-existent email: {request.email}")
            return {
                "message": "If an account with that email exists, a verification email has been sent."
            }
        
        # Check if already verified
        if user.is_verified:
            return {
                "message": "Your email is already verified. You can login now."
            }
        
        # Generate new verification token
        verification_token = secrets.token_urlsafe(32)
        verification_expires = datetime.utcnow() + timedelta(hours=24)  # Token expires in 24 hours
        
        # Update user with new token
        if hasattr(user, 'verification_token'):
            user.verification_token = verification_token
        if hasattr(user, 'verification_token_expires'):
            user.verification_token_expires = verification_expires
        db.commit()
        
        # Generate verification link
        frontend_url = os.getenv("FRONTEND_URL", "https://insight.meldra.ai")
        verification_link = f"{frontend_url}/verify-email?token={verification_token}"
        
        # Send verification email
        try:
            email_sent = await send_verification_email(user.email, user.full_name, verification_link)
            if not email_sent:
                logger.warning(f"Verification email not sent to {user.email} (SMTP/Resend not configured). Verification link: {verification_link}")
        except Exception as e:
            logger.warning(f"Failed to send verification email: {str(e)}")
        
        logger.info(f"Verification email resent to {user.email}")
        
        return {
            "message": "If an account with that email exists, a verification email has been sent. Please check your inbox and spam folder."
        }
        
    except Exception as e:
        logger.error(f"Resend verification error: {str(e)}")
        # Still return success for security
        return {
            "message": "If an account with that email exists, a verification email has been sent."
        }


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
        try:
            response = await invoke_llm(
                prompt=request.prompt,
                add_context=request.add_context_from_internet,
                response_schema=request.response_json_schema
            )
        except Exception as llm_error:
            logger.error(f"LLM invocation failed: {str(llm_error)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"AI service error: {str(llm_error)}"
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


@app.post("/api/files/analyze")
async def analyze_file(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Analyze Excel/CSV file and provide AI-powered insights
    ZERO STORAGE: File content NOT stored, only analysis results
    """
    try:
        # Check file size based on subscription
        subscription = db.query(Subscription).filter(
            Subscription.user_email == current_user["email"]
        ).first()

        max_size_mb = 500 if subscription and subscription.plan == "premium" else 10
        max_size_bytes = max_size_mb * 1024 * 1024

        # Read file content
        file_content = await file.read()
        file_size_mb = len(file_content) / (1024 * 1024)

        if len(file_content) > max_size_bytes:
            raise HTTPException(
                status_code=413,
                detail=f"File size ({file_size_mb:.1f}MB) exceeds {max_size_mb}MB limit"
            )

        # Validate file type
        if not file.filename.endswith(('.xlsx', '.xls', '.csv')):
            raise HTTPException(status_code=400, detail="Invalid file type. Only .xlsx, .xls, and .csv files are supported.")

        # Analyze file
        analyzer = FileAnalyzerService()
        analysis_result = await analyzer.analyze_excel_file(
            io.BytesIO(file_content),
            file.filename
        )

        # Log processing history (NO file content)
        processing_history = FileProcessingHistory(
            user_email=current_user["email"],
            processing_type="file_analysis",
            original_filename=file.filename,
            file_size_mb=file_size_mb,
            status="success"
        )
        db.add(processing_history)
        db.commit()

        logger.info(f"File analyzed: {file.filename} by {current_user['email']}")

        return analysis_result

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"File analysis error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")


@app.post("/api/files/generate-pl")
async def generate_pl(
    request: Request,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Generate P&L Excel file from natural language description
    ZERO STORAGE: Generated file NOT stored
    """
    try:
        body = await request.json()
        prompt = body.get("prompt", "")
        context = body.get("context", {})

        if not prompt:
            raise HTTPException(status_code=400, detail="Prompt is required")

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

        # Generate P&L
        pl_service = PLBuilderService()
        excel_data = await pl_service.generate_pl_from_natural_language(
            prompt,
            context
        )

        # Update usage (only if not premium)
        if subscription.plan != "premium":
            subscription.ai_queries_used += 1
            db.commit()

        # Log activity
        activity = UserActivity(
            user_email=current_user["email"],
            activity_type="pl_generation"
        )
        db.add(activity)
        db.commit()

        logger.info(f"P&L generated by {current_user['email']}")

        # Return file as download
        return StreamingResponse(
            io.BytesIO(excel_data),
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={
                "Content-Disposition": f'attachment; filename="Profit_Loss_{datetime.now().strftime("%Y%m%d_%H%M%S_%f")[:-3]}.xlsx"'
            }
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"P&L generation error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"P&L generation failed: {str(e)}")


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

        # Generate filename: original_name_timestamp.zip (IMMEDIATE DOWNLOAD, NO STORAGE)
        original_name = file.filename.replace('.zip', '').replace('.ZIP', '').replace(' ', '_')
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S_%f")[:-3]  # YYYYMMDD_HHMMSS_mmm
        output_filename = f"{original_name}_{timestamp}.zip"
        
        # Return processed ZIP - IMMEDIATE DOWNLOAD, NO STORAGE
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
        # Convert details to JSON string if it's a dict
        details_str = None
        if activity.details:
            if isinstance(activity.details, dict):
                import json
                details_str = json.dumps(activity.details)
            else:
                details_str = str(activity.details)
        
        user_activity = UserActivity(
            user_email=current_user["email"],
            activity_type=activity.activity_type,
            page_name=activity.page_name,
            details=details_str
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


@app.post("/api/login-history")
async def create_login_history(
    login_data: dict,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create login history entry"""
    try:
        login_history = LoginHistory(
            user_email=login_data.get("user_email", current_user["email"]),
            event_type=login_data.get("event_type", "login"),
            ip_address=login_data.get("ip_address"),
            location=login_data.get("location"),
            browser=login_data.get("browser"),
            device=login_data.get("device"),
            session_duration=login_data.get("session_duration")
        )
        db.add(login_history)
        db.commit()
        
        return {"message": "Login history created", "id": login_history.id}
    except Exception as e:
        logger.error(f"Login history creation error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create login history: {str(e)}"
        )


@app.get("/api/login-history")
async def get_login_history(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
    limit: int = 50
):
    """Get user's login history"""
    try:
        history = db.query(LoginHistory).filter(
            LoginHistory.user_email == current_user["email"]
        ).order_by(LoginHistory.created_date.desc()).limit(limit).all()
        
        return [
            {
                "id": h.id,
                "user_email": h.user_email,
                "event_type": h.event_type,
                "ip_address": h.ip_address,
                "location": h.location,
                "browser": h.browser,
                "device": h.device,
                "session_duration": h.session_duration,
                "created_date": h.created_date.isoformat() if h.created_date else None
            }
            for h in history
        ]
    except Exception as e:
        logger.error(f"Get login history error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get login history: {str(e)}"
        )


# ============================================================================
# DATABASE CONNECTION ENDPOINTS
# ============================================================================

class DBConnectionRequest(BaseModel):
    db_type: str
    connection_data: Dict[str, Any]

class DBQueryRequest(BaseModel):
    connection_id: str
    db_type: str
    query: str

class DBDisconnectRequest(BaseModel):
    connection_id: str
    db_type: str

@app.post("/api/db/test-connection")
async def test_db_connection(
    request: DBConnectionRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Test database connection
    ZERO STORAGE: Connection credentials are NOT stored, only kept in memory during session
    """
    try:
        result = DatabaseConnectionService.test_connection(
            request.db_type,
            request.connection_data
        )
        return result
    except Exception as e:
        logger.error(f"Test connection error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Connection test failed: {str(e)}"
        )

@app.get("/api/db/schema")
async def get_db_schema(
    connection_id: str,
    db_type: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Get database schema (tables and columns)
    ZERO STORAGE: Schema information is fetched on-demand, not stored
    """
    try:
        result = DatabaseConnectionService.get_schema(connection_id, db_type)
        if not result.get("success"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=result.get("error", "Failed to get schema")
            )
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get schema error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get schema: {str(e)}"
        )

@app.post("/api/db/query")
async def execute_db_query(
    request: DBQueryRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Execute SQL query (SELECT only for security)
    ZERO STORAGE: Query results are returned immediately, not stored
    """
    try:
        result = DatabaseConnectionService.execute_query(
            request.connection_id,
            request.db_type,
            request.query
        )
        if not result.get("success"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=result.get("error", "Query execution failed")
            )
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Query execution error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Query execution failed: {str(e)}"
        )

@app.post("/api/db/disconnect")
async def disconnect_db(
    request: DBDisconnectRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Disconnect from database
    ZERO STORAGE: All connection data is immediately removed from memory
    """
    try:
        result = DatabaseConnectionService.disconnect(request.connection_id, request.db_type)
        return result
    except Exception as e:
        logger.error(f"Disconnect error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Disconnect failed: {str(e)}"
        )

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
@app.get("/api/health")
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
