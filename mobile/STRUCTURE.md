# Mobile App Structure 📂

Understanding the mobile app folder structure and how it relates to the main web app.

## Overview

```
insightsheet/                    # Main project root
├── src/                         # React web app source
├── dist/                        # Built web app (generated)
├── public/                      # Web app public assets
├── package.json                 # Web app dependencies
│
└── mobile/                      # 👈 Mobile app (this folder)
    ├── package.json             # Capacitor dependencies
    ├── capacitor.config.ts      # Capacitor configuration
    ├── quick-start.sh           # Setup automation script
    │
    ├── ios/                     # iOS native project (generated)
    │   └── App/
    │       ├── App.xcworkspace  # Open this in Xcode!
    │       ├── App.xcodeproj    # Xcode project
    │       ├── App/             # iOS app resources
    │       │   ├── Assets.xcassets/  # Icons, splash screens
    │       │   ├── Info.plist   # iOS app configuration
    │       │   └── public/      # Web app files (synced from ../dist)
    │       └── Pods/            # CocoaPods dependencies
    │
    ├── android/                 # Android native project (generated)
    │   ├── app/
    │   │   ├── src/main/
    │   │   │   ├── AndroidManifest.xml  # App permissions & config
    │   │   │   ├── res/         # Android resources
    │   │   │   │   ├── mipmap-*/ # App icons
    │   │   │   │   ├── drawable/ # Splash screens
    │   │   │   │   └── values/  # Strings, colors, styles
    │   │   │   └── assets/
    │   │   │       └── public/  # Web app files (synced from ../dist)
    │   │   └── build.gradle     # App build configuration
    │   ├── build.gradle         # Project build configuration
    │   └── gradle.properties    # Gradle properties
    │
    └── Documentation/           # Guides (you are here)
        ├── README.md            # Main documentation
        ├── SETUP.md             # Quick setup guide
        ├── STRUCTURE.md         # This file
        ├── ios-setup.md         # iOS specific guide
        └── android-setup.md     # Android specific guide
```

## Key Files Explained

### `capacitor.config.ts`

Main configuration file for Capacitor:

```typescript
{
  appId: 'com.meldra.insightsheet',    // Unique app identifier
  appName: 'InsightSheet',              // App display name
  webDir: '../dist',                    // Points to built web app
  // ... plugin configurations
}
```

**When to edit:**
- Changing app ID or name
- Configuring plugins (splash screen, status bar, etc.)
- Setting up server URL for live reload

### `package.json`

Mobile-specific dependencies:

```json
{
  "dependencies": {
    "@capacitor/core": "^6.1.0",       // Core Capacitor
    "@capacitor/ios": "^6.1.0",        // iOS platform
    "@capacitor/android": "^6.1.0",    // Android platform
    "@capacitor/filesystem": "^6.0.0", // Native file access
    // ... other Capacitor plugins
  }
}
```

**When to edit:**
- Adding new Capacitor plugins
- Updating Capacitor versions

### iOS Structure

```
ios/App/
├── App.xcworkspace          # ⭐ ALWAYS OPEN THIS, not .xcodeproj
├── App.xcodeproj            # Xcode project (modified by Capacitor)
├── Podfile                  # CocoaPods dependencies
├── App/
│   ├── Info.plist           # App configuration and permissions
│   ├── Assets.xcassets/
│   │   ├── AppIcon.appiconset/    # App icons (all sizes)
│   │   └── Splash.imageset/       # Splash screen images
│   ├── public/              # 🔄 Synced from ../dist (don't edit directly)
│   └── config.xml           # Capacitor config (auto-generated)
└── Pods/                    # CocoaPods dependencies (don't edit)
```

**Files you'll edit:**
- `Info.plist` - Permissions, supported file types
- `Assets.xcassets/` - App icons and splash screens
- Xcode project settings - Signing, capabilities, version

