"""
Organisations and licences.

/api/admin/orgs...   meldra staff: set up a customer, record the deal (seats, term, limits, money),
                     and see renewals, seat use and contract value in one report.
/api/org/...         The customer's own admins: add and remove people, see seat and usage figures,
                     export usage, and see who changed what.

No file names or contents are stored or shown here; usage is counts only.
"""
from __future__ import annotations

import csv
import hmac
import io
import json
import os
from collections import defaultdict
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, Header, HTTPException, Response
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.database import (
    License,
    Organization,
    OrganizationEvent,
    OrganizationMember,
    Subscription,
    User,
    UserSession,
    get_db,
)
from app.services import organizations as orgsvc
from app.services import server_guard
from app.services.email_service import send_simple_email
from app.services.plan_limits import LIMIT_KEYS, merge_overrides, normalize_plan, plan_limits
from app.utils.auth import get_current_admin_user, get_current_user

router = APIRouter(tags=["organizations"])

_DATE_HELP = "ISO date, e.g. 2026-09-01"


def _parse_date(value: Optional[str], field: str) -> Optional[datetime]:
    if value is None or value == "":
        return None
    try:
        return datetime.fromisoformat(str(value).replace("Z", "+00:00")).replace(tzinfo=None)
    except ValueError:
        raise HTTPException(status_code=400, detail=f"{field} must be an {_DATE_HELP}")


def _iso(dt: Optional[datetime]) -> Optional[str]:
    return dt.isoformat() if dt else None


def _norm_email(email: str) -> str:
    return str(email or "").strip().lower()


def _clean_limits(limits: Optional[Dict[str, Any]]) -> Optional[str]:
    if not limits:
        return None
    unknown = [k for k in limits if k not in LIMIT_KEYS]
    if unknown:
        raise HTTPException(status_code=400, detail=f"Unknown limit(s): {', '.join(unknown)}. Allowed: {', '.join(LIMIT_KEYS)}")
    return json.dumps(limits)


def _org_or_404(db: Session, org_id: int) -> Organization:
    org = db.query(Organization).filter(Organization.id == org_id).first()
    if org is None:
        raise HTTPException(status_code=404, detail="Organisation not found")
    return org


def _org_dict(org: Organization) -> Dict[str, Any]:
    return {
        "id": org.id,
        "name": org.name,
        "sector": org.sector,
        "country": org.country,
        "email_domain": org.email_domain,
        "auto_join": bool(org.auto_join),
        "billing_email": org.billing_email,
        "billing_address": org.billing_address,
        "tax_id": org.tax_id,
        "crm_ref": org.crm_ref,
        "notes": org.notes,
        "created_date": _iso(org.created_date),
    }


def _license_dict(lic: License, now: Optional[datetime] = None) -> Dict[str, Any]:
    plan = normalize_plan(lic.plan)
    return {
        "id": lic.id,
        "organization_id": lic.organization_id,
        "plan": plan,
        "pack": lic.pack,
        "seats": int(lic.seats or 0),
        "start_date": _iso(lic.start_date),
        "end_date": _iso(lic.end_date),
        "grace_days": int(lic.grace_days or 0),
        "status": lic.status,
        "state": orgsvc.license_state(lic, now),
        "limits_override": json.loads(lic.limits_json) if lic.limits_json else {},
        "effective_limits": merge_overrides(plan_limits(plan), lic.limits_json),
        "features": orgsvc.license_features(lic),
        "contract_value": float(lic.contract_value or 0),
        "annual_value": round(orgsvc.annualised_value(lic), 2),
        "currency": lic.currency,
        "billing_period": lic.billing_period,
        "po_number": lic.po_number,
        "invoice_number": lic.invoice_number,
        "invoice_status": lic.invoice_status,
        "paid_date": _iso(lic.paid_date),
        "notes": lic.notes,
        "created_by": lic.created_by,
        "created_date": _iso(lic.created_date),
    }


