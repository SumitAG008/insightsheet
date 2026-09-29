"""
Search and suggestions that improve as people use Meldra.

Learns only from usage signals already recorded as user activity: which tool pages people open and
when, and which tool they pick after searching. File contents are never used. Signals are deleted by
the retention job (app/services/data_retention.py), so the model always reflects recent behaviour.

Search score for a tool = how well the words match (names, synonyms, typos)
                        + what everyone picked for similar words before (learned vocabulary)
                        + how much this person uses the tool (recent use counts more).
Suggestions = this person's recent and routine use (same weekday and time of day)
            + the tool people usually open next after the one just used.
The shared parts are rebuilt from the latest signals every few minutes ("retrained").
"""
import difflib
import json
import math
import re
import threading
import time
from collections import Counter, defaultdict
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple

from sqlalchemy.orm import Session

from app.database import UserActivity


@dataclass(frozen=True)
class Tool:
    id: str
    title: str
    path: str
    description: str
    keywords: Tuple[str, ...] = ()


TOOLS: Tuple[Tool, ...] = (
    Tool("excel_to_ppt", "Excel to PowerPoint", "/FileToPPT", "Turn spreadsheets and CSV files into slides with their charts and tables",
         ("excel to ppt", "excel to powerpoint", "xlsx to pptx", "spreadsheet to slides", "charts to slides", "csv to ppt", "presentation", "deck", "slides")),
    Tool("filename_cleaner", "Filename Cleaner", "/FilenameCleaner", "Clean, rename or replace text in many file names at once, inside a ZIP",
         ("rename files", "file names", "bulk rename", "replace in file names", "clean names", "zip", "remove spaces", "tidy files")),
    Tool("pdf_editor", "PDF Editor", "/PDFEditor", "Merge, split, reorder, rotate and edit PDF files",
         ("merge pdf", "split pdf", "combine pdf", "rotate pdf", "edit pdf", "pdf pages")),
    Tool("pdf_doc_converter", "PDF and Document Converter", "/PdfDocConverter", "Convert between PDF, Word, Excel and images",
         ("pdf to word", "word to pdf", "pdf to excel", "excel to pdf", "docx", "convert document", "pdf to image")),
    Tool("ocr", "OCR Converter", "/OCRConverter", "Read text from scanned documents and images",
         ("ocr", "scan to text", "image to text", "scanned pdf", "extract text", "read text from image")),
    Tool("file_analyzer", "File Analyzer", "/FileAnalyzer", "AI summary and insights for a spreadsheet",
         ("analyse", "analyze", "insights", "summary", "profile data", "understand spreadsheet")),
    Tool("pl_builder", "P&L Builder", "/PLBuilder", "Build a profit and loss statement from a prompt or a trial balance",
         ("p&l", "profit and loss", "income statement", "trial balance", "financial statement", "pnl")),
    Tool("reconciliation", "Reconciliation", "/Reconciliation", "Match two files and find the differences, e.g. bank vs ledger",
         ("reconcile", "bank reconciliation", "bank rec", "match", "compare files", "ledger", "differences")),
    Tool("auto_standardize", "Auto Standardize", "/AutoStandardize", "Clean and standardise messy spreadsheet data",
         ("clean data", "standardise", "standardize", "dedupe", "duplicates", "fix formats", "data cleaning")),
    Tool("unified_reporting", "Unified Reporting", "/UnifiedReporting", "Combine exports from several systems and ask questions across them",
         ("report", "dashboard", "combine data", "multiple sources", "cross system", "kpi", "bi", "join files")),
    Tool("migration", "Migration", "/Migration", "Map and validate data for moving between systems (SAP, SuccessFactors, Workday)",
         ("migration", "data migration", "mapping", "sap", "successfactors", "workday", "load file", "payroll")),
    Tool("invoice_extractor", "Invoice Extractor", "/InvoiceExtractor", "Pull header fields and line items out of invoices into Excel",
         ("invoice", "extract invoice", "scanned invoice", "line items", "accounts payable", "receipts", "bills")),
    Tool("database_connection", "Database Connection", "/DatabaseConnection", "Connect to a database and run read-only queries",
         ("database", "sql", "postgres", "mysql", "query", "connect")),
    Tool("data_model_creator", "Data Model Creator", "/DataModelCreator", "Design a data model from your tables",
         ("data model", "schema", "erd", "tables", "relationships")),
    Tool("agentic_ai", "AI Agent", "/AgenticAI", "Describe a task in plain words and let AI plan and run the steps",
         ("ai", "agent", "automate", "workflow", "prompt", "ask ai", "automation")),
    Tool("web_scraper", "Web Data Connector", "/PlaywrightConnector", "Collect table data from a public website",
         ("scrape", "website data", "web table", "crawl")),
    Tool("settings", "Settings", "/Settings", "Profile, language, branding and signed-in devices",
         ("settings", "devices", "sign out", "profile", "language", "branding")),
)
TOOLS_BY_ID = {t.id: t for t in TOOLS}
TOOLS_BY_PATH = {t.path.lower(): t for t in TOOLS}

