import io
import re
from dataclasses import dataclass
from typing import Any, Dict, Optional, Tuple


@dataclass
class ReconcileOptions:
    tolerance: float = 0.0
    trim_strings: bool = True
    parse_numbers: bool = True


def _norm_col(c: Any) -> str:
    s = "" if c is None else str(c)
    s = s.strip().lower()
    s = re.sub(r"\s+", " ", s)
    return s


def _parse_number(v: Any) -> Optional[float]:
    if v is None:
        return None
    if isinstance(v, (int, float)):
        return float(v)
    s = str(v).strip()
    if not s:
        return None
    neg = False
    if s.startswith("(") and s.endswith(")"):
        neg = True
        s = s[1:-1]
    s = s.replace(",", "")
    s = s.replace("$", "").replace("₹", "").replace("€", "").replace("£", "")
    s = s.replace("%", "")
    s = s.strip()
    try:
        num = float(s)
        if neg:
            num = -num
        return num
    except Exception:
        return None


class ReconciliationService:
    """Deterministic 2-table reconciliation: exact key join + variance + summaries."""

    def reconcile(
        self,
        left_filename: str,
        left_content: bytes,
        right_filename: str,
        right_content: bytes,
        left_key_col: str,
        right_key_col: str,
        left_amount_col: str,
        right_amount_col: str,
        options: Optional[ReconcileOptions] = None,
    ) -> Tuple[bytes, Dict[str, Any]]:
        try:
            import pandas as pd
        except Exception as e:
            raise ValueError("pandas is not available") from e

        opts = options or ReconcileOptions()

        def read_any(filename: str, content: bytes):
            ext = (filename or "").lower().split(".")[-1] if "." in (filename or "") else ""
            if ext in ("csv", "tsv"):
                sep = "\t" if ext == "tsv" else ","
                return pd.read_csv(io.BytesIO(content), sep=sep)
            if ext in ("xlsx", "xls"):
                excel = pd.ExcelFile(io.BytesIO(content), engine="openpyxl" if ext == "xlsx" else None)
                sheet = excel.sheet_names[0] if excel.sheet_names else None
                if sheet is None:
                    raise ValueError("Excel file has no sheets")
                return excel.parse(sheet)
            raise ValueError("Unsupported file type. Upload .csv, .tsv, .xlsx, or .xls")

        ldf = read_any(left_filename, left_content)
        rdf = read_any(right_filename, right_content)

        # normalize column lookup (case/space)
        lmap = {_norm_col(c): c for c in list(ldf.columns)}
        rmap = {_norm_col(c): c for c in list(rdf.columns)}

        lk = lmap.get(_norm_col(left_key_col))
        rk = rmap.get(_norm_col(right_key_col))
        la = lmap.get(_norm_col(left_amount_col))
        ra = rmap.get(_norm_col(right_amount_col))

        missing = []
        if lk is None:
            missing.append(f"left key col '{left_key_col}'")
        if rk is None:
            missing.append(f"right key col '{right_key_col}'")
        if la is None:
            missing.append(f"left amount col '{left_amount_col}'")
        if ra is None:
            missing.append(f"right amount col '{right_amount_col}'")
        if missing:
            raise ValueError("Missing columns: " + ", ".join(missing))

        # prepare keys
        ldf = ldf.copy()
        rdf = rdf.copy()

        if opts.trim_strings:
            ldf[lk] = ldf[lk].apply(lambda x: str(x).strip() if isinstance(x, str) else x)
            rdf[rk] = rdf[rk].apply(lambda x: str(x).strip() if isinstance(x, str) else x)

        ldf["__key"] = ldf[lk].astype(str).fillna("")
        rdf["__key"] = rdf[rk].astype(str).fillna("")

        if opts.parse_numbers:
            ldf["__amount_l"] = ldf[la].apply(_parse_number)
            rdf["__amount_r"] = rdf[ra].apply(_parse_number)
        else:
            ldf["__amount_l"] = ldf[la]
            rdf["__amount_r"] = rdf[ra]

        # aggregate by key (handles duplicates)
        l_agg = ldf.groupby("__key", dropna=False)["__amount_l"].sum(min_count=1).reset_index()
        r_agg = rdf.groupby("__key", dropna=False)["__amount_r"].sum(min_count=1).reset_index()

        joined = l_agg.merge(r_agg, how="outer", on="__key", indicator=True)
        joined["variance"] = (joined["__amount_l"].fillna(0) - joined["__amount_r"].fillna(0))
        joined["abs_variance"] = joined["variance"].abs()

        tol = float(opts.tolerance or 0.0)
        joined["status"] = "matched"
        joined.loc[joined["_merge"] == "left_only", "status"] = "missing_on_right"
        joined.loc[joined["_merge"] == "right_only", "status"] = "missing_on_left"
        joined.loc[(joined["_merge"] == "both") & (joined["abs_variance"] > tol), "status"] = "mismatch"

        matched = joined[joined["status"] == "matched"].copy()
        mismatch = joined[joined["status"] == "mismatch"].copy()
        missing_left = joined[joined["status"] == "missing_on_left"].copy()
        missing_right = joined[joined["status"] == "missing_on_right"].copy()

        # summary
        summary = {
            "left_filename": left_filename or "left",
            "right_filename": right_filename or "right",
            "left_rows": int(len(ldf)),
            "right_rows": int(len(rdf)),
            "key_left": str(lk),
            "key_right": str(rk),
            "amount_left": str(la),
            "amount_right": str(ra),
            "tolerance": tol,
            "counts": {
                "matched": int(len(matched)),
                "mismatch": int(len(mismatch)),
                "missing_on_left": int(len(missing_left)),
                "missing_on_right": int(len(missing_right)),
                "total_keys": int(len(joined)),
            },
            "totals": {
                "left_total": float(l_agg["__amount_l"].fillna(0).sum()),
                "right_total": float(r_agg["__amount_r"].fillna(0).sum()),
                "variance_total": float(joined["variance"].fillna(0).sum()),
            },
        }

        # report workbook
        out = io.BytesIO()
        with pd.ExcelWriter(out, engine="openpyxl") as writer:
            joined.rename(columns={"__key": "key", "__amount_l": "left_amount", "__amount_r": "right_amount"}).to_excel(
                writer, sheet_name="Summary", index=False
            )
            mismatch.rename(columns={"__key": "key", "__amount_l": "left_amount", "__amount_r": "right_amount"}).to_excel(
                writer, sheet_name="Mismatches", index=False
            )
            missing_left.rename(columns={"__key": "key", "__amount_l": "left_amount", "__amount_r": "right_amount"}).to_excel(
                writer, sheet_name="Missing_On_Left", index=False
            )
            missing_right.rename(columns={"__key": "key", "__amount_l": "left_amount", "__amount_r": "right_amount"}).to_excel(
                writer, sheet_name="Missing_On_Right", index=False
            )
        out.seek(0)

        return out.read(), summary
