"""meldra Legal: licence gating, per-firm encrypted storage, diary flows, deadlines, citations, import and reports."""
import io
import os
import secrets
import tempfile
from datetime import date, timedelta

import pytest

os.environ.setdefault("DATABASE_URL", f"sqlite:///{os.path.join(tempfile.gettempdir(), 'meldra_connector_endpoints.db')}")
main = pytest.importorskip("app.main", reason="full backend dependencies not installed")
from fastapi.testclient import TestClient  # noqa: E402

from app.database import LegalMatter, License, Organization, OrganizationMember, SessionLocal, UserFeature  # noqa: E402
from app.services.legal import citations, deadlines, importer, profiles, statutes  # noqa: E402

main.init_db()
OPERATOR = {"email": "sumitagaria@gmail.com", "role": "user"}


def _as(user):
    main.app.dependency_overrides[main.get_current_user] = lambda: user
    return TestClient(main.app)


@pytest.fixture(autouse=True)
def _clear_overrides():
    yield
    main.app.dependency_overrides.clear()


def _person():
    return {"email": f"lawyer-{secrets.token_hex(4)}@firm.example", "role": "user"}


def _grant(email):
    db = SessionLocal()
    try:
        db.add(UserFeature(user_email=email, feature="legal", enabled=True))
        db.commit()
    finally:
        db.close()


# --- access ------------------------------------------------------------------------------------
def test_hidden_from_accounts_without_the_licence():
    c = _as(_person())
    assert c.get("/api/legal/access").json() == {"enabled": False, "via": None}
    assert c.get("/api/legal/bootstrap").status_code == 403
    assert c.get("/api/legal/matters").status_code == 403
    # Even meldra staff (role admin) do not get it without a licence.
    assert _as({"email": f"staff-{secrets.token_hex(3)}@meldra.ai", "role": "admin"}).get("/api/legal/matters").status_code == 403


def test_operator_has_access():
    c = _as(OPERATOR)
    assert c.get("/api/legal/access").json() == {"enabled": True, "via": "operator"}
    b = c.get("/api/legal/bootstrap").json()
    assert b["me"]["is_operator"] is True
    assert {x["code"] for x in b["countries"]} == {"IN", "GB"}


def test_operator_grants_and_a_personal_grant_opens_access():
    p = _person()
    assert _as(p).get("/api/legal/matters").status_code == 403
    r = _as(OPERATOR).post("/api/legal/admin/access", json={"email": p["email"]})
    assert r.status_code == 200 and r.json()["enabled"] is True
    assert _as(p).get("/api/legal/access").json()["via"] == "personal"
    # A granted person cannot grant others.
    assert _as(p).post("/api/legal/admin/access", json={"email": "x@y.z"}).status_code == 403
    _as(OPERATOR).post("/api/legal/admin/access", json={"email": p["email"], "enabled": False})
    assert _as(p).get("/api/legal/matters").status_code == 403


def test_expired_grant_gives_no_access():
    p = _person()
    _as(OPERATOR).post("/api/legal/admin/access", json={"email": p["email"], "expires_at": (date.today() - timedelta(days=1)).isoformat()})
    assert _as(p).get("/api/legal/access").json()["enabled"] is False


def test_organisation_licence_with_legal_feature_shares_one_diary():
    from datetime import datetime

    db = SessionLocal()
    try:
        org = Organization(name="Sample Chambers")
        db.add(org)
        db.flush()
        a, b = _person(), _person()
        for e, role in ((a["email"], "owner"), (b["email"], "member")):
            db.add(OrganizationMember(organization_id=org.id, user_email=e, role=role))
        db.add(License(organization_id=org.id, seats=5, start_date=datetime.utcnow() - timedelta(days=1),
                       end_date=datetime.utcnow() + timedelta(days=300), status="active", features_json='{"legal": true}'))
        db.commit()
    finally:
        db.close()
    assert _as(a).get("/api/legal/access").json()["via"] == "organisation"
    mid = _as(a).post("/api/legal/matters", json={"title": "Shared v Diary"}).json()["id"]
    assert any(m["id"] == mid for m in _as(b).get("/api/legal/matters").json()["matters"])
    # Members (not owners/admins) cannot change the firm's country.
    assert _as(b).put("/api/legal/settings", json={"country": "GB"}).status_code == 403


