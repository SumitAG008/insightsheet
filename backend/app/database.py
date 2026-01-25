"""
Database configuration and models for InsightSheet-lite
"""
from sqlalchemy import create_engine, Column, Integer, String, DateTime, Float, Boolean, Text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from datetime import datetime
import os
import logging
from dotenv import load_dotenv

logger = logging.getLogger(__name__)

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./insightsheet.db")

# Create engine with proper connection pooling and SSL for PostgreSQL
if DATABASE_URL.startswith("sqlite"):
    engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
elif DATABASE_URL.startswith("postgresql"):
    # PostgreSQL/Neon connection with SSL and connection pooling
    # Parse DATABASE_URL to ensure SSL mode is set
    import urllib.parse
    parsed = urllib.parse.urlparse(DATABASE_URL)
    query_params = urllib.parse.parse_qs(parsed.query)
    
    # Ensure SSL mode is set (required for Neon)
    if 'sslmode' not in query_params:
        if '?' in DATABASE_URL:
            DATABASE_URL += "&sslmode=require"
        else:
            DATABASE_URL += "?sslmode=require"
    
    # Create engine with connection pooling and retry logic
    engine = create_engine(
        DATABASE_URL,
        pool_size=5,  # Number of connections to maintain
        max_overflow=10,  # Additional connections beyond pool_size
        pool_pre_ping=True,  # Verify connections before using (auto-reconnect)
        pool_recycle=3600,  # Recycle connections after 1 hour
        connect_args={
            "connect_timeout": 10,  # 10 second connection timeout
            "sslmode": "require"  # Force SSL for security
        },
        echo=False  # Set to True for SQL debugging
    )
    logger.info("PostgreSQL engine created with SSL and connection pooling")
else:
    engine = create_engine(DATABASE_URL)

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
    is_verified = Column(Boolean, default=False)  # Email verification status
    verification_token = Column(String(255), nullable=True)
    verification_token_expires = Column(DateTime, nullable=True)
    reset_token = Column(String(255), nullable=True)
    reset_token_expires = Column(DateTime, nullable=True)
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


class ConsentLog(Base):
    """Cookie/consent decisions for compliance. No auth required to record."""
    __tablename__ = "consent_log"

    id = Column(Integer, primary_key=True, index=True)
    ip_address = Column(String(100), nullable=True)
    accepted = Column(Boolean, nullable=False)
    user_agent = Column(String(500), nullable=True)
    created_date = Column(DateTime, default=datetime.utcnow)


class ApiKey(Base):
    """Meldra API keys for developer.meldra.ai / api.developer.meldra.ai"""
    __tablename__ = "api_keys"

    id = Column(Integer, primary_key=True, index=True)
    user_email = Column(String(255), index=True, nullable=False)  # Owner of the key
    key_hash = Column(String(255), unique=True, index=True, nullable=False)  # Hashed API key
    key_prefix = Column(String(20), nullable=False)  # First 8 chars for display (e.g., "meldra_")
    name = Column(String(255), nullable=True)  # Optional name/description
    is_active = Column(Boolean, default=True)
    rate_limit_per_minute = Column(Integer, default=60)  # Requests per minute
    rate_limit_per_day = Column(Integer, default=10000)  # Requests per day
    monthly_quota = Column(Integer, default=100000)  # Monthly request quota
    plan = Column(String(50), default="standard")  # standard, premium, enterprise
    base_url = Column(String(500), nullable=True)  # Custom base URL if provided
    created_date = Column(DateTime, default=datetime.utcnow)
    expires_date = Column(DateTime, nullable=True)  # Optional expiration
    last_used = Column(DateTime, nullable=True)
    created_by = Column(String(255), nullable=True)  # Admin who created it


class ApiUsage(Base):
    """Track API usage for billing and analytics"""
    __tablename__ = "api_usage"

    id = Column(Integer, primary_key=True, index=True)
    api_key_id = Column(Integer, index=True, nullable=False)  # Foreign key to api_keys
    user_email = Column(String(255), index=True, nullable=False)  # Owner
    endpoint = Column(String(255), nullable=False)  # e.g., "/v1/convert/pdf-to-doc"
    method = Column(String(10), default="POST")
    status_code = Column(Integer, nullable=False)  # HTTP status
    request_size_bytes = Column(Integer, nullable=True)  # Request body size
    response_size_bytes = Column(Integer, nullable=True)  # Response body size
    processing_time_ms = Column(Integer, nullable=True)  # Processing time in milliseconds
    tokens_used = Column(Integer, default=0)  # For AI endpoints (if applicable)
    cost_usd = Column(Float, default=0.0)  # Calculated cost
    ip_address = Column(String(100), nullable=True)
    user_agent = Column(String(500), nullable=True)
    created_date = Column(DateTime, default=datetime.utcnow, index=True)


