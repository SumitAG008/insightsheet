"""
Reading bank, ledger and statement exports from the UK and India into one row shape:

    {id, date, amount, reference, description, counterparty, currency, keys, source_row}

Handles what real exports contain: debit/credit columns or one signed column, "Dr"/"Cr" suffixes,
brackets for negatives, £ ₹ Rs INR $ € symbols, Indian lakh grouping (1,50,000.00), day-first dates
(dd/mm/yyyy, dd-MMM-yyyy, dd.mm.yy), and references buried in narration text: UPI/NEFT/IMPS/RTGS
UTRs, cheque numbers, BACS/FPS/DD/SO payments, invoice numbers.
"""
from __future__ import annotations

import io
import re
from datetime import date, datetime, timedelta
from typing import Any, Dict, List, Optional, Tuple

ROLES = ("date", "amount", "debit", "credit", "reference", "description", "counterparty", "currency", "drcr")

# Header words per role (English as used in UK and Indian bank, ERP and Tally exports).
_ROLE_WORDS: Dict[str, List[str]] = {
    "date": ["date", "txn date", "transaction date", "value date", "posting date", "posted", "doc date", "document date", "invoice date", "voucher date", "entry date", "booking date", "payment date"],
    "amount": ["amount", "net amount", "value", "amt", "transaction amount", "gross", "total", "invoice amount", "net"],
    "debit": ["debit", "withdrawal", "withdrawals", "paid out", "money out", "dr", "debit amount", "payments"],
    "credit": ["credit", "deposit", "deposits", "paid in", "money in", "cr", "credit amount", "receipts"],
    "reference": ["reference", "ref", "ref no", "chq no", "cheque no", "cheque number", "utr", "utr no", "transaction id", "document no", "doc no", "voucher no", "invoice no", "invoice number", "bill no", "payment ref", "instrument no", "check number", "vch no", "voucher number", "ref no", "chq ref no", "chq no ref no"],
    "description": ["description", "narration", "particulars", "details", "memo", "remarks", "transaction details", "text", "name / description"],
    "counterparty": ["payee", "payer", "party", "party name", "counterparty", "contact", "contact name", "supplier", "vendor", "customer", "beneficiary", "account name", "ledger name", "name"],
    "currency": ["currency", "ccy", "currency code"],
    "drcr": ["dr/cr", "dr cr", "cr/dr", "type", "debit/credit", "txn type", "transaction type"],
}

_CURRENCY_RE = re.compile(r"(£|₹|\$|€|rs\.?|inr|gbp|usd|eur)", re.I)
_MONTHS = {m: i for i, m in enumerate(["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"], start=1)}
# Payment-type words that are not part of a reference.
_REF_STOP = {
    "neft", "imps", "rtgs", "upi", "nach", "ach", "ecs", "chq", "cheque", "check", "bacs", "fps", "dd", "so", "trf", "transfer", "pos", "atm",
    "inb", "mob", "ib", "cms", "int", "ref", "inv", "invoice", "payment", "pmt", "to", "from", "by", "for", "the", "and", "ltd", "limited", "pvt",
    "plc", "llp", "inc", "co", "a/c", "ac", "bill", "no", "num", "txn", "fast", "faster", "credit", "debit", "cr", "dr",
}
_TOKEN_RE = re.compile(r"[A-Za-z0-9]+(?:[-/][A-Za-z0-9]+)*")


def norm_header(h: Any) -> str:
    return re.sub(r"\s+", " ", re.sub(r"[_\-.#:]+", " ", str(h or "").strip().lower())).strip()


