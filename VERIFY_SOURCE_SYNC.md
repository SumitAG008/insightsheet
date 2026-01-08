# 🔍 Verify Source Code is in Sync with Vercel

## 🎯 **What to Check**

This guide shows you exactly what code to check to ensure your source matches what's deployed in Vercel.

---

## 📋 **Step 1: Check Source Code Files (Local)**

### **1.1 Critical Files to Check**

These files control the API URL:

#### **File 1: `src/api/meldraClient.js`** (Line 37-45)

**Should look like this:**
```javascript
// SECURITY: Require HTTPS API URL - no localhost fallback in production
const API_URL = import.meta.env.VITE_API_URL || (() => {
  // Only allow localhost in development (when running on localhost)
  if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
    return 'http://localhost:8001';
  }
  // Production must use HTTPS
  throw new Error('VITE_API_URL environment variable must be set to HTTPS URL in production');
})();
```

**❌ WRONG (Old Code):**
```javascript
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
```

---

#### **File 2: `src/api/backendClient.js`** (Line 6-14)

**Should look like this:**
```javascript
// SECURITY: Require HTTPS API URL - no localhost fallback in production
const API_URL = import.meta.env.VITE_API_URL || (() => {
  // Only allow localhost in development (when running on localhost)
  if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
    return 'http://localhost:8001';
  }
  // Production must use HTTPS
  throw new Error('VITE_API_URL environment variable must be set to HTTPS URL in production');
})();
```

**❌ WRONG (Old Code):**
```javascript
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
```

---

#### **File 3: `src/pages/Login.jsx`** (Line 59)

**Should look like this:**
```javascript
const apiUrl = import.meta.env.VITE_API_URL || (window.location.hostname === 'localhost' ? 'http://localhost:8001' : '');
if (!apiUrl) {
  setError('API URL not configured. Please contact support.');
  return;
}
const response = await fetch(`${apiUrl}/api/auth/resend-verification`, {
```

