"""
Server protection: keeps Meldra up when many people use it at once.

Three rules, applied to every API request by the middleware in app/main.py:

1. Requests per minute, per user (by plan) and per IP address for signed-out requests.
   Over the limit -> 429 with Retry-After.
2. Files processing at the same time, per user (by plan). A second file waits its turn for up to
   GUARD_QUEUE_WAIT_SECONDS, then gets 429 "wait for your other file to finish".
3. Heavy jobs per server process (GUARD_HEAVY_JOBS_PER_PROCESS). Conversions, OCR and analysis load
   whole files into memory; running too many at once is what runs a server out of memory.
   Extra jobs queue for up to GUARD_QUEUE_WAIT_SECONDS, then get 503 with Retry-After, which the
   website retries automatically. People wait a few seconds instead of the server falling over.

Counters live in this process. With REDIS_URL set (and the redis package installed) the
per-user rules are shared by every process and server, so limits hold however many servers run.
The per-process heavy-job cap is local on purpose: it protects each server's own memory.
"""
from __future__ import annotations

import asyncio
import logging
import os
import threading
import time
from collections import defaultdict, deque
from typing import Deque, Dict, Optional, Tuple

logger = logging.getLogger(__name__)


def _env_int(name: str, default: int) -> int:
    try:
        return int((os.getenv(name) or "").strip() or default)
    except ValueError:
        return default


def _env_float(name: str, default: float) -> float:
    try:
        return float((os.getenv(name) or "").strip() or default)
    except ValueError:
        return default


def guard_enabled() -> bool:
    return (os.getenv("SERVER_GUARD") or "on").strip().lower() not in ("off", "0", "false", "no")


def heavy_jobs_per_process() -> int:
    return max(1, _env_int("GUARD_HEAVY_JOBS_PER_PROCESS", 2))


def queue_wait_seconds() -> float:
    return max(0.0, _env_float("GUARD_QUEUE_WAIT_SECONDS", 25.0))


def anonymous_requests_per_minute() -> int:
    return max(1, _env_int("GUARD_ANON_REQUESTS_PER_MINUTE", 300))


class GuardRejection(Exception):
    def __init__(self, status_code: int, detail: str, retry_after: int):
        super().__init__(detail)
        self.status_code = status_code
        self.detail = detail
        self.retry_after = retry_after


# ---------------------------------------------------------------------------
# Shared store: Redis when configured, else this process's memory
# ---------------------------------------------------------------------------

class _MemoryStore:
    def __init__(self) -> None:
        self._lock = threading.Lock()
        self._hits: Dict[str, Deque[float]] = defaultdict(deque)
        self._active: Dict[str, int] = defaultdict(int)

    def hit(self, key: str, window: float, now: float) -> int:
        with self._lock:
            q = self._hits[key]
            while q and q[0] <= now - window:
                q.popleft()
            q.append(now)
            return len(q)

    def oldest_hit(self, key: str) -> Optional[float]:
        with self._lock:
            q = self._hits.get(key)
            return q[0] if q else None

    def try_acquire(self, key: str, limit: int) -> bool:
        with self._lock:
            if self._active[key] >= limit:
                return False
            self._active[key] += 1
            return True

    def release(self, key: str) -> None:
        with self._lock:
            if self._active.get(key, 0) > 0:
                self._active[key] -= 1
            if self._active.get(key) == 0:
                self._active.pop(key, None)

    def active(self, key: str) -> int:
        with self._lock:
            return self._active.get(key, 0)

    def reset(self) -> None:
        with self._lock:
            self._hits.clear()
            self._active.clear()


