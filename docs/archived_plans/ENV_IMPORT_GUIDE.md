# 📝 Complete .env Import Guide - Frontend & Backend

## 🎯 Overview

You need **TWO separate .env files** for frontend and backend, and they're imported **differently**:

| File | Location | Where to Import | Platform |
|------|----------|-----------------|----------|
| **Frontend .env** | `/.env` | Vercel Dashboard | Vercel (Frontend) |
| **Backend .env** | `/backend/.env` | Railway/Render Dashboard | Railway/Render (Backend) |

---

## 🎨 Frontend .env (Vercel)

### **File Location:**
```
C:\Users\sumit\Documents\Insightlite\.env
```

### **Current Contents:**
```env
VITE_API_URL=http://localhost:8001
VITE_APP_NAME=InsightSheet-lite
VITE_APP_DOMAIN=meldra.ai
```

### **How to Import in Vercel:**

#### **Method 1: Import .env File (Easiest)**

1. **On Vercel configuration page:**
   - Scroll to **"Environment Variables"** section
   - Click **"Import .env"** button
   - Navigate to: `C:\Users\sumit\Documents\Insightlite\.env`
   - Select the file
   - Click **"Open"**
   - ✅ All variables imported!

2. **Verify:**
   - You should see:
     - `VITE_API_URL` = `http://localhost:8001`
     - `VITE_APP_NAME` = `InsightSheet-lite`
     - `VITE_APP_DOMAIN` = `meldra.ai`

#### **Method 2: Paste Contents**

1. **Copy your .env contents:**
   ```
   VITE_API_URL=http://localhost:8001
   VITE_APP_NAME=InsightSheet-lite
   VITE_APP_DOMAIN=meldra.ai
   ```

2. **In Vercel:**
   - Click in the Environment Variables text area
   - Paste the contents
   - Vercel will parse automatically

#### **Method 3: Add Manually**

1. **Click "+ Add More"** for each variable:
   - **Key:** `VITE_API_URL`, **Value:** `http://localhost:8001`
   - **Key:** `VITE_APP_NAME`, **Value:** `InsightSheet-lite`
   - **Key:** `VITE_APP_DOMAIN`, **Value:** `meldra.ai`

2. **Select environments:** Production ✅, Preview ✅, Development ✅

---

## 🔧 Backend .env (Railway/Render)

### **File Location:**
```
C:\Users\sumit\Documents\Insightlite\backend\.env
```

### **Contents:**
```env
DATABASE_URL=postgresql://neondb_owner:npg_fDwMP0Rk2vAe@ep-small-dream-abw9afwj-pooler.eu-west-2.aws.neon.tech/neondb?sslmode=require
OPENAI_API_KEY=sk-your-openai-api-key-here
JWT_SECRET_KEY=your-super-secret-jwt-key-change-this
CORS_ORIGINS=http://localhost:5173,http://localhost:3000,https://meldra.ai
ENVIRONMENT=development
PORT=8000
```

### **How to Import in Railway:**

