# Backend Connection Fix - "Failed to fetch" Error

## 🔍 Problem

The "Failed to fetch" error occurs when the frontend cannot connect to the backend API server.

---

## ✅ Quick Fix

### Step 1: Start Backend Server

Open a new terminal and run:

```bash
cd backend
python -m uvicorn app.main:app --reload
```

You should see:
```
INFO:     Uvicorn running on http://127.0.0.1:8000
INFO:     Application startup complete.
```

### Step 2: Verify Backend is Running

Open in browser: `http://localhost:8000/docs`

You should see the FastAPI documentation page.

### Step 3: Check API Health

Open: `http://localhost:8000/health`

Should return: `{"status": "healthy"}`

---

## 🔧 Common Issues & Solutions

### Issue 1: Backend Not Running
**Error**: "Failed to fetch" or "Network error"

**Solution**:
```bash
cd backend
python -m uvicorn app.main:app --reload
```

### Issue 2: Wrong Port
**Error**: Connection refused

**Check**:
- Frontend expects: `http://localhost:8000`
- Backend running on: `http://localhost:8000`

**Fix**: Update `.env` file:
```env
VITE_API_URL=http://localhost:8000
```

### Issue 3: Database Connection Failed
**Error**: Backend starts but crashes

**Solution**:
1. Check `.env` file has correct `DATABASE_URL`
2. Ensure database is running
3. Test connection: `python test_database_connection.py`

### Issue 4: CORS Error
**Error**: "CORS policy" in browser console

**Solution**: Backend already configured with CORS. If still issues:
- Check backend logs
- Verify CORS middleware is loaded
- Check browser console for specific error

### Issue 5: User Already Exists
**Error**: "Email already registered"

**Solution**: 
- Use existing credentials to login
- Or use different email for signup
- Or delete user from database

---

## 🧪 Testing Steps

### 1. Test Backend Connection
```bash
curl http://localhost:8000/health
```

Expected: `{"status": "healthy"}`

### 2. Test Registration Endpoint
```bash
curl -X POST http://localhost:8000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test123!@#","full_name":"Test User"}'
```

### 3. Test Login Endpoint
```bash
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"sumitagaria@gmail.com","password":"your_password"}'
```

---

## 📋 Checklist

- [ ] Backend server is running (`uvicorn`)
- [ ] Backend accessible at `http://localhost:8000`
- [ ] Database connection works
- [ ] `.env` file configured correctly
- [ ] CORS configured (already done)
- [ ] Frontend using correct API URL
- [ ] No firewall blocking port 8000

---

## 🚀 Quick Start Commands

### Terminal 1: Backend
```bash
cd backend
python -m uvicorn app.main:app --reload
```

### Terminal 2: Frontend
```bash
npm run dev
```

### Terminal 3: Check Backend
```bash
curl http://localhost:8000/health
```

---

## 🔍 Debugging

### Check Backend Logs
Look for errors in terminal where backend is running.

### Check Browser Console
Open DevTools (F12) → Console tab → Look for errors.

### Check Network Tab
Open DevTools (F12) → Network tab → Look for failed requests.

### Test API Directly
Use Postman or curl to test endpoints directly.

---

## 💡 Your Current Setup

Based on your database, you have:
- **Email**: `sumitagaria@gmail.com`
- **Role**: `admin`
- **Status**: Active

**To login**, use:
- Email: `sumitagaria@gmail.com`
- Password: (the password you set when creating the account)

**If you forgot the password**, use "Forgot Password" feature.

---

## ✅ After Fixing

Once backend is running:
1. Refresh the login page
2. Try signing up again (or login with existing account)
3. Should work without "Failed to fetch" error

---

**The most common issue is the backend server not running!** 🚀
