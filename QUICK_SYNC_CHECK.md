# ⚡ Quick Sync Check - 2 Minutes

## 🎯 **Fast Verification**

### **1. Check Local Source (30 seconds)**

Open these files and verify they have the security fix:

- ✅ `src/api/meldraClient.js` (line 37) - Should have `throw new Error` if no VITE_API_URL
- ✅ `src/api/backendClient.js` (line 6) - Should have `throw new Error` if no VITE_API_URL

**Quick check:**
```bash
grep -A 5 "throw new Error.*VITE_API_URL" src/api/*.js
```

**Should find 2 matches** (one in each file)

---

### **2. Check What's Deployed (30 seconds)**

1. Visit: `https://insight.meldra.ai`
2. Open console (F12)
3. Run:
```javascript
console.log(import.meta.env.VITE_API_URL);
```

**Should show:** `https://insightsheet-production.up.railway.app`

**If `undefined` or `localhost`:** ❌ Not synced

---

### **3. Check Vercel (1 minute)**

1. **Vercel Dashboard** → **Deployments** → Latest
2. **Build Logs** → Search: `VITE_API_URL`
3. **Should show:** `VITE_API_URL=https://insightsheet-production.up.railway.app`

**If not:** ❌ Environment variable not set or build is old

---

## ✅ **Result**

- ✅ All 3 checks pass = Everything synced
- ❌ Any check fails = Need to fix (see `VERIFY_SOURCE_SYNC.md`)

---

**That's it!** ⚡
