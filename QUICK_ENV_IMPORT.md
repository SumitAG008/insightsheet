# ⚡ Quick .env Import Guide

## 🎯 Two Separate Imports

### **1. Frontend → Vercel (NOW)**

**File:** `C:\Users\sumit\Documents\Insightlite\.env`

**In Vercel:**
1. Click **"Import .env"** button
2. Select your `.env` file
3. ✅ Done!

**Variables:**
- `VITE_API_URL=http://localhost:8001`
- `VITE_APP_NAME=InsightSheet-lite`
- `VITE_APP_DOMAIN=meldra.ai`

---

### **2. Backend → Railway/Render (LATER)**

**File:** `C:\Users\sumit\Documents\Insightlite\backend\.env`

**In Railway:**
1. Go to Variables → Raw Editor
2. Paste entire `.env` contents
3. ✅ Done!

**In Render:**
1. Go to Environment tab
2. Add each variable one by one
3. ✅ Done!

**Variables:**
- `DATABASE_URL=postgresql://...`
- `OPENAI_API_KEY=sk-...`
- `JWT_SECRET_KEY=...`
- `CORS_ORIGINS=...`
- `ENVIRONMENT=production`

---

## ✅ Right Now in Vercel

1. **Click "Import .env"** button
2. **Select:** `C:\Users\sumit\Documents\Insightlite\.env`
3. **Click "Deploy"** 🚀

That's it! Frontend is ready.

---

**Backend .env is created at `backend/.env` - fill it in when deploying backend!**
