@echo off
echo ========================================
echo InsightSheet - First Time Setup
echo ========================================
echo.

cd backend

echo [1/5] Creating virtual environment...
python -m venv venv

echo [2/5] Activating virtual environment...
call venv\Scripts\activate

echo [3/5] Installing Python dependencies...
pip install -r requirements.txt

echo [4/5] Creating .env file...
if not exist .env (
    copy .env.example .env
    echo Created .env file from template
    echo.
    echo IMPORTANT: Edit backend\.env and set:
    echo   - DATABASE_URL ^(default SQLite is fine^)
    echo   - OPENAI_API_KEY ^(required for AI features^)
    echo   - JWT_SECRET_KEY ^(random secret string^)
    echo.
    pause
) else (
    echo .env file already exists, skipping...
)

echo [5/5] Creating database tables and admin user...
python setup_database.py

echo.
echo ========================================
echo Setup Complete!
echo ========================================
echo.
echo Next Steps:
echo 1. Edit backend\.env file with your API keys
echo 2. Run: start_backend.bat
echo 3. Open: http://localhost:8000/docs
echo.
echo Admin Login:
echo   Email: sumitagaria@gmail.com
echo   Password: admin123
echo   ^(CHANGE THIS PASSWORD AFTER FIRST LOGIN^)
echo.
pause
