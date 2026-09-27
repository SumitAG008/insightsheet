"""
Column profiling and type normalisation for lakehouse ingest.

Mirrors the browser's rules (src/lib/unifiedReporting/model.js profileColumns /
parseNumber / toMonth) so a table answers the same way whether it lives in the
browser or in the lakehouse:
  - numbers written with currency symbols, thousands separators or (brackets)
    become DOUBLE measures unless the column name looks like an ID/code/year;
  - date-like text (ISO, dd/mm/yyyy with month-first fallback, …) becomes DATE;
  - everything else stays as it came (text dimensions keep their exact text).

The decision is made once on a sample; every batch is then converted with the
same DuckDB SQL, so types are consistent across a multi-gigabyte file.
"""
import re
from typing import Any, Dict, List, Optional, Tuple

import pyarrow as pa

MONEY_RE = re.compile(r"amount|revenue|sales|cost|salary|salaries|price|spend|value|total|fee|budget|profit|margin|income|expense|invoice|pay|gbp|usd|eur")
ID_RE = re.compile(r"(^id$|_id$|^id_|_code$|^code$|_no$|_number$|^year$|zip|postcode|phone)")
NUM_PATTERN = r"^[-+(]?\s*[£$€¥₹]?\s*-?[\d,]*\.?\d+\s*[)%]?$"
CURRENCY_RE = re.compile(r"[£$€¥₹]")
DATE_FORMATS = ["%d/%m/%Y", "%m/%d/%Y", "%d/%m/%y", "%m/%d/%y", "%d.%m.%Y", "%d-%m-%Y", "%Y/%m/%d", "%Y-%m"]
SAMPLE_ROWS = 50_000


CURRENCY_CODES = {"gbp": "£", "usd": "$", "eur": "€", "jpy": "¥", "inr": "₹"}


def currency_from_name(name: Any) -> Optional[str]:
    """A currency named in the header: "Budget (£)", "amount_gbp", "Cost USD" (as currencyFromName in the browser)."""
    n = str(name or "")
    sym = CURRENCY_RE.search(n)
    if sym:
        return sym.group(0)
    code = re.search(r"(?:^|[^a-z])(gbp|usd|eur|jpy|inr)(?:$|[^a-z])", n.lower())
    return CURRENCY_CODES[code.group(1)] if code else None


def to_key(name: Any) -> str:
    """Same as toKey() in the browser: lower snake case, % → pct."""
    s = str(name if name is not None else "").strip().lower().replace("%", " pct")
    s = re.sub(r"[^a-z0-9]+", "_", s).strip("_")
    return s or "column"


def unique_keys(names: List[str]) -> List[str]:
    used, out = set(), []
    for n in names:
        k = to_key(n)
        while k in used:
            k = f"{k}_2"
        used.add(k)
        out.append(k)
    return out


def q(ident: str) -> str:
    """Quote a DuckDB identifier."""
    return '"' + str(ident).replace('"', '""') + '"'


def num_expr(col: str) -> str:
    """Text → DOUBLE with the browser's parseNumber rules; NULL when it isn't a number."""
    c = f"trim(CAST({col} AS VARCHAR))"
    neg = f"(regexp_matches({c}, '^\\(.*\\)$') OR regexp_matches({c}, '^[£$€¥₹\\s+]*-'))"
    val = f"TRY_CAST(NULLIF(regexp_replace({c}, '[^0-9.]', '', 'g'), '') AS DOUBLE)"
    return f"(CASE WHEN regexp_full_match({c}, '{NUM_PATTERN}') THEN (CASE WHEN {neg} THEN -1 ELSE 1 END) * {val} END)"


def date_expr(col: str) -> str:
    """Text → DATE: ISO first, then day-first, then month-first (as the browser does)."""
    c = f"trim(CAST({col} AS VARCHAR))"
    tries = [f"TRY_CAST({c} AS TIMESTAMP)"] + [f"try_strptime({c}, '{f}')" for f in DATE_FORMATS]
    return f"CAST(COALESCE({', '.join(tries)}) AS DATE)"


