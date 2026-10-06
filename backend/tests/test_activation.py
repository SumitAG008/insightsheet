"""Activation: a signup's first finished file is recorded once, and the admin report counts it."""
import io
import os
import secrets
import tempfile
from datetime import datetime, timedelta

import pytest

os.environ.setdefault("DATABASE_URL", f"sqlite:///{os.path.join(tempfile.gettempdir(), 'meldra_connector_endpoints.db')}")
main = pytest.importorskip("app.main", reason="full backend dependencies not installed")
from fastapi.testclient import TestClient  # noqa: E402

from app.database import SessionLocal, Subscription, User  # noqa: E402
from app.routes.metrics import activation_report  # noqa: E402
from app.services.device_sessions import start_session  # noqa: E402
from app.utils.auth import create_access_token  # noqa: E402

main.init_db()


def _signed_in(email):
    db = SessionLocal()
    try:
        db.add(User(email=email, full_name="New", hashed_password="x", is_verified=True))
        db.commit()
        s = start_session(db, email, device_id="d-" + email, device_label="t", ip=None, location=None, lifetime=timedelta(hours=1))
        return create_access_token({"sub": email, "sid": s.session_id})
    finally:
        db.close()


def _pdf():
    from reportlab.pdfgen import canvas

    buf = io.BytesIO()
    c = canvas.Canvas(buf)
    c.drawString(100, 750, "hello")
    c.showPage()
    c.save()
    return buf.getvalue()


def test_first_finished_file_is_recorded_once_and_counted():
    email = f"activ-{secrets.token_hex(4)}@example.com"
    token = _signed_in(email)
    c = TestClient(main.app)
    headers = {"Authorization": f"Bearer {token}"}

    # A failed job does not count.
    bad = c.post("/api/pdf/split", files={"file": ("x.pdf", b"not a pdf", "application/pdf")}, data={"page_ranges": "1"}, headers=headers)
    assert bad.status_code >= 400
    db = SessionLocal()
    try:
        assert db.query(Subscription).filter(Subscription.user_email == email).one().first_result_at is None
    finally:
        db.close()

    ok = c.post("/api/pdf/split", files={"file": ("x.pdf", _pdf(), "application/pdf")}, data={"page_ranges": "1"}, headers=headers)
    assert ok.status_code == 200, ok.text
    db = SessionLocal()
    try:
        sub = db.query(Subscription).filter(Subscription.user_email == email).one()
        first = sub.first_result_at
        assert first is not None and sub.first_result_tool == "/api/pdf/split"
    finally:
        db.close()

    main._FIRST_RESULT_RECORDED.discard(email)  # even without the cache, the first time is never overwritten
    assert c.post("/api/pdf/split", files={"file": ("x.pdf", _pdf(), "application/pdf")}, data={"page_ranges": "1"}, headers=headers).status_code == 200
    db = SessionLocal()
    try:
        assert db.query(Subscription).filter(Subscription.user_email == email).one().first_result_at == first
        report = activation_report(db, days=1)
    finally:
        db.close()
    assert report["signups"] >= 1 and report["result_within_24h"] >= 1
    assert any(t["tool"] == "/api/pdf/split" for t in report["first_result_tools"])


def test_report_percentages_and_admin_only():
    db = SessionLocal()
    try:
        # A window far in the future, different on every run, so only this run's users fall in it
        # (the local test database is kept between runs).
        now = datetime.utcnow() + timedelta(days=3650 + secrets.randbelow(1_000_000), seconds=secrets.randbelow(86_400))
        made = []
        for i, gap in enumerate([timedelta(hours=1), timedelta(days=3), None, None]):
            email = f"rep-{secrets.token_hex(4)}@example.com"
            created = now - timedelta(days=2)
            db.add(User(email=email, full_name="R", hashed_password="x", created_date=created))
            db.add(Subscription(user_email=email, plan="free", status="active",
                                first_result_at=(created + gap) if gap else None, first_result_tool="/api/convert/pdf-to-doc" if gap else None))
            made.append(email)
        db.commit()
        r = activation_report(db, days=7, now=now)
    finally:
        db.close()
    assert r["signups"] == 4
    assert (r["result_within_24h"], r["result_within_24h_pct"]) == (1, 25.0)
    assert (r["result_within_7d"], r["result_within_7d_pct"]) == (2, 50.0)

    main.app.dependency_overrides[main.get_current_user] = lambda: {"email": "user@example.com", "role": "user"}
    try:
        assert TestClient(main.app).get("/api/admin/metrics/activation").status_code == 403
    finally:
        main.app.dependency_overrides.clear()
