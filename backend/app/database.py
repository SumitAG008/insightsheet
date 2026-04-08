"""
Database configuration and models for InsightSheet-lite
"""
from sqlalchemy import create_engine, Column, Integer, String, DateTime, Float, Boolean, Text, UniqueConstraint, Index
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
    trial_used_at = Column(DateTime, nullable=True)
    telemetry_opt_in = Column(Boolean, default=False)
    created_date = Column(DateTime, default=datetime.utcnow)
    updated_date = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class EsgFramework(Base):
    __tablename__ = "esg_frameworks"

    id = Column(Integer, primary_key=True, index=True)
    user_email = Column(String(255), index=True, nullable=False)
    project_id = Column(Integer, index=True, nullable=False)

    key = Column(String(50), nullable=False)  # esrs|gri|sasb|custom
    name = Column(String(255), nullable=False)
    enabled = Column(Boolean, default=True, nullable=False)

    created_date = Column(DateTime, default=datetime.utcnow, index=True)
    updated_date = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    __table_args__ = (
        UniqueConstraint("user_email", "project_id", "key", name="uq_esg_frameworks_user_project_key"),
        Index("ix_esg_frameworks_user_project_enabled", "user_email", "project_id", "enabled"),
    )


class EsgFrameworkRequirement(Base):
    __tablename__ = "esg_framework_requirements"

    id = Column(Integer, primary_key=True, index=True)
    user_email = Column(String(255), index=True, nullable=False)
    project_id = Column(Integer, index=True, nullable=False)
    framework_key = Column(String(50), index=True, nullable=False)

    code = Column(String(255), nullable=False)
    title = Column(String(500), nullable=False)
    description = Column(Text, nullable=True)

    granularity = Column(String(20), default="org", nullable=False)  # org|site|both
    evidence_required = Column(Boolean, default=True, nullable=False)

    created_date = Column(DateTime, default=datetime.utcnow, index=True)
    updated_date = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    __table_args__ = (
        UniqueConstraint(
            "user_email",
            "project_id",
            "framework_key",
            "code",
            name="uq_esg_req_user_project_framework_code",
        ),
        Index("ix_esg_req_user_project_framework", "user_email", "project_id", "framework_key"),
    )


class EsgMetricDefinition(Base):
    __tablename__ = "esg_metric_definitions"

    id = Column(Integer, primary_key=True, index=True)
    user_email = Column(String(255), index=True, nullable=False)
    project_id = Column(Integer, index=True, nullable=False)

    key = Column(String(255), nullable=False)  # stable key (e.g., ghg_scope_1)
    name = Column(String(500), nullable=False)
    category = Column(String(50), nullable=True)  # E|S|G
    unit = Column(String(50), nullable=True)
    description = Column(Text, nullable=True)
    granularity = Column(String(20), default="org", nullable=False)  # org|site|both

    created_date = Column(DateTime, default=datetime.utcnow, index=True)
    updated_date = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    __table_args__ = (
        UniqueConstraint("user_email", "project_id", "key", name="uq_esg_metric_defs_user_project_key"),
        Index("ix_esg_metric_defs_user_project", "user_email", "project_id"),
    )


class EsgMetricValue(Base):
    __tablename__ = "esg_metric_values"

    id = Column(Integer, primary_key=True, index=True)
    user_email = Column(String(255), index=True, nullable=False)
    project_id = Column(Integer, index=True, nullable=False)
    period_id = Column(Integer, index=True, nullable=False)
    site_id = Column(Integer, index=True, nullable=True)

    metric_definition_id = Column(Integer, index=True, nullable=False)

    value = Column(Float, nullable=True)
    unit = Column(String(50), nullable=True)
    notes = Column(Text, nullable=True)

    status = Column(String(30), default="missing", index=True)  # missing|in_progress|submitted|needs_changes|approved|locked

    created_date = Column(DateTime, default=datetime.utcnow, index=True)
    updated_date = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    __table_args__ = (
        Index("ix_esg_metric_values_user_project_period", "user_email", "project_id", "period_id"),
        Index("ix_esg_metric_values_user_project_period_status", "user_email", "project_id", "period_id", "status"),
    )