HALF_LIFE_DAYS = 14.0  # a use two weeks ago counts half as much as one today
SESSION_GAP = timedelta(minutes=30)
MODEL_TTL_SECONDS = 600
LOOKBACK = timedelta(days=90)

_WORD = re.compile(r"[a-z0-9&]+")


def _stem(word: str) -> str:
    """Crude English stemming so "invoices"/"invoice" and "renaming"/"rename" meet."""
    if len(word) <= 4:
        return word
    if word.endswith("ies"):
        return word[:-3] + "y"
    if word.endswith(("sses", "xes", "zes", "ches", "shes")):
        return word[:-2]
    for suffix in ("ing", "ers", "er", "ed", "s"):
        if len(word) > len(suffix) + 2 and word.endswith(suffix) and not word.endswith("ss"):
            return word[: -len(suffix)]
    return word


def tokens(text: str) -> List[str]:
    return [_stem(w) for w in _WORD.findall((text or "").lower())]


def tool_for_path(path: Optional[str]) -> Optional[Tool]:
    if not path:
        return None
    return TOOLS_BY_PATH.get(path.split("?")[0].rstrip("/").lower())


# ---------------------------------------------------------------- the shared (retrained) model

@dataclass
class SharedModel:
    built_at: float = 0.0
    term_tool: Dict[str, Counter] = field(default_factory=lambda: defaultdict(Counter))  # learned vocabulary
    next_tool: Dict[str, Counter] = field(default_factory=lambda: defaultdict(Counter))  # what people open next


_model = SharedModel()
_model_lock = threading.Lock()


def _search_query(details: Optional[str]) -> str:
    try:
        return str(json.loads(details or "{}").get("q") or "")[:100]
    except (ValueError, TypeError, AttributeError):
        return ""


def build_shared_model(db: Session, now: Optional[datetime] = None) -> SharedModel:
    """Retrain the shared parts from recent signals of all users."""
    now = now or datetime.utcnow()
    rows = (
        db.query(UserActivity.user_email, UserActivity.activity_type, UserActivity.page_name, UserActivity.details, UserActivity.created_date)
        .filter(UserActivity.created_date >= now - LOOKBACK, UserActivity.activity_type.in_(("page_view", "search_choice")))
        .order_by(UserActivity.user_email, UserActivity.created_date)
        .all()
    )
    model = SharedModel(built_at=time.time())
    last_by_user: Dict[str, Tuple[str, datetime]] = {}
    for email, kind, page, details, at in rows:
        tool = tool_for_path(page)
        if tool is None:
            continue
        if kind == "search_choice":
            for term in set(tokens(_search_query(details))):
                model.term_tool[term][tool.id] += 1
            continue
        prev = last_by_user.get(email)
        if prev and prev[0] != tool.id and at - prev[1] <= SESSION_GAP:
            model.next_tool[prev[0]][tool.id] += 1
        last_by_user[email] = (tool.id, at)
    return model


def shared_model(db: Session) -> SharedModel:
    global _model
    if time.time() - _model.built_at > MODEL_TTL_SECONDS:
        with _model_lock:
            if time.time() - _model.built_at > MODEL_TTL_SECONDS:
                _model = build_shared_model(db)
    return _model


def reset_model() -> None:
    global _model
    with _model_lock:
        _model = SharedModel()


# ---------------------------------------------------------------- per-user signals

def _user_uses(db: Session, email: str, now: datetime) -> List[Tuple[Tool, datetime]]:
    rows = (
        db.query(UserActivity.page_name, UserActivity.created_date)
        .filter(UserActivity.user_email == email, UserActivity.activity_type == "page_view",
                UserActivity.created_date >= now - LOOKBACK)
        .order_by(UserActivity.created_date)
        .all()
    )
    return [(t, at) for page, at in rows if (t := tool_for_path(page))]


def _recency_weights(uses: List[Tuple[Tool, datetime]], now: datetime) -> Counter:
    weights: Counter = Counter()
    for tool, at in uses:
        age = max(0.0, (now - at).total_seconds() / 86400)
        weights[tool.id] += 0.5 ** (age / HALF_LIFE_DAYS)
    return weights


# ---------------------------------------------------------------- search

