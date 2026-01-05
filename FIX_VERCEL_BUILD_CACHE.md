# 🔧 Fix Vercel Build Cache Issue - Environment Variables Not Working

## ❌ Problem

**Error:** `ERR_CONNECTION_REFUSED` for `:8001/api/auth/forgot-password`

**Root Cause:** Even though `VITE_API_URL` is set in Vercel, the build might be using cached code or the environment variable isn't being injected at build time.

---

## ✅ Solutions (Try in Order)

### **Solution 1: Clear Build Cache and Redeploy**

1. **Go to Vercel Dashboard:**
   - [vercel.com/dashboard](https://vercel.com/dashboard)
   - Click on your **"meldra"** project

2. **Redeploy Without Cache:**
   - Go to **"Deployments"** tab
   - Click **"..."** menu (three dots) on the latest deployment
   - Click **"Redeploy"**
   - **IMPORTANT:** Uncheck **"Use existing Build Cache"**
   - Click **"Redeploy"**
   - Wait 2-3 minutes

**This forces Vercel to rebuild with fresh environment variables.**

---

### **Solution 2: Verify Environment Variable is Set for All Environments**

1. **Go to Vercel Settings → Environment Variables:**
   - [vercel.com/dashboard](https://vercel.com/dashboard)
   - Your project → **Settings** → **Environment Variables**

2. **Check `VITE_API_URL`:**
   - Make sure it's set for **ALL environments**:
     - ✅ Production
     - ✅ Preview
     - ✅ Development
   - Value: `https://insightsheet-production.up.railway.app`

3. **If not set for all:**
   - Click on `VITE_API_URL`
   - Under "Environments", select all three
   - Click **"Save"**
   - Redeploy

---

### **Solution 3: Check Build Logs**

1. **Go to Latest Deployment:**
   - Vercel Dashboard → Deployments
   - Click on the latest deployment

2. **Check Build Logs:**
   - Click **"Build Logs"** tab
   - Look for `VITE_API_URL` in the logs
   - Should show the Railway URL, not `localhost`

3. **If it shows `localhost`:**
   - The environment variable isn't being read
   - Try Solution 1 (clear cache) or Solution 2 (check environments)

---

### **Solution 4: Force Rebuild via Git Push**

Sometimes a new commit forces a fresh build:

1. **Make a small change:**
   ```bash
   # Add a comment or whitespace change
   echo "" >> README.md
   git add README.md
   git commit -m "Force Vercel rebuild"
   git push origin main
   ```

2. **Vercel will auto-deploy:**
   - Should pick up environment variables fresh
   - Wait 2-3 minutes

---

### **Solution 5: Check Vite Build Configuration**

The issue might be that Vite needs the environment variable at build time, not runtime.

**Verify in `vite.config.js`:**
- Should not have any hardcoded URLs
- Environment variables are injected during build

**Current config looks fine** - no changes needed here.

---

## 🔍 Debugging Steps

### **1. Check What URL is Being Used:**

After redeploy, open browser console on your Vercel site:

```javascript
// In browser console
console.log(import.meta.env.VITE_API_URL)
```

**Should show:** `https://insightsheet-production.up.railway.app`
**If it shows:** `undefined` or `http://localhost:8000` → Environment variable not set correctly

---

### **2. Check Network Tab:**

1. Open browser DevTools → **Network** tab
2. Try "Forgot Password"
3. Look at the failed request
4. Check the **Request URL** - what does it show?

**Should show:** `https://insightsheet-production.up.railway.app/api/auth/forgot-password`
**If it shows:** `:8001/api/auth/forgot-password` → Environment variable issue

---

## 📋 Most Likely Fix

**Try this first:**

1. ✅ Go to Vercel → Deployments
2. ✅ Click **"..."** → **"Redeploy"**
3. ✅ **Uncheck "Use existing Build Cache"**
4. ✅ Click **"Redeploy"**
5. ✅ Wait 2-3 minutes
6. ✅ Test again

**This clears the build cache and forces Vercel to rebuild with fresh environment variables.**

---

## ⚠️ Important Notes

1. **Vite Environment Variables:**
   - Must start with `VITE_` to be exposed to client code
   - Are injected at **build time**, not runtime
   - Need a fresh build to pick up changes

2. **Build Cache:**
   - Vercel caches builds for speed
   - If environment variable changed, need to clear cache
   - Uncheck "Use existing Build Cache" when redeploying

3. **Environment Scope:**
   - Make sure variable is set for the environment you're using
   - Production deployments use Production variables
   - Preview deployments use Preview variables

---

## ✅ Summary

**The Issue:**
- Environment variable is set, but build is using cached code
- Or environment variable not set for the right environment

**The Fix:**
1. Clear build cache (uncheck "Use existing Build Cache")
2. Redeploy
3. Verify in browser console that `VITE_API_URL` is correct
4. Test the application

**After clearing cache and redeploying, the environment variable should be picked up correctly!** 🚀