# --- storage -----------------------------------------------------------------------------------
def test_diaries_are_separate_and_encrypted():
    a, b = _person(), _person()
    _grant(a["email"])
    _grant(b["email"])
    r = _as(a).post("/api/legal/matters", json={"title": "Confidential Client v Bank", "client": "Confidential Client",
                                                "references": {"cnr": "dlhc 0100 1234 2023"}, "court_code": "DLHC"})
    assert r.status_code == 200
    m = r.json()
    assert m["references"]["cnr"] == "DLHC010012342023"
    assert _as(b).get(f"/api/legal/matters/{m['id']}").status_code == 404
    assert all(x["id"] != m["id"] for x in _as(b).get("/api/legal/matters").json()["matters"])
    db = SessionLocal()
    try:
        row = db.query(LegalMatter).filter(LegalMatter.id == m["id"]).first()
        assert "Confidential" not in (row.data_enc or "")
        assert row.court_code == "DLHC"
    finally:
        db.close()


# --- diary flows -------------------------------------------------------------------------------
def test_post_hearing_update_moves_the_diary_on():
    p = _person()
    _grant(p["email"])
    c = _as(p)
    today = date.today()
    m = c.post("/api/legal/matters", json={"title": "A v B", "court_code": "DIST", "next_hearing": today.strftime("%d/%m/%Y")}).json()
    assert m["next_hearing"] == today.isoformat()
    board = c.get("/api/legal/today").json()
    assert any(r["matter"]["id"] == m["id"] for r in board["hearings"])
    nxt = (today + timedelta(days=21)).isoformat()
    r = c.post(f"/api/legal/matters/{m['id']}/hearings", json={"date": today.isoformat(), "outcome": "adjourned", "next_date": nxt, "purpose": "Evidence"})
    assert r.status_code == 200
    assert r.json()["matter"]["next_hearing"] == nxt
    bad = c.post(f"/api/legal/matters/{m['id']}/hearings", json={"date": today.isoformat(), "next_date": (today - timedelta(days=2)).isoformat()})
    assert bad.status_code == 400
    done = c.post(f"/api/legal/matters/{m['id']}/hearings", json={"date": nxt, "outcome": "disposed"}).json()
    assert done["matter"]["status"] == "disposed" and done["matter"]["next_hearing"] is None
    detail = c.get(f"/api/legal/matters/{m['id']}").json()
    assert len(detail["hearings"]) == 2
    assert any(link["kind"] == "status" for link in detail["links"])


def test_deadline_is_suggested_then_confirmed_by_a_person():
    p = _person()
    _grant(p["email"])
    c = _as(p)
    s = c.post("/api/legal/deadlines/suggest", json={"rule_id": "gb_defence_28", "trigger_date": "2026-03-02"}).json()
    assert s["suggested_date"] == "2026-03-30" and "Not legal advice" in s["disclaimer"]
    t = c.post("/api/legal/deadlines", json={"rule_id": "gb_defence_28", "trigger_date": "2026-03-02", "due_date": "2026-03-27"}).json()
    assert t["kind"] == "deadline" and t["confirmed_by"] == p["email"]
    assert t["due_date"] == "2026-03-27" and t["suggested_date"] == "2026-03-30"
    assert c.post("/api/legal/deadlines/suggest", json={"rule_id": "nope", "trigger_date": "2026-03-02"}).status_code == 400


