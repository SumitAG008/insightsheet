"""
Quick script to add reset_token columns to Neon PostgreSQL database
Run this once to add the missing columns
"""
import sys
import os
from sqlalchemy import create_engine, text

# Your Neon PostgreSQL connection string
DATABASE_URL = "postgresql://neondb_owner:npg_fDwMP0Rk2vAe@ep-small-dream-abw9afwj-pooler.eu-west-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require"

def add_reset_columns():
    """Add reset_token and reset_token_expires columns to users table"""
    
    print("🔧 Connecting to Neon PostgreSQL database...")
    
    try:
        # Create engine
        engine = create_engine(DATABASE_URL)
        
        with engine.connect() as connection:
            # Start transaction
            trans = connection.begin()
            
            try:
                # Check if columns already exist
                result = connection.execute(text("""
                    SELECT column_name
                    FROM information_schema.columns
                    WHERE table_name='users' 
                    AND column_name IN ('reset_token', 'reset_token_expires');
                """))
                existing_columns = [row[0] for row in result]
                
                print(f"📋 Existing columns: {existing_columns}")
                
                # Add reset_token if it doesn't exist
                if 'reset_token' not in existing_columns:
                    print("➕ Adding reset_token column...")
                    connection.execute(text("""
                        ALTER TABLE users
                        ADD COLUMN reset_token VARCHAR(255);
                    """))
                    print("✅ Added reset_token column")
                else:
                    print("ℹ️  reset_token column already exists")
                
                # Add reset_token_expires if it doesn't exist
                if 'reset_token_expires' not in existing_columns:
                    print("➕ Adding reset_token_expires column...")
                    connection.execute(text("""
                        ALTER TABLE users
                        ADD COLUMN reset_token_expires TIMESTAMP;
                    """))
                    print("✅ Added reset_token_expires column")
                else:
                    print("ℹ️  reset_token_expires column already exists")
                
                # Commit transaction
                trans.commit()
                print("\n🎉 Migration completed successfully!")
                
                # Verify columns were added
                result = connection.execute(text("""
                    SELECT column_name, data_type
                    FROM information_schema.columns
                    WHERE table_name='users' 
                    AND column_name IN ('reset_token', 'reset_token_expires');
                """))
                
                print("\n📊 Verification:")
                for row in result:
                    print(f"   - {row[0]}: {row[1]}")
                
            except Exception as e:
                trans.rollback()
                print(f"❌ Migration failed: {str(e)}")
                raise
                
    except Exception as e:
        print(f"❌ Connection error: {str(e)}")
        print("\n💡 Make sure:")
        print("   1. Database connection string is correct")
        print("   2. Database is accessible")
        print("   3. You have ALTER TABLE permissions")
        raise

if __name__ == "__main__":
    print("🚀 Starting database migration for password reset columns...\n")
    add_reset_columns()
    print("\n✅ Done! Password reset should now work.")
