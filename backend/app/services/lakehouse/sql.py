"""
Customer SQL over their own lakehouse tables (the Query panel in Unified Reporting).

Each source the query names becomes a table called like the source, with the
same columns the browser shows: its own column names, numbers as DOUBLE, text
as VARCHAR and "month" from its date column. The SQL Meldra generates for an
answer therefore runs here unchanged, and the customer can edit it.

Guard rails:
  - one read-only SELECT statement (checked by DuckDB's own parser);
  - only the signed-in account's tables are loaded, and only the ones named;
  - DuckDB file, network and extension access is switched off and the
    configuration locked before the query runs;
  - the query runs on its own thread, so DuckDB cannot find Python objects
    by name (replacement scans), with a time limit and a row limit;
  - memory is bounded and larger work spills to disk (store._limit).
"""
import datetime
import decimal
import os
import re
import threading
from typing import Any, Dict, List

import duckdb
import pyarrow as pa

from .profile import num_expr, q
from .query import _scan
from .store import LakehouseError, _limit, load_for_query

MAX_ROWS = 5000
MAX_TABLES = 12
MAX_SQL = 20_000
NAME_RE = re.compile(r"^[a-z_][a-z0-9_]{0,79}$")


def _timeout() -> float:
    return float(os.environ.get("LAKEHOUSE_SQL_TIMEOUT", "30"))


def _mentions(sql: str, word: str) -> bool:
    return re.search(rf'(^|[^a-z0-9_]){re.escape(word)}($|[^a-z0-9_])', sql) is not None


def check_sql(sql: Any) -> str:
    if not isinstance(sql, str) or not sql.strip():
        raise LakehouseError("Write a SELECT query first.")
    text = sql.strip().rstrip(";").strip()
    if len(text) > MAX_SQL:
        raise LakehouseError("That query is too long.")
    try:
        statements = duckdb.extract_statements(text)
    except Exception as e:
        raise LakehouseError(f"The query could not be read: {str(e)[:200]}")
    if len(statements) != 1:
        raise LakehouseError("Run one query at a time.")
    bare = re.sub(r"--[^\n]*|/\*.*?\*/", " ", text, flags=re.S).strip().lower()
    # PRAGMA and SHOW parse as SELECTs too; only plain queries are accepted.
    if statements[0].type != duckdb.StatementType.SELECT or not re.match(r"^(select|with)\b", bare):
        raise LakehouseError("Only SELECT queries can be run here (they read your data and never change it).")
    return text


def _load_table(con, tenant: str, name: str, table: str, sql_lower: str) -> None:
    """Materialise one source as a temp table shaped like the browser's table for it."""
    tbl, prof = load_for_query(tenant, table)
    cols = [c for c in prof.get("columns", []) if c.get("role") != "ignore"]
    arrow_types = {f.name: f.type for f in tbl.schema().as_arrow()}
    date_col = next((c for c in cols if c.get("type") == "date"), None)
    star = "*" in sql_lower
    parts: List[str] = []
    fields: List[str] = []
    for c in cols:
        if c["key"] == "month" and date_col:
            continue  # month comes from the date column, as in the browser
        if not star and not _mentions(sql_lower, c["key"]):
            continue  # only read the columns the query uses
        phys = c["phys"]
        fields.append(phys)
        t = arrow_types.get(phys)
        if c.get("role") == "measure":
            numeric = t is not None and (pa.types.is_floating(t) or pa.types.is_integer(t) or pa.types.is_decimal(t))
            expr = f"CAST({q(phys)} AS DOUBLE)" if numeric else f"CAST({num_expr(q(phys))} AS DOUBLE)"
        else:
            expr = f"CAST({q(phys)} AS VARCHAR)"
        parts.append(f"{expr} AS {q(c['key'])}")
    if date_col and (star or _mentions(sql_lower, "month")):
        fields.append(date_col["phys"])
        parts.append(f"strftime({q(date_col['phys'])}, '%Y-%m') AS month")
    if not parts:
        first = cols[0] if cols else prof["columns"][0]
        fields.append(first["phys"])
        parts.append(f"CAST({q(first['phys'])} AS VARCHAR) AS {q(first['key'])}")
    con.register("lake_src", _scan(tbl, fields, None, (None, None)))
    try:
        con.execute(f"CREATE TEMP TABLE {q(name)} AS SELECT {', '.join(parts)} FROM lake_src")
    finally:
        con.unregister("lake_src")


def _cell(v: Any) -> Any:
    if isinstance(v, decimal.Decimal):
        return float(v)
    if isinstance(v, (datetime.date, datetime.datetime, datetime.time)):
        return v.isoformat()
    if isinstance(v, (bytes, bytearray)):
        return v.hex()
    if isinstance(v, (list, dict, tuple)):
        return str(v)
    return v


def _execute(con, sql: str, out: Dict[str, Any]) -> None:
    """Runs on its own thread: nothing on this stack can be scanned as a table."""
    try:
        cur = con.execute(sql)
        out["columns"] = [d[0] for d in cur.description or []]
        out["rows"] = cur.fetchmany(MAX_ROWS + 1)
    except Exception as e:  # reported to the customer as the database's own message
        out["error"] = str(e).split("\n")[0][:300]


def run_sql(tenant: str, sql: Any, tables: Any) -> Dict[str, Any]:
    text = check_sql(sql)
    if not isinstance(tables, dict) or not tables:
        raise LakehouseError("Name one of your sources in FROM.")
    lower = text.lower()
    wanted = {str(k): str(v) for k, v in tables.items() if NAME_RE.match(str(k)) and _mentions(lower, str(k))}
    if not wanted:
        raise LakehouseError("Name one of your sources in FROM.")
    if len(wanted) > MAX_TABLES:
        raise LakehouseError(f"A query can use up to {MAX_TABLES} sources.")

    con = duckdb.connect()
    try:
        _limit(con)
        for name, table in wanted.items():
            _load_table(con, tenant, name, table, lower)
        con.execute("SET enable_external_access = false")
        con.execute("SET lock_configuration = true")
        out: Dict[str, Any] = {}
        th = threading.Thread(target=_execute, args=(con, text, out), daemon=True)
        th.start()
        th.join(_timeout())
        if th.is_alive():
            con.interrupt()
            th.join(5)
            raise LakehouseError(f"The query took longer than {int(_timeout())} seconds and was stopped.")
        if "error" in out:
            raise LakehouseError(out["error"])
        rows = out["rows"]
        return {
            "columns": out["columns"],
            "rows": [[_cell(v) for v in r] for r in rows[:MAX_ROWS]],
            "truncated": len(rows) > MAX_ROWS,
        }
    finally:
        con.close()
