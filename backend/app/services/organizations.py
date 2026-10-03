"""
Organisations, seats and licences: what a university, hospital or company buys, and the limits
their members get. The routes are in app/routes/organizations.py.
"""
from __future__ import annotations

import json
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

from sqlalchemy.orm import Session

from app.database import License, Organization, OrganizationEvent, OrganizationMember
from app.services.plan_limits import Entitlements, merge_overrides, normalize_plan, personal_entitlements, plan_limits

SECTORS = ("university", "hospital", "insurance", "manufacturing", "company", "other")
ROLES = ("owner", "admin", "member")
LICENSE_STATUSES = ("pilot", "active", "suspended", "cancelled")
INVOICE_STATUSES = ("draft", "sent", "paid", "overdue", "void")

# Free email providers never identify an organisation, so they can't be used for domain auto-join.
PUBLIC_EMAIL_DOMAINS = {
    "gmail.com", "googlemail.com", "outlook.com", "hotmail.com", "live.com", "yahoo.com", "yahoo.co.in",
    "yahoo.co.uk", "icloud.com", "me.com", "aol.com", "proton.me", "protonmail.com", "rediffmail.com",
    "zoho.com", "gmx.com", "mail.com",
}


def email_domain(email: str) -> str:
    return (email or "").rsplit("@", 1)[-1].strip().lower()


def license_state(lic: Optional[License], now: Optional[datetime] = None) -> str:
    """active, grace (ended but inside the grace period), pending (not started), expired or the stored status."""
    if lic is None:
        return "none"
    now = now or datetime.utcnow()
    status = (lic.status or "active").lower()
    if status in ("suspended", "cancelled"):
        return status
    if lic.start_date and now < lic.start_date:
        return "pending"
    if lic.end_date and now > lic.end_date:
        grace_end = lic.end_date + timedelta(days=int(lic.grace_days or 0))
        return "grace" if now <= grace_end else "expired"
    return "active"


def license_gives_access(lic: Optional[License], now: Optional[datetime] = None) -> bool:
    return license_state(lic, now) in ("active", "grace")


def current_license(db: Session, organization_id: int, now: Optional[datetime] = None) -> Optional[License]:
    """The licence that applies now: one giving access if any (latest end date first), else the newest."""
    rows = (
        db.query(License)
        .filter(License.organization_id == organization_id)
        .order_by(License.end_date.desc())
        .all()
    )
    for lic in rows:
        if license_gives_access(lic, now):
            return lic
    return rows[0] if rows else None


def seats_used(db: Session, organization_id: int) -> int:
    return (
        db.query(OrganizationMember)
        .filter(OrganizationMember.organization_id == organization_id, OrganizationMember.status == "active")
        .count()
    )


def active_membership(db: Session, user_email: str) -> Optional[OrganizationMember]:
    email = (user_email or "").strip().lower()
    return (
        db.query(OrganizationMember)
        .filter(OrganizationMember.user_email == email, OrganizationMember.status == "active")
        .first()
    )


def log_event(db: Session, organization_id: int, actor: Optional[str], event_type: str, details: Any = None) -> None:
    db.add(OrganizationEvent(
        organization_id=organization_id,
        actor_email=actor,
        event_type=event_type[:100],
        details=json.dumps(details, default=str) if details is not None else None,
    ))


def license_features(lic: Optional[License]) -> Dict[str, bool]:
    if lic is None or not lic.features_json:
        return {}
    try:
        data = json.loads(lic.features_json) or {}
    except ValueError:
        return {}
    return {str(k): bool(v) for k, v in data.items()}


def license_summary(db: Session, org: Organization, lic: Optional[License], now: Optional[datetime] = None) -> Dict[str, Any]:
    now = now or datetime.utcnow()
    used = seats_used(db, org.id)
    out: Dict[str, Any] = {
        "organization_id": org.id,
        "name": org.name,
        "sector": org.sector,
        "seats_used": used,
    }
    if lic is not None:
        days_left = (lic.end_date - now).days if lic.end_date else None
        out.update({
            "license_id": lic.id,
            "plan": normalize_plan(lic.plan),
            "pack": lic.pack,
            "seats": int(lic.seats or 0),
            "start_date": lic.start_date.isoformat() if lic.start_date else None,
            "end_date": lic.end_date.isoformat() if lic.end_date else None,
            "state": license_state(lic, now),
            "days_left": days_left,
        })
    else:
        out.update({"license_id": None, "plan": None, "seats": 0, "state": "none"})
    return out


