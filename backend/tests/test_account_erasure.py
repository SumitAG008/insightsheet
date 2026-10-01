"""Deleting an account removes everything about the person except paid billing records, which lose IP and browser."""
import io
import os
import secrets
import tempfile

import pytest

os.environ.setdefault("DATABASE_URL", f"sqlite:///{os.path.join(tempfile.gettempdir(), 'meldra_connector_endpoints.db')}")
main = pytest.importorskip("app.main", reason="full backend dependencies not installed")
from fastapi.testclient import TestClient  # noqa: E402

from app.database import (  # noqa: E402
    FileProcessingHistory, LoginHistory, SessionLocal, Subscription, SubscriptionEventLog, User, UserActivity, UserSession,
)
from app.utils.auth import get_password_hash  # noqa: E402

main.init_db()


def _make_account(paid: bool) -> str:
    from datetime import datetime, timedelta

    email = f"erase-{secrets.token_hex(4)}@example.com"
    db = SessionLocal()
    try:
        db.add(User(email=email, full_name="Erase Me", hashed_password=get_password_hash("Secret-pass1"), is_verified=True))
        db.add(Subscription(user_email=email, plan="premium" if paid else "free", amount_paid=29.0 if paid else None,
                            payment_status="paid" if paid else "unpaid"))
        db.add(SubscriptionEventLog(user_email=email, event_type="upgrade", ip_address="203.0.113.9", user_agent="Firefox"))
        db.add(LoginHistory(user_email=email, event_type="login", ip_address="203.0.113.9", location="Pune, India"))
        db.add(UserSession(session_id=secrets.token_hex(8), user_email=email, ip_address="203.0.113.9",
                           expires_at=datetime.utcnow() + timedelta(days=1)))
        db.add(UserActivity(user_email=email, activity_type="search_choice", details='{"q": "salary"}'))
        db.commit()
    finally:
        db.close()
    return email


def _count(model, email):
    db = SessionLocal()
    try:
        return db.query(model).filter(model.user_email == email).count()
    finally:
        db.close()


@pytest.fixture()
def as_user():
    def _sign_in(email):
        main.app.dependency_overrides[main.get_current_user] = lambda: {"email": email}
        return TestClient(main.app)
    yield _sign_in
    main.app.dependency_overrides.clear()


def test_delete_account_needs_password_and_confirmation(as_user):
    email = _make_account(paid=False)
    client = as_user(email)
    assert client.post("/api/account/delete", json={"password": "Secret-pass1", "confirm": "yes"}).status_code == 400
    assert client.post("/api/account/delete", json={"password": "wrong", "confirm": "DELETE"}).status_code == 403
    assert _count(LoginHistory, email) == 1  # nothing removed


def test_free_account_is_erased_completely(as_user):
    email = _make_account(paid=False)
    r = as_user(email).post("/api/account/delete", json={"password": "Secret-pass1", "confirm": "DELETE"})
    assert r.status_code == 200, r.text
    assert r.json()["billing_records_kept"] == 0
    db = SessionLocal()
    try:
        assert db.query(User).filter(User.email == email).count() == 0
    finally:
        db.close()
    for model in (Subscription, SubscriptionEventLog, LoginHistory, UserSession, UserActivity, FileProcessingHistory):
        assert _count(model, email) == 0, model.__tablename__


def test_paid_billing_records_are_kept_without_ip_or_browser(as_user):
    email = _make_account(paid=True)
    r = as_user(email).post("/api/account/delete", json={"password": "Secret-pass1", "confirm": "DELETE"})
    assert r.status_code == 200 and r.json()["billing_records_kept"] == 1
    db = SessionLocal()
    try:
        assert db.query(Subscription).filter(Subscription.user_email == email).one().status == "deleted"
        evt = db.query(SubscriptionEventLog).filter(SubscriptionEventLog.user_email == email).one()
        assert evt.ip_address is None and evt.user_agent is None
    finally:
        db.close()
    assert _count(LoginHistory, email) == 0 and _count(UserSession, email) == 0


def test_processing_history_keeps_the_file_type_never_the_name(as_user):
    email = f"names-{secrets.token_hex(4)}@example.com"
    db = SessionLocal()
    try:
        db.add(User(email=email, full_name="Names", hashed_password="x", is_verified=True))
        db.commit()
    finally:
        db.close()
    r = as_user(email).post("/api/files/excel-to-ppt",
                            files={"file": ("Salaries John Smith.csv", io.BytesIO(b"name,value\na,1\n"), "text/csv")})
    assert r.status_code == 200, r.text
    db = SessionLocal()
    try:
        names = [h.original_filename for h in db.query(FileProcessingHistory).filter(FileProcessingHistory.user_email == email)]
    finally:
        db.close()
    assert names == [".csv"]