class EsgMetricEvidenceLink(Base):
    __tablename__ = "esg_metric_evidence_links"

    id = Column(Integer, primary_key=True, index=True)
    user_email = Column(String(255), index=True, nullable=False)
    project_id = Column(Integer, index=True, nullable=False)
    period_id = Column(Integer, index=True, nullable=False)

    metric_value_id = Column(Integer, index=True, nullable=False)
    evidence_document_id = Column(Integer, index=True, nullable=False)

    excerpt = Column(Text, nullable=True)
    page_ref = Column(String(100), nullable=True)

    created_date = Column(DateTime, default=datetime.utcnow, index=True)

    __table_args__ = (
        UniqueConstraint(
            "user_email",
            "metric_value_id",
            "evidence_document_id",
            name="uq_esg_metric_evidence_link",
        ),
        Index("ix_esg_metric_evidence_user_project_period", "user_email", "project_id", "period_id"),
    )


class EsgTask(Base):
    __tablename__ = "esg_tasks"

    id = Column(Integer, primary_key=True, index=True)
    user_email = Column(String(255), index=True, nullable=False)
    project_id = Column(Integer, index=True, nullable=False)
    period_id = Column(Integer, index=True, nullable=False)
    site_id = Column(Integer, index=True, nullable=True)

    task_type = Column(String(50), nullable=False)  # collect_data|upload_evidence|review|approve|remediate
    title = Column(String(500), nullable=False)
    description = Column(Text, nullable=True)

    metric_value_id = Column(Integer, index=True, nullable=True)

    assigned_to = Column(String(255), nullable=True)
    due_date = Column(DateTime, nullable=True)
    status = Column(String(30), default="todo", index=True)  # todo|in_progress|blocked|done|cancelled

    created_date = Column(DateTime, default=datetime.utcnow, index=True)
    updated_date = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    __table_args__ = (
        Index("ix_esg_tasks_user_project_period_status", "user_email", "project_id", "period_id", "status"),
    )


class EsgMetricApproval(Base):
    __tablename__ = "esg_metric_approvals"

    id = Column(Integer, primary_key=True, index=True)
    user_email = Column(String(255), index=True, nullable=False)
    project_id = Column(Integer, index=True, nullable=False)
    period_id = Column(Integer, index=True, nullable=False)

    metric_value_id = Column(Integer, index=True, nullable=False)
    approved_by = Column(String(255), index=True, nullable=False)
    approved_at = Column(DateTime, default=datetime.utcnow, index=True)

    evidence_waiver = Column(Boolean, default=False, nullable=False)
    waiver_justification = Column(Text, nullable=True)
    waiver_risk_level = Column(String(20), nullable=True)  # low|medium|high

    __table_args__ = (
        Index("ix_esg_approvals_user_project_period", "user_email", "project_id", "period_id"),
        Index("ix_esg_approvals_metric_value", "metric_value_id"),
    )


class EsgEvidenceDocument(Base):
    __tablename__ = "esg_evidence_documents"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, index=True, nullable=False)
    period_id = Column(Integer, index=True, nullable=False)
    user_email = Column(String(255), index=True, nullable=False)
    site_id = Column(Integer, index=True, nullable=True)

    filename = Column(String(500), nullable=False)
    content_type = Column(String(200), nullable=True)
    file_size_bytes = Column(Integer, nullable=True)
    storage_path = Column(String(1000), nullable=False)

    storage_provider = Column(String(30), default="local", nullable=False)
    storage_bucket = Column(String(255), nullable=True)
    storage_key = Column(String(1000), nullable=True)

    doc_type = Column(String(100), nullable=True)
    extracted_text = Column(Text, nullable=True)
    extraction_json = Column(Text, nullable=True)
    status = Column(String(30), default="uploaded", index=True)

    created_date = Column(DateTime, default=datetime.utcnow, index=True)
    updated_date = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    __table_args__ = (
        Index(
            "ix_esg_evidence_user_project_period_created",
            "user_email",
            "project_id",
            "period_id",
            "created_date",
        ),
        Index(
            "ix_esg_evidence_user_project_period_status",
            "user_email",
            "project_id",
            "period_id",
            "status",
        ),
    )


