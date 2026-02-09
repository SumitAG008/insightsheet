# 📱 Mobile Backend Connection Issues - Fix Guide

## 🎯 Problem

- ✅ **Web (Windows):** AI Assistant works
- ❌ **Mobile:** AI Assistant doesn't load
- ❓ **Question:** Does mobile need backend?

---

## ✅ Answer: Yes, Mobile Needs Backend!

**Both web and mobile need the backend** for:
- ✅ AI features (AI Assistant, P&L Builder, etc.)
- ✅ File processing
- ✅ Authentication
- ✅ Database operations

**The issue is likely:** Backend URL configuration for mobile!

---

## 🔍 Common Mobile Issues

### **Issue 1: localhost Doesn't Work on Mobile**

**Problem:**
- Your `VITE_API_URL` might be: `http://localhost:8000`
- **localhost on mobile** = the phone itself, not your computer!
- Mobile can't reach `localhost:8000` on your Windows machine

**Solution:**
- Deploy backend to Railway/Render (get public URL)
- Update `VITE_API_URL` to backend URL
- Mobile can then access it!

---

### **Issue 2: CORS Not Configured for Mobile**

**Problem:**
- Backend CORS might only allow web domains
- Mobile browser has different origin
- Requests get blocked

**Solution:**
- Add mobile domain to backend CORS
- Or use deployed backend URL (already configured)

---

### **Issue 3: HTTPS vs HTTP**

**Problem:**
- Mobile browsers are stricter about HTTPS
- If site is HTTPS but API is HTTP → blocked
- Mixed content security

**Solution:**
- Use HTTPS for both frontend and backend
- Deploy backend with HTTPS (Railway/Render provide this)

---

## 🛠️ Quick Fixes

### **Fix 1: Check Current API URL**

1. **Check Vercel Environment Variables:**
   - Vercel Dashboard → Settings → Environment Variables
   - Look for `VITE_API_URL`
   - What value does it have?

**If it's `http://localhost:8000`:**
- ❌ This won't work on mobile!
- ✅ Need to deploy backend and use public URL

---

### **Fix 2: Deploy Backend (If Not Done)**

**This is the main solution!**

1. **Deploy backend to Railway:**
   - Follow: `HOW_TO_DEPLOY_BACKEND.md`
   - Get backend URL: `https://your-backend.railway.app`

2. **Update Vercel Environment Variable:**
   - Vercel → Settings → Environment Variables
   - Update `VITE_API_URL` to: `https://your-backend.railway.app`
   - Redeploy frontend

3. **Test on mobile:**
   - Visit: `https://insight.meldra.ai`
   - AI Assistant should work!

---

### **Fix 3: Update Backend CORS**

**In your backend `.env` or Railway variables:**

```env
CORS_ORIGINS=http://localhost:5173,http://localhost:3000,https://meldra.ai,https://insight.meldra.ai,https://insightsheet-jpci.vercel.app
```

**Add all your frontend URLs:**
- `https://insight.meldra.ai`
- `https://insightsheet-jpci.vercel.app`
- Any other Vercel URLs

---

## 📋 Diagnostic Steps

### **Step 1: Check Browser Console on Mobile**

1. **On mobile browser:**
   - Open developer tools (if available)
   - Or use remote debugging
   - Check Console for errors

2. **Look for:**
   - `Failed to fetch`
   - `CORS error`
   - `Network error`
   - `Connection refused`

---

### **Step 2: Check Network Tab**

1. **On mobile:**
   - Open Network tab in dev tools
   - Try using AI Assistant
   - Check if API calls are:
     - ❌ Failing (red)
     - ❌ Blocked
     - ❌ Timeout

---

### **Step 3: Verify API URL**

**Check what URL mobile is using:**

1. **In browser console on mobile:**
   ```javascript
   console.log(import.meta.env.VITE_API_URL);
   ```

2. **Should show:**
   - ✅ `https://your-backend.railway.app` (good!)
   - ❌ `http://localhost:8000` (bad for mobile!)

---

## 🚀 Complete Solution

### **Step 1: Deploy Backend**

1. **Go to Railway:**
   - [railway.app](https://railway.app)
   - Deploy backend (see `HOW_TO_DEPLOY_BACKEND.md`)
   - Get URL: `https://your-backend.railway.app`

### **Step 2: Update Frontend**

1. **Vercel Dashboard:**
   - Settings → Environment Variables
   - Update `VITE_API_URL`:
     - From: `http://localhost:8000`
     - To: `https://your-backend.railway.app`
   - Save

2. **Redeploy:**
   - Vercel will auto-redeploy
   - Or manually trigger redeploy

### **Step 3: Update Backend CORS**

1. **Railway Dashboard:**
   - Your backend service → Variables
   - Update `CORS_ORIGINS`:
   ```
   http://localhost:5173,http://localhost:3000,https://meldra.ai,https://insight.meldra.ai,https://insightsheet-jpci.vercel.app
   ```
   - Save

2. **Backend will restart** with new CORS settings

### **Step 4: Test**

1. **On mobile:**
   - Visit: `https://insight.meldra.ai`
   - Try AI Assistant
   - Should work! ✅

---

## 🔧 Quick Test (Without Backend Deployment)

**If backend not deployed yet:**

1. **Use your computer's IP address:**
   - Find your Windows machine's local IP:
     - Open Command Prompt
     - Type: `ipconfig`
     - Look for "IPv4 Address" (e.g., `192.168.1.100`)

2. **Update Vercel Environment Variable:**
   - `VITE_API_URL` = `http://192.168.1.100:8000`
   - **Note:** Both devices must be on same WiFi!

3. **Start backend on Windows:**
   ```bash
   cd backend
   uvicorn app.main:app --host 0.0.0.0 --port 8000
   ```

4. **Test on mobile:**
   - Visit: `https://insight.meldra.ai`
   - Should work (if on same network)

**⚠️ This is temporary!** Deploy backend for production.

---

## ✅ Summary

**Does mobile need backend?**
- ✅ **Yes!** Both web and mobile need backend

**Why doesn't it work on mobile?**
- ❌ `localhost:8000` doesn't work on mobile
- ❌ Backend not deployed (no public URL)
- ❌ CORS not configured for mobile domain

**Solution:**
1. ✅ Deploy backend to Railway/Render
2. ✅ Update `VITE_API_URL` in Vercel
3. ✅ Update backend CORS
4. ✅ Test on mobile

---

## 🎯 Action Plan

1. **Deploy backend** (if not done) → Get public URL
2. **Update Vercel** → Set `VITE_API_URL` to backend URL
3. **Update backend CORS** → Add mobile domain
4. **Test on mobile** → Should work!

**See:** `HOW_TO_DEPLOY_BACKEND.md` for backend deployment steps.

---

**The main issue: Backend needs to be deployed with a public URL for mobile to access it!** 🚀
