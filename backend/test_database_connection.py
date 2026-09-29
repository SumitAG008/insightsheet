"""
Test database connection and verify login setup
"""
import os
import sys
from sqlalchemy import create_engine, text, inspect
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Get database URL
DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    print("❌ DATABASE_URL not found in .env file")
    print("\n📝 Please add this to your .env file:")
    print("DATABASE_URL=postgresql://USER:PASSWORD@YOUR-NEON-HOST/neondb?sslmode=require")
    sys.exit(1)

print(f"🔗 Connecting to database...")
print(f"📊 Database URL: {DATABASE_URL.split('@')[1] if '@' in DATABASE_URL else 'Hidden'}")

try:
    # Create engine
    engine = create_engine(
        DATABASE_URL,
        pool_pre_ping=True,
        echo=False
    )
    
    # Test connection
    print("\n✅ Testing connection...")
    with engine.connect() as conn:
        result = conn.execute(text("SELECT version()"))
        version = result.fetchone()[0]
        print(f"✅ Connected! PostgreSQL version: {version.split(',')[0]}")
    
    # Check if tables exist
    print("\n📋 Checking tables...")
    inspector = inspect(engine)
    tables = inspector.get_table_names()
    
    print(f"📊 Found {len(tables)} tables:")
    for table in sorted(tables):
        print(f"   - {table}")
    
    # Check if users table exists
    if 'users' in tables:
        print("\n✅ 'users' table exists!")
        
        # Check users table structure
        print("\n📋 Checking 'users' table structure...")
        columns = inspector.get_columns('users')
        print("   Columns:")
        for col in columns:
            print(f"   - {col['name']} ({col['type']})")
        
        # Check if there are any users
        SessionLocal = sessionmaker(bind=engine)
        db = SessionLocal()
        try:
            result = db.execute(text("SELECT COUNT(*) FROM users"))
            user_count = result.fetchone()[0]
            print(f"\n👥 Found {user_count} user(s) in database")
            
            if user_count > 0:
                result = db.execute(text("SELECT email, full_name, role, is_active FROM users LIMIT 5"))
                users = result.fetchall()
                print("\n   Users:")
                for user in users:
                    print(f"   - {user[0]} ({user[1]}) - Role: {user[2]}, Active: {user[3]}")
        finally:
            db.close()
    else:
        print("\n❌ 'users' table does NOT exist!")
        print("   You need to create the tables. Run:")
        print("   python -m app.database")
    
    # Check subscriptions table
    if 'subscriptions' in tables:
        print("\n✅ 'subscriptions' table exists!")
    else:
        print("\n❌ 'subscriptions' table does NOT exist!")
    
    print("\n✅ Database connection test complete!")
    
except Exception as e:
    print(f"\n❌ Database connection failed!")
    print(f"   Error: {str(e)}")
    print("\n💡 Common issues:")
    print("   1. Check DATABASE_URL in .env file")
    print("   2. Verify database credentials")
    print("   3. Check if database is accessible")
    print("   4. For Neon: Ensure SSL mode is correct")
    sys.exit(1)
