"""Server protection: requests per minute, files at once per user, heavy jobs per server."""
import asyncio
import os
import secrets
import tempfile

import pytest

from app.services import server_guard
from app.services.server_guard import GuardRejection, HeavyJob


@pytest.fixture(autouse=True)
def fresh_guard(monkeypatch):
    monkeypatch.setenv("SERVER_GUARD", "on")
    monkeypatch.delenv("REDIS_URL", raising=False)
    server_guard.reset_for_tests()
    server_guard.forget_limits()
    yield
    server_guard.reset_for_tests()
    server_guard.forget_limits()


def test_requests_per_minute():
    for _ in range(5):
        server_guard.check_rate("user:a@example.com", 5, now=1000.0)
    with pytest.raises(GuardRejection) as e:
        server_guard.check_rate("user:a@example.com", 5, now=1001.0)
    assert e.value.status_code == 429 and e.value.retry_after >= 1
    server_guard.check_rate("user:b@example.com", 5, now=1001.0)  # other users are unaffected
    server_guard.check_rate("user:a@example.com", 5, now=1061.0)  # the window moves on
    server_guard.check_rate("user:a@example.com", -1, now=1061.0)  # -1 = no limit


def test_second_file_waits_then_is_refused_for_the_same_user():
    async def run():
        async with HeavyJob("user:a", 1, wait_seconds=0.3):
            with pytest.raises(GuardRejection) as e:
                async with HeavyJob("user:a", 1, wait_seconds=0.3):
                    pass
            assert e.value.status_code == 429
            async with HeavyJob("user:b", 1, wait_seconds=0.3):  # someone else still gets in
                pass
        async with HeavyJob("user:a", 1, wait_seconds=0.3):  # free again once the first finished
            pass

    asyncio.run(run())


def test_a_full_server_queues_then_answers_busy(monkeypatch):
    monkeypatch.setenv("GUARD_HEAVY_JOBS_PER_PROCESS", "2")
    server_guard.reset_for_tests()

    async def run():
        started = []

        async def job(name, hold):
            async with HeavyJob(f"user:{name}", 5, wait_seconds=1.0):
                started.append(name)
                await asyncio.sleep(hold)

        # Two run at once; the third waits for a slot instead of failing.
        await asyncio.gather(job("a", 0.2), job("b", 0.2), job("c", 0.0))
        assert started[-1] == "c"

        # When nothing frees up within the wait, the answer is 503 "busy, try again".
        async def hold_forever(name):
            async with HeavyJob(f"user:{name}", 5, wait_seconds=1.0):
                await asyncio.sleep(0.6)

        t1 = asyncio.create_task(hold_forever("x"))
        t2 = asyncio.create_task(hold_forever("y"))
        await asyncio.sleep(0.05)
        with pytest.raises(GuardRejection) as e:
            async with HeavyJob("user:z", 5, wait_seconds=0.1):
                pass
        assert e.value.status_code == 503 and e.value.retry_after > 0
        await asyncio.gather(t1, t2)
        assert server_guard.server_load()["heavy_jobs_running"] == 0  # every slot was given back

    asyncio.run(run())


def test_middleware_rate_limits_signed_in_users_by_plan(monkeypatch):
    os.environ.setdefault("DATABASE_URL", f"sqlite:///{os.path.join(tempfile.gettempdir(), 'meldra_connector_endpoints.db')}")
    main = pytest.importorskip("app.main", reason="full backend dependencies not installed")
    from fastapi.testclient import TestClient

    from app.utils.auth import create_access_token

    main.init_db()
    email = f"guard-{secrets.token_hex(4)}@example.com"
    monkeypatch.setenv("LIMIT_FREE_REQUESTS_PER_MINUTE", "3")
    token = create_access_token({"sub": email})
    c = TestClient(main.app)
    codes = [c.get("/api/plans/limits", headers={"Authorization": f"Bearer {token}"}).status_code for _ in range(4)]
    assert codes == [200, 200, 200, 429]
    r = c.get("/api/plans/limits", headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 429 and int(r.headers["Retry-After"]) >= 1 and r.json()["code"] == "rate_limited"
    # Health checks and the website itself are never rate limited.
    assert c.get("/health").status_code == 200
