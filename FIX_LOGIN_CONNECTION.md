# 🔧 Fix Login "Failed to fetch" Error

## ❌ Current Problem

**Error:** `net::ERR_CONNECTION_REFUSED` for `localhost:8000/api/auth/login`

**Cause:** Frontend is still using `localhost:8000` instead of Railway backend URL.

---

## ✅ Solution: Update Vercel Environment Variable

### **Step 1: Check Current VITE_API_URL**

1. Go to **Vercel Dashboard** → Your Project
2. Click **"Settings"** → **"Environment Variables"**
3. Find `VITE_API_URL`
4. **Current value:** Probably `http://localhost:8000` or empty
5. **Should be:** `https://insightsheet-production.up.railway.app`

---

### **Step 2: Update VITE_API_URL**

1. Click on `VITE_API_URL` to edit
2. **Change value to:** `https://insightsheet-production.up.railway.app`
3. **Important:** Make sure these environments are checked:
   - ✅ **Production**
   - ✅ **Preview**
   - ✅ **Development**
4. Click **"Save"**

---

### **Step 3: Manually Redeploy Vercel**

**This is critical!** Vercel needs to rebuild with the new environment variable.

1. Go to **Vercel Dashboard** → Your Project
2. Click **"Deployments"** tab
3. Click **"..."** menu on the latest deployment
4. Click **"Redeploy"**
5. Wait for deployment to complete (2-3 minutes)

**Why:** Vercel builds the frontend at build time. The `VITE_API_URL` is embedded in the JavaScript bundle. You must redeploy for the change to take effect.

---

### **Step 4: Verify After Redeploy**

1. Visit: `https://insight.meldra.ai`
2. Open browser console (F12)
3. Run this:

```javascript
console.log('API URL:', import.meta.env.VITE_API_URL);
```

**Should show:** `https://insightsheet-production.up.railway.app`

**If it still shows `http://localhost:8000`:**
- Vercel wasn't redeployed
- Or environment variable not set for Production

---

## 🔍 Alternative: Check Build Logs

If redeploy doesn't work:

1. Vercel Dashboard → Deployments
2. Click on the latest deployment
3. Check "Build Logs"
4. Look for `VITE_API_URL` in the logs
5. Should show: `VITE_API_URL=https://insightsheet-production.up.railway.app`

---

## ✅ Quick Checklist

- [ ] `VITE_API_URL` in Vercel = `https://insightsheet-production.up.railway.app`
- [ ] Environment variable set for **Production** environment
- [ ] Vercel manually redeployed after updating variable
- [ ] Browser console shows correct API URL (not localhost)
- [ ] Login should work after redeploy

---

## 🎯 Why This Happens

**Vite environment variables** are embedded at **build time**, not runtime.

- When Vercel builds your app, it reads `VITE_API_URL`
- It replaces `import.meta.env.VITE_API_URL` with the actual value
- If you update the variable but don't redeploy, the old value stays in the built JavaScript

**Solution:** Always redeploy after updating environment variables!

---

## 🆘 If Still Not Working

1. **Clear browser cache:**
   - Hard refresh: `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)
   - Or clear cache in browser settings

2. **Check Vercel deployment:**
   - Make sure latest deployment is successful
   - Check build logs for errors

3. **Verify Railway backend:**
   - Test: `https://insightsheet-production.up.railway.app/api/health`
   - Should return: `{"status": "healthy"}`

4. **Check CORS:**
   - Railway → Variables → `CORS_ORIGINS`
   - Should include: `https://insight.meldra.ai`

---

**The key fix: Update `VITE_API_URL` in Vercel and manually redeploy!** 🚀
