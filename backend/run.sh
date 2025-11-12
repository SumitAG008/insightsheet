#!/bin/bash
# Quick start script for InsightSheet-lite Backend

echo "🚀 Starting InsightSheet-lite Backend..."

# Check if .env exists
if [ ! -f .env ]; then
    echo "⚠️  .env file not found. Creating from .env.example..."
    cp .env.example .env
    echo "✅ Created .env file. Please edit it with your configuration."
    echo "   Especially: OPENAI_API_KEY"
    exit 1
fi

# Initialize database
echo "📊 Initializing database..."
python -c "from app.database import init_db; init_db()"

# Start server
echo "🌐 Starting FastAPI server..."
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
