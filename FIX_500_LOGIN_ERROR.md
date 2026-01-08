# 🚨 FIX 500 Error on Login
## Complete Solution for Production Issues

---

## ❌ **Current Problems**

1. **500 Error on Login** - `POST /api/auth/login` returns 500
2. **Reset links show localhost** - Missing `FRONTEND_URL` in Railway
3. **Can't login on production** - Database schema issues

---

## 🔍 **Root Causes**

The login endpoint tries to:
1. Create `LoginHistory` records (lines 263-269, 291-297)
2. Check `user.is_verified` (line 277)

**If these database tables/columns don't exist → 500 error**

---

## ✅ **COMPLETE FIX (3 Steps)**

---

## **STEP 1: Add FRONTEND_URL to Railway** (2 minutes)

### **Why:**
Fixes reset links showing localhost instead of production URL.

### **How:**
1. Railway Dashboard → Your Service → **Variables** tab
2. Click **"+ New Variable"**
3. **Key:** `FRONTEND_URL`
4. **Value:** `https://insight.meldra.ai`
5. Click **"Add"**
6. Click **"Apply changes"** or **"Deploy"** (left panel)
7. Wait 1-2 minutes for restart

---

## **STEP 2: Fix Database Schema** (5 minutes)

### **Why:**
The `login_history` table and `is_verified` column might be missing, causing 500 errors.

### **How:**

1. **Railway Dashboard → PostgreSQL Database → Query Tab**

2. **Run this SQL to create/fix tables:**

```sql
-- 1. Create login_history table if it doesn't exist
CREATE TABLE IF NOT EXISTS login_history (
    id SERIAL PRIMARY KEY,
    user_email VARCHAR(255) NOT NULL,
    event_type VARCHAR(50),
    ip_address VARCHAR(100),
    location VARCHAR(255),
    browser VARCHAR(255),
    device VARCHAR(255),
    session_duration INTEGER,
    created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Create index on user_email for faster queries
CREATE INDEX IF NOT EXISTS idx_login_history_user_email ON login_history(user_email);
CREATE INDEX IF NOT EXISTS idx_login_history_created_date ON login_history(created_date);

-- 3. Add missing columns to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS verification_token VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS verification_token_expires TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token_expires TIMESTAMP;

-- 4. Set existing users as verified (so they can login)
UPDATE users SET is_verified = TRUE WHERE is_verified IS NULL;
```

3. **Click "Run"**
4. **Wait for success message**

---

## **STEP 3: Check Railway Logs** (2 minutes)

### **Why:**
To see the exact error causing the 500.

### **How:**

1. **Railway Dashboard → Your Service → Deployments**
2. Click on the **latest deployment**
3. Click **"View Logs"** or **"Logs"** tab
4. **Look for error messages** around the time you tried to login
5. **Common errors:**
   - `relation "login_history" does not exist` → Table missing (fix with Step 2)
   - `column "is_verified" does not exist` → Column missing (fix with Step 2)
   - `column "users.is_verified" does not exist` → Column missing (fix with Step 2)

---

## ✅ **VERIFICATION**

### **Test 1: Check Backend Health**
Visit: `https://insightsheet-production.up.railway.app/api/health`

**Should return:** `{"status": "healthy"}`

---

### **Test 2: Test Login**
1. Go to: `https://insight.meldra.ai/login`
2. Enter credentials
3. **Should work** without 500 errors
4. Check console - should show success, not 500

---

### **Test 3: Test Password Reset**
1. Go to: `https://insight.meldra.ai/forgot-password`
2. Enter email
3. Reset link should be: `https://insight.meldra.ai/reset-password?token=...`
4. **NOT:** `http://localhost:5173/reset-password?token=...`

---

## 🐛 **TROUBLESHOOTING**

### **Issue: Still getting 500 error after Step 2**

**Check Railway Logs:**
1. Railway → Your Service → Deployments → Latest → Logs
2. Look for the exact error message
3. Common issues:
   - Database connection error → Check `DATABASE_URL` in Railway variables
   - JWT secret error → Check `JWT_SECRET_KEY` or `SECRET_KEY` in Railway variables
   - Missing import → Check if all Python packages are installed

---

### **Issue: Database query fails**

**Possible causes:**
1. Wrong database selected → Make sure you're in the correct PostgreSQL database
2. Permission error → Railway should have full access, but check
3. Connection timeout → Try again

**Fix:**
- Make sure you're running SQL in Railway → PostgreSQL → Query tab
- Not in a local database or different service

---

### **Issue: Reset links still show localhost**

**Check:**
1. Railway → Variables → `FRONTEND_URL` should be `https://insight.meldra.ai`
2. Railway service restarted after adding variable
3. Try password reset again

---

## 📋 **COMPLETE CHECKLIST**

### **Railway:**
- [ ] `FRONTEND_URL` = `https://insight.meldra.ai` (added)
- [ ] `DATABASE_URL` is set (should be auto-generated)
- [ ] `JWT_SECRET_KEY` or `SECRET_KEY` is set
- [ ] `login_history` table exists (created with SQL)
- [ ] `users.is_verified` column exists (created with SQL)
- [ ] `users.reset_token` columns exist (created with SQL)
- [ ] Service restarted after changes

### **Vercel:**
- [ ] `VITE_API_URL` = `https://insightsheet-production.up.railway.app`
- [ ] Deployment is "Ready Latest"
- [ ] Serving `insight.meldra.ai`

### **Testing:**
- [ ] Backend health check works
- [ ] Login works without 500 error
- [ ] Password reset works
- [ ] Reset links use production URL

---

## 🎯 **QUICK SUMMARY**

**What to do:**
1. Railway: Add `FRONTEND_URL` = `https://insight.meldra.ai`
2. Railway: Run SQL to create `login_history` table and add `is_verified` column
3. Railway: Check logs for any other errors
4. Test: Login should work

**After these steps, both login and password reset should work!** 🚀

---

## 🆘 **Still Not Working?**

If after completing all steps it still doesn't work:

1. **Check Railway Logs:**
   - Railway → Deployments → Latest → Logs
   - Look for error messages
   - Copy the exact error and check what's missing

2. **Verify Database:**
   - Railway → PostgreSQL → Query tab
   - Run: `SELECT * FROM login_history LIMIT 1;`
   - Run: `SELECT is_verified FROM users LIMIT 1;`
   - If these queries fail, tables/columns are missing

3. **Check Environment Variables:**
   - Railway → Variables
   - Make sure all required variables are set
   - `DATABASE_URL`, `SECRET_KEY`, `FRONTEND_URL`, etc.
