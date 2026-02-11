"""
FastAPI Backend for InsightSheet-lite
Privacy-first data analysis platform with ZERO data storage
"""
from fastapi import (
    FastAPI,
    Depends,
    HTTPException,
    status,
    Request,
    Response,
    Form,
    UploadFile,
    File,
    Query,
)
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, JSONResponse
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from pydantic import BaseModel, EmailStr, Field
from typing import Optional, Dict, Any, List
from datetime import timedelta, datetime
import uuid
import asyncio
import base64
import io
import time
import os
import logging
from logging.handlers import RotatingFileHandler
import json
import re
import secrets
import shutil
import threading
import tempfile
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

from dotenv import load_dotenv
from sqlalchemy.orm import Session
from sqlalchemy import func, and_
import httpx

# Import local modules
from app.database import get_db, User, Subscription, LoginHistory, UserActivity, FileProcessingHistory, ConsentLog, ApiKey, ApiKeyIssuanceLog, ApiUsage, ApiBilling, SubscriptionEventLog, init_db
from app.utils.auth import (
    authenticate_user, create_access_token, get_current_user, get_current_admin_user,
    get_password_hash, ACCESS_TOKEN_EXPIRE_MINUTES
)
from app.services.ai_service import (
    invoke_llm, generate_image, generate_formula, analyze_data, suggest_chart_type,
    generate_transform, explain_sql
)
from app.services.zip_processor import ZipProcessorService
from app.services.excel_to_ppt import ExcelToPPTService
from app.services.ocr_service import (
    OCRService,
    OCR_SPACE_MAX_BYTES,
    extract_with_layout_ocrspace,
    pdf_from_image,
)
from app.services.file_analyzer import FileAnalyzerService
from app.services.pl_builder import PLBuilderService
from app.services.universal_excel_processor import UniversalExcelProcessor
from app.services.excel_recalc_service import recalc_xlsx_with_libreoffice_bytes
from app.services.ingestion_service import IngestionService, IngestLimits, build_ingestion_prompt_block
from app.services.standardize_service import StandardizeService, StandardizeOptions
from app.services.reconciliation_service import ReconciliationService, ReconcileOptions
from app.services.email_service import send_password_reset_email, send_welcome_email, send_verification_email, send_api_key_email, send_trial_deletion_warning_email, send_credentials_deleted_email
from app.services.db_connection_service import DatabaseConnectionService
from app.services.security_ai_service import SecurityAIService
from app.services.api_key_service import (
    generate_api_key, verify_api_key, get_api_key_by_header, track_api_usage,
    get_usage_stats, get_monthly_billing, update_monthly_billing
)
from app.services.document_converter_service import (
    pdf_to_docx,
    pdf_to_docx_smart,
    docx_to_pdf,
    pptx_to_pdf,
    pdf_to_pptx,
    docx_to_xlsx_structured,
    pdf_to_xlsx_structured,
    pptx_to_xlsx_structured,
)
from app.services.compliance_ai_service import ComplianceAIService
from app.services.predictive_ml_service import PredictiveMLService
from app.services.excel_ops_service import ExcelOpsService
from app.services.xlsx_chart_service import XlsxChartService
from app.services.watermark_service import (
    should_apply_watermark,
    watermark_pdf_bytes,
    watermark_pptx_bytes,
    watermark_xlsx_bytes,
)
from PIL import Image


def _ascii_safe_filename(name: str) -> str:
    s = (name or "").strip() or "file"
    s = re.sub(r"\s+", "_", s)
    try:
        s = s.encode("ascii", "ignore").decode("ascii")
    except Exception:
        s = re.sub(r"[^A-Za-z0-9._-]+", "_", s)
    s = re.sub(r"[^A-Za-z0-9._-]+", "_", s)
    s = re.sub(r"_+", "_", s).strip("._-")
    return s or "file"


def _get_request_id(request: Request) -> str:
    rid = None
    try:
        rid = request.headers.get("X-Request-Id")
    except Exception:
        rid = None

    rid = (rid or "").strip()
    if not rid:
        return str(uuid.uuid4())

    # keep dedupe keys sane in DB
    if len(rid) > 128:
        return rid[:128]
    return rid


class SupportChatRequest(BaseModel):
    message: str
    page: Optional[str] = None


def _finance_fast_answer(message: str) -> Optional[str]:
    m = (message or "").strip().lower()
    if not m:
        return None

    def has_any(*terms: str) -> bool:
        return any(t in m for t in terms)

    # Forecasting / SaaS finance
    if has_any("arr", "mrr", "churn", "run rate", "runrate", "forecast", "projection", "budget"):
        return (
            "Quick finance answer (SaaS / forecasting):\n\n"
            "Formulas:\n"
            "- MRR = SUM(Recurring_Revenue_Month)\n"
            "- ARR = MRR * 12\n"
            "- Gross Margin % = (Revenue - COGS) / Revenue\n"
            "- Net Revenue Retention (NRR) = (StartMRR + Expansion - Churn - Contraction) / StartMRR\n"
            "- Churn % (logo) = Lost_Customers / Start_Customers\n"
            "- Churn % (revenue) = Lost_MRR / Start_MRR\n\n"
            "In Meldra (fast workflow):\n"
            "Step 1: Upload your sheet (monthly revenue, customers, COGS).\n"
            "Step 2: Transform Data → create derived columns (ARR, GrossMargin).\n"
            "Step 3: Analysis & Cleaning → Charts → line chart by Month.\n"
            "Step 4: If you want a forecast column, tell me your time column + metric column + forecast horizon (e.g. 6 months)."
        )

    # Dividend / stocks
    if has_any("dividend", "dividends", "div yield", "yield") and has_any("stock", "share", "price", "ticker", "equity"):
        return (
            "Quick finance answer (dividends):\n\n"
            "Formulas:\n"
            "- Dividend Yield = Annual_Dividends_Per_Share / Current_Price\n"
            "- Payout Ratio = Dividends / Net_Income\n\n"
            "In Meldra:\n"
            "Step 1: Upload a table with Price, Dividend (annual or per period).\n"
            "Step 2: Transform Data → create column dividend_yield.\n"
            "Step 3: Charts → plot yield by date or by ticker."
        )

    # CAGR / returns
    if has_any("cagr", "compound annual", "annualized", "return", "returns"):
        return (
            "Quick finance answer (returns / CAGR):\n\n"
            "Formulas:\n"
            "- Total Return = (End_Value - Start_Value + Cash_Flows) / Start_Value\n"
            "- CAGR = (End_Value / Start_Value)^(1/Years) - 1\n"
            "- Annualized Volatility (approx) = STDEV(Daily_Returns) * SQRT(252)\n\n"
            "In Meldra:\n"
            "Step 1: Upload values by date.\n"
            "Step 2: Transform Data → create daily_return = (value/lag(value)) - 1 (tell me your column names and I will give exact steps).\n"
            "Step 3: Charts → line chart for value, histogram for returns."
        )

    # NPV / IRR
    if has_any("npv", "irr", "discount rate", "discount"):
        return (
            "Quick finance answer (NPV / IRR):\n\n"
            "Excel/Sheets formulas:\n"
            "- NPV = NPV(discount_rate, cashflows_range) + initial_investment\n"
            "- IRR = IRR(cashflows_range)\n\n"
            "Notes:\n"
            "- Cashflows typically include the initial investment as a negative number, followed by inflows/outflows by period.\n\n"
            "In Meldra:\n"
            "Step 1: Upload a cashflow table (Period, Cashflow).\n"
            "Step 2: If you want a computed NPV column, tell me your discount rate and cashflow column; I will generate an operation plan for you."
        )

    # Crypto PnL
    if has_any("crypto", "btc", "eth", "pnl", "p&l", "wallet", "average cost", "avg cost", "cost basis"):
        return (
            "Quick finance answer (crypto P&L / cost basis):\n\n"
            "Common calculations:\n"
            "- Average Cost Basis = Total_Cost / Total_Units\n"
            "- Unrealized P&L = (Current_Price - Avg_Cost) * Units\n"
            "- ROI % = (Current_Value - Total_Cost) / Total_Cost\n\n"
            "In Meldra:\n"
            "Step 1: Upload trades with Date, Asset, Side, Units, Price, Fees.\n"
            "Step 2: Transform Data → compute Cost = Units*Price + Fees and group by Asset.\n"
            "Step 3: If you share your column names, I’ll provide an exact step plan to compute average cost and P&L."
        )

    return None


def _support_keyword_answer(message: str) -> Optional[str]:
    m = (message or "").strip().lower()
    if not m:
        return None
    if len(m) > 40 and " " in m:
        return None

    aliases = {
        "vlookup": "vlookup",
        "vloookup": "vlookup",
        "xlookup": "xlookup",
        "lookup": "lookup",
        "join": "join",
        "merge": "join",
    }
    key = aliases.get(m)
    if not key:
        return None

    if key in ("vlookup", "xlookup", "lookup"):
        return (
            "Here are the fastest ways to do a VLOOKUP/XLOOKUP-style task in Meldra. Pick one:\n\n"
            "Option A (Recommended): Excel Ops (server-side transformation)\n"
            "- Use a lookup join between your main sheet and a lookup sheet.\n"
            "- Best when you want a clean output file (CSV) + preview rows.\n"
            "Next: reply with the column names you want to match (left key, right key) and which columns you want to bring in.\n\n"
            "Option B: Excel formulas (in Excel/Sheets)\n"
            "- If you want the result inside Excel, use XLOOKUP/VLOOKUP in the spreadsheet.\n\n"
            "If you want Option A, tell me:\n"
            "1) Main sheet name (or say 'first sheet')\n"
            "2) Lookup sheet name\n"
            "3) Match columns (e.g. CustomerId -> CustomerId)\n"
            "4) Columns to return (e.g. CustomerName, Segment)\n"
            "Then I will generate the exact Excel Ops plan JSON for you."
        )

    if key == "join":
        return (
            "Join/Merge in Meldra (quick guide):\n\n"
            "Option A: Excel Ops join (Recommended)\n"
            "- Left join / inner join between two inputs (two sheets or two files).\n"
            "- Use it for lookups, enriching data, and combining datasets.\n\n"
            "To generate the exact plan JSON, reply with:\n"
            "- left sheet name + right sheet name\n"
            "- join keys (e.g. OrderId = OrderId)\n"
            "- join type (left/inner)\n"
            "- which right-side columns you want to bring in."
        )

    return None


def _is_disallowed_support_question(message: str) -> bool:
    m = (message or "").lower()
    disallowed_markers = [
        "migration", "sqlalchemy",
        "deploy", "deployment", "railway", "docker", "kubernetes",
        "log", "logs", "traceback", "stack trace",
        "openai_api_key", "api key secret", "environment variable",
        "source code", "codebase", "github", "commit",
    ]
    return any(s in m for s in disallowed_markers)


def _find_kb_file_path() -> Optional[str]:
    env_path = os.getenv("AI_ASSISTANT_KB_PATH", "").strip()
    if env_path and os.path.exists(env_path):
        return env_path

    filename = "MELDRA_AI_ASSISTANT_KB.md"
    candidates = []

    # current working directory
    candidates.append(os.path.join(os.getcwd(), filename))

    # repo-root relative from backend/app/main.py
    here = os.path.dirname(os.path.abspath(__file__))
    candidates.append(os.path.normpath(os.path.join(here, "..", "..", "..", filename)))
    candidates.append(os.path.normpath(os.path.join(here, "..", "..", filename)))

    for p in candidates:
        if os.path.exists(p):
            return p
    return None


def _load_kb_text() -> str:
    kb_path = _find_kb_file_path()
    if not kb_path:
        raise FileNotFoundError("KB file not found. Expected MELDRA_AI_ASSISTANT_KB.md")
    with open(kb_path, "r", encoding="utf-8") as f:
        return f.read()


def _split_kb_sections(kb_text: str) -> List[Dict[str, str]]:
    lines = (kb_text or "").splitlines()
    sections: List[Dict[str, str]] = []
    current_title = "KB"
    current_buf: List[str] = []

    def flush():
        nonlocal current_title, current_buf
        content = "\n".join(current_buf).strip()
        if content:
            sections.append({"title": current_title, "content": content})
        current_buf = []

    for line in lines:
        if line.startswith("## "):
            flush()
            current_title = line.replace("## ", "").strip()
            current_buf.append(line)
        else:
            current_buf.append(line)

    flush()
    return sections


def _extract_keywords(text: str) -> List[str]:
    import re
    stop = {
        "the", "a", "an", "and", "or", "to", "of", "in", "on", "for", "with", "is", "are",
        "i", "you", "we", "it", "this", "that", "from", "as", "at", "be", "by", "how",
    }
    words = re.findall(r"[a-z0-9_-]+", (text or "").lower())
    out = []
    for w in words:
        if len(w) < 3:
            continue
        if w in stop:
            continue
        out.append(w)
    return list(dict.fromkeys(out))


def _select_relevant_kb_sections(kb_text: str, message: str, top_k: int = 5) -> List[Dict[str, str]]:
    sections = _split_kb_sections(kb_text)
    q_words = set(_extract_keywords(message))
    scored = []
    for s in sections:
        s_words = set(_extract_keywords(s["content"]))
        score = len(q_words.intersection(s_words))
        scored.append((score, s))

    scored.sort(key=lambda t: t[0], reverse=True)
    picked = [s for score, s in scored if score > 0][:top_k]
    if not picked:
        picked = sections[: min(top_k, len(sections))]
    return picked

load_dotenv()

# Logging configuration
LOG_DIR = "logs"
os.makedirs(LOG_DIR, exist_ok=True)

