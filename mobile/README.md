# InsightSheet Mobile App 📱

Native iOS and Android applications for InsightSheet built with **Capacitor**.

## 🏗️ Architecture

This mobile app wraps the existing React web application into native iOS and Android apps using Capacitor. It provides:

- ✅ **True Native Apps** - Deploy to App Store & Google Play
- ✅ **90% Code Reuse** - Uses the same React codebase from `../src`
- ✅ **Native Features** - Access to device filesystem, camera, share, etc.
- ✅ **Offline Support** - Works without internet connection
- ✅ **Native Performance** - Native navigation and UI components

## 📋 Prerequisites

### For Both Platforms:
- Node.js 18+ and npm
- Git

### For iOS Development:
- macOS with Xcode 14+ installed
- CocoaPods: `sudo gem install cocoapods`
- iOS Simulator or physical iOS device
- Apple Developer Account (for deployment)

### For Android Development:
- Android Studio
- Java JDK 17+
- Android SDK (API 33+)
- Android device or emulator

## 🚀 Quick Start

### 1. Install Dependencies

```bash
cd mobile
npm run install:deps
```

### 2. Build Web App

```bash
# Build the React app first
npm run build:web
```

### 3. Add Platforms

```bash
# Add iOS platform
npm run add:ios

# Add Android platform
npm run add:android
```

### 4. Sync and Open

```bash
# For iOS
npm run sync:ios
npm run open:ios

# For Android
npm run sync:android
npm run open:android
```

## 🛠️ Development Workflow

### Option A: Use Built Web App (Recommended for Testing)

1. Make changes to React app in `../src`
2. Build web app: `npm run build:web`
3. Sync to mobile: `npm run sync`
4. Open in IDE: `npm run open:ios` or `npm run open:android`
5. Run from Xcode or Android Studio

### Option B: Live Reload (Development)

1. Start web dev server: `cd .. && npm run dev`
2. Edit `capacitor.config.ts`:
```typescript
server: {
  url: 'http://localhost:5173',
  cleartext: true
}
```
3. Sync and run: `npm run sync && npm run open:ios`
4. App will reload automatically when you save changes

**Important:** Remove the `server.url` before building for production!

## 📱 Building for Production

### iOS Production Build

1. **Configure App**:
   - Open Xcode: `npm run open:ios`
   - Select `ios/App/App.xcworkspace`
   - Update Bundle Identifier: `com.meldra.insightsheet`
   - Set Team and Signing Certificate

2. **Build**:
```bash
# For simulator
npm run sync:ios
# In Xcode: Product > Build

# For device/App Store
# In Xcode: Product > Archive
```

3. **Deploy**:
   - Xcode > Window > Organizer
   - Select archive > Distribute App
   - Follow App Store Connect submission process

### Android Production Build

1. **Generate Signing Key**:
```bash
cd android
keytool -genkey -v -keystore insightsheet-release.keystore \
  -alias insightsheet -keyalg RSA -keysize 2048 -validity 10000
```

2. **Configure Signing** (`android/gradle.properties`):
```properties
INSIGHTSHEET_RELEASE_STORE_FILE=insightsheet-release.keystore
INSIGHTSHEET_RELEASE_KEY_ALIAS=insightsheet
INSIGHTSHEET_RELEASE_STORE_PASSWORD=your_password
INSIGHTSHEET_RELEASE_KEY_PASSWORD=your_password
```

3. **Build APK/AAB**:
```bash
# APK (for direct install)
npm run build:android

# AAB (for Play Store)
cd android && ./gradlew bundleRelease
```

4. **Output Locations**:
   - APK: `android/app/build/outputs/apk/release/app-release.apk`
   - AAB: `android/app/build/outputs/bundle/release/app-release.aab`

## 🎨 Assets & Branding

### App Icons

Place your app icons in:
- iOS: `ios/App/App/Assets.xcassets/AppIcon.appiconset/`
- Android: `android/app/src/main/res/mipmap-*/`

Recommended sizes:
- iOS: 1024x1024 (App Store), various sizes in Xcode
- Android: 512x512 (Play Store), mdpi to xxxhdpi

**Quick Generate**: Use https://icon.kitchen or https://appicon.co

### Splash Screens

Configure in `capacitor.config.ts`:
- Background color: `#1e3a8a` (InsightSheet blue)
- Logo: Add to `ios/App/App/Assets.xcassets/Splash.imageset/`
- Android: `android/app/src/main/res/drawable-*/splash.png`

## 📦 Available Scripts

