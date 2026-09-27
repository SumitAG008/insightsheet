import pytest

from app.services.db_connection_service import DatabaseConnectionService, validate_read_only_query


@pytest.mark.parametrize("q", [
    "SELECT * FROM employees",
    "select id, name from t where note = 'please delete me';",
    "WITH x AS (SELECT 1 AS a) SELECT a FROM x",
    "-- monthly spend\nSELECT dept, SUM(amount) FROM spend GROUP BY dept",
    'SELECT "update" FROM t',
    "SELECT REPLACE(name, 'a', 'b') AS name, comment, load FROM t",
])
def test_accepts_single_read_only_statements(q):
    assert validate_read_only_query(q).upper().lstrip("-").strip()


@pytest.mark.parametrize("q,why", [
    ("SELECT 1; DROP TABLE employees", "one statement"),
    ("DELETE FROM employees", "Only SELECT"),
    ("WITH d AS (DELETE FROM t RETURNING *) SELECT * FROM d", "DELETE"),
    ("SELECT * INTO backup FROM employees", "INTO"),
    ("SELECT pg_sleep(1); UPDATE t SET a = 1", "one statement"),
    ("  ", "empty"),
])
def test_rejects_writes_and_multiple_statements(q, why):
    with pytest.raises(ValueError, match=why):
        validate_read_only_query(q)


def test_row_cap_and_truncation_flag():
    res = DatabaseConnectionService.test_connection("sqlite", {"filePath": ":memory:"})
    cid = res["connectionId"]
    try:
        conn = __import__("app.services.db_connection_service", fromlist=["_connection_pool"])._connection_pool[cid]["connection"]
        conn.execute("CREATE TABLE t (n INTEGER)")
        conn.executemany("INSERT INTO t VALUES (?)", [(i,) for i in range(50)])
        out = DatabaseConnectionService.execute_query(cid, "sqlite", "SELECT n FROM t", max_rows=10)
        assert out["success"] and out["rowCount"] == 10 and out["truncated"] is True
        blocked = DatabaseConnectionService.execute_query(cid, "sqlite", "SELECT 1; DELETE FROM t")
        assert blocked["success"] is False
        assert DatabaseConnectionService.execute_query(cid, "sqlite", "SELECT COUNT(*) AS c FROM t")["data"][0]["c"] == 50
    finally:
        DatabaseConnectionService.disconnect(cid, "sqlite")