def profile_sample(con, rel_name: str, schema: pa.Schema, names: List[str], keys: List[str]) -> List[Dict[str, Any]]:
    """Decide type, role and unit for each column from a sample registered as rel_name."""
    cols = []
    for field, name, key in zip(schema, names, keys):
        src = q(field.name)
        t = field.type
        currency = None
        if pa.types.is_integer(t) or pa.types.is_floating(t) or pa.types.is_decimal(t):
            kind = "number"
        elif pa.types.is_timestamp(t) or pa.types.is_date(t):
            kind = "date"
        elif pa.types.is_string(t) or pa.types.is_large_string(t) or pa.types.is_null(t):
            c = f"trim(CAST({src} AS VARCHAR))"
            n, nums, dates, non_num = con.execute(
                f"SELECT count(*) FILTER (WHERE {c} <> ''),"
                f" count(*) FILTER (WHERE {c} <> '' AND {num_expr(src)} IS NOT NULL),"
                f" count(*) FILTER (WHERE {c} <> '' AND {date_expr(src)} IS NOT NULL),"
                f" count(*) FILTER (WHERE {c} <> '' AND {date_expr(src)} IS NOT NULL AND {num_expr(src)} IS NULL)"
                f" FROM {rel_name}"
            ).fetchone()
            n = n or 0
            kind = "text"
            if n and dates / n >= 0.9 and non_num > 0:
                kind = "date"
            elif n and nums / n >= 0.9:
                kind = "number"
            if kind == "number":
                sample = con.execute(f"SELECT string_agg(v, '') FROM (SELECT {c} AS v FROM {rel_name} WHERE {c} <> '' LIMIT 300)").fetchone()[0] or ""
                m = CURRENCY_RE.search(sample)
                currency = m.group(0) if m else None
        else:
            kind = "text"
        if kind == "number" and not currency:
            currency = currency_from_name(name)
        role = "measure" if kind == "number" and not ID_RE.search(key) else "dimension"
        unit = None
        if role == "measure":
            unit = "money" if currency or MONEY_RE.search(key) else "days" if re.search(r"days?$|^days_", key) else "number"
        cols.append({"name": name, "key": key, "phys": key, "type": kind, "role": role, "unit": unit, "currency": currency,
                     "source_type": str(t)})
    return cols


def select_sql(schema: pa.Schema, columns: List[Dict[str, Any]], rel_name: str) -> str:
    """One SELECT that converts a raw batch to the table's typed columns."""
    parts = []
    for field, c in zip(schema, columns):
        src = q(field.name)
        t = field.type
        textual = pa.types.is_string(t) or pa.types.is_large_string(t) or pa.types.is_null(t)
        if c["type"] == "date":
            expr = date_expr(src) if textual else f"CAST({src} AS DATE)"
        elif c["type"] == "number" and c["role"] == "measure":
            expr = num_expr(src) if textual else f"CAST({src} AS DOUBLE)"
        elif pa.types.is_null(t):
            expr = f"CAST({src} AS VARCHAR)"
        elif textual:
            expr = f"CAST({src} AS VARCHAR)"
        else:
            expr = src  # typed numbers used as dimensions (IDs, years) keep their type
        parts.append(f"{expr} AS {q(c['phys'])}")
    return f"SELECT {', '.join(parts)} FROM {rel_name}"


def summarize(con, reader_for, columns: List[Dict[str, Any]], top: int = 200) -> Tuple[Dict[str, Any], Optional[List[str]]]:
    """
    Known values per dimension (most frequent first, with the distinct count) and the month range of the
    date column. reader_for(phys) returns an Arrow record-batch stream of one column, so memory stays at
    one column's groups, not the table.
    """
    values: Dict[str, Any] = {}
    for c in columns:
        if c["role"] != "dimension" or c["type"] == "date":
            continue
        col = q(c["phys"])
        label = f"CAST({col} AS VARCHAR)"
        con.register("one", reader_for(c["phys"]))
        rows = con.execute(
            f"SELECT v, n, count(*) OVER () FROM (SELECT {label} v, count(*) n FROM one WHERE {col} IS NOT NULL AND {label} <> '' GROUP BY 1) "
            f"ORDER BY n DESC, v LIMIT {top}"
        ).fetchall()
        con.unregister("one")
        values[c["key"]] = {"top": [r[0] for r in rows], "distinct": int(rows[0][2]) if rows else 0}
    date_col = next((c for c in columns if c["type"] == "date"), None)
    month_range = None
    if date_col:
        con.register("one", reader_for(date_col["phys"]))
        lo, hi = con.execute(f"SELECT strftime(min({q(date_col['phys'])}), '%Y-%m'), strftime(max({q(date_col['phys'])}), '%Y-%m') FROM one").fetchone()
        con.unregister("one")
        month_range = [lo, hi] if lo else None
    return values, month_range
