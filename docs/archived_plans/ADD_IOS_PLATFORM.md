# 📱 Adding iOS Platform to Capacitor

## ✅ Issue

Capacitor doesn't recognize the iOS platform even though the directory exists. This happens when the platform wasn't added through Capacitor CLI.

## 🔧 Solution

You have two options:

### **Option 1: Add iOS Platform (Recommended)**

This will create a fresh iOS project structure:

```bash
# Add iOS platform
npx cap add ios

# Then sync
npx cap sync ios
```

**Note:** This might overwrite your existing iOS setup. If you have custom configurations, use Option 2.

---

### **Option 2: Keep Existing iOS Project**

If you want to keep your existing iOS project, you can:

1. **Rename existing iOS folder:**
   ```bash
   cd mobile
   ren ios ios_backup
   ```

2. **Add iOS platform:**
   ```bash
   cd ..
   npx cap add ios
   ```

3. **Copy any custom files** from `ios_backup` to new `ios` folder

4. **Sync:**
   ```bash
   npx cap sync ios
   ```

---

## 🚀 Quick Fix (Try This First)

Since you already have an iOS project, let's try to make Capacitor recognize it:

```bash
# Remove the deprecated option from config
# (I'll update the config file)

# Then try sync again
npx cap sync ios
```

---

## 📋 Step-by-Step

### **1. Update Capacitor Config**

Remove the deprecated `bundledWebRuntime` option.

### **2. Add iOS Platform**

```bash
npx cap add ios
```

### **3. Sync**

```bash
npx cap sync ios
```

### **4. Open in Xcode** (when you have Mac)

```bash
npx cap open ios
```

---

## ⚠️ Important

- **On Windows:** You can sync, but you need a Mac to build and submit to App Store
- **Existing iOS project:** If you have custom configurations, back them up first

---

**Let me update the config and add the iOS platform for you!**
