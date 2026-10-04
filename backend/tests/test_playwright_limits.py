"""Web data (Playwright) jobs: paid plans only, one job at a time per person, each run counts as a conversion."""
import os
import secrets
import tempfile

import pytest

os.environ.setdefault("DATABASE_URL", f"sqlite:///{os.path.join(tempfile.gettempdir(), 'meldra_connector_endpoints.db')}")
main = pytest.importorskip("app.main", reason="full backend dependencies not installed")
from fastapi.testclient import TestClient  # noqa: E402

from app.database import PlaywrightJob, SessionLocal, Subscription, User  # noqa: E402

main.init_db()


@pytest.fixture()
def paid_user(monkeypatch):
    email = f"scraper-{secrets.token_hex(4)}@example.com"
    db = SessionLocal()
    try:
        db.add(User(email=email, full_name="Scraper", hashed_password="x", is_verified=True))
        db.add(Subscription(user_email=email, plan="pro", status="active"))
        db.commit()
    finally:
        db.close()
    started = []
    monkeypatch.setattr(main, "_with_playwright_slot", lambda fn, job_id: started.append(job_id))  # no real browser
    main.app.dependency_overrides[main.get_current_user] = lambda: {"email": email}
    yield email, started
    main.app.dependency_overrides.clear()


def _run(c):
    return c.post("/api/connectors/playwright/books/run", json={"max_pages": 1, "timeout_ms": 10000})


def test_free_plan_is_refused():
    email = f"free-{secrets.token_hex(4)}@example.com"
    main.app.dependency_overrides[main.get_current_user] = lambda: {"email": email}
    try:
        r = _run(TestClient(main.app))
        assert r.status_code == 403 and "paid plans" in r.json()["detail"]
    finally:
        main.app.dependency_overrides.clear()


def test_one_job_at_a_time_and_counted_as_a_conversion(paid_user):
    email, started = paid_user
    c = TestClient(main.app)
    first = _run(c)
    assert first.status_code == 200 and started == [first.json()["job_id"]]

    second = _run(c)  # the first is still queued
    assert second.status_code == 429 and "already have a web data job" in second.json()["detail"]

    db = SessionLocal()
    try:
        assert db.query(Subscription).filter(Subscription.user_email == email).one().conversions_used == 1
        db.query(PlaywrightJob).filter(PlaywrightJob.user_email == email).update({"status": "succeeded"})
        db.commit()
    finally:
        db.close()
    assert _run(c).status_code == 200  # free to start the next one
