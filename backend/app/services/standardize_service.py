import io
import re
from dataclasses import dataclass
from typing import Any, Dict, List, Optional, Tuple


@dataclass
class StandardizeOptions:
    dedupe_rows: bool = True
    normalize_headers: bool = True
    trim_strings: bool = True
    parse_numbers: bool = True
    parse_dates: bool = True


def _safe_header(h: Any) -> str:
    s = "" if h is None else str(h)
    s = s.strip()
    if not s:
        return "column"
    s = re.sub(r"\s+", " ", s)
    s = s.replace("/", " ")
    s = re.sub(r"[^a-zA-Z0-9 _-]", "", s)
    s = s.strip().lower().replace(" ", "_")
    s = re.sub(r"_+", "_", s)
    return s or "column"


def _ensure_unique(headers: List[str]) -> List[str]:
    seen: Dict[str, int] = {}
    out: List[str] = []
    for h in headers:
        base = h or "column"
        if base not in seen:
            seen[base] = 1
            out.append(base)
        else:
            seen[base] += 1
            out.append(f"{base}_{seen[base]}")
    return out


def _parse_number_cell(v: Any) -> Any:
    if v is None:
        return None
    if isinstance(v, (int, float)):
        return v
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
        if num.is_integer():
            return int(num)
        return num
    except Exception:
        return v


class StandardizeService:
    """Deterministic, privacy-first cleaning/standardization for CSV/XLSX/XLS.

    Note: This does NOT store file contents. It operates on in-memory bytes only.
    """

    def standardize(self, filename: str, content: bytes, options: Optional[StandardizeOptions] = None) -> Tuple[bytes, Dict[str, Any]]:
        try:
            import pandas as pd
        except Exception as e:
            raise ValueError("pandas is not available") from e

        opts = options or StandardizeOptions()

        ext = (filename or "").lower().split(".")[-1] if "." in (filename or "") else ""
        if ext not in ("csv", "tsv", "xlsx", "xls"):
            raise ValueError("Unsupported file type. Upload .csv, .tsv, .xlsx, or .xls")

        if ext in ("csv", "tsv"):
            sep = "\t" if ext == "tsv" else ","
            df = pd.read_csv(io.BytesIO(content), sep=sep)
            sheet_name = "data"
        else:
            excel = pd.ExcelFile(io.BytesIO(content), engine="openpyxl" if ext == "xlsx" else None)
            sheet_name = excel.sheet_names[0] if excel.sheet_names else "Sheet1"
            df = excel.parse(sheet_name)

        original_rows = int(len(df))
        original_cols = int(len(df.columns))

        # Normalize headers
        headers_before = [str(c) for c in df.columns]
        if opts.normalize_headers:
            headers_norm = [_safe_header(c) for c in df.columns]
            headers_norm = _ensure_unique(headers_norm)
            df.columns = headers_norm

        # Trim strings + normalize whitespace
        if opts.trim_strings:
            for c in list(df.columns):
                try:
                    if df[c].dtype == object:
                        df[c] = df[c].apply(lambda x: str(x).strip() if isinstance(x, str) else x)
                except Exception:
                    continue

        # Parse numbers (currency/commas/parentheses)
        if opts.parse_numbers:
            for c in list(df.columns):
                try:
                    if df[c].dtype == object:
                        # only attempt if some cells look numeric-ish
                        sample = df[c].dropna().head(30).astype(str)
                        looks = sample.str.contains(r"^\s*[\(\-\+\$₹€£]?[0-9,]+(\.[0-9]+)?%?\)?\s*$", regex=True).mean() if len(sample) else 0
                        if looks >= 0.6:
                            df[c] = df[c].apply(_parse_number_cell)
                except Exception:
                    continue

        # Parse dates
        if opts.parse_dates:
            for c in list(df.columns):
                try:
                    if df[c].dtype == object:
                        sample = df[c].dropna().head(30).astype(str)
                        looks = sample.str.contains(r"\d{1,4}[\-/]\d{1,2}[\-/]\d{1,4}", regex=True).mean() if len(sample) else 0
                        if looks >= 0.6:
                            df[c] = pd.to_datetime(df[c], errors="coerce")
                except Exception:
                    continue

        # Dedupe rows
        removed_dupes = 0
        if opts.dedupe_rows:
            try:
                before = len(df)
                df = df.drop_duplicates()
                removed_dupes = int(before - len(df))
            except Exception:
                removed_dupes = 0

        # Save to xlsx bytes
        out = io.BytesIO()
        with pd.ExcelWriter(out, engine="openpyxl") as writer:
            df.to_excel(writer, sheet_name="Standardized", index=False)
        out.seek(0)

        summary = {
            "filename": filename or "uploaded_file",
            "sheet": sheet_name,
            "rows_before": original_rows,
            "cols_before": original_cols,
            "rows_after": int(len(df)),
            "cols_after": int(len(df.columns)),
            "duplicate_rows_removed": removed_dupes,
            "headers_before": headers_before,
            "headers_after": [str(c) for c in df.columns],
        }

        return out.read(), summary