**❌ WRONG (Old Code):**
```javascript
const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8001'}/api/auth/resend-verification`, {
```

---

#### **File 4: `src/pages/VerifyEmail.jsx`** (Lines 31, 65)

**Should look like this:**
```javascript
const apiUrl = import.meta.env.VITE_API_URL || (window.location.hostname === 'localhost' ? 'http://localhost:8001' : '');
if (!apiUrl) {
  setStatus('error');
  setMessage('API URL not configured. Please contact support.');
  return;
}
```

**❌ WRONG (Old Code):**
```javascript
const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8001'}/api/auth/verify-email?token=${token}`);
```

---

### **1.2 How to Check These Files**

**In your local code:**
```bash
# Check meldraClient.js
cat src/api/meldraClient.js | grep -A 10 "const API_URL"

# Check backendClient.js
cat src/api/backendClient.js | grep -A 10 "const API_URL"

# Check Login.jsx
cat src/pages/Login.jsx | grep -A 5 "apiUrl"

# Check VerifyEmail.jsx
cat src/pages/VerifyEmail.jsx | grep -A 5 "apiUrl"
```

---

## 📦 **Step 2: Check What's Actually Deployed in Vercel**

### **2.1 Check Vercel Source Code**

1. **Go to:** Vercel Dashboard → Your Project → **Source** tab
2. **Navigate to:** `src/api/meldraClient.js`
3. **Check Line 37-45:** Should match your local code above
4. **Navigate to:** `src/api/backendClient.js`
5. **Check Line 6-14:** Should match your local code above

**If they match:** ✅ Source code is synced
**If they don't match:** ❌ Need to push code to GitHub

---

### **2.2 Check Latest Deployment**

1. **Go to:** Vercel Dashboard → **Deployments** tab
2. **Click on latest deployment**
3. **Check:**
   - **Commit:** What commit hash is it on?
   - **Branch:** Should be `main`
   - **Status:** Should be ✅ "Ready"
   - **Time:** When was it deployed?

4. **Compare with GitHub:**
   - Go to your GitHub repository
   - Check latest commit
   - **Do they match?**
     - ✅ Match = Code is synced
     - ❌ Don't match = Need to push code

---

### **2.3 Check Build Logs**

1. **Vercel Dashboard** → **Deployments** → Latest → **Build Logs**
2. **Search for:** `VITE_API_URL`
3. **Should show:**
   ```
   VITE_API_URL=https://insightsheet-production.up.railway.app
   ```
4. **If it shows `localhost` or nothing:**
   - ❌ Environment variable not set
   - ❌ Or build used cached value

---

## 🔍 **Step 3: Check Built JavaScript (What Users Actually See)**

### **3.1 Inspect Deployed JavaScript**

1. **Visit:** `https://insight.meldra.ai`
2. **Open browser console** (F12)
3. **Go to:** **Network** tab
4. **Refresh page** (Ctrl+Shift+R)
5. **Find a JavaScript file:**
   - Look for files like: `main-xxx.js`, `index-xxx.js`, `assets/main-xxx.js`
   - Usually the largest file

6. **Click on the file** → **Response** tab
7. **Search for:** `localhost:8000` or `localhost:8001`
   - ❌ **If found:** Old code is deployed
   - ✅ **If not found:** Good!

8. **Search for:** `VITE_API_URL`
   - Should see: `import.meta.env.VITE_API_URL`
   - This is correct (Vite replaces it at build time)

9. **Search for:** `insightsheet-production.up.railway.app`
   - ✅ **If found:** Correct URL is embedded
   - ❌ **If not found:** Environment variable not used

---

### **3.2 Check Environment Variable in Browser**

1. **Visit:** `https://insight.meldra.ai`
2. **Open console** (F12)
3. **Run:**
   ```javascript
   console.log('VITE_API_URL:', import.meta.env.VITE_API_URL);
   ```
4. **Expected result:**
   - ✅ Should show: `https://insightsheet-production.up.railway.app`
   - ❌ If `undefined` or `localhost`: Variable not set or build is old

---

## 🔄 **Step 4: Verify GitHub Sync**

### **4.1 Check GitHub Repository**

1. **Go to:** Your GitHub repository
2. **Check latest commit:**
   - **Message:** Should mention security fixes
   - **Files changed:** Should include `src/api/meldraClient.js`, `src/api/backendClient.js`
   - **Time:** Should be recent

3. **View file on GitHub:**
   - Click `src/api/meldraClient.js`
   - Check line 37-45
   - **Should match your local code**

---

### **4.2 Compare Local vs GitHub**

**In your terminal:**
```bash
# Check if local is ahead of GitHub
git status

# Check latest commit
git log -1

# Check if you need to push
git log origin/main..HEAD
```

**If you see commits:**
- ❌ Need to push: `git push origin main`

**If no commits:**
- ✅ Local and GitHub are synced

---

## ✅ **Step 5: Complete Verification Checklist**

### **Source Code:**
- [ ] `src/api/meldraClient.js` has security fix (no localhost fallback)
- [ ] `src/api/backendClient.js` has security fix (no localhost fallback)
- [ ] `src/pages/Login.jsx` has security fix
- [ ] `src/pages/VerifyEmail.jsx` has security fix
- [ ] All files match what's in GitHub

### **Vercel:**
- [ ] Latest deployment is from recent commit
- [ ] Build logs show `VITE_API_URL=https://insightsheet-production.up.railway.app`
- [ ] Source code in Vercel matches GitHub

### **Deployed Code:**
- [ ] JavaScript files don't contain `localhost:8000` or `localhost:8001`
- [ ] Browser console shows correct `VITE_API_URL`
- [ ] Network requests go to Railway URL, not localhost

### **Environment Variables:**
- [ ] `VITE_API_URL` set in Vercel = `https://insightsheet-production.up.railway.app`
- [ ] Variable set for **Production** environment
- [ ] Variable set for **Preview** environment

---

## 🎯 **Quick Verification Commands**

### **Check Local Code:**
```bash
# Check if files have localhost fallback (should NOT find anything)
grep -r "localhost:8000" src/
grep -r "localhost:8001" src/api/

# Check if files use VITE_API_URL correctly
grep -r "import.meta.env.VITE_API_URL" src/
```

### **Check What's Deployed:**
```javascript
// In browser console on https://insight.meldra.ai
console.log('API URL:', import.meta.env.VITE_API_URL);
// Should show: https://insightsheet-production.up.railway.app
```

---

## 🆘 **If Source Doesn't Match**

### **Problem: Local code is different from GitHub**

**Fix:**
```bash
git add .
git commit -m "Security fixes: Remove localhost fallbacks"
git push origin main
```

**Then:**
- Vercel will auto-deploy
- Wait 2-3 minutes
- Check again

---

### **Problem: GitHub code is different from Vercel**

**Fix:**
1. **Vercel Dashboard** → **Deployments**
2. **Click "..."** on latest deployment
3. **Click "Redeploy"**
4. **Uncheck "Use existing Build Cache"**
5. **Click "Redeploy"**
6. Wait 2-3 minutes

---

### **Problem: Environment variable not being used**

**Fix:**
1. **Vercel Dashboard** → **Settings** → **Environment Variables**
2. **Check `VITE_API_URL`:**
   - Value: `https://insightsheet-production.up.railway.app`
   - **Production** checkbox: ✅ Checked
3. **Save**
4. **Redeploy WITHOUT cache** (see above)

---

## 📊 **Summary**

**To verify everything is in sync:**

1. ✅ **Check source files** (local) - Should have security fixes
2. ✅ **Check GitHub** - Should match local
3. ✅ **Check Vercel source** - Should match GitHub
4. ✅ **Check deployment** - Should be from latest commit
5. ✅ **Check build logs** - Should show correct `VITE_API_URL`
6. ✅ **Check deployed JavaScript** - Should NOT have localhost
7. ✅ **Check browser console** - Should show correct API URL

**If all 7 checks pass:** ✅ Everything is in sync!

---

**Use this guide to verify your source code matches what's deployed!** 🔍
