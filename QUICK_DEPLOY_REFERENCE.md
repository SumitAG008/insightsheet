# ⚡ QUICK DEPLOY REFERENCE
## Critical Steps Only (5 Minutes)

---

## 🚀 BEFORE YOU START

1. **Push code to GitHub:**
   ```bash
   git add .
   git commit -m "Fix password validation and error messages"
   git push origin main
   ```

---

## 🔧 RAILWAY (2 minutes)

### Step 1: Update CORS_ORIGINS
**Railway Dashboard → Your Service → Variables → CORS_ORIGINS**

**Set to:**
```
http://localhost:5173,http://localhost:3000,https://meldra.ai,https://insight.meldra.ai,https://meldra-six.vercel.app,https://insightsheet-jpci.vercel.app,https://meldra-git-main-sumit-ags-projects.vercel.app,https://meldra-ln9n3ezi7-sumit-ags-projects.vercel.app
```

**Save** → Railway auto-restarts

---

### Step 2: Verify Other Variables
**Railway → Variables tab**

**Must have:**
- ✅ `DATABASE_URL` (auto-generated, don't change)
- ✅ `SECRET_KEY` (for JWT - at least 32 chars)
- ✅ `OPENAI_API_KEY` (for AI features)
- ✅ `FRONTEND_URL` = `https://insight.meldra.ai`

---

### Step 3: Restart Service (if needed)
**Railway → Settings → Restart**

**Why:** Triggers database migration to add missing columns

---

## 🌐 VERCEL (2 minutes)

### Step 1: Update VITE_API_URL
**Vercel Dashboard → Your Project → Settings → Environment Variables**

**Find `VITE_API_URL` and set to:**
```
https://insightsheet-production.up.railway.app
```

**Check all environments:**
- ✅ Production
- ✅ Preview
- ✅ Development

**Save**

---

### Step 2: Redeploy (CRITICAL!)
**Vercel → Deployments → "..." menu → Redeploy**

**Uncheck:** "Use existing Build Cache"

**Click:** Redeploy

**Wait:** 2-3 minutes

---

## ✅ VERIFY (1 minute)

### Test 1: Backend
Visit: `https://insightsheet-production.up.railway.app/api/health`

**Expected:** `{"status": "healthy"}`

---

### Test 2: Frontend
Visit: `https://insight.meldra.ai`

**Open console (F12) and run:**
```javascript
console.log(import.meta.env.VITE_API_URL);
// Should show: https://insightsheet-production.up.railway.app
```

---

### Test 3: Login
Try to login or register

**Check console for:**
- ❌ CORS error → Railway CORS_ORIGINS wrong
- ❌ 500 error → Railway needs restart (database migration)
- ❌ Connection refused → Vercel VITE_API_URL wrong

---

## 🐛 QUICK FIXES

| Error | Fix |
|-------|-----|
| CORS error | Add Vercel URL to Railway `CORS_ORIGINS` |
| 500 error (verification_token) | Railway → Settings → Restart |
| localhost:8001 in console | Vercel `VITE_API_URL` wrong → Redeploy |
| Password "72 characters" error | Already fixed! Just redeploy |

---

**That's it! 🎉**
