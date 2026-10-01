"""
Account erasure ("Delete my account", the right to erasure).

Everything Meldra holds about a person is deleted, except billing records the law requires a
business to keep (invoices and payments, typically 6 to 10 years for tax). Those are kept without
the IP address and browser details that were logged with them.
"""
import os
import shutil
from typing import Dict

from sqlalchemy.orm import Session

from app.database import (
    AIConfiguration,
    ApiBilling,
    ApiKey,
    ApiKeyIssuanceLog,
    ApiUsage,
    FeatureKey,
    FileProcessingHistory,
    InvoiceExtractionJob,
    LearningSignal,
    LoginHistory,
    LoginOtpChallenge,
    PlaywrightJob,
    Subscription,
    SubscriptionEventLog,
    UsageMeterDedup,
    User,
    UserActivity,
    UserFeature,
    UserSession,
)

# Tables whose rows belong to one account and are simply deleted.
_DELETE_BY_EMAIL = (
    LoginOtpChallenge,
    LearningSignal,
    LoginHistory,
    UserSession,
    UserActivity,
    FileProcessingHistory,
    UserFeature,
    ApiKey,
    ApiKeyIssuanceLog,
    ApiUsage,
    UsageMeterDedup,
    AIConfiguration,
)


def has_billing_records(sub: Subscription) -> bool:
    """A subscription that was ever paid for is a financial record."""
    return bool(
        (sub.amount_paid or 0) > 0
        or sub.transaction_id
        or sub.stripe_customer_id
        or sub.stripe_subscription_id
        or (sub.payment_status or "").lower() == "paid"
    )


def _remove_job_files(*paths) -> None:
    for path in paths:
        if not path:
            continue
        folder = os.path.dirname(path)
        # Job files live in their own temporary folder; remove the folder, or the file if it isn't one.
        if folder and os.path.basename(folder).startswith(("meldra_inv_", "meldra_pw_")):
            shutil.rmtree(folder, ignore_errors=True)
        elif os.path.exists(path):
            try:
                os.remove(path)
            except OSError:
                pass


def erase_account(db: Session, email: str) -> Dict[str, int]:
    """Delete the account and its data. Returns how many records of each kind were removed."""
    email = (email or "").strip().lower()
    removed: Dict[str, int] = {}

    for job in db.query(InvoiceExtractionJob).filter(InvoiceExtractionJob.user_email == email).all():
        _remove_job_files(job.header_csv_path, job.line_items_csv_path)
    for job in db.query(PlaywrightJob).filter(PlaywrightJob.user_email == email).all():
        _remove_job_files(job.csv_path)
    removed["jobs"] = (
        db.query(InvoiceExtractionJob).filter(InvoiceExtractionJob.user_email == email).delete(synchronize_session=False)
        + db.query(PlaywrightJob).filter(PlaywrightJob.user_email == email).delete(synchronize_session=False)
    )

    for model in _DELETE_BY_EMAIL:
        removed[model.__tablename__] = db.query(model).filter(model.user_email == email).delete(synchronize_session=False)

    # Feature keys: unused keys meant for this person go; redeemed keys forget who redeemed them.
    removed["feature_keys"] = db.query(FeatureKey).filter(
        FeatureKey.user_email == email, FeatureKey.redeemed_at.is_(None)
    ).delete(synchronize_session=False)
    db.query(FeatureKey).filter(FeatureKey.redeemed_by == email).update(
        {FeatureKey.redeemed_by: None, FeatureKey.user_email: None}, synchronize_session=False
    )

    # Billing: keep paid records (legal duty), without IP address or browser; delete the rest.
    kept = 0
    for sub in db.query(Subscription).filter(Subscription.user_email == email).all():
        if has_billing_records(sub):
            sub.status = "deleted"
            kept += 1
        else:
            db.delete(sub)
    if kept:
        db.query(SubscriptionEventLog).filter(SubscriptionEventLog.user_email == email).update(
            {SubscriptionEventLog.ip_address: None, SubscriptionEventLog.user_agent: None}, synchronize_session=False
        )
    else:
        db.query(SubscriptionEventLog).filter(SubscriptionEventLog.user_email == email).delete(synchronize_session=False)
    if not db.query(ApiBilling).filter(ApiBilling.user_email == email, ApiBilling.total_cost_usd > 0).count():
        db.query(ApiBilling).filter(ApiBilling.user_email == email).delete(synchronize_session=False)
    removed["billing_records_kept"] = kept

    removed["users"] = db.query(User).filter(User.email == email).delete(synchronize_session=False)
    db.commit()
    return removed
