# 🚀 Mobile App Setup Guide

Quick setup guide to get your InsightSheet mobile app running.

## Step-by-Step Setup

### 1️⃣ Install Mobile Dependencies (1 minute)

```bash
cd mobile
npm install
```

This installs Capacitor and all native dependencies.

### 2️⃣ Build the Web App (1 minute)

```bash
cd ..
npm install  # If you haven't already
npm run build
```

This creates the `dist/` folder that Capacitor will wrap.

### 3️⃣ Add Mobile Platforms (2 minutes)

```bash
cd mobile

# Add iOS (macOS only)
npm run add:ios

# Add Android
npm run add:android
```

This creates `ios/` and `android/` folders with native projects.

### 4️⃣ Sync Web App to Native (30 seconds)

```bash
npm run sync
```

This copies your built web app into the native projects.

### 5️⃣ Open in IDE (30 seconds)

**For iOS:**
```bash
npm run open:ios
```
This opens Xcode. Click the ▶️ Play button to run in simulator.

**For Android:**
```bash
npm run open:android
```
This opens Android Studio. Click the ▶️ Run button.

---

## 🎯 Quick Commands

### Daily Development

```bash
# 1. Make changes to React app in ../src
# 2. Build and sync:
cd mobile
npm run sync

# 3. Run
npm run run:ios       # iOS
npm run run:android   # Android
```

### Live Reload (Advanced)

For faster development with auto-reload:

1. Start web server:
```bash
cd ..
npm run dev
```

2. Edit `mobile/capacitor.config.ts`, uncomment:
```typescript
server: {
  url: 'http://localhost:5173',
  cleartext: true
}
```

3. Sync and run:
```bash
cd mobile
npm run sync
npm run open:ios  # or open:android
```

Now changes auto-reload! 🔥

**Remember:** Comment out `server.url` before production builds!

---

## ✅ Verification Checklist

After setup, verify:

- [ ] `mobile/node_modules/` exists
- [ ] `mobile/ios/` exists (macOS only)
- [ ] `mobile/android/` exists
- [ ] `../dist/` exists (built web app)
- [ ] Xcode opens without errors (iOS)
- [ ] Android Studio syncs successfully (Android)

---

## 🔧 First-Time Tool Setup

### iOS (macOS only)

1. **Install Xcode:**
   - Mac App Store > Search "Xcode" > Install
   - Open Xcode > Accept license

2. **Install CocoaPods:**
```bash
sudo gem install cocoapods
```

3. **Install iOS Simulator:**
   - Xcode > Preferences > Components > Install simulators

### Android

1. **Install Android Studio:**
   - Download from https://developer.android.com/studio
   - Run installer
   - Follow setup wizard

2. **Install SDK:**
   - Android Studio > More Actions > SDK Manager
   - Install Android SDK 33+
   - Install Build Tools 34+

3. **Install JDK:**
```bash
# macOS
brew install openjdk@17

# Ubuntu/Debian
sudo apt-get install openjdk-17-jdk

# Windows - Download from https://adoptium.net/
```

4. **Set JAVA_HOME:**
```bash
# macOS/Linux (~/.zshrc or ~/.bashrc)
export JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64
export ANDROID_HOME=$HOME/Android/Sdk
export PATH=$PATH:$ANDROID_HOME/tools:$ANDROID_HOME/platform-tools

# Windows (System Environment Variables)
JAVA_HOME=C:\Program Files\Java\jdk-17
ANDROID_HOME=C:\Users\YourName\AppData\Local\Android\Sdk
```

---

## 📱 Testing on Real Devices

### iOS Device

1. Connect iPhone via USB
2. Trust computer on iPhone
3. Xcode > Top bar > Select your iPhone
4. Click ▶️ Run

**First time:** Xcode will prompt for Developer account. Use your Apple ID (free).

### Android Device

1. **Enable Developer Mode:**
   - Settings > About Phone > Tap "Build Number" 7 times

2. **Enable USB Debugging:**
   - Settings > Developer Options > USB Debugging > ON

3. **Connect USB:**
```bash
adb devices
# Should show your device
```

4. Android Studio > Select your device > Run

---

## 🐛 Common Issues

### "Command not found: npx"

**Fix:** Install Node.js from https://nodejs.org/

### "Pod install failed" (iOS)

**Fix:**
```bash
cd mobile/ios/App
pod repo update
pod install
```

### "Gradle sync failed" (Android)

**Fix:**
```bash
cd mobile/android
chmod +x gradlew
./gradlew clean
```

### "No iOS code signing identities found"

**Fix:**
- Xcode > Preferences > Accounts > Add Apple ID
- Select project > Signing & Capabilities > Select Team

### "dist folder not found"

**Fix:**
```bash
cd ..
npm run build
```

### "ADB not recognized" (Windows)

**Fix:** Add to PATH:
```
C:\Users\YourName\AppData\Local\Android\Sdk\platform-tools
```

---

## 🎨 Customize Your App

### Change App Name

`mobile/capacitor.config.ts`:
```typescript
appName: 'InsightSheet',  // Change this
```

### Change App ID

`mobile/capacitor.config.ts`:
```typescript
appId: 'com.meldra.insightsheet',  // Change this
```

**Important:** Must be unique for app stores!
Format: `com.yourcompany.appname`

### Change Colors

`mobile/capacitor.config.ts`:
```typescript
SplashScreen: {
  backgroundColor: "#1e3a8a",  // Splash background
},
StatusBar: {
  backgroundColor: '#1e3a8a'   // Top bar color
}
```

### Add App Icon

1. Generate icons: https://icon.kitchen
2. Replace files in:
   - `mobile/ios/App/App/Assets.xcassets/AppIcon.appiconset/`
   - `mobile/android/app/src/main/res/mipmap-*/`

---

## 📦 Production Builds

### iOS

```bash
cd mobile
npm run sync:ios
npm run open:ios
```

In Xcode:
1. Product > Archive
2. Distribute App > App Store Connect
3. Upload

### Android

```bash
cd mobile
npm run build:android
```

Output: `mobile/android/app/build/outputs/apk/release/app-release.apk`

---

## 📚 Next Steps

1. ✅ Complete this setup
2. 📖 Read full [README.md](./README.md)
3. 🎨 Customize icons and splash screens
4. 🧪 Test on real devices
5. 🚀 Deploy to App Store / Play Store

---

**Need help?** Check the full [README.md](./README.md) for detailed documentation!