def test_deadline_rules():
    # Lands on a Saturday -> Monday.
    s = deadlines.suggest("in_ws_cpc", date(2026, 1, 1))  # +30 = Sat 31 Jan 2026
    assert s["suggested_date"] == "2026-02-02" and s["rolled"]
    # 3 months less one day.
    assert deadlines.suggest("gb_et1", date(2026, 1, 15))["suggested_date"] == "2026-04-14"
    # Month-end clamp: 31 Oct + 4 months -> 28 Feb (a Saturday in 2027 -> Monday 1 Mar).
    assert deadlines.suggest("gb_claim_form", date(2026, 10, 31))["suggested_date"] == "2027-03-01"


# --- research ----------------------------------------------------------------------------------
def test_citations_are_parsed_normalised_and_deduplicated():
    text = ("See Kesavananda Bharati (1973) 4 SCC 225 and AIR 1973 SC 1461; also (1973) 4 SCC 225 again. "
            "In England, [2023] UKSC 42 and [2022] EWHC 1234 (Comm), and [2021] EWHC 99 without a division. 2024 INSC 12.")
    out = citations.check(text)
    norm = [c["normalised"] for c in out["citations"]]
    assert "(1973) 4 SCC 225" in norm and norm.count("(1973) 4 SCC 225") == 1
    scc = next(c for c in out["citations"] if c["normalised"] == "(1973) 4 SCC 225")
    assert scc["count"] == 2
    uksc = next(c for c in out["citations"] if c["normalised"] == "[2023] UKSC 42")
    assert uksc["check_url"].endswith("/uksc/2023/42")
    comm = next(c for c in out["citations"] if c["normalised"].startswith("[2022] EWHC 1234"))
    assert comm["check_url"].endswith("/ewhc/comm/2022/1234")
    nodiv = next(c for c in out["citations"] if c["normalised"] == "[2021] EWHC 99")
    assert nodiv["status"] == "format_problem"
    assert all(c["status"] in ("not_verified", "format_problem") for c in out["citations"])  # never "verified" offline


def test_statute_mapping_both_ways():
    assert statutes.lookup("IPC", "302")["new_section"] == "103"
    assert statutes.lookup("BNS", "103")["old_section"] == "302"
    assert statutes.lookup("CrPC", "438")["new_section"] == "482"
    assert statutes.lookup("Evidence Act", "65B")["new_section"] == "63"
    found = statutes.find_in_text("Charged u/s 420 IPC and section 438 Cr.P.C.")
    assert {(f["old_act"], f["old_section"]) for f in found} == {("IPC", "420"), ("CrPC", "438")}
    listed = statutes.find_in_text("Sections 420, 406 IPC; also 302/34 IPC and 438 and 439 CrPC")
    assert {f["old_section"] for f in listed} == {"420", "406", "302", "34", "438", "439"}
    assert "BNS" in statutes.which_law(date(2025, 1, 1))


def test_reference_formats():
    assert profiles.validate_reference("IN", {"cnr": "DLHC010012342023"}) == []
    assert profiles.validate_reference("IN", {"cnr": "12345"})
    assert profiles.validate_reference("GB", {"claim_number": "KB-2025-001234"}) == []
    assert profiles.validate_reference("GB", {"claim_number": "2401234/2025"}) == []
    assert profiles.country_for_region("GB") == "GB" and profiles.country_for_region("INTL") == "IN"


# --- import ------------------------------------------------------------------------------------
def _xlsx(rows):
    from openpyxl import Workbook

    wb = Workbook()
    ws = wb.active
    ws.append(["Case Diary 2026"])  # a title row above the header, as real diaries have
    for r in rows:
        ws.append(r)
    buf = io.BytesIO()
    wb.save(buf)
    return buf.getvalue()


