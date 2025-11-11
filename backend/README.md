<<<<<<< HEAD
# InsightSheet-lite Backend 🚀

Privacy-first data analysis platform backend with AI-powered insights and ZERO data storage.

## 🌟 Features

### Core Capabilities
- ✅ **AI/LLM Integration** - GPT-4 powered data analysis, formula generation, and insights
- ✅ **Excel to PowerPoint** - Convert Excel spreadsheets to professional presentations
- ✅ **ZIP File Processor** - Clean and rename files in ZIP archives with Unicode support
- ✅ **User Authentication** - JWT-based secure authentication
- ✅ **Subscription Management** - Free and Premium tiers with usage tracking
- ✅ **Activity Logging** - Track user activity without storing sensitive data
- ✅ **Zero Data Storage** - Files and AI prompts/responses are ephemeral

### Privacy & Security
- 🔒 **ZERO FILE STORAGE** - All files processed in-memory, never saved
- 🔒 **ZERO AI DATA STORAGE** - Prompts and responses not stored locally
- 🔒 **JWT Authentication** - Secure token-based auth
- 🔒 **bcrypt Password Hashing** - Industry-standard password protection
- 🔒 **CORS Protection** - Configured for meldra.ai domain
- 🔒 **ZIP Bomb Protection** - Prevents malicious ZIP files
- 🔒 **File Type Validation** - Magic number verification

## 📋 Prerequisites

- Python 3.11+
- PostgreSQL 15+ (or SQLite for development)
- OpenAI API Key
- Docker & Docker Compose (optional)

## 🚀 Quick Start

### Option 1: Local Development (SQLite)

```bash
# 1. Clone the repository
cd backend

# 2. Create virtual environment
python -m venv venv

# For Windows:
venv\Scripts\activate

# For macOS/Linux:
source venv/bin/activate

# 3. Install dependencies
pip install -r requirements.txt

# 4. Set up environment variables
cp .env.example .env

# Edit .env and add your OpenAI API key:
# OPENAI_API_KEY=sk-your-key-here
# DATABASE_URL=sqlite:///./insightsheet.db

# 5. Initialize database
python -c "from app.database import init_db; init_db()"

# 6. Run the server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

The API will be available at:
- **API**: http://localhost:8000
- **Docs**: http://localhost:8000/docs
- **Health**: http://localhost:8000/health

### Option 2: Docker Compose (PostgreSQL)

```bash
# 1. Set up environment variables
cp .env.example .env

# Edit .env with your settings:
# OPENAI_API_KEY=sk-your-key-here
# JWT_SECRET_KEY=your-secret-key

# 2. Start services
docker-compose up -d

# 3. View logs
docker-compose logs -f backend

# 4. Stop services
docker-compose down
```

### Option 3: Docker Only

```bash
# Build image
docker build -t insightsheet-backend .

# Run container
docker run -d \
  -p 8000:8000 \
  -e DATABASE_URL=sqlite:///./insightsheet.db \
  -e OPENAI_API_KEY=sk-your-key \
  -e JWT_SECRET_KEY=your-secret \
  --name insightsheet-backend \
  insightsheet-backend

# View logs
docker logs -f insightsheet-backend
```
=======
# InsightSheet Backend (Meldra AI)

FastAPI + PostgreSQL Backend for InsightSheet-lite

## 🚀 Quick Start (3 Steps)

### 1. Install PostgreSQL

**macOS:**
```bash
brew install postgresql@15
brew services start postgresql@15
createdb insightsheet
```

**Ubuntu/Debian:**
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
sudo -u postgres createdb insightsheet
```

