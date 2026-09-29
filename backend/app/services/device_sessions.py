"""
Signed-in devices: a subscription can be active on at most MAX_ACTIVE_DEVICES devices at once.

Each sign-in creates a session (one per device). The login token carries the session id, and every
request checks the session is still active, so signing a device out takes effect immediately.
Signing in again on the same device replaces its old session instead of using another slot.
"""
import os
import secrets
from datetime import datetime, timedelta
from typing import List, Optional

from sqlalchemy.orm import Session

from app.database import UserSession

LAST_SEEN_UPDATE_SECONDS = 300  # write last_seen_at at most every 5 minutes per session


def max_active_devices() -> int:
    try:
        return max(1, int(os.getenv("MAX_ACTIVE_DEVICES", "2")))
    except ValueError:
        return 2


class DeviceLimitReached(Exception):
    def __init__(self, devices: List[dict], limit: int):
        super().__init__("device limit reached")
        self.devices = devices
        self.limit = limit


def _mask_ip(ip: Optional[str]) -> Optional[str]:
    if not ip:
        return None
    if ":" in ip:  # IPv6: keep the first two groups
        return ":".join(ip.split(":")[:2]) + ":…"
    parts = ip.split(".")
    return ".".join(parts[:2] + ["…"]) if len(parts) == 4 else None


def describe(s: UserSession, current_sid: Optional[str] = None) -> dict:
    return {
        "id": s.session_id,
        "device": s.device_label or "Unknown device",
        "location": s.location,
        "ip": _mask_ip(s.ip_address),
        "signed_in_at": s.created_at.isoformat() + "Z" if s.created_at else None,
        "last_active_at": s.last_seen_at.isoformat() + "Z" if s.last_seen_at else None,
        "current": bool(current_sid and s.session_id == current_sid),
    }


def active_sessions(db: Session, email: str, now: Optional[datetime] = None) -> List[UserSession]:
    now = now or datetime.utcnow()
    return (
        db.query(UserSession)
        .filter(UserSession.user_email == email, UserSession.revoked_at.is_(None), UserSession.expires_at > now)
        .order_by(UserSession.last_seen_at.desc())
        .all()
    )


def _revoke(s: UserSession, reason: str, now: datetime) -> None:
    s.revoked_at = now
    s.revoked_reason = reason


def start_session(
    db: Session,
    email: str,
    *,
    device_id: Optional[str],
    device_label: Optional[str],
    ip: Optional[str],
    location: Optional[str],
    lifetime: timedelta,
    sign_out_ids: Optional[List[str]] = None,
) -> UserSession:
    """
    Open a session for this device, or raise DeviceLimitReached (nothing is changed) when the
    account is already active on the maximum number of other devices and the caller did not
    choose which of them to sign out.
    """
    now = datetime.utcnow()
    device_id = (device_id or "").strip()[:64] or None
    active = active_sessions(db, email, now)
    same_device = [s for s in active if device_id and s.device_id == device_id]
    others = [s for s in active if s not in same_device]
    chosen = {sid for sid in (sign_out_ids or []) if sid}
    to_sign_out = [s for s in others if s.session_id in chosen]
    remaining = [s for s in others if s.session_id not in chosen]

    limit = max_active_devices()
    if len(remaining) >= limit:
        raise DeviceLimitReached([describe(s) for s in remaining], limit)

    for s in same_device:
        _revoke(s, "replaced", now)
    for s in to_sign_out:
        _revoke(s, "signed_out_by_other_device", now)
    session = UserSession(
        session_id=secrets.token_urlsafe(32),
        user_email=email,
        device_id=device_id,
        device_label=(device_label or "")[:255] or None,
        ip_address=(ip or "")[:100] or None,
        location=(location or "")[:255] or None,
        created_at=now,
        last_seen_at=now,
        expires_at=now + lifetime,
    )
    db.add(session)
    db.commit()
    return session


def session_is_active(db: Session, session_id: str, email: str) -> bool:
    """True when the session exists for this user and is neither signed out nor expired."""
    now = datetime.utcnow()
    s = db.query(UserSession).filter(UserSession.session_id == session_id).first()
    if s is None or s.user_email != email or s.revoked_at is not None or s.expires_at <= now:
        return False
    if s.last_seen_at is None or (now - s.last_seen_at).total_seconds() > LAST_SEEN_UPDATE_SECONDS:
        s.last_seen_at = now
        try:
            db.commit()
        except Exception:
            db.rollback()
    return True


def revoke_session(db: Session, email: str, session_id: str, reason: str) -> bool:
    s = db.query(UserSession).filter(UserSession.session_id == session_id, UserSession.user_email == email).first()
    if s is None or s.revoked_at is not None:
        return False
    _revoke(s, reason, datetime.utcnow())
    db.commit()
    return True