```bash
# Install
npm run install:deps          # Install Capacitor dependencies

# Build & Sync
npm run build:web             # Build React app
npm run sync                  # Sync web build to both platforms
npm run sync:ios              # Sync to iOS only
npm run sync:android          # Sync to Android only

# Development
npm run open:ios              # Open iOS project in Xcode
npm run open:android          # Open Android project in Android Studio
npm run run:ios               # Build and run on iOS device/simulator
npm run run:android           # Build and run on Android device/emulator

# Platform Management
npm run add:ios               # Add iOS platform
npm run add:android           # Add Android platform
npm run update                # Update Capacitor dependencies

# Production
npm run build:ios             # Build production iOS app
npm run build:android         # Build production Android APK
```

## 🔧 Configuration

### App Information

Edit `capacitor.config.ts`:
- `appId`: `com.meldra.insightsheet`
- `appName`: "InsightSheet"
- `webDir`: `../dist` (points to built React app)

### Permissions

**iOS** (`ios/App/App/Info.plist`):
```xml
<key>NSPhotoLibraryUsageDescription</key>
<string>To upload Excel files from your photos</string>
<key>NSCameraUsageDescription</key>
<string>To scan documents</string>
```

**Android** (`android/app/src/main/AndroidManifest.xml`):
```xml
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />
<uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" />
```

## 🐛 Troubleshooting

### iOS Issues

**Pods Error:**
```bash
cd ios/App
pod install --repo-update
```

**Code Signing Error:**
- Xcode > Signing & Capabilities
- Select your Team
- Enable "Automatically manage signing"

**Simulator Not Loading:**
```bash
npm run sync:ios
# In Xcode: Product > Clean Build Folder
```

### Android Issues

**Gradle Sync Failed:**
```bash
cd android
./gradlew clean
./gradlew build
```

**SDK Version Mismatch:**
- Open Android Studio > SDK Manager
- Install Android SDK 33+

**ADB Device Not Found:**
```bash
adb devices
adb kill-server
adb start-server
```

## 📲 Testing

### iOS Testing

1. **Simulator:**
```bash
npm run run:ios
# Or in Xcode: Select simulator > Run
```

2. **Physical Device:**
   - Connect iPhone via USB
   - Trust computer on device
   - Xcode: Select your device > Run

### Android Testing

1. **Emulator:**
   - Android Studio > Device Manager > Create Virtual Device
   - Start emulator
   - `npm run run:android`

2. **Physical Device:**
   - Enable Developer Options on Android
   - Enable USB Debugging
   - Connect via USB
   - `adb devices` to verify
   - `npm run run:android`

## 🚢 Deployment

### iOS App Store

1. Build archive in Xcode
2. Upload to App Store Connect
3. Configure app metadata
4. Submit for review
5. Wait for approval (~24-48 hours)

**Checklist:**
- [ ] App screenshots (6.5" and 5.5")
- [ ] App icon (1024x1024)
- [ ] Privacy policy URL
- [ ] App description and keywords
- [ ] Version and build number

### Google Play Store

1. Build AAB: `cd android && ./gradlew bundleRelease`
2. Go to Google Play Console
3. Create new app
4. Upload AAB
5. Complete store listing
6. Submit for review

**Checklist:**
- [ ] Feature graphic (1024x500)
- [ ] Screenshots (phone and tablet)
- [ ] App icon (512x512)
- [ ] Privacy policy URL
- [ ] Content rating questionnaire

## 🔐 Security

### API Keys

**DO NOT** commit sensitive keys to git!

Use environment variables:
```javascript
// In your React app
const API_KEY = import.meta.env.VITE_API_KEY;
```

Create `../.env.local`:
```
VITE_API_KEY=your_key_here
```

### HTTPS

Always use HTTPS in production:
```typescript
// capacitor.config.ts
server: {
  androidScheme: 'https',
  iosScheme: 'https'
}
```

## 📚 Resources

- [Capacitor Docs](https://capacitorjs.com/docs)
- [iOS Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/)
- [Android Design Guidelines](https://developer.android.com/design)
- [App Store Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- [Google Play Policies](https://play.google.com/about/developer-content-policy/)

## 🆘 Need Help?

- **Capacitor Issues**: https://github.com/ionic-team/capacitor/issues
- **iOS Development**: https://developer.apple.com/forums/
- **Android Development**: https://stackoverflow.com/questions/tagged/android

## 📄 License

Same as main InsightSheet application.

---

**Built with ❤️ by Meldra**
