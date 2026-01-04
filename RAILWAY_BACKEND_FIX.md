# 🔧 Fix Railway Backend Deployment

## ❌ Current Problem

Railway is trying to deploy the **frontend** (Node.js/Vite) instead of the **backend** (Python/FastAPI).

**Error:** `npm ci` failing because it's trying to build the frontend.

---

## ✅ Solution: Configure Railway for Backend

### **Step 1: Set Root Directory**

1. In Railway Dashboard → Click on your service **"insightsheet"**
2. Click **"Settings"** tab (top menu)
3. Scroll to **"Deploy"** section
4. Set:
   - **Root Directory:** `backend` ← **This is critical!**
5. Click **"Save"**

**This tells Railway to look in the `backend/` folder, not the root!**

---

### **Step 2: Set Start Command**

1. Still in **Settings** → **Deploy** section
2. Set:
   - **Start Command:** `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
3. Click **"Save"**

---

### **Step 3: Set Build Command (Optional)**

Railway should auto-detect Python, but if needed:

1. In **Settings** → **Deploy** section
2. Set:
   - **Build Command:** `pip install -r requirements.txt`
3. Click **"Save"**

---

### **Step 4: Add Environment Variables**

1. Click **"Variables"** tab (top menu)
2. Click **"Raw Editor"** button (top right)
3. **Paste this:**

```env
DATABASE_URL=postgresql://neondb_owner:npg_fDwMP0Rk2vAe@ep-small-dream-abw9afwj-pooler.eu-west-2.aws.neon.tech/neondb?sslmode=require
OPENAI_API_KEY=sk-YOUR-ACTUAL-KEY-HERE
JWT_SECRET_KEY=YOUR-RANDOM-SECRET-HERE
CORS_ORIGINS=http://localhost:5173,http://localhost:3000,https://meldra.ai,https://insight.meldra.ai,https://insightsheet-jpci.vercel.app
ENVIRONMENT=production
PORT=8000
```

4. **Replace:**
   - `sk-YOUR-ACTUAL-KEY-HERE` → Your OpenAI API key
   - `YOUR-RANDOM-SECRET-HERE` → Random secret (generate with: `python -c "import secrets; print(secrets.token_urlsafe(32))"`)

5. Click **"Save"**

---

### **Step 5: Redeploy**

1. Click **"Deployments"** tab
2. Click **"..."** menu on latest deployment
3. Click **"Redeploy"**
4. Or Railway will auto-redeploy after settings change

---

## 🎯 What Should Happen

After setting Root Directory to `backend`:

1. Railway will detect **Python** (not Node.js)
2. It will use `requirements.txt` (not `package.json`)
3. It will run `uvicorn` (not `npm`)
4. Build should succeed! ✅

---

## 📋 Quick Checklist

- [ ] Root Directory = `backend`
- [ ] Start Command = `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
- [ ] Build Command = `pip install -r requirements.txt` (optional)
- [ ] Environment variables added
- [ ] Redeployed

---

## 🔍 Verify It's Working

After redeploy, check:

1. **Build Logs:**
   - Should show: "Detected Python"
   - Should show: "Installing dependencies from requirements.txt"
   - Should NOT show: "Detected Node" or "npm ci"

2. **Deploy Logs:**
   - Should show: "Starting uvicorn"
   - Should show: "Application startup complete"

3. **Health Check:**
   - Visit: `https://your-backend.up.railway.app/api/health`
   - Should return: `{"status": "healthy"}`

---

## 🆘 If Still Failing

**Check:**
1. Root Directory is exactly `backend` (not `./backend` or `/backend`)
2. `requirements.txt` exists in `backend/` folder
3. `app/main.py` exists in `backend/app/` folder
4. All environment variables are set correctly

**Check Logs:**
- Railway → Your Service → Logs tab
- Look for Python errors or missing dependencies

---

**The key fix: Set Root Directory to `backend` so Railway knows to deploy Python, not Node.js!** 🐍
