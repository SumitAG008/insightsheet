"""
Create or update the database tables for the backend.

Reads DATABASE_URL from the environment (or backend/.env). Safe to run more than once:
existing tables are left in place and missing ones are created.
"""
from app.database import init_db

if __name__ == "__main__":
    init_db()
    print("Database tables are ready.")
