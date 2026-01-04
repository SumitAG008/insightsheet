# 🔧 Capacitor Sync Fix

## ✅ Issue Fixed

The problem was:
1. **Capacitor CLI needs to run from project root** (where `package.json` is)
2. **Main config file needed** at root level

## ✅ Solution Applied

Created `capacitor.config.json` at project root with correct paths.

---

## 🚀 Correct Commands

### **From Project Root:**

```bash
# Make sure you're in project root (where package.json is)
cd C:\Users\sumit\Documents\Insightlite

# Build web app first
npm run build

# Sync to iOS (from root, not mobile directory)
npx cap sync ios

# Open in Xcode
npx cap open ios
```

### **For Android:**

```bash
# From project root
npx cap sync android

# Open in Android Studio
npx cap open android
```

---

## ⚠️ Important Notes

1. **Always run Capacitor commands from project root**
   - ✅ `C:\Users\sumit\Documents\Insightlite\`
   - ❌ `C:\Users\sumit\Documents\Insightlite\mobile\`

2. **Build web app first:**
   ```bash
   npm run build
   ```
   This creates the `dist/` folder that Capacitor needs.

3. **Then sync:**
   ```bash
   npx cap sync ios
   ```

---

## 📋 Step-by-Step (Correct Way)

```bash
# 1. Go to project root
cd C:\Users\sumit\Documents\Insightlite

# 2. Build web app
npm run build

# 3. Sync to iOS
npx cap sync ios

# 4. Open in Xcode (if you have Mac)
npx cap open ios
```

---

## 🎯 What Changed

- ✅ Created `capacitor.config.json` at project root
- ✅ Set `webDir` to `dist` (relative to root)
- ✅ All Capacitor commands now work from root

---

## ✅ Try Again

```bash
# From project root
cd C:\Users\sumit\Documents\Insightlite
npm run build
npx cap sync ios
```

This should work now! 🎉