**Windows:**
- Download from [PostgreSQL.org](https://www.postgresql.org/download/windows/)
- Run installer
- Use pgAdmin to create database `insightsheet`

**Docker (Easiest!):**
```bash
docker run --name postgres \
  -e POSTGRES_PASSWORD=password \
  -e POSTGRES_DB=insightsheet \
  -p 5432:5432 \
  -d postgres:15
```

### 2. Setup Backend

```bash
cd backend

# Create .env file
cp .env.example .env

# Edit .env with your database URL
# DATABASE_URL=postgresql://postgres:password@localhost:5432/insightsheet

# Install dependencies
pip install -r requirements.txt

# Setup database (creates tables + admin user)
python setup_database.py
```

### 3. Start Server

```bash
uvicorn main:app --reload --port 8000
```

Visit: http://localhost:8000/docs for API documentation
>>>>>>> 58194c7fbb5d6cfa982aaf3d15ce3ba47988e1ba

## 📁 Project Structure

```
backend/
<<<<<<< HEAD
├── app/
│   ├── __init__.py
│   ├── main.py                 # FastAPI application
│   ├── database.py             # Database models & config
│   ├── services/
│   │   ├── ai_service.py       # AI/LLM integration
│   │   ├── zip_processor.py    # ZIP file processing
│   │   └── excel_to_ppt.py     # Excel to PowerPoint
│   ├── utils/
│   │   └── auth.py             # Authentication utilities
│   ├── models/                 # (Future: Pydantic models)
│   └── routes/                 # (Future: Route modules)
├── logs/                       # Application logs
├── requirements.txt            # Python dependencies
├── Dockerfile                  # Docker configuration
├── docker-compose.yml          # Docker Compose setup
├── .env.example                # Environment template
└── README.md                   # This file
```

## 🔧 Configuration

### Environment Variables

Create a `.env` file with the following variables:

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/insightsheet
# Or for SQLite: DATABASE_URL=sqlite:///./insightsheet.db

# JWT Authentication
JWT_SECRET_KEY=your-super-secret-key-change-this
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# OpenAI API
OPENAI_API_KEY=sk-your-openai-api-key-here

# Server
HOST=0.0.0.0
PORT=8000
ENVIRONMENT=development

# CORS (comma-separated)
CORS_ORIGINS=http://localhost:3000,http://localhost:5173,https://meldra.ai,https://*.meldra.ai

# File Upload
MAX_UPLOAD_SIZE=524288000  # 500MB
TEMP_UPLOAD_DIR=./temp_uploads

# Stripe (optional)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Email (optional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password

# Logging
LOG_LEVEL=INFO
LOG_FILE=logs/app.log
```

### Subscription Tiers

#### Free Plan
- ✅ 10MB file size limit
- ✅ 5 AI queries per day
- ✅ Basic features
- ✅ Excel to PPT (up to 10MB)
- ✅ ZIP processing (up to 10MB)

#### Premium Plan ($9-10/month)
- ✅ 500MB file size limit
- ✅ **Unlimited** AI queries
- ✅ All features
- ✅ Image generation (DALL-E)
- ✅ Priority support

## 📚 API Endpoints

### Authentication

#### Register User
```http
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "secure_password",
  "full_name": "John Doe"
}
```

#### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "secure_password"
}

Response:
{
  "access_token": "eyJ...",
  "token_type": "bearer",
  "user": {...}
}
```

#### Get Current User
```http
GET /api/auth/me
Authorization: Bearer {token}
```

### AI/LLM Endpoints

#### Invoke LLM
```http
POST /api/integrations/llm/invoke
Authorization: Bearer {token}
Content-Type: application/json

{
  "prompt": "Analyze this sales data and provide insights",
  "add_context_from_internet": false,
  "response_json_schema": null
}
```

#### Generate Image (Premium)
```http
POST /api/integrations/image/generate
Authorization: Bearer {token}
Content-Type: application/json

{
  "prompt": "A professional business chart",
  "size": "1024x1024"
}
```

#### Generate Excel Formula
```http
POST /api/ai/formula
Authorization: Bearer {token}
Content-Type: application/json

{
  "description": "Sum all values in column A",
  "context": "Sales data spreadsheet"
}
```

#### Analyze Data
```http
POST /api/ai/analyze
Authorization: Bearer {token}
Content-Type: application/json

{
  "data_summary": "Sales data with columns: Product, Revenue, Date",
  "question": "What are the top selling products?"
}
```