def _match(term: str, vocab: List[str]) -> float:
    best = 0.0
    for v in vocab:
        if term == v:
            return 1.0
        if len(term) >= 3 and (v.startswith(term) or term.startswith(v)):
            best = max(best, 0.8)
        elif len(term) >= 4 and difflib.SequenceMatcher(None, term, v).ratio() >= 0.8:
            best = max(best, 0.6)  # typo
    return best


def search(db: Session, email: str, query: str, limit: int = 8, now: Optional[datetime] = None) -> List[dict]:
    now = now or datetime.utcnow()
    q_terms = tokens(query)
    if not q_terms:
        return suggestions(db, email, limit=limit, now=now)
    model = shared_model(db)
    usage = _recency_weights(_user_uses(db, email, now), now)
    top_usage = max(usage.values(), default=0.0) or 1.0
    q_text = " ".join(q_terms)
    results = []
    for tool in TOOLS:
        vocab = tokens(" ".join((tool.title, tool.description) + tool.keywords))
        text = sum(_match(t, vocab) for t in q_terms) / len(q_terms)
        if any(q_text in " ".join(tokens(k)) for k in tool.keywords + (tool.title,)):
            text = min(1.0, text + 0.3)  # the whole phrase matches a known name
        learned = 0.0
        for t in q_terms:
            counts = model.term_tool.get(t)
            if counts:
                learned += counts[tool.id] / (sum(counts.values()) + 2)  # smoothed share of past picks
        learned /= len(q_terms)
        personal = usage.get(tool.id, 0.0) / top_usage
        score = 0.6 * text + 0.3 * learned + 0.1 * personal
        if text >= 0.5 or learned >= 0.2:
            reason = "Popular for this search" if learned >= 0.2 and learned * 0.3 > text * 0.6 else None
            results.append((score, tool, reason))
    results.sort(key=lambda r: -r[0])
    return [_as_result(tool, score, reason) for score, tool, reason in results[:limit]]


# ---------------------------------------------------------------- suggestions

def suggestions(db: Session, email: str, limit: int = 6, now: Optional[datetime] = None) -> List[dict]:
    now = now or datetime.utcnow()
    uses = _user_uses(db, email, now)
    usage = _recency_weights(uses, now)
    model = shared_model(db)

    # Routine: uses on the same weekday within two hours of the current time.
    routine: Counter = Counter()
    for tool, at in uses:
        if at.weekday() == now.weekday() and abs(at.hour - now.hour) <= 2:
            routine[tool.id] += 1

    scores: Dict[str, float] = defaultdict(float)
    reasons: Dict[str, str] = {}
    top_usage = max(usage.values(), default=0.0) or 1.0
    for tid, w in usage.items():
        scores[tid] += w / top_usage
        reasons.setdefault(tid, "You use this often")
    for tid, n in routine.items():
        if n >= 2:
            scores[tid] += 0.5
            reasons[tid] = f"You usually use this on {now.strftime('%A')}s around this time"
    if uses:
        last = uses[-1][0].id
        nxt = model.next_tool.get(last)
        if nxt:
            total = sum(nxt.values())
            for tid, n in nxt.most_common(3):
                if n >= 2:
                    scores[tid] += 0.6 * n / total
                    if tid not in usage or scores[tid] < 1:
                        reasons[tid] = f"Often used after {TOOLS_BY_ID[last].title}"
    if len(scores) < limit:  # new users: start with the most used tools overall
        popular: Counter = Counter()
        for counts in model.next_tool.values():
            popular.update(counts)
        for tid, _ in popular.most_common(limit):
            if tid not in scores:
                scores[tid] = 0.01
                reasons[tid] = "Popular with Meldra users"
        for default in ("excel_to_ppt", "filename_cleaner", "unified_reporting", "pdf_doc_converter", "reconciliation", "pl_builder"):
            if len(scores) >= limit:
                break
            if default not in scores:
                scores[default] = 0.0
                reasons[default] = "Popular with Meldra users"
    ranked = sorted(scores.items(), key=lambda kv: -kv[1])[:limit]
    return [_as_result(TOOLS_BY_ID[tid], s, reasons.get(tid)) for tid, s in ranked if tid in TOOLS_BY_ID]


def _as_result(tool: Tool, score: float, reason: Optional[str]) -> dict:
    return {"id": tool.id, "title": tool.title, "path": tool.path, "description": tool.description,
            "reason": reason, "score": round(score, 4)}


def record_search_choice(db: Session, email: str, query: str, tool_id: str) -> bool:
    """Remember which tool a search led to; only the (shortened) search words and the tool are kept."""
    tool = TOOLS_BY_ID.get(tool_id)
    if tool is None:
        return False
    q = " ".join((query or "").split())[:100]
    db.add(UserActivity(user_email=email, activity_type="search_choice", page_name=tool.path, details=json.dumps({"q": q})))
    db.commit()
    return True
