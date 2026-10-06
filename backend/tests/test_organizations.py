"""Organisations, seats and licences: deals set up by meldra staff, managed by the customer's admins."""
import io
import os
import secrets
import tempfile
from datetime import datetime, timedelta

import pytest

os.environ.setdefault("DATABASE_URL", f"sqlite:///{os.path.join(tempfile.gettempdir(), 'meldra_connector_endpoints.db')}")
main = pytest.importorskip("app.main", reason="full backend dependencies not installed")
from fastapi.testclient import TestClient  # noqa: E402

from app.database import License, SessionLocal, User  # noqa: E402

main.init_db()
STAFF = {"email": "staff@meldra.ai", "role": "admin"}


def _domain() -> str:
    return f"uni-{secrets.token_hex(4)}.ac.uk"


def _register(email: str) -> None:
    db = SessionLocal()
    try:
        db.add(User(email=email, full_name="Test", hashed_password="x", is_verified=True))
        db.commit()
    finally:
        db.close()


def _as(user):
    main.app.dependency_overrides[main.get_current_user] = lambda: user
    return TestClient(main.app)


@pytest.fixture(autouse=True)
def _clear_overrides():
    yield
    main.app.dependency_overrides.clear()


def _iso(days: int) -> str:
    return (datetime.utcnow() + timedelta(days=days)).date().isoformat()


def _set_up_deal(domain: str, seats: int = 2, **licence):
    c = _as(STAFF)
    owner = f"it-admin@{domain}"
    _register(owner)
    org = c.post("/api/admin/orgs", json={
        "name": f"University {domain}", "sector": "university", "email_domain": domain, "auto_join": True,
        "owner_email": owner, "crm_ref": "hubspot-123",
    })
    assert org.status_code == 200, org.text
    org_id = org.json()["id"]
    body = {"plan": "team", "seats": seats, "start_date": _iso(-1), "end_date": _iso(364),
            "contract_value": 150000, "currency": "INR", "po_number": "PO-1", **licence}
    lic = c.post(f"/api/admin/orgs/{org_id}/licenses", json=body)
    assert lic.status_code == 200, lic.text
    return org_id, lic.json(), owner


def test_only_meldra_staff_can_set_up_organisations():
    c = _as({"email": "someone@example.com", "role": "user"})
    assert c.post("/api/admin/orgs", json={"name": "Sneaky Org"}).status_code == 403
    assert c.get("/api/admin/licenses/report").status_code == 403


def test_public_email_domains_cannot_be_claimed():
    c = _as(STAFF)
    r = c.post("/api/admin/orgs", json={"name": "Gmail Org", "email_domain": "gmail.com", "auto_join": True})
    assert r.status_code == 400


def test_members_get_the_licence_limits_and_domain_auto_join_fills_seats():
    domain = _domain()
    org_id, lic, owner = _set_up_deal(domain, seats=2, limits={"conversions_per_month": 4000})

    # The owner holds seat 1 and sees the Team limits with the custom conversion figure.
    me = _as({"email": owner, "role": "user"}).get("/api/subscriptions/me").json()
    assert me["plan_key"] == "team" and me["limits_source"] == "organization"
    assert me["plan"] == "premium"  # the website treats any paid plan as premium
    assert me["limits"]["file_size_mb"] == 100 and me["allowance"]["conversions"]["limit"] == 4000
    assert me["organization"]["name"].startswith("University")

    # A colleague from the same domain joins automatically and takes seat 2.
    colleague = f"researcher@{domain}"
    _register(colleague)
    r = _as({"email": colleague, "role": "user"}).get("/api/subscriptions/me").json()
    assert r["plan_key"] == "team" and r["organization"]["role"] == "member"

    # Seats are full: the next person from the domain stays on their own (free) plan.
    third = f"student@{domain}"
    _register(third)
    r = _as({"email": third, "role": "user"}).get("/api/subscriptions/me").json()
    assert r["plan_key"] == "free" and r["organization"] is None

    # The customer's admin can't add beyond the seats either.
    admin = _as({"email": owner, "role": "user"})
    full = admin.post("/api/org/members", json={"email": f"x@{domain}"})
    assert full.status_code == 402 and "seats" in full.json()["detail"]


