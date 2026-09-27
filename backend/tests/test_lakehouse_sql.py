"""
Customer SQL over lakehouse tables (the Query panel).

The fixture holds the sample sources, the SQL the browser generates for 20
answers and the numbers the browser engine gives (e2e/sql/make_fixture.mjs).
Running that SQL here, in DuckDB over Iceberg tables, must give the same
numbers. The rest checks the guard rails.
"""
import json
import math
import os
import re
import uuid

import pyarrow as pa
import pytest

from app.services.lakehouse import sql as lsql
from app.services.lakehouse import store

FIXTURE = os.path.join(os.path.dirname(__file__), "fixtures", "unified_sql.json")
POLARIS = os.environ.get("POLARIS_TEST_URI") if os.environ.get("POLARIS_TEST_CREDENTIAL") else None


@pytest.fixture(params=["sql"] + (["polaris"] if POLARIS else []))
def lake(request, tmp_path, monkeypatch):
    if request.param == "sql":
        monkeypatch.setenv("LAKEHOUSE_CATALOG", "sql")
        monkeypatch.setenv("LAKEHOUSE_WAREHOUSE", f"file://{tmp_path}/wh")
        monkeypatch.delenv("LAKEHOUSE_CATALOG_URI", raising=False)
    else:
        monkeypatch.setenv("LAKEHOUSE_CATALOG", "rest")
        monkeypatch.setenv("POLARIS_URI", POLARIS)
        monkeypatch.setenv("POLARIS_CREDENTIAL", os.environ["POLARIS_TEST_CREDENTIAL"])
        monkeypatch.setenv("POLARIS_WAREHOUSE", os.environ.get("POLARIS_TEST_WAREHOUSE", "meldra"))
        monkeypatch.setenv("POLARIS_ACCESS_DELEGATION", os.environ.get("POLARIS_TEST_DELEGATION", "none"))
    monkeypatch.setenv("LAKEHOUSE_NAMESPACE_PREFIX", f"sq{uuid.uuid4().hex[:6]}")
    store.reset_catalog()
    yield tmp_path
    for tenant in ("a@example.com", "b@example.com"):
        try:
            store.drop_all(tenant)
        except Exception:
            pass
    store.reset_catalog()


@pytest.fixture()
def sample(lake):
    """The sample sources stored for a@example.com; returns {source key: table}."""
    data = json.load(open(FIXTURE, encoding="utf-8"))
    tables = {}
    for s in data["sources"]:
        path = lake / f"{s['name']}.csv"
        path.write_text(s["csv"], encoding="utf-8")
        [src] = store.ingest_file("a@example.com", str(path), path.name, s["system"])
        tables[s["key"]] = src["table"]
    return tables, data["cases"]


def close(a, b):
    if b is None:
        return a is None
    return a is not None and math.isclose(a, b, rel_tol=1e-6, abs_tol=1e-6)


def test_generated_sql_gives_the_browser_numbers(sample):
    tables, cases = sample
    for case in cases:
        used = {k: t for k, t in tables.items() if k in case["sql"]}
        out = lsql.run_sql("a@example.com", case["sql"], used)
        cols, rows = out["columns"], out["rows"]
        expected = case["columns"]
        text_cols = [j for j, c in enumerate(cols) if c not in expected]
        if len(cols) == 3 and cols[2] not in expected:  # split: [label, split, value] → one series per split value
            lj, sj, vj = 0, 1, 2
            rolled = [re.search(r" \(\d+-mo rolling\)$", k) for k in expected]
            suffix = next((r.group(0) for r in rolled if r), "")
            got = {}
            for r in rows:
                got.setdefault(f"{r[sj]}{suffix}", {})[r[lj]] = r[vj]
            labels = list(dict.fromkeys(r[lj] for r in rows))
        else:
            lj = text_cols[0] if text_cols else None
            labels = [r[lj] for r in rows] if lj is not None else (["All"] if case["labels"] == ["All"] else [])
            got = {c: {(r[lj] if lj is not None else "All"): r[j] for r in rows} for j, c in enumerate(cols) if j != lj}
        assert labels == case["labels"], case["title"]
        assert sorted(got) == sorted(expected), case["title"]
        for name, values in expected.items():
            for label, want in zip(case["labels"], values):
                assert close(got[name].get(label), want), f"{case['title']}: {name} @ {label}: {got[name].get(label)} vs {want}\n{case['sql']}"


