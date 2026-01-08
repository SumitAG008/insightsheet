"""
Check PostgreSQL database schema - List all tables and columns
Run this to verify database structure matches the models
"""
import sys
import os
from dotenv import load_dotenv

load_dotenv()

from sqlalchemy import create_engine, text, inspect
from sqlalchemy.orm import sessionmaker

# Get database URL
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./insightsheet.db")

print("=" * 70)
print("DATABASE SCHEMA CHECKER")
print("=" * 70)
print(f"\nDatabase URL: {DATABASE_URL[:50]}..." if len(DATABASE_URL) > 50 else f"\nDatabase URL: {DATABASE_URL}")

try:
    # Create engine
    if DATABASE_URL.startswith("sqlite"):
        engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
    else:
        engine = create_engine(DATABASE_URL)
    
    # Test connection
    with engine.connect() as connection:
        result = connection.execute(text("SELECT 1"))
        result.fetchone()
    
    print("[OK] Database connection successful!\n")
    
    # Get inspector
    inspector = inspect(engine)
    
    # Get all tables
    tables = inspector.get_table_names()
    print(f"Found {len(tables)} table(s):")
    for table in sorted(tables):
        print(f"   - {table}")
    
    # Check users table in detail
    print("\n" + "=" * 70)
    print("USERS TABLE STRUCTURE")
    print("=" * 70)
    
    if 'users' in tables:
        columns = inspector.get_columns('users')
        print(f"\n[OK] 'users' table exists with {len(columns)} column(s):\n")
        
        # Expected columns from User model
        expected_columns = {
            'id': 'Integer (Primary Key)',
            'email': 'String(255)',
            'full_name': 'String(255)',
            'hashed_password': 'String(255)',
            'role': 'String(50)',
            'is_active': 'Boolean',
            'is_verified': 'Boolean',
            'verification_token': 'String(255)',
            'verification_token_expires': 'DateTime',
            'reset_token': 'String(255)',
            'reset_token_expires': 'DateTime',
            'created_date': 'DateTime',
            'updated_date': 'DateTime'
        }
        
        existing_column_names = []
        for col in columns:
            col_name = col['name']
            col_type = str(col['type'])
            existing_column_names.append(col_name)
            
            # Check if it's expected
            status = "[OK]" if col_name in expected_columns else "[?]"
            print(f"{status} {col_name:30} {col_type}")
        
        # Check for missing columns
        print("\n" + "-" * 70)
        print("MISSING COLUMNS CHECK")
        print("-" * 70)
        
        missing_columns = []
        for expected_col in expected_columns.keys():
            if expected_col not in existing_column_names:
                missing_columns.append(expected_col)
                print(f"[MISSING] {expected_col} ({expected_columns[expected_col]})")
        
        if not missing_columns:
            print("[OK] All expected columns exist!")
        else:
            print(f"\n[WARNING] Found {len(missing_columns)} missing column(s)")
            print("\nTo add missing columns, run:")
            print("   python add_verification_columns.py")
            print("   OR")
            print("   Restart Railway service (triggers init_db())")
        
        # Check user count
        SessionLocal = sessionmaker(bind=engine)
        db = SessionLocal()
        try:
            result = db.execute(text("SELECT COUNT(*) FROM users"))
            user_count = result.fetchone()[0]
            print(f"\nTotal users in database: {user_count}")
        finally:
            db.close()
            
    else:
        print("\n[ERROR] 'users' table does NOT exist!")
        print("   Run: python -m app.database")
    
    # Check other tables
    print("\n" + "=" * 70)
    print("OTHER TABLES")
    print("=" * 70)
    
    other_tables = ['subscriptions', 'login_history', 'user_activities', 'file_processing_history']
    for table_name in other_tables:
        if table_name in tables:
            columns = inspector.get_columns(table_name)
            print(f"\n[OK] '{table_name}' table exists ({len(columns)} columns)")
        else:
            print(f"\n[ERROR] '{table_name}' table does NOT exist")
    
    print("\n" + "=" * 70)
    print("[OK] Schema check complete!")
    print("=" * 70)
    
except Exception as e:
    print(f"\n[ERROR] Error checking database schema!")
    print(f"   Error: {str(e)}")
    print("\nCommon issues:")
    print("   1. Check DATABASE_URL in .env file")
    print("   2. Verify database credentials")
    print("   3. Check if database is accessible")
    print("   4. For Railway: Check if service is running")
    sys.exit(1)
