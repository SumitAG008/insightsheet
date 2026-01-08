# 🚀 ONE-TIME DEPLOYMENT CHECKLIST
## Complete Setup for Vercel + Railway (Do This Once, Fix Everything)

**⚠️ IMPORTANT:** You can only deploy once every 5 hours on free tier. Follow this checklist completely before deploying!

---

## ✅ STEP 1: Push All Code Changes to GitHub (Do This First!)

### **1.1 Commit All Changes**
```bash
git add .
git commit -m "Fix password validation (byte length), update error messages, improve UI"
git push origin main
```

**Wait for:** Railway to auto-deploy from GitHub (2-3 minutes)

---

## ✅ STEP 2: Railway Backend Configuration

### **2.1 Go to Railway Dashboard**
- Visit: [railway.app](https://railway.app)
- Click on your **"insightsheet"** service

### **2.2 Environment Variables (Variables Tab)**

**Add/Update these variables:**

#### **A. CORS_ORIGINS** (CRITICAL - Fixes CORS errors)
```
http://localhost:5173,http://localhost:3000,https://meldra.ai,https://insight.meldra.ai,https://meldra-six.vercel.app,https://insightsheet-jpci.vercel.app,https://meldra-git-main-sumit-ags-projects.vercel.app,https://meldra-ln9n3ezi7-sumit-ags-projects.vercel.app
```

**Why:** Allows your Vercel frontend to communicate with Railway backend.

---

#### **B. DATABASE_URL** (Should already be set)
- Railway auto-generates this for PostgreSQL
- **Don't change it!**
- Should look like: `postgresql://postgres:password@host:port/railway`

---

#### **C. SECRET_KEY** (For JWT tokens)
```
your-secret-key-here-minimum-32-characters-long
```
**Generate one:** Use a long random string (at least 32 characters)

---

#### **D. OPENAI_API_KEY** (For AI features)
```
sk-your-openai-api-key-here
```
**Get from:** [platform.openai.com/api-keys](https://platform.openai.com/api-keys)

---

#### **E. FRONTEND_URL** (For email links)
```
https://insight.meldra.ai
```

---

#### **F. SMTP Settings** (Optional - for email verification)
If you want email verification to work:

```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
SMTP_FROM_EMAIL=your-email@gmail.com
```

**Note:** If not set, email verification will be skipped (users can still register, but won't get verification emails).

---

### **2.3 Database Migration** (CRITICAL - Fixes 500 errors)

**Option A: Automatic (Recommended)**
- The `init_db()` function in `backend/app/database.py` should automatically add missing columns on startup
- **Just restart Railway service** after code is deployed

**Option B: Manual (If automatic fails)**
1. Railway Dashboard → Your Service → **"Deployments"** tab
2. Click **"..."** menu → **"View Logs"**
3. Look for errors about `verification_token` column
4. If you see errors, Railway will auto-run migrations on next deploy

**To manually trigger:**
- Railway Dashboard → Your Service → **"Settings"** → **"Restart"**

---

### **2.4 Verify Railway Deployment**

**Test Backend Health:**
1. Visit: `https://insightsheet-production.up.railway.app/api/health`
2. **Should return:** `{"status": "healthy"}`

**If not working:**
- Check Railway → Deployments → Logs
- Look for errors
- Make sure all environment variables are set

---

## ✅ STEP 3: Vercel Frontend Configuration

### **3.1 Go to Vercel Dashboard**
- Visit: [vercel.com/dashboard](https://vercel.com/dashboard)
- Click on your project (likely "meldra" or "insightsheet")

### **3.2 Environment Variables (Settings → Environment Variables)**

**Add/Update these variables:**

#### **A. VITE_API_URL** (CRITICAL - Fixes connection errors)
```
https://insightsheet-production.up.railway.app
```

**Important:**
- ✅ Check **Production**
- ✅ Check **Preview**  
- ✅ Check **Development**
- Click **"Save"**

**Why:** Frontend needs to know where backend is located.

---

#### **B. VITE_APP_NAME** (Optional)
```
InsightSheet-lite
```

---

### **3.3 Manual Redeploy** (CRITICAL - Required after env var changes)

**Why:** Vite embeds environment variables at **build time**, not runtime. You MUST redeploy after changing env vars.

**Steps:**
1. Vercel Dashboard → **"Deployments"** tab
2. Click **"..."** menu on latest deployment
3. Click **"Redeploy"**
4. **Uncheck:** "Use existing Build Cache" (for fresh build)
5. Click **"Redeploy"**
6. **Wait 2-3 minutes** for deployment to complete

---

### **3.4 Verify Vercel Deployment**

**Test Frontend:**
1. Visit your Vercel URL: `https://insight.meldra.ai` (or your custom domain)
2. Open browser console (F12)
3. Run this in console:
```javascript
console.log('API URL:', import.meta.env.VITE_API_URL);
// Should show: https://insightsheet-production.up.railway.app
```

**If wrong:**
- Environment variable not set correctly
- Need to redeploy again

---

## ✅ STEP 4: Final Verification Tests

### **Test 1: Backend Health**
```
https://insightsheet-production.up.railway.app/api/health
```
**Expected:** `{"status": "healthy"}`

---

### **Test 2: Frontend-Backend Connection**
1. Open your frontend: `https://insight.meldra.ai`
2. Open browser console (F12)
3. Try to login or register
4. **Check console for errors:**
   - ❌ CORS errors → Railway `CORS_ORIGINS` not set correctly
   - ❌ 500 errors → Database migration issue (check Railway logs)
   - ❌ Connection refused → `VITE_API_URL` wrong in Vercel

---

### **Test 3: Password Reset**
1. Go to: `https://insight.meldra.ai/reset-password?token=test`
2. Try entering a password
3. **Check error message:**
   - Should say "72 bytes" not "72 characters"
   - Should show actual byte count if password is too long

---

## 🐛 Common Issues & Quick Fixes

### **Issue 1: CORS Error**
**Error:** `Access to fetch at '...' has been blocked by CORS policy`

**Fix:**
1. Railway → Variables → `CORS_ORIGINS`
2. Add your Vercel URL to the list
3. Railway auto-restarts (wait 1 minute)

---

### **Issue 2: 500 Error on Login/Register**
**Error:** `column users.verification_token does not exist`

**Fix:**
1. Railway → Settings → **Restart** service
2. This triggers `init_db()` which adds missing columns
3. Check Railway logs to confirm migration ran

---

### **Issue 3: Frontend Shows "localhost:8001"**
**Error:** Frontend trying to connect to localhost

**Fix:**
1. Vercel → Settings → Environment Variables
2. Update `VITE_API_URL` to: `https://insightsheet-production.up.railway.app`
3. **Redeploy Vercel** (uncheck build cache)

---

### **Issue 4: Password Validation Error**
**Error:** "Password is too long. Maximum 72 characters allowed."

**Fix:**
- ✅ Already fixed in code!
- Error message now says "72 bytes" and shows byte count
- Just need to redeploy after code push

---

## 📋 Pre-Deployment Checklist

Before you deploy, make sure:

- [ ] All code changes committed and pushed to GitHub
- [ ] Railway `CORS_ORIGINS` includes all your Vercel URLs
- [ ] Railway `DATABASE_URL` is set (auto-generated)
- [ ] Railway `SECRET_KEY` is set (for JWT)
- [ ] Railway `OPENAI_API_KEY` is set (for AI features)
- [ ] Railway `FRONTEND_URL` is set
- [ ] Vercel `VITE_API_URL` = `https://insightsheet-production.up.railway.app`
- [ ] Vercel environment variables checked for Production, Preview, Development
- [ ] Ready to manually redeploy Vercel after env var changes

---

## 🎯 Deployment Order

1. **Push code to GitHub** → Railway auto-deploys (2-3 min)
2. **Update Railway env vars** → Railway auto-restarts (1 min)
3. **Update Vercel env vars** → Save
4. **Redeploy Vercel** → Wait (2-3 min)
5. **Test everything** → Verify all endpoints work

**Total time:** ~5-7 minutes

---

## ✅ Success Criteria

After deployment, you should be able to:

- ✅ Visit `https://insight.meldra.ai` and see the landing page
- ✅ Register a new account (email verification optional)
- ✅ Login with existing account
- ✅ Reset password (with correct byte-length validation)
- ✅ No CORS errors in browser console
- ✅ No 500 errors from backend
- ✅ All API calls work correctly

---

## 🆘 If Something Goes Wrong

1. **Check Railway Logs:**
   - Railway → Deployments → Latest → View Logs
   - Look for errors about database, CORS, or missing env vars

2. **Check Vercel Logs:**
   - Vercel → Deployments → Latest → Build Logs
   - Look for build errors or missing env vars

3. **Check Browser Console:**
   - F12 → Console tab
   - Look for CORS errors, 500 errors, or connection errors

4. **Test Backend Directly:**
   - Visit: `https://insightsheet-production.up.railway.app/api/health`
   - Should return: `{"status": "healthy"}`

---

## 📝 Notes

- **Free tier limits:** Railway and Vercel both have free tier limits
- **Deployment frequency:** Vercel free tier allows unlimited deployments, but Railway may have limits
- **Database:** Railway provides PostgreSQL automatically
- **Custom domain:** If you have `insight.meldra.ai`, make sure it's configured in Vercel

---

**Good luck! 🚀**