def _member_usage(db: Session, emails: List[str]) -> Dict[str, Dict[str, Any]]:
    """This month's counts per member (conversions, AI questions, MB uploaded) and when last seen."""
    if not emails:
        return {}
    out: Dict[str, Dict[str, Any]] = {e: {"conversions": 0, "ai_queries": 0, "upload_mb": 0.0, "last_seen": None} for e in emails}
    for sub in db.query(Subscription).filter(Subscription.user_email.in_(emails)).all():
        row = out.setdefault(sub.user_email, {})
        row["conversions"] = int(sub.conversions_used or 0)
        row["ai_queries"] = int(sub.ai_queries_used or 0)
        row["upload_mb"] = round((sub.workflow_runs_used or 0) / (1024 * 1024), 1)
    seen = (
        db.query(UserSession.user_email, func.max(UserSession.last_seen_at))
        .filter(UserSession.user_email.in_(emails))
        .group_by(UserSession.user_email)
        .all()
    )
    for email, last in seen:
        if email in out:
            out[email]["last_seen"] = _iso(last)
    registered = {e for (e,) in db.query(User.email).filter(User.email.in_(emails)).all()}
    for e in emails:
        out[e]["registered"] = e in registered
    return out


def _add_member(db: Session, org: Organization, email: str, role: str, actor: str, via: str, enforce_seats: bool = True) -> OrganizationMember:
    email = _norm_email(email)
    if role not in orgsvc.ROLES:
        raise HTTPException(status_code=400, detail=f"role must be one of {', '.join(orgsvc.ROLES)}")
    existing = db.query(OrganizationMember).filter(OrganizationMember.user_email == email).first()
    if existing and existing.status == "active":
        if existing.organization_id != org.id:
            raise HTTPException(status_code=409, detail=f"{email} already belongs to another organisation.")
        raise HTTPException(status_code=409, detail=f"{email} is already a member.")
    if enforce_seats:
        lic = orgsvc.current_license(db, org.id)
        if not orgsvc.license_gives_access(lic):
            raise HTTPException(status_code=402, detail="This organisation has no active licence. Contact meldra to renew.")
        if orgsvc.seats_used(db, org.id) >= int(lic.seats or 0):
            raise HTTPException(
                status_code=402,
                detail=f"All {int(lic.seats or 0)} seats are in use. Remove someone or contact meldra to add seats.",
            )
    if existing:  # re-adding someone removed earlier (from this or another organisation)
        existing.organization_id = org.id
        existing.status = "active"
        existing.role = role
        existing.added_by = actor
        existing.joined_via = via
        member = existing
    else:
        member = OrganizationMember(organization_id=org.id, user_email=email, role=role, added_by=actor, joined_via=via)
        db.add(member)
    orgsvc.log_event(db, org.id, actor, "member_added", {"email": email, "role": role})
    db.commit()
    server_guard.forget_limits(email)
    return member


def _remove_member(db: Session, org: Organization, email: str, actor: str) -> None:
    email = _norm_email(email)
    member = (
        db.query(OrganizationMember)
        .filter(OrganizationMember.organization_id == org.id, OrganizationMember.user_email == email,
                OrganizationMember.status == "active")
        .first()
    )
    if member is None:
        raise HTTPException(status_code=404, detail="Member not found")
    if member.role == "owner":
        owners = (
            db.query(OrganizationMember)
            .filter(OrganizationMember.organization_id == org.id, OrganizationMember.role == "owner",
                    OrganizationMember.status == "active")
            .count()
        )
        if owners <= 1:
            raise HTTPException(status_code=400, detail="An organisation must keep at least one owner. Make someone else owner first.")
    member.status = "removed"
    orgsvc.log_event(db, org.id, actor, "member_removed", {"email": email})
    db.commit()
    server_guard.forget_limits(email)


def _set_role(db: Session, org: Organization, email: str, role: str, actor: str) -> OrganizationMember:
    if role not in orgsvc.ROLES:
        raise HTTPException(status_code=400, detail=f"role must be one of {', '.join(orgsvc.ROLES)}")
    member = (
        db.query(OrganizationMember)
        .filter(OrganizationMember.organization_id == org.id, OrganizationMember.user_email == _norm_email(email),
                OrganizationMember.status == "active")
        .first()
    )
    if member is None:
        raise HTTPException(status_code=404, detail="Member not found")
    if member.role == "owner" and role != "owner":
        owners = (
            db.query(OrganizationMember)
            .filter(OrganizationMember.organization_id == org.id, OrganizationMember.role == "owner",
                    OrganizationMember.status == "active")
            .count()
        )
        if owners <= 1:
            raise HTTPException(status_code=400, detail="An organisation must keep at least one owner.")
    prev = member.role
    member.role = role
    orgsvc.log_event(db, org.id, actor, "member_role_changed", {"email": member.user_email, "from": prev, "to": role})
    db.commit()
    return member


