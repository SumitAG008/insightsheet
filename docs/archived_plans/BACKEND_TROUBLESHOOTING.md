# 🔧 Backend Troubleshooting - Blank Pages & Login Issues

## 🎯 Current Issues

1. **Pages are blank** (Analyzer, P&L Builder, DB Schema)
2. **Login not working**
3. **Backend connection issues**

---

## ✅ Step 1: Verify Backend is Running

### **Test Backend Health:**

1. Visit: `https://insightsheet-production.up.railway.app/api/health`
2. Should return: `{"status": "healthy"}`

**If this doesn't work:**
- Backend is not running
- Check Railway → Deployments → Logs
- Verify backend deployed successfully

---

## ✅ Step 2: Check Vercel Environment Variable

### **Verify VITE_API_URL:**

1. Vercel Dashboard → Settings → Environment Variables
2. Find `VITE_API_URL`
3. **Should be:** `https://insightsheet-production.up.railway.app`
4. **NOT:** `http://localhost:8000`

**If wrong:**
- Update to: `https://insightsheet-production.up.railway.app`
- Save
- Redeploy Vercel

---

## ✅ Step 3: Check Backend CORS

### **Verify CORS_ORIGINS in Railway:**

1. Railway Dashboard → Variables
2. Find `CORS_ORIGINS`
3. **Should include:**
   ```
   http://localhost:5173,http://localhost:3000,https://meldra.ai,https://insight.meldra.ai,https://insightsheet-jpci.vercel.app
   ```

**If missing frontend URL:**
- Add: `https://insight.meldra.ai`
- Save
- Railway will restart

---

## ✅ Step 4: Test Backend Endpoints

### **Test 1: Health Endpoint**

Visit: `https://insightsheet-production.up.railway.app/api/health`

**Expected:** `{"status": "healthy"}`

### **Test 2: API Docs**

Visit: `https://insightsheet-production.up.railway.app/docs`

**Expected:** FastAPI Swagger UI

### **Test 3: Login Endpoint**

Test in browser console (F12):

```javascript
fetch('https://insightsheet-production.up.railway.app/api/auth/login', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    email: 'test@example.com',
    password: 'test123'
  })
})
.then(r => r.json())
.then(console.log)
.catch(console.error);
```

**Expected:** Either success response or error message (not CORS error)

---

## ✅ Step 5: Check Browser Console

### **On Frontend (`https://insight.meldra.ai`):**

1. Open browser console (F12)
2. Go to "Console" tab
3. Try to login or use a feature
4. Look for errors:

**Common Errors:**
- `Failed to fetch` → Backend not reachable
- `CORS error` → CORS not configured
- `Network error` → Wrong API URL
- `401 Unauthorized` → Login credentials wrong (but backend is working!)

---

## ✅ Step 6: Verify Backend Environment Variables

### **In Railway → Variables, check:**

- [ ] `DATABASE_URL` is set (not empty)
- [ ] `OPENAI_API_KEY` is set (not empty)
- [ ] `JWT_SECRET_KEY` is set (not empty)
- [ ] `CORS_ORIGINS` includes frontend URLs
- [ ] `ENVIRONMENT` = `production`
- [ ] `PORT` = `8000`

---

## 🔧 Fix Login Issues

### **Problem: Login Not Working**

**Possible Causes:**
1. Backend not running
2. Wrong API URL in frontend
3. CORS blocking requests
4. Database connection issue
5. JWT_SECRET_KEY not set

**Fix:**
1. Check backend health: `https://insightsheet-production.up.railway.app/api/health`
2. Check Vercel `VITE_API_URL`: Should be `https://insightsheet-production.up.railway.app`
3. Check Railway `CORS_ORIGINS`: Should include `https://insight.meldra.ai`
4. Check Railway logs for errors
5. Test login endpoint directly (see Step 4)

---

## 🔧 Fix Blank Pages

### **Problem: Pages Are Blank**

**Possible Causes:**
1. Backend API calls failing
2. CORS blocking requests
3. Backend not responding
4. Frontend not connecting to backend

**Fix:**
1. Open browser console (F12) on blank page
2. Check for errors:
   - `Failed to fetch` → Backend not reachable
   - `CORS error` → Update CORS_ORIGINS
   - `Network error` → Check VITE_API_URL
3. Check Network tab:
   - Are API calls being made?
   - What's the response?
   - Any 404 or 500 errors?

---

## 🎯 Quick Diagnostic Steps

### **1. Test Backend Directly:**

```bash
# Health check
curl https://insightsheet-production.up.railway.app/api/health

# Should return: {"status": "healthy"}
```

### **2. Test from Browser Console:**

```javascript
// Check API URL
console.log(import.meta.env.VITE_API_URL);

// Should show: https://insightsheet-production.up.railway.app
```

### **3. Test Login Endpoint:**

```javascript
fetch('https://insightsheet-production.up.railway.app/api/auth/login', {
  method: 'POST',
  headers: {'Content-Type': 'application/json'},
  body: JSON.stringify({email: 'test@test.com', password: 'test'})
})
.then(r => r.json())
.then(console.log)
.catch(console.error);
```

---

## 📋 Complete Checklist

- [ ] Backend health endpoint works
- [ ] Vercel `VITE_API_URL` = `https://insightsheet-production.up.railway.app`
- [ ] Railway `CORS_ORIGINS` includes `https://insight.meldra.ai`
- [ ] All Railway environment variables are set
- [ ] Backend logs show no errors
- [ ] Browser console shows no CORS errors
- [ ] API calls are being made (check Network tab)
- [ ] Login endpoint responds (even if with error)

---

## 🆘 Common Issues & Fixes

### **Issue 1: "Failed to fetch"**

**Cause:** Backend not reachable or wrong URL

**Fix:**
1. Check `VITE_API_URL` in Vercel
2. Test backend health endpoint directly
3. Check Railway deployment status

---

### **Issue 2: CORS Error**

**Cause:** Frontend URL not in CORS_ORIGINS

**Fix:**
1. Railway → Variables → `CORS_ORIGINS`
2. Add: `https://insight.meldra.ai`
3. Save and wait for restart

---

### **Issue 3: Login Returns 500 Error**

**Cause:** Database connection issue or missing env vars

**Fix:**
1. Check Railway logs
2. Verify `DATABASE_URL` is correct
3. Verify `JWT_SECRET_KEY` is set

---

### **Issue 4: Pages Still Blank**

**Cause:** API calls failing silently

**Fix:**
1. Open browser console (F12)
2. Check for errors
3. Check Network tab for failed requests
4. Verify backend is responding

---

## 🎯 Next Steps

1. **Test backend health** → `https://insightsheet-production.up.railway.app/api/health`
2. **Check Vercel `VITE_API_URL`** → Should be Railway URL
3. **Check Railway `CORS_ORIGINS`** → Should include frontend URL
4. **Open browser console** → Check for errors
5. **Test login endpoint** → See if backend responds

**After fixing these, pages should work and login should function!** 🚀