1. **Go to Railway Dashboard:**
   - [railway.app/dashboard](https://railway.app/dashboard)
   - Select your backend project

2. **Go to Variables:**
   - Click **"Variables"** tab
   - Click **"Raw Editor"** or **"New Variable"**

3. **Import Options:**

   #### **Option A: Raw Editor (Import All at Once)**
   - Click **"Raw Editor"**
   - Paste your `.env` file contents:
     ```
     DATABASE_URL=postgresql://neondb_owner:npg_fDwMP0Rk2vAe@ep-small-dream-abw9afwj-pooler.eu-west-2.aws.neon.tech/neondb?sslmode=require
     OPENAI_API_KEY=sk-your-key-here
     JWT_SECRET_KEY=your-secret-key
     CORS_ORIGINS=http://localhost:5173,http://localhost:3000,https://meldra.ai
     ENVIRONMENT=production
     PORT=8000
     ```
   - Click **"Save"**
   - ✅ All variables imported!

   #### **Option B: Add Individually**
   - Click **"New Variable"** for each:
     - **Name:** `DATABASE_URL`, **Value:** `postgresql://...`
     - **Name:** `OPENAI_API_KEY`, **Value:** `sk-...`
     - **Name:** `JWT_SECRET_KEY`, **Value:** `...`
     - **Name:** `CORS_ORIGINS`, **Value:** `http://localhost:5173,http://localhost:3000,https://meldra.ai`
     - **Name:** `ENVIRONMENT`, **Value:** `production`
     - **Name:** `PORT`, **Value:** `8000`

### **How to Import in Render:**

1. **Go to Render Dashboard:**
   - [dashboard.render.com](https://dashboard.render.com)
   - Select your backend service

2. **Go to Environment:**
   - Click **"Environment"** tab
   - Scroll to **"Environment Variables"**

3. **Add Variables:**
   - Click **"Add Environment Variable"** for each:
     - **Key:** `DATABASE_URL`, **Value:** `postgresql://...`
     - **Key:** `OPENAI_API_KEY`, **Value:** `sk-...`
     - **Key:** `JWT_SECRET_KEY`, **Value:** `...`
     - **Key:** `CORS_ORIGINS`, **Value:** `http://localhost:5173,http://localhost:3000,https://meldra.ai`
     - **Key:** `ENVIRONMENT`, **Value:** `production`
     - **Key:** `PORT`, **Value:** `8000`

   **Note:** Render doesn't have bulk import, so add them one by one.

---

## 🔑 Getting Required Values

### **1. DATABASE_URL** ✅
You already have this:
```
postgresql://neondb_owner:npg_fDwMP0Rk2vAe@ep-small-dream-abw9afwj-pooler.eu-west-2.aws.neon.tech/neondb?sslmode=require
```

### **2. OPENAI_API_KEY** 🔑
1. Go to: [platform.openai.com/api-keys](https://platform.openai.com/api-keys)
2. Sign in or create account
3. Click **"Create new secret key"**
4. Copy the key (starts with `sk-`)
5. Paste in `.env` file

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

**Option C: PowerShell**
```powershell
-join ((48..57) + (65..90) + (97..122) | Get-Random -Count 32 | ForEach-Object {[char]$_})
```

---

## 📋 Quick Checklist

### **Frontend (Vercel):**
- [x] `.env` file exists at root
- [ ] Import in Vercel using "Import .env" button
- [ ] Verify all 3 variables imported
- [ ] Update `VITE_API_URL` to backend URL after backend deployment

### **Backend (Railway/Render):**
- [ ] Create `backend/.env` file
- [ ] Fill in `DATABASE_URL` (already have)
- [ ] Get `OPENAI_API_KEY` from OpenAI
- [ ] Generate `JWT_SECRET_KEY`
- [ ] Set `CORS_ORIGINS`
- [ ] Import in Railway (Raw Editor) or Render (one by one)

---

## 🚀 Step-by-Step: Import Both

### **Step 1: Frontend (Vercel) - NOW**

1. **On Vercel configuration page:**
   - Click **"Import .env"** button
   - Select: `C:\Users\sumit\Documents\Insightlite\.env`
   - ✅ Imported!

2. **Click "Deploy"** 🚀

### **Step 2: Backend (Railway/Render) - After Backend Setup**

1. **Create `backend/.env` file:**
   - I've created it for you at: `backend/.env`
   - Fill in `OPENAI_API_KEY` and `JWT_SECRET_KEY`

2. **Deploy backend to Railway/Render:**
   - Follow deployment guide
   - Import environment variables in Railway/Render dashboard

3. **Update frontend `VITE_API_URL`:**
   - Go to Vercel → Project → Settings → Environment Variables
   - Update `VITE_API_URL` to your backend URL
   - Redeploy

---

## ⚠️ Important Notes

### **Frontend .env:**
- ✅ Safe to import (only public URLs)
- ✅ Can be in Git (but `.env` is in `.gitignore`)
- ✅ Variables must start with `VITE_`

### **Backend .env:**
- ❌ **NEVER commit to Git** (contains secrets)
- ✅ Already in `.gitignore`
- ✅ Keep secure and private

### **Import Separately:**
- **Frontend:** Import in Vercel (frontend deployment)
- **Backend:** Import in Railway/Render (backend deployment)
- **Cannot import both at once** - they're on different platforms

---

## 📚 Summary

| Platform | File | Import Method |
|----------|------|---------------|
| **Vercel** | `/.env` | Click "Import .env" button |
| **Railway** | `/backend/.env` | Raw Editor (paste all at once) |
| **Render** | `/backend/.env` | Add variables one by one |

**For Vercel right now:**
1. Click **"Import .env"**
2. Select your `.env` file
3. Deploy! 🚀

**For Backend later:**
1. Fill in `backend/.env` with your values
2. Import in Railway/Render when deploying

---

**I've created `backend/.env` for you! Just fill in `OPENAI_API_KEY` and `JWT_SECRET_KEY`.** ✅