formatter = logging.Formatter(
    '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

file_handler = RotatingFileHandler(
    os.path.join(LOG_DIR, 'app.log'),
    maxBytes=10485760,  # 10MB
    backupCount=5
)
file_handler.setFormatter(formatter)

logger = logging.getLogger(__name__)


def _first_day_next_month_utc(dt: datetime) -> datetime:
    year = dt.year
    month = dt.month
    if month == 12:
        return datetime(year + 1, 1, 1)
    return datetime(year, month + 1, 1)


def _ensure_subscription_monthly_resets(subscription: Subscription, db: Session) -> None:
    now = datetime.utcnow()

    if subscription.ai_queries_reset_at is None:
        subscription.ai_queries_reset_at = _first_day_next_month_utc(now)

    if subscription.ai_queries_reset_at is not None and now >= subscription.ai_queries_reset_at:
        subscription.ai_queries_used = 0
        subscription.ai_queries_reset_at = _first_day_next_month_utc(now)

    # Reuse workflow_runs_* counters as monthly upload-bytes meters.
    if subscription.workflow_runs_reset_at is None:
        subscription.workflow_runs_reset_at = _first_day_next_month_utc(now)

    if subscription.workflow_runs_reset_at is not None and now >= subscription.workflow_runs_reset_at:
        subscription.workflow_runs_used = 0
        subscription.workflow_runs_reset_at = _first_day_next_month_utc(now)

    if subscription.conversions_reset_at is None:
        subscription.conversions_reset_at = _first_day_next_month_utc(now)

    if subscription.conversions_reset_at is not None and now >= subscription.conversions_reset_at:
        subscription.conversions_used = 0
        subscription.conversions_reset_at = _first_day_next_month_utc(now)

    db.commit()


def _get_or_create_subscription(db: Session, user_email: str) -> Subscription:
    subscription = db.query(Subscription).filter(Subscription.user_email == user_email).first()
    if subscription:
        _ensure_subscription_monthly_resets(subscription, db)
        _apply_admin_entitlements(subscription, user_email)
        db.commit()
        return subscription

    subscription = Subscription(
        user_email=user_email,
        plan="free",
        status="active",
        # ai_queries_* is treated as monthly AI tokens meter.
        ai_queries_limit=int(os.getenv("FREE_AI_TOKENS_LIMIT", os.getenv("FREE_AI_QUERIES_LIMIT", "100"))),
        ai_queries_used=0,
        payment_status="unpaid",
        # workflow_runs_* is treated as monthly upload-bytes meter.
        # Default: 10MB/month for free tier.
        workflow_runs_limit=int(os.getenv("FREE_UPLOAD_BYTES_LIMIT", str(10 * 1024 * 1024))),
        workflow_runs_used=0,
        # conversions_* is treated as monthly transactions meter.
        conversions_limit=int(os.getenv("FREE_TRANSACTIONS_LIMIT", os.getenv("FREE_CONVERSIONS_LIMIT", "50"))),
        conversions_used=0,
    )

    now = datetime.utcnow()
    try:
        trial_days = int(os.getenv("FREE_TRIAL_DAYS", "60"))
    except Exception:
        trial_days = 60
    subscription.trial_start_date = now
    subscription.trial_end_date = now + timedelta(days=max(1, trial_days))

    db.add(subscription)
    db.commit()
    db.refresh(subscription)
    _ensure_subscription_monthly_resets(subscription, db)
    _apply_admin_entitlements(subscription, user_email)
    db.commit()
    return subscription


async def _run_free_trial_lifecycle_once(db: Session, now: datetime) -> Dict[str, int]:
    warning_days_before = 5

    subs = db.query(Subscription).filter(
        Subscription.plan == "free",
        Subscription.trial_end_date.isnot(None),
    ).all()

    warned = 0
    deleted = 0
    for sub in subs:
        if sub.trial_end_date is None:
            continue

        deletion_date = sub.trial_end_date
        warning_at = deletion_date - timedelta(days=warning_days_before)

        if now >= warning_at and getattr(sub, "trial_warning_sent_at", None) is None and now < deletion_date:
            user = db.query(User).filter(User.email == sub.user_email).first()
            full_name = getattr(user, "full_name", "") if user else ""
            ok = await send_trial_deletion_warning_email(
                sub.user_email,
                full_name,
                deletion_date.replace(microsecond=0).isoformat() + "Z",
            )
            if ok:
                sub.trial_warning_sent_at = now
                db.commit()
                warned += 1

        if now >= deletion_date and getattr(sub, "credentials_deleted_at", None) is None:
            user = db.query(User).filter(User.email == sub.user_email).first()
            full_name = getattr(user, "full_name", "") if user else ""

            if getattr(sub, "deletion_email_sent_at", None) is None:
                ok = await send_credentials_deleted_email(sub.user_email, full_name)
                if ok:
                    sub.deletion_email_sent_at = now
                    db.commit()

            if user is not None:
                db.delete(user)
                db.commit()

            sub.credentials_deleted_at = now
            sub.status = "expired"
            sub.ai_queries_limit = 0
            db.commit()
            deleted += 1

    return {"warned": warned, "deleted": deleted}


async def _background_free_trial_lifecycle() -> None:
    from app.database import SessionLocal

    while True:
        try:
            now = datetime.utcnow()
            db = SessionLocal()
            try:
                await _run_free_trial_lifecycle_once(db, now)
            finally:
                db.close()
        except Exception:
            # Never crash server due to lifecycle task
            pass
        await asyncio.sleep(60 * 60 * 12)


def _enforce_verified_user(db: Session, user_email: str) -> None:
    user = db.query(User).filter(User.email == user_email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if hasattr(user, "is_verified") and not user.is_verified:
        raise HTTPException(status_code=403, detail="Please verify your email address to use this feature")


def _enforce_ai_quota(subscription: Subscription) -> None:
    if (subscription.status or "").lower() != "active":
        raise HTTPException(status_code=403, detail="Subscription inactive")
    if subscription.ai_queries_limit is not None and subscription.ai_queries_limit >= 0:
        if (subscription.ai_queries_used or 0) >= subscription.ai_queries_limit:
            raise HTTPException(status_code=429, detail="AI token limit reached. Upgrade to increase limits.")


def _consume_ai_quota(db: Session, subscription: Subscription, tokens_used: int) -> None:
    if subscription.ai_queries_limit is not None and subscription.ai_queries_limit >= 0:
        inc = int(tokens_used or 0)
        if inc < 0:
            inc = 0
        subscription.ai_queries_used = int(subscription.ai_queries_used or 0) + inc
        db.commit()


def _enforce_upload_quota(subscription: Subscription, bytes_to_add: int) -> None:
    if (subscription.status or "").lower() != "active":
        raise HTTPException(status_code=403, detail="Subscription inactive")
    limit = int(getattr(subscription, "workflow_runs_limit", 0) or 0)
    used = int(getattr(subscription, "workflow_runs_used", 0) or 0)
    add = int(bytes_to_add or 0)
    if add < 0:
        add = 0
    if limit >= 0 and (used + add) > limit:
        max_mb = max(1, int(limit / (1024 * 1024)))
        raise HTTPException(status_code=413, detail=f"Monthly upload limit exceeded ({max_mb}MB/month).")


def _consume_upload_bytes(db: Session, subscription: Subscription, bytes_used: int) -> None:
    inc = int(bytes_used or 0)
    if inc < 0:
        inc = 0
    subscription.workflow_runs_used = int(getattr(subscription, "workflow_runs_used", 0) or 0) + inc
    db.commit()


def _enforce_transactions_quota(subscription: Subscription) -> None:
    if (subscription.status or "").lower() != "active":
        raise HTTPException(status_code=403, detail="Subscription inactive")
    limit = int(getattr(subscription, "conversions_limit", 0) or 0)
    used = int(getattr(subscription, "conversions_used", 0) or 0)
    if limit >= 0 and used >= limit:
        raise HTTPException(status_code=429, detail="Transaction limit reached. Upgrade to increase limits.")


def _consume_transaction(db: Session, subscription: Subscription) -> None:
    subscription.conversions_used = int(getattr(subscription, "conversions_used", 0) or 0) + 1
    db.commit()


def _apply_admin_entitlements(subscription: Subscription, user_email: str) -> None:
    admin_email = (os.getenv("ADMIN_PREMIUM_EMAIL") or "sumitagaria@gmail.com").strip().lower()
    if (user_email or "").strip().lower() != admin_email:
        return
    subscription.plan = "premium"
    subscription.ai_queries_limit = -1
    subscription.workflow_runs_limit = -1
    subscription.conversions_limit = -1


def _estimate_tokens_from_text(text: str) -> int:
    t = (text or "")
    # Rough heuristic: ~4 characters per token for English.
    # This is only used when the provider does not return usage.
    return int((len(t) + 3) / 4)
logger.setLevel(logging.INFO)
logger.addHandler(file_handler)

# Initialize FastAPI app
app = FastAPI(
    title="InsightSheet-lite Backend",
    description="Privacy-first data analysis platform with AI-powered insights",
    version="1.0.0"
)

# CORS Configuration - SECURITY: Only HTTPS in production
# Detect if we're in production (Railway/Vercel) or local development
ENVIRONMENT = os.getenv("ENVIRONMENT", "production").lower()
IS_PRODUCTION = ENVIRONMENT == "production" or os.getenv("RAILWAY_ENVIRONMENT") is not None

# Base production origins (always HTTPS)
PRODUCTION_ORIGINS = [
    "https://meldra.ai",
    "https://insight.meldra.ai",
    "https://developer.meldra.ai",
    "https://meldra-six.vercel.app",
    "https://insightsheet-jpci.vercel.app",
    "https://meldra-q8c867yf4-sumit-ags-projects.vercel.app",
    "https://meldra-git-main-sumit-ags-projects.vercel.app",
    "https://meldra-ln9n3ezi7-sumit-ags-projects.vercel.app",
]

# Parse CORS_ORIGINS from environment (comma-separated)
CORS_ORIGINS_ENV = os.getenv("CORS_ORIGINS", "")
if CORS_ORIGINS_ENV:
    # Filter to only HTTPS origins in production
    env_origins = [origin.strip() for origin in CORS_ORIGINS_ENV.split(",")]
    if IS_PRODUCTION:
        # In production: ONLY allow HTTPS origins
        env_origins = [origin for origin in env_origins if origin.startswith("https://")]
    # Add environment origins
    PRODUCTION_ORIGINS.extend(env_origins)

# Add localhost ONLY in development
if not IS_PRODUCTION:
    PRODUCTION_ORIGINS.extend([
        "http://localhost:3000",
        "http://localhost:5173",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173",
    ])

# Remove duplicates while preserving order
ALLOWED_ORIGINS = list(dict.fromkeys(PRODUCTION_ORIGINS))

logger.info(f"CORS configured for environment: {ENVIRONMENT}")
logger.info(f"Allowed origins: {ALLOWED_ORIGINS}")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_origin_regex=r"^https://([a-z0-9-]+\.)*meldra\.ai$",
    allow_credentials=True,  # Required for cookies/auth
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["*"],
    expose_headers=["*"],
)

# Initialize database on startup
@app.on_event("startup")
async def startup_event():
    """Initialize database tables on startup"""
    init_db()
    logger.info("Database initialized")

    try:
        ttl_raw = os.getenv("CONVERSION_TEMP_TTL_SECONDS", "600").strip()
        ttl_seconds = int(ttl_raw) if ttl_raw else 600
    except Exception:
        ttl_seconds = 600
    ttl_seconds = max(60, min(ttl_seconds, 24 * 60 * 60))

    tmp_prefix = os.getenv("CONVERSION_TEMP_DIR_PREFIX", "meldra_conv_").strip() or "meldra_conv_"

    def _sweep_once() -> None:
        base_dir = os.getenv("CONVERSION_TEMP_DIR", "").strip() or tempfile.gettempdir()
        now = time.time()
        try:
            entries = os.listdir(base_dir)
        except Exception:
            return

        for name in entries:
            if not name.startswith(tmp_prefix):
                continue
            path = os.path.join(base_dir, name)
            try:
                st = os.stat(path)
            except Exception:
                continue
            if not os.path.isdir(path):
                continue
            age = now - float(getattr(st, "st_mtime", now))
            if age < ttl_seconds:
                continue
            try:
                shutil.rmtree(path, ignore_errors=True)
            except Exception:
                pass

    def _sweeper_loop() -> None:
        while True:
            try:
                _sweep_once()
            except Exception:
                # Never crash server due to cleanup task
                pass
            time.sleep(min(120, max(30, ttl_seconds // 4)))

    threading.Thread(target=_sweeper_loop, daemon=True).start()

    # Background TTL cleanup for session-scoped history
    asyncio.create_task(_background_cleanup_file_processing_history())

    asyncio.create_task(_background_free_trial_lifecycle())


# Pydantic Models
class UserRegister(BaseModel):
    email: EmailStr
    password: str
    full_name: Optional[str] = None


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str


class LLMRequest(BaseModel):
    prompt: str
    add_context_from_internet: bool = False
    response_json_schema: Optional[Dict[str, Any]] = None
    model: Optional[str] = None
    temperature: Optional[float] = None
    max_tokens: Optional[int] = None


class ImageGenerationRequest(BaseModel):
    prompt: str
    size: str = "1024x1024"


class FormulaRequest(BaseModel):
    description: str
    context: Optional[str] = None


class DataAnalysisRequest(BaseModel):
    data_summary: str
    question: Optional[str] = None


class ChartSuggestionRequest(BaseModel):
    columns: List[Dict[str, str]]
    data_preview: Optional[List[Dict]] = None


class TransformRequest(BaseModel):
    instruction: str
    columns: List[Dict[str, str]]
    sample_rows: Optional[List[Dict]] = None


class ExplainSqlRequest(BaseModel):
    sql: str
    db_schema: Optional[Dict[str, Any]] = Field(None, alias="schema")


class ZipProcessingOptions(BaseModel):
    allowed_chars: Optional[str] = None
    disallowed_chars: Optional[str] = None
    replace_char: str = "_"
    remove_spaces: bool = False
    max_length: int = 255
    languages: Optional[List[str]] = None


class ActivityLog(BaseModel):
    activity_type: str
    page_name: Optional[str] = None
    details: Optional[Any] = None  # Can be str, dict, or None - accepts any type


# ============================================================================
# AUTHENTICATION ENDPOINTS
# ============================================================================

@app.post("/api/auth/register")
async def register(user_data: UserRegister, db: Session = Depends(get_db)):
    """Register new user"""
    try:
        # Normalize email (case-insensitive uniqueness)
        user_data.email = (user_data.email or "").strip().lower()
        # Private beta: only allowed emails can register (stops non-invited users during testing)
        beta_mode = os.getenv("BETA_MODE", "").strip().lower() in ("1", "true", "yes")
        if beta_mode:
            allowed_raw = os.getenv("BETA_ALLOWED_EMAILS", "").strip()
            allowed = [e.strip().lower() for e in allowed_raw.split(",") if e.strip()]
            if user_data.email.strip().lower() not in allowed:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Meldra is in private beta. To request access, email support@meldra.ai."
                )

        # Check if user exists
        existing_user = db.query(User).filter(User.email == user_data.email).first()
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )

        existing_sub = db.query(Subscription).filter(Subscription.user_email == user_data.email).first()
        if existing_sub and existing_sub.plan == "free" and existing_sub.trial_start_date is not None:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Free trial already used for this email. Please upgrade to continue."
            )

        # Validate password strength
        if len(user_data.password) < 10:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Password must be at least 10 characters"
            )
        
        # Bcrypt has 72-byte limit, warn if password is very long
        password_bytes = user_data.password.encode('utf-8')
        if len(password_bytes) > 72:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Password is too long. Maximum 72 bytes allowed (your password is {len(password_bytes)} bytes). Please use a shorter password or remove special characters."
            )

        # Generate verification token
        verification_token = secrets.token_urlsafe(32)
        verification_expires = datetime.utcnow() + timedelta(hours=1)  # Token expires in 1 hour
        
        # Create new user (unverified by default)
        hashed_password = get_password_hash(user_data.password)
        new_user = User(
            email=user_data.email,
            full_name=user_data.full_name,
            hashed_password=hashed_password,
            role="admin" if user_data.email == "sumitagaria@gmail.com" else "user",
            is_verified=False,  # Account not verified until email is confirmed
            verification_token=verification_token,
            verification_token_expires=verification_expires
        )

        db.add(new_user)
        db.commit()
        db.refresh(new_user)

        # Create free subscription (but user can't use it until verified)
        if not existing_sub:
            subscription = Subscription(
                user_email=user_data.email,
                plan="free",
                status="active",
                ai_queries_limit=5,
                ai_queries_used=0
            )
            now = datetime.utcnow()
            try:
                trial_days = int(os.getenv("FREE_TRIAL_DAYS", "60"))
            except Exception:
                trial_days = 60
            subscription.trial_start_date = now
            subscription.trial_end_date = now + timedelta(days=max(1, trial_days))
            db.add(subscription)
            db.commit()

        logger.info(f"New user registered (unverified): {user_data.email}")
        
        # Send verification email
        # SECURITY: Use HTTPS production URL by default, not localhost
        frontend_url = os.getenv("FRONTEND_URL", "https://insight.meldra.ai")
        verification_link = f"{frontend_url}/verify-email?token={verification_token}"
        
        try:
            email_sent = await send_verification_email(user_data.email, user_data.full_name, verification_link)
            if not email_sent:
                logger.warning(f"Verification email not sent to {user_data.email} (SMTP not configured). Verification link: {verification_link}")
        except Exception as e:
            logger.warning(f"Failed to send verification email: {str(e)}")

        return {
            "message": "Registration successful! Please check your email to verify your account.",
            "email": new_user.email,
            "verification_required": True
        }

    except HTTPException:
        raise
    except Exception as e:
        import traceback
        error_traceback = traceback.format_exc()
        logger.error(f"Registration error: {str(e)}\n{error_traceback}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Registration failed: {str(e)}"
        )


@app.post("/api/admin/free-trial-lifecycle/run")
async def run_free_trial_lifecycle(
    current_user: dict = Depends(get_current_admin_user),
    db: Session = Depends(get_db),
):
    now = datetime.utcnow()
    try:
        stats = await _run_free_trial_lifecycle_once(db, now)
        return {"message": "Lifecycle run completed", **stats}
    except Exception as e:
        logger.error(f"Free trial lifecycle run error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/auth/login")
async def login(user_data: UserLogin, request: Request, db: Session = Depends(get_db)):
    """Login user and return JWT token"""
    try:
        # Normalize email
        user_data.email = (user_data.email or "").strip().lower()
        # Authenticate user
        user = authenticate_user(db, user_data.email, user_data.password)

        if not user:
            # Log failed login (IP + geo + browser/device for security and compliance)
            # IMPORTANT: This tracks ALL users who attempt login, not just one user
            # Every login attempt (successful or failed) is recorded in login_history table
            client_ip = _get_client_ip(request)
            user_agent = request.headers.get("user-agent", "")
            browser_info = _parse_user_agent(user_agent)
            login_history = LoginHistory(
                user_email=user_data.email,  # Tracks the email that attempted login
                event_type="failed_login",
                ip_address=client_ip or None,  # Tracks IP of ALL users
                location=_resolve_geolocation(client_ip) if client_ip else None,
                browser=browser_info.get("browser"),
                device=browser_info.get("device")
            )
            db.add(login_history)
            db.commit()
            logger.info(f"Failed login tracked for ALL users: {user_data.email} from IP {client_ip}")

            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect email or password"
            )
        
        # Check if email is verified
        if not user.is_verified:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Please verify your email address before logging in. Check your inbox for the verification link."
            )

        # Best-effort: session-scoped metadata should not persist across sessions
        try:
            db.query(FileProcessingHistory).filter(
                FileProcessingHistory.user_email == user.email
            ).delete(synchronize_session=False)
            db.commit()
        except Exception:
            db.rollback()

        # Create access token (extended for dev/test email when configured)
        dev_email = (os.getenv("DEV_EXTENDED_SESSION_EMAIL") or "").strip()
        dev_minutes = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES_DEV", "10080"))  # 7 days default
        minutes = dev_minutes if (dev_email and user.email == dev_email) else ACCESS_TOKEN_EXPIRE_MINUTES
        access_token_expires = timedelta(minutes=minutes)
        access_token = create_access_token(
            data={"sub": user.email, "role": user.role},
            expires_delta=access_token_expires
        )

        # Log successful login (IP + geo + browser/device for security and compliance)
        # IMPORTANT: This tracks ALL users who log in, not just one user
        # Every user who signs up and logs in will have their IP, location, and browser tracked
        # The login_history table stores records for ALL users - check admin endpoint to see all entries
        client_ip = _get_client_ip(request)
        user_agent = request.headers.get("user-agent", "")
        browser_info = _parse_user_agent(user_agent)
        login_history = LoginHistory(
            user_email=user.email,  # Tracks the email of the user who logged in
            event_type="login",
            ip_address=client_ip or None,  # Tracks IP of ALL users who log in
            location=_resolve_geolocation(client_ip) if client_ip else None,
            browser=browser_info.get("browser"),
            device=browser_info.get("device")
        )
        db.add(login_history)
        db.commit()
        logger.info(f"Login tracked for ALL users: {user.email} from IP {client_ip} - All signups are tracked in login_history table")

        logger.info(f"User logged in: {user.email}")

        # Create response with token
        return {
            "access_token": access_token,
            "token_type": "bearer",
            "user": {
                "email": user.email,
                "full_name": user.full_name,
                "role": user.role,
                "is_verified": user.is_verified
            },
            "expires_in": minutes * 60
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Login error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Login failed"
        )


