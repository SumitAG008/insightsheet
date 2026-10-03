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

# Copy everything first to bypass Docker lstat strictness
COPY . /app/

# Find and install requirements depending on context
RUN if [ -f "/app/backend/requirements.txt" ]; then \
        pip install --no-cache-dir -r /app/backend/requirements.txt; \
    else \
        pip install --no-cache-dir -r /app/requirements.txt; \
    fi

RUN python -m playwright install --with-deps chromium

# Move backend files to root if we were given the monorepo context
RUN if [ -d "/app/backend" ]; then \
        cp -r /app/backend/* /app/; \
    fi

# Create logs directory
RUN mkdir -p logs

# Expose port
EXPOSE 8000

# Set environment variables
ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1
# One thread per Tesseract run: parallel requests on a small server would otherwise fight for CPU.
ENV OMP_THREAD_LIMIT=1

# Run database initialization and start server
# Up to 2 worker processes so one slow request never holds up everyone else. The count follows the
# container's memory (about 700MB per worker, see app/runtime.py); WEB_CONCURRENCY overrides it.
# On a deploy or scale-down, files already processing get up to GRACEFUL_SHUTDOWN_SECONDS to finish.
CMD ["sh", "-c", "python -c 'from app.database import init_db; init_db()' && uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000} --workers $(python -m app.runtime) --timeout-graceful-shutdown ${GRACEFUL_SHUTDOWN_SECONDS:-90}"]
