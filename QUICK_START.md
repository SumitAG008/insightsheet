# 🚀 Quick Start Guide - InsightSheet Backend Setup

## Problem: Login Not Working?

If you're getting errors like:
- ❌ "Failed to fetch" from http://localhost:8000
- ❌ CORS policy errors
- ❌ "base44.auth.redirectToLogin is not a function"

**This means:** Your backend is **NOT running** and database is not set up yet!

---

## ✅ Solution: 3-Step Setup

### Step 1: Set Up Database (SQLite - Easiest!)

**Windows:**
```bash
cd backend

# Create virtual environment
python -m venv venv
venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Create .env file
copy .env.example .env
```

**macOS/Linux:**
```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Create .env file
cp .env.example .env
```

**Edit `.env` file and set:**
```env
DATABASE_URL=sqlite:///./insightsheet.db
OPENAI_API_KEY=your-openai-key-here
JWT_SECRET_KEY=change-this-to-random-secret-123456
```

**Initialize database and create admin user:**
```bash
# This creates all tables + admin user
python -c "from app.database import init_db; init_db(); print('Database created!')"

# Optional: Create admin user with subscription
python setup_database.py
```

---

### Step 2: Start Backend Server

**Windows:**
```bash
cd backend
venv\Scripts\activate
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

**macOS/Linux:**
```bash
cd backend
source venv/bin/activate
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

**You should see:**
```
INFO:     Uvicorn running on http://0.0.0.0:8000 (Press CTRL+C to quit)
INFO:     Started reloader process
INFO:     Started server process
INFO:     Waiting for application startup.
INFO:     Database initialized
INFO:     Application startup complete.
```

**Test it works:**
- Open: http://localhost:8000/docs
- You should see the Swagger API documentation!

---

### Step 3: Start Frontend

**Open a NEW terminal** (keep backend running):

```bash
# From project root
npm run dev
```

Visit: http://localhost:5173

---

## 👥 How Users Sign Up

### Method 1: Using the API (Swagger Docs)

1. Go to http://localhost:8000/docs
2. Click on `POST /api/auth/register`
3. Click "Try it out"
4. Enter JSON:
```json
{
  "email": "newuser@example.com",
  "password": "securepassword123",
  "full_name": "John Doe"
}
```
5. Click "Execute"

**Response:**
```json
{
  "message": "User registered successfully",
  "email": "newuser@example.com"
}
```

### Method 2: Using Frontend (if Register page exists)

Visit: http://localhost:5173/register

Fill in:
- Email
- Password
- Full Name

### Method 3: Using cURL

```bash
curl -X POST http://localhost:8000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "newuser@example.com",
    "password": "securepassword123",
    "full_name": "John Doe"
  }'
```

---

## 🔐 Login After Signup

### Using API:
http://localhost:8000/docs → `POST /api/auth/login`

```json
{
  "email": "newuser@example.com",
  "password": "securepassword123"
}
```

**Response:**
```json
{
  "access_token": "eyJ0eXAiOiJKV1...",
  "token_type": "bearer",
  "user": {
    "email": "newuser@example.com",
    "full_name": "John Doe",
    "role": "user"
  },
  "subscription": {
    "plan": "free",
    "ai_queries_used": 0,
    "ai_queries_limit": 5
  }
}
```

---

## 📊 Default Admin Account

If you ran `python setup_database.py`, you have:

**Email:** sumitagaria@gmail.com
**Password:** admin123
**Plan:** Premium (unlimited)

⚠️ **Change this password immediately after first login!**

---

## 🆕 When New Users Sign Up

**What happens automatically:**

1. ✅ User account created in `users` table
2. ✅ Free subscription created (5 AI queries/day, 10MB file limit)
3. ✅ User can login immediately
4. ✅ User gets JWT token
5. ✅ User can use all free features

**Free Plan Limits:**
- 5 AI queries per day
- 10MB file upload limit
- All basic features

**Premium Plan ($9-10/month):**
- Unlimited AI queries
- 500MB file upload limit
- Image generation (DALL-E)
- Priority support

---

## 🐞 Troubleshooting

### "Failed to fetch" or CORS errors

**Problem:** Backend is not running

**Solution:**
```bash
cd backend
venv\Scripts\activate  # Windows
# OR
source venv/bin/activate  # Mac/Linux

uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### "base44.auth.redirectToLogin is not a function"

**Problem:** Frontend is using old `base44` client

**Solution:** Update `src/pages/Layout.jsx` to use `backendClient` instead:

```javascript
// Change from:
import base44 from '@/api/base44Client';

// To:
import backendApi from '@/api/backendClient';

// And update all references from base44 to backendApi
```

### "Email already registered"

**Problem:** User with that email already exists

**Solution:** Use a different email OR login with existing credentials

### Database errors

**Problem:** Database not initialized

**Solution:**
```bash
cd backend
python -c "from app.database import init_db; init_db()"
```

---

## 📝 Quick Commands Cheat Sheet

```bash
# Start backend
cd backend && venv\Scripts\activate && uvicorn app.main:app --reload --port 8000

# Start frontend
npm run dev

# Create database tables
cd backend && python -c "from app.database import init_db; init_db()"

# Setup admin user
cd backend && python setup_database.py

# Test API health
curl http://localhost:8000/health

# View API docs
# Open: http://localhost:8000/docs
```

---

## ✅ Checklist

Before using the app:

- [ ] Backend dependencies installed (`pip install -r requirements.txt`)
- [ ] `.env` file created with `DATABASE_URL` and `OPENAI_API_KEY`
- [ ] Database initialized (`python -c "from app.database import init_db; init_db()"`)
- [ ] Backend running (`uvicorn app.main:app --reload --port 8000`)
- [ ] Frontend running (`npm run dev`)
- [ ] Can access http://localhost:8000/docs
- [ ] Can access http://localhost:5173

---

**Need Help?**
- Check backend logs in terminal
- Visit http://localhost:8000/docs for API testing
- Check `backend/logs/app.log` for detailed errors