def parse_amount(v: Any) -> Optional[float]:
    """1,50,000.00 · (1,234.50) · 1234.50 Dr · -£12.30 · ₹ 5,000 · Rs. 10/- → floats (None if blank)."""
    if v is None:
        return None
    if isinstance(v, bool):
        return None
    if isinstance(v, (int, float)):
        return None if v != v else float(v)  # NaN
    s = str(v).strip()
    if not s or s in ("-", "--", "nil", "NIL", "nan"):
        return None
    neg = False
    low = s.lower()
    if low.endswith("dr") or low.endswith("dr."):
        neg, s = True, re.sub(r"\s*dr\.?$", "", s, flags=re.I)
    elif low.endswith("cr") or low.endswith("cr."):
        s = re.sub(r"\s*cr\.?$", "", s, flags=re.I)
    s = _CURRENCY_RE.sub("", s).replace("/-", "").replace(" ", "").replace(",", "")
    if s.startswith("(") and s.endswith(")"):
        neg, s = True, s[1:-1]
    if s.endswith("-") and s[:-1].replace(".", "", 1).isdigit():
        neg, s = True, s[:-1]
    if s.startswith("-"):
        neg, s = not neg, s[1:]
    elif s.startswith("+"):
        s = s[1:]
    try:
        n = float(s)
    except ValueError:
        return None
    return -n if neg else n


def parse_date(v: Any, order: str = "DMY") -> Optional[date]:
    """Day-first by default (UK and India). Accepts Excel dates, ISO, dd/mm/yyyy, dd-MMM-yy, 05 Mar 2026."""
    if v is None or v == "":
        return None
    if isinstance(v, datetime):
        return v.date()
    if isinstance(v, date):
        return v
    if hasattr(v, "to_pydatetime"):
        try:
            return v.to_pydatetime().date()
        except Exception:  # noqa: BLE001
            return None
    if isinstance(v, (int, float)) and 20000 < float(v) < 80000:  # Excel serial
        return date(1899, 12, 30) + timedelta(days=int(v))
    s = str(v).strip()
    if not s or s.lower() in ("nan", "nat"):
        return None
    s = s.split("T")[0].split(" 00:00")[0]
    m = re.match(r"^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})", s)
    if m:
        y, mo, d = map(int, m.groups())
        return _safe(y, mo, d)
    m = re.match(r"^(\d{1,2})[-/. ]([A-Za-z]{3,9})[-/. ,]*(\d{2,4})", s)
    if m:
        d, mon, y = m.groups()
        mo = _MONTHS.get(mon[:3].lower())
        return _safe(_year(int(y)), mo, int(d)) if mo else None
    m = re.match(r"^([A-Za-z]{3,9})[ -](\d{1,2}),?[ -](\d{2,4})", s)
    if m:
        mon, d, y = m.groups()
        mo = _MONTHS.get(mon[:3].lower())
        return _safe(_year(int(y)), mo, int(d)) if mo else None
    m = re.match(r"^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})", s)
    if m:
        a, b, y = map(int, m.groups())
        d, mo = (a, b) if order == "DMY" else (b, a)
        if mo > 12 and d <= 12:
            d, mo = mo, d
        return _safe(_year(y), mo, d)
    return None


def _year(y: int) -> int:
    return y + 2000 if y < 70 else (y + 1900 if y < 100 else y)


def _safe(y: int, m: int, d: int) -> Optional[date]:
    try:
        return date(y, m, d)
    except (TypeError, ValueError):
        return None


def detect_date_order(values: List[Any]) -> str:
    """MDY only when some value can only be month-first (e.g. 03/25/2026); otherwise day-first."""
    for v in values:
        m = re.match(r"^(\d{1,2})[-/.](\d{1,2})[-/.]\d{2,4}", str(v or "").strip())
        if m:
            a, b = int(m.group(1)), int(m.group(2))
            if b > 12 >= a:
                return "MDY"
            if a > 12:
                return "DMY"
    return "DMY"


