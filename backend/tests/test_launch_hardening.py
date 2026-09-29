"""
Launch hardening: slow AI calls don't stall other requests, login guessing is limited,
plans can't be self-upgraded, and database connections work across worker processes.
"""
import asyncio
import os
import secrets
import tempfile
import time
from datetime import datetime

import pytest

os.environ.setdefault("DATABASE_URL", f"sqlite:///{os.path.join(tempfile.gettempdir(), 'meldra_connector_endpoints.db')}")
main = pytest.importorskip("app.main", reason="full backend dependencies not installed")
from fastapi.testclient import TestClient  # noqa: E402

from app.database import SessionLocal  # noqa: E402
from app.services import db_connection_service as dbsvc  # noqa: E402

main.init_db()


def _unique_email(tag: str) -> str:
    return f"{tag}-{secrets.token_hex(4)}@example.com"


def test_slow_ai_call_does_not_block_other_requests(monkeypatch):
    """One customer's 1.5s AI answer must not hold up a health check for anyone else."""
    import httpx
    from app.services import ai_service

    class _Msg:
        content = "ok"

    class _Resp:
        choices = [type("C", (), {"message": _Msg()})()]
        usage = None

    def slow_create(**kwargs):
        time.sleep(1.5)  # the real OpenAI client blocks like this while waiting
        return _Resp()

    from types import SimpleNamespace

    fake_openai = SimpleNamespace(chat=SimpleNamespace(completions=SimpleNamespace(create=slow_create)))
    monkeypatch.setattr(ai_service, "openai", fake_openai)

    async def run():
        transport = httpx.ASGITransport(app=main.app)
        async with httpx.AsyncClient(transport=transport, base_url="http://test") as c:
            start = time.perf_counter()
            slow = asyncio.create_task(ai_service.invoke_llm("hello"))

            async def health_check_during_the_ai_call():
                await asyncio.sleep(0.1)
                r = await c.get("/health")
                return r.status_code, time.perf_counter() - start

            status_code, finished_at = await health_check_during_the_ai_call()
            assert await slow == "ok"
            return status_code, finished_at

    status_code, finished_at = asyncio.run(run())
    assert status_code == 200
    # Blocked, the health check could only finish after the 1.5s AI call.
    assert finished_at < 0.8, f"health check finished {finished_at:.2f}s in, stuck behind the AI call"


def test_heavy_endpoints_run_off_the_event_loop():
    """File conversions and analysis are plain functions, so FastAPI runs them in its thread pool."""
    import inspect

    for name in ("excel_to_ppt", "analyze_file", "process_zip", "convert_document", "login", "register",
                 "reconcile_preview", "universal_analyze", "test_db_connection", "execute_db_query"):
        assert not inspect.iscoroutinefunction(getattr(main, name)), name


def test_repeated_failed_logins_are_blocked(monkeypatch):
    monkeypatch.setenv("LOGIN_MAX_FAILED_PER_EMAIL", "3")
    email = _unique_email("guess")
    c = TestClient(main.app)
    codes = [c.post("/api/auth/login", json={"email": email, "password": "wrong-password"}).status_code for _ in range(4)]
    assert codes == [401, 401, 401, 429]


def test_failed_logins_from_one_ip_are_blocked(monkeypatch):
    monkeypatch.setenv("LOGIN_MAX_FAILED_PER_IP", "2")
    ip = f"203.0.113.{secrets.randbelow(250) + 1}"
    db = SessionLocal()
    try:
        db.query(main.LoginHistory).filter(main.LoginHistory.ip_address == ip).delete()
        db.commit()
    finally:
        db.close()
    c = TestClient(main.app)
    headers = {"x-forwarded-for": ip}
    codes = [c.post("/api/auth/login", json={"email": _unique_email("spray"), "password": "x"}, headers=headers).status_code for _ in range(3)]
    assert codes == [401, 401, 429]


def test_customers_cannot_upgrade_themselves():
    main.app.dependency_overrides[main.get_current_user] = lambda: {"email": _unique_email("free")}
    try:
        r = TestClient(main.app).post("/api/subscriptions/upgrade")
        assert r.status_code == 402
    finally:
        main.app.dependency_overrides.clear()


