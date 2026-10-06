"""
meldra Legal: matter and hearing diary for law firms (licensed add-on).

Hidden unless the account has the "legal" licence (see app/services/legal/store.py for who has access).
GET /api/legal/access is the only call that answers everyone (enabled true/false); every other call
returns 403 without the licence. Data is kept per firm (tenant) and encrypted.
"""
from __future__ import annotations

import os
from collections import defaultdict
from datetime import date, datetime, timedelta
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, Request, UploadFile
from fastapi.responses import Response
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.database import LegalHearing, LegalMatter, LegalSettings, LegalTask, OrganizationMember, UserFeature, get_db
from app.services import ai_service
from app.services.legal import ai as legal_ai
from app.services.legal import citations, deadlines, importer, insights, profiles, sample, sources, statutes, store
from app.utils.auth import get_current_user

router = APIRouter(prefix="/api/legal", tags=["legal"])

MAX_IMPORT_BYTES = 10 * 1024 * 1024
MAX_IMPORT_ROWS = 5000


class Ctx:
    def __init__(self, email: str, tenant: str, settings: LegalSettings, how: str, role: Optional[str]):
        self.email, self.tenant, self.settings, self.how, self.role = email, tenant, settings, how, role

    @property
    def country(self) -> str:
        return self.settings.country or profiles.DEFAULT_COUNTRY

    @property
    def is_operator(self) -> bool:
        return self.how == "operator"

    @property
    def can_manage(self) -> bool:
        return self.is_operator or self.role in (None, "owner", "admin")


def ctx(request: Request, current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)) -> Ctx:
    email = (current_user.get("email") or "").strip().lower()
    allowed, how = store.access(db, email)
    if not allowed:
        raise HTTPException(status_code=403, detail="meldra Legal is not enabled for this account.")
    tenant = store.tenant_for(db, email)
    hint = profiles.country_for_region(request.headers.get("X-Region"))
    s = store.get_settings(db, tenant, default_country=hint)
    return Ctx(email, tenant, s, how, store.member_role(db, email))


def _today(day: Optional[str] = None) -> date:
    if day:
        try:
            return date.fromisoformat(day)
        except ValueError:
            raise HTTPException(status_code=400, detail="date must be YYYY-MM-DD")
    return date.today()


def _matter_or_404(db: Session, c: Ctx, matter_id: int) -> LegalMatter:
    m = db.query(LegalMatter).filter(LegalMatter.id == matter_id, LegalMatter.tenant == c.tenant).first()
    if m is None:
        raise HTTPException(status_code=404, detail="Matter not found")
    return m


def _all(db: Session, c: Ctx):
    ms = [store.matter_dict(m) for m in store.matters(db, c.tenant)]
    hs = [store.hearing_dict(h) for h in store.hearings(db, c.tenant)]
    ts = [store.task_dict(t) for t in store.tasks(db, c.tenant)]
    return ms, hs, ts


def _bad_date(e: ValueError):
    raise HTTPException(status_code=400, detail=str(e))


