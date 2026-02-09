# 🚀 App Store Quick Start - 15 Minutes

## ✅ You Already Have Everything Set Up!

Your Capacitor iOS project is ready. Here's the fastest path to App Store:

---

## 📋 Quick Checklist

### **Before You Start:**
- [ ] Mac computer (required)
- [ ] Apple Developer Account ($99/year) - [Sign up here](https://developer.apple.com)
- [ ] Xcode installed (from Mac App Store)

---

## 🎯 5-Step Process

### **Step 1: Build Web App** (2 minutes)
```bash
# From project root
npm run build
```

### **Step 2: Sync to iOS** (1 minute)
```bash
cd mobile
npx cap sync ios
```

### **Step 3: Open in Xcode** (1 minute)
```bash
cd mobile/ios
open App/App.xcworkspace
```

### **Step 4: Configure & Archive** (10 minutes)

**In Xcode:**

1. **Select Project** → `App` target
2. **Signing & Capabilities:**
   - Check "Automatically manage signing"
   - Select your Team (Apple Developer account)
3. **Select Device:** "Any iOS Device" (top left)
4. **Product → Archive**
5. **Wait for archive** (5-10 minutes)
6. **Distribute App → App Store Connect → Upload**

### **Step 5: Submit to App Store** (5 minutes)

1. **Go to [App Store Connect](https://appstoreconnect.apple.com)**
2. **Create New App:**
   - Name: Meldra
   - Bundle ID: com.meldra.insightsheet
   - Platform: iOS
3. **Fill in:**
   - Description
   - Screenshots (take from simulator)
   - Privacy Policy URL
4. **Select your uploaded build**
5. **Submit for Review**

---

## 📸 Quick Screenshot Guide

**Take screenshots from iPhone Simulator:**

1. **Open app in simulator**
2. **Press ⌘S** to take screenshot
3. **Screenshots saved to Desktop**
4. **Use these sizes:**
   - iPhone 15 Pro Max (6.7") - 1290 x 2796
   - iPhone 14 Pro (6.1") - 1179 x 2556
   - iPhone SE (4.7") - 750 x 1334

---

## ⚙️ Update Capacitor Config

Your config needs a small update. Update `mobile/ios/App/App/capacitor.config.json`:

```json
{
  "appId": "com.meldra.insightsheet",
  "appName": "Meldra",
  "webDir": "../../../dist",
  "bundledWebRuntime": false,
  "server": {
    "url": "https://meldra.ai",
    "cleartext": false
  }
}
```

**Note:** `webDir` should point to your `dist` folder relative to the config file location.

---

## 🎨 App Icon

**Create 1024x1024 icon:**
1. Design or use your logo
2. Save as PNG (no transparency)
3. In Xcode: Assets → AppIcon → Drag to 1024x1024 slot

---

## 📝 App Store Description Template

```
Meldra - Data Made Simple

Transform your Excel workflow with AI-powered tools.

Features:
• AI-Powered Excel Builder
• Excel to PowerPoint Converter
• P&L Statement Generator
• File Analyzer with AI Insights
• ZIP File Processor
• Zero Data Storage - Privacy First

Perfect for business professionals, students, and data analysts.

Download now!
```

---

## ⚠️ Common Issues

### **"webDir not found"**
**Fix:** Update `webDir` in capacitor.config.json to correct path

### **"No signing certificate"**
**Fix:** Add Apple ID in Xcode → Preferences → Accounts

### **"Bundle ID exists"**
**Fix:** Change to `com.yourname.meldra` or similar

---

## 💰 Costs

- **Apple Developer:** $99/year (required)
- **Everything else:** Free

---

## ⏱️ Timeline

- **Setup:** 15 minutes
- **Build & Upload:** 20 minutes
- **App Store Review:** 24-48 hours
- **Total:** ~2-3 days to live

---

## 🎉 That's It!

Once approved, your app will be live on the App Store!

**Need detailed steps?** See `APP_STORE_DEPLOYMENT_GUIDE.md`