#### Suggest Chart Type
```http
POST /api/ai/suggest-chart
Authorization: Bearer {token}
Content-Type: application/json

{
  "columns": [
    {"name": "Product", "type": "text"},
    {"name": "Revenue", "type": "numeric"}
  ],
  "data_preview": [...]
}
```

### File Processing

#### Excel to PowerPoint
```http
POST /api/files/excel-to-ppt
Authorization: Bearer {token}
Content-Type: multipart/form-data

file: [Excel file]

Response: PowerPoint file download
```

#### Process ZIP File
```http
POST /api/files/process-zip
Authorization: Bearer {token}
Content-Type: multipart/form-data

file: [ZIP file]
options: {
  "allowed_chars": "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789._-",
  "disallowed_chars": "",
  "replace_char": "_",
  "remove_spaces": false,
  "max_length": 255,
  "languages": ["german", "italian"]
}

Response: Processed ZIP file download
```

### Subscriptions

#### Get My Subscription
```http
GET /api/subscriptions/me
Authorization: Bearer {token}
```

#### Upgrade to Premium
```http
POST /api/subscriptions/upgrade
Authorization: Bearer {token}
```

### Activity

#### Log Activity
```http
POST /api/activity/log
Authorization: Bearer {token}
Content-Type: application/json

{
  "activity_type": "file_upload",
  "page_name": "dashboard",
  "details": "Additional info"
}
```

#### Get Activity History
```http
GET /api/activity/history?limit=50
Authorization: Bearer {token}
```

### Admin (Requires admin role)

#### Get All Users
```http
GET /api/admin/users
Authorization: Bearer {admin_token}
```

#### Get All Subscriptions
```http
GET /api/admin/subscriptions
Authorization: Bearer {admin_token}
```

### Health Check

```http
GET /health

Response:
{
  "status": "healthy",
  "service": "InsightSheet-lite Backend",
  "version": "1.0.0",
  "timestamp": "2025-01-15T10:30:00"
}
```

## 🗄️ Database Models

### User
- id (Primary Key)
- email (Unique)
- full_name
- hashed_password
- role (user/admin)
- is_active
- created_date
- updated_date

### Subscription
- id (Primary Key)
- user_email
- plan (free/premium)
- status (active/cancelled/expired)
- ai_queries_used
- ai_queries_limit
- files_uploaded
- payment_status
- transaction_id
- amount_paid
- stripe_customer_id
- stripe_subscription_id
- created_date
- updated_date

### LoginHistory
- id (Primary Key)
- user_email
- event_type (login/logout/failed_login)
- ip_address
- location
- browser
- device
- session_duration
- created_date

### UserActivity
- id (Primary Key)
- user_email
- activity_type
- page_name
- details (JSON)
- created_date

### FileProcessingHistory
- id (Primary Key)
- user_email
- processing_type (excel_to_ppt/zip_clean)
- original_filename (NO CONTENT STORED)
- file_size_mb
- status (success/failed)
- error_message
- created_date

## 🔒 Privacy & Security Features

### Zero Data Storage
1. **Files**: Processed in-memory, never saved to disk
2. **AI Prompts/Responses**: Sent to OpenAI but not stored locally
3. **Temporary Files**: Automatically cleaned up after processing
4. **Activity Logs**: NO sensitive content stored

### Security Measures
1. **JWT Authentication**: Secure token-based auth
2. **bcrypt Password Hashing**: Industry-standard protection
3. **CORS Protection**: Domain whitelisting
4. **File Type Validation**: Magic number verification
5. **ZIP Bomb Protection**: Size limits and decompression checks
6. **SQL Injection Prevention**: SQLAlchemy ORM
7. **Input Validation**: Pydantic models
8. **Rate Limiting**: (Future enhancement)

## 🧪 Testing

```bash
# Run tests (when implemented)
pytest

# Run with coverage
pytest --cov=app --cov-report=html

# Run specific test file
pytest tests/test_auth.py
```

## 📊 Monitoring & Logs

### View Logs

```bash
# Docker
docker-compose logs -f backend

# Local
tail -f logs/app.log
```

