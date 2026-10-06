"""
Import a firm's existing Excel or CSV case diary. Headers are matched by common names in English and Hindi
(Case No, NDOH, Next Date, अगली तारीख, Court, Party, Stage, Advocate, Fees...). Dates are read day first
(dd/mm/yyyy). Preview first, then commit; nothing is stored until the person confirms.
"""
from __future__ import annotations

import io
import re
from datetime import datetime
from typing import Any, Dict, List, Optional, Tuple

from app.services.legal import profiles

FIELDS: Dict[str, List[str]] = {
    "title": ["title", "case title", "parties", "party", "party name", "cause title", "matter", "matter name", "case name", "पक्षकार", "मामला"],
    "petitioner": ["petitioner", "plaintiff", "appellant", "complainant", "claimant", "applicant", "वादी", "याचिकाकर्ता"],
    "respondent": ["respondent", "defendant", "accused", "opposite party", "प्रतिवादी"],
    "client": ["client", "client name", "for", "on behalf of", "मुवक्किल", "क्लाइंट"],
    "client_phone": ["client phone", "mobile", "phone", "contact", "मोबाइल"],
    "cnr": ["cnr", "cnr no", "cnr number"],
    "case_type": ["case type", "type", "nature"],
    "case_number": ["case no", "case number", "case no.", "number", "reg no", "registration no", "suit no", "मुकदमा संख्या", "केस नंबर"],
    "case_year": ["year", "case year", "वर्ष"],
    "claim_number": ["claim no", "claim number", "case reference", "court reference", "tribunal number"],
    "court": ["court", "court name", "forum", "bench", "tribunal", "न्यायालय", "अदालत"],
    "next_hearing": ["next date", "ndoh", "next hearing", "next date of hearing", "date of hearing", "hearing date", "listed on", "अगली तारीख", "अगली सुनवाई", "तारीख"],
    "last_hearing": ["previous date", "last date", "pdoh", "last hearing", "पिछली तारीख"],
    "stage": ["stage", "purpose", "status of case", "next purpose", "स्थिति", "प्रयोजन"],
    "lawyer_email": ["advocate", "lawyer", "counsel", "associate", "fee earner", "handled by", "assigned to", "अधिवक्ता", "वकील"],
    "opposing_counsel": ["opposing counsel", "opposite counsel", "other side counsel", "counsel for respondent"],
    "filed_on": ["filing date", "date of filing", "filed on", "instituted on", "issue date"],
    "fees_billed": ["fees", "fee", "fees billed", "billed", "professional fee", "फीस"],
    "fees_collected": ["received", "fees received", "collected", "paid", "प्राप्त"],
    "sections": ["sections", "under section", "u/s", "act", "धारा"],
    "notes": ["remarks", "notes", "comments", "टिप्पणी"],
}

_STAGE_WORDS = {
    "IN": [("evidence", "evidence"), ("pe", "evidence"), ("de", "evidence"), ("argument", "arguments"), ("written statement", "pleadings"),
           ("ws", "pleadings"), ("reply", "pleadings"), ("notice", "notice"), ("service", "notice"), ("issue", "issues"), ("admission", "filing"),
           ("bail", "bail"), ("judgment", "judgment"), ("order", "judgment"), ("execution", "execution"), ("reserved", "reserved"), ("interim", "interim")],
    "GB": [("defence", "defence"), ("disclosure", "disclosure"), ("witness", "witness"), ("trial", "trial"), ("cmc", "allocation"),
           ("directions", "allocation"), ("pre-trial", "ptr"), ("judgment", "judgment"), ("enforcement", "enforcement"), ("issued", "issued")],
}


def _norm(h: Any) -> str:
    return re.sub(r"[\s_.:/-]+", " ", str(h or "")).strip().lower()


