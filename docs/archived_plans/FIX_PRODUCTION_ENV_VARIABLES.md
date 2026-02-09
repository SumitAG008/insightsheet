# 🔧 FIX PRODUCTION ENVIRONMENT VARIABLES
## Stop Localhost URLs from Appearing in Production

---

## ❌ **Current Problem**

- **Localhost works fine** ✅
- **Production (insight.meldra.ai) shows localhost URLs** ❌
- **Can't login on production** ❌
- **Can't reset password on production** ❌
- **500 error on login** ❌

**Root Cause:** Environment variables in Vercel and Railway are either:
1. Not set correctly
2. Set to localhost values
3. Not being used (code using defaults)

---

## ✅ **SOLUTION: Set Correct Environment Variables**

---

## 🚀 **STEP 1: Railway Environment Variables** (Backend)

### **Go to Railway Dashboard:**
1. [railway.app](https://railway.app)
2. Click on your **"insightsheet"** service
3. Click **"Variables"** tab

### **Set/Update These Variables:**

#### **A. FRONTEND_URL** ⚠️ CRITICAL
**Current (WRONG):** Probably `http://localhost:5173` or not set  
**Should be:**
```
https://insight.meldra.ai
```

**Why:** This generates password reset links. Must be production URL for production.

**How to set:**
1. Find `FRONTEND_URL` in the list
2. Click to edit
3. Change value to: `https://insight.meldra.ai`
4. Click **"Save"**
5. Railway will auto-restart (wait 1-2 minutes)

---

#### **B. CORS_ORIGINS** ⚠️ CRITICAL
**Should include:**
```
http://localhost:5173,http://localhost:3000,https://meldra.ai,https://insight.meldra.ai,https://meldra-six.vercel.app,https://insightsheet-jpci.vercel.app,https://meldra-git-main-sumit-ags-projects.vercel.app,https://meldra-ln9n3ezi7-sumit-ags-projects.vercel.app
```

**Why:** Allows your Vercel frontend to make API calls to Railway backend.

**How to set:**
1. Find `CORS_ORIGINS` in the list
2. Click to edit
3. Make sure `https://insight.meldra.ai` is in the list
4. Click **"Save"**

---

#### **C. Other Required Variables:**
- `DATABASE_URL` - Should already be set (auto-generated)
- `SECRET_KEY` - Should already be set
- `OPENAI_API_KEY` - Should already be set

---

## 🌐 **STEP 2: Vercel Environment Variables** (Frontend)

### **Go to Vercel Dashboard:**
1. [vercel.com/dashboard](https://vercel.com/dashboard)
2. Click on your project
3. Click **"Settings"** → **"Environment Variables"**

### **Set/Update This Variable:**

#### **A. VITE_API_URL** ⚠️ CRITICAL
**Current (WRONG):** Probably `http://localhost:8000` or `http://localhost:8001`  
**Should be:**
```
https://insightsheet-production.up.railway.app
```

**Why:** Frontend needs to know where backend is. This is embedded at build time.

**How to set:**
1. Find `VITE_API_URL` in the list
2. Click to edit
3. **Delete** any localhost value
4. **Set to:** `https://insightsheet-production.up.railway.app`
5. **IMPORTANT:** Check these environments:
   - ✅ **Production**
   - ✅ **Preview**
   - ✅ **Development**
6. Click **"Save"**

**⚠️ DO NOT use localhost in production!**

---

## 🔄 **STEP 3: Redeploy Vercel** (CRITICAL!)

**After updating `VITE_API_URL`, you MUST redeploy:**

1. **Vercel Dashboard → Deployments** tab
2. Click **"..."** menu on latest deployment
3. Click **"Redeploy"**
4. **Uncheck:** "Use existing Build Cache" (very important!)
5. Click **"Redeploy"**
6. **Wait 2-3 minutes** for deployment to complete

**Why:** Vite embeds `VITE_API_URL` at build time. Without redeploying, the old localhost value stays in the built JavaScript.

---

## 🗄️ **STEP 4: Fix Railway Database** (For Password Reset)

The 500 error might be from missing database columns.

### **Railway → PostgreSQL → Query tab**

**Run this SQL:**
```sql
ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token_expires TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS verification_token VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS verification_token_expires TIMESTAMP;
```

**Click "Run"**

---

## ✅ **STEP 5: Verify Configuration**

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

## 🐛 **TROUBLESHOOTING**

### **Issue: Reset link still shows localhost**
**Cause:** Railway `FRONTEND_URL` not set or set to localhost
**Fix:**
1. Railway → Variables → `FRONTEND_URL`
2. Set to: `https://insight.meldra.ai`
3. Save
4. Railway auto-restarts

---

### **Issue: Can't login - 500 error**
**Possible causes:**
1. **Database schema issue** - Run SQL to add columns (Step 4)
2. **Backend not running** - Check Railway logs
3. **CORS error** - Check Railway `CORS_ORIGINS` includes `https://insight.meldra.ai`

**Fix:**
1. Check Railway logs for specific error
2. Add database columns if missing
3. Verify CORS_ORIGINS includes production URL

---

### **Issue: Frontend still uses localhost:8000**
**Cause:** Vercel `VITE_API_URL` not updated or not redeployed
**Fix:**
1. Verify `VITE_API_URL` = `https://insightsheet-production.up.railway.app`
2. **Redeploy Vercel** (uncheck build cache)
3. Clear browser cache (Ctrl+Shift+R)

---

## 📋 **COMPLETE CHECKLIST**

### **Railway:**
- [ ] `FRONTEND_URL` = `https://insight.meldra.ai` (NOT localhost)
- [ ] `CORS_ORIGINS` includes `https://insight.meldra.ai`
- [ ] Database columns added (reset_token, etc.)
- [ ] Service restarted after variable changes

### **Vercel:**
- [ ] `VITE_API_URL` = `https://insightsheet-production.up.railway.app` (NOT localhost)
- [ ] Variable checked for Production, Preview, Development
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

3. **Railway auto-restarts**
   - After updating variables, Railway restarts automatically
   - Wait 1-2 minutes for restart to complete

4. **Environment-specific values**
   - Production should use production URLs
   - Development can use localhost
   - But make sure Production environment uses production URLs!

---

## 🎯 **QUICK FIX SUMMARY**

1. **Railway:** Set `FRONTEND_URL` = `https://insight.meldra.ai`
2. **Railway:** Add database columns (SQL query)
3. **Vercel:** Set `VITE_API_URL` = `https://insightsheet-production.up.railway.app`
4. **Vercel:** Redeploy (uncheck cache)
5. **Test:** Verify everything works

**After these steps, production should work perfectly!** 🚀