def test_tables_look_like_the_browser_tables(sample):
    tables, _ = sample
    out = lsql.run_sql("a@example.com", "select * from expenses limit 1", {"expenses": tables["expenses"]})
    assert "amount" in out["columns"] and "month" in out["columns"] and "department" not in out["columns"]
    row = dict(zip(out["columns"], out["rows"][0]))
    assert isinstance(row["amount"], float) and len(row["month"]) == 7


def test_only_one_select(lake):
    for bad, msg in [
        ("delete from x", "Only SELECT"),
        ("select 1; select 2", "one query"),
        ("copy (select 1) to '/tmp/x.csv'", "Only SELECT"),
        ("attach '/tmp/x.db'", "Only SELECT"),
        ("pragma database_list", "Only SELECT"),
        ("", "Write a SELECT"),
    ]:
        with pytest.raises(store.LakehouseError, match=msg):
            lsql.check_sql(bad)
    assert lsql.check_sql("select ';' as x;") == "select ';' as x"


def test_no_files_network_or_other_accounts(sample):
    tables, _ = sample
    one = {"sales_orders": tables["sales_orders"]}
    for q in [
        "select * from sales_orders, read_csv_auto('/etc/passwd')",
        "select * from sales_orders, read_parquet('https://example.com/x.parquet')",
        "select * from sales_orders, glob('/*')",
    ]:
        with pytest.raises(store.LakehouseError):
            lsql.run_sql("a@example.com", q, one)
    # The table exists, but in a@example.com's namespace: b@example.com cannot load it.
    with pytest.raises(store.LakehouseError, match="Unknown table"):
        lsql.run_sql("b@example.com", "select * from sales_orders", one)
    # Settings are locked before the query runs.
    with pytest.raises(store.LakehouseError):
        lsql.run_sql("a@example.com", "select * from sales_orders, (select set_config('enable_external_access', 'true'))", one)


def test_python_objects_cannot_be_read_by_name(sample):
    tables, _ = sample
    secret_table = pa.table({"x": [42]})  # noqa: F841 — a DuckDB replacement scan would find this by name
    with pytest.raises(store.LakehouseError, match="secret_table"):
        lsql.run_sql("a@example.com", "select * from sales_orders, secret_table", {"sales_orders": tables["sales_orders"]})


def test_row_and_time_limits(sample, monkeypatch):
    tables, _ = sample
    one = {"sales_orders": tables["sales_orders"]}
    out = lsql.run_sql("a@example.com", "select a.order_id from sales_orders a, sales_orders b limit 6000", one)
    assert len(out["rows"]) == lsql.MAX_ROWS and out["truncated"]
    monkeypatch.setenv("LAKEHOUSE_SQL_TIMEOUT", "0.5")
    with pytest.raises(store.LakehouseError, match="stopped"):
        lsql.run_sql("a@example.com", "select sum(a.amount * b.amount * c.amount * d.amount) from sales_orders a, sales_orders b, sales_orders c, sales_orders d", one)


def test_errors_are_explained(sample):
    tables, _ = sample
    with pytest.raises(store.LakehouseError, match="no_such_column"):
        lsql.run_sql("a@example.com", "select no_such_column from sales_orders", {"sales_orders": tables["sales_orders"]})
    with pytest.raises(store.LakehouseError, match="Name one of your sources"):
        lsql.run_sql("a@example.com", "select 1", {"sales_orders": tables["sales_orders"]})