def map_headers(headers: List[str]) -> Dict[str, str]:
    """{field: header} using exact names first, then 'contains' matches."""
    mapping: Dict[str, str] = {}
    normed = {h: _norm(h) for h in headers}
    for field, names in FIELDS.items():
        names_n = [_norm(n) for n in names]
        for h, hn in normed.items():
            if h not in mapping.values() and hn in names_n:
                mapping[field] = h
                break
    for field, names in FIELDS.items():
        if field in mapping:
            continue
        for h, hn in normed.items():
            if h in mapping.values():
                continue
            if any(len(_norm(n)) > 3 and _norm(n) in hn for n in names):
                mapping[field] = h
                break
    return mapping


def _date(v: Any) -> Optional[str]:
    if v is None or (isinstance(v, float) and v != v) or str(v).strip() in ("", "-", "NA", "N/A", "nan", "NaT"):
        return None
    if isinstance(v, datetime):
        return v.date().isoformat()
    if hasattr(v, "date") and callable(getattr(v, "date")):
        try:
            return v.date().isoformat()
        except Exception:  # noqa: BLE001
            pass
    s = str(v).strip()
    for fmt in ("%d/%m/%Y", "%d-%m-%Y", "%d.%m.%Y", "%d/%m/%y", "%d-%m-%y", "%Y-%m-%d", "%d %b %Y", "%d %B %Y", "%d-%b-%Y", "%d-%b-%y", "%Y-%m-%d %H:%M:%S"):
        try:
            return datetime.strptime(s, fmt).date().isoformat()
        except ValueError:
            continue
    raise ValueError(f"Cannot read the date '{s}'")


def _money(v: Any) -> Optional[float]:
    if v is None or str(v).strip() in ("", "nan", "-"):
        return None
    s = re.sub(r"[^\d.\-]", "", str(v))
    try:
        return float(s) if s else None
    except ValueError:
        return None


def guess_court(country: str, text: Any) -> Optional[str]:
    t = _norm(text)
    if not t:
        return None
    best = None
    for c in profiles.COURTS[country]:
        name = _norm(c["name"])
        if t == _norm(c["code"]) or t == name:
            return c["code"]
        words = [w for w in name.replace("&", " ").split() if len(w) > 2 and w not in ("court", "high", "the", "of", "and")]
        if words and all(w in t for w in words):
            best = best or c["code"]
    if best:
        return best
    if "high court" in t or re.search(r"\bhc\b", t):
        return "HC_OTHER" if country == "IN" else "KB"
    if country == "IN":
        for key, code in (("district", "DIST"), ("sessions", "DIST"), ("civil", "CIVIL"), ("magistrate", "CJM"), ("cjm", "CJM"), ("jmfc", "CJM"),
                          ("family", "FAMILY"), ("consumer", "CONSUMER"), ("commercial", "COMM"), ("nclt", "NCLT"), ("drt", "DRT"), ("supreme", "SC")):
            if key in t:
                return code
    else:
        for key, code in (("county", "CC"), ("employment", "ET"), ("crown", "CROWN"), ("magistrates", "MAGS"), ("family", "FC"), ("tribunal", "FTT")):
            if key in t:
                return code
    return None


def guess_stage(country: str, text: Any) -> Optional[str]:
    t = _norm(text)
    if not t:
        return None
    for word, code in _STAGE_WORDS[country]:
        if re.search(rf"\b{re.escape(word)}\b", t):
            return code
    return None


def read_table(filename: str, content: bytes) -> Tuple[List[str], List[Dict[str, Any]]]:
    import pandas as pd

    name = (filename or "").lower()
    if name.endswith(".csv") or name.endswith(".txt"):
        try:
            df = pd.read_csv(io.BytesIO(content), dtype=str, keep_default_na=False)
        except UnicodeDecodeError:
            df = pd.read_csv(io.BytesIO(content), dtype=str, keep_default_na=False, encoding="latin-1")
    else:
        raw = pd.read_excel(io.BytesIO(content), header=None, dtype=object)
        # Diaries often have a title row or two; the header is the first row with 3+ text cells.
        header_row = 0
        for i in range(min(10, len(raw))):
            cells = [c for c in raw.iloc[i].tolist() if isinstance(c, str) and c.strip()]
            if len(cells) >= 3:
                header_row = i
                break
        df = pd.read_excel(io.BytesIO(content), header=header_row, dtype=object)
    df = df.dropna(how="all")
    df.columns = [str(c).strip() for c in df.columns]
    df = df.loc[:, [c for c in df.columns if not c.lower().startswith("unnamed")]]
    rows = df.where(df.notna(), None).to_dict(orient="records")
    return list(df.columns), rows


