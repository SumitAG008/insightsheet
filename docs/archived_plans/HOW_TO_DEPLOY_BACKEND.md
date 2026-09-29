# 🚀 How to Deploy Your Backend - Step by Step

## 🎯 What You're Doing

You're putting your **FastAPI backend** on the internet so your frontend (on Vercel) can talk to it.

**Think of it like this:**
- **Frontend (Vercel):** Your website that users see
- **Backend (Railway/Render):** Your server that does the work (AI, file processing, database)

---

## 📋 What You Need First

✅ **You already have:**
- Backend code (in `backend/` folder)
- GitHub repository (`SumitAG008/insightsheet`)
- Database (Neon PostgreSQL)

🔑 **You need to get:**
- OpenAI API Key: [platform.openai.com/api-keys](https://platform.openai.com/api-keys)

---

## 🚂 Method 1: Railway (EASIEST - Recommended)

### **Step 1: Go to Railway**

1. Open: [railway.app](https://railway.app)
2. Click **"Login with GitHub"** (top right)
3. Authorize Railway to access your GitHub

---

### **Step 2: Create New Project**

1. Click **"New Project"** button (big button in dashboard)
2. Select **"Deploy from GitHub repo"**
3. Find your repository: `SumitAG008/insightsheet`
4. Click **"Deploy Now"**

**Railway will start building automatically!**

---

### **Step 3: Tell Railway Where Your Backend Is**

Railway might not know your backend is in the `backend/` folder. Fix this:

1. **Click on your service** (the box that appeared)
2. Click **"Settings"** tab (top menu)
3. Scroll to **"Deploy"** section
4. Set:
   - **Root Directory:** `backend` ← Type this!
   - **Start Command:** `uvicorn app.main:app --host 0.0.0.0 --port $PORT` ← Copy this!

5. Click **"Save"**

---

### **Step 4: Add Your Secrets (Environment Variables)**

Your backend needs passwords and API keys. Add them:

1. Click **"Variables"** tab (top menu)
2. Click **"Raw Editor"** button (top right)
3. **Paste this** (replace the values):

```env
DATABASE_URL=postgresql://USER:PASSWORD@YOUR-NEON-HOST/neondb?sslmode=require
OPENAI_API_KEY=sk-YOUR-ACTUAL-KEY-HERE
JWT_SECRET_KEY=generate-a-random-string-here
CORS_ORIGINS=http://localhost:5173,http://localhost:3000,https://meldra.ai,https://your-frontend.vercel.app
ENVIRONMENT=production
PORT=8000
```

**Important:**
- Replace `sk-YOUR-ACTUAL-KEY-HERE` with your real OpenAI key
- Replace `generate-a-random-string-here` with a random secret (see below)
- Replace `your-frontend.vercel.app` with your actual Vercel URL

4. Click **"Save"**
5. Railway will restart with new settings

---

### **Step 5: Get Your Backend URL**

1. Click **"Settings"** tab
2. Scroll to **"Domains"** section
3. Click **"Generate Domain"** button
4. **Copy the URL** (e.g., `https://your-backend.up.railway.app`)

**This is your backend URL!** 🎉

---

### **Step 6: Update Your Frontend**

Now tell your frontend where the backend is:

1. Go to **Vercel Dashboard** → Your Project
2. Click **"Settings"** → **"Environment Variables"**
3. Find `VITE_API_URL`
4. Change value to your Railway URL: `https://your-backend.up.railway.app`
5. Click **"Save"**
6. Vercel will auto-redeploy

---

## 🎨 Method 2: Render (Alternative)

### **Step 1: Sign Up**

1. Go to: [render.com](https://render.com)
2. Click **"Get Started for Free"**
3. Click **"Sign up with GitHub"**
4. Authorize Render

---

### **Step 2: Create Web Service**

1. Click **"New +"** button (top right)
2. Select **"Web Service"**
3. Click **"Connect account"** (if not connected)
4. Select: `SumitAG008/insightsheet`
5. Click **"Connect"**

---

### **Step 3: Fill in the Form**

Fill in these fields:

| Field | Value |
|-------|-------|
| **Name** | `meldra-backend` |
| **Region** | Choose closest to you |
| **Branch** | `main` |
| **Root Directory** | `backend` |
| **Runtime** | `Python 3` |
| **Build Command** | `pip install -r requirements.txt` |
| **Start Command** | `uvicorn app.main:app --host 0.0.0.0 --port $PORT` |

---

### **Step 4: Add Environment Variables**

Scroll down to **"Environment Variables"** section.

Click **"Add Environment Variable"** for each:

1. **Key:** `DATABASE_URL`
   **Value:** `postgresql://USER:PASSWORD@YOUR-NEON-HOST/neondb?sslmode=require`

2. **Key:** `OPENAI_API_KEY`
   **Value:** `sk-your-actual-key-here`

3. **Key:** `JWT_SECRET_KEY`
   **Value:** `your-random-secret-here`

4. **Key:** `CORS_ORIGINS`
   **Value:** `http://localhost:5173,http://localhost:3000,https://meldra.ai,https://your-frontend.vercel.app`

5. **Key:** `ENVIRONMENT`
   **Value:** `production`

6. **Key:** `PORT`
   **Value:** `8000`

---

### **Step 5: Deploy**

1. Scroll to bottom
2. Click **"Create Web Service"**
3. Wait 2-5 minutes for deployment
4. Your URL will be: `https://meldra-backend.onrender.com`

---

### **Step 6: Update Frontend**

Same as Railway - update `VITE_API_URL` in Vercel to your Render URL.

---

## 🔑 How to Get Values

### **1. DATABASE_URL** ✅
You already have this! It's your Neon PostgreSQL connection string.

### **2. OPENAI_API_KEY** 🔑

1. Go to: [platform.openai.com/api-keys](https://platform.openai.com/api-keys)
2. Sign in (or create account)
3. Click **"Create new secret key"**
4. **Copy the key** (starts with `sk-`)
5. **Paste it** in your environment variables

### **3. JWT_SECRET_KEY** 🔐

Generate a random secret:

**Option A: Python (in terminal)**
```bash
python -c "import secrets; print(secrets.token_urlsafe(32))"
```

**Option B: Online**
- Go to: [randomkeygen.com](https://randomkeygen.com/)
- Copy any "CodeIgniter Encryption Keys" (256-bit)
- Use that as your secret

---

## ✅ Testing

After deployment, test your backend:

1. **Health Check:**
   - Visit: `https://your-backend.railway.app/health`
   - Should show: `{"status": "healthy"}`

2. **API Documentation:**
   - Visit: `https://your-backend.railway.app/docs`
   - Should show FastAPI Swagger UI

3. **Test from Frontend:**
   - Open your Vercel frontend
   - Try to login or use features
   - Check browser console for errors

---

## 🆘 Common Problems

### **Problem: Build Fails**
**Solution:**
- Check Railway/Render logs
- Make sure `Root Directory` is set to `backend`
- Verify `requirements.txt` exists

### **Problem: Backend Won't Start**
**Solution:**
- Check all environment variables are set
- Verify `DATABASE_URL` is correct (remove `&channel_binding=require` if present)
- Check logs for error messages

### **Problem: CORS Errors**
**Solution:**
- Add your frontend URL to `CORS_ORIGINS`
- Format: `https://your-frontend.vercel.app`
- Redeploy backend

---

## 📚 Summary

**Railway (Easiest):**
1. Sign up → New Project → Deploy from GitHub
2. Set Root Directory: `backend`
3. Add environment variables (Raw Editor)
4. Get URL
5. Update frontend

**Render (Alternative):**
1. Sign up → New Web Service
2. Configure settings
3. Add environment variables (one by one)
4. Deploy
5. Get URL
6. Update frontend

---

## 🎯 Quick Start (Railway)

1. [railway.app](https://railway.app) → Login with GitHub
2. New Project → Deploy from GitHub → Select `insightsheet`
3. Settings → Root Directory: `backend`
4. Variables → Raw Editor → Paste environment variables
5. Settings → Generate Domain → Copy URL
6. Vercel → Update `VITE_API_URL` → Done!

---

**I recommend Railway - it's the easiest!** 🚂

**Need help? Check the logs in Railway/Render dashboard!**
