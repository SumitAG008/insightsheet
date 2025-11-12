"""
Interactive Database Setup Script for InsightSheet (Meldra AI)
Run this to initialize your PostgreSQL database with improved Windows support
"""

import sys
import os
from pathlib import Path
from datetime import datetime, timedelta
import getpass

# Try importing required modules
try:
    from sqlalchemy import create_engine, text
    from sqlalchemy.orm import sessionmaker
    from passlib.context import CryptContext
except ImportError as e:
    print(f"❌ Missing required package: {e}")
    print("\n📦 Please install requirements:")
    print("   pip install -r requirements.txt")
    sys.exit(1)

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def check_env_file():
    """Check if .env file exists"""
    env_path = Path(".env")
    return env_path.exists()


def create_env_file(db_url):
    """Create .env file with database URL"""
    env_content = f"""# Database Configuration
DATABASE_URL={db_url}

# JWT Authentication
JWT_SECRET_KEY=your-secret-key-change-this-in-production
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# OpenAI API
OPENAI_API_KEY=your-openai-api-key-here

# Server Configuration
HOST=0.0.0.0
PORT=8000
ENVIRONMENT=development

# Application Settings
APP_NAME=InsightSheet-lite
APP_DOMAIN=meldra.ai

# CORS Origins (comma-separated)
CORS_ORIGINS=http://localhost:3000,http://localhost:5173

# File Upload Settings
MAX_UPLOAD_SIZE=524288000
TEMP_UPLOAD_DIR=./temp_uploads
"""

    with open(".env", "w") as f:
        f.write(env_content)

    print("✅ Created .env file")


def test_db_connection(db_url):
    """Test database connection with given URL"""
    try:
        engine = create_engine(db_url, pool_pre_ping=True)
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        return True, None
    except Exception as e:
        return False, str(e)


def get_database_url_interactive():
    """Interactive prompts to build database URL"""
    print("\n" + "=" * 60)
    print("🔧 PostgreSQL Connection Setup")
    print("=" * 60)

    print("\n💡 Default PostgreSQL credentials:")
    print("   Username: postgres")
    print("   Password: (the one you set during PostgreSQL installation)")
    print("   Host: localhost")
    print("   Port: 5432")
    print("   Database: insightsheet")

    print("\n" + "-" * 60)

    # Get credentials
    username = input("Enter PostgreSQL username [postgres]: ").strip() or "postgres"
    password = getpass.getpass("Enter PostgreSQL password: ").strip()

    if not password:
        print("⚠️  Warning: Using empty password")
        password = ""

    host = input("Enter PostgreSQL host [localhost]: ").strip() or "localhost"
    port = input("Enter PostgreSQL port [5432]: ").strip() or "5432"
    database = input("Enter database name [insightsheet]: ").strip() or "insightsheet"

    # Build connection URL
    db_url = f"postgresql://{username}:{password}@{host}:{port}/{database}"

    return db_url


def create_database_if_not_exists(username, password, host, port, database):
    """Try to create database if it doesn't exist"""
    try:
        # Connect to default postgres database
        default_url = f"postgresql://{username}:{password}@{host}:{port}/postgres"
        engine = create_engine(default_url, isolation_level="AUTOCOMMIT")

        with engine.connect() as conn:
            # Check if database exists
            result = conn.execute(text(f"SELECT 1 FROM pg_database WHERE datname='{database}'"))
            exists = result.fetchone() is not None

            if not exists:
                print(f"\n🔧 Creating database '{database}'...")
                conn.execute(text(f'CREATE DATABASE "{database}"'))
                print(f"✅ Database '{database}' created successfully!")
                return True
            else:
                print(f"ℹ️  Database '{database}' already exists")
                return True

    except Exception as e:
        print(f"❌ Could not create database: {e}")
        return False


def init_database_tables(db_url):
    """Initialize database tables"""
    try:
        # Import here to avoid circular imports
        from database import init_db
        init_db()
        return True
    except Exception as e:
        print(f"❌ Error creating tables: {e}")
        return False


def create_admin_user(db_url):
    """Create admin user with premium subscription"""
    try:
        from database import SessionLocal, User, Subscription

        print("\n🔧 Creating admin user...")

        db = SessionLocal()

        # Check if admin already exists
        existing_admin = db.query(User).filter(User.email == "sumitagaria@gmail.com").first()
        if existing_admin:
            print("⚠️  Admin user already exists!")
            db.close()
            return True

        # Create admin user
        admin = User(
            email="sumitagaria@gmail.com",
            full_name="Sumit Agaria",
            hashed_password=pwd_context.hash("admin123"),
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
            ai_queries_limit=999999,
            subscription_start_date=datetime.utcnow(),
            subscription_end_date=datetime.utcnow() + timedelta(days=3650),
            created_date=datetime.utcnow()
        )
        db.add(subscription)
        db.commit()

        db.close()

        print("✅ Admin user created successfully!")
        print("\n📧 Email: sumitagaria@gmail.com")
        print("🔑 Password: admin123")
        print("⚠️  IMPORTANT: Change this password after first login!")

        return True

    except Exception as e:
        print(f"❌ Error creating admin user: {e}")
        return False