class EsgMetricSuggestion(Base):
    __tablename__ = "esg_metric_suggestions"

    id = Column(Integer, primary_key=True, index=True)
    evidence_document_id = Column(Integer, index=True, nullable=False)
    project_id = Column(Integer, index=True, nullable=False)
    period_id = Column(Integer, index=True, nullable=False)
    user_email = Column(String(255), index=True, nullable=False)
    site_id = Column(Integer, index=True, nullable=True)

    scope = Column(String(20), nullable=True)
    category = Column(String(255), nullable=False)
    subcategory = Column(String(255), nullable=True)
    value = Column(Float, nullable=True)
    unit = Column(String(50), nullable=True)
    notes = Column(Text, nullable=True)

    confidence = Column(Float, nullable=True)
    status = Column(String(30), default="pending", index=True)  # pending, approved, rejected
    approved_metric_id = Column(Integer, index=True, nullable=True)

    created_date = Column(DateTime, default=datetime.utcnow, index=True)
    updated_date = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    __table_args__ = (
        Index(
            "ix_esg_suggestions_user_project_period_created",
            "user_email",
            "project_id",
            "period_id",
            "created_date",
        ),
        Index(
            "ix_esg_suggestions_user_project_period_status",
            "user_email",
            "project_id",
            "period_id",
            "status",
        ),
        Index(
            "ix_esg_suggestions_evidence_status",
            "evidence_document_id",
            "status",
        ),
    )


class EsgProject(Base):
    __tablename__ = "esg_projects"

    id = Column(Integer, primary_key=True, index=True)
    user_email = Column(String(255), index=True, nullable=False)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    created_date = Column(DateTime, default=datetime.utcnow, index=True)
    updated_date = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    __table_args__ = (
        UniqueConstraint("user_email", "name", name="uq_esg_projects_user_name"),
    )


class EsgReportingPeriod(Base):
    __tablename__ = "esg_reporting_periods"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, index=True, nullable=False)
    user_email = Column(String(255), index=True, nullable=False)
    name = Column(String(255), nullable=False)
    framework = Column(String(100), nullable=True)
    start_date = Column(DateTime, nullable=True)
    end_date = Column(DateTime, nullable=True)
    created_date = Column(DateTime, default=datetime.utcnow, index=True)
    updated_date = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    __table_args__ = (
        UniqueConstraint("project_id", "name", name="uq_esg_periods_project_name"),
    )


class EsgSite(Base):
    __tablename__ = "esg_sites"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, index=True, nullable=False)
    user_email = Column(String(255), index=True, nullable=False)
    name = Column(String(255), nullable=False)
    country = Column(String(100), nullable=True)
    region = Column(String(100), nullable=True)
    created_date = Column(DateTime, default=datetime.utcnow, index=True)
    updated_date = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    __table_args__ = (
        UniqueConstraint("project_id", "name", name="uq_esg_sites_project_name"),
    )


class EsgMetric(Base):
    __tablename__ = "esg_metrics"

    id = Column(Integer, primary_key=True, index=True)
    period_id = Column(Integer, index=True, nullable=False)
    project_id = Column(Integer, index=True, nullable=False)
    user_email = Column(String(255), index=True, nullable=False)
    site_id = Column(Integer, index=True, nullable=True)

    scope = Column(String(20), nullable=True)
    category = Column(String(255), nullable=False)
    subcategory = Column(String(255), nullable=True)
    value = Column(Float, nullable=True)
    unit = Column(String(50), nullable=True)
    notes = Column(Text, nullable=True)

    source_document_id = Column(Integer, index=True, nullable=True)
    source_page_from = Column(Integer, nullable=True)
    source_page_to = Column(Integer, nullable=True)

    created_date = Column(DateTime, default=datetime.utcnow, index=True)
    updated_date = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class LoginOtpChallenge(Base):
    __tablename__ = "login_otp_challenges"

    id = Column(Integer, primary_key=True, index=True)
    challenge_id = Column(String(64), unique=True, index=True, nullable=False)
    user_email = Column(String(255), index=True, nullable=False)
    otp_hash = Column(String(255), nullable=False)
    expires_at = Column(DateTime, index=True, nullable=False)
    attempts = Column(Integer, default=0)
    consumed_at = Column(DateTime, nullable=True)
    created_date = Column(DateTime, default=datetime.utcnow, index=True)


