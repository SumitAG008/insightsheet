# 🔍 Debug Localhost Issue - EXACT STEPS

## ❌ **Problem: Still Getting Localhost After 3 Days**

**Root Cause:** Vite embeds `VITE_API_URL` at **BUILD TIME**, not runtime. Even if the variable is set, the **built JavaScript** still has the old value.

---

## 🎯 **EXACT DEBUGGING STEPS**

### **STEP 1: Check What's Actually Deployed** 🔍

#### **1.1 Check Vercel Environment Variable**

1. Go to: **Vercel Dashboard** → Your Project → **Settings** → **Environment Variables**
2. Find `VITE_API_URL`
3. **What does it say?**
   - ✅ Should be: `https://insightsheet-production.up.railway.app`
   - ❌ If it's `http://localhost:8000` or empty → **FIX THIS FIRST**

#### **1.2 Check Which Environments It's Set For**

Click on `VITE_API_URL` and check:
- ✅ **Production** - Must be checked
- ✅ **Preview** - Should be checked
- ✅ **Development** - Optional

**If Production is NOT checked:** That's your problem! Check it and save.

---

### **STEP 2: Check Latest Deployment** 📦

1. Go to: **Vercel Dashboard** → **Deployments** tab
2. Look at the **latest deployment**:
   - **When was it deployed?** (Should be recent)
   - **Status:** Should be ✅ "Ready"
   - **Commit:** What commit is it on?

3. **Click on the latest deployment**
4. Click **"Build Logs"**
5. **Search for:** `VITE_API_URL`
6. **What does it show?**
   - ✅ Should show: `VITE_API_URL=https://insightsheet-production.up.railway.app`
   - ❌ If it shows `localhost` or nothing → **Build used old value**

---

### **STEP 3: Check If Code Was Pushed** 💻

1. Go to your **GitHub repository**
2. Check the **latest commit**:
   - Did you push the security fixes?
   - When was the last commit?

3. **If code wasn't pushed:**
   ```bash
   git status
   git add .
   git commit -m "Security fixes: Remove localhost fallbacks"
   git push origin main
   ```

---

### **STEP 4: Force Fresh Redeploy (NO CACHE)** 🔄

**This is the KEY step!**

1. Go to: **Vercel Dashboard** → **Deployments**
2. Find the **latest deployment**
3. Click **"..."** (three dots menu)
4. Click **"Redeploy"**
5. **CRITICAL:** Uncheck **"Use existing Build Cache"** ❌
   - This forces a fresh build with current environment variables
6. Click **"Redeploy"**
7. **Wait 2-3 minutes** for deployment to complete

---

### **STEP 5: Verify Built Code Has Correct Value** ✅

#### **5.1 Check Build Logs After Redeploy**

1. Go to the **new deployment** (after redeploy)
2. Click **"Build Logs"**
3. **Search for:** `VITE_API_URL`
4. **Should show:** `VITE_API_URL=https://insightsheet-production.up.railway.app`

#### **5.2 Check Actual JavaScript File**

1. Visit: `https://insight.meldra.ai`
2. Open browser console (F12)
3. Go to **Network** tab
4. Refresh page (Ctrl+Shift+R)
5. Find a JavaScript file (like `main-xxx.js` or `index-xxx.js`)
6. Click on it → **Response** tab
7. **Search for:** `localhost:8000` or `localhost:8001`
8. **Should NOT find any localhost references**
9. **Should find:** `https://insightsheet-production.up.railway.app`

---

### **STEP 6: Test on iPhone** 📱

#### **6.1 Clear Safari Cache on iPhone**

1. **Settings** → **Safari**
2. Scroll down → **Clear History and Website Data**
3. Tap **"Clear History and Data"**
4. Confirm

#### **6.2 Test the Site**

1. Open Safari on iPhone
2. Visit: `https://insight.meldra.ai`
3. **Hard refresh:** Tap and hold refresh button → **"Reload Without Content Blockers"**
4. Try to login
5. Open **Developer Tools** (if you have Mac):
   - Connect iPhone to Mac
   - Mac Safari → Develop → [Your iPhone] → [insight.meldra.ai]
   - Check Console for errors

