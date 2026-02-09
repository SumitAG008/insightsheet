# 🔗 Connect Vercel Frontend to Railway Backend

## ✅ Backend Status

Your backend is running at: **`https://insightsheet-production.up.railway.app`**

---

## 🔧 Step 1: Update Vercel Environment Variable

### **Go to Vercel Dashboard:**

1. Go to [vercel.com/dashboard](https://vercel.com/dashboard)
2. Click on your project (likely "insightsheet" or "InsightSheet-lite")
3. Click **"Settings"** tab (top menu)
4. Click **"Environment Variables"** (left sidebar)

### **Update VITE_API_URL:**

1. Find `VITE_API_URL` in the list
2. Click on it to edit
3. **Change the value from:**
   - `http://localhost:8000` (or whatever it currently is)
4. **To:**
   - `https://insightsheet-production.up.railway.app`
5. **Make sure these environments are checked:**
   - ✅ Production
   - ✅ Preview
   - ✅ Development
6. Click **"Save"**

---

## 🔧 Step 2: Update Backend CORS

### **Go to Railway Dashboard:**

1. Go to [railway.app](https://railway.app)
2. Click on your "insightsheet" service
3. Click **"Variables"** tab
4. Find `CORS_ORIGINS` variable
5. Click to edit

### **Update CORS_ORIGINS:**

Make sure it includes your Vercel frontend URLs:

```env
CORS_ORIGINS=http://localhost:5173,http://localhost:3000,https://meldra.ai,https://insight.meldra.ai,https://insightsheet-jpci.vercel.app,https://your-vercel-url.vercel.app
```

**Add all your frontend URLs:**
- `https://insight.meldra.ai` (your custom domain)
- `https://insightsheet-jpci.vercel.app` (if you have this)
- Any other Vercel preview URLs you use

6. Click **"Save"**
7. Railway will auto-restart with new CORS settings

---

## 🔧 Step 3: Redeploy Vercel Frontend

### **Option A: Auto-Redeploy (Recommended)**

After updating `VITE_API_URL`, Vercel should auto-redeploy. Wait 1-2 minutes.

### **Option B: Manual Redeploy**

1. Go to Vercel Dashboard → Your Project
2. Click **"Deployments"** tab
3. Click **"..."** menu on latest deployment
4. Click **"Redeploy"**

---

## ✅ Step 4: Test Connection

### **Test 1: Health Check**

Visit: `https://insightsheet-production.up.railway.app/api/health`

Should return: `{"status": "healthy"}`

### **Test 2: API Docs**

Visit: `https://insightsheet-production.up.railway.app/docs`

Should show FastAPI Swagger UI

### **Test 3: Frontend Connection**

1. Visit: `https://insight.meldra.ai` (or your Vercel URL)
2. Open browser console (F12)
3. Try using a feature that needs backend (e.g., Analyzer, P&L Builder)
4. Check console for errors:
   - ✅ No CORS errors = Good!
   - ✅ API calls succeed = Good!
   - ❌ CORS errors = Check CORS_ORIGINS in Railway
   - ❌ Connection refused = Check VITE_API_URL in Vercel

---

## 🔍 Verify Configuration

### **Check Vercel Environment Variable:**

1. Vercel Dashboard → Settings → Environment Variables
2. `VITE_API_URL` should be: `https://insightsheet-production.up.railway.app`
3. Environments: Production ✅, Preview ✅, Development ✅

### **Check Railway CORS:**

1. Railway Dashboard → Variables
2. `CORS_ORIGINS` should include: `https://insight.meldra.ai`
3. Format: `http://localhost:5173,http://localhost:3000,https://meldra.ai,https://insight.meldra.ai`

---

## 🎯 Quick Checklist

- [ ] Updated `VITE_API_URL` in Vercel to `https://insightsheet-production.up.railway.app`
- [ ] Updated `CORS_ORIGINS` in Railway to include frontend URLs
- [ ] Vercel frontend redeployed
- [ ] Tested backend health endpoint
- [ ] Tested frontend → backend connection

---

## 🆘 Troubleshooting

### **CORS Errors:**

**Problem:** Browser console shows CORS errors

**Fix:**
1. Railway → Variables → `CORS_ORIGINS`
2. Add your frontend URL: `https://insight.meldra.ai`
3. Save and wait for restart

---

### **Connection Refused:**

**Problem:** Frontend can't reach backend

**Fix:**
1. Vercel → Settings → Environment Variables
2. Check `VITE_API_URL` is: `https://insightsheet-production.up.railway.app`
3. Make sure it's set for Production environment
4. Redeploy Vercel

---

### **Backend Not Responding:**

**Problem:** Backend health check fails

**Fix:**
1. Railway → Deployments → Check logs
2. Verify backend is running
3. Check environment variables are set correctly

---

## 📋 Summary

**Backend URL:** `https://insightsheet-production.up.railway.app`

**Steps:**
1. ✅ Update `VITE_API_URL` in Vercel
2. ✅ Update `CORS_ORIGINS` in Railway
3. ✅ Redeploy Vercel
4. ✅ Test connection

**After this, your frontend and backend will be synchronized!** 🎉