def test_excel_diary_import_preview_then_commit():
    p = _person()
    _grant(p["email"])
    c = _as(p)
    content = _xlsx([
        ["S.No", "Case No", "Parties", "Court", "NDOH", "Stage", "Advocate", "Fees", "Received"],
        [1, "CS(OS) 123/2021", "Rao v Rao", "Delhi High Court", "15/11/2026", "PE", "anita@firm.example", "50,000", "20000"],
        [2, "45/2019", "State v Kumar", "Saket District Court", "02/12/2026", "Arguments", "Vikram", "", ""],
        [None, None, None, None, None, None, None, None, None],
    ])
    r = c.post("/api/legal/import/preview", files={"file": ("diary.xlsx", content)}, data={"country": "IN"})
    assert r.status_code == 200, r.text
    prev = r.json()
    assert prev["count"] == 2
    first = prev["rows"][0]
    assert first["court_code"] == "DLHC" and first["stage"] == "evidence" and first["next_hearing"] == "2026-11-15"
    assert first["references"] == {"case_number": "123", "case_type": "CS(OS)", "case_year": "2021"}
    assert first["fees_billed"] == 50000.0
    assert prev["rows"][1]["court_code"] == "DIST" and prev["rows"][1]["lawyer_name"] == "Vikram"
    done = c.post("/api/legal/import/commit", json={"rows": prev["rows"]}).json()
    assert done["created"] == 2
    ms = c.get("/api/legal/matters", params={"q": "kumar"}).json()["matters"]
    assert len(ms) == 1 and "Advocate: Vikram" in (ms[0]["notes"] or "")


def test_header_mapping_hindi():
    m = importer.map_headers(["मुकदमा संख्या", "पक्षकार", "न्यायालय", "अगली तारीख"])
    assert set(m) >= {"case_number", "title", "court", "next_hearing"}


# --- sample firms, reports, suggestions, calendar, team ----------------------------------------
@pytest.mark.parametrize("country", ["IN", "GB"])
def test_sample_firm_reports_and_suggestions(country):
    p = _person()
    _grant(p["email"])
    c = _as(p)
    r = c.post("/api/legal/sample", json={"country": country})
    assert r.status_code == 200 and r.json()["loaded"] >= 10
    # Loading again replaces, not duplicates.
    n = r.json()["loaded"]
    c.post("/api/legal/sample", json={"country": country})
    assert len(c.get("/api/legal/matters").json()["matters"]) == n
    rep = c.get("/api/legal/reports").json()
    assert rep["totals"]["open"] >= 8 and rep["fees"]["billed"] > rep["fees"]["collected"]
    assert rep["by_court"] and rep["workload"] and rep["adjournments_by_court"]
    sug = c.get("/api/legal/suggestions").json()["suggestions"]
    keys = {s["key"] for s in sug}
    assert "outcome_missing" in keys
    if country == "IN":
        assert "adjourned_streak" in keys and "no_next_date" in keys
    board = c.get("/api/legal/today").json()
    assert board["hearings"]
    assert any(h["adjournment_likelihood"] is not None for h in board["hearings"])
    ics = c.get("/api/legal/calendar.ics", params={"mine": False})
    assert ics.status_code == 200 and "BEGIN:VEVENT" in ics.text
    assert c.delete("/api/legal/sample").json()["removed"] == n


def test_team_roles():
    p = _person()
    _grant(p["email"])
    c = _as(p)
    t = c.post("/api/legal/team", json={"email": "clerk@firm.example", "role": "clerk", "name": "Ramesh"}).json()
    assert any(m["email"] == "clerk@firm.example" and m["role"] == "clerk" for m in t["members"])
    assert c.post("/api/legal/team", json={"email": "x@firm.example", "role": "judge"}).status_code == 400


def test_order_extraction_falls_back_to_rules_without_ai(monkeypatch):
    from app.services import ai_service

    async def boom(*a, **k):
        raise ai_service.AIServiceError("no key")

    monkeypatch.setattr(ai_service, "invoke_llm", boom)
    p = _person()
    _grant(p["email"])
    r = _as(p).post("/api/legal/ai/extract-order", json={"text": "Arguments heard in part. Adjourned. List again on 12.01.2027 for further arguments."})
    assert r.status_code == 200
    out = r.json()
    assert out["next_date"] == "2027-01-12" and out["method"] == "rules" and out["outcome"] in ("adjourned", "part_heard")