def test_org_admin_manages_people_and_exports_usage():
    domain = _domain()
    org_id, _, owner = _set_up_deal(domain, seats=5)
    admin = _as({"email": owner, "role": "user"})

    assert admin.post("/api/org/members", json={"email": f"head@{domain}", "role": "admin"}).status_code == 200
    assert admin.post("/api/org/members", json={"email": f"staff@{domain}"}).status_code == 200
    members = admin.get("/api/org/members").json()
    assert members["organization"]["seats_used"] == 3
    assert {m["email"] for m in members["members"]} == {owner, f"head@{domain}", f"staff@{domain}"}

    csv_text = admin.get("/api/org/usage.csv").text
    assert csv_text.splitlines()[0].startswith("email,role,registered,conversions_this_month")
    assert f"staff@{domain}" in csv_text

    # An ordinary member can't manage the organisation (each _as() switches who is signed in).
    member = _as({"email": f"staff@{domain}", "role": "user"})
    assert member.get("/api/org/members").status_code == 403
    assert member.post("/api/org/members", json={"email": f"y@{domain}"}).status_code == 403

    # A non-owner admin can't remove the owner; nobody can remove the last owner.
    assert _as({"email": f"head@{domain}", "role": "user"}).delete(f"/api/org/members/{owner}").status_code == 403
    admin = _as({"email": owner, "role": "user"})
    assert admin.delete(f"/api/org/members/{owner}").status_code == 400

    assert admin.delete(f"/api/org/members/staff@{domain}").status_code == 200
    events = admin.get("/api/org/events").json()["events"]
    assert any(e["event"] == "member_removed" for e in events)
    # No file names or contents ever appear in the trail; only who changed membership.
    assert all(set((e.get("details") or {}) if isinstance(e.get("details"), dict) else {}) <= {"email", "role", "from", "to", "license_id", "plan", "seats", "end_date", "name", "fields"} for e in events)


def test_ended_licence_keeps_access_through_grace_then_falls_back():
    domain = _domain()
    org_id, lic, owner = _set_up_deal(domain, seats=3)
    db = SessionLocal()
    try:
        row = db.query(License).filter(License.id == lic["id"]).one()
        row.start_date = datetime.utcnow() - timedelta(days=400)
        row.end_date = datetime.utcnow() - timedelta(days=5)  # ended 5 days ago, 14-day grace
        db.commit()
    finally:
        db.close()
    me = _as({"email": owner, "role": "user"}).get("/api/subscriptions/me").json()
    assert me["plan_key"] == "team" and me["organization"]["license_state"] == "grace"

    staff = _as(STAFF)
    assert staff.patch(f"/api/admin/licenses/{lic['id']}", json={"grace_days": 0}).status_code == 200
    me = _as({"email": owner, "role": "user"}).get("/api/subscriptions/me").json()
    assert me["plan_key"] == "free" and me["organization"]["license_state"] == "expired"


def test_licence_report_shows_arr_renewals_and_unpaid():
    domain = _domain()
    org_id, lic, _ = _set_up_deal(domain, seats=10, end_date=_iso(45), start_date=_iso(-320), contract_value=120000)
    report = _as(STAFF).get("/api/admin/licenses/report").json()
    row = next(r for r in report["active"] if r["organization_id"] == org_id)
    assert row["seats"] == 10 and row["seats_used"] == 1 and row["utilisation"] == 0.1
    assert any(r["organization_id"] == org_id for r in report["low_utilisation"])
    renewal = next(r for r in report["renewals"] if r["organization_id"] == org_id)
    assert renewal["bucket"] == "60"
    assert report["arr_by_currency"]["INR"] > 0 and report["unpaid_by_currency"]["INR"] >= 120000
    csv_text = _as(STAFF).get("/api/admin/licenses/report.csv").text
    assert "hubspot-123" in csv_text


def test_unknown_limit_names_are_rejected():
    domain = _domain()
    c = _as(STAFF)
    org_id = c.post("/api/admin/orgs", json={"name": f"Org {domain}"}).json()["id"]
    r = c.post(f"/api/admin/orgs/{org_id}/licenses", json={
        "plan": "business", "seats": 5, "start_date": _iso(0), "end_date": _iso(365), "limits": {"gigaflops": 9},
    })
    assert r.status_code == 400 and "gigaflops" in r.json()["detail"]


def test_plan_limits_endpoint_is_public():
    r = TestClient(main.app).get("/api/plans/limits")
    assert r.status_code == 200 and r.json()["plans"]["free"]["limits"]["file_size_mb"] == 10