def _members_payload(db: Session, org: Organization) -> List[Dict[str, Any]]:
    members = (
        db.query(OrganizationMember)
        .filter(OrganizationMember.organization_id == org.id, OrganizationMember.status == "active")
        .order_by(OrganizationMember.created_date.asc())
        .all()
    )
    usage = _member_usage(db, [m.user_email for m in members])
    return [
        {
            "email": m.user_email,
            "role": m.role,
            "joined_via": m.joined_via,
            "added_date": _iso(m.created_date),
            **usage.get(m.user_email, {}),
        }
        for m in members
    ]


def _usage_csv(rows: List[Dict[str, Any]]) -> str:
    buf = io.StringIO()
    w = csv.writer(buf)
    w.writerow(["email", "role", "registered", "conversions_this_month", "ai_questions_this_month", "upload_mb_this_month", "last_seen"])
    for r in rows:
        w.writerow([r["email"], r["role"], "yes" if r.get("registered") else "no", r.get("conversions", 0),
                    r.get("ai_queries", 0), r.get("upload_mb", 0), r.get("last_seen") or ""])
    return buf.getvalue()


# ---------------------------------------------------------------------------
# meldra admin: organisations, licences and the licence report
# ---------------------------------------------------------------------------

class OrgCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=255)
    sector: str = Field("other")
    country: Optional[str] = Field(None, max_length=100)
    email_domain: Optional[str] = Field(None, max_length=255)
    auto_join: bool = False
    billing_email: Optional[EmailStr] = None
    billing_address: Optional[str] = Field(None, max_length=2000)
    tax_id: Optional[str] = Field(None, max_length=100)
    crm_ref: Optional[str] = Field(None, max_length=255)
    notes: Optional[str] = Field(None, max_length=5000)
    owner_email: Optional[EmailStr] = None  # the customer's admin; gets the owner role


class OrgUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=255)
    sector: Optional[str] = None
    country: Optional[str] = Field(None, max_length=100)
    email_domain: Optional[str] = Field(None, max_length=255)
    auto_join: Optional[bool] = None
    billing_email: Optional[EmailStr] = None
    billing_address: Optional[str] = Field(None, max_length=2000)
    tax_id: Optional[str] = Field(None, max_length=100)
    crm_ref: Optional[str] = Field(None, max_length=255)
    notes: Optional[str] = Field(None, max_length=5000)


class LicenseCreate(BaseModel):
    plan: str = Field("team", pattern="^(pro|team|business)$")
    pack: Optional[str] = Field(None, max_length=50)
    seats: int = Field(..., ge=1, le=100_000)
    start_date: str
    end_date: str
    grace_days: int = Field(14, ge=0, le=90)
    status: str = Field("active", pattern="^(pilot|active|suspended|cancelled)$")
    limits: Optional[Dict[str, Any]] = None
    features: Optional[Dict[str, bool]] = None
    contract_value: float = Field(0.0, ge=0)
    currency: str = Field("INR", pattern="^[A-Z]{3}$")
    billing_period: str = Field("annual", pattern="^(monthly|annual|multi_year)$")
    po_number: Optional[str] = Field(None, max_length=100)
    invoice_number: Optional[str] = Field(None, max_length=100)
    invoice_status: str = Field("draft", pattern="^(draft|sent|paid|overdue|void)$")
    paid_date: Optional[str] = None
    notes: Optional[str] = Field(None, max_length=5000)


class LicenseUpdate(BaseModel):
    plan: Optional[str] = Field(None, pattern="^(pro|team|business)$")
    pack: Optional[str] = Field(None, max_length=50)
    seats: Optional[int] = Field(None, ge=1, le=100_000)
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    grace_days: Optional[int] = Field(None, ge=0, le=90)
    status: Optional[str] = Field(None, pattern="^(pilot|active|suspended|cancelled)$")
    limits: Optional[Dict[str, Any]] = None
    features: Optional[Dict[str, bool]] = None
    contract_value: Optional[float] = Field(None, ge=0)
    currency: Optional[str] = Field(None, pattern="^[A-Z]{3}$")
    billing_period: Optional[str] = Field(None, pattern="^(monthly|annual|multi_year)$")
    po_number: Optional[str] = Field(None, max_length=100)
    invoice_number: Optional[str] = Field(None, max_length=100)
    invoice_status: Optional[str] = Field(None, pattern="^(draft|sent|paid|overdue|void)$")
    paid_date: Optional[str] = None
    notes: Optional[str] = Field(None, max_length=5000)


