"""
Access, tenancy and encrypted storage for meldra Legal.

Access (any one of):
  * the operator account (LEGAL_OPERATOR_EMAILS, default ADMIN_PREMIUM_EMAIL / sumitagaria@gmail.com);
  * a personal grant of the "legal" feature (/api/admin/features/grant or a redeemed feature key);
  * membership of an organisation whose current licence has {"legal": true} in its features.
Everyone else gets 403 and never sees the module in the menu.

Tenant: the organisation ("org:<id>") when the person has one, otherwise the person ("user:<email>").
Sensitive fields are encrypted with a key derived per tenant from LEGAL_DATA_KEY (or the JWT secret).
"""
from __future__ import annotations

import base64
import hashlib
import json
import os
from datetime import date, datetime
from functools import lru_cache
from typing import Any, Dict, List, Optional, Tuple

from sqlalchemy.orm import Session

from app.database import LegalHearing, LegalMatter, LegalSettings, LegalTask, UserFeature

FEATURE = "legal"


def operator_emails() -> List[str]:
    raw = os.getenv("LEGAL_OPERATOR_EMAILS") or os.getenv("ADMIN_PREMIUM_EMAIL") or "sumitagaria@gmail.com"
    return [e.strip().lower() for e in raw.split(",") if e.strip()]


def _membership(db: Session, email: str):
    from app.services import organizations as orgsvc

    return orgsvc.active_membership(db, email)


def access(db: Session, email: str) -> Tuple[bool, str]:
    """(allowed, how). how: operator | personal | organisation | none."""
    e = (email or "").strip().lower()
    if not e:
        return False, "none"
    if e in operator_emails():
        return True, "operator"
    now = datetime.utcnow()
    uf = db.query(UserFeature).filter(UserFeature.user_email == e, UserFeature.feature == FEATURE).first()
    if uf is not None and uf.enabled and (uf.expires_at is None or uf.expires_at >= now):
        return True, "personal"
    member = _membership(db, e)
    if member is not None:
        from app.services import organizations as orgsvc

        lic = orgsvc.current_license(db, member.organization_id)
        if orgsvc.license_gives_access(lic) and orgsvc.license_features(lic).get(FEATURE):
            return True, "organisation"
    return False, "none"


def tenant_for(db: Session, email: str) -> str:
    member = _membership(db, email)
    if member is not None:
        return f"org:{member.organization_id}"
    return f"user:{(email or '').strip().lower()}"


def member_role(db: Session, email: str) -> Optional[str]:
    m = _membership(db, email)
    return m.role if m is not None else None


# --- encryption --------------------------------------------------------------------------------
@lru_cache(maxsize=512)
def _cipher(tenant: str):
    from cryptography.fernet import Fernet
    from app.utils.auth import SECRET_KEY

    secret = os.getenv("LEGAL_DATA_KEY") or SECRET_KEY
    digest = hashlib.sha256(f"meldra-legal:{secret}:{tenant}".encode("utf-8")).digest()
    return Fernet(base64.urlsafe_b64encode(digest))


def seal(tenant: str, data: Dict[str, Any]) -> str:
    return _cipher(tenant).encrypt(json.dumps(data or {}, default=str).encode("utf-8")).decode("ascii")


def unseal(tenant: str, token: Optional[str]) -> Dict[str, Any]:
    if not token:
        return {}
    try:
        return json.loads(_cipher(tenant).decrypt(token.encode("ascii")).decode("utf-8"))
    except Exception:  # noqa: BLE001 - a row sealed under another key must not break the list
        return {"_unreadable": True}


# --- dates -------------------------------------------------------------------------------------
def to_dt(value: Any) -> Optional[datetime]:
    if value in (None, ""):
        return None
    if isinstance(value, datetime):
        return value
    if isinstance(value, date):
        return datetime(value.year, value.month, value.day)
    s = str(value).strip()
    for fmt in ("%Y-%m-%d", "%d/%m/%Y", "%d-%m-%Y", "%d.%m.%Y", "%Y-%m-%dT%H:%M:%S", "%Y-%m-%dT%H:%M", "%d/%m/%y"):
        try:
            return datetime.strptime(s[:19] if "T" in s else s, fmt)
        except ValueError:
            continue
    try:
        return datetime.fromisoformat(s.replace("Z", "+00:00")).replace(tzinfo=None)
    except ValueError:
        raise ValueError(f"Not a date: {s}. Use dd/mm/yyyy.")


def d_iso(dt: Optional[datetime]) -> Optional[str]:
    return dt.date().isoformat() if dt else None


# --- settings ----------------------------------------------------------------------------------
def get_settings(db: Session, tenant: str, default_country: str = "IN") -> LegalSettings:
    s = db.query(LegalSettings).filter(LegalSettings.tenant == tenant).first()
    if s is None:
        s = LegalSettings(tenant=tenant, country=default_country, language="en", data_enc=seal(tenant, {}))
        db.add(s)
        db.commit()
        db.refresh(s)
    return s


def settings_dict(s: LegalSettings) -> Dict[str, Any]:
    data = unseal(s.tenant, s.data_enc)
    return {"country": s.country, "language": s.language, "firm_name": data.get("firm_name") or "",
            "roles": data.get("roles") or {}, "configured": bool(data.get("configured"))}