def build_rows(country: str, headers: List[str], rows: List[Dict[str, Any]], mapping: Optional[Dict[str, str]] = None,
               lawyer_lookup: Optional[Dict[str, str]] = None) -> Dict[str, Any]:
    mapping = mapping or map_headers(headers)
    out, issues = [], []
    for i, r in enumerate(rows, start=2):
        get = lambda f: r.get(mapping[f]) if f in mapping else None  # noqa: E731
        row_issues: List[str] = []
        try:
            nh = _date(get("next_hearing"))
        except ValueError as e:
            nh, _ = None, row_issues.append(str(e))
        try:
            lh = _date(get("last_hearing"))
        except ValueError as e:
            lh, _ = None, row_issues.append(str(e))
        try:
            filed = _date(get("filed_on"))
        except ValueError as e:
            filed, _ = None, row_issues.append(str(e))
        refs: Dict[str, Any] = {}
        if country == "IN":
            for k in ("cnr", "case_type", "case_number", "case_year"):
                v = get(k)
                if v not in (None, ""):
                    refs[k] = str(v).strip().removesuffix(".0")
            cn = refs.get("case_number", "")
            m = re.match(r"^(.*?)\s*(\d+)\s*/\s*((?:19|20)\d{2})$", cn)
            if m and not refs.get("case_year"):  # "CS(OS) 123/2021" in one cell
                if m.group(1).strip() and not refs.get("case_type"):
                    refs["case_type"] = m.group(1).strip()
                refs["case_number"], refs["case_year"] = m.group(2), m.group(3)
        else:
            v = get("claim_number") or get("case_number")
            if v not in (None, ""):
                refs["claim_number"] = str(v).strip()
        court_text = get("court")
        court_code = guess_court(country, court_text)
        lawyer = str(get("lawyer_email") or "").strip()
        lawyer_email = None
        if lawyer:
            lawyer_email = lawyer.lower() if "@" in lawyer else (lawyer_lookup or {}).get(lawyer.lower())
        title = str(get("title") or "").strip()
        rec = {
            "row": i,
            "country": country,
            "title": title,
            "petitioner": str(get("petitioner") or "").strip() or None,
            "respondent": str(get("respondent") or "").strip() or None,
            "client": str(get("client") or "").strip() or None,
            "client_phone": str(get("client_phone") or "").strip().removesuffix(".0") or None,
            "references": refs,
            "court_code": court_code,
            "court_text": str(court_text or "").strip(),
            "stage": guess_stage(country, get("stage")),
            "stage_text": str(get("stage") or "").strip(),
            "next_hearing": nh,
            "last_hearing": lh,
            "filed_on": filed,
            "lawyer_email": lawyer_email,
            "lawyer_name": lawyer if not lawyer_email else None,
            "opposing_counsel": str(get("opposing_counsel") or "").strip() or None,
            "fees_billed": _money(get("fees_billed")),
            "fees_collected": _money(get("fees_collected")),
            "sections": str(get("sections") or "").strip() or None,
            "notes": str(get("notes") or "").strip() or None,
        }
        if not (title or rec["petitioner"] or refs):
            continue  # blank or subtotal row
        if court_text and not court_code:
            row_issues.append(f"Court '{court_text}' not recognised; it is kept in the notes.")
        row_issues += profiles.validate_reference(country, refs)
        rec["issues"] = row_issues
        if row_issues:
            issues.append({"row": i, "issues": row_issues})
        out.append(rec)
    unmapped = [h for h in headers if h not in mapping.values()]
    return {"mapping": mapping, "unmapped": unmapped, "rows": out, "issues": issues, "count": len(out)}
