# 🚀 PRODUCTION DEPLOYMENT FIX
## Fix Login & Password Reset on insight.meldra.ai

---

## ❌ **Current Issues**

1. **Can't login from insight.meldra.ai**
2. **Can't change password from insight.meldra.ai**
3. **Reset links showing production URL instead of localhost (when testing locally)**

---

## ✅ **FIX 1: Railway Environment Variables**

### **Go to Railway Dashboard:**
1. [railway.app](https://railway.app)
2. Click on your **"insightsheet"** service
3. Click **"Variables"** tab

### **Set/Update These Variables:**

#### **A. FRONTEND_URL** (CRITICAL - For reset links)
```
https://insight.meldra.ai
```
**Why:** This is used to generate password reset links. Must be production URL for production.

#### **B. CORS_ORIGINS** (CRITICAL - For CORS)
```
http://localhost:5173,http://localhost:3000,https://meldra.ai,https://insight.meldra.ai,https://meldra-six.vercel.app,https://insightsheet-jpci.vercel.app,https://meldra-git-main-sumit-ags-projects.vercel.app,https://meldra-ln9n3ezi7-sumit-ags-projects.vercel.app
```
**Why:** Allows your Vercel frontend to communicate with Railway backend.

#### **C. DATABASE_URL** (Should already be set)
- Railway auto-generates this
- **Don't change it!**

#### **D. SECRET_KEY** (For JWT tokens)
- Should already be set
- If missing, add a long random string (32+ characters)

#### **E. OPENAI_API_KEY** (For AI features)
- Should already be set
- If missing, add your OpenAI API key

#### **F. SMTP Settings** (Optional - for email)
If you want email verification to work:
```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
SMTP_FROM_EMAIL=your-email@gmail.com
```

**After updating variables:**
- Railway will auto-restart (wait 1-2 minutes)

---

## ✅ **FIX 2: Railway Database Schema**

### **Add Missing Columns to Railway Database:**

1. **Railway Dashboard → PostgreSQL** (or your database service)
2. Click **"Query"** tab (or "SQL Editor")
3. **Run this SQL:**
   ```sql
   ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token VARCHAR(255);
   ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token_expires TIMESTAMP;
   ALTER TABLE users ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT FALSE;
   ALTER TABLE users ADD COLUMN IF NOT EXISTS verification_token VARCHAR(255);
   ALTER TABLE users ADD COLUMN IF NOT EXISTS verification_token_expires TIMESTAMP;
   ```
4. Click **"Run"** or **"Execute"**

**This fixes the "Database schema error" on password reset!**

---

## ✅ **FIX 3: Vercel Environment Variables**

### **Go to Vercel Dashboard:**
1. [vercel.com/dashboard](https://vercel.com/dashboard)
2. Click on your project (likely "meldra" or "insightsheet")
3. Click **"Settings"** → **"Environment Variables"**

### **Set/Update These Variables:**

#### **A. VITE_API_URL** (CRITICAL - For API calls)
```
https://insightsheet-production.up.railway.app
```
**Important:**
- ✅ Check **Production**
- ✅ Check **Preview**
- ✅ Check **Development**
- **NOT:** `http://localhost:8000` or `http://localhost:8001`

**Why:** Frontend needs to know where backend is. This is embedded at build time.

#### **B. VITE_APP_NAME** (Optional)
```
InsightSheet-lite
```

#### **C. VITE_APP_DOMAIN** (Optional)
```
meldra.ai
```

**After updating:**
- Click **"Save"**
- **MUST manually redeploy** (see Step 4)

---

## ✅ **FIX 4: Redeploy Vercel** (CRITICAL!)

**Why:** Vite embeds `VITE_API_URL` at **build time**, not runtime. You MUST redeploy after changing it.

### **Steps:**
1. **Vercel Dashboard → Deployments** tab
2. Click **"..."** menu on latest deployment
3. Click **"Redeploy"**
4. **Uncheck:** "Use existing Build Cache" (for fresh build)
5. Click **"Redeploy"**
6. **Wait 2-3 minutes** for deployment to complete

**This is the most critical step!** Without redeploying, Vercel will still use the old `VITE_API_URL`.

---

## ✅ **FIX 5: Verify Railway Deployment**

### **Check Railway Logs:**
1. Railway Dashboard → Your Service → **"Logs"** tab
2. Look for:
   - ✅ "Application startup complete"
   - ✅ "Database initialized"
   - ✅ No errors about missing columns

### **Test Backend Health:**
Visit: `https://insightsheet-production.up.railway.app/api/health`

**Should return:** `{"status": "healthy"}`

---

## ✅ **FIX 6: Verify Everything Works**

### **Test 1: Check Frontend API URL**
1. Visit: `https://insight.meldra.ai`
2. Open browser console (F12)
3. Run:
   ```javascript
   console.log('API URL:', import.meta.env.VITE_API_URL);
   ```
4. **Should show:** `https://insightsheet-production.up.railway.app`
5. **NOT:** `http://localhost:8000` or `http://localhost:8001`

### **Test 2: Test Login**
1. Go to: `https://insight.meldra.ai/login`
2. Enter your email and password
3. **Should work** without errors
4. **Check console:** Should see requests to `insightsheet-production.up.railway.app`

### **Test 3: Test Password Reset**
1. Go to: `https://insight.meldra.ai/forgot-password`
2. Enter your email
3. **Should work** without errors
4. Reset link should use: `https://insight.meldra.ai/reset-password?token=...`

---

## 📋 **Complete Checklist**

### **Railway:**
- [ ] `FRONTEND_URL` = `https://insight.meldra.ai`
- [ ] `CORS_ORIGINS` includes all Vercel URLs
- [ ] `DATABASE_URL` is set (auto-generated)
- [ ] `SECRET_KEY` is set
- [ ] `OPENAI_API_KEY` is set
- [ ] Database columns added (reset_token, etc.)
- [ ] Service restarted after variable changes

### **Vercel:**
- [ ] `VITE_API_URL` = `https://insightsheet-production.up.railway.app`
- [ ] Environment variables checked for Production, Preview, Development
- [ ] **Manually redeployed** after updating variables
- [ ] Deployment completed successfully

### **Verification:**
- [ ] Backend health check works
- [ ] Frontend shows correct API URL in console
- [ ] Login works on insight.meldra.ai
- [ ] Password reset works on insight.meldra.ai
- [ ] No CORS errors in console
- [ ] No 500 errors from backend

---

## 🐛 **Troubleshooting**

### **Issue: Still can't login**
**Check:**
1. Vercel `VITE_API_URL` = `https://insightsheet-production.up.railway.app`
2. Vercel was redeployed after updating variable
3. Browser console shows correct API URL
4. Railway backend is running (check health endpoint)

### **Issue: Password reset shows "Database schema error"**
**Fix:**
1. Railway → PostgreSQL → Query tab
2. Run SQL to add columns (see Fix 2 above)
3. Or restart Railway service (triggers init_db())

### **Issue: CORS errors**
**Fix:**
1. Railway → Variables → `CORS_ORIGINS`
2. Add your Vercel URL: `https://insight.meldra.ai`
3. Railway auto-restarts

### **Issue: Reset link uses localhost in production**
**Fix:**
1. Railway → Variables → `FRONTEND_URL`
2. Set to: `https://insight.meldra.ai`
3. Railway auto-restarts

---

## ⏱️ **Timeline**

1. **Update Railway variables:** 2 minutes
2. **Add database columns:** 1 minute
3. **Update Vercel variables:** 2 minutes
4. **Redeploy Vercel:** 2-3 minutes
5. **Total:** ~7-8 minutes

---

## ✅ **After All Fixes**

Everything should work on `https://insight.meldra.ai`:
- ✅ Login
- ✅ Register
- ✅ Password reset
- ✅ Email verification
- ✅ All API calls

**Last updated:** After fixing localhost URL issue