def save_settings_data(db: Session, s: LegalSettings, **changes: Any) -> None:
    data = unseal(s.tenant, s.data_enc)
    data.update({k: v for k, v in changes.items() if v is not None})
    s.data_enc = seal(s.tenant, data)


# --- serialisation -----------------------------------------------------------------------------
MATTER_FIELDS = ("title", "client", "client_phone", "client_email", "petitioner", "respondent", "our_side",
                 "opposing_counsel", "references", "sections", "offence_date", "notes", "matter_type", "tags")


def matter_dict(m: LegalMatter, with_secret: bool = True) -> Dict[str, Any]:
    from app.services.legal import profiles

    data = unseal(m.tenant, m.data_enc) if with_secret else {}
    refs = data.get("references") or {}
    return {
        "id": m.id, "country": m.country, "court_code": m.court_code, "court_name": profiles.court_name(m.country, m.court_code),
        "stage": m.stage, "status": m.status, "lawyer_email": m.lawyer_email, "next_hearing": d_iso(m.next_hearing),
        "filed_on": d_iso(m.filed_on), "fees_billed": m.fees_billed or 0.0, "fees_collected": m.fees_collected or 0.0,
        "is_sample": bool(m.is_sample), "updated": m.updated_date.isoformat() if m.updated_date else None,
        "reference": profiles.display_reference(m.country, refs),
        **{k: data.get(k) for k in MATTER_FIELDS},
        "references": refs,
    }


def hearing_dict(h: LegalHearing) -> Dict[str, Any]:
    data = unseal(h.tenant, h.data_enc)
    return {"id": h.id, "matter_id": h.matter_id, "date": d_iso(h.hearing_date), "outcome": h.outcome, "next_date": d_iso(h.next_date),
            "purpose": data.get("purpose") or "", "judge": data.get("judge") or "", "item_no": data.get("item_no") or "",
            "notes": data.get("notes") or "", "video_link": data.get("video_link") or "", "created_by": h.created_by}


def task_dict(t: LegalTask) -> Dict[str, Any]:
    data = unseal(t.tenant, t.data_enc)
    return {"id": t.id, "matter_id": t.matter_id, "kind": t.kind, "rule_id": t.rule_id, "due_date": d_iso(t.due_date),
            "suggested_date": d_iso(t.suggested_date), "confirmed_by": t.confirmed_by,
            "confirmed_at": t.confirmed_at.isoformat() if t.confirmed_at else None, "assignee_email": t.assignee_email,
            "done": bool(t.done), "title": data.get("title") or "", "notes": data.get("notes") or "",
            "basis": data.get("basis") or None}


def apply_matter(m: LegalMatter, payload: Dict[str, Any]) -> None:
    from app.services.legal import profiles

    if "country" in payload and payload["country"]:
        m.country = profiles.normalise_country(payload["country"])
    for col in ("court_code", "stage", "status", "lawyer_email"):
        if col in payload:
            v = payload[col]
            setattr(m, col, (str(v).strip() or None) if v is not None else None)
    if m.lawyer_email:
        m.lawyer_email = m.lawyer_email.lower()
    for col in ("next_hearing", "filed_on"):
        if col in payload:
            setattr(m, col, to_dt(payload[col]))
    for col in ("fees_billed", "fees_collected"):
        if col in payload and payload[col] not in (None, ""):
            setattr(m, col, float(payload[col]))
    data = unseal(m.tenant, m.data_enc)
    for k in MATTER_FIELDS:
        if k in payload:
            data[k] = payload[k]
    refs = dict(data.get("references") or {})
    if "cnr" in refs and refs["cnr"]:
        refs["cnr"] = profiles.clean_cnr(refs["cnr"])
    data["references"] = refs
    if not (data.get("title") or "").strip():
        p, r = (data.get("petitioner") or "").strip(), (data.get("respondent") or "").strip()
        data["title"] = f"{p} v {r}" if p and r else (p or r or profiles.display_reference(m.country, refs) or "Untitled matter")
    m.data_enc = seal(m.tenant, data)


def matters(db: Session, tenant: str, include_closed: bool = True) -> List[LegalMatter]:
    q = db.query(LegalMatter).filter(LegalMatter.tenant == tenant)
    if not include_closed:
        q = q.filter(LegalMatter.status == "open")
    return q.order_by(LegalMatter.next_hearing.is_(None), LegalMatter.next_hearing.asc(), LegalMatter.id.desc()).all()


def hearings(db: Session, tenant: str, matter_id: Optional[int] = None) -> List[LegalHearing]:
    q = db.query(LegalHearing).filter(LegalHearing.tenant == tenant)
    if matter_id is not None:
        q = q.filter(LegalHearing.matter_id == matter_id)
    return q.order_by(LegalHearing.hearing_date.desc(), LegalHearing.id.desc()).all()


def tasks(db: Session, tenant: str, matter_id: Optional[int] = None) -> List[LegalTask]:
    q = db.query(LegalTask).filter(LegalTask.tenant == tenant)
    if matter_id is not None:
        q = q.filter(LegalTask.matter_id == matter_id)
    return q.order_by(LegalTask.done.asc(), LegalTask.due_date.is_(None), LegalTask.due_date.asc()).all()
