"""
Database models and configuration for InsightSheet (Meldra AI)
PostgreSQL with SQLAlchemy
"""

from sqlalchemy import create_engine, Column, Integer, String, Boolean, DateTime, Text, Float, JSON, text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from datetime import datetime
import os
from dotenv import load_dotenv

load_dotenv()

# Database URL from environment
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:password@localhost:5432/insightsheet")

# Create engine with connection pooling
engine = create_engine(
    DATABASE_URL,
    pool_size=10,
    max_overflow=20,
    pool_pre_ping=True,  # Auto-reconnect
    echo=False  # Set to True for SQL debugging
)

# Session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base class for models
Base = declarative_base()


# ============================================
# 1. USER MODEL
# ============================================
class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    full_name = Column(String(255))
    hashed_password = Column(String(255), nullable=False)

    # User info
    role = Column(String(50), default="user")  # user, admin
    is_active = Column(Boolean, default=True)
    is_verified = Column(Boolean, default=False)

    # Timestamps
    created_date = Column(DateTime, default=datetime.utcnow)
    updated_date = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    last_login = Column(DateTime, nullable=True)

    def to_dict(self):
        return {
            "id": self.id,
            "email": self.email,
            "full_name": self.full_name,
            "role": self.role,
            "is_active": self.is_active,
            "is_verified": self.is_verified,
            "created_date": self.created_date.isoformat() if self.created_date else None,
            "last_login": self.last_login.isoformat() if self.last_login else None
        }


# ============================================
# 2. SUBSCRIPTION MODEL
# ============================================
class Subscription(Base):
    __tablename__ = "subscriptions"

    id = Column(Integer, primary_key=True, index=True)
    user_email = Column(String(255), index=True, nullable=False)

    # Plan details
    plan = Column(String(50), default="free")  # free, premium
    status = Column(String(50), default="active")  # active, cancelled, expired

    # Trial
    trial_start_date = Column(DateTime, nullable=True)
    trial_end_date = Column(DateTime, nullable=True)

    # Subscription
    subscription_start_date = Column(DateTime, nullable=True)
    subscription_end_date = Column(DateTime, nullable=True)

    # Usage limits
    ai_queries_used = Column(Integer, default=0)
    ai_queries_limit = Column(Integer, default=100)  # 100 for free, unlimited for premium
    files_uploaded = Column(Integer, default=0)

    # Payment
    stripe_customer_id = Column(String(255), nullable=True)
    stripe_subscription_id = Column(String(255), nullable=True)
    payment_method = Column(String(50), nullable=True)  # card, paypal

    # Timestamps
    created_date = Column(DateTime, default=datetime.utcnow)
    updated_date = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "user_email": self.user_email,
            "plan": self.plan,
            "status": self.status,
            "trial_start_date": self.trial_start_date.isoformat() if self.trial_start_date else None,
            "trial_end_date": self.trial_end_date.isoformat() if self.trial_end_date else None,
            "subscription_start_date": self.subscription_start_date.isoformat() if self.subscription_start_date else None,
            "subscription_end_date": self.subscription_end_date.isoformat() if self.subscription_end_date else None,
            "ai_queries_used": self.ai_queries_used,
            "ai_queries_limit": self.ai_queries_limit,
            "files_uploaded": self.files_uploaded,
            "created_date": self.created_date.isoformat() if self.created_date else None
        }


# ============================================
# 3. LOGIN HISTORY MODEL
# ============================================
class LoginHistory(Base):
    __tablename__ = "login_history"

    id = Column(Integer, primary_key=True, index=True)
    user_email = Column(String(255), index=True, nullable=False)

    # Event details
    event_type = Column(String(50))  # login, logout, failed_login

    # Device & Location
    ip_address = Column(String(50))
    location = Column(String(255))
    browser = Column(String(255))
    device = Column(String(255))
    os = Column(String(255))

    # Metadata
    session_duration = Column(Integer, nullable=True)  # in seconds

    # Timestamp
    created_date = Column(DateTime, default=datetime.utcnow, index=True)

    def to_dict(self):
        return {
            "id": self.id,
            "user_email": self.user_email,
            "event_type": self.event_type,
            "ip_address": self.ip_address,
            "location": self.location,
            "browser": self.browser,
            "device": self.device,
            "os": self.os,
            "session_duration": self.session_duration,
            "created_date": self.created_date.isoformat() if self.created_date else None
        }


# ============================================
# 4. USER ACTIVITY MODEL (METADATA ONLY!)
# ============================================
class UserActivity(Base):
    __tablename__ = "user_activities"

    id = Column(Integer, primary_key=True, index=True)
    user_email = Column(String(255), index=True, nullable=False)

    # Activity details
    activity_type = Column(String(100))  # file_upload, ai_query, chart_create, etc.
    page_name = Column(String(255))

    # Metadata ONLY (NOT actual data!)
    details = Column(JSON, nullable=True)  # e.g., {"file_size": 1024, "file_type": "xlsx"}

    # Timestamp
    created_date = Column(DateTime, default=datetime.utcnow, index=True)

    def to_dict(self):
        return {
            "id": self.id,
            "user_email": self.user_email,
            "activity_type": self.activity_type,
            "page_name": self.page_name,
            "details": self.details,
            "created_date": self.created_date.isoformat() if self.created_date else None
        }


# ============================================
# HELPER FUNCTIONS
# ============================================

def get_db():
    """Dependency for FastAPI"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    """Initialize database - create all tables"""
    Base.metadata.create_all(bind=engine)
    print("✅ Database tables created successfully!")


def test_connection():
    """Test database connection"""
    try:
        db = SessionLocal()
        db.execute(text("SELECT 1"))
        db.close()
        print("✅ Database connection successful!")
        return True
    except Exception as e:
        print(f"❌ Database connection failed: {e}")
        return False


if __name__ == "__main__":
    # Run this file directly to initialize database
    print("🔧 Testing database connection...")
    if test_connection():
        print("\n🔧 Creating database tables...")
        init_db()
        print("\n✅ Database setup complete!")
        print(f"📊 Database URL: {DATABASE_URL}")
    else:
        print("\n❌ Please check your DATABASE_URL in .env file")