class MemberAdd(BaseModel):
    email: EmailStr
    role: str = Field("member", pattern="^(owner|admin|member)$")


class MemberRole(BaseModel):
    role: str = Field(..., pattern="^(owner|admin|member)$")


class RenewalRequest(BaseModel):
    seats: Optional[int] = Field(None, ge=1, le=100000)
    message: Optional[str] = Field(None, max_length=2000)


def _check_sector(sector: Optional[str]) -> None:
    if sector is not None and sector not in orgsvc.SECTORS:
        raise HTTPException(status_code=400, detail=f"sector must be one of {', '.join(orgsvc.SECTORS)}")


def _check_domain(domain: Optional[str]) -> Optional[str]:
    if not domain:
        return None
    d = domain.strip().lower().lstrip("@")
    if d in orgsvc.PUBLIC_EMAIL_DOMAINS:
        raise HTTPException(status_code=400, detail=f"{d} is a public email provider and can't identify an organisation.")
    return d


@router.get("/api/admin/orgs")
def admin_list_orgs(current_user: dict = Depends(get_current_admin_user), db: Session = Depends(get_db)):
    now = datetime.utcnow()
    out = []
    for org in db.query(Organization).order_by(Organization.name.asc()).all():
        lic = orgsvc.current_license(db, org.id, now)
        summary = orgsvc.license_summary(db, org, lic, now)
        summary.update({
            "email_domain": org.email_domain,
            "crm_ref": org.crm_ref,
            "annual_value": round(orgsvc.annualised_value(lic), 2) if lic else 0,
            "currency": lic.currency if lic else None,
            "invoice_status": lic.invoice_status if lic else None,
        })
        out.append(summary)
    return {"organizations": out}


@router.post("/api/admin/orgs")
def admin_create_org(payload: OrgCreate, current_user: dict = Depends(get_current_admin_user), db: Session = Depends(get_db)):
    _check_sector(payload.sector)
    org = Organization(
        name=payload.name.strip(),
        sector=payload.sector,
        country=payload.country,
        email_domain=_check_domain(payload.email_domain),
        auto_join=bool(payload.auto_join),
        billing_email=str(payload.billing_email) if payload.billing_email else None,
        billing_address=payload.billing_address,
        tax_id=payload.tax_id,
        crm_ref=payload.crm_ref,
        notes=payload.notes,
    )
    db.add(org)
    db.flush()
    orgsvc.log_event(db, org.id, current_user["email"], "organization_created", {"name": org.name})
    db.commit()
    if payload.owner_email:
        _add_member(db, org, str(payload.owner_email), "owner", current_user["email"], "admin", enforce_seats=False)
    return _org_dict(org)


@router.get("/api/admin/orgs/{org_id}")
def admin_get_org(org_id: int, current_user: dict = Depends(get_current_admin_user), db: Session = Depends(get_db)):
    org = _org_or_404(db, org_id)
    now = datetime.utcnow()
    licenses = db.query(License).filter(License.organization_id == org.id).order_by(License.start_date.desc()).all()
    events = (
        db.query(OrganizationEvent)
        .filter(OrganizationEvent.organization_id == org.id)
        .order_by(OrganizationEvent.created_date.desc())
        .limit(200)
        .all()
    )
    return {
        "organization": _org_dict(org),
        "current": orgsvc.license_summary(db, org, orgsvc.current_license(db, org.id, now), now),
        "licenses": [_license_dict(l, now) for l in licenses],
        "members": _members_payload(db, org),
        "events": [_event_dict(e) for e in events],
    }


@router.patch("/api/admin/orgs/{org_id}")
def admin_update_org(org_id: int, payload: OrgUpdate, current_user: dict = Depends(get_current_admin_user), db: Session = Depends(get_db)):
    org = _org_or_404(db, org_id)
    data = payload.model_dump(exclude_unset=True)
    if "sector" in data:
        _check_sector(data["sector"])
    if "email_domain" in data:
        data["email_domain"] = _check_domain(data["email_domain"])
    if "billing_email" in data and data["billing_email"] is not None:
        data["billing_email"] = str(data["billing_email"])
    for k, v in data.items():
        setattr(org, k, v)
    orgsvc.log_event(db, org.id, current_user["email"], "organization_updated", sorted(data))
    db.commit()
    return _org_dict(org)


