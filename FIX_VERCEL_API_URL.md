# 🔧 Fix Vercel API URL Configuration

## ❌ Current Error

**Error:** `Failed to load resource: net::ERR_CONNECTION_REFUSED` for `:8001/api/auth/forgot-password`

**Problem:** The Vercel frontend is trying to connect to `localhost:8001` instead of the Railway backend.

---

## ✅ Solution: Update Vercel Environment Variable

The frontend uses `VITE_API_URL` environment variable. You need to set it in Vercel to point to your Railway backend.

### **Step 1: Get Your Railway Backend URL**

Your Railway backend URL is:
```
https://insightsheet-production.up.railway.app
```

---

### **Step 2: Update Vercel Environment Variable**

1. **Go to Vercel Dashboard:**
   - [vercel.com/dashboard](https://vercel.com/dashboard)
   - Click on your **"meldra"** project

2. **Go to Settings:**
   - Click **"Settings"** tab (top navigation)
   - Click **"Environment Variables"** (left sidebar)

3. **Find or Add `VITE_API_URL`:**
   - Look for `VITE_API_URL` in the list
   - If it exists and shows `http://localhost:8001` → **Click to edit**
   - If it doesn't exist → **Click "Add New"**

4. **Set the Value:**
   - **Key:** `VITE_API_URL`
   - **Value:** `https://insightsheet-production.up.railway.app`
   - **Environment:** Select all (Production, Preview, Development)
   - **Click "Save"**

5. **Redeploy:**
   - After saving, Vercel will ask to redeploy
   - Click **"Redeploy"** or go to Deployments tab → Click **"..."** → **"Redeploy"**
   - Wait 2-3 minutes for deployment

---

## 🔍 Verify Configuration

After redeploy:

1. **Visit your Vercel site:**
   - Go to `https://insight.meldra.ai` or your Vercel URL

2. **Open Browser Console:**
   - Press `F12` or right-click → "Inspect"
   - Go to "Console" tab

3. **Check API Calls:**
   - Should show requests to `https://insightsheet-production.up.railway.app`
   - Should NOT show `localhost:8001` or `localhost:8000`

4. **Test Features:**
   - Try "Forgot Password"
   - Try Login
   - Should work without connection errors

---

## 📋 Environment Variables Checklist

**Vercel Environment Variables:**
- ✅ `VITE_API_URL` = `https://insightsheet-production.up.railway.app`
- ✅ `VITE_APP_NAME` = `Meldra` (optional)
- ✅ `VITE_APP_DOMAIN` = `insight.meldra.ai` (optional)

**Railway Environment Variables:**
- ✅ `CORS_ORIGINS` = (includes all Vercel URLs)
- ✅ `DATABASE_URL` = (your PostgreSQL connection)
- ✅ `OPENAI_API_KEY` = (your OpenAI key)
- ✅ `JWT_SECRET_KEY` = (your secret key)
- ✅ Other backend variables...

---

## ⚠️ Important Notes

1. **Local Development:**
   - For local development, keep `VITE_API_URL=http://localhost:8001` in your local `.env` file
   - Vercel environment variables only affect the deployed site

2. **After Changing Environment Variables:**
   - Vercel requires a redeploy for changes to take effect
   - The build process uses these variables during build time

3. **Multiple Environments:**
   - You can set different values for Production, Preview, and Development
   - For now, set the same value for all environments

---

## ✅ Summary

**The Fix:**
1. Go to Vercel → Settings → Environment Variables
2. Set `VITE_API_URL` = `https://insightsheet-production.up.railway.app`
3. Redeploy Vercel
4. Test the application

**After this fix:**
- ✅ Frontend will connect to Railway backend
- ✅ No more `ERR_CONNECTION_REFUSED` errors
- ✅ All API calls will work correctly

---

**Once you update the environment variable and redeploy, the connection error will be fixed!** 🚀
