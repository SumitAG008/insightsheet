"""
Growth numbers for meldra staff. The one to watch first: activation, the share of new signups who
get a finished file back (a converted, analysed or exported file) soon after signing up.
"""
from __future__ import annotations

from collections import Counter
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import Subscription, User, get_db
from app.utils.auth import get_current_admin_user

router = APIRouter(tags=["metrics"])


def activation_report(db: Session, days: int = 30, now: datetime | None = None) -> dict:
    now = now or datetime.utcnow()
    since = now - timedelta(days=days)
    rows = (
        db.query(User.email, User.created_date, Subscription.first_result_at, Subscription.first_result_tool)
        .outerjoin(Subscription, Subscription.user_email == User.email)
        .filter(User.created_date >= since, User.created_date <= now)
        .all()
    )
    signups = len(rows)
    day_one = week_one = 0
    first_tools: Counter = Counter()
    for _, created, first_at, tool in rows:
        if not created or not first_at or first_at < created:
            continue
        gap = first_at - created
        if gap <= timedelta(hours=24):
            day_one += 1
        if gap <= timedelta(days=7):
            week_one += 1
        if tool:
            first_tools[tool] += 1

    def pct(n: int) -> float:
        return round(100.0 * n / signups, 1) if signups else 0.0

    return {
        "days": days,
        "signups": signups,
        "result_within_24h": day_one,
        "result_within_24h_pct": pct(day_one),
        "result_within_7d": week_one,
        "result_within_7d_pct": pct(week_one),
        # Which tool gave people their first result: where onboarding works best.
        "first_result_tools": [{"tool": t, "count": c} for t, c in first_tools.most_common(10)],
    }


@router.get("/api/admin/metrics/activation")
def admin_activation(days: int = 30, current_user: dict = Depends(get_current_admin_user), db: Session = Depends(get_db)):
    """Of the people who signed up in the last `days` days, how many got a finished file within 24 hours / 7 days."""
    return activation_report(db, max(1, min(days, 365)))
