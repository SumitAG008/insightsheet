# 🚀 Complete Backend Deployment Guide

## 🎯 Overview

Your **FastAPI backend** needs to be deployed separately from your frontend. Here's how to do it step-by-step.

---

## 📋 What You Need

1. **Backend Code** ✅ (You have this)
2. **GitHub Repository** ✅ (You have this: `SumitAG008/insightsheet`)
3. **Database** ✅ (You have Neon PostgreSQL)
4. **OpenAI API Key** (Get from [platform.openai.com](https://platform.openai.com/api-keys))
5. **Deployment Platform** (Railway or Render - both free)

---

## 🚂 Option 1: Railway (Easiest - Recommended)

### **Why Railway?**
- ✅ Auto-detects Python/FastAPI
- ✅ Free tier available
- ✅ Auto-deploys from GitHub
- ✅ Simple setup
- ✅ Built-in PostgreSQL (but you can use Neon)

---

### **Step 1: Sign Up for Railway**

1. **Go to:** [railway.app](https://railway.app)
2. **Click:** "Start a New Project" or "Login"
3. **Sign up with GitHub:**
   - Click "Login with GitHub"
   - Authorize Railway
   - Grant access to your repositories

---

### **Step 2: Create New Project**

1. **In Railway Dashboard:**
   - Click **"New Project"** button (top right)
   - Select **"Deploy from GitHub repo"**

2. **Select Repository:**
   - Find: `SumitAG008/insightsheet`
   - Click **"Deploy Now"**

3. **Railway will:**
   - Detect it's a Python project
   - Start building automatically

---

### **Step 3: Configure Service**

Railway auto-detects, but verify settings:

1. **Click on your service** (the deployed app)
2. **Go to Settings tab:**
   - **Root Directory:** `backend` ✅
   - **Build Command:** `pip install -r requirements.txt` ✅
   - **Start Command:** `uvicorn app.main:app --host 0.0.0.0 --port $PORT` ✅

**If not auto-detected:**
1. Go to **Settings** → **Deploy**
2. Set **Root Directory:** `backend`
3. Set **Start Command:** `uvicorn app.main:app --host 0.0.0.0 --port $PORT`

---

### **Step 4: Add Environment Variables**

1. **Go to Variables tab** (in your service)
2. **Click "Raw Editor"** (to import all at once)
3. **Paste your backend .env contents:**

```env
DATABASE_URL=postgresql://neondb_owner:npg_fDwMP0Rk2vAe@ep-small-dream-abw9afwj-pooler.eu-west-2.aws.neon.tech/neondb?sslmode=require
OPENAI_API_KEY=sk-your-openai-api-key-here
JWT_SECRET_KEY=your-super-secret-jwt-key-change-this
CORS_ORIGINS=http://localhost:5173,http://localhost:3000,https://meldra.ai,https://your-vercel-url.vercel.app
ENVIRONMENT=production
PORT=8000
```

4. **Click "Save"**
5. **Railway will restart** with new variables

**Important:**
- Replace `sk-your-openai-api-key-here` with your actual OpenAI key
- Replace `your-super-secret-jwt-key-change-this` with a random secret
- Add your Vercel frontend URL to `CORS_ORIGINS`

---

### **Step 5: Get Your Backend URL**

1. **Go to Settings tab**
2. **Find "Public Domain"** or **"Generate Domain"**
3. **Click "Generate Domain"**
4. **Copy the URL** (e.g., `https://your-backend.railway.app`)

**This is your backend URL!** 🎉

---

### **Step 6: Update Frontend**

1. **Go to Vercel Dashboard**
2. **Your Project** → **Settings** → **Environment Variables**
3. **Update `VITE_API_URL`:**
   - Change from: `http://localhost:8001`
   - Change to: `https://your-backend.railway.app`
4. **Redeploy** (Vercel will auto-redeploy)

---

## 🎨 Option 2: Render (Alternative)

### **Why Render?**
- ✅ Free tier available
- ✅ Good Python/FastAPI support
- ✅ Auto-deploys from GitHub
- ⚠️ Slightly more setup than Railway

---

### **Step 1: Sign Up for Render**

1. **Go to:** [render.com](https://render.com)
2. **Click:** "Get Started for Free"
3. **Sign up with GitHub:**
   - Click "Sign up with GitHub"
   - Authorize Render
   - Grant access to repositories

---

### **Step 2: Create New Web Service**

1. **In Render Dashboard:**
   - Click **"New +"** button
   - Select **"Web Service"**

2. **Connect Repository:**
   - Click **"Connect account"** (if not connected)
   - Select: `SumitAG008/insightsheet`
   - Click **"Connect"**

---

### **Step 3: Configure Service**

Fill in the form:

| Setting | Value |
|---------|-------|
| **Name** | `meldra-backend` |
| **Region** | Choose closest (e.g., `Oregon (US West)`) |
| **Branch** | `main` |
| **Root Directory** | `backend` |
| **Runtime** | `Python 3` |
| **Build Command** | `pip install -r requirements.txt` |
| **Start Command** | `uvicorn app.main:app --host 0.0.0.0 --port $PORT` |

---

### **Step 4: Add Environment Variables**

1. **Scroll to "Environment Variables"** section
2. **Click "Add Environment Variable"** for each:

| Key | Value |
|-----|-------|
| `DATABASE_URL` | `postgresql://neondb_owner:npg_fDwMP0Rk2vAe@ep-small-dream-abw9afwj-pooler.eu-west-2.aws.neon.tech/neondb?sslmode=require` |
| `OPENAI_API_KEY` | `sk-your-openai-api-key-here` |
| `JWT_SECRET_KEY` | `your-super-secret-jwt-key` |
| `CORS_ORIGINS` | `http://localhost:5173,http://localhost:3000,https://meldra.ai,https://your-vercel-url.vercel.app` |
| `ENVIRONMENT` | `production` |
| `PORT` | `8000` |

3. **Click "Create Web Service"**

---

### **Step 5: Get Your Backend URL**

1. **Wait for deployment** (2-5 minutes)
2. **Your backend URL** will be: `https://meldra-backend.onrender.com`
3. **Copy this URL**

---

### **Step 6: Update Frontend**

Same as Railway:
1. **Vercel Dashboard** → **Settings** → **Environment Variables**
2. **Update `VITE_API_URL`** to your Render URL
3. **Redeploy**

---

## 🔑 Getting Required Values

### **1. DATABASE_URL** ✅
You already have this:
```
postgresql://neondb_owner:npg_fDwMP0Rk2vAe@ep-small-dream-abw9afwj-pooler.eu-west-2.aws.neon.tech/neondb?sslmode=require
```

**Important:** Remove `&channel_binding=require` if present!

### **2. OPENAI_API_KEY** 🔑
1. Go to: [platform.openai.com/api-keys](https://platform.openai.com/api-keys)
2. Sign in or create account
3. Click **"Create new secret key"**
4. Copy the key (starts with `sk-`)
5. Paste in environment variables

### **3. JWT_SECRET_KEY** 🔐
Generate a random secret:

**Option A: Python**
```bash
python -c "import secrets; print(secrets.token_urlsafe(32))"
```

**Option B: Online**
- Go to: [randomkeygen.com](https://randomkeygen.com/)
- Use "CodeIgniter Encryption Keys" (256-bit)
- Copy one of the keys

---

## 📋 Quick Checklist

### **Before Deployment:**
- [ ] GitHub repository is up to date
- [ ] `backend/.env` file has correct values (local copy)
- [ ] OpenAI API key ready
- [ ] JWT secret key generated
- [ ] Database URL ready (Neon PostgreSQL)

### **During Deployment:**
- [ ] Sign up for Railway or Render
- [ ] Connect GitHub repository
- [ ] Configure service (root directory: `backend`)
- [ ] Add all environment variables
- [ ] Get backend URL

### **After Deployment:**
- [ ] Test backend URL: `https://your-backend.railway.app/health`
- [ ] Update frontend `VITE_API_URL` in Vercel
- [ ] Test frontend connection to backend
- [ ] Verify CORS is working

---

## 🧪 Testing Your Backend

### **1. Health Check**
Visit: `https://your-backend.railway.app/health`

Should return:
```json
{"status": "healthy"}
```

### **2. API Docs**
Visit: `https://your-backend.railway.app/docs`

Should show FastAPI Swagger UI with all endpoints.

### **3. Test from Frontend**
1. Open your Vercel frontend
2. Try to login or use any feature
3. Check browser console for errors
4. Check Network tab for API calls

---

## 🔧 Troubleshooting

### **Build Fails?**
- Check Railway/Render logs
- Verify `requirements.txt` is correct
- Check Python version (should be 3.11+)

### **Backend Not Starting?**
- Check environment variables are set
- Verify `DATABASE_URL` is correct
- Check `PORT` variable (should be `$PORT` or `8000`)

### **CORS Errors?**
- Add your frontend URL to `CORS_ORIGINS`
- Format: `https://your-frontend.vercel.app`
- Redeploy backend

### **Database Connection Errors?**
- Verify `DATABASE_URL` is correct
- Remove `&channel_binding=require` if present
- Check Neon database is running

---

## 📚 Summary

### **Railway (Recommended):**
1. Sign up → New Project → Deploy from GitHub
2. Set Root Directory: `backend`
3. Add environment variables (Raw Editor)
4. Get backend URL
5. Update frontend `VITE_API_URL`

### **Render (Alternative):**
1. Sign up → New Web Service
2. Connect GitHub repo
3. Configure settings (root: `backend`)
4. Add environment variables (one by one)
5. Get backend URL
6. Update frontend `VITE_API_URL`

---

## 🎯 Next Steps

1. **Choose platform:** Railway (easier) or Render
2. **Deploy backend** (follow steps above)
3. **Get backend URL**
4. **Update frontend** `VITE_API_URL` in Vercel
5. **Test everything!**

---

**I recommend Railway - it's the easiest!** 🚂
