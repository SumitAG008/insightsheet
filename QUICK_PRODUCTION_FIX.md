# ⚡ QUICK PRODUCTION FIX
## Fix insight.meldra.ai Login & Password Reset (5 Minutes)

---

## 🚀 **STEP 1: Railway Variables** (2 min)

**Railway Dashboard → Your Service → Variables**

### **Update FRONTEND_URL:**
```
https://insight.meldra.ai
```

### **Verify CORS_ORIGINS includes:**
```
https://insight.meldra.ai
```

**Save** → Railway auto-restarts

---

## 🗄️ **STEP 2: Railway Database** (1 min)

**Railway → PostgreSQL → Query tab**

**Run SQL:**
```sql
ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token_expires TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS verification_token VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS verification_token_expires TIMESTAMP;
```

**Click "Run"**

---

## 🌐 **STEP 3: Vercel Variables** (1 min)

**Vercel Dashboard → Settings → Environment Variables**

### **Update VITE_API_URL:**
```
https://insightsheet-production.up.railway.app
```

**Check:** Production ✅, Preview ✅, Development ✅

**Save**

---

## 🔄 **STEP 4: Redeploy Vercel** (2-3 min)

**Vercel → Deployments → "..." → Redeploy**

**Uncheck:** "Use existing Build Cache"

**Click:** Redeploy

**Wait:** 2-3 minutes

---

## ✅ **VERIFY** (1 min)

1. Visit: `https://insight.meldra.ai`
2. Open console (F12)
3. Run: `console.log(import.meta.env.VITE_API_URL)`
4. **Should show:** `https://insightsheet-production.up.railway.app`

5. **Test login** - should work!
6. **Test password reset** - should work!

---

## 🎯 **That's It!**

After these 4 steps, everything should work on production! 🚀
