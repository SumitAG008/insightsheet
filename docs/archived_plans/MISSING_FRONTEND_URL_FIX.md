# 🚨 CRITICAL: Missing FRONTEND_URL in Railway

## ❌ **Problem Found**

Looking at your Railway screenshot, I can see:
- ✅ `CORS_ORIGINS` is set (includes `https://insight.meldra.ai`)
- ✅ `DATABASE_URL` is set
- ✅ `ENVIRONMENT` = `production`
- ❌ **`FRONTEND_URL` is MISSING!**

**This is why reset links show `http://localhost:5173` instead of `https://insight.meldra.ai`**

---

## ✅ **SOLUTION: Add FRONTEND_URL to Railway**

### **Step 1: Add the Variable**

1. **Railway Dashboard → Your Service → Variables Tab**
2. Click **"+ New Variable"** button (top right)
3. **Key:** `FRONTEND_URL`
4. **Value:** `https://insight.meldra.ai`
5. Click **"Add"** or **"Save"**

### **Step 2: Apply Changes**

After adding the variable, you'll see "2 Changes" in the left panel:
1. Click **"Apply 2 changes"** button
2. Or click **"Deploy"** button
3. Wait 1-2 minutes for Railway to restart

---

## 🔍 **Why This Matters**

The backend code in `backend/app/main.py` and `backend/app/services/email_service.py` uses:

```python
frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173")
```

**If `FRONTEND_URL` is not set, it defaults to `http://localhost:5173`**

This is why:
- ✅ Localhost works (uses the default)
- ❌ Production shows localhost (because variable is missing)

---

## ✅ **After Adding FRONTEND_URL**

1. **Password reset links will be:** `https://insight.meldra.ai/reset-password?token=...`
2. **NOT:** `http://localhost:5173/reset-password?token=...`

---

## 🔄 **Also Check: Vercel Redeploy**

Your Vercel screenshot shows `VITE_API_URL` was "Updated 4m ago", but:

**Did you redeploy Vercel after updating it?**

If not:
1. Vercel Dashboard → Deployments
2. Click "..." on latest deployment
3. Click "Redeploy"
4. **Uncheck** "Use existing Build Cache"
5. Click "Redeploy"

**Why:** Vite embeds `VITE_API_URL` at build time. Without redeploying, the old value might still be in the JavaScript bundle.

---

## 📋 **Quick Checklist**

- [ ] Railway: Add `FRONTEND_URL` = `https://insight.meldra.ai`
- [ ] Railway: Apply/Deploy changes
- [ ] Vercel: Redeploy after recent `VITE_API_URL` update (if not done)
- [ ] Test: Password reset should show production URL

---

**After adding `FRONTEND_URL` to Railway, the localhost issue in reset links should be fixed!** 🚀
