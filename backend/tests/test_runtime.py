from app.runtime import default_workers, memory_limit_bytes

MB = 1024 * 1024


def test_workers_follow_the_memory_limit():
    assert default_workers(limit=512 * MB, env={}) == 1
    assert default_workers(limit=1024 * MB, env={}) == 1
    assert default_workers(limit=2048 * MB, env={}) == 2
    assert default_workers(limit=8192 * MB, env={}) == 2


def test_web_concurrency_wins():
    assert default_workers(limit=512 * MB, env={"WEB_CONCURRENCY": "3"}) == 3
    assert default_workers(limit=512 * MB, env={"WEB_CONCURRENCY": "abc"}) == 1


def test_reading_the_limit(tmp_path):
    v2 = tmp_path / "memory.max"
    v2.write_text("536870912\n")
    assert memory_limit_bytes([str(v2)]) == 512 * MB
    v2.write_text("max\n")
    assert memory_limit_bytes([str(v2)]) is None
    assert memory_limit_bytes([str(tmp_path / "missing")]) is None
