# 🔧 Fix Password Reset 500 Error

## ❌ **Problem**

Password reset is failing with **500 Internal Server Error**.

**Cause:** Database columns `reset_token` and `reset_token_expires` don't exist in PostgreSQL database.

---

## ✅ **Solution**

The code has been updated to:
1. **Auto-add columns** on startup (if missing)
2. **Handle missing columns gracefully** (better error messages)
3. **Run migration automatically** when backend starts

---

## 🚀 **What Happens Now**

### **After Railway Deploys:**

1. **Backend starts** → `init_db()` runs
2. **Checks for columns** → If missing, adds them automatically
3. **Password reset works** → No more 500 errors!

---

## 📋 **Manual Fix (If Auto-Migration Doesn't Work)**

If you still get 500 errors after Railway deploys:

### **Option 1: Run SQL Migration (Recommended)**

1. **Connect to Railway Database:**
   - Railway Dashboard → Your Service → PostgreSQL
   - Click "Connect" → Copy connection string

2. **Run SQL:**
   ```sql
   -- Add reset_token column if it doesn't exist
   ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token VARCHAR(255);
   
   -- Add reset_token_expires column if it doesn't exist
   ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token_expires TIMESTAMP;
   ```

3. **Or use Railway's Database Tab:**
   - Railway → PostgreSQL → Query tab
   - Paste the SQL above
   - Click "Run"

---

### **Option 2: Use Migration Script**

1. **SSH into Railway** (if available)
2. **Run:**
   ```bash
   cd backend
   python add_reset_columns.py
   ```

---

## ✅ **After Fix**

1. **Request new password reset:**
   - Go to `/forgot-password`
   - Enter email
   - Get reset link

2. **Reset password:**
   - Click reset link
   - Enter new password
   - Should work without 500 error!

---

## 🔍 **Verify Fix**

**Check Railway Logs:**
- Railway Dashboard → Logs
- Look for: "✅ Added reset_token column"
- Look for: "✅ Added reset_token_expires column"

**If you see these messages:** Migration worked! ✅

**If you see errors:** Run manual SQL migration (Option 1 above)

---

## 📋 **Summary**

- ✅ **Code updated** to auto-add columns on startup
- ✅ **Better error handling** for missing columns
- ⏳ **Wait for Railway to deploy** (auto-deploys from GitHub)
- ✅ **Password reset should work** after deployment

**The fix is in the code. Railway will auto-deploy and add the columns automatically!** 🚀
