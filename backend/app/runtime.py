"""
How many web worker processes to start. Each one uses about 300 MB at idle and more while converting
files, so starting more workers than the container's memory allows gets the service killed on start-up.
WEB_CONCURRENCY, when set, always wins.
"""
import os

MB = 1024 * 1024
MEMORY_PER_WORKER = 700 * MB  # idle use plus headroom for a conversion in progress
MAX_WORKERS = 2

_LIMIT_FILES = (
    "/sys/fs/cgroup/memory.max",  # cgroup v2
    "/sys/fs/cgroup/memory/memory.limit_in_bytes",  # cgroup v1
)


def memory_limit_bytes(paths=_LIMIT_FILES):
    """The container's memory limit, or None when there is none (or it can't be read)."""
    for path in paths:
        try:
            with open(path) as f:
                raw = f.read().strip()
        except OSError:
            continue
        if raw.isdigit() and int(raw) < 1 << 60:  # cgroup v1 reports "no limit" as a huge number
            return int(raw)
        return None
    return None


def default_workers(limit=None, env=None):
    env = os.environ if env is None else env
    configured = (env.get("WEB_CONCURRENCY") or "").strip()
    if configured.isdigit() and int(configured) > 0:
        return int(configured)
    limit = memory_limit_bytes() if limit is None else limit
    if not limit:
        return MAX_WORKERS
    return max(1, min(MAX_WORKERS, limit // MEMORY_PER_WORKER))


if __name__ == "__main__":
    print(default_workers())
