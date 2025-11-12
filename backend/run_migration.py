"""
Database Migration Script
Adds missing payment_status column to subscriptions table
"""
import sys
import os
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent))

from sqlalchemy import create_engine, text
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def run_migration():
    """Run the database migration"""
    # Get database URL from environment
    DATABASE_URL = os.getenv(
        "DATABASE_URL",
        "postgresql://postgres:postgres@localhost:5432/insightsheet"
    )

    print(f"Connecting to database...")
    print(f"URL: {DATABASE_URL.replace(DATABASE_URL.split('@')[0].split('//')[1], '***')}")

    try:
        # Create engine
        engine = create_engine(DATABASE_URL)

        # Read migration SQL
        migration_file = Path(__file__).parent / "migrations" / "001_add_payment_status.sql"

        if not migration_file.exists():
            print(f"❌ Migration file not found: {migration_file}")
            return False

        sql_content = migration_file.read_text()

        # Execute migration
        with engine.connect() as conn:
            print("\n🔄 Running migration...")

            # Execute the SQL
            result = conn.execute(text(sql_content))
            conn.commit()

            print("✅ Migration completed successfully!")

            # Verify the column was added
            verify_sql = text("""
                SELECT column_name, data_type, column_default
                FROM information_schema.columns
                WHERE table_name = 'subscriptions'
                  AND column_name = 'payment_status'
            """)

            result = conn.execute(verify_sql)
            row = result.fetchone()

            if row:
                print(f"\n✅ Verified: payment_status column exists")
                print(f"   Type: {row[1]}")
                print(f"   Default: {row[2]}")
                return True
            else:
                print("\n⚠️ Warning: Could not verify column was added")
                return False

    except Exception as e:
        print(f"\n❌ Migration failed: {e}")
        import traceback
        traceback.print_exc()
        return False


if __name__ == "__main__":
    print("=" * 60)
    print("InsightSheet Database Migration")
    print("Adding payment_status column to subscriptions table")
    print("=" * 60)

    success = run_migration()

    if success:
        print("\n✅ Database migration completed successfully!")
        print("\nYou can now restart your backend server:")
        print("  cd backend")
        print("  python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8001")
        sys.exit(0)
    else:
        print("\n❌ Migration failed. Please check the error messages above.")
        sys.exit(1)