class ApiBilling(Base):
    """Monthly billing summaries for API usage"""
    __tablename__ = "api_billing"

    id = Column(Integer, primary_key=True, index=True)
    api_key_id = Column(Integer, index=True, nullable=False)
    user_email = Column(String(255), index=True, nullable=False)
    billing_month = Column(String(7), nullable=False, index=True)  # "2024-01" format
    total_requests = Column(Integer, default=0)
    total_tokens = Column(Integer, default=0)
    total_cost_usd = Column(Float, default=0.0)
    hardware_cost_usd = Column(Float, default=0.0)  # Infrastructure cost
    margin_usd = Column(Float, default=0.0)  # Revenue - costs
    payment_status = Column(String(50), default="pending")  # pending, paid, overdue
    invoice_id = Column(String(255), nullable=True)
    created_date = Column(DateTime, default=datetime.utcnow)
    updated_date = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


# Create all tables
def init_db():
    """Initialize database tables and add missing columns"""
    # Create all tables
    Base.metadata.create_all(bind=engine)
    
    # Add missing columns if they don't exist (for existing databases)
    try:
        from sqlalchemy import text, inspect
        from sqlalchemy.exc import ProgrammingError, OperationalError
        
        inspector = inspect(engine)
        
        # Check if users table exists
        if 'users' not in inspector.get_table_names():
            logger.info("Users table doesn't exist yet, will be created by Base.metadata.create_all")
            return
        
        columns = [col['name'] for col in inspector.get_columns('users')]
        logger.info(f"Existing columns in users table: {columns}")
        
        with engine.begin() as connection:  # Use begin() for transaction management
            # Add reset_token if it doesn't exist
            if 'reset_token' not in columns:
                try:
                    logger.info("Adding reset_token column to users table...")
                    if DATABASE_URL.startswith("postgresql"):
                        connection.execute(text("ALTER TABLE users ADD COLUMN reset_token VARCHAR(255);"))
                    else:
                        connection.execute(text("ALTER TABLE users ADD COLUMN reset_token VARCHAR(255);"))
                    logger.info("✅ Added reset_token column")
                except (ProgrammingError, OperationalError) as e:
                    if "already exists" not in str(e).lower() and "duplicate" not in str(e).lower():
                        logger.warning(f"Could not add reset_token column: {str(e)}")
            
            # Add reset_token_expires if it doesn't exist
            if 'reset_token_expires' not in columns:
                try:
                    logger.info("Adding reset_token_expires column to users table...")
                    if DATABASE_URL.startswith("postgresql"):
                        connection.execute(text("ALTER TABLE users ADD COLUMN reset_token_expires TIMESTAMP;"))
                    else:
                        connection.execute(text("ALTER TABLE users ADD COLUMN reset_token_expires TIMESTAMP;"))
                    logger.info("✅ Added reset_token_expires column")
                except (ProgrammingError, OperationalError) as e:
                    if "already exists" not in str(e).lower() and "duplicate" not in str(e).lower():
                        logger.warning(f"Could not add reset_token_expires column: {str(e)}")
            
            # Add is_verified if it doesn't exist
            if 'is_verified' not in columns:
                try:
                    logger.info("Adding is_verified column to users table...")
                    if DATABASE_URL.startswith("postgresql"):
                        connection.execute(text("ALTER TABLE users ADD COLUMN is_verified BOOLEAN DEFAULT FALSE;"))
                    else:
                        connection.execute(text("ALTER TABLE users ADD COLUMN is_verified BOOLEAN DEFAULT 0;"))
                    logger.info("✅ Added is_verified column")
                except (ProgrammingError, OperationalError) as e:
                    if "already exists" not in str(e).lower() and "duplicate" not in str(e).lower():
                        logger.warning(f"Could not add is_verified column: {str(e)}")
            
            # Add verification_token if it doesn't exist
            if 'verification_token' not in columns:
                try:
                    logger.info("Adding verification_token column to users table...")
                    if DATABASE_URL.startswith("postgresql"):
                        connection.execute(text("ALTER TABLE users ADD COLUMN verification_token VARCHAR(255);"))
                    else:
                        connection.execute(text("ALTER TABLE users ADD COLUMN verification_token VARCHAR(255);"))
                    logger.info("✅ Added verification_token column")
                except (ProgrammingError, OperationalError) as e:
                    if "already exists" not in str(e).lower() and "duplicate" not in str(e).lower():
                        logger.warning(f"Could not add verification_token column: {str(e)}")
            
            # Add verification_token_expires if it doesn't exist
            if 'verification_token_expires' not in columns:
                try:
                    logger.info("Adding verification_token_expires column to users table...")
                    if DATABASE_URL.startswith("postgresql"):
                        connection.execute(text("ALTER TABLE users ADD COLUMN verification_token_expires TIMESTAMP;"))
                    else:
                        connection.execute(text("ALTER TABLE users ADD COLUMN verification_token_expires TIMESTAMP;"))
                    logger.info("✅ Added verification_token_expires column")
                except (ProgrammingError, OperationalError) as e:
                    if "already exists" not in str(e).lower() and "duplicate" not in str(e).lower():
                        logger.warning(f"Could not add verification_token_expires column: {str(e)}")
                        
    except Exception as e:
        # If table doesn't exist or other error, that's ok - tables will be created
        logger.warning(f"Could not add missing columns (may already exist or table not created yet): {str(e)}")


if __name__ == "__main__":
    init_db()
    print("Database tables created successfully!")
