# Quick Fix: Backend Connection

## 🚨 "Failed to fetch" Error - Solution

The error means your **backend server is not running**.

---

## ✅ Fix in 3 Steps

### Step 1: Open Terminal
Open a new terminal/command prompt.

### Step 2: Start Backend
```bash
cd backend
python -m uvicorn app.main:app --reload
```

### Step 3: Wait for This Message
```
INFO:     Uvicorn running on http://127.0.0.1:8000
INFO:     Application startup complete.
```

---

## ✅ Then Try Again

1. Go back to your browser
2. Refresh the login page
3. Try signing up or logging in again

---

## 🔍 If Still Not Working

### Check 1: Is Backend Running?
Open: `http://localhost:8000/docs`

If you see API documentation → Backend is running ✅
If you see "Cannot connect" → Backend is NOT running ❌

### Check 2: Database Connection
Make sure your `.env` file in `backend/` folder has:
```env
DATABASE_URL=postgresql://neondb_owner:npg_fDwMP0Rk2vAe@ep-small-dream-abw9afwj-pooler.eu-west-2.aws.neon.tech/neondb?sslmode=require
```

### Check 3: Port Conflict
If port 8000 is busy, use different port:
```bash
python -m uvicorn app.main:app --reload --port 8001
```

Then update frontend `.env`:
```env
VITE_API_URL=http://localhost:8001
```

---

## 📝 Your Existing User

You already have a user in the database:
- **Email**: `sumitagaria@gmail.com`
- **Role**: `admin`

**To login** (instead of signup):
1. Click "Sign in" link
2. Enter your email
3. Enter your password

---

## 🎯 Most Likely Issue

**99% of the time**: Backend server is simply not running.

**Solution**: Run `python -m uvicorn app.main:app --reload` in the `backend/` folder.

---

**That's it!** Once backend is running, everything should work. 🚀
