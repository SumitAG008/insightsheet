# 🚨 Quick Fix: Blank Pages & Login Issues

## 🎯 Immediate Steps to Fix

### **Step 1: Verify Backend is Running**

**Test Backend Health:**
1. Visit: `https://insightsheet-production.up.railway.app/api/health`
2. **Should return:** `{"status": "healthy"}`

**If this doesn't work:**
- Backend is not running
- Check Railway → Deployments → Logs
- Look for errors

---

### **Step 2: Check Vercel Environment Variable**

**Verify VITE_API_URL:**
1. Vercel Dashboard → Settings → Environment Variables
2. Find `VITE_API_URL`
3. **Current value:** Should be `https://insightsheet-production.up.railway.app`
4. **NOT:** `http://localhost:8000`

**If wrong:**
- Update to: `https://insightsheet-production.up.railway.app`
- **Important:** Make sure it's set for **Production** environment
- Save
- **Redeploy Vercel** (manually trigger redeploy)

---

### **Step 3: Check Backend CORS**

**Verify CORS_ORIGINS in Railway:**
1. Railway Dashboard → Variables
2. Find `CORS_ORIGINS`
3. **Should include:**
   ```
   http://localhost:5173,http://localhost:3000,https://meldra.ai,https://insight.meldra.ai,https://insightsheet-jpci.vercel.app
   ```

**If missing:**
- Add: `https://insight.meldra.ai`
- Save
- Railway will auto-restart

---

### **Step 4: Test in Browser Console**

**On `https://insight.meldra.ai`:**

1. Open browser console (F12)
2. Go to "Console" tab
3. Run this:

```javascript
// Check API URL
console.log('API URL:', import.meta.env.VITE_API_URL);

// Should show: https://insightsheet-production.up.railway.app
```

4. Test backend connection:

```javascript
// Test health endpoint
fetch('https://insightsheet-production.up.railway.app/api/health')
  .then(r => r.json())
  .then(console.log)
  .catch(console.error);

// Should return: {"status": "healthy"}
```

5. Test login endpoint:

```javascript
// Test login (will fail but shows if backend is reachable)
fetch('https://insightsheet-production.up.railway.app/api/auth/login', {
  method: 'POST',
  headers: {'Content-Type': 'application/json'},
  body: JSON.stringify({email: 'test@test.com', password: 'test'})
})
.then(r => r.json())
.then(console.log)
.catch(console.error);

// Should return error message (not CORS error)
```

---

## 🔍 Common Issues & Fixes

### **Issue 1: "Failed to fetch" in Console**

**Cause:** Backend not reachable or wrong URL

**Fix:**
1. Check `VITE_API_URL` in Vercel = `https://insightsheet-production.up.railway.app`
2. Test backend directly: `https://insightsheet-production.up.railway.app/api/health`
3. Check Railway deployment status

---

### **Issue 2: CORS Error**

**Cause:** Frontend URL not in CORS_ORIGINS

**Fix:**
1. Railway → Variables → `CORS_ORIGINS`
2. Add: `https://insight.meldra.ai`
3. Save and wait for restart

---

### **Issue 3: Login Returns Error**

**Cause:** Database connection or missing env vars

**Fix:**
1. Check Railway logs for errors
2. Verify `DATABASE_URL` is set correctly
3. Verify `JWT_SECRET_KEY` is set

---

### **Issue 4: Pages Still Blank**

**Cause:** API calls failing silently

**Fix:**
1. Open browser console (F12)
2. Check "Network" tab
3. Try to use a feature (e.g., Analyzer)
4. Look for failed API calls
5. Check response/error messages

---

## ✅ Quick Checklist

- [ ] Backend health works: `https://insightsheet-production.up.railway.app/api/health`
- [ ] Vercel `VITE_API_URL` = `https://insightsheet-production.up.railway.app`
- [ ] Railway `CORS_ORIGINS` includes `https://insight.meldra.ai`
- [ ] Vercel frontend redeployed after updating `VITE_API_URL`
- [ ] Browser console shows no CORS errors
- [ ] Backend logs show no errors

---

## 🎯 Most Likely Issues

1. **VITE_API_URL not updated in Vercel** → Update and redeploy
2. **CORS_ORIGINS missing frontend URL** → Add to Railway
3. **Backend not fully started** → Check Railway logs
4. **Frontend not redeployed** → Manually redeploy Vercel

---

## 🚀 Quick Fix Steps

1. **Vercel:** Update `VITE_API_URL` → `https://insightsheet-production.up.railway.app`
2. **Vercel:** Redeploy (manually trigger)
3. **Railway:** Verify `CORS_ORIGINS` includes `https://insight.meldra.ai`
4. **Test:** Visit `https://insight.meldra.ai` → Open console → Check for errors
5. **Test:** Try login → Check console for errors

---

**After these steps, pages should work and login should function!** 🎉