@app.post("/api/auth/logout")
async def logout(
    request: Request,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Client-side logout (JWT is stateless). Also clears session-scoped FileProcessingHistory."""
    try:
        # Track logout event (best-effort)
        try:
            client_ip = _get_client_ip(request)
            user_agent = request.headers.get("user-agent", "")
            browser_info = _parse_user_agent(user_agent)
            db.add(
                LoginHistory(
                    user_email=current_user["email"],
                    event_type="logout",
                    ip_address=client_ip or None,
                    location=_resolve_geolocation(client_ip) if client_ip else None,
                    browser=browser_info.get("browser"),
                    device=browser_info.get("device"),
                )
            )
            db.commit()
        except Exception:
            db.rollback()

        # Delete session-scoped processing history
        try:
            db.query(FileProcessingHistory).filter(
                FileProcessingHistory.user_email == current_user["email"]
            ).delete(synchronize_session=False)
            db.commit()
        except Exception:
            db.rollback()

        return {"ok": True}
    except Exception as e:
        logger.error(f"Logout error: {str(e)}")
        raise HTTPException(status_code=500, detail="Logout failed")


def _session_history_ttl_minutes() -> int:
    """TTL for session-scoped FileProcessingHistory cleanup.

    Since JWT is stateless, we cannot know actual logout/expiry time unless the client calls /logout.
    We therefore delete history older than the maximum token lifetime (+ small buffer).
    """
    try:
        dev_minutes = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES_DEV", "10080"))
    except Exception:
        dev_minutes = 10080
    return max(int(ACCESS_TOKEN_EXPIRE_MINUTES), int(dev_minutes))


async def _background_cleanup_file_processing_history() -> None:
    """Periodic cleanup so file_processing_history does not persist after session expiry."""
    from app.database import SessionLocal

    while True:
        try:
            ttl_minutes = _session_history_ttl_minutes()
            cutoff = datetime.utcnow() - timedelta(minutes=ttl_minutes + 10)
            db = SessionLocal()
            try:
                db.query(FileProcessingHistory).filter(
                    FileProcessingHistory.created_date < cutoff
                ).delete(synchronize_session=False)
                db.commit()
            finally:
                db.close()
        except Exception:
            # Never crash server due to cleanup task
            pass
        await asyncio.sleep(60 * 30)


@app.post("/api/auth/forgot-password")
async def forgot_password(request: ForgotPasswordRequest, db: Session = Depends(get_db)):
    """Request password reset - sends reset token to email"""
    try:
        user = db.query(User).filter(User.email == request.email).first()
        
        # Always return success (security: don't reveal if email exists)
        if not user:
            logger.warning(f"Password reset requested for non-existent email: {request.email}")
            return {
                "message": "If an account with that email exists, a password reset link has been sent."
            }
        
        # Generate reset token
        reset_token = secrets.token_urlsafe(32)
        reset_token_expires = datetime.utcnow() + timedelta(hours=1)  # Token valid for 1 hour
        
        # Save token to database (check if columns exist)
        if hasattr(user, 'reset_token'):
            user.reset_token = reset_token
        else:
            logger.error("reset_token column does not exist in database. Please run migration.")
            # Still return success for security
            return {
                "message": "If an account with that email exists, a password reset link has been sent."
            }
            
        if hasattr(user, 'reset_token_expires'):
            user.reset_token_expires = reset_token_expires
        else:
            logger.error("reset_token_expires column does not exist in database. Please run migration.")
            return {
                "message": "If an account with that email exists, a password reset link has been sent."
            }
            
        db.commit()
        
        # Generate reset link
        # SECURITY: Use HTTPS production URL by default, not localhost
        frontend_url = os.getenv('FRONTEND_URL', 'https://insight.meldra.ai')
        reset_link = f"{frontend_url}/reset-password?token={reset_token}"
        
        logger.info(f"Password reset token generated for {request.email}: {reset_link}")
        
        # Send email with reset link
        logger.info(f"Calling send_password_reset_email for {user.email}")
        email_sent = await send_password_reset_email(user.email, reset_link)
        logger.info(f"Email sending result: {'SUCCESS' if email_sent else 'FAILED'}")
        
        if not email_sent:
            # If email sending fails, still return success (security)
            # But log the reset link for manual use
            logger.error(f"❌ Email sending FAILED for {request.email}")
            logger.error(f"   Reset link (for manual use): {reset_link}")
            logger.error(f"   Check Railway logs above for SMTP error details")
            # Only return reset_link in development (when ENVIRONMENT is not production)
            # Never show reset link in production for security
            environment = os.getenv("ENVIRONMENT", "development")
            if environment.lower() != "production" and not os.getenv("SMTP_USER"):
                return {
                    "message": "If an account with that email exists, a password reset link has been sent.",
                    "reset_link": reset_link  # Only in development when SMTP not configured
                }
        
        return {
            "message": "If an account with that email exists, a password reset link has been sent."
        }
        
    except Exception as e:
        logger.error(f"Password reset error: {str(e)}")
        # Still return success for security
        return {
            "message": "If an account with that email exists, a password reset link has been sent."
        }


@app.post("/api/auth/reset-password")
async def reset_password(request: ResetPasswordRequest, db: Session = Depends(get_db)):
    """Reset password using token"""
    try:
        # Find user by reset token
        # Handle case where reset_token column might not exist yet
        try:
            user = db.query(User).filter(User.reset_token == request.token).first()
        except Exception as db_error:
            # If column doesn't exist, log and return error
            logger.error(f"Database error in reset_password: {str(db_error)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Database schema error. Please contact support."
            )
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid or expired reset token"
            )
        
        # Check if token expired
        if hasattr(user, 'reset_token_expires') and user.reset_token_expires and user.reset_token_expires < datetime.utcnow():
            # Clear expired token
            if hasattr(user, 'reset_token'):
                user.reset_token = None
            if hasattr(user, 'reset_token_expires'):
                user.reset_token_expires = None
            db.commit()
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Reset token has expired. Please request a new one."
            )
        
        # Validate password strength
        if len(request.new_password) < 10:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Password must be at least 10 characters"
            )
        
        # Bcrypt has 72-byte limit, validate and handle
        password_bytes = request.new_password.encode('utf-8')
        password_char_length = len(request.new_password)
        password_byte_length = len(password_bytes)
        
        logger.info(f"Password reset attempt - Characters: {password_char_length}, Bytes: {password_byte_length}")
        
        if password_byte_length > 72:
            logger.warning(f"Password too long: {password_byte_length} bytes (max 72)")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Password is too long. Maximum 72 bytes allowed (your password is {password_byte_length} bytes). Please use a shorter password or remove special characters."
            )
        
        # Update password (get_password_hash handles truncation internally, but we validate first)
        try:
            user.hashed_password = get_password_hash(request.new_password)
        except ValueError as e:
            # If bcrypt still complains, provide user-friendly error
            logger.error(f"Bcrypt error during password hash: {str(e)}")
            if "72 bytes" in str(e) or "longer than 72" in str(e):
                password_byte_length = len(request.new_password.encode('utf-8'))
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Password is too long. Maximum 72 bytes allowed (your password is {password_byte_length} bytes). Please use a shorter password or remove special characters."
                )
            # Re-raise other errors
            raise
        
        # Clear reset token if columns exist
        if hasattr(user, 'reset_token'):
            user.reset_token = None
        if hasattr(user, 'reset_token_expires'):
            user.reset_token_expires = None
        
        # SECURITY: Automatically verify email when password is reset
        # If user clicked reset link sent to their email, they proved email ownership
        if hasattr(user, 'is_verified') and not user.is_verified:
            user.is_verified = True
            logger.info(f"Email automatically verified for {user.email} after password reset (proved email ownership)")
            
        db.commit()
        
        logger.info(f"Password reset successful for {user.email}")
        
        return {
            "message": "Password has been reset successfully. You can now login with your new password."
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Password reset error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Password reset failed: {str(e)}"
        )


@app.get("/api/auth/verify-email")
async def verify_email(token: str, db: Session = Depends(get_db)):
    """Verify user email using verification token"""
    try:
        # Find user by verification token
        user = db.query(User).filter(User.verification_token == token).first()
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid verification token"
            )
        
        # Check if token expired
        if hasattr(user, 'verification_token_expires') and user.verification_token_expires:
            if user.verification_token_expires < datetime.utcnow():
                # Clear expired token
                user.verification_token = None
                user.verification_token_expires = None
                db.commit()
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Verification token has expired. Please request a new verification email."
                )
        
        # Verify the user
        user.is_verified = True
        user.verification_token = None
        user.verification_token_expires = None
        db.commit()
        
        logger.info(f"Email verified successfully for {user.email}")
        
        return {
            "message": "Email verified successfully! You can now login.",
            "email": user.email
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Email verification error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Email verification failed: {str(e)}"
        )


@app.post("/api/auth/resend-verification")
async def resend_verification(request: ForgotPasswordRequest, db: Session = Depends(get_db)):
    """Resend verification email to user"""
    try:
        user = db.query(User).filter(User.email == request.email).first()
        
        # Always return success (security: don't reveal if email exists)
        if not user:
            logger.warning(f"Verification resend requested for non-existent email: {request.email}")
            return {
                "message": "If an account with that email exists, a verification email has been sent."
            }
        
        # Check if already verified
        if user.is_verified:
            return {
                "message": "Your email is already verified. You can login now."
            }
        
        # Generate new verification token
        verification_token = secrets.token_urlsafe(32)
        verification_expires = datetime.utcnow() + timedelta(hours=1)  # Token expires in 1 hour
        
        # Update user with new token
        if hasattr(user, 'verification_token'):
            user.verification_token = verification_token
        if hasattr(user, 'verification_token_expires'):
            user.verification_token_expires = verification_expires
        db.commit()
        
        # Generate verification link
        frontend_url = os.getenv("FRONTEND_URL", "https://insight.meldra.ai")
        verification_link = f"{frontend_url}/verify-email?token={verification_token}"
        
        # Send verification email
        try:
            email_sent = await send_verification_email(user.email, user.full_name, verification_link)
            if not email_sent:
                logger.warning(f"Verification email not sent to {user.email} (SMTP/Resend not configured). Verification link: {verification_link}")
        except Exception as e:
            logger.warning(f"Failed to send verification email: {str(e)}")
        
        logger.info(f"Verification email resent to {user.email}")
        
        return {
            "message": "If an account with that email exists, a verification email has been sent. Please check your inbox and spam folder."
        }
        
    except Exception as e:
        logger.error(f"Resend verification error: {str(e)}")
        # Still return success for security
        return {
            "message": "If an account with that email exists, a verification email has been sent."
        }


@app.get("/api/auth/me")
async def get_me(current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    """Get current user info"""
    user = db.query(User).filter(User.email == current_user["email"]).first()
    return {
        "id": user.id,
        "email": user.email,
        "full_name": user.full_name,
        "role": user.role,
        "created_date": user.created_date,
        "is_verified": user.is_verified,
    }


@app.post("/api/convert/{endpoint}")
async def convert_document(
    endpoint: str,
    file: UploadFile = File(...),
    ocr_lang: Optional[str] = Form(None),
    mode: Optional[str] = Form(None),
    max_pages: Optional[int] = Form(None),
    timeout_seconds: Optional[float] = Form(None),
    request: Request = None,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """In-app Document Converter (JWT auth): PDF/DOC/PPT conversions.

    Frontend calls: POST /api/convert/{slug} with Authorization: Bearer <jwt>.
    """

    request_id = _get_request_id(request)
    subscription = _get_or_create_subscription(db, current_user["email"])
    _apply_admin_entitlements(subscription, current_user["email"])
    db.commit()
    max_size_mb = 500 if subscription.plan == "premium" else 10
    max_bytes = max_size_mb * 1024 * 1024

    raw = await file.read()
    if len(raw) > max_bytes:
        raise HTTPException(status_code=413, detail=f"File size exceeds {max_size_mb}MB limit")

    _enforce_upload_quota(subscription, len(raw))
    _enforce_transactions_quota(subscription)

    if endpoint == "pdf-to-doc":
        data, err = pdf_to_docx_smart(raw, ocr_lang=ocr_lang, mode=mode)
        if err:
            raise HTTPException(status_code=400, detail=err)
        media = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        out_ext = ".docx"
    elif endpoint == "doc-to-pdf":
        data, err = docx_to_pdf(raw)
        if err:
            raise HTTPException(status_code=400, detail=err)
        media = "application/pdf"
        out_ext = ".pdf"
    elif endpoint == "ppt-to-pdf":
        data, err = pptx_to_pdf(raw)
        if err:
            raise HTTPException(status_code=400, detail=err)
        media = "application/pdf"
        out_ext = ".pdf"
    elif endpoint == "pdf-to-ppt":
        data, err = pdf_to_pptx(raw)
        if err:
            raise HTTPException(status_code=400, detail=err)
        media = "application/vnd.openxmlformats-officedocument.presentationml.presentation"
        out_ext = ".pptx"
    elif endpoint == "doc-to-xls":
        data, err = docx_to_xlsx_structured(raw, source_filename=file.filename or "")
        if err:
            raise HTTPException(status_code=400, detail=err)
        media = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        out_ext = ".xlsx"
    elif endpoint == "pdf-to-xls":
        data, err = pdf_to_xlsx_structured(raw, source_filename=file.filename or "")
        if err:
            raise HTTPException(status_code=400, detail=err)
        media = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        out_ext = ".xlsx"
    elif endpoint == "ppt-to-xls":
        data, err = pptx_to_xlsx_structured(raw, source_filename=file.filename or "")
        if err:
            raise HTTPException(status_code=400, detail=err)
        media = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        out_ext = ".xlsx"
    else:
        raise HTTPException(status_code=404, detail="Unknown conversion")

    if should_apply_watermark(getattr(subscription, "plan", None)):
        if out_ext == ".pdf":
            data = watermark_pdf_bytes(data)
        elif out_ext == ".pptx":
            data = watermark_pptx_bytes(data)
        elif out_ext == ".xlsx":
            data = watermark_xlsx_bytes(data)

    base = (os.path.splitext(file.filename or "file")[0] or "file").rstrip(".")
    base = _ascii_safe_filename(base)
    headers = {"Content-Disposition": f"attachment; filename={base}{out_ext}"}

    _consume_upload_bytes(db, subscription, current_user["email"], request_id, len(raw))
    _consume_transaction(db, subscription, current_user["email"], request_id)
    return StreamingResponse(io.BytesIO(data), media_type=media, headers=headers)


@app.get("/api/suggestions", response_model=Dict[str, Any])
async def get_suggestions(
    page: Optional[str] = None,
    has_data: Optional[int] = None,
    tab: Optional[str] = None,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Rule-based 'next best actions' suggestions.

    MVP: deterministic suggestions based on page context.
    Later: rank/personalize using UserActivity + model.
    """

    subscription = _get_or_create_subscription(db, current_user["email"])
    plan = (getattr(subscription, "plan", "free") or "free").strip().lower()
    page_norm = (page or "").strip().lower()
    has_data_norm = bool(int(has_data)) if has_data is not None else None
    tab_norm = (tab or "").strip().lower()

    suggestions = []

    if page_norm in ("dashboard", "analysis", "data") or not page_norm:
        # If the UI tells us there is no uploaded data yet, prioritize 'start' suggestions.
        if has_data_norm is False:
            suggestions.extend(
                [
                    {
                        "id": "s_upload",
                        "title": "Upload a spreadsheet",
                        "reason": "Upload CSV/XLSX to start cleaning, transforming, and charting.",
                        "action": {"type": "navigate", "url": "/dashboard"},
                        "manual_steps": [
                            "Go to Dashboard.",
                            "Drag and drop your CSV/XLSX into the upload area.",
                            "After upload, use Analysis & Cleaning and AI Tools.",
                        ],
                    },
                    {
                        "id": "s_templates",
                        "title": "Start from a template",
                        "reason": "Use a Finance/CFO-friendly template to move faster.",
                        "action": {"type": "navigate", "url": "/dashboard"},
                        "manual_steps": [
                            "On Dashboard, choose a template (Finance / Sales / HR).",
                            "Edit inputs, then export.",
                        ],
                    },
                ]
            )
        else:
            suggestions.extend(
                [
                    {
                        "id": "s_cleaning",
                        "title": "Clean your data",
                        "reason": "Fix blanks, duplicates, and mixed data types for better analysis.",
                        "action": {"type": "navigate", "url": "/dashboard?tab=analysis#cleaning"},
                        "manual_steps": [
                            "Go to Dashboard → Analysis & Cleaning.",
                            "Use Smart Cleaning Tools (Remove Duplicates / Trim Space / Fix Types).",
                            "Validate results in the Data Preview grid.",
                        ],
                    },
                    {
                        "id": "s_chart",
                        "title": "Create a chart",
                        "reason": "Visualize trends and outliers quickly.",
                        "action": {"type": "navigate", "url": "/dashboard?tab=analysis#charts"},
                        "manual_steps": [
                            "Go to Dashboard → Analysis & Cleaning.",
                            "Open the Enhanced Charts panel.",
                            "Pick X-axis and Y-axis columns, then click Generate Chart.",
                        ],
                    },
                    {
                        "id": "s_ai_ops",
                        "title": "Try AI-powered operations",
                        "reason": "Describe transformations in English and apply them instantly.",
                        "action": {"type": "navigate", "url": "/dashboard?tab=ai"},
                        "manual_steps": [
                            "Go to Dashboard → AI Tools.",
                            "Describe the operation (e.g., 'remove duplicates', 'filter rows', 'create Profit = Revenue - Cost').",
                            "Review the output and export if needed.",
                        ],
                    },
                ]
            )

    if page_norm in ("converter", "document-converter", "pdfdocconverter"):
        suggestions.extend(
            [
                {
                    "id": "s_pdf2ppt",
                    "title": "Convert PDF to PPT",
                    "reason": "Turn documents into slides for editing and sharing.",
                    "action": {"type": "navigate", "url": "/pdfdocconverter?mode=pdf2ppt"},
                },
                {
                    "id": "s_ocr",
                    "title": "If scanned, run OCR first",
                    "reason": "Scanned PDFs may convert better after OCR.",
                    "action": {"type": "navigate", "url": "/pdfdocconverter?mode=pdf2doc"},
                },
            ]
        )

    if plan != "premium":
        suggestions.append(
            {
                "id": "s_upgrade_watermark",
                "title": "Remove watermark by upgrading",
                "reason": "Free plan exports include a meldra.ai watermark.",
                "action": {"type": "navigate", "url": "/pricing"},
            }
        )

    return {"suggestions": suggestions, "plan": plan}


@app.post("/api/support/chat", response_model=Dict[str, Any])
async def support_chat(
    payload: SupportChatRequest,
    request: Request = None,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Customer-facing AI assistant grounded in MELDRA_AI_ASSISTANT_KB.md (no chat storage)."""
    message = (payload.message or "").strip()
    if not message:
        raise HTTPException(status_code=400, detail="Message is required")

    if _is_disallowed_support_question(message):
        return {
            "answer": "I can help with product usage and account/API onboarding. For internal/backend implementation details, please contact Meldra support.",
            "refused": True,
        }

    fin = _finance_fast_answer(message)
    if fin:
        return {"answer": fin, "refused": False}

    kw = _support_keyword_answer(message)
    if kw:
        return {"answer": kw, "refused": False}

    # remaining generic keyword shortcuts

    try:
        kb_text = _load_kb_text()
    except Exception:
        return {
            "answer": "I can help with product usage and account/API onboarding, but the knowledge base is currently unavailable. Please contact Meldra support.",
            "refused": False,
        }

    picked = _select_relevant_kb_sections(kb_text=kb_text, message=message, top_k=5)
    kb_context = "\n\n".join([s["content"] for s in picked])

    prompt = (
        f"You are Meldra's customer-facing Support Assistant.\n\n"
        f"RULES:\n"
        f"- Primary goal: help users succeed with the product (API usage, onboarding, endpoints, parameters, error messages, limits) and explain workflows step-by-step.\n"
        f"- When the user asks about finance, forecasting, FP&A, CFO/CFA topics, stocks, dividends, or crypto calculations: prioritize spreadsheet-ready formulas and short step-by-step workflows inside Meldra.\n"
        f"- You MAY answer general spreadsheet questions (Excel/Google Sheets) like VLOOKUP/XLOOKUP/INDEX-MATCH, joins/merges, data cleaning, and how to express them in this product.\n"
        f"- Use the provided Knowledge Base excerpts when relevant, but do NOT refuse just because the KB doesn't mention something.\n"
        f"- If the user asks for sensitive internal implementation details (source code, repos, secrets, deployment, logs, environment variables, database credentials), refuse and say: \"I can help with product usage and account/API onboarding. For internal/backend implementation details, please contact Meldra support.\"\n"
        f"- If you are unsure, ask 1 clarifying question.\n"
        f"- Formatting: do NOT use Markdown headings (no '#', '##', '###'). Use short label lines like 'Step 1:', 'Next:', 'Note:' instead.\n"
        f"- If the user asks about pricing, subscription, limits, quotas, or missing access, ask what plan/environment they are on (Free/Standard/Premium, Sandbox vs Production) and whether their email is verified; then give the next steps.\n\n"
        f"USER CONTEXT:\n"
        f"- User email: {current_user.get('email')}\n"
        f"- Page: {payload.page or ''}\n\n"
        f"KNOWLEDGE BASE EXCERPTS:\n"
        f"{kb_context}\n\n"
        f"USER QUESTION:\n"
        f"{message}\n"
    )

    try:
        request_id = _get_request_id(request)
        _enforce_verified_user(db, current_user["email"])
        subscription = _get_or_create_subscription(db, current_user["email"])
        _enforce_ai_quota(subscription)
        llm_out = await invoke_llm(
            prompt=prompt,
            add_context=False,
            model=os.getenv("AI_ASSISTANT_MODEL", "gpt-4-turbo-preview"),
            max_tokens=800,
            return_usage=True,
        )
        answer = (llm_out or {}).get("content") if isinstance(llm_out, dict) else llm_out
        if not answer:
            raise Exception("Empty response")

        usage = (llm_out or {}).get("usage") if isinstance(llm_out, dict) else None
        total_tokens = int((usage or {}).get("total_tokens", 0) or 0)
        _consume_ai_quota(db, subscription, current_user["email"], request_id, total_tokens)
        return {
            "answer": answer,
            "refused": False,
        }
    except Exception as e:
        logger.error(f"Support chat error: {str(e)}")
        raise HTTPException(status_code=500, detail="Support chat failed")


@app.post("/api/support/chat-with-file", response_model=Dict[str, Any])
async def support_chat_with_file(
    message: str = Form(...),
    page: Optional[str] = Form(None),
    file: UploadFile = File(...),
    request: Request = None,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Support chat with an uploaded file (.docx/.xlsx/.pptx/.md/.pdf) ingested server-side."""
    msg = (message or "").strip()
    if not msg:
        raise HTTPException(status_code=400, detail="Message is required")

    if _is_disallowed_support_question(msg):
        return {
            "answer": "I can help with product usage and account/API onboarding. For internal/backend implementation details, please contact Meldra support.",
            "refused": True,
        }

    fin = _finance_fast_answer(msg)
    if fin:
        return {"answer": fin, "refused": False}

    kw = _support_keyword_answer(msg)
    if kw:
        return {"answer": kw, "refused": False}

    # remaining generic keyword shortcuts

    try:
        kb_text = _load_kb_text()
    except Exception:
        return {
            "answer": "I can help with product usage and account/API onboarding, but the knowledge base is currently unavailable. Please contact Meldra support.",
            "refused": False,
        }

    _enforce_verified_user(db, current_user["email"])
    subscription = _get_or_create_subscription(db, current_user["email"])
    _enforce_ai_quota(subscription)

    max_size_mb = 500 if subscription.plan == "premium" else 10
    max_bytes = max_size_mb * 1024 * 1024
    content = await file.read()
    if len(content) > max_bytes:
        raise HTTPException(status_code=413, detail=f"File size exceeds {max_size_mb}MB limit")

    _enforce_upload_quota(subscription, len(content))

    svc = IngestionService(IngestLimits(max_bytes=max_bytes))
    try:
        ingested = svc.ingest(file.filename or "uploaded_file", content)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    picked = _select_relevant_kb_sections(kb_text=kb_text, message=msg, top_k=5)
    kb_context = "\n\n".join([s["content"] for s in picked])
    file_context = build_ingestion_prompt_block(ingested)

    prompt = (
        f"You are Meldra's customer-facing Support Assistant.\n\n"
        f"RULES:\n"
        f"- Primary goal: help users succeed with the product (API usage, onboarding, endpoints, parameters, error messages, limits) and explain workflows step-by-step.\n"
        f"- When the user asks about finance, forecasting, FP&A, CFO/CFA topics, stocks, dividends, or crypto calculations: prioritize spreadsheet-ready formulas and short step-by-step workflows inside Meldra.\n"
        f"- You MAY answer general spreadsheet questions (Excel/Google Sheets) like VLOOKUP/XLOOKUP/INDEX-MATCH, joins/merges, data cleaning, and how to express them in this product.\n"
        f"- Use the provided Knowledge Base excerpts and uploaded file context when relevant, but do NOT refuse just because the KB doesn't mention something.\n"
        f"- If the user asks for sensitive internal implementation details (source code, repos, secrets, deployment, logs, environment variables, database credentials), refuse and say: \"I can help with product usage and account/API onboarding. For internal/backend implementation details, please contact Meldra support.\"\n"
        f"- If you are unsure, ask 1 clarifying question.\n"
        f"- Formatting: do NOT use Markdown headings (no '#', '##', '###'). Use short label lines like 'Step 1:', 'Next:', 'Note:' instead.\n"
        f"- If the user asks about pricing, subscription, limits, quotas, or missing access, ask what plan/environment they are on (Free/Standard/Premium, Sandbox vs Production) and whether their email is verified; then give the next steps.\n\n"
        f"USER CONTEXT:\n"
        f"- User email: {current_user.get('email')}\n"
        f"- Page: {page or ''}\n\n"
        f"KNOWLEDGE BASE EXCERPTS:\n"
        f"{kb_context}\n\n"
        f"{file_context}\n\n"
        f"USER QUESTION:\n"
        f"{msg}\n"
    )

    try:
        request_id = _get_request_id(request)
        llm_out = await invoke_llm(
            prompt=prompt,
            add_context=False,
            model=os.getenv("AI_ASSISTANT_MODEL", "gpt-4-turbo-preview"),
            max_tokens=900,
            return_usage=True,
        )
        answer = (llm_out or {}).get("content") if isinstance(llm_out, dict) else llm_out
        if not answer:
            raise Exception("Empty response")

        usage = (llm_out or {}).get("usage") if isinstance(llm_out, dict) else None
        total_tokens = int((usage or {}).get("total_tokens", 0) or 0)
        _consume_ai_quota(db, subscription, current_user["email"], request_id, total_tokens)
        _consume_upload_bytes(db, subscription, current_user["email"], request_id, len(content))
        return {
            "answer": answer,
            "refused": False,
            "ingestion": {"filename": ingested.get("filename"), "type": ingested.get("type"), "meta": ingested.get("meta")},
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Support chat-with-file error: {str(e)}")
        raise HTTPException(status_code=500, detail="Support chat failed")


# ============================================================================
# API KEY MANAGEMENT (developer.meldra.ai)
# ============================================================================

class ApiKeyCreateRequest(BaseModel):
    name: Optional[str] = None
    plan: str = "standard"  # standard, premium, enterprise
    rate_limit_per_minute: int = 60
    rate_limit_per_day: int = 10000
    monthly_quota: int = 100000


class ApiKeyResponse(BaseModel):
    id: int
    key_prefix: str
    name: Optional[str]
    is_active: bool
    plan: str
    rate_limit_per_minute: int
    rate_limit_per_day: int
    monthly_quota: int
    created_date: datetime
    last_used: Optional[datetime]
    expires_date: Optional[datetime]


@app.post("/api/developer/keys", response_model=Dict[str, Any])
async def create_api_key(
    request: ApiKeyCreateRequest,
    current_user: dict = Depends(get_current_admin_user),  # Only admins can create keys
    db: Session = Depends(get_db)
):
    """Create a new API key (admin only)"""
    try:
        full_key, key_hash = generate_api_key()
        key_prefix = full_key[:12]  # First 12 chars for display
        
        api_key = ApiKey(
            user_email=current_user["email"],  # Admin creating it
            key_hash=key_hash,
            key_prefix=key_prefix,
            name=request.name,
            plan=request.plan,
            rate_limit_per_minute=request.rate_limit_per_minute,
            rate_limit_per_day=request.rate_limit_per_day,
            monthly_quota=request.monthly_quota,
            created_by=current_user["email"],
        )
        db.add(api_key)
        db.commit()
        db.refresh(api_key)
        
        logger.info(f"API key created: {key_prefix}... by {current_user['email']}")
        
        # Return the full key ONCE (never stored in DB)
        return {
            "id": api_key.id,
            "api_key": full_key,  # Only returned once!
            "key_prefix": key_prefix,
            "name": api_key.name,
            "plan": api_key.plan,
            "base_url": api_key.base_url or "https://api.developer.meldra.ai",
            "warning": "Save this key now. It will not be shown again.",
        }
    except Exception as e:
        logger.error(f"Error creating API key: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to create API key: {str(e)}")


@app.post("/api/developer/keys/request-sandbox", response_model=Dict[str, Any])
async def request_sandbox_api_key(
    request: Request,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Self-serve: create exactly one sandbox API key for the current user."""
    try:
        ip_address = getattr(getattr(request, "client", None), "host", None)
        user_agent = None
        try:
            user_agent = request.headers.get("user-agent")
        except Exception:
            user_agent = None

        # Prevent duplicates under concurrent requests:
        # lock the user row for the duration of the check+create transaction.
        user = (
            db.query(User)
            .filter(User.email == current_user["email"])
            .with_for_update()
            .first()
        )

        if user and hasattr(user, "is_verified") and not user.is_verified:
            db.add(
                ApiKeyIssuanceLog(
                    user_email=current_user["email"],
                    environment="sandbox",
                    status="rejected",
                    http_status=403,
                    error_message="email_not_verified",
                    ip_address=ip_address,
                    user_agent=user_agent,
                )
            )
            db.commit()
            raise HTTPException(
                status_code=403,
                detail="Please verify your email address before requesting a sandbox API key.",
            )

        existing = (
            db.query(ApiKey)
            .filter(
                and_(
                    ApiKey.user_email == current_user["email"],
                    ApiKey.key_prefix.like("meldra_test_%"),
                )
            )
            .first()
        )
        if existing:
            db.add(
                ApiKeyIssuanceLog(
                    user_email=current_user["email"],
                    environment="sandbox",
                    status="rejected",
                    http_status=409,
                    api_key_id=existing.id,
                    error_message="already_issued",
                    ip_address=ip_address,
                    user_agent=user_agent,
                )
            )
            db.commit()
            raise HTTPException(
                status_code=409,
                detail="Sandbox API key already issued for this account.",
            )

        full_key, key_hash = generate_api_key(prefix="meldra_test")
        key_prefix = full_key[:12]  # First 12 chars for display

        sandbox_base_url = os.getenv("DEVELOPER_API_SANDBOX_BASE_URL", "https://api-sandbox.developer.meldra.ai")

        api_key = ApiKey(
            user_email=current_user["email"],
            key_hash=key_hash,
            key_prefix=key_prefix,
            name="Sandbox Key",
            plan="sandbox",
            rate_limit_per_minute=30,
            rate_limit_per_day=500,
            monthly_quota=5000,
            base_url=sandbox_base_url,
            created_by=current_user["email"],
        )
        db.add(api_key)
        db.commit()
        db.refresh(api_key)

        try:
            await send_api_key_email(
                email=current_user["email"],
                api_key=full_key,
                environment="sandbox",
                base_url=sandbox_base_url,
            )
        except Exception as e:
            logger.warning(f"Failed to email sandbox API key to {current_user['email']}: {str(e)}")

        logger.info(f"Sandbox API key issued: {key_prefix}... to {current_user['email']}")

        return {
            "id": api_key.id,
            "api_key": full_key,
            "key_prefix": key_prefix,
            "name": api_key.name,
            "plan": api_key.plan,
            "base_url": sandbox_base_url,
            "warning": "Save this key now. It will not be shown again.",
        }
    except HTTPException:
        raise
    except Exception as e:
        try:
            db.add(
                ApiKeyIssuanceLog(
                    user_email=current_user.get("email") if isinstance(current_user, dict) else "unknown",
                    environment="sandbox",
                    status="error",
                    http_status=500,
                    error_message=str(e),
                )
            )
            db.commit()
        except Exception:
            pass
        logger.error(f"Error issuing sandbox API key: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to issue sandbox API key: {str(e)}")


@app.get("/api/developer/keys", response_model=List[ApiKeyResponse])
async def list_api_keys(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List API keys for current user"""
    keys = db.query(ApiKey).filter(ApiKey.user_email == current_user["email"]).all()
    return [
        {
            "id": k.id,
            "key_prefix": k.key_prefix,
            "name": k.name,
            "is_active": k.is_active,
            "plan": k.plan,
            "rate_limit_per_minute": k.rate_limit_per_minute,
            "rate_limit_per_day": k.rate_limit_per_day,
            "monthly_quota": k.monthly_quota,
            "created_date": k.created_date,
            "last_used": k.last_used,
            "expires_date": k.expires_date,
        }
        for k in keys
    ]


@app.get("/api/developer/keys/{key_id}/usage")
async def get_key_usage(
    key_id: int,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
):
    """Get usage statistics for an API key"""
    api_key = db.query(ApiKey).filter(
        and_(ApiKey.id == key_id, ApiKey.user_email == current_user["email"])
    ).first()
    
    if not api_key:
        raise HTTPException(status_code=404, detail="API key not found")
    
    start = datetime.fromisoformat(start_date) if start_date else None
    end = datetime.fromisoformat(end_date) if end_date else None
    
    stats = get_usage_stats(db, api_key_id=key_id, start_date=start, end_date=end)
    
    # Get current month billing
    now = datetime.utcnow()
    billing = get_monthly_billing(db, key_id, now.year, now.month)
    
    return {
        "api_key_id": key_id,
        "key_prefix": api_key.key_prefix,
        "usage_stats": stats,
        "current_month_billing": {
            "billing_month": billing.billing_month if billing else None,
            "total_requests": billing.total_requests if billing else 0,
            "total_cost_usd": float(billing.total_cost_usd) if billing else 0.0,
            "hardware_cost_usd": float(billing.hardware_cost_usd) if billing else 0.0,
            "margin_usd": float(billing.margin_usd) if billing else 0.0,
        } if billing else None,
    }


@app.get("/api/developer/usage")
async def get_user_usage(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get overall usage for current user across all API keys"""
    stats = get_usage_stats(db, user_email=current_user["email"])
    
    # Get all keys
    keys = db.query(ApiKey).filter(ApiKey.user_email == current_user["email"]).all()
    
    return {
        "user_email": current_user["email"],
        "total_usage": stats,
        "api_keys": [
            {
                "id": k.id,
                "key_prefix": k.key_prefix,
                "name": k.name,
                "plan": k.plan,
                "is_active": k.is_active,
            }
            for k in keys
        ],
    }


# ============================================================================
# SECURITY AI/ML ENDPOINTS
# ============================================================================

class FraudDetectionRequest(BaseModel):
    user_email: Optional[str] = None
    days: int = 7


class AccessPatternRequest(BaseModel):
    user_email: str
    days: int = 30


@app.post("/api/ai/security/fraud-detection")
async def detect_fraud(
    request: FraudDetectionRequest,
    current_user: dict = Depends(get_current_admin_user),  # Admin only
    db: Session = Depends(get_db)
):
    """
    AI-powered fraud detection using ML:
    - Multiple IPs from different locations
    - Unusual access patterns
    - Suspicious login times
    - Failed login spikes
    """
    try:
        service = SecurityAIService()
        result = await service.detect_fraud_patterns(
            db,
            user_email=request.user_email,
            days=request.days
        )
        return result
    except Exception as e:
        logger.error(f"Fraud detection error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Fraud detection failed: {str(e)}")


@app.post("/api/ai/security/access-patterns")
async def analyze_access_patterns(
    request: AccessPatternRequest,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Analyze user access patterns using ML
    Users can analyze their own patterns; admins can analyze any user
    """
    try:
        # Users can only analyze their own patterns unless admin
        if current_user["role"] != "admin" and request.user_email != current_user["email"]:
            raise HTTPException(status_code=403, detail="You can only analyze your own access patterns")
        
        service = SecurityAIService()
        result = await service.analyze_access_patterns(
            db,
            user_email=request.user_email,
            days=request.days
        )
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Access pattern analysis error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Pattern analysis failed: {str(e)}")


@app.get("/api/ai/security/api-abuse")
async def detect_api_abuse(
    api_key_id: Optional[int] = None,
    hours: int = 24,
    current_user: dict = Depends(get_current_admin_user),  # Admin only
    db: Session = Depends(get_db)
):
    """
    Detect API abuse patterns (rate limit violations, unusual usage)
    Admin only
    """
    try:
        service = SecurityAIService()
        result = service.detect_api_abuse(
            db,
            api_key_id=api_key_id,
            hours=hours
        )
        return result
    except Exception as e:
        logger.error(f"API abuse detection error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Abuse detection failed: {str(e)}")


# ============================================================================
# COMPLIANCE AI ENDPOINTS
# ============================================================================

@app.get("/api/ai/compliance/gdpr-check")
async def gdpr_compliance_check(
    user_email: Optional[str] = None,
    current_user: dict = Depends(get_current_admin_user),  # Admin only
    db: Session = Depends(get_db)
):
    """
    AI-powered GDPR compliance check:
    - Data minimization
    - Right to deletion
    - Consent management
    - Data retention
    """
    try:
        service = ComplianceAIService()
        result = await service.gdpr_compliance_check(db, user_email=user_email)
        return result
    except Exception as e:
        logger.error(f"GDPR compliance check error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Compliance check failed: {str(e)}")


@app.get("/api/ai/compliance/privacy-analysis/{user_email}")
async def analyze_data_privacy(
    user_email: str,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Analyze user's data privacy footprint
    Users can analyze their own data; admins can analyze any user
    """
    try:
        # Users can only analyze their own privacy unless admin
        if current_user["role"] != "admin" and user_email != current_user["email"]:
            raise HTTPException(status_code=403, detail="You can only analyze your own privacy data")
        
        service = ComplianceAIService()
        result = await service.analyze_data_privacy(db, user_email=user_email)
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Privacy analysis error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Privacy analysis failed: {str(e)}")


@app.get("/api/ai/compliance/audit-report")
async def generate_audit_report(
    days: int = 30,
    current_user: dict = Depends(get_current_admin_user),  # Admin only
    db: Session = Depends(get_db)
):
    """
    Generate AI-powered audit report for compliance (GDPR, CCPA, SOC 2)
    Admin only
    """
    try:
        service = ComplianceAIService()
        result = await service.generate_audit_report(db, days=days)
        return result
    except Exception as e:
        logger.error(f"Audit report error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Audit report failed: {str(e)}")


# ============================================================================
# PREDICTIVE ML ENDPOINTS
# ============================================================================

class ForecastRequest(BaseModel):
    data: List[Dict[str, Any]]
    date_column: str
    value_column: str
    periods: int = 12
    method: str = "linear"  # linear, exponential, moving_average, ai_based


class TrendDetectionRequest(BaseModel):
    data: List[Dict[str, Any]]
    date_column: str
    value_column: str


class AnomalyDetectionRequest(BaseModel):
    data: List[Dict[str, Any]]
    value_column: str


@app.post("/api/ai/ml/forecast")
async def forecast_time_series(
    request: ForecastRequest,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    ML-powered time series forecasting
    Methods: linear, exponential, moving_average, ai_based
    """
    try:
        service = PredictiveMLService()
        result = await service.forecast_time_series(
            data=request.data,
            date_column=request.date_column,
            value_column=request.value_column,
            periods=request.periods,
            method=request.method
        )
        return result
    except Exception as e:
        logger.error(f"Forecast error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Forecasting failed: {str(e)}")


@app.post("/api/ai/ml/detect-trends")
async def detect_trends(
    request: TrendDetectionRequest,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    ML-powered trend detection and pattern analysis
    """
    try:
        service = PredictiveMLService()
        result = await service.detect_trends(
            data=request.data,
            date_column=request.date_column,
            value_column=request.value_column
        )
        return result
    except Exception as e:
        logger.error(f"Trend detection error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Trend detection failed: {str(e)}")


@app.post("/api/ai/ml/predict-anomalies")
async def predict_anomalies(
    request: AnomalyDetectionRequest,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    ML-powered anomaly detection using statistical methods + AI
    """
    try:
        service = PredictiveMLService()
        result = await service.predict_anomalies(
            data=request.data,
            value_column=request.value_column
        )
        return result
    except Exception as e:
        logger.error(f"Anomaly detection error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Anomaly detection failed: {str(e)}")


# ============================================================================
# AI/LLM ENDPOINTS
# ============================================================================

@app.post("/api/integrations/llm/invoke")
async def invoke_llm_endpoint(
    request: LLMRequest,
    http_request: Request,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Invoke LLM for data analysis
    ZERO STORAGE: Prompt NOT stored, response NOT stored
    """
    try:
        _enforce_verified_user(db, current_user["email"])
        request_id = _get_request_id(http_request)
        subscription = _get_or_create_subscription(db, current_user["email"])
        _enforce_ai_quota(subscription)

        # Invoke LLM
        try:
            llm_out = await invoke_llm(
                prompt=request.prompt,
                add_context=request.add_context_from_internet,
                response_schema=request.response_json_schema,
                model=request.model or os.getenv("AI_ASSISTANT_MODEL", "gpt-4o-mini"),
                max_tokens=int(request.max_tokens) if request.max_tokens is not None else int(os.getenv("AI_ASSISTANT_MAX_TOKENS", "1200") or "1200"),
                return_usage=True,
            )
        except Exception as llm_error:
            logger.error(f"LLM invocation failed: {str(llm_error)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"AI service error: {str(llm_error)}"
            )

        response = (llm_out or {}).get("content") if isinstance(llm_out, dict) else llm_out
        usage = (llm_out or {}).get("usage") if isinstance(llm_out, dict) else None
        total_tokens = int((usage or {}).get("total_tokens", 0) or 0)
        _consume_ai_quota(db, subscription, current_user["email"], request_id, total_tokens)

        # Log activity (NO content stored)
        activity = UserActivity(
            user_email=current_user["email"],
            activity_type="ai_query",
            page_name="llm_invoke"
        )
        db.add(activity)
        db.commit()

        logger.info(f"LLM invoked by {current_user['email']}")

        return {"response": response}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"LLM invocation error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/integrations/llm/invoke-with-file")
async def invoke_llm_with_file_endpoint(
    prompt: str = Form(...),
    add_context_from_internet: bool = Form(False),
    response_json_schema: Optional[str] = Form(None),
    file: UploadFile = File(...),
    request: Request = None,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Invoke LLM with an uploaded file (.docx/.xlsx/.pptx/.md/.pdf) ingested server-side."""
    try:
        _enforce_verified_user(db, current_user["email"])
        subscription = _get_or_create_subscription(db, current_user["email"])
        _enforce_ai_quota(subscription)

        max_size_mb = 500 if subscription.plan == "premium" else 10
        max_bytes = max_size_mb * 1024 * 1024
        content = await file.read()
        if len(content) > max_bytes:
            raise HTTPException(
                status_code=413,
                detail=f"File size exceeds {max_size_mb}MB limit",
            )

        _enforce_upload_quota(subscription, len(content))

        svc = IngestionService(IngestLimits(max_bytes=max_bytes))
        try:
            ingested = svc.ingest(file.filename or "uploaded_file", content)
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e))

        prompt_block = build_ingestion_prompt_block(ingested)
        combined_prompt = f"{prompt}\n\n{prompt_block}" if prompt_block else prompt

        schema_obj = None
        if response_json_schema:
            try:
                schema_obj = json.loads(response_json_schema)
            except Exception:
                raise HTTPException(status_code=400, detail="response_json_schema must be valid JSON")

        try:
            request_id = _get_request_id(request)
            llm_out = await invoke_llm(
                prompt=combined_prompt,
                add_context=add_context_from_internet,
                response_schema=schema_obj,
                return_usage=True,
            )
        except Exception as llm_error:
            logger.error(f"LLM invocation failed: {str(llm_error)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"AI service error: {str(llm_error)}",
            )

        response = (llm_out or {}).get("content") if isinstance(llm_out, dict) else llm_out
        usage = (llm_out or {}).get("usage") if isinstance(llm_out, dict) else None
        total_tokens = int((usage or {}).get("total_tokens", 0) or 0)
        _consume_ai_quota(db, subscription, current_user["email"], request_id, total_tokens)
        _consume_upload_bytes(db, subscription, current_user["email"], request_id, len(content))

        activity = UserActivity(
            user_email=current_user["email"],
            activity_type="ai_query",
            page_name="llm_invoke_with_file",
        )
        db.add(activity)
        db.commit()

        return {
            "response": response,
            "ingestion": {"filename": ingested.get("filename"), "type": ingested.get("type"), "meta": ingested.get("meta")},
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"LLM invoke-with-file error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/integrations/image/generate")
async def generate_image_endpoint(
    request: ImageGenerationRequest,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Generate image using DALL-E"""
    try:
        # Check subscription
        subscription = db.query(Subscription).filter(
            Subscription.user_email == current_user["email"]
        ).first()

        if subscription.plan != "premium":
            raise HTTPException(
                status_code=403,
                detail="Image generation is a Premium feature"
            )

        # Generate image
        image_url = await generate_image(request.prompt, request.size)

        # Log activity
        activity = UserActivity(
            user_email=current_user["email"],
            activity_type="image_generation"
        )
        db.add(activity)
        db.commit()

        return {"image_url": image_url}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Image generation error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/ai/formula")
async def generate_formula_endpoint(
    request: FormulaRequest,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Generate Excel formula from description"""
    try:
        formula_data = await generate_formula(request.description, request.context)

        # Log activity
        activity = UserActivity(
            user_email=current_user["email"],
            activity_type="formula_generation"
        )
        db.add(activity)
        db.commit()

        return formula_data

    except Exception as e:
        logger.error(f"Formula generation error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/ai/analyze")
async def analyze_data_endpoint(
    request: DataAnalysisRequest,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Analyze data and provide insights"""
    try:
        analysis = await analyze_data(request.data_summary, request.question)

        # Log activity
        activity = UserActivity(
            user_email=current_user["email"],
            activity_type="data_analysis"
        )
        db.add(activity)
        db.commit()

        return analysis

    except Exception as e:
        logger.error(f"Data analysis error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/ai/suggest-chart")
async def suggest_chart_endpoint(
    request: ChartSuggestionRequest,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Suggest best chart type for data"""
    try:
        suggestion = await suggest_chart_type(request.columns, request.data_preview)

        # Log activity
        activity = UserActivity(
            user_email=current_user["email"],
            activity_type="chart_suggestion"
        )
        db.add(activity)
        db.commit()

        return suggestion

    except Exception as e:
        logger.error(f"Chart suggestion error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/ai/transform")
async def generate_transform_endpoint(
    request: TransformRequest,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Generate new column transform from natural language (e.g. Profit = Revenue - Cost)."""
    try:
        result = await generate_transform(
            request.columns, request.sample_rows, request.instruction
        )
        activity = UserActivity(
            user_email=current_user["email"],
            activity_type="ai_transform"
        )
        db.add(activity)
        db.commit()
        return result
    except Exception as e:
        logger.error(f"AI transform error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/ai/explain-sql")
async def explain_sql_endpoint(
    request: ExplainSqlRequest,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Explain SQL in plain English."""
    try:
        result = await explain_sql(request.sql, request.db_schema)
        activity = UserActivity(
            user_email=current_user["email"],
            activity_type="ai_explain_sql"
        )
        db.add(activity)
        db.commit()
        return result
    except Exception as e:
        logger.error(f"Explain SQL error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# FILE PROCESSING ENDPOINTS
# ============================================================================

class OCRExportRequest(BaseModel):
    """Request body for OCR export: text -> DOC or PDF. Generic for any form or document image."""
    text: str
    format: str  # "doc" or "pdf"
    title: Optional[str] = "OCR Document"
    # Multi-page PDF export (preferred when input was a PDF)
    pages: Optional[list] = None
    # Layout mode: same positions as the original image (exactly editable)
    layout: Optional[list] = None
    image_width: Optional[int] = None
    image_height: Optional[int] = None
    tables: Optional[list] = None  # from extract for real table grids
    mode: Optional[str] = "form"  # "form" = flow/structure; "layout" = match image positions
    # Exact copy: use original image as full PDF page (looks exactly like input). PDF only.
    preserve_image: Optional[bool] = False
    image_base64: Optional[str] = None  # required when preserve_image=True


@app.post("/api/files/ocr-extract")
async def ocr_extract(
    file: UploadFile = File(...),
    ocr_lang: Optional[str] = Form(None),
    max_pages: Optional[int] = Form(None),
    timeout_seconds: Optional[float] = Form(None),
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Extract text from an image or PDF using OCR.
    - Images: returns text/layout/tables (single-page)
    - PDFs: returns text/pages[] (multi-page) where each page includes layout/tables
    ZERO STORAGE: File content not stored. Returns text, layout, tables for editing; use ocr-export to get DOC/PDF.
    """
    ocr_space_error = None
    try:
        subscription = db.query(Subscription).filter(
            Subscription.user_email == current_user["email"]
        ).first()
        max_size_mb = 500 if subscription and subscription.plan == "premium" else 10
        max_size_bytes = max_size_mb * 1024 * 1024

        file_content = await file.read()
        file_size_mb = len(file_content) / (1024 * 1024)
        if len(file_content) > max_size_bytes:
            raise HTTPException(
                status_code=413,
                detail=f"File size ({file_size_mb:.1f}MB) exceeds {max_size_mb}MB limit"
            )

        ext = (os.path.splitext(file.filename or "")[1] or "").lower()
        if ext not in (OCRService.ALLOWED_IMAGE_EXTENSIONS | OCRService.ALLOWED_PDF_EXTENSIONS):
            raise HTTPException(
                status_code=400,
                detail=f"Invalid file type. Allowed: {', '.join(sorted(OCRService.ALLOWED_IMAGE_EXTENSIONS | OCRService.ALLOWED_PDF_EXTENSIONS))}"
            )

        out = None
        api_key = (os.getenv("OCR_SPACE_API_KEY") or "").strip()

        # PDF: always use PyMuPDF path (digital extraction or OCR per page).
        try:
            ocr_pdf_timeout = float(os.getenv("OCR_TIMEOUT_PDF_SECONDS", "180").strip() or "180")
        except Exception:
            ocr_pdf_timeout = 180.0
        try:
            ocr_img_timeout = float(os.getenv("OCR_TIMEOUT_IMAGE_SECONDS", "120").strip() or "120")
        except Exception:
            ocr_img_timeout = 120.0
        try:
            ocr_default_max_pages = int(os.getenv("OCR_MAX_PAGES_DEFAULT", "25").strip() or "25")
        except Exception:
            ocr_default_max_pages = 25
        ocr_default_max_pages = max(1, min(ocr_default_max_pages, 200))
        ocr_pdf_timeout = max(10.0, min(ocr_pdf_timeout, 900.0))
        ocr_img_timeout = max(10.0, min(ocr_img_timeout, 900.0))

        if isinstance(max_pages, int):
            max_pages = max(1, min(max_pages, 200))
        if isinstance(timeout_seconds, (int, float)):
            timeout_seconds = float(timeout_seconds)
            timeout_seconds = max(10.0, min(timeout_seconds, 900.0))

        if ext in OCRService.ALLOWED_PDF_EXTENSIONS:
            ocr = OCRService()
            try:
                out = await asyncio.wait_for(
                    asyncio.to_thread(ocr.extract_pdf_with_layout, file_content, max_pages or ocr_default_max_pages, ocr_lang),
                    timeout_seconds or ocr_pdf_timeout,
                )
            except asyncio.TimeoutError:
                raise HTTPException(status_code=503, detail="PDF OCR is taking too long. Try a smaller PDF or fewer pages.")

            processing_history = FileProcessingHistory(
                user_email=current_user["email"],
                processing_type="ocr_extract_pdf",
                original_filename=file.filename,
                file_size_mb=file_size_mb,
                status="success"
            )
            db.add(processing_history)
            db.commit()
            logger.info(f"OCR extract PDF: {file.filename} by {current_user['email']}")

            return {
                "text": out.get("text"),
                "pages": out.get("pages"),
                "page_count": out.get("page_count"),
            }

        if not api_key:
            logger.info("OCR.space skipped: OCR_SPACE_API_KEY not set. Using Tesseract. Set OCR_SPACE_API_KEY in Railway to use the API.")
        elif len(file_content) > OCR_SPACE_MAX_BYTES:
            logger.info("OCR.space skipped: file > 1MB. Using Tesseract.")
        else:
            try:
                img = Image.open(io.BytesIO(file_content))
                iw, ih = img.size
                out = await extract_with_layout_ocrspace(
                    api_key, file_content, iw, ih, file.filename or "image.png", ocr_lang
                )
                logger.info(f"OCR extract via OCR.space: {file.filename}")
            except Exception as e:
                ocr_space_error = f"{type(e).__name__}: {e}"
                logger.warning("OCR.space failed, falling back to Tesseract: %s", ocr_space_error)

        if out is None:
            ocr = OCRService()
            try:
                out = await asyncio.wait_for(
                    asyncio.to_thread(ocr.extract_with_layout, io.BytesIO(file_content), ocr_lang),
                    timeout_seconds or ocr_img_timeout,
                )
            except asyncio.TimeoutError:
                msg = "OCR is taking too long. Try a smaller or simpler image, or try again later."
                if ocr_space_error:
                    msg += f" (OCR.space had failed: {ocr_space_error})"
                raise HTTPException(status_code=503, detail=msg)

        processing_history = FileProcessingHistory(
            user_email=current_user["email"],
            processing_type="ocr_extract",
            original_filename=file.filename,
            file_size_mb=file_size_mb,
            status="success"
        )
        db.add(processing_history)
        db.commit()
        logger.info(f"OCR extract: {file.filename} by {current_user['email']}")

        return {
            "text": out["text"],
            "layout": out.get("layout"),
            "image_width": out.get("image_width"),
            "image_height": out.get("image_height"),
            "tables": out.get("tables"),
        }
    except HTTPException:
        raise
    except RuntimeError as e:
        if "Tesseract" in str(e) or "not installed" in str(e).lower():
            detail = str(e)
            if ocr_space_error:
                detail += f" (OCR.space had failed: {ocr_space_error})"
            else:
                detail += " Set OCR_SPACE_API_KEY in Railway to use OCR.space API instead."
            raise HTTPException(status_code=503, detail=detail)
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        logger.error(f"OCR extract error: {str(e)}")
        processing_history = FileProcessingHistory(
            user_email=current_user["email"],
            processing_type="ocr_extract",
            original_filename=file.filename,
            file_size_mb=file_size_mb if 'file_size_mb' in locals() else 0,
            status="failed",
            error_message=str(e)
        )
        db.add(processing_history)
        db.commit()
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/developer/proxy")
async def developer_api_proxy(
    request: Request,
    endpoint: str = Form(...),
    api_key: str = Form(...),
    file: UploadFile = File(...),
    ocr_lang: Optional[str] = Form(None),
    options: Optional[str] = Form(None),
    mode: Optional[str] = Form(None),
    max_pages: Optional[int] = Form(None),
    timeout_seconds: Optional[float] = Form(None),
    db: Session = Depends(get_db),
):
    """Proxy browser-based API testing requests.

    This runs conversions locally on the Railway backend and authenticates using X-API-Key
    (stored hashed in api_keys). This avoids CORS and avoids relying on api.developer.meldra.ai.
    """

    if not api_key or not api_key.strip():
        raise HTTPException(status_code=400, detail="API key is required")

    key = get_api_key_by_header(api_key.strip(), db)
    if not key:
        raise HTTPException(status_code=401, detail="Invalid API key")
    if not key.is_active:
        raise HTTPException(status_code=403, detail="API key is inactive")

    ip_address = getattr(getattr(request, "client", None), "host", None)
    user_agent = None
    try:
        user_agent = request.headers.get("user-agent")
    except Exception:
        user_agent = None

    request_id = str(uuid.uuid4())

    started = time.time()
    raw = await file.read()
    status_code = 200
    response_size = None

    try:
        # Dispatch to local converters
        if endpoint == "pdf-to-doc":
            data, err = pdf_to_docx_smart(raw, ocr_lang=ocr_lang, mode=mode)
            if err:
                raise HTTPException(status_code=400, detail=err)
            media = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            out_ext = ".docx"
        elif endpoint == "doc-to-pdf":
            data, err = docx_to_pdf(raw)
            if err:
                raise HTTPException(status_code=400, detail=err)
            media = "application/pdf"
            out_ext = ".pdf"
        elif endpoint == "ppt-to-pdf":
            data, err = pptx_to_pdf(raw)
            if err:
                raise HTTPException(status_code=400, detail=err)
            media = "application/pdf"
            out_ext = ".pdf"
        elif endpoint == "pdf-to-ppt":
            data, err = pdf_to_pptx(raw)
            if err:
                raise HTTPException(status_code=400, detail=err)
            media = "application/vnd.openxmlformats-officedocument.presentationml.presentation"
            out_ext = ".pptx"
        elif endpoint == "zip-clean":
            # Reuse existing zip processor logic (same as /api/files/process-zip but keyed)
            zip_service = ZipProcessorService()
            try:
                user_options = None
                if options and options.strip():
                    try:
                        user_options = json.loads(options)
                    except Exception:
                        raise HTTPException(status_code=400, detail="Invalid options JSON")

                merged_options = {
                    "allowed_chars": "a-z0-9-_",
                    "replace_char": "_",
                    "remove_spaces": True,
                    "max_length": 255,
                }
                if isinstance(user_options, dict):
                    # Support both camelCase (docs) and snake_case (internal)
                    if user_options.get("allowedChars") is not None:
                        merged_options["allowed_chars"] = str(user_options.get("allowedChars") or "")
                    if user_options.get("allowed_chars") is not None:
                        merged_options["allowed_chars"] = str(user_options.get("allowed_chars") or "")
                    if user_options.get("replaceChar") is not None:
                        merged_options["replace_char"] = str(user_options.get("replaceChar") or "")
                    if user_options.get("replace_char") is not None:
                        merged_options["replace_char"] = str(user_options.get("replace_char") or "")
                    if user_options.get("removeSpaces") is not None:
                        merged_options["remove_spaces"] = bool(user_options.get("removeSpaces"))
                    if user_options.get("remove_spaces") is not None:
                        merged_options["remove_spaces"] = bool(user_options.get("remove_spaces"))
                    if user_options.get("maxLength") is not None:
                        merged_options["max_length"] = int(user_options.get("maxLength") or 0) or 255
                    if user_options.get("max_length") is not None:
                        merged_options["max_length"] = int(user_options.get("max_length") or 0) or 255

                data = await zip_service.process_zip(
                    zip_file=raw,
                    options=merged_options,
                )
            except Exception as e:
                raise HTTPException(status_code=400, detail=str(e))
            media = "application/zip"
            out_ext = ".zip"
        elif endpoint in ("ocr-to-doc", "ocr-to-pdf"):
            ext = (os.path.splitext(file.filename or "")[1] or "").lower()
            if ext not in (OCRService.ALLOWED_IMAGE_EXTENSIONS | OCRService.ALLOWED_PDF_EXTENSIONS):
                raise HTTPException(status_code=400, detail="Invalid file type for OCR. Upload a PDF or image.")

            ocr = OCRService()
            lang = ocr_lang

            try:
                ocr_pdf_timeout = float(os.getenv("OCR_TIMEOUT_PDF_SECONDS", "180").strip() or "180")
            except Exception:
                ocr_pdf_timeout = 180.0
            try:
                ocr_img_timeout = float(os.getenv("OCR_TIMEOUT_IMAGE_SECONDS", "120").strip() or "120")
            except Exception:
                ocr_img_timeout = 120.0
            try:
                ocr_default_max_pages = int(os.getenv("OCR_MAX_PAGES_DEFAULT", "25").strip() or "25")
            except Exception:
                ocr_default_max_pages = 25
            ocr_default_max_pages = max(1, min(ocr_default_max_pages, 200))
            ocr_pdf_timeout = max(10.0, min(ocr_pdf_timeout, 900.0))
            ocr_img_timeout = max(10.0, min(ocr_img_timeout, 900.0))

            if ext in OCRService.ALLOWED_PDF_EXTENSIONS:
                try:
                    out = await asyncio.wait_for(
                        asyncio.to_thread(ocr.extract_pdf_with_layout, raw, max_pages or ocr_default_max_pages, lang),
                        timeout_seconds or ocr_pdf_timeout,
                    )
                except asyncio.TimeoutError:
                    raise HTTPException(status_code=503, detail="PDF OCR is taking too long. Try a smaller PDF or fewer pages.")
                pages = out.get("pages") or []
                if endpoint == "ocr-to-doc":
                    data = ocr.text_to_docx_layout_pages(pages, title="OCR Document")
                    media = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                    out_ext = ".docx"
                else:
                    data = ocr.text_to_pdf_layout_pages(pages, title="OCR Document")
                    media = "application/pdf"
                    out_ext = ".pdf"
            else:
                if endpoint == "ocr-to-pdf" and (mode or "").strip().lower() in ("exact", "image", "render"):
                    data = pdf_from_image(raw)
                    media = "application/pdf"
                    out_ext = ".pdf"
                else:
                    out = None
                    ocr_space_error = None
                    ocr_space_key = (os.getenv("OCR_SPACE_API_KEY") or "").strip()
                    if ocr_space_key and len(raw) <= OCR_SPACE_MAX_BYTES:
                        try:
                            with Image.open(io.BytesIO(raw)) as img:
                                iw, ih = img.size
                            out = await asyncio.wait_for(
                                extract_with_layout_ocrspace(
                                    ocr_space_key,
                                    raw,
                                    iw,
                                    ih,
                                    file.filename or "image.png",
                                    lang,
                                ),
                                min(timeout_seconds or ocr_img_timeout, 45.0),
                            )
                            logger.info(f"Developer OCR via OCR.space: {file.filename}")
                        except asyncio.TimeoutError:
                            ocr_space_error = "OCR.space timed out"
                            out = None
                        except Exception as e:
                            ocr_space_error = str(e)
                            logger.warning(f"Developer OCR via OCR.space failed: {ocr_space_error}")
                            out = None

                    if out is None:
                        try:
                            out = await asyncio.wait_for(
                                asyncio.to_thread(ocr.extract_with_layout, io.BytesIO(raw), lang),
                                timeout_seconds or ocr_img_timeout,
                            )
                        except asyncio.TimeoutError:
                            detail = "OCR is taking too long. Try a smaller or simpler image, or try again later."
                            if ocr_space_error:
                                detail += f" (OCR.space had failed: {ocr_space_error})"
                            raise HTTPException(status_code=503, detail=detail)
                    layout = out.get("layout") or []
                    iw = int(out.get("image_width") or 0)
                    ih = int(out.get("image_height") or 0)
                    tables = out.get("tables") or []
                    if endpoint == "ocr-to-doc":
                        data = ocr.text_to_docx_layout(layout, iw, ih, title="OCR Document", tables=tables)
                        media = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                        out_ext = ".docx"
                    else:
                        data = ocr.text_to_pdf_layout(layout, iw, ih, title="OCR Document", tables=tables)
                        media = "application/pdf"
                        out_ext = ".pdf"
        else:
            raise HTTPException(status_code=400, detail="Unknown endpoint")

        response_size = len(data) if data is not None else None
        elapsed_ms = int((time.time() - started) * 1000)
        track_api_usage(
            db=db,
            api_key=key,
            endpoint=f"/v1/{endpoint}",
            method="POST",
            status_code=200,
            request_size_bytes=len(raw),
            response_size_bytes=response_size,
            processing_time_ms=elapsed_ms,
            ip_address=ip_address,
            user_agent=user_agent,
        )

        base = (os.path.splitext(file.filename or "file")[0] or "file").rstrip(".")
        base = _ascii_safe_filename(base)

        ocr_mode_header = None
        if endpoint == "ocr-to-pdf":
            mode_norm = (mode or "").strip().lower()
            if mode_norm in ("exact", "image", "render"):
                out_name = f"{base}_exact{out_ext}"
                ocr_mode_header = "exact"
            else:
                out_name = f"{base}_searchable{out_ext}"
                ocr_mode_header = "searchable"
        else:
            out_name = f"{base}{out_ext}"

        headers = {"Content-Disposition": f"attachment; filename={out_name}"}
        if ocr_mode_header:
            headers["X-Meldra-OCR-Mode"] = ocr_mode_header

        return StreamingResponse(
            io.BytesIO(data),
            media_type=media,
            headers=headers,
        )
    except HTTPException as e:
        status_code = e.status_code
        elapsed_ms = int((time.time() - started) * 1000)
        try:
            track_api_usage(
                db=db,
                api_key=key,
                endpoint=f"/v1/{endpoint}",
                method="POST",
                status_code=status_code,
                request_size_bytes=len(raw) if raw is not None else None,
                response_size_bytes=response_size,
                processing_time_ms=elapsed_ms,
                ip_address=ip_address,
                user_agent=user_agent,
            )
        except Exception:
            pass
        raise
    except Exception as e:
        logger.exception(
            "Developer API proxy failed",
            extra={
                "request_id": request_id,
                "endpoint": endpoint,
                "filename": getattr(file, "filename", None),
                "ip": ip_address,
            },
        )
        elapsed_ms = int((time.time() - started) * 1000)
        try:
            track_api_usage(
                db=db,
                api_key=key,
                endpoint=f"/v1/{endpoint}",
                method="POST",
                status_code=500,
                request_size_bytes=len(raw) if raw is not None else None,
                response_size_bytes=response_size,
                processing_time_ms=elapsed_ms,
                ip_address=ip_address,
                user_agent=user_agent,
            )
        except Exception:
            pass
        raise HTTPException(
            status_code=500,
            detail=f"Developer API proxy failed (request_id={request_id})",
        )


@app.post("/api/developer/files/excel-ops/execute")
async def developer_excel_ops_execute(
    request: Request,
    api_key: str = Form(...),
    file: UploadFile = File(...),
    plan_json: str = Form(...),
    preview_limit: Optional[int] = Form(None),
    return_mode: Optional[str] = Form(None),
    db: Session = Depends(get_db),
):
    if not api_key or not api_key.strip():
        raise HTTPException(status_code=400, detail="API key is required")

    key = get_api_key_by_header(api_key.strip(), db)
    if not key:
        raise HTTPException(status_code=401, detail="Invalid API key")
    if not key.is_active:
        raise HTTPException(status_code=403, detail="API key is inactive")

    ip_address = getattr(getattr(request, "client", None), "host", None)
    user_agent = None
    try:
        user_agent = request.headers.get("user-agent")
    except Exception:
        user_agent = None

    started = time.time()
    raw = await file.read()
    status_code = 200
    response_size = None

    try:
        ext = (os.path.splitext(file.filename or "")[1] or "").lower()
        if ext not in (".xlsx", ".xls", ".csv", ".tsv"):
            raise HTTPException(status_code=400, detail="Invalid file type. Only .xlsx, .xls, .csv, .tsv are supported.")

        try:
            plim = int(preview_limit) if preview_limit is not None else 50
        except Exception:
            plim = 50
        plim = max(1, min(plim, 500))

        mode = (return_mode or "preview").strip().lower()
        if mode not in ("preview", "csv"):
            raise HTTPException(status_code=400, detail="return_mode must be preview|csv")

        svc = ExcelOpsService()
        result, csv_bytes = svc.execute_plan_and_export_csv(
            filename=file.filename or "uploaded_file",
            content=raw,
            plan_json=plan_json,
            preview_limit=plim,
        )

        response_size = len(csv_bytes) if csv_bytes is not None else None
        elapsed_ms = int((time.time() - started) * 1000)
        track_api_usage(
            db=db,
            api_key=key,
            endpoint="/v1/excel-ops/execute",
            method="POST",
            status_code=200,
            request_size_bytes=(len(raw) if raw is not None else None),
            response_size_bytes=response_size,
            processing_time_ms=elapsed_ms,
            ip_address=ip_address,
            user_agent=user_agent,
        )

        if mode == "csv":
            base = (os.path.splitext(file.filename or "file")[0] or "file").rstrip(".")
            base = _ascii_safe_filename(base)
            headers = {"Content-Disposition": f"attachment; filename={base}_excel_ops.csv"}
            return StreamingResponse(io.BytesIO(csv_bytes), media_type="text/csv", headers=headers)

        return {
            "preview": result.preview_rows,
            "row_count": result.row_count,
            "elapsed_ms": result.elapsed_ms,
        }
    except HTTPException as e:
        status_code = e.status_code
        elapsed_ms = int((time.time() - started) * 1000)
        try:
            track_api_usage(
                db=db,
                api_key=key,
                endpoint="/v1/excel-ops/execute",
                method="POST",
                status_code=status_code,
                request_size_bytes=(len(raw) if raw is not None else None),
                response_size_bytes=response_size,
                processing_time_ms=elapsed_ms,
                ip_address=ip_address,
                user_agent=user_agent,
            )
        except Exception:
            pass
        raise
    except Exception:
        elapsed_ms = int((time.time() - started) * 1000)
        try:
            track_api_usage(
                db=db,
                api_key=key,
                endpoint="/v1/excel-ops/execute",
                method="POST",
                status_code=500,
                request_size_bytes=(len(raw) if raw is not None else None),
                response_size_bytes=response_size,
                processing_time_ms=elapsed_ms,
                ip_address=ip_address,
                user_agent=user_agent,
            )
        except Exception:
            pass
        raise HTTPException(status_code=500, detail="Excel ops execution failed")


@app.post("/api/developer/files/excel-ops/charts")
async def developer_excel_ops_charts(
    request: Request,
    api_key: str = Form(...),
    file: UploadFile = File(...),
    plan_json: str = Form(...),
    chart_json: str = Form(...),
    db: Session = Depends(get_db),
):
    if not api_key or not api_key.strip():
        raise HTTPException(status_code=400, detail="API key is required")

    key = get_api_key_by_header(api_key.strip(), db)
    if not key:
        raise HTTPException(status_code=401, detail="Invalid API key")
    if not key.is_active:
        raise HTTPException(status_code=403, detail="API key is inactive")

    ip_address = getattr(getattr(request, "client", None), "host", None)
    user_agent = None
    try:
        user_agent = request.headers.get("user-agent")
    except Exception:
        user_agent = None

    started = time.time()
    raw = await file.read()
    status_code = 200
    response_size = None

    try:
        ext = (os.path.splitext(file.filename or "")[1] or "").lower()
        if ext not in (".xlsx", ".xls", ".csv", ".tsv"):
            raise HTTPException(status_code=400, detail="Invalid file type. Only .xlsx, .xls, .csv, .tsv are supported.")

        if not (plan_json or "").strip():
            raise HTTPException(status_code=400, detail="plan_json is required")
        if not (chart_json or "").strip():
            raise HTTPException(status_code=400, detail="chart_json is required")

        svc = ExcelOpsService()
        plan = json.loads(plan_json)
        result, con = svc.execute_plan(filename=file.filename or "uploaded_file", content=raw, plan=plan, preview_limit=50)

        # final view is v{len(steps)}
        steps = plan.get("steps") or []
        view_name = f"v{len(steps)}"
        df = con.execute(f"SELECT * FROM {view_name}").df()

        chart_svc = XlsxChartService()
        built = chart_svc.build_workbook_from_dataframe(df=df, chart_plan_json=chart_json)
        xlsx_bytes = built.xlsx_bytes
        response_size = len(xlsx_bytes) if xlsx_bytes is not None else None

        elapsed_ms = int((time.time() - started) * 1000)
        track_api_usage(
            db=db,
            api_key=key,
            endpoint="/v1/excel-ops/charts",
            method="POST",
            status_code=200,
            request_size_bytes=(len(raw) if raw is not None else None),
            response_size_bytes=response_size,
            processing_time_ms=elapsed_ms,
            ip_address=ip_address,
            user_agent=user_agent,
        )

        base = (os.path.splitext(file.filename or "file")[0] or "file").rstrip(".")
        base = _ascii_safe_filename(base)
        headers = {"Content-Disposition": f"attachment; filename={base}_charts.xlsx"}
        return StreamingResponse(
            io.BytesIO(xlsx_bytes),
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers=headers,
        )
    except HTTPException as e:
        status_code = e.status_code
        elapsed_ms = int((time.time() - started) * 1000)
        try:
            track_api_usage(
                db=db,
                api_key=key,
                endpoint="/v1/excel-ops/charts",
                method="POST",
                status_code=status_code,
                request_size_bytes=(len(raw) if raw is not None else None),
                response_size_bytes=response_size,
                processing_time_ms=elapsed_ms,
                ip_address=ip_address,
                user_agent=user_agent,
            )
        except Exception:
            pass
        raise
    except Exception:
        elapsed_ms = int((time.time() - started) * 1000)
        try:
            track_api_usage(
                db=db,
                api_key=key,
                endpoint="/v1/excel-ops/charts",
                method="POST",
                status_code=500,
                request_size_bytes=(len(raw) if raw is not None else None),
                response_size_bytes=response_size,
                processing_time_ms=elapsed_ms,
                ip_address=ip_address,
                user_agent=user_agent,
            )
        except Exception:
            pass
        raise HTTPException(status_code=500, detail="Excel charts generation failed")


@app.post("/api/developer/files/generate-pl-with-file")
async def developer_generate_pl_with_file(
    request: Request,
    api_key: str = Form(...),
    prompt: str = Form(...),
    context_json: Optional[str] = Form(None),
    llm_assist_headers_only: bool = Form(False),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    if not api_key or not api_key.strip():
        raise HTTPException(status_code=400, detail="API key is required")

    key = get_api_key_by_header(api_key.strip(), db)
    if not key:
        raise HTTPException(status_code=401, detail="Invalid API key")
    if not key.is_active:
        raise HTTPException(status_code=403, detail="API key is inactive")

    ip_address = getattr(getattr(request, "client", None), "host", None)
    user_agent = None
    try:
        user_agent = request.headers.get("user-agent")
    except Exception:
        user_agent = None

    started = time.time()
    response_size = None
    raw = b""

    try:
        if not (prompt or "").strip():
            raise HTTPException(status_code=400, detail="Prompt is required")

        raw = await file.read()

        plan = (getattr(key, "plan", "") or "").strip().lower()
        max_size_mb = 500 if plan == "premium" else 10
        max_bytes = max_size_mb * 1024 * 1024
        if len(raw) > max_bytes:
            raise HTTPException(status_code=413, detail=f"File size exceeds {max_size_mb}MB limit")

        context = {}
        if context_json:
            try:
                context = json.loads(context_json) or {}
            except Exception:
                raise HTTPException(status_code=400, detail="context_json must be valid JSON")

        svc = IngestionService(IngestLimits(max_bytes=max_bytes))
        try:
            ingested = svc.ingest(file.filename or "uploaded_file", raw)
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e))

        pl_service = PLBuilderService()
        excel_data = await pl_service.generate_pl_from_uploaded_excel(
            filename=(file.filename or "uploaded_file"),
            content=raw,
            prompt=prompt,
            user_context=context,
            llm_assist_headers_only=bool(llm_assist_headers_only),
        )

        if should_apply_watermark(getattr(subscription, "plan", None)):
            excel_data = watermark_xlsx_bytes(excel_data)
        response_size = len(excel_data) if excel_data is not None else None

        elapsed_ms = int((time.time() - started) * 1000)
        track_api_usage(
            db=db,
            api_key=key,
            endpoint="/v1/files/generate-pl-with-file",
            method="POST",
            status_code=200,
            request_size_bytes=(len(raw) if raw is not None else None),
            response_size_bytes=response_size,
            processing_time_ms=elapsed_ms,
            ip_address=ip_address,
            user_agent=user_agent,
        )

        return StreamingResponse(
            io.BytesIO(excel_data),
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={
                "Content-Disposition": f'attachment; filename="Profit_Loss_{datetime.now().strftime("%Y%m%d_%H%M%S_%f")[:-3]}.xlsx"'
            },
        )
    except HTTPException as e:
        elapsed_ms = int((time.time() - started) * 1000)
        try:
            track_api_usage(
                db=db,
                api_key=key,
                endpoint="/v1/files/generate-pl-with-file",
                method="POST",
                status_code=e.status_code,
                request_size_bytes=(len(raw) if raw is not None else None),
                response_size_bytes=response_size,
                processing_time_ms=elapsed_ms,
                ip_address=ip_address,
                user_agent=user_agent,
            )
        except Exception:
            pass
        raise
    except Exception:
        elapsed_ms = int((time.time() - started) * 1000)
        try:
            track_api_usage(
                db=db,
                api_key=key,
                endpoint="/v1/files/generate-pl-with-file",
                method="POST",
                status_code=500,
                request_size_bytes=(len(raw) if raw is not None else None),
                response_size_bytes=response_size,
                processing_time_ms=elapsed_ms,
                ip_address=ip_address,
                user_agent=user_agent,
            )
        except Exception:
            pass
        raise HTTPException(status_code=500, detail="P&L generation failed")


@app.post("/api/files/excel-to-ppt")
async def excel_to_ppt(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        subscription = db.query(Subscription).filter(
            Subscription.user_email == current_user["email"]
        ).first()
        _enforce_conversion_quota(db, current_user["email"], "excel_to_ppt", subscription)

        # Check file size based on subscription
        max_size_mb = 500 if subscription and subscription.plan == "premium" else 10
        max_size_bytes = max_size_mb * 1024 * 1024

        # Read file size
        file_content = await file.read()
        file_size_mb = len(file_content) / (1024 * 1024)

        if len(file_content) > max_size_bytes:
            raise HTTPException(
                status_code=413,
                detail=f"File size ({file_size_mb:.1f}MB) exceeds {max_size_mb}MB limit"
            )

        # Validate file type
        if not file.filename.endswith((".xlsx", ".xls", ".csv")):
            raise HTTPException(status_code=400, detail="Invalid file type")

        # Convert to PPT
        ppt_service = ExcelToPPTService()
        ppt_data = await ppt_service.convert_excel_to_ppt(
            io.BytesIO(file_content),
            file.filename,
        )

        if should_apply_watermark(getattr(subscription, "plan", None)):
            ppt_data = watermark_pptx_bytes(ppt_data)

        # Log processing history (NO file content)
        processing_history = FileProcessingHistory(
            user_email=current_user["email"],
            processing_type="excel_to_ppt",
            original_filename=file.filename,
            file_size_mb=file_size_mb,
            status="success",
        )
        db.add(processing_history)
        db.commit()

        logger.info(f"Excel to PPT conversion: {file.filename} by {current_user['email']}")

        base = _ascii_safe_filename(file.filename.replace(".xlsx", "").replace(".xls", ""))
        # Return file as download
        return StreamingResponse(
            io.BytesIO(ppt_data),
            media_type="application/vnd.openxmlformats-officedocument.presentationml.presentation",
            headers={
                "Content-Disposition": f"attachment; filename={base}_presentation.pptx"
            },
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Excel to PPT error: {str(e)}")

        # Log failed processing
        processing_history = FileProcessingHistory(
            user_email=current_user["email"],
            processing_type="excel_to_ppt",
            original_filename=file.filename,
            file_size_mb=file_size_mb if 'file_size_mb' in locals() else 0,
            status="failed",
            error_message=str(e),
        )
        db.add(processing_history)
        db.commit()

        raise HTTPException(status_code=500, detail=f"Conversion failed: {str(e)}")


@app.post("/api/files/analyze")
async def analyze_file(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Analyze Excel/CSV file and provide AI-powered insights
    ZERO STORAGE: File content NOT stored, only analysis results
    """
    try:
        # Check file size based on subscription
        subscription = db.query(Subscription).filter(
            Subscription.user_email == current_user["email"]
        ).first()

        max_size_mb = 500 if subscription and subscription.plan == "premium" else 10
        max_size_bytes = max_size_mb * 1024 * 1024

        # Read file content
        file_content = await file.read()
        file_size_mb = len(file_content) / (1024 * 1024)

        if len(file_content) > max_size_bytes:
            raise HTTPException(
                status_code=413,
                detail=f"File size ({file_size_mb:.1f}MB) exceeds {max_size_mb}MB limit"
            )

        # Validate file type
        if not file.filename.endswith(('.xlsx', '.xls', '.csv')):
            raise HTTPException(status_code=400, detail="Invalid file type. Only .xlsx, .xls, and .csv files are supported.")

        # Analyze file
        analyzer = FileAnalyzerService()
        analysis_result = await analyzer.analyze_excel_file(
            io.BytesIO(file_content),
            file.filename
        )

        # Log processing history (NO file content)
        processing_history = FileProcessingHistory(
            user_email=current_user["email"],
            processing_type="file_analysis",
            original_filename=file.filename,
            file_size_mb=file_size_mb,
            status="success"
        )
        db.add(processing_history)
        db.commit()

        logger.info(f"File analyzed: {file.filename} by {current_user['email']}")

        return analysis_result

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"File analysis error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")


@app.post("/api/files/generate-pl")
async def generate_pl(
    request: Request,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Generate P&L Excel file from natural language description
    ZERO STORAGE: Generated file NOT stored
    """
    try:
        body = await request.json()
        prompt = body.get("prompt", "")
        context = body.get("context", {})

        if not prompt:
            raise HTTPException(status_code=400, detail="Prompt is required")

        _enforce_verified_user(db, current_user["email"])
        request_id = _get_request_id(request)
        subscription = _get_or_create_subscription(db, current_user["email"])
        _enforce_ai_quota(subscription)

        # Generate P&L
        pl_service = PLBuilderService()
        excel_data = await pl_service.generate_pl_from_natural_language(
            prompt,
            context
        )

        if should_apply_watermark(getattr(subscription, "plan", None)):
            excel_data = watermark_xlsx_bytes(excel_data)

        _consume_ai_quota(db, subscription, current_user["email"], request_id, _estimate_tokens_from_text(prompt))

        # Log activity
        activity = UserActivity(
            user_email=current_user["email"],
            activity_type="pl_generation"
        )
        db.add(activity)
        db.commit()

        logger.info(f"P&L generated by {current_user['email']}")

        # Return file as download
        return StreamingResponse(
            io.BytesIO(excel_data),
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={
                "Content-Disposition": f'attachment; filename="Profit_Loss_{datetime.now().strftime("%Y%m%d_%H%M%S_%f")[:-3]}.xlsx"'
            }
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"P&L generation error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"P&L generation failed: {str(e)}")


@app.post("/api/files/generate-pl-with-file")
async def generate_pl_with_file(
    request: Request,
    prompt: str = Form(...),
    context_json: Optional[str] = Form(None),
    llm_assist_headers_only: bool = Form(False),
    candidate_id: Optional[str] = Form(None),
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Generate a P&L Excel file from natural language + uploaded file context."""
    try:
        if not (prompt or "").strip():
            raise HTTPException(status_code=400, detail="Prompt is required")

        _enforce_verified_user(db, current_user["email"])
        request_id = _get_request_id(request)
        subscription = _get_or_create_subscription(db, current_user["email"])
        _enforce_ai_quota(subscription)

        max_size_mb = 500 if subscription.plan == "premium" else 10
        max_bytes = max_size_mb * 1024 * 1024
        content = await file.read()
        if len(content) > max_bytes:
            raise HTTPException(status_code=413, detail=f"File size exceeds {max_size_mb}MB limit")

        context = {}
        if context_json:
            try:
                context = json.loads(context_json) or {}
            except Exception:
                raise HTTPException(status_code=400, detail="context_json must be valid JSON")

        svc = IngestionService(IngestLimits(max_bytes=max_bytes))
        try:
            ingested = svc.ingest(file.filename or "uploaded_file", content)
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e))

        pl_service = PLBuilderService()
        excel_data = await pl_service.generate_pl_from_uploaded_excel(
            filename=(file.filename or "uploaded_file"),
            content=content,
            prompt=prompt,
            user_context=context,
            llm_assist_headers_only=bool(llm_assist_headers_only),
            candidate_id=(candidate_id or None),
        )

        _enforce_upload_quota(subscription, len(content))
        _consume_upload_bytes(db, subscription, current_user["email"], request_id, len(content))
        _consume_ai_quota(db, subscription, current_user["email"], request_id, _estimate_tokens_from_text(prompt))

        return StreamingResponse(
            io.BytesIO(excel_data),
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={
                "Content-Disposition": f'attachment; filename="Profit_Loss_{datetime.now().strftime("%Y%m%d_%H%M%S_%f")[:-3]}.xlsx"'
            },
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"P&L generate-with-file error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"P&L generation failed: {str(e)}")


@app.post("/api/files/pl-extraction-preview")
async def pl_extraction_preview(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Preview deterministic P&L extraction from an uploaded Excel file (ZERO STORAGE)."""
    try:
        _enforce_verified_user(db, current_user["email"])
        subscription = _get_or_create_subscription(db, current_user["email"])

        max_size_mb = 500 if subscription.plan == "premium" else 10
        max_bytes = max_size_mb * 1024 * 1024
        content = await file.read()
        if len(content) > max_bytes:
            raise HTTPException(status_code=413, detail=f"File size exceeds {max_size_mb}MB limit")

        if not (file.filename or "").lower().endswith((".xlsx", ".xls")):
            raise HTTPException(status_code=400, detail="Invalid file type. Only .xlsx and .xls are supported.")

        pl_service = PLBuilderService()
        preview = pl_service.preview_extraction_from_uploaded_excel(
            filename=(file.filename or "uploaded_file"),
            content=content,
        )

        return preview
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"P&L extraction preview error: {str(e)}")
        raise HTTPException(status_code=500, detail="Preview failed")


@app.post("/api/files/universal-analyze")
async def universal_analyze(
    file: UploadFile = File(...),
    recalculate: bool = Query(False),
    overrides: str = Form(None),
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Universal Excel analysis for dashboard charts (ZERO STORAGE).

    Strict correctness mode:
    - Detect formulas and whether cached results appear missing.
    - If a sheet is "blocked", it is excluded from chart generation.
    - Response returns only aggregates + provenance (no raw cell data).
    """
    processor: Optional[UniversalExcelProcessor] = None
    try:
        _enforce_verified_user(db, current_user["email"])
        subscription = _get_or_create_subscription(db, current_user["email"])

        max_size_mb = 500 if subscription.plan == "premium" else 10
        max_bytes = max_size_mb * 1024 * 1024
        content = await file.read()
        file_size_mb = len(content) / (1024 * 1024)
        if len(content) > max_bytes:
            raise HTTPException(status_code=413, detail=f"File size ({file_size_mb:.1f}MB) exceeds {max_size_mb}MB limit")

        if not (file.filename or "").lower().endswith((".xlsx", ".xls")):
            raise HTTPException(status_code=400, detail="Invalid file type. Only .xlsx and .xls are supported.")

        overrides_obj = None
        if overrides:
            try:
                overrides_obj = json.loads(overrides)
            except Exception:
                raise HTTPException(status_code=400, detail="Invalid overrides JSON")

        processor = UniversalExcelProcessor(content, file.filename or "uploaded_file", overrides=overrides_obj)
        results = processor.process_universal()

        results["recalculation"] = {
            "requested": bool(recalculate),
            "attempted": False,
            "method": None,
            "success": False,
            "message": None,
        }

        # Option A+ (premium-only): attempt server-side recalculation if strict mode blocks.
        if recalculate and (results.get("status") == "blocked"):
            if subscription.plan != "premium":
                results["recalculation"]["attempted"] = False
                results["recalculation"]["message"] = "Server-side recalculation is available on Premium plan"
            else:
                results["recalculation"]["attempted"] = True
                results["recalculation"]["method"] = "libreoffice"
                recalc_bytes, recalc_msg = recalc_xlsx_with_libreoffice_bytes(
                    content=content,
                    filename=(file.filename or "uploaded_file.xlsx"),
                    timeout_seconds=60,
                )

                if recalc_bytes is None:
                    results["recalculation"]["success"] = False
                    results["recalculation"]["message"] = recalc_msg
                else:
                    results["recalculation"]["success"] = True
                    results["recalculation"]["message"] = "ok"
                    try:
                        try:
                            processor.close()
                        except Exception:
                            pass
                        processor = UniversalExcelProcessor(recalc_bytes, file.filename or "uploaded_file")
                        results = processor.process_universal()
                        results["recalculation"] = {
                            "requested": True,
                            "attempted": True,
                            "method": "libreoffice",
                            "success": True,
                            "message": "ok",
                        }
                    except Exception as e:
                        results = {
                            "filename": file.filename or "uploaded_file",
                            "file_size_mb": round(file_size_mb, 2),
                            "diagnostics": {"sheets": []},
                            "charts": [],
                            "status": "blocked",
                            "message": "Recalculation succeeded but analysis failed",
                            "recalculation": {
                                "requested": True,
                                "attempted": True,
                                "method": "libreoffice",
                                "success": False,
                                "message": str(e),
                            },
                        }

        if results.get("status") == "blocked":
            results["action_required"] = {
                "message": "File contains formulas without cached values",
                "steps": [
                    "Open file in Excel",
                    "Calculate (F9 / Formulas → Calculate Now)",
                    "Save (Ctrl+S)",
                    "Re-upload the file",
                ],
                "alternative": "Paste Special → Values to remove formulas",
            }

        # Log processing history (NO file content)
        processing_history = FileProcessingHistory(
            user_email=current_user["email"],
            processing_type="universal_analyze",
            original_filename=file.filename,
            file_size_mb=file_size_mb,
            status=str(results.get("status") or "success"),
        )
        db.add(processing_history)
        db.commit()

        return results
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Universal analyze error: {str(e)}")
        raise HTTPException(status_code=500, detail="Universal analyze failed")
    finally:
        try:
            if processor is not None:
                processor.close()
        except Exception:
            pass


@app.post("/api/files/standardize-preview")
async def standardize_preview(
    request: Request,
    file: UploadFile = File(...),
    dedupe_rows: bool = Form(True),
    normalize_headers: bool = Form(True),
    parse_numbers: bool = Form(True),
    parse_dates: bool = Form(True),
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Preview deterministic file standardization (ZERO STORAGE)."""
    try:
        _enforce_verified_user(db, current_user["email"])
        subscription = _get_or_create_subscription(db, current_user["email"])

        max_size_mb = 500 if subscription.plan == "premium" else 10
        max_bytes = max_size_mb * 1024 * 1024
        content = await file.read()
        if len(content) > max_bytes:
            raise HTTPException(status_code=413, detail=f"File size exceeds {max_size_mb}MB limit")

        svc = StandardizeService()
        opts = StandardizeOptions(
            dedupe_rows=bool(dedupe_rows),
            normalize_headers=bool(normalize_headers),
            parse_numbers=bool(parse_numbers),
            parse_dates=bool(parse_dates),
        )
        _out, summary = svc.standardize(file.filename or "uploaded_file", content, options=opts)
        summary["note"] = "Preview only. Run Standardize to download the standardized workbook."
        return summary
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Standardize preview error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Standardize preview failed: {str(e)}")


@app.post("/api/files/standardize")
async def standardize_download(
    request: Request,
    file: UploadFile = File(...),
    dedupe_rows: bool = Form(True),
    normalize_headers: bool = Form(True),
    parse_numbers: bool = Form(True),
    parse_dates: bool = Form(True),
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Standardize a file and return a downloadable Excel workbook (ZERO STORAGE)."""
    try:
        request_id = _get_request_id(request)
        _enforce_verified_user(db, current_user["email"])
        subscription = _get_or_create_subscription(db, current_user["email"])

        max_size_mb = 500 if subscription.plan == "premium" else 10
        max_bytes = max_size_mb * 1024 * 1024
        content = await file.read()
        if len(content) > max_bytes:
            raise HTTPException(status_code=413, detail=f"File size exceeds {max_size_mb}MB limit")

        _enforce_upload_quota(subscription, len(content))
        _enforce_transactions_quota(subscription)

        svc = StandardizeService()
        opts = StandardizeOptions(
            dedupe_rows=bool(dedupe_rows),
            normalize_headers=bool(normalize_headers),
            parse_numbers=bool(parse_numbers),
            parse_dates=bool(parse_dates),
        )
        out_bytes, summary = svc.standardize(file.filename or "uploaded_file", content, options=opts)

        base = (os.path.splitext(file.filename or "file")[0] or "file").rstrip(".")
        base = _ascii_safe_filename(base)
        headers = {
            "Content-Disposition": f"attachment; filename={base}_standardized.xlsx",
            "X-Standardize-Rows-Before": str(summary.get("rows_before") or 0),
            "X-Standardize-Rows-After": str(summary.get("rows_after") or 0),
            "X-Standardize-Duplicates-Removed": str(summary.get("duplicate_rows_removed") or 0),
        }

        _consume_upload_bytes(db, subscription, current_user["email"], request_id, len(content))
        _consume_transaction(db, subscription, current_user["email"], request_id)

        return StreamingResponse(
            io.BytesIO(out_bytes),
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers=headers,
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Standardize error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Standardize failed: {str(e)}")


@app.post("/api/files/reconcile-preview")
async def reconcile_preview(
    request: Request,
    left_file: UploadFile = File(...),
    right_file: UploadFile = File(...),
    left_key_col: str = Form(...),
    right_key_col: str = Form(...),
    left_amount_col: str = Form(...),
    right_amount_col: str = Form(...),
    tolerance: float = Form(0.0),
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Preview reconciliation counts/totals (ZERO STORAGE)."""
    try:
        _enforce_verified_user(db, current_user["email"])
        subscription = _get_or_create_subscription(db, current_user["email"])

        max_size_mb = 500 if subscription.plan == "premium" else 10
        max_bytes = max_size_mb * 1024 * 1024
        left = await left_file.read()
        right = await right_file.read()
        if len(left) > max_bytes or len(right) > max_bytes:
            raise HTTPException(status_code=413, detail=f"Each file must be <= {max_size_mb}MB")

        svc = ReconciliationService()
        opts = ReconcileOptions(tolerance=float(tolerance or 0.0))
        _report, summary = svc.reconcile(
            left_filename=left_file.filename or "left",
            left_content=left,
            right_filename=right_file.filename or "right",
            right_content=right,
            left_key_col=left_key_col,
            right_key_col=right_key_col,
            left_amount_col=left_amount_col,
            right_amount_col=right_amount_col,
            options=opts,
        )
        summary["note"] = "Preview only. Run Reconcile to download an Excel report."
        return summary
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Reconcile preview error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Reconcile preview failed: {str(e)}")


@app.post("/api/files/reconcile")
async def reconcile_download(
    request: Request,
    left_file: UploadFile = File(...),
    right_file: UploadFile = File(...),
    left_key_col: str = Form(...),
    right_key_col: str = Form(...),
    left_amount_col: str = Form(...),
    right_amount_col: str = Form(...),
    tolerance: float = Form(0.0),
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Reconcile two files and return an Excel reconciliation report (ZERO STORAGE)."""
    try:
        request_id = _get_request_id(request)
        _enforce_verified_user(db, current_user["email"])
        subscription = _get_or_create_subscription(db, current_user["email"])

        max_size_mb = 500 if subscription.plan == "premium" else 10
        max_bytes = max_size_mb * 1024 * 1024
        left = await left_file.read()
        right = await right_file.read()
        if len(left) > max_bytes or len(right) > max_bytes:
            raise HTTPException(status_code=413, detail=f"Each file must be <= {max_size_mb}MB")

        total_upload = len(left) + len(right)
        _enforce_upload_quota(subscription, total_upload)
        _enforce_transactions_quota(subscription)

        svc = ReconciliationService()
        opts = ReconcileOptions(tolerance=float(tolerance or 0.0))
        report_bytes, summary = svc.reconcile(
            left_filename=left_file.filename or "left",
            left_content=left,
            right_filename=right_file.filename or "right",
            right_content=right,
            left_key_col=left_key_col,
            right_key_col=right_key_col,
            left_amount_col=left_amount_col,
            right_amount_col=right_amount_col,
            options=opts,
        )

        headers = {
            "Content-Disposition": "attachment; filename=reconciliation_report.xlsx",
            "X-Reconcile-Matched": str(((summary.get("counts") or {}).get("matched")) or 0),
            "X-Reconcile-Mismatched": str(((summary.get("counts") or {}).get("mismatch")) or 0),
            "X-Reconcile-Missing-Left": str(((summary.get("counts") or {}).get("missing_on_left")) or 0),
            "X-Reconcile-Missing-Right": str(((summary.get("counts") or {}).get("missing_on_right")) or 0),
            "X-Reconcile-Left-Total": str(((summary.get("totals") or {}).get("left_total")) or 0),
            "X-Reconcile-Right-Total": str(((summary.get("totals") or {}).get("right_total")) or 0),
            "X-Reconcile-Variance-Total": str(((summary.get("totals") or {}).get("variance_total")) or 0),
        }

        _consume_upload_bytes(db, subscription, current_user["email"], request_id, total_upload)
        _consume_transaction(db, subscription, current_user["email"], request_id)

        return StreamingResponse(
            io.BytesIO(report_bytes),
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers=headers,
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Reconcile error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Reconcile failed: {str(e)}")


@app.post("/api/files/process-zip")
async def process_zip(
    file: UploadFile = File(...),
    options: str = None,  # JSON string of options
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Process ZIP file with filename cleaning
    ZERO STORAGE: File content NOT stored
    """
    try:
        import json

        # Check file size
        subscription = db.query(Subscription).filter(
            Subscription.user_email == current_user["email"]
        ).first()

        _enforce_conversion_quota(db, current_user["email"], "zip_cleaning", subscription)

        max_size_mb = 500 if subscription and subscription.plan == "premium" else 10
        max_size_bytes = max_size_mb * 1024 * 1024

        file_content = await file.read()
        file_size_mb = len(file_content) / (1024 * 1024)

        if len(file_content) > max_size_bytes:
            raise HTTPException(
                status_code=413,
                detail=f"File size ({file_size_mb:.1f}MB) exceeds {max_size_mb}MB limit"
            )

        # Validate file type
        if not file.filename.endswith('.zip'):
            raise HTTPException(status_code=400, detail="Invalid file type. Please upload a ZIP file.")

        # Parse options
        processing_options = json.loads(options) if options else {}

        # Get language replacements
        zip_service = ZipProcessorService()
        languages = processing_options.get('languages', [])
        language_replacements = zip_service.get_language_replacements(languages)

        # Update options with language replacements
        processing_options['language_replacements'] = language_replacements

        # Process ZIP
        processed_data = await zip_service.process_zip(io.BytesIO(file_content), processing_options)

        # Log processing history
        processing_history = FileProcessingHistory(
            user_email=current_user["email"],
            processing_type="zip_cleaning",
            original_filename=file.filename,
            file_size_mb=file_size_mb,
            status="success"
        )
        db.add(processing_history)
        db.commit()

        logger.info(f"ZIP processing: {file.filename} by {current_user['email']}")

        # Generate filename: original_name_timestamp.zip (IMMEDIATE DOWNLOAD, NO STORAGE)
        original_name = _ascii_safe_filename(
            file.filename.replace(".zip", "").replace(".ZIP", "").replace(" ", "_")
        )
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S_%f")[:-3]  # YYYYMMDD_HHMMSS_mmm
        output_filename = f"{original_name}_{timestamp}.zip"
        
        # Return processed ZIP - IMMEDIATE DOWNLOAD, NO STORAGE
        return StreamingResponse(
            io.BytesIO(processed_data),
            media_type="application/zip",
            headers={
                "Content-Disposition": f"attachment; filename={output_filename}"
            }
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"ZIP processing error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Processing failed: {str(e)}")


# ============================================================================
# SUBSCRIPTION ENDPOINTS
# ============================================================================

@app.get("/api/subscriptions/me")
async def get_my_subscription(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get current user's subscription"""
    subscription = _get_or_create_subscription(db, current_user["email"])
    _apply_admin_entitlements(subscription, current_user["email"])
    db.commit()

    return {
        "id": subscription.id,
        "user_email": subscription.user_email,
        "plan": subscription.plan,
        "status": subscription.status,
        "ai_queries_used": subscription.ai_queries_used,
        "ai_queries_limit": subscription.ai_queries_limit,
        "ai_queries_reset_at": subscription.ai_queries_reset_at.isoformat() if subscription.ai_queries_reset_at else None,
        "files_uploaded": subscription.files_uploaded,
        "workflow_runs_used": subscription.workflow_runs_used,
        "workflow_runs_limit": subscription.workflow_runs_limit,
        "workflow_runs_reset_at": subscription.workflow_runs_reset_at.isoformat() if subscription.workflow_runs_reset_at else None,
        "conversions_used": subscription.conversions_used,
        "conversions_limit": subscription.conversions_limit,
        "conversions_reset_at": subscription.conversions_reset_at.isoformat() if subscription.conversions_reset_at else None,
        "payment_status": subscription.payment_status,
        "trial_start_date": subscription.trial_start_date,
        "trial_end_date": subscription.trial_end_date,
        "created_date": subscription.created_date
    }


@app.post("/api/subscriptions/upgrade")
async def upgrade_subscription(
    request: Request,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Upgrade to premium (simplified - integrate Stripe for real payments)"""
    subscription = db.query(Subscription).filter(
        Subscription.user_email == current_user["email"]
    ).first()

    if subscription:
        prev_plan, prev_status = subscription.plan, subscription.status
        subscription.plan = "premium"
        subscription.status = "active"
        subscription.ai_queries_limit = -1  # Unlimited
        subscription.payment_status = "paid"
        subscription.subscription_start_date = datetime.utcnow()
        subscription.cancelled_at = None
        db.commit()

        try:
            client_ip = _get_client_ip(request)
            ua = request.headers.get("user-agent", "")
            db.add(SubscriptionEventLog(
                user_email=current_user["email"],
                event_type="upgrade",
                prev_plan=prev_plan,
                new_plan=subscription.plan,
                prev_status=prev_status,
                new_status=subscription.status,
                ip_address=client_ip or None,
                user_agent=ua or None,
            ))
            db.commit()
        except Exception:
            db.rollback()

    return {"message": "Subscription upgraded to Premium"}


@app.post("/api/subscriptions/start-trial")
async def start_trial(
    request: Request,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Start a one-time trial. If a user has already used a trial (trial_used_at), block."""
    user = db.query(User).filter(User.email == current_user["email"]).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if user.trial_used_at is not None:
        raise HTTPException(status_code=400, detail="Trial already used for this email")

    subscription = db.query(Subscription).filter(Subscription.user_email == current_user["email"]).first()
    if not subscription:
        subscription = Subscription(user_email=current_user["email"], plan="free", status="active")
        db.add(subscription)
        db.commit()
        db.refresh(subscription)

    prev_plan, prev_status = subscription.plan, subscription.status
    now = datetime.utcnow()
    trial_days = int(os.getenv("TRIAL_DAYS", "7"))

    user.trial_used_at = now
    subscription.plan = "premium"
    subscription.status = "active"
    subscription.payment_status = "trial"
    subscription.trial_start_date = now
    subscription.trial_end_date = now + timedelta(days=trial_days)
    subscription.ai_queries_limit = -1
    db.commit()

    try:
        client_ip = _get_client_ip(request)
        ua = request.headers.get("user-agent", "")
        db.add(SubscriptionEventLog(
            user_email=current_user["email"],
            event_type="start_trial",
            prev_plan=prev_plan,
            new_plan=subscription.plan,
            prev_status=prev_status,
            new_status=subscription.status,
            ip_address=client_ip or None,
            user_agent=ua or None,
        ))
        db.commit()
    except Exception:
        db.rollback()

    return {"message": "Trial started", "trial_end_date": subscription.trial_end_date}


@app.post("/api/subscriptions/cancel")
async def cancel_subscription(
    request: Request,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Cancel subscription (stops premium benefits immediately in current simplified billing model)."""
    subscription = db.query(Subscription).filter(Subscription.user_email == current_user["email"]).first()
    if not subscription:
        raise HTTPException(status_code=404, detail="Subscription not found")

    prev_plan, prev_status = subscription.plan, subscription.status
    subscription.plan = "free"
    subscription.status = "cancelled"
    subscription.payment_status = "unpaid"
    subscription.cancelled_at = datetime.utcnow()
    subscription.ai_queries_limit = 5
    db.commit()

    try:
        client_ip = _get_client_ip(request)
        ua = request.headers.get("user-agent", "")
        db.add(SubscriptionEventLog(
            user_email=current_user["email"],
            event_type="cancel",
            prev_plan=prev_plan,
            new_plan=subscription.plan,
            prev_status=prev_status,
            new_status=subscription.status,
            ip_address=client_ip or None,
            user_agent=ua or None,
        ))
        db.commit()
    except Exception:
        db.rollback()

    return {"message": "Subscription canceled"}


# ============================================================================
# ACTIVITY & ANALYTICS ENDPOINTS
# ============================================================================

@app.post("/api/activity/log")
async def log_activity(
    activity: ActivityLog,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Log user activity"""
    try:
        # Convert details to JSON string if it's a dict
        details_str = None
        if activity.details:
            if isinstance(activity.details, dict):
                import json
                details_str = json.dumps(activity.details)
            else:
                details_str = str(activity.details)
        
        user_activity = UserActivity(
            user_email=current_user["email"],
            activity_type=activity.activity_type,
            page_name=activity.page_name,
            details=details_str
        )
        db.add(user_activity)
        db.commit()

        return {"message": "Activity logged"}

    except Exception as e:
        logger.error(f"Activity logging error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to log activity")


@app.get("/api/activity/history")
async def get_activity_history(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
    limit: int = 50
):
    """Get user's activity history"""
    activities = db.query(UserActivity).filter(
        UserActivity.user_email == current_user["email"]
    ).order_by(UserActivity.created_date.desc()).limit(limit).all()

    return [
        {
            "id": a.id,
            "activity_type": a.activity_type,
            "page_name": a.page_name,
            "details": a.details,
            "created_date": a.created_date
        }
        for a in activities
    ]


@app.post("/api/login-history")
async def create_login_history(
    login_data: dict,
    request: Request,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create login history entry. IP and location are always set server-side for security and compliance."""
    try:
        client_ip = _get_client_ip(request)
        loc = _resolve_geolocation(client_ip) if client_ip else login_data.get("location")
        login_history = LoginHistory(
            user_email=login_data.get("user_email", current_user["email"]),
            event_type=login_data.get("event_type", "login"),
            ip_address=client_ip or None,
            location=loc,
            browser=login_data.get("browser"),
            device=login_data.get("device"),
            session_duration=login_data.get("session_duration")
        )
        db.add(login_history)
        db.commit()
        
        return {"message": "Login history created", "id": login_history.id}
    except Exception as e:
        logger.error(f"Login history creation error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create login history: {str(e)}"
        )


class ConsentRequest(BaseModel):
    accepted: bool


@app.post("/api/consent")
async def record_consent(body: ConsentRequest, request: Request, db: Session = Depends(get_db)):
    """Record cookie consent (accept/reject) for compliance. No auth required."""
    try:
        client_ip = _get_client_ip(request)
        ua = request.headers.get("user-agent") or ""
        entry = ConsentLog(ip_address=client_ip or None, accepted=body.accepted, user_agent=ua[:500] if ua else None)
        db.add(entry)
        db.commit()
        return {"ok": True}
    except Exception as e:
        logger.warning(f"Consent log error: {e}")
        return {"ok": False}


@app.get("/api/login-history")
async def get_login_history(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
    limit: int = 50
):
    """Get user's login history"""
    try:
        history = db.query(LoginHistory).filter(
            LoginHistory.user_email == current_user["email"]
        ).order_by(LoginHistory.created_date.desc()).limit(limit).all()
        
        return [
            {
                "id": h.id,
                "user_email": h.user_email,
                "event_type": h.event_type,
                "ip_address": h.ip_address,
                "location": h.location,
                "browser": h.browser,
                "device": h.device,
                "session_duration": h.session_duration,
                "created_date": h.created_date.isoformat() if h.created_date else None
            }
            for h in history
        ]
    except Exception as e:
        logger.error(f"Get login history error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get login history: {str(e)}"
        )


# ============================================================================
# DATABASE CONNECTION ENDPOINTS
# ============================================================================

class DBConnectionRequest(BaseModel):
    db_type: str
    connection_data: Dict[str, Any]

class DBQueryRequest(BaseModel):
    connection_id: str
    db_type: str
    query: str

class DBDisconnectRequest(BaseModel):
    connection_id: str
    db_type: str

@app.post("/api/db/test-connection")
async def test_db_connection(
    request: DBConnectionRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Test database connection
    ZERO STORAGE: Connection credentials are NOT stored, only kept in memory during session
    """
    try:
        result = DatabaseConnectionService.test_connection(
            request.db_type,
            request.connection_data
        )
        return result
    except Exception as e:
        logger.error(f"Test connection error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Connection test failed: {str(e)}"
        )

@app.get("/api/db/schema")
async def get_db_schema(
    connection_id: str,
    db_type: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Get database schema (tables and columns)
    ZERO STORAGE: Schema information is fetched on-demand, not stored
    """
    try:
        result = DatabaseConnectionService.get_schema(connection_id, db_type)
        if not result.get("success"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=result.get("error", "Failed to get schema")
            )
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get schema error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get schema: {str(e)}"
        )

@app.post("/api/db/query")
async def execute_db_query(
    request: DBQueryRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Execute SQL query (SELECT only for security)
    ZERO STORAGE: Query results are returned immediately, not stored
    """
    try:
        result = DatabaseConnectionService.execute_query(
            request.connection_id,
            request.db_type,
            request.query
        )
        if not result.get("success"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=result.get("error", "Query execution failed")
            )
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Query execution error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Query execution failed: {str(e)}"
        )

@app.post("/api/db/disconnect")
async def disconnect_db(
    request: DBDisconnectRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Disconnect from database
    ZERO STORAGE: All connection data is immediately removed from memory
    """
    try:
        result = DatabaseConnectionService.disconnect(request.connection_id, request.db_type)
        return result
    except Exception as e:
        logger.error(f"Disconnect error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Disconnect failed: {str(e)}"
        )

# ============================================================================
# ADMIN ENDPOINTS
# ============================================================================

@app.get("/api/admin/users")
async def get_all_users(
    current_user: dict = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """Get all users (admin only)"""
    users = db.query(User).all()
    return [
        {
            "id": u.id,
            "email": u.email,
            "full_name": u.full_name,
            "role": u.role,
            "is_active": u.is_active,
            "created_date": u.created_date
        }
        for u in users
    ]


@app.get("/api/admin/subscriptions")
async def get_all_subscriptions(
    current_user: dict = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """Get all subscriptions (admin only)"""
    subscriptions = db.query(Subscription).all()
    return [
        {
            "id": s.id,
            "user_email": s.user_email,
            "plan": s.plan,
            "status": s.status,
            "ai_queries_used": s.ai_queries_used,
            "ai_queries_limit": s.ai_queries_limit,
            "created_date": s.created_date
        }
        for s in subscriptions
    ]


@app.get("/api/admin/ip-tracking")
async def get_admin_ip_tracking(
    current_user: dict = Depends(get_current_admin_user),
    db: Session = Depends(get_db),
    limit: int = 200,
    offset: int = 0,
    user_email: Optional[str] = None,
    ip_address: Optional[str] = None,
    event_type: Optional[str] = None,
    from_date: Optional[str] = None,
    to_date: Optional[str] = None
):
    """IP tracking table for security (admin only). Shows ALL users who have logged in.
    
    IMPORTANT: This endpoint returns login history for ALL users, not just one user.
    Every user who signs up and logs in is tracked in the login_history table.
    Use filters (user_email, ip_address, etc.) to narrow down results if needed.
    
    Filters: user_email, ip_address, event_type, from_date, to_date (ISO)."""
    try:
        # Query ALL login history records - all users are tracked
        q = db.query(LoginHistory).order_by(LoginHistory.created_date.desc())
        if user_email:
            q = q.filter(LoginHistory.user_email.ilike(f"%{user_email}%"))
        if ip_address:
            q = q.filter(LoginHistory.ip_address.ilike(f"%{ip_address}%"))
        if event_type:
            q = q.filter(LoginHistory.event_type == event_type)
        if from_date:
            try:
                q = q.filter(LoginHistory.created_date >= datetime.fromisoformat(from_date.replace("Z", "+00:00")))
            except Exception:
                pass
        if to_date:
            try:
                q = q.filter(LoginHistory.created_date <= datetime.fromisoformat(to_date.replace("Z", "+00:00")))
            except Exception:
                pass
        total = q.count()
        rows = q.offset(offset).limit(limit).all()
        return {
            "items": [
                {
                    "id": h.id,
                    "user_email": h.user_email,
                    "event_type": h.event_type,
                    "ip_address": h.ip_address or "—",
                    "location": h.location or "—",
                    "browser": h.browser or "—",
                    "device": h.device or "—",
                    "session_duration": h.session_duration,
                    "created_date": h.created_date.isoformat() if h.created_date else None,
                }
                for h in rows
            ],
            "total": total,
            "limit": limit,
            "offset": offset,
        }
    except Exception as e:
        logger.error(f"Admin IP tracking error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/admin/subscription-ip-summary")
async def get_subscription_ip_summary(
    current_user: dict = Depends(get_current_admin_user),
    db: Session = Depends(get_db),
    period: str = "30d"  # 7d, 30d, all
):
    """Per-subscription: distinct IP count (strategic — detect same login used from many IPs). Admin only."""
    try:
        cutoff = None
        if period == "7d":
            cutoff = datetime.utcnow() - timedelta(days=7)
        elif period == "30d":
            cutoff = datetime.utcnow() - timedelta(days=30)

        stmt = db.query(
            LoginHistory.user_email,
            func.count(func.distinct(LoginHistory.ip_address)).label("distinct_ip_count"),
            func.count(LoginHistory.id).label("total_logins"),
            func.max(LoginHistory.created_date).label("last_login_at"),
        ).filter(LoginHistory.event_type.in_(["login", "logout"]))

        if cutoff is not None:
            stmt = stmt.filter(LoginHistory.created_date >= cutoff)
        stmt = stmt.group_by(LoginHistory.user_email)
        rows = stmt.all()

        sub_map = {s.user_email: s.plan for s in db.query(Subscription).all()}

        return [
            {
                "user_email": r.user_email,
                "plan": sub_map.get(r.user_email) or "—",
                "distinct_ip_count": r.distinct_ip_count or 0,
                "total_logins": r.total_logins or 0,
                "last_login_at": r.last_login_at.isoformat() if r.last_login_at else None,
            }
            for r in rows
        ]
    except Exception as e:
        logger.error(f"Subscription IP summary error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# IP LOOKUP (proxy for ipapi.co / ip-api.com to avoid CORS; 429 fallback + cache)
# ============================================================================

_IP_LOOKUP_CACHE: dict = {}
_IP_LOOKUP_CACHE_LOCK = threading.Lock()
_IP_LOOKUP_TTL = 3600  # 1 hour
_IP_LOOKUP_CACHE_MAX = 5000


def _get_client_ip(request: Request) -> str:
    """Resolve client IP from X-Forwarded-For, X-Real-IP, or request.client. Required for security and compliance."""
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    real = request.headers.get("x-real-ip")
    if real:
        return real.strip()
    if request.client:
        return request.client.host or ""
    return ""


def _parse_user_agent(user_agent: str) -> Dict[str, Optional[str]]:
    """Parse user agent string to extract browser and device info. Returns dict with 'browser' and 'device' keys."""
    if not user_agent:
        return {"browser": None, "device": None}
    
    ua_lower = user_agent.lower()
    
    # Browser detection
    browser = None
    if "chrome" in ua_lower and "edg" not in ua_lower:
        browser = "Chrome"
    elif "firefox" in ua_lower:
        browser = "Firefox"
    elif "safari" in ua_lower and "chrome" not in ua_lower:
        browser = "Safari"
    elif "edg" in ua_lower or "edge" in ua_lower:
        browser = "Edge"
    elif "opera" in ua_lower:
        browser = "Opera"
    elif "msie" in ua_lower or "trident" in ua_lower:
        browser = "Internet Explorer"
    
    # Device detection
    device = None
    if "mobile" in ua_lower or "android" in ua_lower:
        device = "Mobile"
    elif "tablet" in ua_lower or "ipad" in ua_lower:
        device = "Tablet"
    elif "iphone" in ua_lower:
        device = "iPhone"
    elif "windows" in ua_lower:
        device = "Windows"
    elif "mac" in ua_lower or "macintosh" in ua_lower:
        device = "Mac"
    elif "linux" in ua_lower:
        device = "Linux"
    else:
        device = "Desktop"
    
    return {"browser": browser, "device": device}


def _resolve_geolocation(ip: str) -> Optional[str]:
    """Resolve IP to 'City, Country' for security and compliance. Returns None on failure or for private IPs."""
    if not ip or _is_private_ip(ip):
        return None
    try:
        import requests
        url = f"https://ipapi.co/{ip}/json/"
        r = requests.get(url, timeout=2)
        if r.ok:
            j = r.json()
            city = j.get("city") or ""
            country = j.get("country_name") or j.get("country_code") or ""
            if city or country:
                return f"{city}, {country}".strip(", ")
        if r.status_code == 429:
            r2 = requests.get(f"http://ip-api.com/json/{ip}", timeout=2)
            if r2.ok and r2.json().get("status") == "success":
                j = r2.json()
                return f"{j.get('city') or ''}, {j.get('country') or ''}".strip(", ")
    except Exception:
        pass
    return None


def _is_private_ip(ip: str) -> bool:
    if not ip or ip in ("127.0.0.1", "::1"):
        return True
    parts = ip.split(".")
    if len(parts) == 4:
        try:
            a, b, c, d = (int(x) & 0xFF for x in parts)
            if a == 10:
                return True
            if a == 172 and 16 <= b <= 31:
                return True
            if a == 192 and b == 168:
                return True
        except ValueError:
            pass
    return False


def _ip_cache_get(key: str):
    with _IP_LOOKUP_CACHE_LOCK:
        ent = _IP_LOOKUP_CACHE.get(key)
        if ent is None:
            return None
        if time.time() - ent[1] > _IP_LOOKUP_TTL:
            del _IP_LOOKUP_CACHE[key]
            return None
        return ent[0]


def _ip_cache_set(key: str, obj: dict):
    with _IP_LOOKUP_CACHE_LOCK:
        _IP_LOOKUP_CACHE[key] = (obj, time.time())
        if len(_IP_LOOKUP_CACHE) > _IP_LOOKUP_CACHE_MAX:
            now = time.time()
            expired = [k for k, v in _IP_LOOKUP_CACHE.items() if now - v[1] > _IP_LOOKUP_TTL]
            for k in expired[:500]:
                del _IP_LOOKUP_CACHE[k]


@app.get("/api/ip-lookup")
async def ip_lookup(request: Request):
    """Proxy to ipapi.co (or ip-api.com on 429) for IP/location. Uses client IP; 1h cache to reduce 429."""
    import requests
    fallback = {"ip": None, "city": None, "country_name": None, "country_code": "XX"}
    client_ip = _get_client_ip(request)
    cache_key = client_ip or "no_ip"

    cached = _ip_cache_get(cache_key)
    if cached is not None:
        return cached

    # Prefer ipapi.co with client IP so we get user's location; avoid lookup for private IPs
    url = f"https://ipapi.co/{client_ip}/json/" if (client_ip and not _is_private_ip(client_ip)) else "https://ipapi.co/json/"
    try:
        r = requests.get(url, timeout=5)
        if r.status_code == 429:
            # Rate limited: try ip-api.com (only for a valid public client IP)
            if client_ip and not _is_private_ip(client_ip):
                try:
                    r2 = requests.get(f"http://ip-api.com/json/{client_ip}", timeout=5)
                    if r2.ok:
                        j = r2.json()
                        if j.get("status") == "success":
                            out = {"ip": j.get("query"), "city": j.get("city"), "country_name": j.get("country"), "country_code": (j.get("countryCode") or "XX")}
                            _ip_cache_set(cache_key, out)
                            return out
                except Exception:
                    pass
            logger.info("ip-lookup: ipapi.co 429 (rate limit); returning fallback")
            _ip_cache_set(cache_key, fallback)
            return fallback
        r.raise_for_status()
        j = r.json()
        _ip_cache_set(cache_key, j)
        return j
    except Exception as e:
        logger.warning(f"ip-lookup proxy failed: {e}")
        _ip_cache_set(cache_key, fallback)
        return fallback


# ============================================================================
# HEALTH CHECK
# ============================================================================

@app.get("/health")
@app.get("/api/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "InsightSheet-lite Backend",
        "version": "1.0.0",
        "timestamp": datetime.utcnow().isoformat()
    }


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "InsightSheet-lite Backend API",
        "version": "1.0.0",
        "docs": "/docs",
        "health": "/health"
    }


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", "8000"))
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=port,
        reload=True
    )
