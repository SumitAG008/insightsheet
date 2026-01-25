"""
API Key Service for developer.meldra.ai
Handles API key generation, validation, usage tracking, and billing
"""
import secrets
import hashlib
import logging
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, extract

from app.database import ApiKey, ApiUsage, ApiBilling
from app.utils.auth import get_password_hash

logger = logging.getLogger(__name__)


def generate_api_key(prefix: str = "meldra") -> tuple[str, str]:
    """
    Generate a new API key.
    Returns: (full_key, key_hash)
    """
    # Generate 32 random bytes (256 bits)
    random_bytes = secrets.token_bytes(32)
    # Convert to hex string (64 chars)
    key_suffix = random_bytes.hex()
    full_key = f"{prefix}_{key_suffix}"
    
    # Hash the key (similar to password hashing)
    key_hash = hashlib.sha256(full_key.encode()).hexdigest()
    
    return full_key, key_hash


def verify_api_key(provided_key: str, key_hash: str) -> bool:
    """Verify an API key against its hash"""
    computed_hash = hashlib.sha256(provided_key.encode()).hexdigest()
    return computed_hash == key_hash


def get_api_key_by_header(api_key_header: Optional[str], db: Session) -> Optional[ApiKey]:
    """Get API key from X-API-Key header"""
    if not api_key_header:
        return None
    
    # Find by key prefix (first 8-12 chars)
    prefix = api_key_header[:12] if len(api_key_header) > 12 else api_key_header.split('_')[0] if '_' in api_key_header else api_key_header[:8]
    
    # Query all active keys and verify
    keys = db.query(ApiKey).filter(
        and_(ApiKey.is_active == True, ApiKey.key_prefix.like(f"{prefix}%"))
    ).all()
    
    for key in keys:
        if verify_api_key(api_key_header, key.key_hash):
            return key
    
    return None


def track_api_usage(
    db: Session,
    api_key: ApiKey,
    endpoint: str,
    method: str,
    status_code: int,
    request_size_bytes: Optional[int] = None,
    response_size_bytes: Optional[int] = None,
    processing_time_ms: Optional[int] = None,
    tokens_used: int = 0,
    ip_address: Optional[str] = None,
    user_agent: Optional[str] = None,
) -> ApiUsage:
    """Track API usage for billing and analytics"""
    
    # Calculate cost (example pricing - adjust based on your costs)
    cost_per_request = 0.001  # $0.001 per request base
    cost_per_token = 0.00001  # $0.00001 per token (if applicable)
    cost_usd = cost_per_request + (tokens_used * cost_per_token)
    
    usage = ApiUsage(
        api_key_id=api_key.id,
        user_email=api_key.user_email,
        endpoint=endpoint,
        method=method,
        status_code=status_code,
        request_size_bytes=request_size_bytes,
        response_size_bytes=response_size_bytes,
        processing_time_ms=processing_time_ms,
        tokens_used=tokens_used,
        cost_usd=cost_usd,
        ip_address=ip_address,
        user_agent=user_agent,
    )
    db.add(usage)
    
    # Update last_used on API key
    api_key.last_used = datetime.utcnow()
    db.commit()
    
    return usage


def get_usage_stats(
    db: Session,
    api_key_id: Optional[int] = None,
    user_email: Optional[str] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
) -> Dict[str, Any]:
    """Get usage statistics"""
    query = db.query(ApiUsage)
    
    if api_key_id:
        query = query.filter(ApiUsage.api_key_id == api_key_id)
    if user_email:
        query = query.filter(ApiUsage.user_email == user_email)
    if start_date:
        query = query.filter(ApiUsage.created_date >= start_date)
    if end_date:
        query = query.filter(ApiUsage.created_date <= end_date)
    
    total_requests = query.count()
    total_cost = query.with_entities(func.sum(ApiUsage.cost_usd)).scalar() or 0.0
    total_tokens = query.with_entities(func.sum(ApiUsage.tokens_used)).scalar() or 0
    
    # By endpoint
    endpoint_stats = db.query(
        ApiUsage.endpoint,
        func.count(ApiUsage.id).label('count'),
        func.sum(ApiUsage.cost_usd).label('cost')
    ).group_by(ApiUsage.endpoint).all()
    
    # By status code
    status_stats = db.query(
        ApiUsage.status_code,
        func.count(ApiUsage.id).label('count')
    ).group_by(ApiUsage.status_code).all()
    
    return {
        "total_requests": total_requests,
        "total_cost_usd": float(total_cost),
        "total_tokens": total_tokens,
        "by_endpoint": [{"endpoint": e, "count": c, "cost_usd": float(cost)} for e, c, cost in endpoint_stats],
        "by_status": [{"status_code": s, "count": c} for s, c in status_stats],
    }


def get_monthly_billing(
    db: Session,
    api_key_id: int,
    year: int,
    month: int,
) -> Optional[ApiBilling]:
    """Get or create monthly billing record"""
    billing_key = f"{year}-{month:02d}"
    
    billing = db.query(ApiBilling).filter(
        and_(
            ApiBilling.api_key_id == api_key_id,
            ApiBilling.billing_month == billing_key
        )
    ).first()
    
    if not billing:
        api_key = db.query(ApiKey).filter(ApiKey.id == api_key_id).first()
        if not api_key:
            return None
        
        billing = ApiBilling(
            api_key_id=api_key_id,
            user_email=api_key.user_email,
            billing_month=billing_key,
        )
        db.add(billing)
        db.commit()
        db.refresh(billing)
    
    return billing


def update_monthly_billing(db: Session, api_key_id: int) -> None:
    """Update monthly billing from usage"""
    now = datetime.utcnow()
    year = now.year
    month = now.month
    
    # Get all usage for this month
    start_of_month = datetime(year, month, 1)
    end_of_month = datetime(year, month + 1, 1) if month < 12 else datetime(year + 1, 1, 1)
    
    usage_query = db.query(ApiUsage).filter(
        and_(
            ApiUsage.api_key_id == api_key_id,
            ApiUsage.created_date >= start_of_month,
            ApiUsage.created_date < end_of_month
        )
    )
    
    total_requests = usage_query.count()
    total_cost = usage_query.with_entities(func.sum(ApiUsage.cost_usd)).scalar() or 0.0
    total_tokens = usage_query.with_entities(func.sum(ApiUsage.tokens_used)).scalar() or 0
    
    # Hardware cost (example: 30% of revenue for infrastructure)
    hardware_cost = total_cost * 0.30
    margin = total_cost - hardware_cost
    
    billing = get_monthly_billing(db, api_key_id, year, month)
    if billing:
        billing.total_requests = total_requests
        billing.total_tokens = total_tokens
        billing.total_cost_usd = float(total_cost)
        billing.hardware_cost_usd = float(hardware_cost)
        billing.margin_usd = float(margin)
        billing.updated_date = datetime.utcnow()
        db.commit()
