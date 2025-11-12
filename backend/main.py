"""
FastAPI Backend for InsightSheet (Meldra AI)
Main application with all API endpoints
"""

from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr
from passlib.context import CryptContext
import jwt
from jwt.exceptions import InvalidTokenError as JWTError
from datetime import datetime, timedelta
from typing import Optional, List
import os
from dotenv import load_dotenv

from database import get_db, User, Subscription, LoginHistory, UserActivity

load_dotenv()

# ============================================
# FASTAPI APP INITIALIZATION
# ============================================
app = FastAPI(
    title="Meldra AI API",
    description="Backend API for InsightSheet-lite",
    version="1.0.0"
)

# ============================================
# CORS CONFIGURATION (FIX CORS ERRORS!)
# ============================================
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",      # Vite dev server
        "http://localhost:3000",      # Alternative React port
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000",
        "https://meldra.ai",          # Production
        "https://www.meldra.ai",      # Production with www
    ],
    allow_credentials=True,
    allow_methods=["*"],  # Allow all methods
    allow_headers=["*"],  # Allow all headers
)

# ============================================
# SECURITY CONFIGURATION
# ============================================
SECRET_KEY = os.getenv("JWT_SECRET_KEY", "your-secret-key-change-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 43200  # 30 days

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()


# ============================================
# PYDANTIC MODELS
# ============================================
class UserRegister(BaseModel):
    email: EmailStr
    password: str
    full_name: str


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class ActivityLog(BaseModel):
    activity_type: str
    page_name: str
    details: Optional[dict] = None


# ============================================
# AUTH HELPER FUNCTIONS
# ============================================
def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password):
    return pwd_context.hash(password)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        token = credentials.credentials
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    user = db.query(User).filter(User.email == email).first()
    if user is None:
        raise credentials_exception
    return user


# ============================================
# API ENDPOINTS
# ============================================

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "ok", "service": "meldra-ai", "version": "1.0.0"}


# ============================================
# AUTHENTICATION ENDPOINTS
# ============================================

@app.post("/api/auth/register", response_model=Token)
async def register(user_data: UserRegister, db: Session = Depends(get_db)):
    """Register new user"""
    # Check if user exists
    existing_user = db.query(User).filter(User.email == user_data.email).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")

    # Create user
    hashed_password = get_password_hash(user_data.password)
    new_user = User(
        email=user_data.email,
        full_name=user_data.full_name,
        hashed_password=hashed_password,
        role="user",
        is_active=True,
        is_verified=False
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    # Create free subscription
    subscription = Subscription(
        user_email=new_user.email,
        plan="free",
        status="active",
        ai_queries_limit=100
    )
    db.add(subscription)
    db.commit()

    # Create access token
    access_token = create_access_token(data={"sub": new_user.email})

    return {"access_token": access_token, "token_type": "bearer"}


@app.post("/api/auth/login", response_model=Token)
async def login(user_data: UserLogin, db: Session = Depends(get_db)):
    """Login user"""
    user = db.query(User).filter(User.email == user_data.email).first()

    if not user or not verify_password(user_data.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Incorrect email or password")

    # Update last login
    user.last_login = datetime.utcnow()
    db.commit()

    # Log login
    login_log = LoginHistory(
        user_email=user.email,
        event_type="login",
        created_date=datetime.utcnow()
    )
    db.add(login_log)
    db.commit()

    # Create access token
    access_token = create_access_token(data={"sub": user.email})

    return {"access_token": access_token, "token_type": "bearer"}


@app.get("/api/auth/me")
async def get_me(current_user: User = Depends(get_current_user)):
    """Get current user"""
    return current_user.to_dict()


@app.put("/api/auth/me")
async def update_me(
    full_name: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update current user"""
    current_user.full_name = full_name
    current_user.updated_date = datetime.utcnow()
    db.commit()
    db.refresh(current_user)
    return current_user.to_dict()


# ============================================
# SUBSCRIPTION ENDPOINTS
# ============================================

@app.get("/api/subscriptions/me")
async def get_my_subscription(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get current user's subscription"""
    subscription = db.query(Subscription).filter(
        Subscription.user_email == current_user.email
    ).first()

    if not subscription:
        raise HTTPException(status_code=404, detail="Subscription not found")

    return subscription.to_dict()


@app.post("/api/subscriptions/upgrade")
async def upgrade_subscription(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Upgrade to premium subscription"""
    subscription = db.query(Subscription).filter(
        Subscription.user_email == current_user.email
    ).first()

    if not subscription:
        raise HTTPException(status_code=404, detail="Subscription not found")

    subscription.plan = "premium"
    subscription.ai_queries_limit = 999999  # Unlimited
    subscription.subscription_start_date = datetime.utcnow()
    subscription.subscription_end_date = datetime.utcnow() + timedelta(days=365)
    subscription.updated_date = datetime.utcnow()

    db.commit()
    db.refresh(subscription)

    return subscription.to_dict()


# ============================================
# ACTIVITY ENDPOINTS
# ============================================

@app.post("/api/activity/log")
async def log_activity(
    activity: ActivityLog,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Log user activity (metadata only!)"""
    activity_log = UserActivity(
        user_email=current_user.email,
        activity_type=activity.activity_type,
        page_name=activity.page_name,
        details=activity.details,
        created_date=datetime.utcnow()
    )
    db.add(activity_log)
    db.commit()

    return {"success": True, "message": "Activity logged"}


@app.get("/api/activity/history")
async def get_activity_history(
    limit: int = 50,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get user activity history"""
    activities = db.query(UserActivity).filter(
        UserActivity.user_email == current_user.email
    ).order_by(UserActivity.created_date.desc()).limit(limit).all()

    return [activity.to_dict() for activity in activities]


# ============================================
# ADMIN ENDPOINTS
# ============================================

@app.get("/api/admin/users")
async def get_all_users(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all users (admin only)"""
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")

    users = db.query(User).all()
    return [user.to_dict() for user in users]


@app.get("/api/admin/subscriptions")
async def get_all_subscriptions(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all subscriptions (admin only)"""
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")

    subscriptions = db.query(Subscription).all()
    return [sub.to_dict() for sub in subscriptions]


# ============================================
# LLM/AI ENDPOINTS (Placeholder)
# ============================================

@app.post("/api/integrations/llm/invoke")
async def invoke_llm(
    prompt: str,
    add_context_from_internet: bool = False,
    response_json_schema: Optional[dict] = None,
    current_user: User = Depends(get_current_user)
):
    """Invoke LLM (OpenAI GPT-4)"""
    # TODO: Implement OpenAI integration
    return {
        "response": f"AI Response to: {prompt}",
        "model": "gpt-4-turbo-preview"
    }


@app.post("/api/integrations/image/generate")
async def generate_image(
    prompt: str,
    size: str = "1024x1024",
    current_user: User = Depends(get_current_user)
):
    """Generate image (DALL-E)"""
    # TODO: Implement DALL-E integration
    return {
        "image_url": "https://via.placeholder.com/1024",
        "prompt": prompt
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)