def try_domain_auto_join(db: Session, user_email: str) -> Optional[OrganizationMember]:
    """Give a seat to someone whose email domain belongs to an organisation with auto-join on and seats left."""
    email = (user_email or "").strip().lower()
    domain = email_domain(email)
    if not domain or domain in PUBLIC_EMAIL_DOMAINS:
        return None
    if db.query(OrganizationMember).filter(OrganizationMember.user_email == email).first():
        return None  # already a member, or was removed (an admin must re-add them)
    org = (
        db.query(Organization)
        .filter(Organization.email_domain == domain, Organization.auto_join.is_(True))
        .first()
    )
    if org is None:
        return None
    lic = current_license(db, org.id)
    if not license_gives_access(lic) or seats_used(db, org.id) >= int(lic.seats or 0):
        return None
    member = OrganizationMember(organization_id=org.id, user_email=email, role="member", joined_via="domain")
    db.add(member)
    log_event(db, org.id, email, "member_joined_by_domain", {"email": email})
    db.commit()
    return member


def resolve_entitlements(db: Session, user_email: str, personal_plan: Optional[str]) -> Entitlements:
    """
    The limits that apply to this user: their organisation's licence when they hold a seat on one that
    gives access (taking their own plan's figure for any limit where it is higher); otherwise their own plan.
    """
    personal = personal_entitlements(personal_plan)
    member = active_membership(db, user_email)
    if member is None:
        return personal
    org = db.query(Organization).filter(Organization.id == member.organization_id).first()
    if org is None:
        return personal
    lic = current_license(db, org.id)
    org_info = {
        "id": org.id,
        "name": org.name,
        "role": member.role,
        "license_state": license_state(lic),
        "license_end": lic.end_date.isoformat() if lic and lic.end_date else None,
    }
    if not license_gives_access(lic):
        personal.organization = org_info
        return personal
    plan = normalize_plan(lic.plan)
    limits = merge_overrides(plan_limits(plan), lic.limits_json)
    # Never give a paying individual less than their own plan because they joined an organisation.
    for key, mine in personal.limits.items():
        theirs = limits.get(key)
        if theirs is not None and theirs != -1 and (mine == -1 or mine > theirs):
            limits[key] = mine
    return Entitlements(
        plan=plan,
        limits=limits,
        source="organization",
        organization=org_info,
        features=license_features(lic),
    )


def renewals_due(db: Session, within_days: int = 90, now: Optional[datetime] = None) -> List[License]:
    now = now or datetime.utcnow()
    horizon = now + timedelta(days=within_days)
    return (
        db.query(License)
        .filter(License.end_date >= now - timedelta(days=30), License.end_date <= horizon)
        .filter(License.status.in_(("active", "pilot")))
        .order_by(License.end_date.asc())
        .all()
    )


def annualised_value(lic: License) -> float:
    """Contract value per year (ARR contribution); a 2-year deal of 20,000 counts 10,000."""
    if not lic.start_date or not lic.end_date:
        return float(lic.contract_value or 0)
    days = max(1, (lic.end_date - lic.start_date).days)
    return float(lic.contract_value or 0) * 365.0 / days


__all__ = [
    "SECTORS",
    "ROLES",
    "LICENSE_STATUSES",
    "INVOICE_STATUSES",
    "PUBLIC_EMAIL_DOMAINS",
    "email_domain",
    "license_state",
    "license_gives_access",
    "current_license",
    "seats_used",
    "active_membership",
    "log_event",
    "license_summary",
    "try_domain_auto_join",
    "resolve_entitlements",
    "renewals_due",
    "annualised_value",
]