# --- access and settings -----------------------------------------------------------------------
@router.get("/access")
def access(current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    allowed, how = store.access(db, current_user.get("email") or "")
    return {"enabled": allowed, "via": how if allowed else None}


@router.get("/bootstrap")
def bootstrap(c: Ctx = Depends(ctx)):
    s = store.settings_dict(c.settings)
    return {
        "me": {"email": c.email, "role": c.role or "owner", "via": c.how, "can_manage": c.can_manage, "is_operator": c.is_operator},
        "settings": s,
        "profile": profiles.profile(c.country),
        "countries": [{"code": k, "name": profiles.profile(k)["name"]} for k in profiles.SUPPORTED],
        "sources": sources.status(),
        "ai_enabled": bool(os.getenv("ANTHROPIC_API_KEY")),
    }


class SettingsIn(BaseModel):
    country: Optional[str] = None
    language: Optional[str] = None
    firm_name: Optional[str] = Field(None, max_length=200)


@router.put("/settings")
def save_settings(body: SettingsIn, c: Ctx = Depends(ctx), db: Session = Depends(get_db)):
    if (body.country or body.firm_name is not None) and not c.can_manage:
        raise HTTPException(status_code=403, detail="Only the firm's admins can change the firm's country or name.")
    if body.country:
        c.settings.country = profiles.normalise_country(body.country)
    if body.language in ("en", "hi"):
        c.settings.language = body.language
    store.save_settings_data(db, c.settings, firm_name=body.firm_name, configured=True)
    db.commit()
    return store.settings_dict(c.settings)


@router.get("/profiles/{country}")
def get_profile(country: str, c: Ctx = Depends(ctx)):
    return profiles.profile(country)


# --- matters -----------------------------------------------------------------------------------
@router.get("/matters")
def list_matters(q: str = "", status: str = "", court: str = "", lawyer: str = "", country: str = "",
                 c: Ctx = Depends(ctx), db: Session = Depends(get_db)):
    rows = [store.matter_dict(m) for m in store.matters(db, c.tenant)]
    ql = q.strip().lower()
    out = []
    for m in rows:
        if status and m["status"] != status:
            continue
        if court and m["court_code"] != court:
            continue
        if lawyer and (m.get("lawyer_email") or "") != lawyer.lower():
            continue
        if country and m["country"] != country.upper():
            continue
        if ql:
            hay = " ".join(str(m.get(k) or "") for k in ("title", "client", "reference", "court_name", "petitioner", "respondent", "opposing_counsel", "sections"))
            hay += " " + " ".join(str(v) for v in (m.get("references") or {}).values())
            if ql not in hay.lower():
                continue
        out.append(m)
    return {"matters": out, "count": len(out)}


@router.post("/matters")
def create_matter(body: Dict[str, Any], c: Ctx = Depends(ctx), db: Session = Depends(get_db)):
    m = LegalMatter(tenant=c.tenant, country=c.country, status="open", created_by=c.email)
    try:
        store.apply_matter(m, {"lawyer_email": c.email, **body})
    except ValueError as e:
        _bad_date(e)
    db.add(m)
    db.commit()
    db.refresh(m)
    return {**store.matter_dict(m), "warnings": profiles.validate_reference(m.country, (body or {}).get("references") or {})}


@router.get("/matters/{matter_id}")
def get_matter(matter_id: int, c: Ctx = Depends(ctx), db: Session = Depends(get_db)):
    m = _matter_or_404(db, c, matter_id)
    d = store.matter_dict(m)
    hs = [store.hearing_dict(h) for h in store.hearings(db, c.tenant, matter_id)]
    ts = [store.task_dict(t) for t in store.tasks(db, c.tenant, matter_id)]
    all_hs = [store.hearing_dict(h) for h in store.hearings(db, c.tenant)]
    all_ms = [store.matter_dict(x, with_secret=False) | {"id": x.id} for x in store.matters(db, c.tenant)]
    model = insights.adjournment_model(all_hs, {x["id"]: x for x in all_ms})
    od = None
    if d.get("offence_date"):
        try:
            od = date.fromisoformat(str(d["offence_date"]))
        except ValueError:
            od = None
    return {
        **d,
        "hearings": hs,
        "tasks": ts,
        "links": profiles.court_links(m.country, m.court_code, d.get("references") or {}, d.get("title") or ""),
        "warnings": profiles.validate_reference(m.country, d.get("references") or {}),
        "statutes": statutes.find_in_text(str(d.get("sections") or "")) if m.country == "IN" else [],
        "which_law": statutes.which_law(od) if m.country == "IN" and d.get("sections") else None,
        "adjournment_likelihood": insights.adjournment_likelihood(model, d),
    }


@router.put("/matters/{matter_id}")
def update_matter(matter_id: int, body: Dict[str, Any], c: Ctx = Depends(ctx), db: Session = Depends(get_db)):
    m = _matter_or_404(db, c, matter_id)
    try:
        store.apply_matter(m, body or {})
    except ValueError as e:
        _bad_date(e)
    db.commit()
    db.refresh(m)
    return store.matter_dict(m)


@router.delete("/matters/{matter_id}")
def delete_matter(matter_id: int, c: Ctx = Depends(ctx), db: Session = Depends(get_db)):
    m = _matter_or_404(db, c, matter_id)
    db.query(LegalHearing).filter(LegalHearing.tenant == c.tenant, LegalHearing.matter_id == m.id).delete()
    db.query(LegalTask).filter(LegalTask.tenant == c.tenant, LegalTask.matter_id == m.id).delete()
    db.delete(m)
    db.commit()
    return {"deleted": matter_id}


# --- hearings ----------------------------------------------------------------------------------
class HearingIn(BaseModel):
    date: str
    outcome: Optional[str] = None
    next_date: Optional[str] = None
    purpose: Optional[str] = None
    judge: Optional[str] = None
    item_no: Optional[str] = None
    notes: Optional[str] = None
    video_link: Optional[str] = None
    stage: Optional[str] = None


@router.post("/matters/{matter_id}/hearings")
def add_hearing(matter_id: int, body: HearingIn, c: Ctx = Depends(ctx), db: Session = Depends(get_db)):
    """Record what happened at a hearing (the 15-second update after court). Moves the matter's next date on."""
    m = _matter_or_404(db, c, matter_id)
    if body.outcome and body.outcome not in profiles.OUTCOMES:
        raise HTTPException(status_code=400, detail=f"outcome must be one of {', '.join(profiles.OUTCOMES)}")
    try:
        hd, nd = store.to_dt(body.date), store.to_dt(body.next_date)
    except ValueError as e:
        _bad_date(e)
    if nd and hd and nd < hd:
        raise HTTPException(status_code=400, detail="The next date is before the hearing date.")
    h = LegalHearing(tenant=c.tenant, matter_id=m.id, hearing_date=hd, outcome=body.outcome, next_date=nd, created_by=c.email,
                     data_enc=store.seal(c.tenant, {k: getattr(body, k) for k in ("purpose", "judge", "item_no", "notes", "video_link") if getattr(body, k)}))
    db.add(h)
    if nd:
        m.next_hearing = nd
    elif m.next_hearing and hd and m.next_hearing.date() <= hd.date() and body.outcome:
        m.next_hearing = None  # the listed date has been used; a new one is still needed
    if body.stage:
        m.stage = body.stage
    if body.outcome == "disposed":
        m.status, m.next_hearing = "disposed", None
    elif body.outcome == "reserved":
        m.stage = "reserved"
    db.commit()
    db.refresh(h)
    return {"hearing": store.hearing_dict(h), "matter": store.matter_dict(m)}


@router.put("/hearings/{hearing_id}")
def update_hearing(hearing_id: int, body: Dict[str, Any], c: Ctx = Depends(ctx), db: Session = Depends(get_db)):
    h = db.query(LegalHearing).filter(LegalHearing.id == hearing_id, LegalHearing.tenant == c.tenant).first()
    if h is None:
        raise HTTPException(status_code=404, detail="Hearing not found")
    try:
        if "date" in body:
            h.hearing_date = store.to_dt(body["date"])
        if "next_date" in body:
            h.next_date = store.to_dt(body["next_date"])
    except ValueError as e:
        _bad_date(e)
    if "outcome" in body:
        h.outcome = body["outcome"] or None
    data = store.unseal(c.tenant, h.data_enc)
    for k in ("purpose", "judge", "item_no", "notes", "video_link"):
        if k in body:
            data[k] = body[k]
    h.data_enc = store.seal(c.tenant, data)
    db.commit()
    return store.hearing_dict(h)


@router.delete("/hearings/{hearing_id}")
def delete_hearing(hearing_id: int, c: Ctx = Depends(ctx), db: Session = Depends(get_db)):
    n = db.query(LegalHearing).filter(LegalHearing.id == hearing_id, LegalHearing.tenant == c.tenant).delete()
    db.commit()
    if not n:
        raise HTTPException(status_code=404, detail="Hearing not found")
    return {"deleted": hearing_id}


@router.get("/today")
def today(day: Optional[str] = Query(None, alias="date"), mine: bool = False, c: Ctx = Depends(ctx), db: Session = Depends(get_db)):
    ms, hs, ts = _all(db, c)
    d = _today(day)
    board = insights.today_board(ms, hs, d, lawyer=c.email if mine else None)
    due = [t for t in ts if not t["done"] and t.get("due_date") and t["due_date"] <= (d + timedelta(days=3)).isoformat()]
    pending = [m for m in ms if m["status"] == "open" and m.get("next_hearing") and m["next_hearing"] < d.isoformat()]
    upcoming = sorted([m for m in ms if m["status"] == "open" and m.get("next_hearing") and d.isoformat() < m["next_hearing"] <= (d + timedelta(days=7)).isoformat()],
                      key=lambda m: m["next_hearing"])
    return {**board, "tasks_due": due, "needs_update": pending[:50], "upcoming": upcoming[:50]}


# --- tasks and deadlines -----------------------------------------------------------------------
class TaskIn(BaseModel):
    title: str = Field(..., min_length=1, max_length=300)
    matter_id: Optional[int] = None
    due_date: Optional[str] = None
    assignee_email: Optional[str] = None
    notes: Optional[str] = None
    kind: str = "task"


@router.get("/tasks")
def list_tasks(open_only: bool = Query(True, alias="open"), c: Ctx = Depends(ctx), db: Session = Depends(get_db)):
    ts = [store.task_dict(t) for t in store.tasks(db, c.tenant)]
    if open_only:
        ts = [t for t in ts if not t["done"]]
    titles = {m.id: store.matter_dict(m).get("title") for m in store.matters(db, c.tenant)}
    for t in ts:
        t["matter_title"] = titles.get(t.get("matter_id"))
    return {"tasks": ts}


@router.post("/tasks")
def create_task(body: TaskIn, c: Ctx = Depends(ctx), db: Session = Depends(get_db)):
    if body.matter_id:
        _matter_or_404(db, c, body.matter_id)
    try:
        due = store.to_dt(body.due_date)
    except ValueError as e:
        _bad_date(e)
    t = LegalTask(tenant=c.tenant, matter_id=body.matter_id, kind="task", due_date=due, created_by=c.email,
                  assignee_email=(body.assignee_email or c.email).lower(), data_enc=store.seal(c.tenant, {"title": body.title, "notes": body.notes}))
    db.add(t)
    db.commit()
    db.refresh(t)
    return store.task_dict(t)


@router.put("/tasks/{task_id}")
def update_task(task_id: int, body: Dict[str, Any], c: Ctx = Depends(ctx), db: Session = Depends(get_db)):
    t = db.query(LegalTask).filter(LegalTask.id == task_id, LegalTask.tenant == c.tenant).first()
    if t is None:
        raise HTTPException(status_code=404, detail="Task not found")
    if "done" in body:
        t.done = bool(body["done"])
    if "assignee_email" in body:
        t.assignee_email = (body["assignee_email"] or "").lower() or None
    if "due_date" in body:
        try:
            new_due = store.to_dt(body["due_date"])
        except ValueError as e:
            _bad_date(e)
        if t.kind == "deadline" and new_due != t.due_date:
            t.confirmed_by, t.confirmed_at = c.email, datetime.utcnow()  # changing a deadline re-confirms it
        t.due_date = new_due
    data = store.unseal(c.tenant, t.data_enc)
    for k in ("title", "notes"):
        if k in body:
            data[k] = body[k]
    t.data_enc = store.seal(c.tenant, data)
    db.commit()
    return store.task_dict(t)


@router.delete("/tasks/{task_id}")
def delete_task(task_id: int, c: Ctx = Depends(ctx), db: Session = Depends(get_db)):
    n = db.query(LegalTask).filter(LegalTask.id == task_id, LegalTask.tenant == c.tenant).delete()
    db.commit()
    if not n:
        raise HTTPException(status_code=404, detail="Task not found")
    return {"deleted": task_id}


class SuggestIn(BaseModel):
    rule_id: str
    trigger_date: str


@router.post("/deadlines/suggest")
def suggest_deadline(body: SuggestIn, c: Ctx = Depends(ctx)):
    try:
        trig = store.to_dt(body.trigger_date).date()
        return deadlines.suggest(body.rule_id, trig)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


class ConfirmIn(BaseModel):
    rule_id: str
    trigger_date: str
    due_date: str  # the date the person confirms (may differ from the suggestion)
    matter_id: Optional[int] = None
    title: Optional[str] = None
    assignee_email: Optional[str] = None


@router.post("/deadlines")
def confirm_deadline(body: ConfirmIn, c: Ctx = Depends(ctx), db: Session = Depends(get_db)):
    if body.matter_id:
        _matter_or_404(db, c, body.matter_id)
    try:
        sug = deadlines.suggest(body.rule_id, store.to_dt(body.trigger_date).date())
        due = store.to_dt(body.due_date)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    t = LegalTask(
        tenant=c.tenant, matter_id=body.matter_id, kind="deadline", rule_id=body.rule_id, due_date=due,
        suggested_date=store.to_dt(sug["suggested_date"]), confirmed_by=c.email, confirmed_at=datetime.utcnow(),
        assignee_email=(body.assignee_email or c.email).lower(), created_by=c.email,
        data_enc=store.seal(c.tenant, {"title": body.title or sug["label"], "basis": {k: sug[k] for k in ("label", "trigger_label", "trigger_date", "period", "note", "rolled")}}),
    )
    db.add(t)
    db.commit()
    db.refresh(t)
    return store.task_dict(t)


# --- import ------------------------------------------------------------------------------------
@router.post("/import/preview")
async def import_preview(file: UploadFile = File(...), country: str = Form(""), c: Ctx = Depends(ctx), db: Session = Depends(get_db)):
    content = await file.read(MAX_IMPORT_BYTES + 1)
    if len(content) > MAX_IMPORT_BYTES:
        raise HTTPException(status_code=413, detail="The diary file is larger than 10 MB.")
    try:
        headers, rows = importer.read_table(file.filename or "diary.xlsx", content)
    except Exception:  # noqa: BLE001
        raise HTTPException(status_code=400, detail="The file could not be read. Upload an .xlsx, .xls or .csv diary.")
    if len(rows) > MAX_IMPORT_ROWS:
        raise HTTPException(status_code=400, detail=f"The diary has more than {MAX_IMPORT_ROWS} rows; split it into smaller files.")
    cc = profiles.normalise_country(country or c.country)
    team = store.settings_dict(c.settings).get("roles") or {}
    lookup = {str((v or {}).get("name") or "").lower(): k for k, v in team.items() if isinstance(v, dict) and v.get("name")}
    return importer.build_rows(cc, headers, rows, lawyer_lookup=lookup) | {"headers": headers, "country": cc}


class ImportCommit(BaseModel):
    rows: List[Dict[str, Any]]


@router.post("/import/commit")
def import_commit(body: ImportCommit, c: Ctx = Depends(ctx), db: Session = Depends(get_db)):
    if len(body.rows) > MAX_IMPORT_ROWS:
        raise HTTPException(status_code=400, detail="Too many rows in one import.")
    created, skipped = 0, []
    for r in body.rows:
        notes = r.get("notes") or ""
        extra = []
        if r.get("court_text") and not r.get("court_code"):
            extra.append(f"Court: {r['court_text']}")
        if r.get("stage_text") and not r.get("stage"):
            extra.append(f"Stage: {r['stage_text']}")
        if r.get("lawyer_name"):
            extra.append(f"Advocate: {r['lawyer_name']}")
        if extra:
            notes = (notes + "\n" if notes else "") + " · ".join(extra)
        payload = {k: r.get(k) for k in ("country", "title", "petitioner", "respondent", "client", "client_phone", "references", "court_code",
                                          "stage", "next_hearing", "filed_on", "lawyer_email", "opposing_counsel", "fees_billed",
                                          "fees_collected", "sections")}
        payload["notes"] = notes or None
        m = LegalMatter(tenant=c.tenant, country=c.country, status="open", created_by=c.email)
        try:
            store.apply_matter(m, payload)
        except ValueError as e:
            skipped.append({"row": r.get("row"), "reason": str(e)})
            continue
        db.add(m)
        db.flush()
        if r.get("last_hearing"):
            try:
                db.add(LegalHearing(tenant=c.tenant, matter_id=m.id, hearing_date=store.to_dt(r["last_hearing"]),
                                    next_date=m.next_hearing, outcome=None, created_by=c.email, data_enc=store.seal(c.tenant, {"notes": "Imported"})))
            except ValueError:
                pass
        created += 1
    db.commit()
    return {"created": created, "skipped": skipped}


# --- reports, suggestions, AI ------------------------------------------------------------------
@router.get("/reports")
def reports(c: Ctx = Depends(ctx), db: Session = Depends(get_db)):
    ms, hs, ts = _all(db, c)
    return insights.reports(ms, hs, ts, date.today(), ageing_years=profiles.profile(c.country)["ageing_years"])


@router.get("/suggestions")
def get_suggestions(mine: bool = False, c: Ctx = Depends(ctx), db: Session = Depends(get_db)):
    ms, hs, ts = _all(db, c)
    if mine:
        ms_ids = {m["id"] for m in ms if m.get("lawyer_email") == c.email}
        ts = [t for t in ts if t.get("assignee_email") == c.email or t.get("matter_id") in ms_ids]
        ms = [m for m in ms if m["id"] in ms_ids]
    return {"suggestions": insights.suggestions(ms, hs, ts, date.today(), profiles.profile(c.country)["ageing_years"], me=c.email)}


class TextIn(BaseModel):
    text: str = Field("", max_length=200000)
    language: Optional[str] = None
    title: Optional[str] = None
    url: Optional[str] = None
    live: bool = False


def _lang(c: Ctx, requested: Optional[str]) -> str:
    return requested if requested in ("en", "hi") else (c.settings.language or "en")


@router.post("/ai/extract-order")
async def ai_extract(body: TextIn, c: Ctx = Depends(ctx)):
    stages = [s["code"] for s in profiles.profile(c.country)["stages"]]
    return await legal_ai.extract_order(body.text, c.country, _lang(c, body.language), stages)


class AskIn(BaseModel):
    question: str = Field(..., min_length=2, max_length=2000)
    language: Optional[str] = None


@router.post("/ai/ask")
async def ai_ask(body: AskIn, c: Ctx = Depends(ctx), db: Session = Depends(get_db)):
    ms, hs, ts = _all(db, c)
    try:
        return await legal_ai.ask(body.question, c.country, _lang(c, body.language), ms, hs, ts, date.today())
    except ai_service.AIServiceError as e:
        raise HTTPException(status_code=503, detail=f"AI is unavailable: {ai_service.explain_ai_error(e)}.")


@router.post("/ai/summarise")
async def ai_summarise(body: TextIn, c: Ctx = Depends(ctx)):
    text = body.text
    if not text and body.url:
        if not body.url.startswith(sources.FCL_BASE + "/"):
            raise HTTPException(status_code=400, detail="Only Find Case Law judgments can be fetched by link; paste the text for others.")
        try:
            text = sources.fcl_text(body.url)
        except Exception:  # noqa: BLE001
            raise HTTPException(status_code=502, detail="The judgment could not be fetched from Find Case Law.")
    try:
        return await legal_ai.summarise(text, c.country, _lang(c, body.language), body.title or "")
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except ai_service.AIServiceError as e:
        raise HTTPException(status_code=503, detail=f"AI is unavailable: {ai_service.explain_ai_error(e)}.")


# --- research ----------------------------------------------------------------------------------
@router.post("/citations/check")
def check_citations(body: TextIn, c: Ctx = Depends(ctx)):
    return citations.check(body.text, live=body.live)


@router.get("/statutes")
def statute_lookup(q: str = "", c: Ctx = Depends(ctx)):
    return {"results": statutes.search(q), "commencement": statutes.COMMENCEMENT.isoformat(),
            "note": "Most-used sections only. Check the official MHA correspondence table before relying on a mapping."}


@router.get("/research/search")
def research(q: str = Query(..., min_length=2, max_length=300), country: str = "", page: int = 1, c: Ctx = Depends(ctx)):
    return sources.search(profiles.normalise_country(country or c.country), q, page=page)


@router.get("/research/sources")
def research_sources(c: Ctx = Depends(ctx)):
    return {"sources": sources.status()}


# --- calendar ----------------------------------------------------------------------------------
def _ics_escape(s: str) -> str:
    return str(s or "").replace("\\", "\\\\").replace(";", "\\;").replace(",", "\\,").replace("\n", "\\n")


@router.get("/calendar.ics")
def calendar(mine: bool = True, c: Ctx = Depends(ctx), db: Session = Depends(get_db)):
    ms = [store.matter_dict(m) for m in store.matters(db, c.tenant, include_closed=False)]
    ts = [store.task_dict(t) for t in store.tasks(db, c.tenant)]
    stamp = datetime.utcnow().strftime("%Y%m%dT%H%M%SZ")
    lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//meldra//Legal diary//EN", "CALSCALE:GREGORIAN", "X-WR-CALNAME:meldra Legal"]
    for m in ms:
        if not m.get("next_hearing") or (mine and m.get("lawyer_email") not in (None, c.email)):
            continue
        d = m["next_hearing"].replace("-", "")
        lines += ["BEGIN:VEVENT", f"UID:legal-matter-{m['id']}-{d}@meldra.ai", f"DTSTAMP:{stamp}", f"DTSTART;VALUE=DATE:{d}",
                  f"SUMMARY:{_ics_escape('Hearing: ' + (m.get('title') or ''))}",
                  f"LOCATION:{_ics_escape(m.get('court_name') or '')}", f"DESCRIPTION:{_ics_escape(m.get('reference') or '')}", "END:VEVENT"]
    for t in ts:
        if t["done"] or not t.get("due_date") or (mine and t.get("assignee_email") not in (None, c.email)):
            continue
        d = t["due_date"].replace("-", "")
        lines += ["BEGIN:VEVENT", f"UID:legal-task-{t['id']}@meldra.ai", f"DTSTAMP:{stamp}", f"DTSTART;VALUE=DATE:{d}",
                  f"SUMMARY:{_ics_escape(('Deadline: ' if t['kind'] == 'deadline' else 'Task: ') + t['title'])}", "END:VEVENT"]
    lines.append("END:VCALENDAR")
    return Response("\r\n".join(lines) + "\r\n", media_type="text/calendar",
                    headers={"Content-Disposition": 'attachment; filename="meldra-legal.ics"'})


# --- team (the web app's minimum: people, roles, profile) ----------------------------------------
LEGAL_ROLES = ("partner", "associate", "clerk", "paralegal")


@router.get("/team")
def team(c: Ctx = Depends(ctx), db: Session = Depends(get_db)):
    roles = store.settings_dict(c.settings).get("roles") or {}
    if c.tenant.startswith("org:"):
        org_id = int(c.tenant.split(":", 1)[1])
        emails = [m.user_email for m in db.query(OrganizationMember).filter(OrganizationMember.organization_id == org_id,
                                                                           OrganizationMember.status == "active").all()]
    else:
        emails = [c.email]
    for e in roles:
        if e not in emails:
            emails.append(e)
    ms = [store.matter_dict(m, with_secret=False) for m in store.matters(db, c.tenant, include_closed=False)]
    count = defaultdict(int)
    for m in ms:
        count[m.get("lawyer_email") or ""] += 1
    return {"members": [{"email": e, "role": (roles.get(e) or {}).get("role") or "associate", "name": (roles.get(e) or {}).get("name") or "",
                         "open_matters": count.get(e, 0)} for e in sorted(emails)],
            "roles": LEGAL_ROLES, "can_manage": c.can_manage,
            "org_admin_link": "/Organization" if c.tenant.startswith("org:") else None}


class TeamIn(BaseModel):
    email: str
    role: Optional[str] = None
    name: Optional[str] = Field(None, max_length=120)
    remove: bool = False


@router.post("/team")
def set_team_member(body: TeamIn, c: Ctx = Depends(ctx), db: Session = Depends(get_db)):
    if not c.can_manage:
        raise HTTPException(status_code=403, detail="Only the firm's admins can change roles.")
    email = body.email.strip().lower()
    if "@" not in email:
        raise HTTPException(status_code=400, detail="Enter an email address.")
    roles = dict(store.settings_dict(c.settings).get("roles") or {})
    if body.remove:
        roles.pop(email, None)
    else:
        if body.role and body.role not in LEGAL_ROLES:
            raise HTTPException(status_code=400, detail=f"role must be one of {', '.join(LEGAL_ROLES)}")
        cur = dict(roles.get(email) or {})
        if body.role:
            cur["role"] = body.role
        if body.name is not None:
            cur["name"] = body.name.strip()
        roles[email] = cur
    store.save_settings_data(db, c.settings, roles=roles)
    db.commit()
    return team(c, db)


# --- sample firms ------------------------------------------------------------------------------
class SampleIn(BaseModel):
    country: Optional[str] = None


@router.post("/sample")
def load_sample(body: SampleIn, c: Ctx = Depends(ctx), db: Session = Depends(get_db)):
    cc = profiles.normalise_country(body.country or c.country)
    db.query(LegalHearing).filter(LegalHearing.tenant == c.tenant, LegalHearing.matter_id.in_(
        db.query(LegalMatter.id).filter(LegalMatter.tenant == c.tenant, LegalMatter.is_sample.is_(True)))).delete(synchronize_session=False)
    db.query(LegalTask).filter(LegalTask.tenant == c.tenant, LegalTask.matter_id.in_(
        db.query(LegalMatter.id).filter(LegalMatter.tenant == c.tenant, LegalMatter.is_sample.is_(True)))).delete(synchronize_session=False)
    db.query(LegalMatter).filter(LegalMatter.tenant == c.tenant, LegalMatter.is_sample.is_(True)).delete(synchronize_session=False)
    today_ = date.today()
    pack = sample.build(cc, today_)
    ids = []
    for item in pack["matters"]:
        m = LegalMatter(tenant=c.tenant, country=cc, is_sample=True, created_by=c.email)
        store.apply_matter(m, item["payload"])
        db.add(m)
        db.flush()
        ids.append(m.id)
        hist = sorted(item["history"], key=lambda h: h["date"])
        for i, h in enumerate(hist):
            nxt = hist[i + 1]["date"] if i + 1 < len(hist) else item["payload"].get("next_hearing")
            db.add(LegalHearing(tenant=c.tenant, matter_id=m.id, hearing_date=store.to_dt(h["date"]), outcome=h["outcome"],
                                next_date=store.to_dt(nxt), created_by=c.email, data_enc=store.seal(c.tenant, {"purpose": h["purpose"]})))
    for t in pack["tasks"]:
        mid = ids[t["matter"]]
        if t["kind"] == "deadline":
            sug = deadlines.suggest(t["rule_id"], today_ + timedelta(days=t["trigger"]))
            db.add(LegalTask(tenant=c.tenant, matter_id=mid, kind="deadline", rule_id=t["rule_id"], due_date=store.to_dt(sug["suggested_date"]),
                             suggested_date=store.to_dt(sug["suggested_date"]), confirmed_by=None, assignee_email=c.email, created_by=c.email,
                             data_enc=store.seal(c.tenant, {"title": t["title"], "basis": {k: sug[k] for k in ("label", "trigger_label", "trigger_date", "period", "note", "rolled")}})))
        else:
            db.add(LegalTask(tenant=c.tenant, matter_id=mid, kind="task", due_date=store.to_dt((today_ + timedelta(days=t["due"])).isoformat()),
                             assignee_email=c.email, created_by=c.email, data_enc=store.seal(c.tenant, {"title": t["title"]})))
    if not store.settings_dict(c.settings).get("firm_name"):
        store.save_settings_data(db, c.settings, firm_name=pack["firm_name"])
    db.commit()
    return {"loaded": len(ids), "country": cc, "firm_name": pack["firm_name"]}


@router.delete("/sample")
def clear_sample(c: Ctx = Depends(ctx), db: Session = Depends(get_db)):
    ids = [i for (i,) in db.query(LegalMatter.id).filter(LegalMatter.tenant == c.tenant, LegalMatter.is_sample.is_(True)).all()]
    if ids:
        db.query(LegalHearing).filter(LegalHearing.tenant == c.tenant, LegalHearing.matter_id.in_(ids)).delete(synchronize_session=False)
        db.query(LegalTask).filter(LegalTask.tenant == c.tenant, LegalTask.matter_id.in_(ids)).delete(synchronize_session=False)
        db.query(LegalMatter).filter(LegalMatter.id.in_(ids)).delete(synchronize_session=False)
    db.commit()
    return {"removed": len(ids)}


# --- reminders ---------------------------------------------------------------------------------
def _digest(db: Session, tenant: str, email: str, day: date) -> Optional[str]:
    tomorrow = (day + timedelta(days=1)).isoformat()
    soon = (day + timedelta(days=3)).isoformat()
    ms = [store.matter_dict(m) for m in store.matters(db, tenant, include_closed=False)]
    hearings_ = [m for m in ms if m.get("next_hearing") == tomorrow and m.get("lawyer_email") in (email, None)]
    ts = [store.task_dict(t) for t in store.tasks(db, tenant)]
    due = [t for t in ts if not t["done"] and t.get("due_date") and t["due_date"] <= soon and t.get("assignee_email") in (email, None)]
    if not hearings_ and not due:
        return None
    fmt = lambda iso: date.fromisoformat(iso).strftime("%d/%m/%Y")  # noqa: E731
    lines = [f"Your meldra Legal diary for {fmt(tomorrow)}", ""]
    if hearings_:
        lines.append(f"Hearings tomorrow ({len(hearings_)}):")
        for m in sorted(hearings_, key=lambda m: m.get("court_name") or ""):
            lines.append(f"  • {m.get('title')} — {m.get('court_name') or 'court not set'} {('· ' + m['reference']) if m.get('reference') else ''}")
        lines.append("")
    if due:
        lines.append(f"Deadlines and tasks due by {fmt(soon)} ({len(due)}):")
        for t in due:
            flag = "" if t["kind"] != "deadline" or t.get("confirmed_by") else " (date not confirmed)"
            lines.append(f"  • {fmt(t['due_date'])}: {t['title']}{flag}")
        lines.append("")
    lines.append("Open the diary: https://insight.meldra.ai/legal")
    lines.append("Deadline dates are suggestions confirmed by your team, not legal advice.")
    return "\n".join(lines)


@router.get("/reminders/preview")
def reminder_preview(c: Ctx = Depends(ctx), db: Session = Depends(get_db)):
    return {"to": c.email, "text": _digest(db, c.tenant, c.email, date.today()) or "Nothing listed for tomorrow and no deadlines in the next three days."}


@router.post("/reminders/send-me")
async def reminder_send_me(c: Ctx = Depends(ctx), db: Session = Depends(get_db)):
    from app.services.email_service import send_simple_email

    text = _digest(db, c.tenant, c.email, date.today())
    if not text:
        return {"sent": False, "reason": "Nothing to remind you about."}
    ok = await send_simple_email([c.email], "Tomorrow's hearings and deadlines — meldra Legal", text)
    return {"sent": bool(ok)}


@router.post("/admin/reminders/run")
async def reminders_run(dry_run: bool = True, c: Ctx = Depends(ctx), db: Session = Depends(get_db)):
    """Daily digest for every lawyer with a hearing tomorrow or a deadline soon. Operator only (call from a daily cron)."""
    if not c.is_operator:
        raise HTTPException(status_code=403, detail="Operator only.")
    from app.services.email_service import send_simple_email

    today_ = date.today()
    tomorrow = datetime.combine(today_ + timedelta(days=1), datetime.min.time())
    rows = db.query(LegalMatter.tenant, LegalMatter.lawyer_email).filter(LegalMatter.status == "open", LegalMatter.next_hearing == tomorrow).distinct().all()
    trows = db.query(LegalTask.tenant, LegalTask.assignee_email).filter(LegalTask.done.is_(False), LegalTask.due_date <= tomorrow + timedelta(days=2)).distinct().all()
    targets = {(t, e) for t, e in list(rows) + list(trows) if e}
    sent = []
    for tenant, email in sorted(targets):
        if not store.access(db, email)[0]:
            continue  # the firm's licence lapsed or the person left
        text = _digest(db, tenant, email, today_)
        if not text:
            continue
        if not dry_run:
            await send_simple_email([email], "Tomorrow's hearings and deadlines — meldra Legal", text)
        sent.append(email)
    return {"dry_run": dry_run, "recipients": sent, "count": len(sent)}


# --- operator: who has the licence ---------------------------------------------------------------
class GrantIn(BaseModel):
    email: str
    enabled: bool = True
    expires_at: Optional[str] = None


@router.get("/admin/access")
def list_access(c: Ctx = Depends(ctx), db: Session = Depends(get_db)):
    if not c.is_operator:
        raise HTTPException(status_code=403, detail="Operator only.")
    rows = db.query(UserFeature).filter(UserFeature.feature == store.FEATURE).order_by(UserFeature.user_email).all()
    return {"operators": store.operator_emails(),
            "grants": [{"email": r.user_email, "enabled": r.enabled, "expires_at": r.expires_at.isoformat() if r.expires_at else None} for r in rows],
            "note": "Firms can also get access through their organisation licence: add \"legal\": true to the licence features."}


@router.post("/admin/access")
def grant_access(body: GrantIn, c: Ctx = Depends(ctx), db: Session = Depends(get_db)):
    if not c.is_operator:
        raise HTTPException(status_code=403, detail="Operator only.")
    email = body.email.strip().lower()
    if "@" not in email:
        raise HTTPException(status_code=400, detail="Enter an email address.")
    try:
        exp = store.to_dt(body.expires_at)
    except ValueError as e:
        _bad_date(e)
    row = db.query(UserFeature).filter(UserFeature.user_email == email, UserFeature.feature == store.FEATURE).first()
    if row is None:
        row = UserFeature(user_email=email, feature=store.FEATURE)
        db.add(row)
    row.enabled, row.expires_at = bool(body.enabled), exp
    db.commit()
    return {"email": email, "enabled": row.enabled, "expires_at": row.expires_at.isoformat() if row.expires_at else None}
