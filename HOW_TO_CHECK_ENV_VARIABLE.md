# 🔍 How to Check Environment Variable in Browser Console

## Step-by-Step Instructions

### **Step 1: Visit Your Deployed Site**

1. **Open your web browser** (Chrome, Firefox, Edge, etc.)
2. **Go to your Vercel site:**
   - `https://insight.meldra.ai`
   - Or your Vercel URL: `https://meldra-xyz.vercel.app`

---

### **Step 2: Open Browser Developer Tools**

**Option A: Keyboard Shortcut (Easiest)**
- Press **`F12`** on your keyboard
- Or press **`Ctrl + Shift + I`** (Windows/Linux)
- Or press **`Cmd + Option + I`** (Mac)

**Option B: Right-Click Menu**
- Right-click anywhere on the page
- Click **"Inspect"** or **"Inspect Element"**
- Developer Tools will open

---

### **Step 3: Go to Console Tab**

1. **Look at the top of Developer Tools:**
   - You'll see tabs: **Elements**, **Console**, **Sources**, **Network**, etc.
2. **Click on the "Console" tab**
   - This is where you can run JavaScript commands

---

### **Step 4: Check the Environment Variable**

1. **Click in the console input area** (at the bottom of the Console tab)
2. **Type this command:**
   ```javascript
   console.log(import.meta.env.VITE_API_URL)
   ```
3. **Press Enter**

---

### **Step 5: Check the Result**

**✅ Correct Result:**
```
https://insightsheet-production.up.railway.app
```

**❌ Wrong Results:**
- `undefined` → Environment variable not set
- `http://localhost:8000` → Using fallback value
- `http://localhost:8001` → Using wrong fallback value

---

## 🎯 What You Should See

After typing the command and pressing Enter, you should see:

```
> console.log(import.meta.env.VITE_API_URL)
https://insightsheet-production.up.railway.app
```

This confirms the environment variable is correctly set!

---

## 📸 Visual Guide

```
┌─────────────────────────────────────┐
│ Browser Window                      │
│  [insight.meldra.ai/login]          │
│                                     │
│  ┌─────────────────────────────┐   │
│  │ Login Page Content           │   │
│  └─────────────────────────────┘   │
│                                     │
│  ┌─────────────────────────────┐   │
│  │ Developer Tools (F12)        │   │
│  │ ┌─────────────────────────┐ │   │
│  │ │ Console Tab              │ │   │
│  │ │                         │ │   │
│  │ │ > console.log(...)      │ │   │
│  │ │ https://insightsheet... │ │   │
│  │ │                         │ │   │
│  │ │ [Type here]             │ │   │
│  │ └─────────────────────────┘ │   │
│  └─────────────────────────────┘   │
└─────────────────────────────────────┘
```

---

## 🔧 Alternative: Check Network Tab

You can also verify by checking network requests:

1. **Open Developer Tools** (F12)
2. **Go to "Network" tab** (instead of Console)
3. **Try to login or use "Forgot Password"**
4. **Look at the network requests:**
   - Should show requests to: `https://insightsheet-production.up.railway.app`
   - Should NOT show: `localhost:8001` or `localhost:8000`

---

## ⚠️ If You See 500 Error

If you see `500 Internal Server Error` when trying to login (like in your screenshot):

**This means:**
- ✅ Frontend is correctly connecting to Railway backend
- ❌ Backend is returning an error

**To check backend logs:**
1. Go to [railway.app](https://railway.app)
2. Click on your "insightsheet" service
3. Go to **"Logs"** tab
4. Look for error messages when you try to login

**Common causes:**
- Database connection issue
- Missing environment variables in Railway
- Backend code error

---

## ✅ Summary

**Quick Check:**
1. Visit your site
2. Press **F12**
3. Click **"Console"** tab
4. Type: `console.log(import.meta.env.VITE_API_URL)`
5. Press **Enter**
6. Should show: `https://insightsheet-production.up.railway.app`

**If it shows the Railway URL → Environment variable is working!** 🎉