### Log Rotation
- Logs automatically rotate at 10MB
- Keeps last 5 log files
- Location: `logs/app.log`

## 🚀 Deployment

### Deploy to Heroku

```bash
# Install Heroku CLI
# https://devcenter.heroku.com/articles/heroku-cli

# Login
heroku login

# Create app
heroku create insightsheet-backend

# Set environment variables
heroku config:set OPENAI_API_KEY=sk-...
heroku config:set JWT_SECRET_KEY=your-secret
heroku config:set DATABASE_URL=postgresql://...

# Add PostgreSQL addon
heroku addons:create heroku-postgresql:hobby-dev

# Deploy
git push heroku main

# View logs
heroku logs --tail
```

### Deploy to Railway

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Initialize project
railway init

# Add PostgreSQL
railway add postgres

# Set environment variables
railway variables set OPENAI_API_KEY=sk-...
railway variables set JWT_SECRET_KEY=your-secret

# Deploy
railway up
```

### Deploy to DigitalOcean App Platform

1. Connect GitHub repository
2. Configure environment variables
3. Add PostgreSQL database
4. Deploy from `main` branch

## 🛠️ Development

### Code Style

```bash
# Format code
black app/

# Lint code
flake8 app/

# Type checking
mypy app/
```

### Database Migrations (Future)

```bash
# Create migration
alembic revision --autogenerate -m "Add new table"

# Apply migrations
alembic upgrade head

# Rollback
alembic downgrade -1
```

## 🤝 Integration with Frontend

### Frontend Setup

Update frontend API client to point to your backend:

```javascript
// src/api/backendClient.js
const API_URL = process.env.VITE_API_URL || 'http://localhost:8000';

export const api = {
  auth: {
    login: (email, password) =>
      fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      }),

    me: (token) =>
      fetch(`${API_URL}/api/auth/me`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
  },

  llm: {
    invoke: (token, prompt) =>
      fetch(`${API_URL}/api/integrations/llm/invoke`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ prompt })
      })
  }
};
```

## 📞 Support

- **Admin Email**: sumitagaria@gmail.com
- **Domain**: meldra.ai
- **Documentation**: `/docs` endpoint
- **Health Check**: `/health` endpoint

## 📄 License

Proprietary - InsightSheet-lite

## 🎯 Roadmap

- [ ] Implement Stripe payment integration
- [ ] Add rate limiting middleware
- [ ] Implement Redis caching
- [ ] Add WebSocket support for real-time updates
- [ ] Implement email notifications
- [ ] Add PDF to PPT conversion
- [ ] Multi-language support for UI
- [ ] Advanced analytics dashboard
- [ ] API usage metrics
- [ ] Automated testing suite

---

**Made with ❤️ for Privacy-First Data Analysis**
=======
├── main.py              # FastAPI application
├── database.py          # SQLAlchemy models
├── setup_database.py    # Database initialization
├── requirements.txt     # Python dependencies
├── .env                 # Environment variables
└── README.md           # This file
```

## 🗄️ Database Schema

### Tables

1. **users** - User accounts
   - id, email, full_name, hashed_password
   - role (user/admin), is_active, is_verified
   - created_date, updated_date, last_login

2. **subscriptions** - User subscriptions
   - id, user_email, plan (free/premium)
   - status, trial dates, subscription dates
   - ai_queries_used, ai_queries_limit
   - stripe_customer_id, stripe_subscription_id

3. **login_history** - Login tracking
   - id, user_email, event_type
   - ip_address, location, browser, device, os
   - session_duration, created_date

4. **user_activities** - Activity logs (metadata only!)
   - id, user_email, activity_type
   - page_name, details (JSON)
   - created_date

## 🔑 Default Admin Account

After running `setup_database.py`:

- **Email:** sumitagaria@gmail.com
- **Password:** admin123
- **Plan:** Premium (unlimited)

⚠️ **IMPORTANT:** Change this password after first login!

## 🌐 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user
- `PUT /api/auth/me` - Update current user

