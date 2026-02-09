# 📝 EXACT VALUES TO SET IN RAILWAY AND VERCEL

## Copy-Paste Ready Values

---

## 🚂 **RAILWAY (Backend) - Variables Tab**

### **Variable 1: FRONTEND_URL**
```
https://insight.meldra.ai
```

### **Variable 2: CORS_ORIGINS** (if not already set)
```
http://localhost:5173,http://localhost:3000,https://meldra.ai,https://insight.meldra.ai,https://meldra-six.vercel.app,https://insightsheet-jpci.vercel.app,https://meldra-git-main-sumit-ags-projects.vercel.app,https://meldra-ln9n3ezi7-sumit-ags-projects.vercel.app
```

### **Variable 3 & 4: Private beta (testing only – optional)**
Only set these when you want to restrict registration to invited users. Remove or set `BETA_MODE=false` to open registration.

- **BETA_MODE** = `true`
- **BETA_ALLOWED_EMAILS** = `sumitagaria@gmail.com,tester@example.com` (comma-separated emails)

See **TESTING_AND_UK_REGISTRATION.md** for details.

---

## 🌐 **VERCEL (Frontend) - Environment Variables**

### **Variable: VITE_API_URL**
```
https://insightsheet-production.up.railway.app
```

**IMPORTANT:**
- ✅ Check **Production**
- ✅ Check **Preview**
- ✅ Check **Development** (optional - can keep localhost for local)

---

## ❌ **DO NOT USE THESE IN PRODUCTION:**

- ❌ `http://localhost:5173` (frontend local)
- ❌ `http://localhost:8000` (backend local)
- ❌ `http://localhost:8001` (backend local)
- ❌ `http://127.0.0.1:8000` (backend local)

**These only work on your local machine, not in production!**

---

## ✅ **CORRECT PRODUCTION VALUES:**

- ✅ `https://insight.meldra.ai` (frontend production)
- ✅ `https://insightsheet-production.up.railway.app` (backend production)

---

## 🔍 **How to Verify:**

### **Railway:**
1. Railway Dashboard → Your Service → Variables
2. Check `FRONTEND_URL` shows: `https://insight.meldra.ai`
3. Check `CORS_ORIGINS` includes: `https://insight.meldra.ai`

### **Vercel:**
1. Vercel Dashboard → Settings → Environment Variables
2. Check `VITE_API_URL` shows: `https://insightsheet-production.up.railway.app`
3. Check it's enabled for **Production** environment
4. **Redeploy** after setting (uncheck build cache)

---

## 🎯 **Quick Test:**

After setting values and redeploying:

1. Visit: `https://insight.meldra.ai`
2. Open console (F12)
3. Run: `console.log(import.meta.env.VITE_API_URL)`
4. Should show: `https://insightsheet-production.up.railway.app`
5. If shows localhost → Vercel not redeployed or variable not set for Production
