"""
Data retention: personal data is kept only as long as it is needed, then deleted.

Runs on a schedule in one worker (see the background jobs in app.main). Each period can be changed
with an environment variable. Billing and subscription-change records are financial records and are
not deleted here.
"""
import os
from datetime import datetime, timedelta
from typing import Dict, Optional

from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.database import (
    ConsentLog,
    InvoiceExtractionJob,
    LearningSignal,
    LoginHistory,
    LoginOtpChallenge,
    PlaywrightJob,
    UserActivity,
    UserSession,
)


def _days(name: str, default: int) -> int:
    try:
        return max(1, int(os.getenv(name, str(default))))
    except ValueError:
        return default


def retention_policy() -> Dict[str, int]:
    """Days each kind of record is kept (after it expires, for records that expire)."""
    return {
        "login_history": _days("LOGIN_HISTORY_RETENTION_DAYS", 90),
        "activity": _days("ACTIVITY_RETENTION_DAYS", 90),
        "usage_signals": _days("USAGE_SIGNAL_RETENTION_DAYS", 180),
        "consent_records": _days("CONSENT_RETENTION_DAYS", 730),
        "ended_sessions": _days("ENDED_SESSION_RETENTION_DAYS", 30),
        "expired_codes": 1,
    }


def purge_expired_personal_data(db: Session, now: Optional[datetime] = None) -> Dict[str, int]:
    """Delete personal data past its retention period. Returns how many rows each rule removed."""
    now = now or datetime.utcnow()
    days = retention_policy()
    rules = {
        # Job results hold extracted document data: gone as soon as the job expires.
        "invoice_jobs": db.query(InvoiceExtractionJob).filter(InvoiceExtractionJob.expires_at < now),
        "scraping_jobs": db.query(PlaywrightJob).filter(PlaywrightJob.expires_at < now),
        "sign_in_codes": db.query(LoginOtpChallenge).filter(
            LoginOtpChallenge.expires_at < now - timedelta(days=days["expired_codes"])
        ),
        "device_sessions": db.query(UserSession).filter(
            or_(
                UserSession.expires_at < now - timedelta(days=days["ended_sessions"]),
                UserSession.revoked_at < now - timedelta(days=days["ended_sessions"]),
            )
        ),
        "login_history": db.query(LoginHistory).filter(LoginHistory.created_date < now - timedelta(days=days["login_history"])),
        "activity": db.query(UserActivity).filter(UserActivity.created_date < now - timedelta(days=days["activity"])),
        "usage_signals": db.query(LearningSignal).filter(LearningSignal.created_date < now - timedelta(days=days["usage_signals"])),
        "consent_records": db.query(ConsentLog).filter(ConsentLog.created_date < now - timedelta(days=days["consent_records"])),
    }
    removed = {}
    for name, query in rules.items():
        removed[name] = query.delete(synchronize_session=False)
    db.commit()
    return removed