def _members_emails(db: Session, org_id: int) -> List[str]:
    return [m.user_email for m in db.query(OrganizationMember).filter(OrganizationMember.organization_id == org_id).all()]


@router.post("/api/admin/orgs/{org_id}/licenses")
def admin_create_license(org_id: int, payload: LicenseCreate, current_user: dict = Depends(get_current_admin_user), db: Session = Depends(get_db)):
    org = _org_or_404(db, org_id)
    start = _parse_date(payload.start_date, "start_date")
    end = _parse_date(payload.end_date, "end_date")
    if end <= start:
        raise HTTPException(status_code=400, detail="end_date must be after start_date")
    lic = License(
        organization_id=org.id,
        plan=payload.plan,
        pack=payload.pack,
        seats=payload.seats,
        start_date=start,
        end_date=end,
        grace_days=payload.grace_days,
        status=payload.status,
        limits_json=_clean_limits(payload.limits),
        features_json=json.dumps(payload.features) if payload.features else None,
        contract_value=payload.contract_value,
        currency=payload.currency,
        billing_period=payload.billing_period,
        po_number=payload.po_number,
        invoice_number=payload.invoice_number,
        invoice_status=payload.invoice_status,
        paid_date=_parse_date(payload.paid_date, "paid_date"),
        notes=payload.notes,
        created_by=current_user["email"],
    )
    db.add(lic)
    db.flush()
    orgsvc.log_event(db, org.id, current_user["email"], "license_created",
                     {"license_id": lic.id, "plan": lic.plan, "seats": lic.seats, "end_date": end})
    db.commit()
    for e in _members_emails(db, org.id):
        server_guard.forget_limits(e)
    return _license_dict(lic)


@router.patch("/api/admin/licenses/{license_id}")
def admin_update_license(license_id: int, payload: LicenseUpdate, current_user: dict = Depends(get_current_admin_user), db: Session = Depends(get_db)):
    lic = db.query(License).filter(License.id == license_id).first()
    if lic is None:
        raise HTTPException(status_code=404, detail="Licence not found")
    data = payload.model_dump(exclude_unset=True)
    for field in ("start_date", "end_date", "paid_date"):
        if field in data:
            data[field] = _parse_date(data[field], field)
    if "limits" in data:
        lic.limits_json = _clean_limits(data.pop("limits"))
    if "features" in data:
        feats = data.pop("features")
        lic.features_json = json.dumps(feats) if feats else None
    for k, v in data.items():
        setattr(lic, k, v)
    if lic.end_date and lic.start_date and lic.end_date <= lic.start_date:
        db.rollback()
        raise HTTPException(status_code=400, detail="end_date must be after start_date")
    orgsvc.log_event(db, lic.organization_id, current_user["email"], "license_updated",
                     {"license_id": lic.id, "fields": sorted(payload.model_dump(exclude_unset=True))})
    db.commit()
    for e in _members_emails(db, lic.organization_id):
        server_guard.forget_limits(e)
    return _license_dict(lic)


@router.post("/api/admin/orgs/{org_id}/members")
def admin_add_member(org_id: int, payload: MemberAdd, current_user: dict = Depends(get_current_admin_user), db: Session = Depends(get_db)):
    org = _org_or_404(db, org_id)
    # meldra staff can add people beyond the seat count (e.g. before the licence is recorded); the report shows it.
    _add_member(db, org, str(payload.email), payload.role, current_user["email"], "admin", enforce_seats=False)
    return {"members": _members_payload(db, org)}


@router.delete("/api/admin/orgs/{org_id}/members/{email}")
def admin_remove_member(org_id: int, email: str, current_user: dict = Depends(get_current_admin_user), db: Session = Depends(get_db)):
    org = _org_or_404(db, org_id)
    _remove_member(db, org, email, current_user["email"])
    return {"members": _members_payload(db, org)}


