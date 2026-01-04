"""
Fix database setup - Create tables if they don't exist
"""
import os
import sys
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv

# Import database models
from app.database import Base, User, Subscription, LoginHistory, UserActivity, FileProcessingHistory

# Load environment variables
load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    print("❌ DATABASE_URL not found in .env file")
    print("\n📝 Please add this to your .env file:")
    print("DATABASE_URL=postgresql://neondb_owner:npg_fDwMP0Rk2vAe@ep-small-dream-abw9afwj-pooler.eu-west-2.aws.neon.tech/neondb?sslmode=require")
    sys.exit(1)

print("🔧 Setting up database...")
print(f"📊 Database: {DATABASE_URL.split('@')[1] if '@' in DATABASE_URL else 'Hidden'}")

try:
    # Create engine
    engine = create_engine(
        DATABASE_URL,
        pool_pre_ping=True,
        echo=False
    )
    
    # Test connection first
    print("\n✅ Testing connection...")
    with engine.connect() as conn:
        conn.execute(text("SELECT 1"))
    print("✅ Connection successful!")
    
    # Create all tables
    print("\n🔧 Creating tables...")
    Base.metadata.create_all(bind=engine)
    print("✅ Tables created/verified!")
    
    # Verify tables
    print("\n📋 Verifying tables...")
    with engine.connect() as conn:
        result = conn.execute(text("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
            ORDER BY table_name
        """))
        tables = [row[0] for row in result]
        
        print(f"✅ Found {len(tables)} tables:")
        for table in tables:
            print(f"   - {table}")
    
    # Check if default admin user exists
    print("\n👤 Checking for default admin user...")
    SessionLocal = sessionmaker(bind=engine)
    db = SessionLocal()
    
    try:
        from app.utils.auth import get_password_hash
        
        # Check if admin user exists
        admin_email = "sumit@meldra.ai"
        user = db.execute(text("SELECT id FROM users WHERE email = :email"), {"email": admin_email}).fetchone()
        
        if not user:
            print(f"   Creating admin user: {admin_email}")
            # Create admin user
            hashed_password = get_password_hash("admin123")  # Change this password!
            db.execute(text("""
                INSERT INTO users (email, full_name, hashed_password, role, is_active, is_verified)
                VALUES (:email, :full_name, :hashed_password, :role, :is_active, :is_verified)
            """), {
                "email": admin_email,
                "full_name": "Admin User",
                "hashed_password": hashed_password,
                "role": "admin",
                "is_active": True,
                "is_verified": True
            })
            
            # Create subscription
            db.execute(text("""
                INSERT INTO subscriptions (user_email, plan, status, ai_queries_limit, ai_queries_used)
                VALUES (:user_email, :plan, :status, :ai_queries_limit, :ai_queries_used)
            """), {
                "user_email": admin_email,
                "plan": "premium",
                "status": "active",
                "ai_queries_limit": 999999,
                "ai_queries_used": 0
            })
            
            db.commit()
            print(f"   ✅ Admin user created!")
            print(f"   📧 Email: {admin_email}")
            print(f"   🔑 Password: admin123 (CHANGE THIS!)")
        else:
            print(f"   ✅ Admin user already exists")
        
    except Exception as e:
        db.rollback()
        print(f"   ⚠️ Could not create admin user: {e}")
    finally:
        db.close()
    
    print("\n✅ Database setup complete!")
    print("\n📝 Next steps:")
    print("   1. Test login with the admin credentials")
    print("   2. Change the admin password after first login")
    print("   3. Create additional users through the registration page")
    
except Exception as e:
    print(f"\n❌ Database setup failed!")
    print(f"   Error: {str(e)}")
    print("\n💡 Troubleshooting:")
    print("   1. Verify DATABASE_URL is correct")
    print("   2. Check database credentials")
    print("   3. Ensure database is accessible")
    sys.exit(1)