def test_admin_can_set_a_plan():
    email = _unique_email("customer")
    db = SessionLocal()
    try:
        db.add(main.User(email=email, full_name="Pilot Customer", hashed_password="x", is_verified=True, created_date=datetime.utcnow()))
        db.commit()
    finally:
        db.close()

    c = TestClient(main.app)
    main.app.dependency_overrides[main.get_current_user] = lambda: {"email": "member@example.com", "role": "user"}
    try:
        assert c.post("/api/admin/subscriptions/set-plan", json={"user_email": email, "plan": "premium"}).status_code == 403
    finally:
        main.app.dependency_overrides.clear()

    main.app.dependency_overrides[main.get_current_user] = lambda: {"email": "admin@example.com", "role": "admin"}
    try:
        r = c.post("/api/admin/subscriptions/set-plan", json={"user_email": email, "plan": "premium"})
        assert r.status_code == 200 and r.json()["plan"] == "premium"
    finally:
        main.app.dependency_overrides.clear()

    db = SessionLocal()
    try:
        sub = db.query(main.Subscription).filter(main.Subscription.user_email == email).one()
        assert sub.plan == "premium" and sub.ai_queries_limit == -1
        log = db.query(main.SubscriptionEventLog).filter(main.SubscriptionEventLog.user_email == email).one()
        assert log.event_type == "admin_set_plan:admin@example.com"
    finally:
        db.close()


def test_oversized_request_is_refused_before_reading(monkeypatch):
    c = TestClient(main.app)
    too_big = str(main._MAX_REQUEST_BODY_BYTES + 1)
    r = c.post("/api/files/analyze", content=b"x", headers={"content-length": too_big, "content-type": "application/octet-stream"})
    assert r.status_code == 413


def test_database_connection_survives_a_different_worker(tmp_path):
    """A connection opened on one worker can be used from another; only by the user who opened it."""
    import sqlite3

    path = str(tmp_path / "customer.db")
    with sqlite3.connect(path) as conn:
        conn.execute("CREATE TABLE t (n INTEGER)")
        conn.executemany("INSERT INTO t VALUES (?)", [(i,) for i in range(5)])

    owner = "owner@example.com"
    res = dbsvc.DatabaseConnectionService.test_connection("sqlite", {"filePath": path, "readOnly": "true"}, owner)
    assert res["success"]
    cid = res["connectionId"]
    assert path not in cid  # the settings travel encrypted

    # Another worker process has an empty pool.
    dbsvc._connection_pool.pop(cid)["connection"].close()
    out = dbsvc.DatabaseConnectionService.execute_query(cid, "sqlite", "SELECT COUNT(*) AS c FROM t", owner=owner)
    assert out["success"] and out["data"][0]["c"] == 5

    stranger = dbsvc.DatabaseConnectionService.execute_query(cid, "sqlite", "SELECT 1", owner="someone-else@example.com")
    assert not stranger["success"]
    dbsvc._connection_pool.pop(cid)["connection"].close()
    stranger = dbsvc.DatabaseConnectionService.execute_query(cid, "sqlite", "SELECT 1", owner="someone-else@example.com")
    assert not stranger["success"]

    forged = dbsvc.DatabaseConnectionService.execute_query("conn_not-a-token", "sqlite", "SELECT 1", owner=owner)
    assert not forged["success"]


def test_background_jobs_run_in_one_worker_only(monkeypatch):
    lock_dir = tempfile.mkdtemp()
    monkeypatch.setattr(main.tempfile, "gettempdir", lambda: lock_dir)
    monkeypatch.setattr(main, "_background_jobs_lock_file", None)
    assert main._acquire_background_jobs_lock() is True
    held = main._background_jobs_lock_file
    # A second process asking for the same lock is refused (flock is per open file).
    import fcntl

    other = open(held.name, "w")
    with pytest.raises(OSError):
        fcntl.flock(other.fileno(), fcntl.LOCK_EX | fcntl.LOCK_NB)
    other.close()
    held.close()

    monkeypatch.setenv("RUN_BACKGROUND_JOBS", "false")
    assert main._acquire_background_jobs_lock() is False
