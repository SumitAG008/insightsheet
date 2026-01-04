# ⚡ Quick Capacitor Setup

## ✅ What I Did

1. ✅ Added Capacitor packages to `package.json`
2. ✅ Created `capacitor.config.json` at root
3. ✅ Started installation

---

## 🚀 Complete Setup (Run These Commands)

```bash
# 1. Install Capacitor packages
npm install

# 2. Verify installation
npx cap --version

# 3. Build web app (if not already built)
npm run build

# 4. Sync to iOS
npx cap sync ios

# 5. Open in Xcode (when you have Mac)
npx cap open ios
```

---

## 📋 Step-by-Step

### **Step 1: Install**
```bash
npm install
```
Wait for installation to complete (~1-2 minutes)

### **Step 2: Verify**
```bash
npx cap --version
```
Should show version number (e.g., `6.0.0`)

### **Step 3: Build**
```bash
npm run build
```
Creates `dist/` folder

### **Step 4: Sync**
```bash
npx cap sync ios
```
Copies `dist/` to iOS app

### **Step 5: Open** (Mac only)
```bash
npx cap open ios
```
Opens Xcode

---

## ✅ Expected Output

After `npm install`, you should see:
```
+ @capacitor/cli@6.x.x
+ @capacitor/core@6.x.x
+ @capacitor/ios@6.x.x
+ @capacitor/android@6.x.x
```

After `npx cap sync ios`, you should see:
```
✔ Copying web assets from dist to ios/App/App/public in 2.45s
✔ Copying native bridge in 0.03s
✔ Copying capacitor.config.json in 0.01s
✔ Syncing iOS project in 0.52s
```

---

## 🐛 Troubleshooting

### **"npm error could not determine executable"**
**Solution:** Run `npm install` first

### **"Could not find web assets directory"**
**Solution:** Run `npm run build` first

### **"Capacitor CLI needs to run at root"**
**Solution:** Make sure you're in project root (where `package.json` is)

---

## 🎯 Next Steps After Sync

Once `npx cap sync ios` works:

1. **On Mac:** `npx cap open ios` → Build in Xcode
2. **On Windows:** Deploy web app first, iOS later

---

**Run `npm install` now, then try `npx cap sync ios`!** 🚀