def reference_keys(*texts: Any) -> List[str]:
    """Tokens that identify a transaction: contain a digit, 4+ chars, not a payment-type word or a date.
    The first text is the reference column: there, and after "chq"/"cheque" anywhere, cheque numbers of
    3+ digits count too (000214 and "Chq 214" are the same cheque)."""
    keys: List[str] = []
    for n, t in enumerate(texts):
        text = str(t or "")
        cheque_ctx = n == 0 or bool(re.search(r"\b(chq|cheque|check)\b", text, re.I))
        for raw in _TOKEN_RE.findall(text):
            for tok in [raw, *re.split(r"[-/]", raw)]:
                k = tok.upper()
                if k.isdigit() and cheque_ctx and 3 <= len(k.lstrip("0")) <= 8 and len(raw) <= 8:
                    k2 = k.lstrip("0")
                    if k2 not in keys:
                        keys.append(k2)
                    continue
                if len(k) < 4 or not re.search(r"\d", k) or k.lower() in _REF_STOP:
                    continue
                if re.fullmatch(r"\d{1,2}[-/]\d{1,2}[-/]\d{2,4}", tok) or re.fullmatch(r"(19|20)\d{2}", k):
                    continue  # dates and bare years
                if re.fullmatch(r"0+", k):
                    continue
                k = k.lstrip("0") if k.isdigit() else k
                if len(k) >= 4 and k not in keys:
                    keys.append(k)
    return keys


def name_tokens(*texts: Any) -> List[str]:
    out = []
    for t in texts:
        for w in re.findall(r"[A-Za-z]{3,}", str(t or "")):
            w = w.lower()
            if w not in _REF_STOP and w not in out:
                out.append(w)
    return out


def detect_roles(headers: List[str], rows: List[Dict[str, Any]]) -> Dict[str, Optional[str]]:
    """Best column for each role from header names, confirmed by the values."""
    roles: Dict[str, Optional[str]] = {r: None for r in ROLES}
    used = set()
    normed = {h: norm_header(h) for h in headers}
    sample = rows[:200]

    def numeric_share(h: str) -> float:
        vals = [r.get(h) for r in sample if r.get(h) not in (None, "")]
        return sum(parse_amount(v) is not None for v in vals) / len(vals) if vals else 0.0

    def date_share(h: str) -> float:
        vals = [r.get(h) for r in sample if r.get(h) not in (None, "")]
        return sum(parse_date(v) is not None for v in vals) / len(vals) if vals else 0.0

    def drcr_share(h: str) -> float:
        vals = [str(r.get(h) or "").strip().lower() for r in sample if str(r.get(h) or "").strip()]
        ok = {"dr", "cr", "d", "c", "debit", "credit", "dr.", "cr."}
        return sum(v in ok for v in vals) / len(vals) if vals else 0.0

    for role in ("date", "debit", "credit", "amount", "reference", "counterparty", "currency", "drcr", "description"):
        words = _ROLE_WORDS[role]
        best, score = None, 0.0
        for h, n in normed.items():
            if h in used:
                continue
            s = 0.0
            if n in words:
                s = 1.0
            elif any(w in n.split() or (len(w) > 3 and w in n) for w in words):
                s = 0.7
            if not s:
                continue
            if role == "date" and date_share(h) < 0.6:
                continue
            if role == "drcr" and drcr_share(h) < 0.6:
                continue
            if role in ("amount", "debit", "credit") and numeric_share(h) < 0.5:
                continue
            if role in ("amount", "debit", "credit") and date_share(h) > 0.8:
                continue
            if role == "amount" and n in ("balance", "closing balance", "running balance"):
                continue
            if "balance" in n and role in ("amount", "debit", "credit"):
                continue
            if s > score:
                best, score = h, s
        if best:
            roles[role] = best
            used.add(best)
    # A single numeric column with no header match: take the first mostly-numeric non-balance column.
    if not roles["amount"] and not (roles["debit"] or roles["credit"]):
        for h in headers:
            if h not in used and "balance" not in normed[h] and numeric_share(h) > 0.8 and date_share(h) < 0.2:
                roles["amount"] = h
                break
    if not roles["date"]:
        for h in headers:
            if h not in used and date_share(h) > 0.8:
                roles["date"] = h
                break
    return roles


