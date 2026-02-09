# 🚨 URGENT: Fix VITE_API_URL Error in Vercel

## ❌ **Current Error**

```
Uncaught Error: VITE_API_URL environment variable must be set to HTTPS URL in production
```

**This error is blocking your app from loading!** The logo and other changes won't show because the app crashes before rendering.

---

## ✅ **Solution: Set VITE_API_URL in Vercel**

### **Step 1: Go to Vercel Dashboard**

1. Open: [vercel.com/dashboard](https://vercel.com/dashboard)
2. Click on your project: **"insightsheet"** or **"insightsheet-2ekc"**

---

### **Step 2: Open Environment Variables**

1. Click **"Settings"** tab (top navigation bar)
2. Click **"Environment Variables"** (left sidebar)

---

### **Step 3: Add/Update VITE_API_URL**

**Your Railway backend URL is:**
```
https://insightsheet-production.up.railway.app
```

**Do this:**

1. **Look for `VITE_API_URL` in the list:**
   - If it exists → Click on it to **edit**
   - If it doesn't exist → Click **"Add New"** button

2. **Set the values:**
   - **Key:** `VITE_API_URL`
   - **Value:** `https://insightsheet-production.up.railway.app`
   - **⚠️ IMPORTANT:** Make sure it starts with `https://` (NOT `http://`)

3. **Select Environments:**
   - ✅ **Production** (MUST check this!)
   - ✅ **Preview** (check this too)
   - ✅ **Development** (optional - can keep localhost for local dev)

4. **Click "Save"**

---

### **Step 4: Redeploy Vercel (CRITICAL!)**

**⚠️ THIS IS THE MOST IMPORTANT STEP!**

After updating `VITE_API_URL`, you **MUST** manually redeploy. Just saving the variable isn't enough!

**How to Redeploy:**

1. **Go to Deployments Tab:**
   - Click **"Deployments"** tab (top navigation)
   - Find the **latest deployment**

2. **Click Redeploy:**
   - Click the **"..."** menu (three dots) on the latest deployment
   - Click **"Redeploy"**

3. **Uncheck Build Cache:**
   - **IMPORTANT:** Uncheck **"Use existing Build Cache"**
   - This ensures a fresh build with the new environment variable

4. **Confirm:**
   - Click **"Redeploy"** button
   - Wait **2-3 minutes** for deployment to complete

**Why This Matters:**
Vite embeds `VITE_API_URL` into the JavaScript bundle at **build time**. Without redeploying, the old (or missing) value stays in the built code.

---

## 🔍 **Step 5: Verify It's Fixed**

**After redeployment completes:**

1. **Visit your site:**
   - Go to: `https://insight.meldra.ai` or `https://insightsheet-2ekc.vercel.app`

2. **Open Browser Console:**
   - Press `F12` or right-click → "Inspect"
   - Go to **"Console"** tab

3. **Check for errors:**
   - ✅ **Should NOT see:** `VITE_API_URL environment variable must be set`
   - ✅ **Should see:** No errors (or only minor warnings)

4. **Check the page:**
   - ✅ Logo should appear at the top
   - ✅ Contact section should appear at the bottom
   - ✅ Page should load completely

5. **Hard refresh browser:**
   - Press `Ctrl + Shift + R` (Windows) or `Cmd + Shift + R` (Mac)
   - This clears browser cache

---

## 📋 **Quick Checklist**

- [ ] Opened Vercel Dashboard
- [ ] Went to Settings → Environment Variables
- [ ] Added/Updated `VITE_API_URL` = `https://insightsheet-production.up.railway.app`
- [ ] Selected Production and Preview environments
- [ ] Clicked "Save"
- [ ] Went to Deployments tab
- [ ] Clicked "..." → "Redeploy"
- [ ] Unchecked "Use existing Build Cache"
- [ ] Clicked "Redeploy"
- [ ] Waited 2-3 minutes for deployment
- [ ] Hard refreshed browser (`Ctrl + Shift + R`)
- [ ] Verified no console errors
- [ ] Verified logo appears
- [ ] Verified contact section appears

---

## ⚠️ **Common Mistakes**

### **Mistake 1: Using HTTP instead of HTTPS**
❌ **Wrong:** `http://insightsheet-production.up.railway.app`  
✅ **Correct:** `https://insightsheet-production.up.railway.app`

### **Mistake 2: Using localhost**
❌ **Wrong:** `http://localhost:8001`  
✅ **Correct:** `https://insightsheet-production.up.railway.app`

### **Mistake 3: Not redeploying**
❌ **Wrong:** Just saving the variable and waiting  
✅ **Correct:** Save variable → Go to Deployments → Redeploy (without cache)

### **Mistake 4: Not selecting Production environment**
❌ **Wrong:** Only selecting Development  
✅ **Correct:** Select Production, Preview, and Development

---

## 🎯 **Summary**

**The Problem:**
- `VITE_API_URL` is not set or is set to localhost in Vercel
- This causes the app to crash before rendering
- Logo and other changes won't show because the app doesn't load

**The Solution:**
1. Set `VITE_API_URL` = `https://insightsheet-production.up.railway.app` in Vercel
2. **Redeploy** Vercel (without cache)
3. Hard refresh browser

**After this fix:**
- ✅ Error will be gone
- ✅ App will load completely
- ✅ Logo will appear
- ✅ Contact section will appear
- ✅ All changes will be visible

---

## 🚀 **Do This Now**

1. **Go to Vercel → Settings → Environment Variables**
2. **Set `VITE_API_URL` = `https://insightsheet-production.up.railway.app`**
3. **Redeploy** (Deployments → "..." → Redeploy, uncheck cache)
4. **Wait 2-3 minutes**
5. **Hard refresh** browser (`Ctrl + Shift + R`)

**This will fix the error and make your logo and changes visible!** 🎉
