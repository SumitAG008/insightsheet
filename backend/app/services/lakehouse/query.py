"""
Aggregation over lakehouse tables for Unified Reporting.

The browser engine decides *what* to compute (engine.js); for sources stored in
the lakehouse it sends one request per series and gets back, per group (and per
split value), the raw accumulators it would have built from rows itself:
  n (rows), cnt (rows with a number), sum, min, max.
Derived ratios, rolling windows, period comparisons, share of total, top-N and
sorting then run in the browser exactly as for browser sources, so both paths
give identical answers.

Execution: Iceberg scan (column projection, and month-range pruning using the
date column's file statistics) → Apache Arrow record batches → DuckDB SQL.
Identifiers come from the stored profile, never from the request; filter values
are bound parameters.
"""
import re
from typing import Any, Dict, List, Optional, Tuple

import duckdb
import pyarrow as pa

from .profile import num_expr, q
from .store import LakehouseError, _limit, load_for_query

OPS = ("eq", "neq", "gte", "lte")
MAX_SERIES = 12
MAX_GROUPS = 50_000
MONTH_RE = re.compile(r"^\d{4}-\d{2}$")


def _col_map(prof: Dict[str, Any]) -> Dict[str, Dict[str, Any]]:
    return {c["key"]: c for c in prof.get("columns", []) if c.get("role") != "ignore"}


def _month_bounds(filters: List[Dict[str, Any]]) -> Tuple[Optional[str], Optional[str]]:
    lo = hi = None
    for f in filters:
        if f.get("dim") != "month" or not MONTH_RE.match(str(f.get("value", ""))):
            continue
        v = str(f["value"])
        if f["op"] in ("gte", "eq"):
            lo = max(lo, v) if lo else v
        if f["op"] in ("lte", "eq"):
            hi = min(hi, v) if hi else v
    return lo, hi


def _next_month(ym: str) -> str:
    y, m = int(ym[:4]), int(ym[5:7])
    return f"{y + (m == 12)}-{1 if m == 12 else m + 1:02d}"


def _scan(tbl, fields: List[str], date_phys: Optional[str], bounds: Tuple[Optional[str], Optional[str]]):
    """Arrow data for the needed columns; month filters prune data files by their date statistics."""
    from pyiceberg.expressions import And, AlwaysTrue, GreaterThanOrEqual, LessThan

    row_filter = AlwaysTrue()
    lo, hi = bounds
    if date_phys and (lo or hi):
        if lo:
            row_filter = And(row_filter, GreaterThanOrEqual(date_phys, f"{lo}-01"))
        if hi:
            row_filter = And(row_filter, LessThan(date_phys, f"{_next_month(hi)}-01"))
    scan = tbl.scan(row_filter=row_filter, selected_fields=tuple(dict.fromkeys(fields)) or ("*",))
    return scan.to_arrow_batch_reader()  # streamed into DuckDB: memory follows the groups, not the table


def _label(expr: str) -> str:
    """Same as labelOf() in the browser: empty or missing → '(blank)'."""
    return f"(CASE WHEN {expr} IS NULL OR CAST({expr} AS VARCHAR) = '' THEN '(blank)' ELSE CAST({expr} AS VARCHAR) END)"


def _filter_sql(expr: str, op: str, params: List[Any], value: str) -> str:
    """Same as pass() in the browser: text compare ignoring case; numbers compare as numbers when both sides are numbers."""
    text = f"coalesce(CAST({expr} AS VARCHAR), '')"
    if op in ("eq", "neq"):
        params.append(value.lower())
        return f"(lower({text}) {'=' if op == 'eq' else '<>'} ?)"
    cmp = ">=" if op == "gte" else "<="
    params.extend([value, value, value.lower()])
    return (f"(CASE WHEN TRY_CAST({text} AS DOUBLE) IS NOT NULL AND {text} <> '' AND TRY_CAST(? AS DOUBLE) IS NOT NULL "
            f"THEN TRY_CAST({text} AS DOUBLE) {cmp} TRY_CAST(? AS DOUBLE) ELSE lower({text}) {cmp} ? END)")


