# 🚀 Backend Deployment - Quick Checklist

## ✅ You're Ready! (You're on Railway Plans page)

Since you're already on Railway, here's what to do:

---

## 📋 Step-by-Step Deployment

### **Step 1: Create New Project**

1. **Go to Railway Dashboard** (you're already there!)
2. Click **"New Project"** button (top right or main dashboard)
3. Select **"Deploy from GitHub repo"**
4. Find and select: `SumitAG008/insightsheet`
5. Click **"Deploy Now"**

**Railway will start building automatically!** ⏳

---

### **Step 2: Configure Backend Settings**

After deployment starts:

1. **Click on your service** (the box that appeared)
2. Click **"Settings"** tab (top menu)
3. Scroll to **"Deploy"** section
4. Set these values:

   - **Root Directory:** `backend` ← Type this!
   - **Start Command:** `uvicorn app.main:app --host 0.0.0.0 --port $PORT` ← Copy this!

5. Click **"Save"**
6. Railway will restart with new settings

---

### **Step 3: Add Environment Variables**

1. Click **"Variables"** tab (top menu)
2. Click **"Raw Editor"** button (top right)
3. **Paste this** (replace values where needed):

```env
DATABASE_URL=postgresql://neondb_owner:npg_fDwMP0Rk2vAe@ep-small-dream-abw9afwj-pooler.eu-west-2.aws.neon.tech/neondb?sslmode=require
OPENAI_API_KEY=sk-YOUR-ACTUAL-KEY-HERE
JWT_SECRET_KEY=YOUR-RANDOM-SECRET-HERE
CORS_ORIGINS=http://localhost:5173,http://localhost:3000,https://meldra.ai,https://insight.meldra.ai,https://insightsheet-jpci.vercel.app
ENVIRONMENT=production
PORT=8000
```

**Important Replacements:**
- `sk-YOUR-ACTUAL-KEY-HERE` → Your real OpenAI API key (get from [platform.openai.com/api-keys](https://platform.openai.com/api-keys))
- `YOUR-RANDOM-SECRET-HERE` → Generate random secret (see below)

4. Click **"Save"**
5. Railway will restart with new variables

---

### **Step 4: Generate Backend URL**

1. Click **"Settings"** tab
2. Scroll to **"Domains"** section
3. Click **"Generate Domain"** button
4. **Copy the URL** (e.g., `https://your-backend.up.railway.app`)

**This is your backend URL!** 🎉

---

### **Step 5: Update Frontend (Vercel)**

1. Go to **Vercel Dashboard** → Your Project
2. Click **"Settings"** → **"Environment Variables"**
3. Find `VITE_API_URL`
4. **Update value** to your Railway URL: `https://your-backend.up.railway.app`
5. Click **"Save"**
6. Vercel will auto-redeploy

---

## 🔑 How to Get Missing Values

### **1. OpenAI API Key**

1. Go to: [platform.openai.com/api-keys](https://platform.openai.com/api-keys)
2. Sign in (or create account)
3. Click **"Create new secret key"**
4. **Copy the key** (starts with `sk-`)
5. **Paste it** in Railway Variables as `OPENAI_API_KEY`

---

### **2. JWT Secret Key (Random String)**

Generate a random secret:

**Option A: Python (in terminal)**
```bash
python -c "import secrets; print(secrets.token_urlsafe(32))"
```

**Option B: Online**
- Go to: [randomkeygen.com](https://randomkeygen.com/)
- Copy any "CodeIgniter Encryption Keys" (256-bit)
- Use that as your `JWT_SECRET_KEY`

**Option C: Quick Random**
- Just use: `meldra-secret-key-2024-$(date +%s)` (or any long random string)

---

## ✅ Testing After Deployment

### **1. Health Check**

Visit: `https://your-backend.up.railway.app/api/health`

Should return: `{"status": "healthy"}`

---

### **2. API Documentation**

Visit: `https://your-backend.up.railway.app/docs`

Should show FastAPI Swagger UI with all endpoints

---

### **3. Test from Frontend**

1. Visit: `https://insight.meldra.ai`
2. Try using:
   - Analyzer (upload file)
   - P&L Builder (generate statement)
   - AI Assistant (if data uploaded)
3. Check browser console (F12) for errors

---

## 🆘 Troubleshooting

### **Build Fails**

**Check:**
- Railway → Deployments → Click on failed deployment → View logs
- Make sure `Root Directory` is set to `backend`
- Verify `requirements.txt` exists in `backend/` folder

---

### **Backend Won't Start**

**Check:**
- Railway → Your Service → Logs tab
- Verify all environment variables are set
- Check `DATABASE_URL` is correct
- Make sure `OPENAI_API_KEY` is valid

---

### **CORS Errors**

**Fix:**
- Railway → Variables → Update `CORS_ORIGINS`
- Add: `https://insight.meldra.ai`
- Format: `http://localhost:5173,http://localhost:3000,https://meldra.ai,https://insight.meldra.ai`
- Save and redeploy

---

### **Frontend Can't Connect**

**Check:**
1. Vercel → Environment Variables → `VITE_API_URL`
2. Should be: `https://your-backend.up.railway.app` (not `localhost`)
3. Redeploy Vercel after updating

---

## 📊 Deployment Checklist

- [ ] Created Railway project
- [ ] Deployed from GitHub repo
- [ ] Set Root Directory: `backend`
- [ ] Set Start Command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
- [ ] Added all environment variables
- [ ] Generated Railway domain
- [ ] Updated Vercel `VITE_API_URL`
- [ ] Tested health endpoint
- [ ] Tested from frontend

---

## 🎯 Quick Summary

1. **Railway:** New Project → Deploy from GitHub → `insightsheet`
2. **Settings:** Root Directory = `backend`, Start Command = `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
3. **Variables:** Add all environment variables (Raw Editor)
4. **Domain:** Generate domain → Copy URL
5. **Vercel:** Update `VITE_API_URL` → Done!

---

## 💡 Pro Tips

- **Trial Plan:** You have $5 free credit - enough for testing!
- **Logs:** Always check Railway logs if something fails
- **Health Check:** Use `/api/health` to verify backend is running
- **CORS:** Make sure all frontend URLs are in `CORS_ORIGINS`

---

**You're all set! Start with Step 1 above.** 🚀

**Need help? Check Railway logs or see `HOW_TO_DEPLOY_BACKEND.md` for detailed guide.**