class LearningSignal(Base):
    __tablename__ = "learning_signals"

    id = Column(Integer, primary_key=True, index=True)
    user_email = Column(String(255), index=True, nullable=False)
    kind = Column(String(100), index=True, nullable=False)
    payload_json = Column(Text, nullable=False)
    created_date = Column(DateTime, default=datetime.utcnow, index=True)


class Subscription(Base):
    __tablename__ = "subscriptions"

    id = Column(Integer, primary_key=True, index=True)
    user_email = Column(String(255), index=True, nullable=False)
    plan = Column(String(50), default="free")  # free, premium
    status = Column(String(50), default="active")  # active, cancelled, expired

    # Trial period
    trial_start_date = Column(DateTime, nullable=True)
    trial_end_date = Column(DateTime, nullable=True)

    trial_warning_sent_at = Column(DateTime, nullable=True)
    credentials_deleted_at = Column(DateTime, nullable=True)
    deletion_email_sent_at = Column(DateTime, nullable=True)

    # Subscription dates
    subscription_start_date = Column(DateTime, nullable=True)
    subscription_end_date = Column(DateTime, nullable=True)
    cancelled_at = Column(DateTime, nullable=True)

    # Usage limits and tracking
    ai_queries_used = Column(Integer, default=0)
    ai_queries_limit = Column(Integer, default=5)  # 5 for free, unlimited (-1) for premium
    ai_queries_reset_at = Column(DateTime, nullable=True)  # Monthly reset marker (UTC)
    files_uploaded = Column(Integer, default=0)

    workflow_runs_used = Column(Integer, default=0)
    workflow_runs_limit = Column(Integer, default=0)  # 0 means not enabled for plan
    workflow_runs_reset_at = Column(DateTime, nullable=True)  # Monthly reset marker (UTC)

    conversions_used = Column(Integer, default=0)
    conversions_limit = Column(Integer, default=0)  # 0 means not enabled for plan
    conversions_reset_at = Column(DateTime, nullable=True)  # Monthly reset marker (UTC)

    # Payment information
    payment_status = Column(String(50), default="unpaid")  # unpaid, paid, pending
    transaction_id = Column(String(255), nullable=True)
    amount_paid = Column(Float, nullable=True)
    stripe_customer_id = Column(String(255), nullable=True)
    stripe_subscription_id = Column(String(255), nullable=True)

    created_date = Column(DateTime, default=datetime.utcnow)
    updated_date = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class SubscriptionEventLog(Base):
    __tablename__ = "subscription_event_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_email = Column(String(255), index=True, nullable=False)
    event_type = Column(String(100), nullable=False)  # start_trial, upgrade, cancel, etc.
    prev_plan = Column(String(50), nullable=True)
    new_plan = Column(String(50), nullable=True)
    prev_status = Column(String(50), nullable=True)
    new_status = Column(String(50), nullable=True)
    ip_address = Column(String(100), nullable=True)
    user_agent = Column(String(500), nullable=True)
    created_date = Column(DateTime, default=datetime.utcnow, index=True)


class UsageMeterDedup(Base):
    __tablename__ = "usage_meter_dedup"

    id = Column(Integer, primary_key=True, index=True)
    user_email = Column(String(255), index=True, nullable=False)
    request_id = Column(String(128), index=True, nullable=False)
    kind = Column(String(50), index=True, nullable=False)
    created_date = Column(DateTime, default=datetime.utcnow, index=True)

    __table_args__ = (
        UniqueConstraint("user_email", "request_id", "kind", name="uq_usage_meter_dedup"),
    )


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


