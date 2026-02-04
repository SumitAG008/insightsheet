import io
import json
import logging
import os
import re
import time
from dataclasses import dataclass
from typing import Any, Dict, List, Optional, Tuple

logger = logging.getLogger(__name__)


_IDENTIFIER_RE = re.compile(r"^[A-Za-z_][A-Za-z0-9_]*$")


def _qident(name: str) -> str:
    s = (name or "").strip()
    if not s:
        raise ValueError("Empty identifier")
    if _IDENTIFIER_RE.match(s):
        return f'"{s}"'
    s = s.replace('"', '""')
    return f'"{s}"'


def _as_bool(v: Any, default: bool = False) -> bool:
    if v is None:
        return default
    if isinstance(v, bool):
        return v
    if isinstance(v, (int, float)):
        return bool(v)
    if isinstance(v, str):
        return v.strip().lower() in ("1", "true", "yes", "y", "on")
    return default


@dataclass
class ExcelOpsResult:
    preview_rows: List[Dict[str, Any]]
    row_count: Optional[int]
    elapsed_ms: int


class ExcelOpsService:
    def __init__(self):
        try:
            import duckdb  # noqa: F401
        except Exception as e:
            raise RuntimeError("duckdb is not available") from e

    def execute_plan(
        self,
        filename: str,
        content: bytes,
        plan: Dict[str, Any],
        preview_limit: int = 50,
    ) -> Tuple[ExcelOpsResult, "duckdb.DuckDBPyConnection"]:
        import duckdb
        import pandas as pd

        started = time.time()

        if not isinstance(plan, dict):
            raise ValueError("plan must be a JSON object")

        inputs = plan.get("inputs")
        steps = plan.get("steps")

        if inputs is None:
            inputs = [{"name": "main"}]
        if not isinstance(inputs, list) or not inputs:
            raise ValueError("plan.inputs must be a non-empty array")
        if not isinstance(steps, list) or not steps:
            raise ValueError("plan.steps must be a non-empty array")

        ext = (os.path.splitext(filename or "")[1] or "").lower()

        con = duckdb.connect(database=":memory:")

        tables: Dict[str, str] = {}

        if ext in (".csv", ".tsv"):
            df = pd.read_csv(io.BytesIO(content))
            con.register("t_main", df)
            tables["main"] = "t_main"
        elif ext in (".xlsx", ".xls"):
            excel = pd.ExcelFile(io.BytesIO(content), engine="openpyxl" if ext == ".xlsx" else None)
            for inp in inputs:
                if not isinstance(inp, dict):
                    raise ValueError("each input must be an object")
                name = (inp.get("name") or "").strip() or "main"
                sheet = inp.get("sheet")
                if sheet is None:
                    sheet = excel.sheet_names[0] if excel.sheet_names else None
                if sheet is None:
                    raise ValueError("Excel file has no sheets")

                df = excel.parse(sheet)
                tname = f"t_{len(tables)}"
                con.register(tname, df)
                tables[name] = tname
        else:
            raise ValueError("Unsupported file type. Upload .csv, .tsv, .xlsx, or .xls")

        current_table_ref = tables.get("main") or next(iter(tables.values()))
        current_view = "v0"
        con.execute(f"CREATE OR REPLACE TEMP VIEW {current_view} AS SELECT * FROM {current_table_ref}")

        for i, step in enumerate(steps, start=1):
            if not isinstance(step, dict):
                raise ValueError("each step must be an object")
            stype = (step.get("type") or "").strip()
            if not stype:
                raise ValueError("step.type is required")

            src = current_view
            dst = f"v{i}"

            if stype == "select":
                cols = step.get("columns")
                if not isinstance(cols, list) or not cols:
                    raise ValueError("select.columns must be a non-empty array")
                col_sql = ", ".join([_qident(str(c)) for c in cols])
                sql = f"SELECT {col_sql} FROM {src}"
            elif stype == "rename":
                mapping = step.get("mapping")
                if not isinstance(mapping, dict) or not mapping:
                    raise ValueError("rename.mapping must be an object")
                cols = con.execute(f"DESCRIBE SELECT * FROM {src}").fetchall()
                select_parts = []
                for col, _typ, *_ in cols:
                    new_name = mapping.get(col, col)
                    select_parts.append(f"{_qident(col)} AS {_qident(str(new_name))}")
                sql = f"SELECT {', '.join(select_parts)} FROM {src}"
            elif stype == "cast":
                mapping = step.get("mapping")
                if not isinstance(mapping, dict) or not mapping:
                    raise ValueError("cast.mapping must be an object")
                cols = con.execute(f"DESCRIBE SELECT * FROM {src}").fetchall()
                select_parts = []
                for col, _typ, *_ in cols:
                    if col in mapping:
                        target_type = str(mapping[col])
                        select_parts.append(f"CAST({_qident(col)} AS {target_type}) AS {_qident(col)}")
                    else:
                        select_parts.append(f"{_qident(col)}")
                sql = f"SELECT {', '.join(select_parts)} FROM {src}"
            elif stype == "add_column":
                name = step.get("name")
                expr = step.get("expr")
                if not name or not isinstance(name, str):
                    raise ValueError("add_column.name must be a string")
                if not expr or not isinstance(expr, str):
                    raise ValueError("add_column.expr must be a string")
                sql = f"SELECT *, ({expr}) AS {_qident(name)} FROM {src}"
            elif stype == "filter":
                where = step.get("where")
                if not where or not isinstance(where, str):
                    raise ValueError("filter.where must be a string")
                sql = f"SELECT * FROM {src} WHERE ({where})"
            elif stype == "sort":
                by = step.get("by")
                if not isinstance(by, list) or not by:
                    raise ValueError("sort.by must be a non-empty array")
                parts = []
                for item in by:
                    if isinstance(item, str):
                        parts.append(f"{_qident(item)}")
                    elif isinstance(item, dict):
                        col = item.get("column")
                        if not col:
                            raise ValueError("sort.by[].column is required")
                        direction = (item.get("direction") or "asc").strip().lower()
                        if direction not in ("asc", "desc"):
                            raise ValueError("sort direction must be asc|desc")
                        parts.append(f"{_qident(str(col))} {direction.upper()}")
                    else:
                        raise ValueError("sort.by items must be strings or objects")
                sql = f"SELECT * FROM {src} ORDER BY {', '.join(parts)}"
            elif stype == "dedupe":
                keys = step.get("keys")
                keep = (step.get("keep") or "first").strip().lower()
                if not isinstance(keys, list) or not keys:
                    raise ValueError("dedupe.keys must be a non-empty array")
                if keep not in ("first", "last"):
                    raise ValueError("dedupe.keep must be first|last")
                order_by = step.get("order_by")
                if order_by is None:
                    order_by = []
                if not isinstance(order_by, list):
                    raise ValueError("dedupe.order_by must be an array")

                partition = ", ".join([_qident(str(k)) for k in keys])
                if order_by:
                    order_parts = []
                    for ob in order_by:
                        if isinstance(ob, str):
                            order_parts.append(_qident(ob))
                        elif isinstance(ob, dict):
                            col = ob.get("column")
                            if not col:
                                raise ValueError("dedupe.order_by[].column is required")
                            direction = (ob.get("direction") or "asc").strip().lower()
                            if direction not in ("asc", "desc"):
                                raise ValueError("dedupe order_by direction must be asc|desc")
                            order_parts.append(f"{_qident(str(col))} {direction.upper()}")
                        else:
                            raise ValueError("dedupe.order_by items must be strings or objects")
                    order_sql = ", ".join(order_parts)
                else:
                    cols = con.execute(f"DESCRIBE SELECT * FROM {src}").fetchall()
                    order_sql = ", ".join([_qident(c[0]) for c in cols])

                rn_order = "DESC" if keep == "last" else "ASC"
                sql = (
                    f"SELECT * EXCLUDE(rn) FROM (\n"
                    f"  SELECT *, ROW_NUMBER() OVER (PARTITION BY {partition} ORDER BY {order_sql} {rn_order}) AS rn\n"
                    f"  FROM {src}\n"
                    f") WHERE rn = 1"
                )
            elif stype in ("lookup_join", "join"):
                right = step.get("right")
                on = step.get("on")
                how = (step.get("how") or "left").strip().lower()
                if not right or not isinstance(right, str):
                    raise ValueError("join.right must be a string")
                if right not in tables:
                    raise ValueError(f"Unknown right table '{right}'. Add it to plan.inputs")
                if not isinstance(on, list) or not on:
                    raise ValueError("join.on must be a non-empty array")
                if how not in ("left", "inner", "right", "full"):
                    raise ValueError("join.how must be left|inner|right|full")

                right_src = tables[right]
                right_view = f"j{i}_r"
                con.execute(f"CREATE OR REPLACE TEMP VIEW {right_view} AS SELECT * FROM {right_src}")

                left_alias = "l"
                right_alias = "r"

                conds = []
                for pair in on:
                    if isinstance(pair, str):
                        conds.append(f"{left_alias}.{_qident(pair)} = {right_alias}.{_qident(pair)}")
                    elif isinstance(pair, dict):
                        lcol = pair.get("left")
                        rcol = pair.get("right")
                        if not lcol or not rcol:
                            raise ValueError("join.on[] requires left and right")
                        conds.append(f"{left_alias}.{_qident(str(lcol))} = {right_alias}.{_qident(str(rcol))}")
                    else:
                        raise ValueError("join.on items must be strings or objects")

                select_right = step.get("select_right")
                include_right_keys = _as_bool(step.get("include_right_keys"), default=False)

                left_cols = [c[0] for c in con.execute(f"DESCRIBE SELECT * FROM {src}").fetchall()]
                right_cols = [c[0] for c in con.execute(f"DESCRIBE SELECT * FROM {right_view}").fetchall()]

                right_key_cols: List[str] = []
                for pair in on:
                    if isinstance(pair, str):
                        right_key_cols.append(pair)
                    elif isinstance(pair, dict):
                        right_key_cols.append(str(pair.get("right")))

                right_pick: List[str]
                if select_right is None:
                    right_pick = right_cols
                else:
                    if not isinstance(select_right, list):
                        raise ValueError("join.select_right must be an array")
                    right_pick = [str(x) for x in select_right]

                left_select = [f"{left_alias}.{_qident(c)} AS {_qident(c)}" for c in left_cols]

                right_select_parts: List[str] = []
                for c in right_pick:
                    if (not include_right_keys) and c in right_key_cols:
                        continue
                    out_name = c
                    if out_name in left_cols:
                        out_name = f"{right}__{c}"
                    right_select_parts.append(f"{right_alias}.{_qident(c)} AS {_qident(out_name)}")

                select_sql = ", ".join(left_select + right_select_parts)
                on_sql = " AND ".join(conds)

                sql = f"SELECT {select_sql} FROM {src} {left_alias} {how.upper()} JOIN {right_view} {right_alias} ON {on_sql}"
            elif stype == "groupby_aggregate":
                keys = step.get("keys")
                aggs = step.get("aggregations")
                if not isinstance(keys, list) or not keys:
                    raise ValueError("groupby_aggregate.keys must be a non-empty array")
                if not isinstance(aggs, list) or not aggs:
                    raise ValueError("groupby_aggregate.aggregations must be a non-empty array")

                key_sql = ", ".join([_qident(str(k)) for k in keys])

                agg_parts = []
                for a in aggs:
                    if not isinstance(a, dict):
                        raise ValueError("aggregations items must be objects")
                    op = (a.get("op") or "").strip().lower()
                    col = a.get("column")
                    as_name = a.get("as")
                    if not op:
                        raise ValueError("aggregation.op is required")
                    if op not in ("count", "sum", "avg", "min", "max"):
                        raise ValueError("aggregation.op must be count|sum|avg|min|max")
                    if op == "count" and (col is None or col == "*"):
                        expr = "COUNT(*)"
                    else:
                        if not col or not isinstance(col, str):
                            raise ValueError("aggregation.column is required")
                        expr = f"{op.upper()}({_qident(col)})"

                    if not as_name:
                        as_name = f"{op}_{col or 'rows'}"
                    agg_parts.append(f"{expr} AS {_qident(str(as_name))}")

                sql = f"SELECT {key_sql}, {', '.join(agg_parts)} FROM {src} GROUP BY {key_sql}"
            else:
                raise ValueError(f"Unsupported step.type: {stype}")

            con.execute(f"CREATE OR REPLACE TEMP VIEW {dst} AS {sql}")
            current_view = dst

        preview_limit = int(preview_limit or 50)
        preview_limit = max(1, min(preview_limit, 500))

        preview_df = con.execute(f"SELECT * FROM {current_view} LIMIT {preview_limit}").df()
        preview_rows = preview_df.fillna("").to_dict(orient="records")

        row_count: Optional[int]
        try:
            row_count = int(con.execute(f"SELECT COUNT(*) AS c FROM {current_view}").fetchone()[0])
        except Exception:
            row_count = None

        elapsed_ms = int((time.time() - started) * 1000)
        return ExcelOpsResult(preview_rows=preview_rows, row_count=row_count, elapsed_ms=elapsed_ms), con

    def export_csv_bytes(self, con: "duckdb.DuckDBPyConnection", view_name: str) -> bytes:
        df = con.execute(f"SELECT * FROM {view_name}").df()
        return df.to_csv(index=False).encode("utf-8")

    def execute_plan_and_export_csv(
        self,
        filename: str,
        content: bytes,
        plan_json: str,
        preview_limit: int = 50,
    ) -> Tuple[ExcelOpsResult, bytes]:
        try:
            plan = json.loads(plan_json)
        except Exception:
            raise ValueError("Invalid plan_json: must be valid JSON")

        result, con = self.execute_plan(filename=filename, content=content, plan=plan, preview_limit=preview_limit)
        csv_bytes = self.export_csv_bytes(con, f"v{len(plan.get('steps') or [])}")
        return result, csv_bytes
