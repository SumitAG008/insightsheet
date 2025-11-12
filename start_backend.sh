#!/bin/bash

echo "========================================"
echo "Starting InsightSheet Backend"
echo "========================================"
echo ""

cd backend

echo "[1/3] Activating virtual environment..."
source venv/bin/activate

echo "[2/3] Checking database..."
python -c "from app.database import init_db; init_db(); print('Database ready!')"

echo "[3/3] Starting server..."
echo ""
echo "Backend will run at: http://localhost:8000"
echo "API Docs available at: http://localhost:8000/docs"
echo ""
echo "Press CTRL+C to stop the server"
echo "========================================"
echo ""

uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