def _licence_report(db: Session, now: Optional[datetime] = None) -> Dict[str, Any]:
    now = now or datetime.utcnow()
    orgs = {o.id: o for o in db.query(Organization).all()}
    arr_by_currency: Dict[str, float] = defaultdict(float)
    tcv_by_currency: Dict[str, float] = defaultdict(float)
    unpaid_by_currency: Dict[str, float] = defaultdict(float)
    by_sector: Dict[str, Dict[str, Any]] = defaultdict(lambda: {"customers": 0, "seats": 0, "annual_value": defaultdict(float)})
    seats_sold = 0
    seats_used_total = 0
    active = []
    low_use = []
    for org_id, org in orgs.items():
        lic = orgsvc.current_license(db, org_id, now)
        if not orgsvc.license_gives_access(lic):
            continue
        used = orgsvc.seats_used(db, org_id)
        seats = int(lic.seats or 0)
        annual = orgsvc.annualised_value(lic)
        cur = lic.currency or "INR"
        if (lic.status or "") != "pilot":
            arr_by_currency[cur] += annual
            tcv_by_currency[cur] += float(lic.contract_value or 0)
        if lic.invoice_status in ("draft", "sent", "overdue") and float(lic.contract_value or 0) > 0:
            unpaid_by_currency[cur] += float(lic.contract_value or 0)
        seats_sold += seats
        seats_used_total += used
        sec = by_sector[org.sector or "other"]
        sec["customers"] += 1
        sec["seats"] += seats
        sec["annual_value"][cur] += annual
        utilisation = (used / seats) if seats else 0
        row = {
            "organization_id": org_id,
            "name": org.name,
            "sector": org.sector,
            "plan": normalize_plan(lic.plan),
            "status": lic.status,
            "state": orgsvc.license_state(lic, now),
            "seats": seats,
            "seats_used": used,
            "utilisation": round(utilisation, 2),
            "annual_value": round(annual, 2),
            "currency": cur,
            "end_date": _iso(lic.end_date),
            "invoice_status": lic.invoice_status,
            "crm_ref": org.crm_ref,
        }
        active.append(row)
        if seats and utilisation < 0.5:
            low_use.append(row)
    renewals = []
    for lic in orgsvc.renewals_due(db, 90, now):
        org = orgs.get(lic.organization_id)
        if org is None:
            continue
        days = (lic.end_date - now).days
        renewals.append({
            "organization_id": org.id,
            "name": org.name,
            "end_date": _iso(lic.end_date),
            "days_left": days,
            "bucket": "overdue" if days < 0 else "30" if days <= 30 else "60" if days <= 60 else "90",
            "annual_value": round(orgsvc.annualised_value(lic), 2),
            "currency": lic.currency,
            "seats": int(lic.seats or 0),
            "seats_used": orgsvc.seats_used(db, org.id),
            "renewed": orgsvc.is_renewed(db, lic),
        })
    return {
        "generated_at": _iso(now),
        "customers": len(active),
        "pilots": sum(1 for r in active if r["status"] == "pilot"),
        "arr_by_currency": {k: round(v, 2) for k, v in arr_by_currency.items()},
        "contract_value_by_currency": {k: round(v, 2) for k, v in tcv_by_currency.items()},
        "unpaid_by_currency": {k: round(v, 2) for k, v in unpaid_by_currency.items()},
        "seats_sold": seats_sold,
        "seats_used": seats_used_total,
        "seat_utilisation": round(seats_used_total / seats_sold, 2) if seats_sold else 0,
        "by_sector": {k: {**v, "annual_value": {c: round(a, 2) for c, a in v["annual_value"].items()}} for k, v in by_sector.items()},
        "renewals": renewals,
        "low_utilisation": low_use,
        "active": active,
    }


@router.get("/api/admin/licenses/report")
def admin_licence_report(current_user: dict = Depends(get_current_admin_user), db: Session = Depends(get_db)):
    """ARR, contract value, unpaid invoices, seats, renewals due in 90 days and low-use customers."""
    return _licence_report(db)


@router.get("/api/admin/licenses/report.csv")
def admin_licence_report_csv(current_user: dict = Depends(get_current_admin_user), db: Session = Depends(get_db)):
    report = _licence_report(db)
    buf = io.StringIO()
    w = csv.writer(buf)
    w.writerow(["organization", "sector", "plan", "status", "seats", "seats_used", "utilisation", "annual_value",
                "currency", "end_date", "invoice_status", "crm_ref"])
    for r in report["active"]:
        w.writerow([r["name"], r["sector"], r["plan"], r["status"], r["seats"], r["seats_used"], r["utilisation"],
                    r["annual_value"], r["currency"], r["end_date"], r["invoice_status"], r["crm_ref"] or ""])
    return Response(content=buf.getvalue(), media_type="text/csv",
                    headers={"Content-Disposition": 'attachment; filename="meldra-licences.csv"'})