### Subscriptions
- `GET /api/subscriptions/me` - Get my subscription
- `POST /api/subscriptions/upgrade` - Upgrade to premium

### Activity
- `POST /api/activity/log` - Log activity
- `GET /api/activity/history` - Get activity history

### Admin
- `GET /api/admin/users` - Get all users (admin only)
- `GET /api/admin/subscriptions` - Get all subscriptions (admin only)

### AI/LLM (Placeholder)
- `POST /api/integrations/llm/invoke` - Invoke LLM
- `POST /api/integrations/image/generate` - Generate image

## 🔧 Environment Variables

Create `.env` file with:

```bash
# Database
DATABASE_URL=postgresql://postgres:password@localhost:5432/insightsheet

# JWT Secret
JWT_SECRET_KEY=your-secret-key-change-in-production

# OpenAI
OPENAI_API_KEY=sk-your-openai-key

# SendGrid (Email)
SENDGRID_API_KEY=your-sendgrid-key

# Stripe (Payments)
STRIPE_SECRET_KEY=sk_test_your-key
STRIPE_PUBLISHABLE_KEY=pk_test_your-key
```

## 🐳 Docker Setup (Alternative)

```bash
# Start PostgreSQL
docker-compose up -d

# Setup database
python setup_database.py

# Start backend
uvicorn main:app --reload --port 8000
```

## 🧪 Testing

```bash
# Test database connection
python -c "from database import test_connection; test_connection()"

# Test API health
curl http://localhost:8000/health

# Test login
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"sumitagaria@gmail.com","password":"admin123"}'
```

## 📊 PostgreSQL Commands

```bash
# Connect to database
psql postgresql://postgres:password@localhost:5432/insightsheet

# List tables
\dt

# View users
SELECT email, role, is_active FROM users;

# View subscriptions
SELECT user_email, plan, status FROM subscriptions;

# Exit
\q
```

## 🌍 Cloud PostgreSQL (Free Options)

### 1. Heroku PostgreSQL (Free)
```bash
heroku addons:create heroku-postgresql:hobby-dev
heroku config:get DATABASE_URL
```

### 2. Railway (Free)
1. Go to [railway.app](https://railway.app)
2. New Project → Add PostgreSQL
3. Copy connection URL

### 3. Supabase (Free)
1. Go to [supabase.com](https://supabase.com)
2. New Project
3. Settings → Database → Connection String

### 4. ElephantSQL (Free 20MB)
1. Go to [elephantsql.com](https://elephantsql.com)
2. Create instance
3. Copy connection URL

## 🚨 Troubleshooting

### "psql: command not found"
```bash
# Add to PATH (macOS)
export PATH="/usr/local/opt/postgresql@15/bin:$PATH"
```

### "connection refused"
```bash
# Check if PostgreSQL is running
pg_isready

# Start PostgreSQL
brew services start postgresql@15  # macOS
sudo systemctl start postgresql    # Linux
docker start postgres              # Docker
```

### "database does not exist"
```bash
createdb insightsheet
```

### "password authentication failed"
```bash
# Reset password
psql postgres -c "ALTER USER postgres PASSWORD 'newpassword';"
```

## 📝 Production Deployment

1. **Set secure JWT_SECRET_KEY**
2. **Use strong database password**
3. **Enable SSL for database**
4. **Set up proper CORS origins**
5. **Use environment variables**
6. **Enable database backups**
7. **Monitor database performance**

## 📚 Resources

- [FastAPI Docs](https://fastapi.tiangolo.com/)
- [PostgreSQL Docs](https://www.postgresql.org/docs/)
- [SQLAlchemy Docs](https://docs.sqlalchemy.org/)
- [Pydantic Docs](https://docs.pydantic.dev/)

## 📞 Support

For issues:
1. Check backend logs
2. Verify DATABASE_URL in .env
3. Test database connection
4. Check API docs at /docs

---

**Meldra AI** - Built with ❤️ using FastAPI + PostgreSQL
>>>>>>> 58194c7fbb5d6cfa982aaf3d15ce3ba47988e1ba
