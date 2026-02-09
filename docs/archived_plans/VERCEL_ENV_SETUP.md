# 🔧 Vercel Environment Variables Setup

## ✅ Your Current .env File

You already have a `.env` file with:
```
VITE_API_URL=http://localhost:8001
VITE_APP_NAME=InsightSheet-lite
VITE_APP_DOMAIN=meldra.ai
```

---

## 🚀 How to Use in Vercel

### **Option 1: Import .env File (Easiest)**

1. **On Vercel configuration page:**
   - Scroll to **"Environment Variables"** section
   - Click **"Import .env"** button (red arrow points to it)
   - Select your `.env` file from: `C:\Users\sumit\Documents\Insightlite\.env`
   - Vercel will automatically read all variables

2. **Verify variables are imported:**
   - You should see:
     - `VITE_API_URL` = `http://localhost:8001`
     - `VITE_APP_NAME` = `InsightSheet-lite`
     - `VITE_APP_DOMAIN` = `meldra.ai`

### **Option 2: Paste .env Contents**

1. **Copy your .env file contents:**
   ```
   VITE_API_URL=http://localhost:8001
   VITE_APP_NAME=InsightSheet-lite
   VITE_APP_DOMAIN=meldra.ai
   ```

2. **In Vercel:**
   - Click in the Environment Variables section
   - Paste the contents
   - Vercel will parse them automatically

### **Option 3: Add Manually**

1. **Click "+ Add More"** in Environment Variables
2. **Add each variable:**
   - **Key:** `VITE_API_URL`, **Value:** `http://localhost:8001`
   - **Key:** `VITE_APP_NAME`, **Value:** `InsightSheet-lite`
   - **Key:** `VITE_APP_DOMAIN`, **Value:** `meldra.ai`
3. **Select environments:** Check Production, Preview, Development

---

## ⚠️ Important: Update VITE_API_URL for Production

Your current `.env` has:
```
VITE_API_URL=http://localhost:8001
```

**For Vercel deployment, you need:**

### **Option A: Use Localhost (for testing)**
- Keep: `VITE_API_URL=http://localhost:8001`
- **Note:** This only works if backend runs locally

### **Option B: Use Backend URL (recommended)**
- Change to: `VITE_API_URL=https://your-backend-url.com`
- **After you deploy backend** (Railway, Render, etc.)

### **Option C: Set Different Values for Different Environments**

In Vercel, you can set different values:
- **Development:** `http://localhost:8001`
- **Preview:** `https://your-backend-staging.com`
- **Production:** `https://your-backend-production.com`

---

## 📋 Quick Steps for Vercel

1. **On Vercel configuration page:**
   - Scroll to **"Environment Variables"**
   - Click **"Import .env"** button
   - Select: `C:\Users\sumit\Documents\Insightlite\.env`
   - Variables will be imported ✅

2. **Update VITE_API_URL (if needed):**
   - Click the value for `VITE_API_URL`
   - Change to your backend URL (or keep localhost for now)

3. **Select Environments:**
   - For each variable, check:
     - ✅ Production
     - ✅ Preview
     - ✅ Development

4. **Click "Deploy"** 🚀

---

## 🔑 Backend .env (Separate File)

**Backend needs its own .env file** in `backend/` directory:

Location: `C:\Users\sumit\Documents\Insightlite\backend\.env`

```env
# Database
DATABASE_URL=postgresql://neondb_owner:npg_fDwMP0Rk2vAe@ep-small-dream-abw9afwj-pooler.eu-west-2.aws.neon.tech/neondb?sslmode=require

# OpenAI API Key
OPENAI_API_KEY=sk-your-openai-api-key-here

# JWT Secret
JWT_SECRET_KEY=your-super-secret-jwt-key

# CORS
CORS_ORIGINS=http://localhost:5173,http://localhost:3000,https://meldra.ai
```

**This is for backend deployment (Railway, Render, etc.), not Vercel.**

---

## ✅ Summary

**For Vercel (Frontend):**
1. Click **"Import .env"** button
2. Select your `.env` file
3. Variables imported ✅
4. Click **"Deploy"**

**Your .env file is ready to import!** 🎉