def test_renewal_stage_follows_the_end_date():
    from app.services.organizations import renewal_stage

    now = datetime(2026, 10, 1)

    def lic(days, status="active", grace=14):
        return License(organization_id=1, start_date=now - timedelta(days=300), end_date=now + timedelta(days=days),
                       grace_days=grace, status=status)

    assert renewal_stage(lic(200), now) is None
    assert renewal_stage(lic(90), now) == "d90"
    assert renewal_stage(lic(45), now) == "d60"
    assert renewal_stage(lic(30), now) == "d30"
    assert renewal_stage(lic(3), now) == "d7"
    assert renewal_stage(lic(-5), now) == "grace"
    assert renewal_stage(lic(-30), now) == "expired"
    assert renewal_stage(lic(10, status="suspended"), now) is None
    assert renewal_stage(None, now) is None


def test_org_admin_sees_renewal_notice_and_can_request_renewal(monkeypatch):
    from app.routes import organizations as routes

    sent = []

    async def fake_send(to, subject, body):
        sent.append((to, subject, body))
        return True

    monkeypatch.setattr(routes, "send_simple_email", fake_send)
    domain = _domain()
    org_id, _, owner = _set_up_deal(domain, seats=3, start_date=_iso(-300), end_date=_iso(20))
    admin = _as({"email": owner, "role": "user"})
    me = admin.get("/api/org/me").json()
    assert me["organization"]["renewal_stage"] == "d30"

    r = admin.post("/api/org/renewal-request", json={"seats": 5, "message": "Add two seats"})
    assert r.status_code == 200 and r.json()["emailed"] is True
    assert "Renewal request" in sent[0][1] and "Seats wanted: 5" in sent[0][2]
    # A second click the same day is logged but doesn't email sales again.
    assert admin.post("/api/org/renewal-request", json={}).json()["emailed"] is False
    assert len(sent) == 1

    # Ordinary members can't request renewals.
    colleague = f"member@{domain}"
    _register(colleague)
    assert admin.post("/api/org/members", json={"email": colleague}).status_code == 200
    assert _as({"email": colleague, "role": "user"}).post("/api/org/renewal-request", json={}).status_code == 403

    # Once the renewal licence is recorded, the notice goes away.
    c = _as(STAFF)
    renewal = c.post(f"/api/admin/orgs/{org_id}/licenses", json={
        "plan": "team", "seats": 5, "start_date": _iso(21), "end_date": _iso(386), "contract_value": 1, "currency": "INR"})
    assert renewal.status_code == 200, renewal.text
    assert _as({"email": owner, "role": "user"}).get("/api/org/me").json()["organization"]["renewal_stage"] is None


def test_renewal_reminders_are_sent_once_per_stage(monkeypatch):
    from app.routes import organizations as routes

    sent = []

    async def fake_send(to, subject, body):
        sent.append((to, subject, body))
        return True

    monkeypatch.setattr(routes, "send_simple_email", fake_send)
    domain = _domain()
    org_id, _, owner = _set_up_deal(domain, seats=3, start_date=_iso(-300), end_date=_iso(5))
    c = TestClient(main.app)

    monkeypatch.delenv("CRON_SECRET", raising=False)
    assert c.post("/api/cron/renewal-reminders").status_code == 503
    monkeypatch.setenv("CRON_SECRET", "s3cret")
    assert c.post("/api/cron/renewal-reminders", headers={"X-Cron-Secret": "wrong"}).status_code == 403

    dry = c.post("/api/cron/renewal-reminders?dry_run=true", headers={"X-Cron-Secret": "s3cret"}).json()
    mine = [r for r in dry["results"] if r["organization_id"] == org_id]
    assert mine == [{"organization_id": org_id, "stage": "d7", "recipients": 1, "sent": False}]
    assert not sent

    first = c.post("/api/cron/renewal-reminders", headers={"X-Cron-Secret": "s3cret"}).json()
    assert any(r["organization_id"] == org_id and r["sent"] for r in first["results"])
    mail = [m for m in sent if owner in m[0]]
    assert len(mail) == 1 and "7 days or less" in mail[0][2]

    again = c.post("/api/cron/renewal-reminders", headers={"X-Cron-Secret": "s3cret"}).json()
    assert not any(r["organization_id"] == org_id for r in again["results"])