def read_table(filename: str, content: bytes) -> Tuple[List[str], List[Dict[str, Any]]]:
    """CSV or Excel → headers and rows. The header is the first row with 3+ text cells (bank exports have title rows)."""
    import pandas as pd

    name = (filename or "").lower()
    if name.endswith((".csv", ".txt")):
        text = None
        for enc in ("utf-8-sig", "latin-1"):
            try:
                text = content.decode(enc)
                break
            except UnicodeDecodeError:
                continue
        lines = (text or "").splitlines()
        start = 0
        for i, line in enumerate(lines[:15]):
            cells = [c for c in re.split(r",|;|\t", line) if c.strip() and not re.fullmatch(r"[-\d.,()₹£$ ]+", c.strip())]
            if len(cells) >= 3:
                start = i
                break
        df = pd.read_csv(io.StringIO("\n".join(lines[start:])), dtype=str, keep_default_na=False, sep=None, engine="python")
    else:
        raw = pd.read_excel(io.BytesIO(content), header=None, dtype=object)
        start = 0
        for i in range(min(15, len(raw))):
            cells = [c for c in raw.iloc[i].tolist() if isinstance(c, str) and c.strip()]
            if len(cells) >= 3:
                start = i
                break
        df = pd.read_excel(io.BytesIO(content), header=start, dtype=object)
    df = df.dropna(how="all")
    df.columns = [str(c).strip() for c in df.columns]
    df = df.loc[:, [c for c in df.columns if c and not c.lower().startswith("unnamed")]]
    rows = df.where(df.notna(), None).to_dict(orient="records")
    return list(df.columns), rows


def normalise(rows: List[Dict[str, Any]], roles: Dict[str, Optional[str]], side: str, flip: bool = False) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
    """Rows in the common shape, plus rows that could not be read (with the reason)."""
    order = detect_date_order([r.get(roles["date"]) for r in rows[:500]]) if roles.get("date") else "DMY"
    out, skipped = [], []
    for i, r in enumerate(rows):
        amt: Optional[float] = None
        if roles.get("amount"):
            amt = parse_amount(r.get(roles["amount"]))
            if amt is not None and roles.get("drcr"):
                flag = str(r.get(roles["drcr"]) or "").strip().lower()
                if flag.startswith("d") and amt > 0:
                    amt = -amt
        if amt is None and (roles.get("debit") or roles.get("credit")):
            dr = parse_amount(r.get(roles["debit"])) if roles.get("debit") else None
            cr = parse_amount(r.get(roles["credit"])) if roles.get("credit") else None
            if dr is not None or cr is not None:
                amt = round((cr or 0.0) - abs(dr or 0.0), 2)
        d = parse_date(r.get(roles["date"]), order) if roles.get("date") else None
        if amt is None:
            if any(str(v or "").strip() for v in r.values()):
                text = " ".join(str(v) for v in r.values() if v is not None).lower()
                if not re.search(r"opening|closing|balance b/?f|balance c/?f|total", text):
                    skipped.append({"side": side, "row": i + 2, "reason": "No amount could be read"})
            continue
        if amt == 0:
            continue
        ref = str(r.get(roles["reference"]) or "").strip() if roles.get("reference") else ""
        desc = str(r.get(roles["description"]) or "").strip() if roles.get("description") else ""
        cp = str(r.get(roles["counterparty"]) or "").strip() if roles.get("counterparty") else ""
        ccy = str(r.get(roles["currency"]) or "").strip().upper() if roles.get("currency") else ""
        out.append({
            "id": f"{side}{len(out) + 1}",
            "side": side,
            "source_row": i + 2,
            "date": d.isoformat() if d else None,
            "amount": round(-amt if flip else amt, 2),
            "reference": ref,
            "description": desc[:300],
            "counterparty": cp,
            "currency": ccy,
            "keys": reference_keys(ref, desc),
            "names": name_tokens(cp, desc),
        })
    return out, skipped