#### **6.3 Check Network Requests**

1. In Safari Developer Tools (Mac) or browser console
2. Go to **Network** tab
3. Try login
4. Look for API requests
5. **What URL are they going to?**
   - ✅ Should be: `https://insightsheet-production.up.railway.app/api/auth/login`
   - ❌ If it's `localhost:8000` → **Still using old build**

---

## 🔧 **If Still Not Working - Nuclear Option**

### **Option 1: Delete and Re-add Environment Variable**

1. **Vercel Dashboard** → **Settings** → **Environment Variables**
2. **Delete** `VITE_API_URL`
3. **Add it again:**
   - Name: `VITE_API_URL`
   - Value: `https://insightsheet-production.up.railway.app`
   - Environments: ✅ Production, ✅ Preview
4. **Save**
5. **Redeploy WITHOUT cache** (Step 4)

### **Option 2: Check for Multiple Variables**

1. In Vercel Environment Variables
2. **Search for:** `VITE_API_URL`
3. **Are there multiple entries?**
   - If yes, delete all and add one fresh
   - Sometimes duplicates cause issues

### **Option 3: Check vercel.json**

1. Check if you have `vercel.json` file
2. Does it override environment variables?
3. If yes, remove or update it

---

## 🎯 **Quick Checklist**

- [ ] `VITE_API_URL` in Vercel = `https://insightsheet-production.up.railway.app`
- [ ] Variable set for **Production** environment
- [ ] Latest deployment is recent (after variable was set)
- [ ] Build logs show correct `VITE_API_URL`
- [ ] Redeployed **WITHOUT cache** after setting variable
- [ ] JavaScript files don't contain `localhost`
- [ ] Cleared browser cache on iPhone
- [ ] Tested login - still fails?

---

## 🆘 **Common Issues**

### **Issue 1: Variable Set But Not Used**

**Symptom:** Variable is set, but build logs show old value

**Fix:**
- Redeploy WITHOUT cache
- Make sure variable is set for **Production** environment

---

### **Issue 2: Multiple Deployments**

**Symptom:** Variable updated, but old deployment is still live

**Fix:**
- Check which deployment is **Production**
- Make sure latest deployment is set as Production
- Or manually promote latest deployment to Production

---

### **Issue 3: Browser Cache**

**Symptom:** Everything looks correct, but iPhone still shows old code

**Fix:**
- Clear Safari cache on iPhone
- Hard refresh (tap and hold refresh button)
- Or use private browsing mode

---

### **Issue 4: Code Not Pushed**

**Symptom:** Local code is fixed, but deployed code is old

**Fix:**
```bash
git add .
git commit -m "Fix: Remove localhost fallbacks"
git push origin main
```

---

## 📊 **Debugging Commands**

### **Check What's Actually in the Built Code**

1. Visit: `https://insight.meldra.ai`
2. Open console (F12)
3. Run:
```javascript
// Check environment variable
console.log('VITE_API_URL:', import.meta.env.VITE_API_URL);

// Check what API URL is being used
console.log('API calls going to:', window.location.origin);
```

**Expected:**
- `VITE_API_URL: https://insightsheet-production.up.railway.app`
- If it's `undefined` or `localhost` → **Variable not set or build is old**

---

## ✅ **Final Verification**

After all steps:

1. ✅ Vercel variable set correctly
2. ✅ Redeployed WITHOUT cache
3. ✅ Build logs show correct value
4. ✅ JavaScript files don't have localhost
5. ✅ Cleared iPhone cache
6. ✅ Login works on iPhone

**If still not working after all steps, share:**
- Screenshot of Vercel environment variables
- Screenshot of latest deployment build logs
- Screenshot of browser console on iPhone (if possible)

---

## 🎯 **Most Likely Issue**

**90% of the time, it's one of these:**

1. ❌ Variable not set for **Production** environment
2. ❌ Redeployed WITH cache (old build used)
3. ❌ Browser cache on iPhone (old JavaScript loaded)
4. ❌ Code not pushed to GitHub (old code deployed)

**Fix all 4, and it will work!** ✅