class PlaywrightJob(Base):
    __tablename__ = "playwright_jobs"

    id = Column(Integer, primary_key=True, index=True)
    job_id = Column(String(64), unique=True, index=True, nullable=False)
    user_email = Column(String(255), index=True, nullable=False)

    connector = Column(String(100), nullable=False)  # e.g. books_to_scrape
    status = Column(String(30), default="queued", index=True)  # queued, running, succeeded, failed
    config_json = Column(Text, nullable=True)
    report_json = Column(Text, nullable=True)
    csv_path = Column(String(1000), nullable=True)
    error_message = Column(Text, nullable=True)

    expires_at = Column(DateTime, index=True, nullable=True)
    created_date = Column(DateTime, default=datetime.utcnow, index=True)
    updated_date = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class InvoiceExtractionJob(Base):
    __tablename__ = "invoice_extraction_jobs"

    id = Column(Integer, primary_key=True, index=True)
    job_id = Column(String(64), unique=True, index=True, nullable=False)
    user_email = Column(String(255), index=True, nullable=False)

    status = Column(String(30), default="queued", index=True)  # queued, running, succeeded, failed
    config_json = Column(Text, nullable=True)
    report_json = Column(Text, nullable=True)
    header_csv_path = Column(String(1000), nullable=True)
    line_items_csv_path = Column(String(1000), nullable=True)
    error_message = Column(Text, nullable=True)

    expires_at = Column(DateTime, index=True, nullable=True)
    created_date = Column(DateTime, default=datetime.utcnow, index=True)
    updated_date = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class UserFeature(Base):
    __tablename__ = "user_features"

    id = Column(Integer, primary_key=True, index=True)
    user_email = Column(String(255), index=True, nullable=False)
    feature = Column(String(100), index=True, nullable=False)
    enabled = Column(Boolean, default=True, nullable=False)
    expires_at = Column(DateTime, index=True, nullable=True)
    created_date = Column(DateTime, default=datetime.utcnow, index=True)
    updated_date = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class FeatureKey(Base):
    __tablename__ = "feature_keys"

    id = Column(Integer, primary_key=True, index=True)
    key_hash = Column(String(128), unique=True, index=True, nullable=False)
    feature = Column(String(100), index=True, nullable=False)
    user_email = Column(String(255), index=True, nullable=True)  # Optional: restrict redemption
    redeemed_by = Column(String(255), index=True, nullable=True)
    redeemed_at = Column(DateTime, index=True, nullable=True)
    expires_at = Column(DateTime, index=True, nullable=True)
    created_date = Column(DateTime, default=datetime.utcnow, index=True)


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


