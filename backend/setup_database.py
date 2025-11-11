"""
Interactive Database Setup Script for InsightSheet (Meldra AI)
Run this to initialize your PostgreSQL database
"""

import sys
from database import init_db, test_connection, SessionLocal, User, Subscription
from passlib.context import CryptContext
from datetime import datetime, timedelta

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def create_admin_user():
    """Create admin user with premium subscription"""
    print("\n🔧 Creating admin user...")

    db = SessionLocal()

    # Check if admin already exists
    existing_admin = db.query(User).filter(User.email == "sumitagaria@gmail.com").first()
    if existing_admin:
        print("⚠️  Admin user already exists!")
        db.close()
        return

    # Create admin user
    admin = User(
        email="sumitagaria@gmail.com",
        full_name="Sumit Agaria",
        hashed_password=pwd_context.hash("admin123"),  # Change this password!
        role="admin",
        is_active=True,
        is_verified=True,
        created_date=datetime.utcnow()
    )
    db.add(admin)
    db.commit()
    db.refresh(admin)

    # Create premium subscription for admin
    subscription = Subscription(
        user_email=admin.email,
        plan="premium",
        status="active",
        ai_queries_limit=999999,  # Unlimited
        subscription_start_date=datetime.utcnow(),
        subscription_end_date=datetime.utcnow() + timedelta(days=3650),  # 10 years
        created_date=datetime.utcnow()
    )
    db.add(subscription)
    db.commit()

    db.close()

    print("✅ Admin user created successfully!")
    print("\n📧 Email: sumitagaria@gmail.com")
    print("🔑 Password: admin123")
    print("⚠️  IMPORTANT: Change this password after first login!\n")


def main():
    """Main setup function"""
    print("=" * 60)
    print("🚀 InsightSheet (Meldra AI) - Database Setup")
    print("=" * 60)

    # Step 1: Test connection
    print("\n📡 Step 1: Testing database connection...")
    if not test_connection():
        print("\n❌ Database connection failed!")
        print("\n🔧 Troubleshooting:")
        print("1. Make sure PostgreSQL is running:")
        print("   - macOS: brew services start postgresql@15")
        print("   - Ubuntu: sudo systemctl start postgresql")
        print("   - Docker: docker start postgres")
        print("\n2. Check your .env file:")
        print("   DATABASE_URL=postgresql://postgres:password@localhost:5432/insightsheet")
        print("\n3. Create database if not exists:")
        print("   createdb insightsheet")
        sys.exit(1)

    print("✅ Database connection successful!")

    # Step 2: Create tables
    print("\n🔧 Step 2: Creating database tables...")
    try:
        init_db()
        print("✅ Tables created successfully!")
    except Exception as e:
        print(f"❌ Error creating tables: {e}")
        sys.exit(1)

    # Step 3: Create admin user
    print("\n👤 Step 3: Setting up admin user...")
    try:
        create_admin_user()
    except Exception as e:
        print(f"❌ Error creating admin user: {e}")
        sys.exit(1)

    # Success message
    print("\n" + "=" * 60)
    print("🎉 Database Setup Complete!")
    print("=" * 60)

    print("\n📊 Database Tables Created:")
    print("  ✅ users - User accounts")
    print("  ✅ subscriptions - User subscriptions")
    print("  ✅ login_history - Login tracking")
    print("  ✅ user_activities - Activity logs")

    print("\n👤 Admin Account:")
    print("  📧 Email: sumitagaria@gmail.com")
    print("  🔑 Password: admin123")
    print("  🚨 CHANGE THIS PASSWORD AFTER FIRST LOGIN!")

    print("\n🚀 Next Steps:")
    print("  1. Start the backend:")
    print("     uvicorn main:app --reload --port 8000")
    print("\n  2. Test the API:")
    print("     curl http://localhost:8000/health")
    print("\n  3. Start the frontend:")
    print("     cd .. && npm run dev")
    print("\n  4. Login at: http://localhost:5173")
    print("=" * 60)


if __name__ == "__main__":
    main()
