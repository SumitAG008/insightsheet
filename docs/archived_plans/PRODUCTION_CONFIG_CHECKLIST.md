# ✅ PRODUCTION CONFIGURATION CHECKLIST
## Ensure insight.meldra.ai Works Correctly

---

## 🎯 **Goal**

Make sure production (Vercel + Railway) uses **production URLs**, not localhost.

---

## 📋 **RAILWAY CONFIGURATION**

### **Required Environment Variables:**

| Variable | Value | Purpose |
|----------|-------|---------|
| `FRONTEND_URL` | `https://insight.meldra.ai` | Generate reset links |
| `CORS_ORIGINS` | `http://localhost:5173,http://localhost:3000,https://meldra.ai,https://insight.meldra.ai,https://meldra-six.vercel.app,https://insightsheet-jpci.vercel.app,https://meldra-git-main-sumit-ags-projects.vercel.app,https://meldra-ln9n3ezi7-sumit-ags-projects.vercel.app` | Allow frontend requests |
| `DATABASE_URL` | (auto-generated) | Database connection |
| `SECRET_KEY` | (your secret key) | JWT token signing |
| `OPENAI_API_KEY` | (your OpenAI key) | AI features |

### **How to Set:**
1. Railway Dashboard → Your Service → **Variables** tab
2. Click variable to edit, or **"+ New"** to add
3. Set value
4. **Save** → Railway auto-restarts

### **Database Schema:**
Run this SQL in Railway → PostgreSQL → Query tab:
```sql
ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token_expires TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS verification_token VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS verification_token_expires TIMESTAMP;
```

---

## 📋 **VERCEL CONFIGURATION**

### **Required Environment Variables:**

| Variable | Value | Purpose |
|----------|-------|---------|
| `VITE_API_URL` | `https://insightsheet-production.up.railway.app` | Backend API URL |
| `VITE_APP_NAME` | `InsightSheet-lite` | (Optional) App name |
| `VITE_APP_DOMAIN` | `meldra.ai` | (Optional) App domain |

### **How to Set:**
1. Vercel Dashboard → Your Project → **Settings** → **Environment Variables**
2. Find or add `VITE_API_URL`
3. Set value to: `https://insightsheet-production.up.railway.app`
4. **Check:** Production ✅, Preview ✅, Development ✅
5. **Save**
6. **MUST Redeploy** (see below)

---

## 🔄 **VERCEL REDEPLOY** (CRITICAL!)

**After updating `VITE_API_URL`, you MUST redeploy:**

1. Vercel Dashboard → **Deployments** tab
2. Click **"..."** on latest deployment
3. Click **"Redeploy"**
4. **Uncheck:** "Use existing Build Cache"
5. Click **"Redeploy"**
6. Wait 2-3 minutes

**Why:** Vite embeds environment variables at build time. Without redeploying, old values remain.

---

## ✅ **VERIFICATION STEPS**

### **1. Check Railway Backend:**
Visit: `https://insightsheet-production.up.railway.app/api/health`
- Should return: `{"status": "healthy"}`

### **2. Check Vercel Frontend:**
1. Visit: `https://insight.meldra.ai`
2. Open console (F12)
3. Run: `console.log(import.meta.env.VITE_API_URL)`
4. **Should show:** `https://insightsheet-production.up.railway.app`
5. **NOT:** `http://localhost:8000` or `http://localhost:8001`

### **3. Test Login:**
1. Go to: `https://insight.meldra.ai/login`
2. Enter credentials
3. **Should work** without errors
4. Check console - API calls should go to Railway

### **4. Test Password Reset:**
1. Go to: `https://insight.meldra.ai/forgot-password`
2. Enter email
3. **Should work** without errors
4. Reset link should be: `https://insight.meldra.ai/reset-password?token=...`

---

## 🐛 **COMMON ISSUES**

### **Issue: Can't login - shows localhost:8001**
**Cause:** Vercel `VITE_API_URL` not set or not redeployed
**Fix:**
1. Set `VITE_API_URL` = `https://insightsheet-production.up.railway.app`
2. Redeploy Vercel

### **Issue: Password reset - "Database schema error"**
**Cause:** Railway database missing columns
**Fix:**
1. Railway → PostgreSQL → Query tab
2. Run SQL to add columns (see above)

### **Issue: CORS errors**
**Cause:** Railway `CORS_ORIGINS` doesn't include Vercel URL
**Fix:**
1. Railway → Variables → `CORS_ORIGINS`
2. Add: `https://insight.meldra.ai`
3. Save

### **Issue: Reset link uses localhost**
**Cause:** Railway `FRONTEND_URL` not set
**Fix:**
1. Railway → Variables → `FRONTEND_URL`
2. Set to: `https://insight.meldra.ai`
3. Save

---

## 📝 **QUICK REFERENCE**

**Railway Backend URL:**
```
https://insightsheet-production.up.railway.app
```

**Vercel Frontend URL:**
```
https://insight.meldra.ai
```

**Local Development:**
- Frontend: `http://localhost:5173`
- Backend: `http://localhost:8001`

---

## ✅ **FINAL CHECKLIST**

Before testing on production:

- [ ] Railway `FRONTEND_URL` = `https://insight.meldra.ai`
- [ ] Railway `CORS_ORIGINS` includes `https://insight.meldra.ai`
- [ ] Railway database has reset_token columns
- [ ] Vercel `VITE_API_URL` = `https://insightsheet-production.up.railway.app`
- [ ] Vercel redeployed after updating variables
- [ ] Backend health check works
- [ ] Frontend console shows correct API URL

---

**After completing this checklist, insight.meldra.ai should work perfectly!** 🚀
