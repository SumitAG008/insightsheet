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

## 📁 Project Structure

```
backend/
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
