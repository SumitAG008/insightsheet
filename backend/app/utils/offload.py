"""
Keep slow work off the server's event loop.

An `async def` endpoint runs on the single event loop that serves every request,
so CPU work or a blocking call inside it stalls all users until it finishes.
Endpoints that do heavy work are plain `def` functions (FastAPI runs those in a
thread pool); these helpers cover the cases in between.
"""
import asyncio
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


__all__ = ["run_coro", "in_thread"]
