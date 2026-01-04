"""
Migration script to add password reset columns to users table
Run this once to update the database schema
"""
import sys
import os

# Add parent directory to path so we can import app modules
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from dotenv import load_dotenv
load_dotenv()

# Now import after loading env
from app.database import engine
from sqlalchemy import text

def add_reset_columns():
    """Add reset_token and reset_token_expires columns to users table"""

    with engine.connect() as connection:
        # Start transaction
        trans = connection.begin()

        try:
            # Check if columns already exist
            result = connection.execute(text("""
                SELECT column_name
                FROM information_schema.columns
                WHERE table_name='users' AND column_name IN ('reset_token', 'reset_token_expires');
            """))
            existing_columns = [row[0] for row in result]

            # Add reset_token if it doesn't exist
            if 'reset_token' not in existing_columns:
                print("Adding reset_token column...")
                connection.execute(text("""
                    ALTER TABLE users
                    ADD COLUMN reset_token VARCHAR(255);
                """))
                print("✅ Added reset_token column")
            else:
                print("ℹ️  reset_token column already exists")

            # Add reset_token_expires if it doesn't exist
            if 'reset_token_expires' not in existing_columns:
                print("Adding reset_token_expires column...")
                connection.execute(text("""
                    ALTER TABLE users
                    ADD COLUMN reset_token_expires TIMESTAMP;
                """))
                print("✅ Added reset_token_expires column")
            else:
                print("ℹ️  reset_token_expires column already exists")

            # Commit transaction
            trans.commit()
            print("\n✅ Migration completed successfully!")

        except Exception as e:
            # Rollback on error
            trans.rollback()
            print(f"❌ Migration failed: {str(e)}")
            raise

if __name__ == "__main__":
    print("🔧 Running database migration for password reset feature...\n")
    add_reset_columns()
