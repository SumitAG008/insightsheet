# 🚀 Backend Deployment - Simple Steps

## 🎯 Quick Answer

Deploy your **FastAPI backend** to **Railway** (easiest) or **Render**. Here's how:

---

## 🚂 Railway (Easiest - 5 Steps)

### **Step 1: Sign Up**
1. Go to: [railway.app](https://railway.app)
2. Click "Login with GitHub"
3. Authorize Railway

### **Step 2: Deploy**
1. Click **"New Project"**
2. Select **"Deploy from GitHub repo"**
3. Choose: `SumitAG008/insightsheet`
4. Click **"Deploy Now"**

### **Step 3: Configure**
1. Click on your service
2. Go to **Settings** → **Deploy**
3. Set **Root Directory:** `backend`
4. Set **Start Command:** `uvicorn app.main:app --host 0.0.0.0 --port $PORT`

### **Step 4: Add Variables**
1. Go to **Variables** tab
2. Click **"Raw Editor"**
3. Paste:
   ```
   DATABASE_URL=postgresql://neondb_owner:npg_fDwMP0Rk2vAe@ep-small-dream-abw9afwj-pooler.eu-west-2.aws.neon.tech/neondb?sslmode=require
   OPENAI_API_KEY=sk-your-key-here
   JWT_SECRET_KEY=your-secret-key
   CORS_ORIGINS=http://localhost:5173,http://localhost:3000,https://meldra.ai,https://your-frontend.vercel.app
   ENVIRONMENT=production
   PORT=8000
   ```
4. Click **"Save"**

### **Step 5: Get URL**
1. Go to **Settings**
2. Click **"Generate Domain"**
3. Copy URL (e.g., `https://your-backend.railway.app`)

**Done!** Your backend is live! 🎉

---

## 🎨 Render (Alternative - 6 Steps)

### **Step 1: Sign Up**
1. Go to: [render.com](https://render.com)
2. Click "Sign up with GitHub"
3. Authorize Render

### **Step 2: Create Service**
1. Click **"New +"** → **"Web Service"**
2. Connect: `SumitAG008/insightsheet`

### **Step 3: Configure**
- **Name:** `meldra-backend`
- **Root Directory:** `backend`
- **Build Command:** `pip install -r requirements.txt`
- **Start Command:** `uvicorn app.main:app --host 0.0.0.0 --port $PORT`

### **Step 4: Add Variables**
Click "Add Environment Variable" for each:
- `DATABASE_URL` = `postgresql://...`
- `OPENAI_API_KEY` = `sk-...`
- `JWT_SECRET_KEY` = `...`
- `CORS_ORIGINS` = `http://localhost:5173,http://localhost:3000,https://meldra.ai,https://your-frontend.vercel.app`
- `ENVIRONMENT` = `production`
- `PORT` = `8000`

### **Step 5: Deploy**
1. Click **"Create Web Service"**
2. Wait 2-5 minutes

### **Step 6: Get URL**
Your URL: `https://meldra-backend.onrender.com`

**Done!** 🎉

---

## 🔄 Update Frontend

After backend is deployed:

1. **Go to Vercel Dashboard**
2. **Your Project** → **Settings** → **Environment Variables**
3. **Update `VITE_API_URL`:**
   - From: `http://localhost:8001`
   - To: `https://your-backend.railway.app` (or Render URL)
4. **Redeploy** (automatic)

---

## ✅ Test

1. **Backend Health:** `https://your-backend.railway.app/health`
2. **API Docs:** `https://your-backend.railway.app/docs`
3. **Frontend:** Try using your app!

---

## 🔑 Get Values

- **DATABASE_URL:** ✅ You have this
- **OPENAI_API_KEY:** Get from [platform.openai.com/api-keys](https://platform.openai.com/api-keys)
- **JWT_SECRET_KEY:** Generate with: `python -c "import secrets; print(secrets.token_urlsafe(32))"`

---

**I recommend Railway - it's easier!** 🚂
