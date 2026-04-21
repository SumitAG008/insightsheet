# Dockerfile for InsightSheet-lite Backend
FROM python:3.11-slim-bookworm

# Set working directory
WORKDIR /app

# Install system dependencies (including Tesseract for OCR to DOC/PDF)
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    libpq-dev \
    libmagic1 \
    tesseract-ocr \
    tesseract-ocr-hin \
    libreoffice \
    fonts-dejavu \
    && rm -rf /var/lib/apt/lists/*

# Ensure cache is busted
ARG CACHE_BUSTER=1

# Copy requirements (handles both repo root and backend root contexts)
COPY requirements.txt* backend/requirements.txt* ./
RUN cp requirements.txt* requirements.txt || true
RUN cp backend/requirements.txt requirements.txt || true

RUN pip install --no-cache-dir -r requirements.txt
RUN python -m playwright install --with-deps chromium

# Copy application code (handles both repo root and backend root contexts)
COPY . /app/
RUN cp -r /app/backend/* /app/ 2>/dev/null || true

# Create logs directory
RUN mkdir -p logs

# Expose port
EXPOSE 8000

# Set environment variables
ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1

# Run database initialization and start server
CMD ["sh", "-c", "python -c 'from app.database import init_db; init_db()' && uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
