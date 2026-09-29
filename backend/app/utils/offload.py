"""
Keep slow work off the server's event loop.

An `async def` endpoint runs on the single event loop that serves every request,
so CPU work or a blocking call inside it stalls all users until it finishes.
Endpoints that do heavy work are plain `def` functions (FastAPI runs those in a
thread pool); these helpers cover the cases in between.
"""
import asyncio
import ctypes
import ctypes.util
import gc
from typing import Any, Coroutine


def run_coro(coro: Coroutine[Any, Any, Any]) -> Any:
    """Run a coroutine to completion from a sync endpoint (a worker thread with no event loop)."""
    return asyncio.run(coro)


async def in_thread(coro: Coroutine[Any, Any, Any]) -> Any:
    """
    Await a coroutine that does CPU or blocking work internally (an `async def` that
    rarely or never yields) on a worker thread, so the event loop stays free.
    """
    return await asyncio.to_thread(asyncio.run, coro)


def _load_libc():
    try:
        name = ctypes.util.find_library("c")
        return ctypes.CDLL(name) if name else None
    except OSError:
        return None


_libc = _load_libc()


def release_memory() -> None:
    """
    Give memory freed by a finished file conversion back to the operating system. Python frees the
    objects, but the C allocator tends to keep the pages for the process, so after a few large files
    the server would look (and be billed and limited) as if it still held them.
    """
    gc.collect()
    trim = getattr(_libc, "malloc_trim", None) if _libc is not None else None
    if trim is not None:  # glibc (Linux containers); a no-op elsewhere
        trim(0)


__all__ = ["run_coro", "in_thread", "release_memory"]