class ApiKeyIssuanceLog(Base):
    """Audit log for API key issuance attempts (commercial/strategic tracking)."""
    __tablename__ = "api_key_issuance_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_email = Column(String(255), index=True, nullable=False)
    environment = Column(String(50), nullable=False)  # sandbox, production
    status = Column(String(50), nullable=False)  # success, rejected, error
    http_status = Column(Integer, nullable=True)
    api_key_id = Column(Integer, nullable=True)
    error_message = Column(Text, nullable=True)
    ip_address = Column(String(100), nullable=True)
    user_agent = Column(String(500), nullable=True)
    created_date = Column(DateTime, default=datetime.utcnow, index=True)


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
        
        table_names = inspector.get_table_names()
        if 'users' not in table_names:
            logger.info("Users table doesn't exist yet, will be created by Base.metadata.create_all")
            return

        user_columns = [col['name'] for col in inspector.get_columns('users')]
        logger.info(f"Existing columns in users table: {user_columns}")
        subscription_columns = []
        if 'subscriptions' in table_names:
            subscription_columns = [col['name'] for col in inspector.get_columns('subscriptions')]
            logger.info(f"Existing columns in subscriptions table: {subscription_columns}")
        
        with engine.begin() as connection:  # Use begin() for transaction management
            # USERS TABLE
            if DATABASE_URL.startswith("postgresql"):
                try:
                    connection.execute(text("CREATE UNIQUE INDEX IF NOT EXISTS users_email_lower_unique_idx ON users (LOWER(email));"))
                except (ProgrammingError, OperationalError) as e:
                    if "already exists" not in str(e).lower() and "duplicate" not in str(e).lower():
                        logger.warning(f"Could not ensure case-insensitive unique email index: {str(e)}")

            if 'reset_token' not in user_columns:
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
            
            if 'reset_token_expires' not in user_columns:
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
            
            if 'is_verified' not in user_columns:
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
            
            if 'verification_token' not in user_columns:
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
            
            if 'verification_token_expires' not in user_columns:
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

            if 'trial_used_at' not in user_columns:
                try:
                    logger.info("Adding trial_used_at column to users table...")
                    connection.execute(text("ALTER TABLE users ADD COLUMN trial_used_at TIMESTAMP;"))
                    logger.info("✅ Added trial_used_at column")
                except (ProgrammingError, OperationalError) as e:
                    if "already exists" not in str(e).lower() and "duplicate" not in str(e).lower():
                        logger.warning(f"Could not add trial_used_at column: {str(e)}")

            if 'telemetry_opt_in' not in user_columns:
                try:
                    logger.info("Adding telemetry_opt_in column to users table...")
                    if DATABASE_URL.startswith("postgresql"):
                        connection.execute(text("ALTER TABLE users ADD COLUMN telemetry_opt_in BOOLEAN DEFAULT FALSE;"))
                    else:
                        connection.execute(text("ALTER TABLE users ADD COLUMN telemetry_opt_in BOOLEAN DEFAULT 0;"))
                    logger.info("✅ Added telemetry_opt_in column")
                except (ProgrammingError, OperationalError) as e:
                    if "already exists" not in str(e).lower() and "duplicate" not in str(e).lower():
                        logger.warning(f"Could not add telemetry_opt_in column: {str(e)}")

            # SUBSCRIPTIONS TABLE
            if 'subscriptions' in table_names and 'cancelled_at' not in subscription_columns:
                try:
                    logger.info("Adding cancelled_at column to subscriptions table...")
                    connection.execute(text("ALTER TABLE subscriptions ADD COLUMN cancelled_at TIMESTAMP;"))
                    logger.info("✅ Added cancelled_at column")
                except (ProgrammingError, OperationalError) as e:
                    if "already exists" not in str(e).lower() and "duplicate" not in str(e).lower():
                        logger.warning(f"Could not add cancelled_at column: {str(e)}")

            if 'subscriptions' in table_names:
                # Ensure other Subscription columns exist for older DBs
                missing_subscription_columns = {
                    "trial_start_date": "TIMESTAMP",
                    "trial_end_date": "TIMESTAMP",
                    "trial_warning_sent_at": "TIMESTAMP",
                    "credentials_deleted_at": "TIMESTAMP",
                    "deletion_email_sent_at": "TIMESTAMP",
                    "subscription_start_date": "TIMESTAMP",
                    "subscription_end_date": "TIMESTAMP",
                    "ai_queries_used": "INTEGER DEFAULT 0",
                    "ai_queries_limit": "INTEGER DEFAULT 5",
                    "ai_queries_reset_at": "TIMESTAMP",
                    "files_uploaded": "INTEGER DEFAULT 0",
                    "workflow_runs_used": "INTEGER DEFAULT 0",
                    "workflow_runs_limit": "INTEGER DEFAULT 0",
                    "workflow_runs_reset_at": "TIMESTAMP",
                    "conversions_used": "INTEGER DEFAULT 0",
                    "conversions_limit": "INTEGER DEFAULT 0",
                    "conversions_reset_at": "TIMESTAMP",
                    "payment_status": "VARCHAR(50) DEFAULT 'unpaid'",
                    "transaction_id": "VARCHAR(255)",
                    "amount_paid": "FLOAT",
                    "stripe_customer_id": "VARCHAR(255)",
                    "stripe_subscription_id": "VARCHAR(255)",
                }
                for col_name, col_type in missing_subscription_columns.items():
                    if col_name in subscription_columns:
                        continue
                    try:
                        logger.info(f"Adding {col_name} column to subscriptions table...")
                        connection.execute(text(f"ALTER TABLE subscriptions ADD COLUMN {col_name} {col_type};"))
                        logger.info(f"✅ Added {col_name} column")
                    except (ProgrammingError, OperationalError) as e:
                        if "already exists" not in str(e).lower() and "duplicate" not in str(e).lower():
                            logger.warning(f"Could not add {col_name} column: {str(e)}")
                        
    except Exception as e:
        # If table doesn't exist or other error, that's ok - tables will be created
        logger.warning(f"Could not add missing columns (may already exist or table not created yet): {str(e)}")


if __name__ == "__main__":
    init_db()
    print("Database tables created successfully!")
