"""
Database configuration and models for InsightSheet-lite
"""
from sqlalchemy import create_engine, Column, Integer, String, DateTime, Float, Boolean, Text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from datetime import datetime
import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./insightsheet.db")

# Create engine with connection pooling
if DATABASE_URL.startswith("sqlite"):
    engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
else:
    # PostgreSQL with connection pooling and auto-reconnect
    engine = create_engine(
        DATABASE_URL,
        pool_size=10,
        max_overflow=20,
        pool_pre_ping=True,  # Verify connections before using
        pool_recycle=3600,   # Recycle connections after 1 hour
        echo=False
    )

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    """Database dependency for FastAPI"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# Database Models
class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    full_name = Column(String(255))
    hashed_password = Column(String(255), nullable=False)
    role = Column(String(50), default="user")  # user, admin
    is_active = Column(Boolean, default=True)
    created_date = Column(DateTime, default=datetime.utcnow)
    updated_date = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class Subscription(Base):
    __tablename__ = "subscriptions"

    id = Column(Integer, primary_key=True, index=True)
    user_email = Column(String(255), index=True, nullable=False)
    plan = Column(String(50), default="free")  # free, premium
    status = Column(String(50), default="active")  # active, cancelled, expired

    # Trial period
    trial_start_date = Column(DateTime, nullable=True)
    trial_end_date = Column(DateTime, nullable=True)

    # Subscription dates
    subscription_start_date = Column(DateTime, nullable=True)
    subscription_end_date = Column(DateTime, nullable=True)

    # Usage limits and tracking
    ai_queries_used = Column(Integer, default=0)
    ai_queries_limit = Column(Integer, default=5)  # 5 for free, unlimited (-1) for premium
    files_uploaded = Column(Integer, default=0)

    # Payment information
    payment_status = Column(String(50), default="unpaid")  # unpaid, paid, pending
    transaction_id = Column(String(255), nullable=True)
    amount_paid = Column(Float, nullable=True)
    stripe_customer_id = Column(String(255), nullable=True)
    stripe_subscription_id = Column(String(255), nullable=True)

    created_date = Column(DateTime, default=datetime.utcnow)
    updated_date = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class LoginHistory(Base):
    __tablename__ = "login_history"

    id = Column(Integer, primary_key=True, index=True)
    user_email = Column(String(255), index=True, nullable=False)
    event_type = Column(String(50), nullable=False)  # login, logout, failed_login
    ip_address = Column(String(100), nullable=True)
    location = Column(String(255), nullable=True)
    browser = Column(String(255), nullable=True)
    device = Column(String(255), nullable=True)
    session_duration = Column(Integer, nullable=True)  # in seconds
    created_date = Column(DateTime, default=datetime.utcnow)


class UserActivity(Base):
    __tablename__ = "user_activities"

    id = Column(Integer, primary_key=True, index=True)
    user_email = Column(String(255), index=True, nullable=False)
    activity_type = Column(String(100), nullable=False)  # file_upload, ai_query, chart_created, etc.
    page_name = Column(String(255), nullable=True)
    details = Column(Text, nullable=True)  # JSON string with additional details
    created_date = Column(DateTime, default=datetime.utcnow)


class FileProcessingHistory(Base):
    """Track file processing history (NO FILE CONTENT STORED)"""
    __tablename__ = "file_processing_history"

    id = Column(Integer, primary_key=True, index=True)
    user_email = Column(String(255), index=True, nullable=False)
    processing_type = Column(String(100), nullable=False)  # excel_to_ppt, zip_clean, etc.
    original_filename = Column(String(500), nullable=True)  # Just the name, not content
    file_size_mb = Column(Float, nullable=True)
    status = Column(String(50), default="success")  # success, failed
    error_message = Column(Text, nullable=True)
    created_date = Column(DateTime, default=datetime.utcnow)


class CustomerFeedback(Base):
    """Customer feedback/testimonials with admin approval"""
    __tablename__ = "customer_feedback"

    id = Column(Integer, primary_key=True, index=True)
    user_email = Column(String(255), index=True, nullable=False)
    user_name = Column(String(255), nullable=True)
    feedback_text = Column(Text, nullable=False)
    rating = Column(Integer, nullable=True)  # 1-5 stars
    is_published = Column(Boolean, default=False)  # Admin controls this
    published_date = Column(DateTime, nullable=True)
    page_shown = Column(String(100), default="homepage")  # homepage, pricing, all
    created_date = Column(DateTime, default=datetime.utcnow)
    updated_date = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


# Create all tables
def init_db():
    """Initialize database tables"""
    Base.metadata.create_all(bind=engine)


if __name__ == "__main__":
    init_db()
    print("Database tables created successfully!")
