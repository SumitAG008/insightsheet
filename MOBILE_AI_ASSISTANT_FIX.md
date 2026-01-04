# 📱 Fix AI Assistant on Mobile - Complete Guide

## 🎯 Problem

- ✅ **Web (Windows):** AI Assistant works
- ❌ **Mobile:** AI Assistant doesn't load
- ❓ **Question:** Does mobile need backend?

---

## ✅ Answer: YES, Mobile Needs Backend!

**Both web and mobile need the backend** for:
- ✅ AI features (AI Assistant, P&L Builder, etc.)
- ✅ File processing
- ✅ Authentication
- ✅ Database operations

**The problem:** `localhost:8000` doesn't work on mobile!

---

## 🔍 Why It Doesn't Work on Mobile

### **The Issue:**

Your `VITE_API_URL` is probably set to:
```
http://localhost:8000
```

**Problem:**
- ✅ **On Windows:** `localhost` = your computer → Works!
- ❌ **On Mobile:** `localhost` = the phone itself → Doesn't work!
- Mobile can't reach `localhost:8000` on your Windows machine

---

## 🛠️ Solution: Deploy Backend

### **Step 1: Deploy Backend to Railway**

1. **Go to Railway:**
   - [railway.app](https://railway.app)
   - Follow: `HOW_TO_DEPLOY_BACKEND.md`
   - Get backend URL: `https://your-backend.railway.app`

2. **Configure Backend:**
   - Add environment variables in Railway
   - Set `CORS_ORIGINS` to include:
     ```
     http://localhost:5173,http://localhost:3000,https://meldra.ai,https://insight.meldra.ai,https://insightsheet-jpci.vercel.app
     ```

---

### **Step 2: Update Frontend API URL**

1. **Go to Vercel Dashboard:**
   - Your Project → Settings → Environment Variables

2. **Update `VITE_API_URL`:**
   - **Current:** `http://localhost:8000` (or `http://localhost:8001`)
   - **Change to:** `https://your-backend.railway.app`
   - **Environments:** Check Production ✅, Preview ✅, Development ✅

3. **Save and Redeploy:**
   - Vercel will auto-redeploy
   - Or manually trigger redeploy

---

### **Step 3: Test on Mobile**

1. **Visit:** `https://insight.meldra.ai`
2. **Try AI Assistant:**
   - Should now work! ✅
   - Can connect to backend

---

## 🔧 Quick Diagnostic

### **Check Current API URL:**

1. **Vercel Dashboard:**
   - Settings → Environment Variables
   - Look for `VITE_API_URL`
   - What value does it show?

**If it's `http://localhost:8000`:**
- ❌ This won't work on mobile!
- ✅ Need to deploy backend and use public URL

---

## 📋 Complete Fix Checklist

- [ ] **Deploy backend to Railway** (get public URL)
- [ ] **Update `VITE_API_URL` in Vercel** to backend URL
- [ ] **Update backend `CORS_ORIGINS`** to include mobile domain
- [ ] **Redeploy frontend** (Vercel auto-deploys)
- [ ] **Test on mobile** - AI Assistant should work!

---

## 🚀 Quick Steps

1. **Deploy Backend:**
   - Railway → New Project → Deploy from GitHub
   - Set Root Directory: `backend`
   - Add environment variables
   - Get URL: `https://your-backend.railway.app`

2. **Update Vercel:**
   - Settings → Environment Variables
   - `VITE_API_URL` = `https://your-backend.railway.app`
   - Save

3. **Update Backend CORS:**
   - Railway → Variables
   - `CORS_ORIGINS` = `http://localhost:5173,http://localhost:3000,https://meldra.ai,https://insight.meldra.ai,https://insightsheet-jpci.vercel.app`

4. **Test:**
   - Visit `https://insight.meldra.ai` on mobile
   - AI Assistant should work! ✅

---

## ✅ Summary

**Does mobile need backend?**
- ✅ **Yes!** Both web and mobile need backend

**Why doesn't it work on mobile?**
- ❌ `localhost:8000` doesn't work on mobile
- ❌ Backend not deployed (no public URL)

**Solution:**
1. ✅ Deploy backend to Railway/Render
2. ✅ Update `VITE_API_URL` in Vercel
3. ✅ Update backend CORS
4. ✅ Test on mobile

---

**The main issue: Backend needs a public URL (not localhost) for mobile to access it!** 🚀

**See:** `HOW_TO_DEPLOY_BACKEND.md` for detailed backend deployment steps.
