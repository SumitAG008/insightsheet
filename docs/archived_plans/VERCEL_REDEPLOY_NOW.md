# 🚀 Vercel Redeploy - Fix Connection Issues

## ✅ Good News!

Your `VITE_API_URL` is correctly set to: `https://insightsheet-production.up.railway.app`

**But** the frontend is still using `localhost:8000` because Vercel hasn't been redeployed yet.

---

## 🔧 Fix: Redeploy Vercel

### **Step 1: Save Environment Variable (If Not Saved)**

1. In Vercel → Environment Variables
2. Make sure `VITE_API_URL` = `https://insightsheet-production.up.railway.app`
3. Click **"Save"** button (bottom right)

---

### **Step 2: Manually Redeploy**

**This is critical!** Vite embeds environment variables at build time.

1. Go to **Vercel Dashboard** → Your Project
2. Click **"Deployments"** tab (top menu)
3. Find the latest deployment
4. Click **"..."** menu (three dots) on that deployment
5. Click **"Redeploy"**
6. **Important:** Select **"Use existing Build Cache"** = **OFF** (unchecked)
   - This ensures a fresh build with new environment variables
7. Click **"Redeploy"** button
8. Wait for deployment to complete (2-3 minutes)

---

### **Step 3: Verify Deployment**

1. Wait for deployment status to show **"Ready"** (green checkmark)
2. Visit: `https://insight.meldra.ai`
3. Open browser console (F12)
4. Run:

```javascript
console.log('API URL:', import.meta.env.VITE_API_URL);
```

**Should show:** `https://insightsheet-production.up.railway.app`

**If still shows `localhost:8000`:**
- Hard refresh: `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)
- Or clear browser cache

---

## 🔍 Why This Happens

**Vite Environment Variables:**
- Are embedded at **build time** (when Vercel builds your app)
- Not read at **runtime** (when user visits the site)
- So updating the variable without redeploying = old value stays

**Solution:** Always redeploy after updating `VITE_*` variables!

---

## ✅ After Redeploy

1. **Login should work:**
   - Visit: `https://insight.meldra.ai/login`
   - Should connect to Railway backend
   - No more "Failed to fetch" errors

2. **Pages should work:**
   - P&L Builder → Should connect to backend
   - Analyzer → Should connect to backend
   - AI Assistant → Should connect to backend

3. **Console should show:**
   - No more `ERR_CONNECTION_REFUSED` errors
   - API calls going to Railway backend

---

## 🎯 Quick Steps

1. ✅ `VITE_API_URL` is set correctly (you already did this!)
2. ⏳ **Save** the environment variable (if just updated)
3. ⏳ **Redeploy** Vercel (manually trigger)
4. ⏳ **Wait** for deployment (2-3 minutes)
5. ⏳ **Test** login and pages

---

## 🆘 If Still Not Working After Redeploy

1. **Clear browser cache:**
   - Hard refresh: `Ctrl+Shift+R`
   - Or: Browser Settings → Clear browsing data → Cached images and files

2. **Check deployment logs:**
   - Vercel → Deployments → Click on deployment → Build Logs
   - Look for `VITE_API_URL` in logs
   - Should show: `VITE_API_URL=https://insightsheet-production.up.railway.app`

3. **Verify Railway backend:**
   - Test: `https://insightsheet-production.up.railway.app/api/health`
   - Should return: `{"status": "healthy"}`

---

**The key: Redeploy Vercel after updating environment variables!** 🚀
