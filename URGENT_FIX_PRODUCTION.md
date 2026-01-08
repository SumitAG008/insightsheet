# 🚨 URGENT: Fix Production Environment Variables
## Stop Localhost from Appearing in Production

---

## ❌ **Current Problem**

- ✅ Localhost works fine
- ❌ Production shows `http://localhost:5173` in reset links
- ❌ Can't login on `insight.meldra.ai` (500 error)
- ❌ Can't reset password on production

**Root Cause:** Environment variables in Railway and Vercel are either:
1. Not set (using localhost defaults)
2. Set to localhost values
3. Not being used correctly

---

## ✅ **SOLUTION: Set Production URLs**

---

## 🚀 **STEP 1: Railway - Set FRONTEND_URL** (5 minutes)

### **Why This Matters:**
Railway uses `FRONTEND_URL` to generate password reset links. If it's not set or set to localhost, reset links will be `http://localhost:5173` instead of `https://insight.meldra.ai`.

### **How to Fix:**

1. **Go to Railway Dashboard:**
   - Visit: [railway.app](https://railway.app)
   - Click on your **"insightsheet"** service

2. **Open Variables Tab:**
   - Click **"Variables"** tab (left sidebar)

3. **Find or Add `FRONTEND_URL`:**
   - Look for `FRONTEND_URL` in the list
   - If it exists and shows `http://localhost:5173` → **Click to edit**
   - If it doesn't exist → Click **"+ New Variable"**

4. **Set the Value:**
   - **Key:** `FRONTEND_URL`
   - **Value:** `https://insight.meldra.ai`
   - **DO NOT use:** `http://localhost:5173` (this is for local only!)

5. **Save:**
   - Click **"Save"** or **"Add"**
   - Railway will automatically restart (wait 1-2 minutes)

---

## 🌐 **STEP 2: Vercel - Set VITE_API_URL** (5 minutes)

### **Why This Matters:**
Vercel uses `VITE_API_URL` to know where the backend is. If it's set to localhost, the frontend will try to connect to `localhost:8000` instead of Railway.

### **How to Fix:**

1. **Go to Vercel Dashboard:**
   - Visit: [vercel.com/dashboard](https://vercel.com/dashboard)
   - Click on your project

2. **Open Environment Variables:**
   - Click **"Settings"** tab (top navigation)
   - Click **"Environment Variables"** (left sidebar)

3. **Find or Add `VITE_API_URL`:**
   - Look for `VITE_API_URL` in the list
   - If it exists and shows `http://localhost:8000` or `http://localhost:8001` → **Click to edit**
   - If it doesn't exist → Click **"Add New"**

4. **Set the Value:**
   - **Key:** `VITE_API_URL`
   - **Value:** `https://insightsheet-production.up.railway.app`
   - **DO NOT use:** `http://localhost:8000` or `http://localhost:8001` (these are for local only!)

5. **Select Environments:**
   - ✅ **Production** (MUST check this!)
   - ✅ **Preview**
   - ✅ **Development** (optional - can keep localhost for local dev)

6. **Save:**
   - Click **"Save"**

---

## 🔄 **STEP 3: Redeploy Vercel** (CRITICAL - 3 minutes)

**⚠️ THIS IS THE MOST IMPORTANT STEP!**

After updating `VITE_API_URL`, you **MUST** manually redeploy Vercel. Just updating the variable isn't enough!

### **How to Redeploy:**

1. **Go to Deployments Tab:**
   - Vercel Dashboard → Your Project
   - Click **"Deployments"** tab (top menu)

2. **Find Latest Deployment:**
   - Look for the most recent deployment

3. **Click Redeploy:**
   - Click **"..."** menu (three dots) on that deployment
   - Click **"Redeploy"**

4. **Uncheck Build Cache:**
   - **IMPORTANT:** Uncheck **"Use existing Build Cache"**
   - This ensures a fresh build with the new environment variable

5. **Confirm Redeploy:**
   - Click **"Redeploy"** button
   - Wait 2-3 minutes for deployment to complete

**Why This Matters:**
Vite embeds `VITE_API_URL` into the JavaScript bundle at **build time**. Without redeploying, the old localhost value stays in the built code.

---

## 🗄️ **STEP 4: Fix Railway Database** (For 500 Error)

The 500 error on login might be from missing database columns.

### **How to Fix:**

1. **Railway Dashboard → Your Service**
2. **Click on PostgreSQL Database** (in the same project)
3. **Click "Query" tab**
4. **Run this SQL:**

```sql
ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token_expires TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS verification_token VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS verification_token_expires TIMESTAMP;
```

5. **Click "Run"**
6. **Wait for success message**

---

## ✅ **STEP 5: Verify Everything Works**

### **Test 1: Check Frontend API URL**

1. Visit: `https://insight.meldra.ai`
2. Open browser console (F12)
3. Run:
   ```javascript
   console.log('API URL:', import.meta.env.VITE_API_URL);
   ```
4. **Should show:** `https://insightsheet-production.up.railway.app`
5. **NOT:** `http://localhost:8000` or `http://localhost:8001`

**If it still shows localhost:**
- Vercel wasn't redeployed after updating variable
- Or variable not set for Production environment

---

### **Test 2: Check Backend Health**

Visit: `https://insightsheet-production.up.railway.app/api/health`

**Should return:** `{"status": "healthy"}`

---

### **Test 3: Test Login**

1. Go to: `https://insight.meldra.ai/login`
2. Enter credentials
3. **Should work** without 500 errors
4. Check console - API calls should go to Railway, not localhost

---

### **Test 4: Test Password Reset**

1. Go to: `https://insight.meldra.ai/forgot-password`
2. Enter email
3. Reset link should be: `https://insight.meldra.ai/reset-password?token=...`
4. **NOT:** `http://localhost:5173/reset-password?token=...`

---

## 📋 **QUICK CHECKLIST**

### **Railway:**
- [ ] `FRONTEND_URL` = `https://insight.meldra.ai` (NOT localhost)
- [ ] `CORS_ORIGINS` includes `https://insight.meldra.ai`
- [ ] Database columns added (reset_token, etc.)
- [ ] Service restarted after variable changes

### **Vercel:**
- [ ] `VITE_API_URL` = `https://insightsheet-production.up.railway.app` (NOT localhost)
- [ ] Variable checked for **Production** environment
- [ ] **Manually redeployed** after updating variable
- [ ] Build cache unchecked during redeploy

### **Verification:**
- [ ] Frontend console shows correct API URL (not localhost)
- [ ] Backend health check works
- [ ] Login works on insight.meldra.ai
- [ ] Password reset works on insight.meldra.ai
- [ ] Reset links use production URL (not localhost)

---

## ⚠️ **IMPORTANT NOTES**

1. **Localhost is ONLY for local development**
   - Never use localhost in production environment variables
   - Localhost URLs won't work from production sites

2. **Vercel MUST be redeployed**
   - Just updating the variable isn't enough
   - Must manually redeploy to rebuild with new values
   - Uncheck build cache for fresh build

3. **Railway auto-restarts**
   - After updating variables, Railway restarts automatically
   - Wait 1-2 minutes for restart to complete

4. **Environment-specific values**
   - Production should use production URLs
   - Development can use localhost
   - But make sure Production environment uses production URLs!

---

## 🎯 **SUMMARY**

**What to do:**
1. Railway: Set `FRONTEND_URL` = `https://insight.meldra.ai`
2. Railway: Add database columns (SQL query)
3. Vercel: Set `VITE_API_URL` = `https://insightsheet-production.up.railway.app`
4. Vercel: **Redeploy** (uncheck cache)
5. Test: Verify everything works

**After these steps, production should work perfectly!** 🚀

---

## 🆘 **Still Not Working?**

If after completing all steps it still doesn't work:

1. **Check Railway Logs:**
   - Railway Dashboard → Your Service → "Deployments" → Click latest → "View Logs"
   - Look for errors

2. **Check Vercel Build Logs:**
   - Vercel Dashboard → Deployments → Click latest → "Build Logs"
   - Look for `VITE_API_URL` in logs

3. **Clear Browser Cache:**
   - Hard refresh: `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)

4. **Verify Variables Are Set:**
   - Railway: Check Variables tab shows correct values
   - Vercel: Check Environment Variables shows correct values for Production
