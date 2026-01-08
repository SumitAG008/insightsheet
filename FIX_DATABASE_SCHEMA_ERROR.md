# 🔧 Fix "Database schema error" - Password Reset

## ❌ **Current Error**

**Error Message:** "Database schema error. Please contact support."

**Cause:** Railway production database is missing `reset_token` and `reset_token_expires` columns.

---

## ✅ **Quick Fix (Choose One)**

### **Option 1: Restart Railway Service (Easiest - 2 minutes)**

This will trigger `init_db()` which automatically adds missing columns.

1. **Go to Railway Dashboard:**
   - [railway.app](https://railway.app)
   - Click on your "insightsheet" service

2. **Restart Service:**
   - Click **"Settings"** tab
   - Click **"Restart"** button
   - Wait 1-2 minutes for service to restart

3. **Check Logs:**
   - Railway → **"Logs"** tab
   - Look for: `✅ Added reset_token column`
   - Look for: `✅ Added reset_token_expires column`

4. **Test Again:**
   - Try password reset link again
   - Should work now!

---

### **Option 2: Add Columns Manually via Railway (Fastest - 1 minute)**

1. **Go to Railway Dashboard:**
   - [railway.app](https://railway.app)
   - Click on your **PostgreSQL** database (or the database service)

2. **Open Query Tab:**
   - Click **"Query"** tab (or "SQL Editor")

3. **Run This SQL:**
   ```sql
   ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token VARCHAR(255);
   ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token_expires TIMESTAMP;
   ALTER TABLE users ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT FALSE;
   ALTER TABLE users ADD COLUMN IF NOT EXISTS verification_token VARCHAR(255);
   ALTER TABLE users ADD COLUMN IF NOT EXISTS verification_token_expires TIMESTAMP;
   ```

4. **Click "Run" or "Execute"**

5. **Test Again:**
   - Try password reset link again
   - Should work now!

---

### **Option 3: Check Railway Deployment Status**

If Railway hasn't deployed the latest code yet:

1. **Railway Dashboard → Deployments**
2. **Check latest deployment:**
   - Should be from your last git push (commit `e7b4ae2`)
   - Status should be "Active" (green)
3. **If deployment is old or failed:**
   - Check logs for errors
   - May need to trigger manual deploy

---

## 🔍 **Verify Fix Worked**

### **Test 1: Check Database Columns**

**Via Railway Query Tab:**
```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'users' 
AND column_name IN ('reset_token', 'reset_token_expires', 'is_verified', 'verification_token', 'verification_token_expires');
```

**Should return 5 rows** (one for each column)

---

### **Test 2: Try Password Reset**

1. Go to: `https://insight.meldra.ai/reset-password?token=YOUR_TOKEN`
2. Enter a new password
3. **Should NOT see:** "Database schema error"
4. **Should see:** Success message or password validation error (if password is invalid)

---

## 📋 **Why This Happened**

1. **Database was created before** the code that adds these columns
2. **Railway auto-migration** (`init_db()`) should run on startup, but:
   - Service might not have restarted after code deploy
   - Migration might have failed silently
   - Database connection might have issues

---

## ✅ **After Fix**

**Password reset should work!** The error "Database schema error" should be gone.

**If you still see errors:**
- Check Railway logs for specific error messages
- Verify columns were added (run SQL query above)
- Make sure Railway service is running

---

## 🚀 **Recommended Action**

**Do Option 1 (Restart Railway Service)** - This is the safest and will ensure all migrations run correctly.

**Then do Option 2 (Add Columns Manually)** if restart doesn't work.

---

**Last updated:** After identifying database schema error
