"""Personal data is deleted once its retention period has passed; recent data and billing records stay."""
import json
import os
import secrets
import tempfile
from datetime import datetime, timedelta

import pytest

os.environ.setdefault("DATABASE_URL", f"sqlite:///{os.path.join(tempfile.gettempdir(), 'meldra_connector_endpoints.db')}")
main = pytest.importorskip("app.main", reason="full backend dependencies not installed")

from app.database import (  # noqa: E402
    ConsentLog, InvoiceExtractionJob, LoginHistory, LoginOtpChallenge, SessionLocal, SubscriptionEventLog, UserSession,
)
from app.services.data_retention import purge_expired_personal_data  # noqa: E402

main.init_db()


def test_old_personal_data_is_deleted_and_recent_data_kept():
    email = f"retention-{secrets.token_hex(4)}@example.com"
    now = datetime.utcnow()
    db = SessionLocal()
    try:
        old_login = LoginHistory(user_email=email, event_type="login", ip_address="203.0.113.9", created_date=now - timedelta(days=120))
        new_login = LoginHistory(user_email=email, event_type="login", ip_address="203.0.113.9", created_date=now - timedelta(days=5))
        old_job = InvoiceExtractionJob(job_id=secrets.token_hex(8), user_email=email, report_json=json.dumps({"invoice": {"total": 1}}),
                                       expires_at=now - timedelta(hours=1))
        live_job = InvoiceExtractionJob(job_id=secrets.token_hex(8), user_email=email, expires_at=now + timedelta(hours=1))
        old_code = LoginOtpChallenge(challenge_id=secrets.token_hex(8), user_email=email, otp_hash="x", expires_at=now - timedelta(days=3))
        ended = UserSession(session_id=secrets.token_hex(8), user_email=email, expires_at=now - timedelta(days=40))
        active = UserSession(session_id=secrets.token_hex(8), user_email=email, expires_at=now + timedelta(minutes=30))
        consent = ConsentLog(ip_address="203.0.113.9", accepted=True, created_date=now - timedelta(days=100))
        billing = SubscriptionEventLog(user_email=email, event_type="upgrade", created_date=now - timedelta(days=900))
        db.add_all([old_login, new_login, old_job, live_job, old_code, ended, active, consent, billing])
        db.commit()
        ids = {k: v.id for k, v in dict(old_login=old_login, new_login=new_login, old_job=old_job, live_job=live_job,
                                         old_code=old_code, ended=ended, active=active, consent=consent, billing=billing).items()}

        removed = purge_expired_personal_data(db)
        assert removed["login_history"] >= 1 and removed["invoice_jobs"] >= 1

        exists = lambda model, i: db.query(model).filter(model.id == i).first() is not None
        assert not exists(LoginHistory, ids["old_login"]) and exists(LoginHistory, ids["new_login"])
        assert not exists(InvoiceExtractionJob, ids["old_job"]) and exists(InvoiceExtractionJob, ids["live_job"])
        assert not exists(LoginOtpChallenge, ids["old_code"])
        assert not exists(UserSession, ids["ended"]) and exists(UserSession, ids["active"])
        assert exists(ConsentLog, ids["consent"])  # consent proof is kept for 2 years
        assert exists(SubscriptionEventLog, ids["billing"])  # financial records are not deleted
    finally:
        db.close()


def test_invoice_upload_is_never_written_to_the_database(monkeypatch):
    import base64
    from fastapi.testclient import TestClient

    captured = {}
    monkeypatch.setattr(main, "_enforce_feature", lambda *a, **k: None)
    monkeypatch.setattr(main, "_run_invoice_extraction_job", lambda job_id, content=b"": captured.update(job=job_id, content=content))
    main.app.dependency_overrides[main.get_current_user] = lambda: {"email": "invoice-privacy@example.com"}
    secret_text = f"INVOICE-{secrets.token_hex(6)}"
    try:
        r = TestClient(main.app).post("/api/unstructured/invoice/run", json={
            "filename": "inv.pdf", "content_base64": base64.b64encode(secret_text.encode()).decode(), "max_pages": 1})
    finally:
        main.app.dependency_overrides.clear()
    assert r.status_code == 200, r.text
    import time
    for _ in range(50):
        if captured:
            break
        time.sleep(0.05)
    assert captured.get("content") == secret_text.encode()  # the worker gets the file in memory
    db = SessionLocal()
    try:
        job = db.query(InvoiceExtractionJob).filter(InvoiceExtractionJob.job_id == r.json()["job_id"]).one()
        assert "content_base64" not in (job.config_json or "")
        assert base64.b64encode(secret_text.encode()).decode() not in (job.config_json or "")
    finally:
        db.close()
