# ⚡ Quick Start Guide

Get InsightSheet backend running in 5 minutes!

## 🚨 Got "password authentication failed" Error?

**SOLUTION: Run the interactive setup script!**

```bash
cd backend
python setup_database.py
```

The script will:
- Ask for your PostgreSQL credentials
- Test the connection
- Create the database automatically
- Set up your .env file
- Initialize all tables
- Create an admin user

**Don't know your PostgreSQL password?**
- It's the password YOU set when you installed PostgreSQL
- If you forgot it, see [WINDOWS_SETUP.md](WINDOWS_SETUP.md#solution-2-reset-postgresql-password) for reset instructions

---

## 🎯 Setup Steps

### 1️⃣ Install Dependencies

```bash
cd backend
pip install -r requirements.txt
```

### 2️⃣ Setup Database

**Option A: Interactive Setup (Recommended)**
```bash
python setup_database.py
```

**Option B: Manual Setup**
1. Copy `.env.example` to `.env`
2. Edit `.env` and set your PostgreSQL password:
   ```
   DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/insightsheet
   ```
3. Run: `python setup_database.py`

**Option C: Use SQLite (No PostgreSQL needed)**
1. Create `.env` file
2. Set:
   ```
   DATABASE_URL=sqlite:///./insightsheet.db
   ```
3. Run: `python setup_database.py`

### 3️⃣ Start the Server

```bash
python main.py
```

Or:

```bash
uvicorn main:app --reload --port 8000
```

### 4️⃣ Test

Visit: http://localhost:8000/health

You should see:
```json
{
  "status": "healthy",
  "database": "connected"
}
```

### 5️⃣ Login

**Admin Credentials:**
- Email: `sumitagaria@gmail.com`
- Password: `admin123`

**⚠️ IMPORTANT:** Change this password after first login!

---

## 🪟 Windows Users

### Check if PostgreSQL is Running

1. Press `Win + R`
2. Type `services.msc`
3. Look for `postgresql-x64-XX`
4. Status should be "Running"

### Still Having Issues?

See the comprehensive [Windows Setup Guide](WINDOWS_SETUP.md)

---

## 🐳 Docker Alternative

Don't want to install PostgreSQL? Use Docker:

```bash
cd backend
docker-compose up -d
```

Then create `.env`:
```
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/insightsheet
```

Run setup:
```bash
python setup_database.py
```

---

## 📊 Verify Setup

After running `python main.py`, check:

1. **Health Check**
   - http://localhost:8000/health

2. **API Documentation**
   - http://localhost:8000/docs

3. **Database Tables**
   ```bash
   psql -U postgres -d insightsheet
   \dt
   ```

   You should see:
   - users
   - subscriptions
   - login_history
   - user_activities

---

## 🔥 Common Issues

### "ModuleNotFoundError: No module named 'X'"
```bash
pip install -r requirements.txt
```

### "password authentication failed"
```bash
python setup_database.py
# Follow the interactive prompts
```

### "database 'insightsheet' does not exist"
```bash
# The setup script creates it automatically
python setup_database.py
```

### "Port 8000 is already in use"
```bash
# Use a different port
uvicorn main:app --reload --port 8001
```

---

## 📁 Project Structure

```
backend/
├── setup_database.py     # Interactive database setup
├── database.py           # Database models and config
├── main.py              # FastAPI application
├── requirements.txt     # Python dependencies
├── .env.example         # Environment variables template
├── QUICKSTART.md        # This file
├── WINDOWS_SETUP.md     # Windows-specific guide
└── app/
    ├── routes/          # API endpoints
    ├── services/        # Business logic
    └── utils/           # Helper functions
```

---

## 🚀 Next Steps

1. **Start Frontend**
   ```bash
   cd ..
   npm install
   npm run dev
   ```

2. **Access Application**
   - Frontend: http://localhost:5173
   - Backend: http://localhost:8000
   - API Docs: http://localhost:8000/docs

3. **Test Upload**
   - Login with admin credentials
   - Upload an Excel file
   - Try the AI features

---

## 💡 Tips

- Use `python main.py` for simple startup
- Use `uvicorn main:app --reload` for auto-reload during development
- Check `logs/app.log` for detailed error messages
- Use PostgreSQL for production
- Use SQLite for quick testing

---

## 🆘 Still Need Help?

1. Read the [Windows Setup Guide](WINDOWS_SETUP.md)
2. Check the main [README.md](README.md)
3. Review error messages in terminal
4. Check PostgreSQL is running
5. Verify your .env file exists and has correct credentials

---

**Happy coding! 🎉**
