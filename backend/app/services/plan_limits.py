"""
Plan limits: one table for every allowance Meldra enforces, and the rule for which one applies.

A user's limits come from their organisation's licence when they hold a seat on an active one,
and from their own plan otherwise. Every figure can be changed without a code change:

    LIMIT_<PLAN>_<KEY>=<number>      e.g. LIMIT_FREE_FILE_SIZE_MB=15, LIMIT_PRO_AI_QUERIES_PER_MONTH=400
    "unlimited" (or -1) removes that limit for the plan.

A licence can override any key for one organisation (License.limits_json), which is how a custom
Business or University deal is set up. docs/PLAN_LIMITS_AND_CAPACITY.md explains each figure.
"""
from __future__ import annotations

import json
import os
from dataclasses import dataclass, field
from typing import Any, Dict, Optional

UNLIMITED = -1

PLAN_ORDER = ("free", "pro", "team", "business")

PLAN_NAMES = {
    "free": "Free",
    "pro": "Pro",
    "team": "Team",
    "business": "Business",
}

# What each key means (shown on the usage page and in the docs).
LIMIT_KEYS: Dict[str, str] = {
    "file_size_mb": "Largest single file (MB)",
    "spreadsheet_rows": "Rows per spreadsheet (all sheets together)",
    "pdf_pages": "Pages per PDF",
    "ocr_pages": "Scanned pages read by OCR per file",
    "conversions_per_month": "Conversions and file jobs per month",
    "ai_queries_per_month": "AI questions per month",
    "monthly_upload_mb": "Total uploads per month (MB)",
    "concurrent_jobs": "Files processing at the same time",
    "requests_per_minute": "Requests per minute",
}

# Per user. Team and Business are sold per seat; a licence can override any figure.
PLAN_LIMITS: Dict[str, Dict[str, int]] = {
    "free": {
        "file_size_mb": 10,
        "spreadsheet_rows": 50_000,
        "pdf_pages": 50,
        "ocr_pages": 5,
        "conversions_per_month": 20,
        "ai_queries_per_month": 20,
        "monthly_upload_mb": 200,
        "concurrent_jobs": 1,
        "requests_per_minute": 120,
    },
    "pro": {
        "file_size_mb": 50,
        "spreadsheet_rows": 300_000,
        "pdf_pages": 300,
        "ocr_pages": 50,
        "conversions_per_month": 500,
        "ai_queries_per_month": 300,
        "monthly_upload_mb": 5_000,
        "concurrent_jobs": 2,
        "requests_per_minute": 240,
    },
    "team": {
        "file_size_mb": 100,
        "spreadsheet_rows": 1_000_000,
        "pdf_pages": 1_000,
        "ocr_pages": 100,
        "conversions_per_month": 2_000,
        "ai_queries_per_month": 1_000,
        "monthly_upload_mb": 20_000,
        "concurrent_jobs": 3,
        "requests_per_minute": 300,
    },
    # Starting point for a custom contract; set the agreed figures on the licence.
    "business": {
        "file_size_mb": 200,
        "spreadsheet_rows": 2_000_000,
        "pdf_pages": 2_000,
        "ocr_pages": 300,
        "conversions_per_month": 5_000,
        "ai_queries_per_month": 3_000,
        "monthly_upload_mb": 50_000,
        "concurrent_jobs": 4,
        "requests_per_minute": 600,
    },
}

# Hard ceilings no plan or licence can exceed: what one server can safely do with one file.
# Raising these needs more memory per worker (see docs/PLAN_LIMITS_AND_CAPACITY.md).
SERVER_CEILINGS: Dict[str, int] = {
    "file_size_mb": 500,
    "spreadsheet_rows": 5_000_000,
    "pdf_pages": 5_000,
    "ocr_pages": 1_000,
    "concurrent_jobs": 10,
    "requests_per_minute": 2_000,
}

# Older plan names stored on subscriptions.
_PLAN_ALIASES = {
    "premium": "pro",
    "premium_monthly": "pro",
    "premium_quarterly": "pro",
    "premium_yearly": "pro",
    "trial": "free",
    "standard": "free",  # developer API keys
    "enterprise": "business",
    "university": "business",
}


def normalize_plan(plan: Optional[str]) -> str:
    p = (plan or "free").strip().lower()
    p = _PLAN_ALIASES.get(p, p)
    return p if p in PLAN_LIMITS else "free"


def _parse_limit(raw: Any) -> Optional[int]:
    if raw is None:
        return None
    s = str(raw).strip().lower()
    if not s:
        return None
    if s in ("unlimited", "none", "off", "-1"):
        return UNLIMITED
    try:
        n = int(float(s))
    except ValueError:
        return None
    return UNLIMITED if n < 0 else n


def _apply_ceiling(key: str, value: int) -> int:
    ceiling = SERVER_CEILINGS.get(key)
    if ceiling is None:
        return value
    if value == UNLIMITED or value > ceiling:
        return ceiling
    return value


def plan_limits(plan: Optional[str], env: Optional[Dict[str, str]] = None) -> Dict[str, int]:
    """The plan's figures after any LIMIT_<PLAN>_<KEY> environment overrides."""
    env = os.environ if env is None else env
    key = normalize_plan(plan)
    limits = dict(PLAN_LIMITS[key])
    for name in LIMIT_KEYS:
        override = _parse_limit(env.get(f"LIMIT_{key.upper()}_{name.upper()}"))
        if override is not None:
            limits[name] = override
    return {k: _apply_ceiling(k, v) for k, v in limits.items()}


def merge_overrides(limits: Dict[str, int], overrides: Any) -> Dict[str, int]:
    """Apply a licence's custom figures (a dict or its JSON text) on top of plan limits."""
    if isinstance(overrides, str):
        try:
            overrides = json.loads(overrides or "{}")
        except ValueError:
            overrides = {}
    out = dict(limits)
    for name, raw in (overrides or {}).items():
        if name in LIMIT_KEYS:
            value = _parse_limit(raw)
            if value is not None:
                out[name] = _apply_ceiling(name, value)
    return out


@dataclass
class Entitlements:
    """The limits that apply to one user right now, and where they come from."""

    plan: str
    limits: Dict[str, int]
    source: str = "personal"  # personal | organization
    organization: Optional[Dict[str, Any]] = None
    features: Dict[str, bool] = field(default_factory=dict)

    @property
    def plan_name(self) -> str:
        return PLAN_NAMES.get(self.plan, self.plan.title())

    def get(self, key: str) -> int:
        return int(self.limits.get(key, UNLIMITED))

    def to_dict(self) -> Dict[str, Any]:
        return {
            "plan": self.plan,
            "plan_name": self.plan_name,
            "source": self.source,
            "organization": self.organization,
            "limits": dict(self.limits),
            "features": dict(self.features),
        }


def personal_entitlements(plan: Optional[str]) -> Entitlements:
    key = normalize_plan(plan)
    return Entitlements(plan=key, limits=plan_limits(key))


def describe_limits() -> Dict[str, Any]:
    """Public table for the pricing page: every plan's figures and what each key means."""
    return {
        "keys": LIMIT_KEYS,
        "plans": {p: {"name": PLAN_NAMES[p], "limits": plan_limits(p)} for p in PLAN_ORDER},
        "unlimited": UNLIMITED,
    }


__all__ = [
    "UNLIMITED",
    "PLAN_ORDER",
    "PLAN_NAMES",
    "LIMIT_KEYS",
    "PLAN_LIMITS",
    "SERVER_CEILINGS",
    "Entitlements",
    "normalize_plan",
    "plan_limits",
    "merge_overrides",
    "personal_entitlements",
    "describe_limits",
]