def print_windows_postgres_help():
    """Print Windows-specific PostgreSQL help"""
    print("\n" + "=" * 60)
    print("🪟 Windows PostgreSQL Setup Guide")
    print("=" * 60)

    print("\n📝 Step 1: Check if PostgreSQL is installed")
    print("   Open Command Prompt and run:")
    print("   > psql --version")

    print("\n📝 Step 2: If not installed, download PostgreSQL:")
    print("   Visit: https://www.postgresql.org/download/windows/")
    print("   Download and install PostgreSQL (remember the password you set!)")

    print("\n📝 Step 3: Check if PostgreSQL service is running:")
    print("   Open Services (Win + R, type 'services.msc'):")
    print("   Look for 'postgresql-x64-XX' service")
    print("   Make sure it's running (Status: Running)")

    print("\n📝 Step 4: Reset PostgreSQL password (if forgotten):")
    print("   a) Find pg_hba.conf file:")
    print("      Usually at: C:\\Program Files\\PostgreSQL\\XX\\data\\pg_hba.conf")
    print("   b) Open as Administrator in Notepad")
    print("   c) Change 'md5' to 'trust' for IPv4 and IPv6 local connections:")
    print("      # IPv4 local connections:")
    print("      host    all             all             127.0.0.1/32            trust")
    print("      # IPv6 local connections:")
    print("      host    all             all             ::1/128                 trust")
    print("   d) Restart PostgreSQL service in Services")
    print("   e) Open Command Prompt and run:")
    print("      > psql -U postgres")
    print("      postgres=# ALTER USER postgres PASSWORD 'your_new_password';")
    print("   f) Change 'trust' back to 'md5' in pg_hba.conf")
    print("   g) Restart PostgreSQL service again")

    print("\n📝 Step 5: Test connection:")
    print("   > psql -U postgres -h localhost -p 5432")
    print("   Enter your password when prompted")

    print("\n" + "=" * 60)


def main():
    """Main setup function"""
    print("=" * 60)
    print("🚀 InsightSheet (Meldra AI) - Database Setup")
    print("=" * 60)

    # Check if .env exists
    if not check_env_file():
        print("\n⚠️  No .env file found")
        print("Let's create one with your database credentials")

        # Interactive setup
        db_url = get_database_url_interactive()

        # Parse URL to create database if needed
        print("\n📡 Testing database connection...")
        success, error = test_db_connection(db_url)

        if not success:
            print(f"❌ Connection failed: {error}")

            # Try to create database
            print("\n🔧 Attempting to create database...")
            try:
                # Parse the URL
                from urllib.parse import urlparse
                parsed = urlparse(db_url)
                username = parsed.username
                password = parsed.password
                host = parsed.hostname or 'localhost'
                port = parsed.port or 5432
                database = parsed.path.lstrip('/')

                if create_database_if_not_exists(username, password, host, port, database):
                    # Test again
                    success, error = test_db_connection(db_url)
                    if success:
                        print("✅ Database connection successful!")
                    else:
                        print(f"❌ Still cannot connect: {error}")
                        print_windows_postgres_help()
                        sys.exit(1)
                else:
                    print_windows_postgres_help()
                    sys.exit(1)

            except Exception as e:
                print(f"❌ Error: {e}")
                print_windows_postgres_help()
                sys.exit(1)
        else:
            print("✅ Database connection successful!")

        # Save to .env
        create_env_file(db_url)

        # Reload environment
        os.environ["DATABASE_URL"] = db_url

    else:
        print("\n✅ Found .env file")

        # Try to load and test
        from dotenv import load_dotenv
        load_dotenv()

        db_url = os.getenv("DATABASE_URL")
        if not db_url:
            print("❌ DATABASE_URL not found in .env file")
            sys.exit(1)

        print(f"📡 Testing connection to: {db_url.split('@')[1] if '@' in db_url else 'database'}")
        success, error = test_db_connection(db_url)

        if not success:
            print(f"❌ Database connection failed: {error}")
            print("\n🔧 What would you like to do?")
            print("1. Re-configure database connection")
            print("2. View Windows PostgreSQL help")
            print("3. Exit")

            choice = input("\nEnter choice [1-3]: ").strip()

            if choice == "1":
                db_url = get_database_url_interactive()
                success, error = test_db_connection(db_url)

                if success:
                    print("✅ Database connection successful!")
                    create_env_file(db_url)
                    os.environ["DATABASE_URL"] = db_url
                else:
                    print(f"❌ Connection failed: {error}")
                    print_windows_postgres_help()
                    sys.exit(1)
            elif choice == "2":
                print_windows_postgres_help()
                sys.exit(0)
            else:
                sys.exit(1)
        else:
            print("✅ Database connection successful!")

    # Step 2: Create tables
    print("\n🔧 Step 2: Creating database tables...")
    if not init_database_tables(db_url):
        sys.exit(1)
    print("✅ Tables created successfully!")

    # Step 3: Create admin user
    print("\n👤 Step 3: Setting up admin user...")
    if not create_admin_user(db_url):
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
    print("     python main.py")
    print("     or")
    print("     uvicorn main:app --reload --port 8000")
    print("\n  2. Test the API:")
    print("     curl http://localhost:8000/health")
    print("\n  3. Start the frontend:")
    print("     cd .. && npm run dev")
    print("\n  4. Login at: http://localhost:5173")
    print("=" * 60)


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\n⚠️  Setup cancelled by user")
        sys.exit(0)
    except Exception as e:
        print(f"\n❌ Unexpected error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
