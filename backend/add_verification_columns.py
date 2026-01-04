"""
Migration script to add email verification columns to users table
Run this once to update the database schema
"""
import sys
import os

# Add parent directory to path so we can import app modules
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from dotenv import load_dotenv
load_dotenv()

# Now import after loading env
from app.database import engine, DATABASE_URL
from sqlalchemy import text
from sqlalchemy.exc import ProgrammingError, OperationalError

def add_verification_columns():
    """Add verification columns to users table"""

    with engine.begin() as connection:  # Use begin() for transaction management
        try:
            # Check if columns already exist (PostgreSQL way)
            if DATABASE_URL.startswith("postgresql"):
                result = connection.execute(text("""
                    SELECT column_name
                    FROM information_schema.columns
                    WHERE table_name='users' 
                    AND column_name IN ('is_verified', 'verification_token', 'verification_token_expires');
                """))
                existing_columns = [row[0] for row in result]
            else:
                # SQLite way
                result = connection.execute(text("PRAGMA table_info(users);"))
                existing_columns = [row[1] for row in result if row[1] in ('is_verified', 'verification_token', 'verification_token_expires')]
            
            print(f"Existing verification columns: {existing_columns}")
            
            # Add is_verified if it doesn't exist
            if 'is_verified' not in existing_columns:
                print("Adding is_verified column...")
                if DATABASE_URL.startswith("postgresql"):
                    connection.execute(text("ALTER TABLE users ADD COLUMN is_verified BOOLEAN DEFAULT FALSE;"))
                else:
                    connection.execute(text("ALTER TABLE users ADD COLUMN is_verified BOOLEAN DEFAULT 0;"))
                print("Added is_verified column")
            else:
                print("is_verified column already exists")
            
            # Add verification_token if it doesn't exist
            if 'verification_token' not in existing_columns:
                print("Adding verification_token column...")
                connection.execute(text("ALTER TABLE users ADD COLUMN verification_token VARCHAR(255);"))
                print("Added verification_token column")
            else:
                print("verification_token column already exists")
            
            # Add verification_token_expires if it doesn't exist
            if 'verification_token_expires' not in existing_columns:
                print("Adding verification_token_expires column...")
                connection.execute(text("ALTER TABLE users ADD COLUMN verification_token_expires TIMESTAMP;"))
                print("Added verification_token_expires column")
            else:
                print("verification_token_expires column already exists")
            
            print("\nMigration completed successfully!")
            
        except (ProgrammingError, OperationalError) as e:
            print(f"Error during migration: {str(e)}")
            raise

if __name__ == "__main__":
    print("Starting database migration for email verification columns...")
    add_verification_columns()
