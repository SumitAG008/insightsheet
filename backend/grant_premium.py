#!/usr/bin/env python3
"""
Grant Premium Subscription - Development & Testing Script
Easily grant premium access to users for testing purposes.
"""

import sys
from datetime import datetime
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.database import Subscription
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Database configuration
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://insightsheet_user:insightsheet_pass@localhost:5432/insightsheet_db"
)

# Create database engine
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def grant_premium(email: str, duration_days: int = 365):
    """
    Grant premium subscription to a user.

    Args:
        email: User email address
        duration_days: Number of days for premium (default: 365)
    """
    db = SessionLocal()

    try:
        # Find or create subscription
        subscription = db.query(Subscription).filter(
            Subscription.user_email == email
        ).first()

        if not subscription:
            print(f"Creating new subscription for {email}...")
            subscription = Subscription(
                user_email=email,
                plan="free",
                status="active",
                ai_queries_limit=5,
                ai_queries_used=0,
                files_uploaded=0
            )
            db.add(subscription)
            db.commit()
            db.refresh(subscription)

        # Upgrade to premium
        print(f"Upgrading {email} to PREMIUM...")
        subscription.plan = "premium"
        subscription.status = "active"
        subscription.ai_queries_limit = -1  # Unlimited
        subscription.subscription_start_date = datetime.utcnow()

        db.commit()

        print("\n" + "="*60)
        print("✅ PREMIUM SUBSCRIPTION GRANTED!")
        print("="*60)
        print(f"Email:              {subscription.user_email}")
        print(f"Plan:               {subscription.plan.upper()}")
        print(f"Status:             {subscription.status}")
        print(f"AI Queries:         {'Unlimited' if subscription.ai_queries_limit == -1 else subscription.ai_queries_limit}")
        print(f"Files Uploaded:     {subscription.files_uploaded}")
        print(f"Start Date:         {subscription.subscription_start_date}")
        print("="*60 + "\n")

        return True

    except Exception as e:
        print(f"❌ Error: {str(e)}")
        db.rollback()
        return False
    finally:
        db.close()


def list_subscriptions():
    """List all subscriptions in the database."""
    db = SessionLocal()

    try:
        subscriptions = db.query(Subscription).all()

        if not subscriptions:
            print("No subscriptions found.")
            return

        print("\n" + "="*80)
        print("ALL SUBSCRIPTIONS")
        print("="*80)

        for sub in subscriptions:
            plan_emoji = "👑" if sub.plan == "premium" else "🆓"
            queries = "∞" if sub.ai_queries_limit == -1 else f"{sub.ai_queries_used}/{sub.ai_queries_limit}"

            print(f"\n{plan_emoji} {sub.user_email}")
            print(f"   Plan:      {sub.plan.upper()}")
            print(f"   Status:    {sub.status}")
            print(f"   Queries:   {queries}")
            print(f"   Files:     {sub.files_uploaded}")

        print("\n" + "="*80 + "\n")

    except Exception as e:
        print(f"❌ Error: {str(e)}")
    finally:
        db.close()


def revoke_premium(email: str):
    """Revoke premium subscription and downgrade to free."""
    db = SessionLocal()

    try:
        subscription = db.query(Subscription).filter(
            Subscription.user_email == email
        ).first()

        if not subscription:
            print(f"❌ No subscription found for {email}")
            return False

        print(f"Downgrading {email} to FREE...")
        subscription.plan = "free"
        subscription.ai_queries_limit = 5
        subscription.ai_queries_used = 0

        db.commit()

        print(f"✅ {email} downgraded to FREE plan")
        return True

    except Exception as e:
        print(f"❌ Error: {str(e)}")
        db.rollback()
        return False
    finally:
        db.close()


def main():
    """Main CLI interface."""
    if len(sys.argv) < 2:
        print("Grant Premium Subscription - Development Tool")
        print("="*60)
        print("\nUsage:")
        print("  python grant_premium.py <email>              # Grant premium")
        print("  python grant_premium.py list                 # List all subscriptions")
        print("  python grant_premium.py revoke <email>       # Revoke premium")
        print("\nExamples:")
        print("  python grant_premium.py user@example.com")
        print("  python grant_premium.py list")
        print("  python grant_premium.py revoke user@example.com")
        print("\n" + "="*60)
        sys.exit(1)

    command = sys.argv[1].lower()

    if command == "list":
        list_subscriptions()
    elif command == "revoke":
        if len(sys.argv) < 3:
            print("❌ Error: Please provide email address")
            print("Usage: python grant_premium.py revoke <email>")
            sys.exit(1)
        email = sys.argv[2]
        revoke_premium(email)
    else:
        # Assume it's an email address
        email = command
        grant_premium(email)


if __name__ == "__main__":
    main()