**Files auto-generated (don't edit):**
- `public/` - Synced by `npm run sync`
- `Pods/` - Managed by CocoaPods
- `config.xml` - Generated from capacitor.config.ts

### Android Structure

```
android/
├── app/
│   ├── src/main/
│   │   ├── AndroidManifest.xml      # ⭐ App config, permissions
│   │   ├── res/
│   │   │   ├── mipmap-mdpi/         # App icons 48x48
│   │   │   ├── mipmap-hdpi/         # App icons 72x72
│   │   │   ├── mipmap-xhdpi/        # App icons 96x96
│   │   │   ├── mipmap-xxhdpi/       # App icons 144x144
│   │   │   ├── mipmap-xxxhdpi/      # App icons 192x192
│   │   │   ├── drawable/            # Splash screens
│   │   │   └── values/
│   │   │       ├── strings.xml      # App name, text strings
│   │   │       ├── colors.xml       # Color definitions
│   │   │       └── styles.xml       # Android themes
│   │   └── assets/
│   │       └── public/              # 🔄 Synced from ../dist
│   ├── build.gradle                 # ⭐ App build config
│   └── proguard-rules.pro           # Code optimization rules
├── build.gradle                     # Project build config
├── gradle.properties                # Gradle settings (signing keys)
└── settings.gradle                  # Project settings
```

**Files you'll edit:**
- `AndroidManifest.xml` - Permissions, activities
- `res/` - Icons, splash screens, strings, colors
- `app/build.gradle` - Version, signing, dependencies
- `gradle.properties` - Release signing credentials

**Files auto-generated (don't edit):**
- `assets/public/` - Synced by `npm run sync`
- `build/` - Build outputs
- `.gradle/` - Gradle cache

## How Syncing Works

### The Sync Process

When you run `npm run sync`:

1. **Build web app** → Creates `../dist/`
2. **Copy to iOS** → `../dist/` → `ios/App/App/public/`
3. **Copy to Android** → `../dist/` → `android/app/src/main/assets/public/`
4. **Update configs** → Capacitor generates native config files
5. **Update plugins** → Installs/updates Capacitor plugins

### What Gets Synced

✅ **Synced from web app:**
- HTML, CSS, JavaScript files
- Images, fonts, other assets
- Service workers
- manifest.json

❌ **Not synced (native-only):**
- App icons (configured in native projects)
- Splash screens (configured in native projects)
- Native code and plugins
- Certificates and signing keys

### When to Sync

Run `npm run sync` whenever you:
- Build a new version of the web app
- Add a new Capacitor plugin
- Change capacitor.config.ts
- Update Capacitor version

**Pro tip:** Most development changes to React code don't need a full sync. Use live reload instead (see SETUP.md).

## Development Workflow

### Option 1: Build & Sync (Production-like)

```bash
# 1. Make changes in ../src/
# 2. Build
cd ..
npm run build

# 3. Sync
cd mobile
npm run sync

# 4. Run
npm run open:ios     # or open:android
# Click play in IDE
```

**Pros:** Matches production exactly
**Cons:** Slow (rebuild each time)

### Option 2: Live Reload (Fast)

```bash
# 1. Start dev server
cd ..
npm run dev
# Note the URL (usually http://localhost:5173)

# 2. Configure Capacitor
# Edit mobile/capacitor.config.ts:
server: {
  url: 'http://localhost:5173',
  cleartext: true
}

# 3. Sync once
cd mobile
npm run sync

# 4. Run
npm run open:ios
# Now changes auto-reload! 🔥
```

**Pros:** Instant updates, hot reload
**Cons:** Some native features may not work

**⚠️ Important:** Remove `server.url` before production builds!

### Option 3: Hybrid (Best of both)

- Use **Live Reload** for UI/logic changes
- Use **Build & Sync** for testing native features
- Use **Build & Sync** before releasing

## File Size Considerations

### Web App Size

The web app (`dist/`) is embedded in your native app:

**Typical sizes:**
- HTML/CSS/JS: 500 KB - 2 MB
- Images/fonts: 1 MB - 5 MB
- Total: ~2-7 MB

**Optimization tips:**
- Minimize images (TinyPNG, ImageOptim)
- Enable gzip/brotli compression
- Code splitting (React lazy loading)
- Tree shaking (Vite does this automatically)

### iOS App Size

**Final .ipa size:**
- Your web app: 2-7 MB
- Capacitor framework: 3-5 MB
- iOS dependencies: 5-10 MB
- **Total: ~10-25 MB**

### Android App Size

**Final .apk/.aab size:**
- Your web app: 2-7 MB
- Capacitor framework: 2-3 MB
- Android dependencies: 3-8 MB
- **Total: ~7-20 MB**

**App Thinning:**
- iOS: Automatic via App Store
- Android: AAB format optimizes per-device

## Version Management

### Semantic Versioning

Follow semver: `MAJOR.MINOR.PATCH`

```
1.0.0 → Initial release
1.0.1 → Bug fixes
1.1.0 → New features (backwards compatible)
2.0.0 → Breaking changes
```

### iOS Version Numbers

Set in Xcode > General:
- **Version:** User-facing (1.0.0, 1.1.0)
- **Build:** Incremental (1, 2, 3, ...)

**App Store requirement:**
- Each upload must have unique build number
- Version can stay same for bug fixes

### Android Version Numbers

Set in `android/app/build.gradle`:
```gradle
versionCode 1          // Integer, increment each release
versionName "1.0.0"    // String, user-facing version
```

**Play Store requirement:**
- Each upload must have higher versionCode
- versionName is for users only

### Keeping in Sync

Update all three locations:
1. Web app `package.json` → `"version": "1.0.0"`
2. iOS Xcode → Version and Build
3. Android `build.gradle` → versionName and versionCode

**Automation tip:** Create a script to update all at once!

## Git Strategy

### What to Commit

✅ **Always commit:**
- `mobile/package.json`
- `mobile/capacitor.config.ts`
- `mobile/.gitignore`
- `mobile/*.md` (documentation)
- Native configs (AndroidManifest.xml, Info.plist)

❌ **Never commit:**
- `mobile/node_modules/`
- `mobile/ios/App/Pods/`
- `mobile/ios/App/App/public/` (synced)
- `mobile/android/app/build/` (build output)
- `mobile/android/.gradle/`
- Signing keys/certificates

⚠️ **Conditionally commit:**
- `mobile/ios/` - Personal: No, Team: Yes (Xcode settings)
- `mobile/android/` - Personal: No, Team: Yes (AS settings)

### `.gitignore`

We've included `mobile/.gitignore`:

```
node_modules/
ios/App/Pods
android/.gradle
android/build
# ... etc
```

This keeps your repo clean!

## Troubleshooting

### "public folder not found"

**Cause:** Web app not built
**Fix:**
```bash
cd ..
npm run build
cd mobile
npm run sync
```

### "Pod install failed"

**Cause:** CocoaPods issues
**Fix:**
```bash
cd ios/App
pod repo update
pod install
```

### "Gradle sync failed"

**Cause:** Android Studio/Gradle issues
**Fix:**
```bash
cd android
./gradlew clean
./gradlew build
```

### "Module not found" errors

**Cause:** Dependencies not installed
**Fix:**
```bash
cd mobile
npm install
npx cap sync
```

### Changes not appearing

**Cause:** Web app not synced
**Fix:**
```bash
npm run build:web
npm run sync
```

## Best Practices

### 1. Keep Web App Portable

Don't hard-code platform-specific logic in web app:

```javascript
// ❌ Bad
if (window.Capacitor) {
  // iOS-specific code
}

// ✅ Good
import { Capacitor } from '@capacitor/core';
if (Capacitor.isNativePlatform()) {
  // Works for both iOS and Android
}
```

### 2. Test on Both Platforms

Features may behave differently:
- File pickers
- Network requests
- Storage APIs

Always test iOS AND Android!

### 3. Regular Syncs

After major changes, sync to catch issues early:
```bash
npm run sync
```

### 4. Keep Docs Updated

When you change configs, update:
- capacitor.config.ts comments
- This documentation
- Team wiki/notes

### 5. Version Control

Commit often, especially before:
- Adding new platforms
- Updating Capacitor
- Major refactors

## Resources

- [Capacitor File Structure](https://capacitorjs.com/docs/basics/workflow)
- [iOS Project Structure](https://developer.apple.com/documentation/xcode/creating-an-xcode-project-for-an-app)
- [Android Project Structure](https://developer.android.com/studio/projects)

---

**Now you understand the structure! Ready to build? 🚀**