def aggregate_series(tenant: str, s: Dict[str, Any], con) -> Dict[str, Any]:
    tbl, prof = load_for_query(tenant, str(s.get("table") or ""))
    cols = _col_map(prof)
    date_col = next((c for c in prof.get("columns", []) if c.get("type") == "date" and c.get("role") != "ignore"), None)
    lookups = s.get("lookups") if isinstance(s.get("lookups"), list) else []
    filters = [f for f in (s.get("filters") or []) if isinstance(f, dict) and f.get("op") in OPS][:16]
    group_by, split_by = s.get("group_by"), s.get("split_by")

    fields: List[str] = []
    joins: List[str] = []
    dim_expr: Dict[str, str] = {}
    lookup_tables: List[Tuple[str, Any]] = []

    def own(key: str) -> Optional[str]:
        c = cols.get(key)
        if not c or c.get("type") == "date":
            return None
        fields.append(c["phys"])
        return f"src.{q(c['phys'])}"

    # Borrowed columns: looked up in another lakehouse table through a key (first match per key).
    for i, lk in enumerate(lookups[:4]):
        fc = cols.get(lk.get("from_col"))
        if not fc:
            raise LakehouseError("A link uses a column that no longer exists.")
        ttbl, tprof = load_for_query(tenant, str(lk.get("table") or ""))
        tcols = _col_map(tprof)
        tc = tcols.get(lk.get("to_col"))
        dims = [d for d in (lk.get("dims") or []) if d in tcols and tcols[d].get("type") != "date"]
        if not tc or not dims:
            continue
        arrow = _scan(ttbl, [tc["phys"]] + [tcols[d]["phys"] for d in dims], None, (None, None))
        lookup_tables.append((f"lk{i}", arrow))
        picks = ", ".join(f"first({q(tcols[d]['phys'])}) AS {q('d_' + d)}" for d in dims)
        joins.append(
            f"LEFT JOIN (SELECT lower(trim(CAST({q(tc['phys'])} AS VARCHAR))) AS __k, {picks} FROM lk{i} "
            f"WHERE {q(tc['phys'])} IS NOT NULL GROUP BY 1) l{i} ON lower(trim(CAST(src.{q(fc['phys'])} AS VARCHAR))) = l{i}.__k"
        )
        fields.append(fc["phys"])
        for d in dims:
            dim_expr.setdefault(d, f"l{i}.{q('d_' + d)}")

    def expr_of(dim: str) -> str:
        if dim == "month":
            if not date_col:
                raise LakehouseError("This source has no date column for month.")
            fields.append(date_col["phys"])
            return f"strftime(src.{q(date_col['phys'])}, '%Y-%m')"
        e = own(dim)
        if e:
            return e
        if dim in dim_expr:
            return dim_expr[dim]
        raise LakehouseError(f"Unknown column: {dim}")

    params: List[Any] = []
    where = [_filter_sql(expr_of(f["dim"]), f["op"], params, str(f.get("value", ""))[:200]) for f in filters]
    g = _label(expr_of(group_by)) if group_by else "'All'"
    sp = _label(expr_of(split_by)) if split_by else "NULL"

    measure = s.get("measure")
    m_sql = "NULL"
    if measure:
        mc = cols.get(measure)
        if not mc or mc.get("role") != "measure":
            raise LakehouseError(f"Unknown number column: {measure}")
        fields.append(mc["phys"])
        src_type = next((f.type for f in tbl.schema().as_arrow() if f.name == mc["phys"]), None)
        m_sql = f"src.{q(mc['phys'])}" if src_type is not None and (pa.types.is_floating(src_type) or pa.types.is_integer(src_type) or pa.types.is_decimal(src_type)) \
            else num_expr(f"src.{q(mc['phys'])}")
        m_sql = f"CAST({m_sql} AS DOUBLE)"

    bounds = _month_bounds(filters)
    data = _scan(tbl, fields or [prof["columns"][0]["phys"]], date_col["phys"] if date_col else None, bounds)
    con.register("src", data)
    for name, arrow in lookup_tables:
        con.register(name, arrow)
    sql = (
        f"SELECT {g} AS g, {sp} AS s, count(*) AS n, count({m_sql}) AS cnt, sum({m_sql}) AS sum, min({m_sql}) AS min, max({m_sql}) AS max "
        f"FROM src {' '.join(joins)} {('WHERE ' + ' AND '.join(where)) if where else ''} GROUP BY 1, 2 LIMIT {MAX_GROUPS + 1}"
    )
    rows = con.execute(sql, params).fetchall()
    con.unregister("src")
    for name, _ in lookup_tables:
        con.unregister(name)
    out = [{"g": r[0], "s": r[1], "n": r[2], "cnt": r[3], "sum": r[4] or 0, "min": r[5], "max": r[6]} for r in rows[:MAX_GROUPS]]
    return {"groups": out, "rows": int(sum(r["n"] for r in out)), "truncated": len(rows) > MAX_GROUPS}


