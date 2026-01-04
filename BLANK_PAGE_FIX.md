# 🔧 Fix Blank Page Issue

## 🎯 Problem

Your Vercel deployment shows a blank page.

---

## 🔍 Quick Diagnosis

### **Step 1: Check Browser Console**

1. **Open your site:** `https://meldra-244xojuid-sumit-ags-projects.vercel.app`
2. **Press F12** (or Right-click → Inspect)
3. **Go to "Console" tab**
4. **Look for errors** (red text)

**Common errors:**
- `Failed to fetch` - Backend connection issue
- `Cannot find module` - Missing import
- `Unexpected token` - Syntax error
- `404` - Missing file

---

## 🛠️ Common Fixes

### **Fix 1: Check Build Logs**

1. **Vercel Dashboard** → Your Project → **Deployments**
2. **Click on latest deployment**
3. **Check "Build Logs"**
4. **Look for errors**

---

### **Fix 2: Verify Output Directory**

1. **Vercel Dashboard** → Settings → **General**
2. **Verify:**
   - **Output Directory:** `dist` ✅
   - **Build Command:** `npm run build` ✅

---

### **Fix 3: Check JavaScript Errors**

**In browser console, check for:**

```javascript
// Common issues:
- "Cannot read property of undefined"
- "Module not found"
- "Failed to load resource"
```

**If you see errors, share them and I'll help fix!**

---

### **Fix 4: Test Locally First**

1. **Run locally:**
   ```bash
   npm run build
   npm run preview
   ```

2. **Visit:** `http://localhost:4173`
3. **Does it work?** If yes, it's a Vercel config issue. If no, it's a code issue.

---

### **Fix 5: Check Environment Variables**

1. **Vercel Dashboard** → Settings → **Environment Variables**
2. **Verify:**
   - `VITE_API_URL` is set
   - No typos in variable names
   - Values are correct

---

### **Fix 6: Clear Browser Cache**

1. **Hard refresh:** `Ctrl + Shift + R` (Windows) or `Cmd + Shift + R` (Mac)
2. **Or:** Clear browser cache
3. **Try again**

---

### **Fix 7: Check Network Tab**

1. **Open DevTools** (F12)
2. **Go to "Network" tab**
3. **Reload page**
4. **Check:**
   - Is `index.html` loading? (200 status)
   - Are JavaScript files loading? (200 status)
   - Any 404 errors?

---

## 🔧 Quick Fixes to Try

### **Option 1: Redeploy**

1. **Vercel Dashboard** → Deployments
2. **Click "..."** on latest deployment
3. **Click "Redeploy"**
4. **Wait for build**

---

### **Option 2: Check vercel.json**

Your `vercel.json` looks correct, but verify:

```json
{
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

This ensures React Router works correctly.

---

### **Option 3: Add Error Boundary**

Add error handling to catch React errors:

```jsx
// src/ErrorBoundary.jsx
import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return <h1>Something went wrong.</h1>;
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
```

Then wrap your App:

```jsx
// src/main.jsx
import ErrorBoundary from './ErrorBoundary';

ReactDOM.createRoot(document.getElementById('root')).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);
```

---

## 📋 Diagnostic Checklist

- [ ] Check browser console for errors
- [ ] Check Vercel build logs
- [ ] Verify Output Directory is `dist`
- [ ] Test locally (`npm run build && npm run preview`)
- [ ] Check Network tab for failed requests
- [ ] Clear browser cache
- [ ] Check environment variables
- [ ] Try redeploying

---

## 🆘 What to Share

If still not working, share:

1. **Browser console errors** (screenshot or copy text)
2. **Vercel build logs** (any errors?)
3. **Network tab** (any failed requests?)
4. **Does it work locally?** (`npm run preview`)

---

## 🎯 Most Common Causes

1. **JavaScript error** - Check console
2. **Missing file** - Check build logs
3. **Routing issue** - Verify `vercel.json` rewrites
4. **Environment variable** - Check Vercel settings
5. **Build failed** - Check Vercel logs

---

**First step: Check browser console (F12) and share any errors you see!**