class _RedisStore:
    """Fixed one-minute windows and job counters in Redis, shared by every server."""

    JOB_TTL_SECONDS = 15 * 60  # a crashed server's job slots free themselves after this

    def __init__(self, client) -> None:
        self._r = client

    def hit(self, key: str, window: float, now: float) -> int:
        bucket = int(now // window)
        k = f"meldra:rl:{key}:{bucket}"
        pipe = self._r.pipeline()
        pipe.incr(k)
        pipe.expire(k, int(window) + 5)
        count, _ = pipe.execute()
        return int(count)

    def oldest_hit(self, key: str) -> Optional[float]:
        return None

    def try_acquire(self, key: str, limit: int) -> bool:
        k = f"meldra:jobs:{key}"
        n = int(self._r.incr(k))
        self._r.expire(k, self.JOB_TTL_SECONDS)
        if n > limit:
            self._r.decr(k)
            return False
        return True

    def release(self, key: str) -> None:
        k = f"meldra:jobs:{key}"
        if int(self._r.decr(k)) < 0:
            self._r.set(k, 0, ex=self.JOB_TTL_SECONDS)

    def active(self, key: str) -> int:
        return int(self._r.get(f"meldra:jobs:{key}") or 0)

    def reset(self) -> None:
        pass


def _make_store():
    url = (os.getenv("REDIS_URL") or "").strip()
    if url:
        try:
            import redis  # type: ignore

            client = redis.Redis.from_url(url, socket_timeout=1.0, socket_connect_timeout=1.0)
            client.ping()
            logger.info("server_guard: using Redis for shared limits")
            return _RedisStore(client)
        except Exception as e:  # never stop the server because Redis is unavailable
            logger.warning("server_guard: Redis unavailable (%s); using in-process limits", e)
    return _MemoryStore()


_store = None
_store_lock = threading.Lock()


def store():
    global _store
    if _store is None:
        with _store_lock:
            if _store is None:
                _store = _make_store()
    return _store


def reset_for_tests() -> None:
    global _store, _heavy_semaphore, _heavy_loop
    _store = _MemoryStore()
    _heavy_semaphore = None
    _heavy_loop = None


# ---------------------------------------------------------------------------
# Rules
# ---------------------------------------------------------------------------

def check_rate(identity: str, per_minute: int, now: Optional[float] = None) -> None:
    """Count one request; raise GuardRejection(429) when over the per-minute limit (-1 = no limit)."""
    if per_minute is None or per_minute < 0:
        return
    now = time.time() if now is None else now
    count = store().hit(identity, 60.0, now)
    if count > per_minute:
        oldest = store().oldest_hit(identity)
        retry = max(1, int(60 - (now - oldest))) if oldest else 60
        raise GuardRejection(
            429,
            f"Too many requests: your plan allows {per_minute} a minute. Try again in {retry} seconds.",
            retry,
        )


_heavy_semaphore: Optional[asyncio.Semaphore] = None
_heavy_loop = None


def _semaphore() -> asyncio.Semaphore:
    global _heavy_semaphore, _heavy_loop
    loop = asyncio.get_running_loop()
    if _heavy_semaphore is None or _heavy_loop is not loop:
        _heavy_semaphore = asyncio.Semaphore(heavy_jobs_per_process())
        _heavy_loop = loop
    return _heavy_semaphore


class HeavyJob:
    """
    async with HeavyJob(identity, concurrent_limit): run one file job.

    Waits (up to the queue time) for a free slot for this user and for this server.
    """

    def __init__(self, identity: str, concurrent_limit: int, wait_seconds: Optional[float] = None):
        self.identity = identity
        self.limit = concurrent_limit
        self.wait = queue_wait_seconds() if wait_seconds is None else wait_seconds
        self._user_slot = False
        self._server_slot = False

    async def __aenter__(self) -> "HeavyJob":
        deadline = time.monotonic() + self.wait
        if self.limit is not None and self.limit >= 0:
            while not store().try_acquire(self.identity, max(1, self.limit)):
                if time.monotonic() >= deadline:
                    raise GuardRejection(
                        429,
                        f"You already have {self.limit} file(s) processing, the most your plan runs at once. "
                        "Wait for one to finish, then try again.",
                        10,
                    )
                await asyncio.sleep(0.25)
            self._user_slot = True
        sem = _semaphore()
        remaining = max(0.0, deadline - time.monotonic())
        try:
            await asyncio.wait_for(sem.acquire(), timeout=remaining if remaining > 0 else 0.001)
        except asyncio.TimeoutError:
            self._release_user()
            raise GuardRejection(
                503,
                "Meldra is busy processing other files. Your file was not processed; please try again in a few seconds.",
                5,
            )
        self._server_slot = True
        return self

    def _release_user(self) -> None:
        if self._user_slot:
            try:
                store().release(self.identity)
            except Exception:
                pass
            self._user_slot = False

    async def __aexit__(self, *exc) -> None:
        if self._server_slot:
            _semaphore().release()
            self._server_slot = False
        self._release_user()


def server_load() -> Dict[str, int]:
    sem = _heavy_semaphore
    capacity = heavy_jobs_per_process()
    free = getattr(sem, "_value", capacity) if sem is not None else capacity
    return {"heavy_jobs_capacity": capacity, "heavy_jobs_running": capacity - int(free)}


# ---------------------------------------------------------------------------
# Plan lookup for the middleware (cached so most requests skip the database)
# ---------------------------------------------------------------------------

_limits_cache: Dict[str, Tuple[float, Dict[str, int]]] = {}
_limits_cache_lock = threading.Lock()
LIMITS_CACHE_SECONDS = 60.0


def cached_limits(email: str, loader) -> Dict[str, int]:
    now = time.monotonic()
    with _limits_cache_lock:
        hit = _limits_cache.get(email)
        if hit and hit[0] > now:
            return hit[1]
    limits = loader(email)
    with _limits_cache_lock:
        if len(_limits_cache) > 50_000:
            _limits_cache.clear()
        _limits_cache[email] = (now + LIMITS_CACHE_SECONDS, limits)
    return limits


def forget_limits(email: Optional[str] = None) -> None:
    with _limits_cache_lock:
        if email is None:
            _limits_cache.clear()
        else:
            _limits_cache.pop(email.strip().lower(), None)


__all__ = [
    "GuardRejection",
    "HeavyJob",
    "guard_enabled",
    "check_rate",
    "heavy_jobs_per_process",
    "queue_wait_seconds",
    "anonymous_requests_per_minute",
    "server_load",
    "cached_limits",
    "forget_limits",
    "store",
    "reset_for_tests",
]