def aggregate(tenant: str, series: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    if not isinstance(series, list) or not series:
        raise LakehouseError("Nothing to calculate.")
    con = duckdb.connect()
    try:
        _limit(con)
        return [aggregate_series(tenant, s, con) for s in series[:MAX_SERIES]]
    finally:
        con.close()


# ---------------- link suggestions across lakehouse tables ----------------

KEY_RE = re.compile(r"(^id$|_id$|_code$|^code$|_no$|_number$|_key$|email)")


def suggest_links(tenant: str, tables: List[str]) -> List[Dict[str, Any]]:
    """Same idea as suggestRelationships() in the browser, computed over the full tables."""
    profs = {}
    for t in tables[:20]:
        try:
            profs[t] = load_for_query(tenant, t)
        except LakehouseError:
            continue
    con = duckdb.connect()
    distinct: Dict[Tuple[str, str], Any] = {}

    def values(t: str, c: Dict[str, Any]):
        k = (t, c["phys"])
        if k not in distinct:
            arrow = profs[t][0].scan(selected_fields=(c["phys"],)).to_arrow()
            con.register("v", arrow)
            distinct[k] = con.execute(
                f"SELECT count(*), count(DISTINCT lower(trim(CAST({q(c['phys'])} AS VARCHAR)))) FROM v WHERE {q(c['phys'])} IS NOT NULL"
            ).fetchone(), arrow
            con.unregister("v")
        return distinct[k]

    out = []
    parts = lambda k: [p for p in k.split("_") if len(p) > 2 and p not in ("num", "code", "key")]  # noqa: E731
    try:
        for b, (btbl, bprof) in profs.items():
            for bc in bprof.get("columns", []):
                if bc.get("role") == "ignore" or not KEY_RE.search(bc["key"]):
                    continue
                (bn, bd), barrow = values(b, bc)
                if bd < 2 or bd < bn * 0.98:
                    continue
                for a, (atbl, aprof) in profs.items():
                    if a == b:
                        continue
                    for ac in aprof.get("columns", []):
                        if ac.get("role") == "ignore":
                            continue
                        name_match = ac["key"] == bc["key"] or re.sub(r"_id$", "", ac["key"]) == re.sub(r"_id$", "", bc["key"])
                        part_match = bool(KEY_RE.search(ac["key"])) and (any(p in bc["key"] for p in parts(ac["key"])) or any(p in ac["key"] for p in parts(bc["key"])))
                        if not name_match and not part_match:
                            continue
                        (_, ad), aarrow = values(a, ac)
                        if ad < 2:
                            continue
                        con.register("x", aarrow)
                        con.register("y", barrow)
                        hit = con.execute(
                            f"SELECT count(*) FROM (SELECT DISTINCT lower(trim(CAST({q(ac['phys'])} AS VARCHAR))) k FROM x WHERE {q(ac['phys'])} IS NOT NULL) a "
                            f"JOIN (SELECT DISTINCT lower(trim(CAST({q(bc['phys'])} AS VARCHAR))) k FROM y) b USING (k)"
                        ).fetchone()[0]
                        con.unregister("x")
                        con.unregister("y")
                        overlap = hit / ad
                        if overlap >= 0.6:
                            out.append({"from": {"table": a, "col": ac["key"]}, "to": {"table": b, "col": bc["key"]}, "overlap": overlap})
    finally:
        con.close()
    return sorted(out, key=lambda r: -r["overlap"])
