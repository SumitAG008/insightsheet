import io
import re
from dataclasses import dataclass
from collections import Counter
from typing import Any, Dict, List, Optional, Tuple

MAX_VARIANT_GROUPS = 60  # a column with more distinct values is free text, not a list of names


@dataclass
class StandardizeOptions:
    dedupe_rows: bool = True
    normalize_headers: bool = True
    trim_strings: bool = True
    parse_numbers: bool = True
    parse_dates: bool = True
    unify_text: bool = False
    sheet: Optional[str] = None  # the tab to clean; default is the first tab with a table


def _variant_key(v: str) -> str:
    return re.sub(r"\s+", " ", v).strip().casefold()


def text_variants(values) -> Dict[str, str]:
    """Spellings of the same value that differ only in case or spacing ("north", " North ").

    Returns {variant: preferred spelling}, the preferred one being the most common (ties: the
    first seen). Empty when the column is free text or has no variants.
    """
    texts = [v for v in values if isinstance(v, str) and v.strip()]
    if not texts:
        return {}
    groups: Dict[str, Counter] = {}
    for v in texts:
        groups.setdefault(_variant_key(v), Counter())[v] += 1
    if len(groups) > MAX_VARIANT_GROUPS or len(groups) > max(2, len(texts) * 0.6):
        return {}
    out: Dict[str, str] = {}
    for counts in groups.values():
        if len(counts) < 2:
            continue
        preferred = counts.most_common(1)[0][0].strip()
        for variant in counts:
            if variant != preferred:
                out[variant] = preferred
    return out


def _read_table(filename: str, content: bytes, ext: str, wanted: Optional[str]):
    """The table on the chosen tab (or the first tab with one), skipping titles above it."""
    import pandas as pd
    from app.services.file_analyzer import _table_from_rows

    excel = pd.ExcelFile(io.BytesIO(content), engine="openpyxl" if ext == "xlsx" else None)
    names = list(excel.sheet_names)
    if not names:
        raise ValueError("Excel file has no sheets")
    order = [wanted] if wanted in names else names
    fallback = None
    for name in order:
        raw = excel.parse(name, header=None).astype(object)
        raw = raw.where(raw.notna(), None).values.tolist()
        headers, rows = _table_from_rows(raw, max_rows=1_000_000)
        if headers and rows:
            rows = [[None if v == "" else v for v in r] for r in rows]
            df = pd.DataFrame(rows, columns=headers).infer_objects()
            # A cover page (one column of headings) is not the table people mean to clean.
            named = [h for h in headers if not re.fullmatch(r"Column\d+", h)]
            if len(named) >= 2 or wanted == name:
                return df, name
            fallback = fallback or (df, name)
    return fallback or (pd.DataFrame(), order[0])


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


_ISO = re.compile(r"^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})(?:[ T].*)?$")
_DMY = re.compile(r"^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})$")


def _month_first(values) -> bool:
    """True when a d/m/y-looking column is really m/d/y: some second part is above 12 and no first part is."""
    firsts, seconds = [], []
    for v in values:
        m = _DMY.match(str(v).strip()) if isinstance(v, str) else None
        if m:
            firsts.append(int(m.group(1)))
            seconds.append(int(m.group(2)))
    return any(x > 12 for x in seconds) and not any(x > 12 for x in firsts)


def _parse_date_cell(v: Any, month_first: bool = False) -> Any:
    """A real date for ISO or d/m/y text; real dates pass through; anything else is left as it was."""
    from datetime import date, datetime

    if v is None or isinstance(v, (datetime, date)):
        return v
    if hasattr(v, "to_pydatetime"):
        return v.to_pydatetime()
    s = str(v).strip()
    try:
        m = _ISO.match(s)
        if m:
            return datetime(int(m.group(1)), int(m.group(2)), int(m.group(3)))
        m = _DMY.match(s)
        if m:
            a, b, y = int(m.group(1)), int(m.group(2)), int(m.group(3))
            y = y + 2000 if y < 100 else y
            day, month = (b, a) if month_first else (a, b)
            return datetime(y, month, day)
    except ValueError:
        return v
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
            df, sheet_name = _read_table(filename, content, ext, opts.sheet)

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

        # One spelling per value: "north", " North " and "North" become the most common form
        unified = 0
        if opts.unify_text:
            for c in list(df.columns):
                try:
                    if df[c].dtype == object:
                        mapping = text_variants(df[c].tolist())
                        if mapping:
                            unified += int(df[c].isin(list(mapping)).sum())
                            df[c] = df[c].apply(lambda x, m=mapping: m.get(x, x) if isinstance(x, str) else x)
                except Exception:
                    continue

        # Parse numbers (currency/commas/parentheses)
        if opts.parse_numbers:
            for c in list(df.columns):
                try:
                    if df[c].dtype == object:
                        # only attempt if some cells look numeric-ish
                        sample = df[c].dropna().head(30).astype(str)
                        looks = sample.str.contains(r"^\s*[\(\-\+\$₹€£]?[0-9,]+(?:\.[0-9]+)?%?\)?\s*$", regex=True).mean() if len(sample) else 0
                        if looks >= 0.6:
                            df[c] = df[c].apply(_parse_number_cell)
                except Exception:
                    continue

        # Parse dates: text dates become real dates, read day-first (03/07/2026 is 3 July) unless the
        # column proves it is month-first (a second part above 12, as in 07/23/2026).
        if opts.parse_dates:
            for c in list(df.columns):
                try:
                    if df[c].dtype == object:
                        sample = df[c].dropna().head(30).astype(str)
                        looks = sample.str.contains(r"\d{1,4}[\-/.]\d{1,2}[\-/.]\d{1,4}", regex=True).mean() if len(sample) else 0
                        if looks >= 0.6:
                            month_first = _month_first(df[c].dropna())
                            df[c] = df[c].apply(lambda x, mf=month_first: _parse_date_cell(x, mf))
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
            "text_values_unified": unified,
            "headers_before": headers_before,
            "headers_after": [str(c) for c in df.columns],
        }

        return out.read(), summary