# ---------------------------------------------------------------------------
# The customer's own organisation
# ---------------------------------------------------------------------------

def _my_org(db: Session, user: dict, admin_only: bool = False):
    member = orgsvc.active_membership(db, user["email"])
    if member is None:
        raise HTTPException(status_code=404, detail="You are not part of an organisation.")
    if admin_only and member.role not in ("owner", "admin"):
        raise HTTPException(status_code=403, detail="Only your organisation's admins can do this.")
    org = _org_or_404(db, member.organization_id)
    return org, member


def _event_dict(e: OrganizationEvent) -> Dict[str, Any]:
    try:
        details = json.loads(e.details) if e.details else None
    except ValueError:
        details = e.details
    return {"at": _iso(e.created_date), "actor": e.actor_email, "event": e.event_type, "details": details}


@router.get("/api/org/me")
def org_me(current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    member = orgsvc.active_membership(db, current_user["email"])
    if member is None:
        member = orgsvc.try_domain_auto_join(db, current_user["email"])
        if member is not None:
            server_guard.forget_limits(current_user["email"])
    if member is None:
        return {"organization": None}
    org = _org_or_404(db, member.organization_id)
    lic = orgsvc.current_license(db, org.id)
    summary = orgsvc.license_summary(db, org, lic)
    if lic is not None:
        summary["limits"] = merge_overrides(plan_limits(normalize_plan(lic.plan)), lic.limits_json)
    return {"organization": summary, "role": member.role}


@router.get("/api/org/members")
def org_members(current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    org, _ = _my_org(db, current_user, admin_only=True)
    lic = orgsvc.current_license(db, org.id)
    return {"organization": orgsvc.license_summary(db, org, lic), "members": _members_payload(db, org)}


@router.post("/api/org/members")
def org_add_member(payload: MemberAdd, current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    org, me = _my_org(db, current_user, admin_only=True)
    if payload.role == "owner" and me.role != "owner":
        raise HTTPException(status_code=403, detail="Only an owner can add another owner.")
    _add_member(db, org, str(payload.email), payload.role, current_user["email"], "invite")
    return {"members": _members_payload(db, org)}


@router.patch("/api/org/members/{email}")
def org_set_role(email: str, payload: MemberRole, current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    org, me = _my_org(db, current_user, admin_only=True)
    if me.role != "owner" and (payload.role == "owner" or _target_role(db, org, email) == "owner"):
        raise HTTPException(status_code=403, detail="Only an owner can change an owner's role or make someone owner.")
    _set_role(db, org, email, payload.role, current_user["email"])
    return {"members": _members_payload(db, org)}


def _target_role(db: Session, org: Organization, email: str) -> Optional[str]:
    m = (
        db.query(OrganizationMember)
        .filter(OrganizationMember.organization_id == org.id, OrganizationMember.user_email == _norm_email(email),
                OrganizationMember.status == "active")
        .first()
    )
    return m.role if m else None


@router.delete("/api/org/members/{email}")
def org_remove_member(email: str, current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    org, me = _my_org(db, current_user, admin_only=True)
    if _target_role(db, org, email) == "owner" and me.role != "owner":
        raise HTTPException(status_code=403, detail="Only an owner can remove an owner.")
    _remove_member(db, org, email, current_user["email"])
    return {"members": _members_payload(db, org)}


@router.get("/api/org/usage.csv")
def org_usage_csv(current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    org, _ = _my_org(db, current_user, admin_only=True)
    return Response(content=_usage_csv(_members_payload(db, org)), media_type="text/csv",
                    headers={"Content-Disposition": 'attachment; filename="meldra-usage.csv"'})


@router.get("/api/org/events")
def org_events(days: int = 90, current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    org, _ = _my_org(db, current_user, admin_only=True)
    since = datetime.utcnow() - timedelta(days=max(1, min(days, 730)))
    rows = (
        db.query(OrganizationEvent)
        .filter(OrganizationEvent.organization_id == org.id, OrganizationEvent.created_date >= since)
        .order_by(OrganizationEvent.created_date.desc())
        .limit(500)
        .all()
    )
    return {"events": [_event_dict(e) for e in rows]}


# ---------------------------------------------------------------------------
# Renewals: the customer's admins ask for a renewal quote; reminders go out at 90, 60, 30 and 7 days
# before the end date and once in the grace period.

def _sales_email() -> str:
    return (os.getenv("MELDRA_SALES_EMAIL") or "sales@meldra.ai").strip()


@router.post("/api/org/renewal-request")
async def org_renewal_request(payload: RenewalRequest, current_user: dict = Depends(get_current_user),
                              db: Session = Depends(get_db)):
    org, _ = _my_org(db, current_user, admin_only=True)
    lic = orgsvc.current_license(db, org.id)
    summary = orgsvc.license_summary(db, org, lic)
    since = datetime.utcnow() - timedelta(days=1)
    recent = (
        db.query(OrganizationEvent)
        .filter(OrganizationEvent.organization_id == org.id, OrganizationEvent.event_type == "renewal_requested",
                OrganizationEvent.created_date >= since)
        .count()
    )
    details = {"license_id": summary.get("license_id"), "seats": payload.seats, "message": payload.message}
    orgsvc.log_event(db, org.id, current_user["email"], "renewal_requested", details)
    db.commit()
    emailed = False
    if not recent:
        body = (
            f"Renewal requested by {current_user['email']} for {org.name} (organisation {org.id}).\n\n"
            f"Plan: {summary.get('plan')}  Seats: {summary.get('seats')} (used {summary.get('seats_used')})\n"
            f"Ends: {summary.get('end_date')}  State: {summary.get('state')}\n"
            f"Seats wanted: {payload.seats or 'same'}\n"
            f"CRM reference: {org.crm_ref or '-'}\n\n"
            f"Message:\n{payload.message or '-'}\n"
        )
        emailed = await send_simple_email([_sales_email()], f"Renewal request: {org.name}", body)
    return {"ok": True, "emailed": emailed}


_STAGE_LINES = {
    "d90": "Your meldra licence ends in about three months.",
    "d60": "Your meldra licence ends in about two months.",
    "d30": "Your meldra licence ends in 30 days or less.",
    "d7": "Your meldra licence ends in 7 days or less.",
    "grace": "Your meldra licence has ended. Your team keeps access during the grace period only.",
}


def _reminder_text(org: Organization, stage: str, summary: Dict[str, Any]) -> str:
    end = (summary.get("end_date") or "")[:10]
    grace = (summary.get("grace_ends") or "")[:10]
    lines = [
        "Hello,",
        "",
        f"{_STAGE_LINES.get(stage, '')} Organisation: {org.name}.",
        f"End date: {end}." + (f" Access continues until {grace}." if stage == "grace" and grace else ""),
        f"Seats: {summary.get('seats_used')} of {summary.get('seats')} in use.",
        "",
        "Your saved mappings, templates, members and history stay in place when you renew.",
        "To renew or change seats, open Organisation in meldra and choose Request renewal,",
        f"or reply to {_sales_email()}.",
        "",
        "The meldra team",
    ]
    return "\n".join(lines)


@router.post("/api/cron/renewal-reminders")
async def cron_renewal_reminders(dry_run: bool = False, x_cron_secret: Optional[str] = Header(None),
                                 db: Session = Depends(get_db)):
    """Called daily by the scheduled GitHub workflow. Needs the CRON_SECRET header."""
    expected = os.getenv("CRON_SECRET", "")
    if not expected:
        raise HTTPException(status_code=503, detail="CRON_SECRET is not set on the server.")
    if not x_cron_secret or not hmac.compare_digest(x_cron_secret, expected):
        raise HTTPException(status_code=403, detail="Wrong cron secret.")
    due = orgsvc.renewal_reminders_due(db)
    results = []
    for item in due:
        org, lic, stage = item["organization"], item["license"], item["stage"]
        sent = False
        if not dry_run:
            subject = f"meldra licence renewal: {org.name}"
            sent = await send_simple_email(item["recipients"], subject, _reminder_text(org, stage, item["summary"]))
            if sent:
                # Logged only once sent, so a mail outage means a retry tomorrow, not a lost reminder.
                orgsvc.log_event(db, org.id, None, "renewal_reminder",
                                 {"license_id": lic.id, "stage": stage, "recipients": len(item["recipients"])})
                db.commit()
        results.append({"organization_id": org.id, "stage": stage, "recipients": len(item["recipients"]), "sent": sent})
    return {"due": len(due), "sent": sum(1 for r in results if r["sent"]), "dry_run": dry_run, "results": results}
