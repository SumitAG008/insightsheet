# 🔧 Fix CORS Error - Add New Vercel URLs

## ❌ Current Error

**CORS Error:** 
```
Access to fetch at 'https://insightsheet-production.up.railway.app/api/auth/login' 
from origin 'https://meldra-git-main-sumit-ags-projects.vercel.app' 
has been blocked by CORS policy
```

**Problem:** New Vercel deployment URLs are not in the CORS allowed origins list.

---

## ✅ Solution: Update CORS_ORIGINS in Railway

### **Step 1: Get All Vercel URLs**

From your Vercel deployments, you have these URLs:
- `https://meldra-git-main-sumit-ags-projects.vercel.app`
- `https://meldra-ln9n3ezi7-sumit-ags-projects.vercel.app`
- `https://meldra-six.vercel.app`
- `https://insightsheet-jpci.vercel.app`
- `https://meldra-q8c867yf4-sumit-ags-projects.vercel.app`

---

### **Step 2: Update Railway CORS_ORIGINS**

1. **Go to Railway Dashboard:**
   - [railway.app](https://railway.app)
   - Click on your **"insightsheet"** service

2. **Go to Variables Tab:**
   - Click **"Variables"** tab (or **Settings** → **Variables**)

3. **Find `CORS_ORIGINS`:**
   - Look for `CORS_ORIGINS` in the list
   - Click to edit

4. **Update the Value:**
   Add all Vercel URLs (comma-separated):
   ```
   http://localhost:5173,http://localhost:3000,https://meldra.ai,https://insight.meldra.ai,https://insightsheet-jpci.vercel.app,https://meldra-six.vercel.app,https://meldra-q8c867yf4-sumit-ags-projects.vercel.app,https://meldra-git-main-sumit-ags-projects.vercel.app,https://meldra-ln9n3ezi7-sumit-ags-projects.vercel.app
   ```

5. **Click Save:**
   - Railway will automatically redeploy
   - Wait 2-3 minutes

---

## 🔄 Alternative: Use Your Custom Domain

**Better Solution:** Use your custom domain `https://insight.meldra.ai` consistently.

1. **In Vercel:**
   - Go to Settings → Domains
   - Set `insight.meldra.ai` as the primary domain
   - All deployments will use this domain

2. **This domain is already in CORS:**
   - `https://insight.meldra.ai` is already in the allowed origins
   - No need to add new URLs every time

---

## 📋 Complete CORS_ORIGINS Value

**For Railway Environment Variable:**

```
http://localhost:5173,http://localhost:3000,https://meldra.ai,https://insight.meldra.ai,https://insightsheet-jpci.vercel.app,https://meldra-six.vercel.app,https://meldra-q8c867yf4-sumit-ags-projects.vercel.app,https://meldra-git-main-sumit-ags-projects.vercel.app,https://meldra-ln9n3ezi7-sumit-ags-projects.vercel.app
```

---

## ⚠️ Important Note

**Vercel creates a new URL for each deployment:**
- Preview deployments get unique URLs
- Production deployments also get unique URLs
- This means you'll keep getting CORS errors with new URLs

**Best Solution:**
- Use your custom domain `https://insight.meldra.ai` as the primary domain
- This URL is already in CORS and won't change

---

## ✅ After Updating

1. **Railway will auto-redeploy** (or manually redeploy)
2. **Wait 2-3 minutes**
3. **Test login again** - CORS error should be gone
4. **If using custom domain** - No more CORS issues!

---

## 🎯 Summary

**The Issue:**
- New Vercel deployment URLs not in CORS allowed origins

**The Fix:**
1. Add new URLs to Railway `CORS_ORIGINS` environment variable
2. Or use custom domain `insight.meldra.ai` consistently

**After updating Railway, the CORS error will be fixed!** 🚀
