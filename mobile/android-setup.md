# Android-Specific Setup Guide 🤖

Detailed instructions for Android app development and deployment.

## Prerequisites

### Required Software

1. **Android Studio** (Latest version)
   - Download: https://developer.android.com/studio
   - Includes Android SDK, AVD Manager, and build tools

2. **Java Development Kit (JDK) 17+**
   ```bash
   # Check version
   java -version

   # Install (Ubuntu/Debian)
   sudo apt-get update
   sudo apt-get install openjdk-17-jdk

   # Install (macOS)
   brew install openjdk@17

   # Install (Windows)
   # Download from https://adoptium.net/
   ```

3. **Environment Variables**
   ```bash
   # Add to ~/.bashrc or ~/.zshrc (Linux/macOS)
   export JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64
   export ANDROID_HOME=$HOME/Android/Sdk
   export PATH=$PATH:$ANDROID_HOME/emulator
   export PATH=$PATH:$ANDROID_HOME/platform-tools
   export PATH=$PATH:$ANDROID_HOME/tools
   export PATH=$PATH:$ANDROID_HOME/tools/bin

   # Windows - Set in System Environment Variables
   # JAVA_HOME: C:\Program Files\Java\jdk-17
   # ANDROID_HOME: C:\Users\YourName\AppData\Local\Android\Sdk
   ```

## Initial Setup

### 1. Add Android Platform

```bash
cd mobile
npm run add:android
```

This creates the `android/` directory with:
- `android/app/` - Main application code
- `android/build.gradle` - Build configuration
- `android/gradle/` - Gradle wrapper files

### 2. Open in Android Studio

```bash
npm run open:android
```

First time:
1. Android Studio will sync Gradle (2-5 minutes)
2. May prompt to update Gradle plugin - click "Update"
3. May need to accept Android SDK licenses

### 3. Configure SDK

Android Studio > Tools > SDK Manager:
- ✅ Android SDK Platform 33+
- ✅ Android SDK Build-Tools 34+
- ✅ Android Emulator
- ✅ Android SDK Platform-Tools

## Development

### Build and Run

**From Command Line:**
```bash
# Build web app first
npm run build:web

# Sync to Android
npm run sync:android

# Run on emulator/device
npm run run:android
```

**From Android Studio:**
1. Click ▶️ Run button (or Shift+F10)
2. Select device/emulator
3. App will install and launch

### Create Emulator

Android Studio > Tools > Device Manager > Create Device:

**Recommended:**
- Device: Pixel 7 Pro
- System Image: Android 13 (API 33) or higher
- RAM: 2048 MB minimum
- Internal Storage: 2048 MB minimum

**Quick Setup:**
```bash
# List available system images
sdkmanager --list

# Install system image
sdkmanager "system-images;android-33;google_apis;x86_64"

# Create emulator
avdmanager create avd -n Pixel7 -k "system-images;android-33;google_apis;x86_64" -d "pixel_7_pro"

# Start emulator
emulator -avd Pixel7
```

### Test on Physical Device

1. **Enable Developer Options:**
   - Settings > About Phone
   - Tap "Build Number" 7 times
   - Enter PIN if prompted

2. **Enable USB Debugging:**
   - Settings > System > Developer Options
   - Enable "USB debugging"

3. **Connect Device:**
   ```bash
   # Connect via USB
   # Accept "Allow USB debugging" on device

   # Verify connection
   adb devices
   # Should show: [device_id] device
   ```

4. **Run:**
   ```bash
   npm run run:android
   ```

## App Configuration

### App Information

Edit `android/app/src/main/res/values/strings.xml`:
```xml
<resources>
    <string name="app_name">InsightSheet</string>
    <string name="title_activity_main">InsightSheet</string>
    <string name="package_name">com.meldra.insightsheet</string>
</resources>
```

### App ID and Version

Edit `android/app/build.gradle`:
```gradle
android {
    namespace "com.meldra.insightsheet"
    compileSdkVersion 34

    defaultConfig {
        applicationId "com.meldra.insightsheet"
        minSdkVersion 22
        targetSdkVersion 34
        versionCode 1
        versionName "1.0.0"
    }
}
```

**Version Guidelines:**
- `versionCode`: Integer, increment for each release (1, 2, 3...)
- `versionName`: String, user-facing version ("1.0.0", "1.1.0")

### Permissions

Edit `android/app/src/main/AndroidManifest.xml`:
```xml
<manifest>
    <!-- Internet access -->
    <uses-permission android:name="android.permission.INTERNET" />

    <!-- File access -->
    <uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />
    <uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE"
                     android:maxSdkVersion="32" />

    <!-- Camera (if needed) -->
    <uses-permission android:name="android.permission.CAMERA" />

    <!-- Network state -->
    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
</manifest>
```

## Signing & Release

### Generate Signing Key

**Production keystore (keep secure!):**
```bash
cd android/app

keytool -genkeypair -v -storetype PKCS12 \
  -keystore insightsheet-release.keystore \
  -alias insightsheet \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000

# You'll be prompted for:
# - Keystore password (remember this!)
# - Key password (remember this!)
# - Your name, organization, etc.
```

**⚠️ IMPORTANT:** Backup this keystore! If lost, you can't update your app on Play Store.

### Configure Signing

Create `android/gradle.properties` (add to .gitignore!):
```properties
INSIGHTSHEET_RELEASE_STORE_FILE=insightsheet-release.keystore
INSIGHTSHEET_RELEASE_KEY_ALIAS=insightsheet
INSIGHTSHEET_RELEASE_STORE_PASSWORD=your_keystore_password
INSIGHTSHEET_RELEASE_KEY_PASSWORD=your_key_password
```

Edit `android/app/build.gradle`:
```gradle
android {
    ...

    signingConfigs {
        release {
            if (project.hasProperty('INSIGHTSHEET_RELEASE_STORE_FILE')) {
                storeFile file(INSIGHTSHEET_RELEASE_STORE_FILE)
                storePassword INSIGHTSHEET_RELEASE_STORE_PASSWORD
                keyAlias INSIGHTSHEET_RELEASE_KEY_ALIAS
                keyPassword INSIGHTSHEET_RELEASE_KEY_PASSWORD
            }
        }
    }

    buildTypes {
        release {
            signingConfig signingConfigs.release
            minifyEnabled true
            shrinkResources true
            proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
        }
    }
}
```

### Build Release APK

```bash
cd android

# Build APK (for testing/direct distribution)
./gradlew assembleRelease

# Output: app/build/outputs/apk/release/app-release.apk
```

### Build App Bundle (AAB) for Play Store

```bash
cd android

# Build AAB (required for Play Store)
./gradlew bundleRelease

# Output: app/build/outputs/bundle/release/app-release.aab
```

**APK vs AAB:**
- APK: Direct install, larger file size, all architectures
- AAB: Play Store only, optimized downloads, smaller

## App Icons & Assets

### App Icon

**Sizes needed:**
- `mipmap-mdpi`: 48x48 px
- `mipmap-hdpi`: 72x72 px
- `mipmap-xhdpi`: 96x96 px
- `mipmap-xxhdpi`: 144x144 px
- `mipmap-xxxhdpi`: 192x192 px

**Generate automatically:**
1. Visit https://icon.kitchen or https://appicon.co
2. Upload 1024x1024 icon
3. Download Android assets
4. Replace files in `android/app/src/main/res/mipmap-*/`

**Adaptive icons (Android 8+):**
- Foreground: Your logo with transparency
- Background: Solid color or pattern
- Files: `ic_launcher_foreground.xml`, `ic_launcher_background.xml`

### Splash Screen

Create splash drawable in `android/app/src/main/res/drawable/`:

```xml
<!-- splash.xml -->
<?xml version="1.0" encoding="utf-8"?>
<layer-list xmlns:android="http://schemas.android.com/apk/res/android">
    <!-- Background color -->
    <item android:drawable="@color/splash_background"/>

    <!-- Logo (centered) -->
    <item>
        <bitmap
            android:gravity="center"
            android:src="@drawable/splash_logo"/>
    </item>
</layer-list>
```

Add colors in `android/app/src/main/res/values/colors.xml`:
```xml
<resources>
    <color name="splash_background">#1e3a8a</color>
</resources>
```

## Google Play Store Deployment

### 1. Prepare Assets

**Required:**
- App icon: 512x512 PNG
- Feature graphic: 1024x500 PNG
- Screenshots: At least 2 (phone and tablet)
- Privacy policy URL
- App description (4000 chars max)
- Short description (80 chars max)

### 2. Create Play Console Account

1. Visit https://play.google.com/console
2. Pay one-time $25 registration fee
3. Complete account details

### 3. Create App

1. Play Console > Create app
2. Fill in app details:
   - App name: "InsightSheet"
   - Default language: English
   - App/Game: App
   - Free/Paid: Free

### 4. Complete Store Listing

**Main store listing:**
- App name
- Short description
- Full description
- App icon
- Feature graphic
- Screenshots (phone, 7-inch, 10-inch tablets)
- Category: Productivity
- Content rating: Complete questionnaire

### 5. Set Up App Access

- Free access / Special access
- If special access, provide demo credentials

### 6. Set Up Content Rating

- Complete IARC questionnaire
- Submit for rating
- Ratings appear automatically

### 7. Upload App Bundle

1. Production > Create release
2. Upload AAB file
3. Set version name and release notes
4. Review release
5. Submit for review

**Review time:** Usually 1-7 days

### 8. Track Deployment

Play Console > Dashboard shows:
- Review status
- Install statistics
- Crash reports
- User ratings & reviews

## Optimization

### Reduce APK Size

**Enable R8 (already enabled):**
```gradle
buildTypes {
    release {
        minifyEnabled true
        shrinkResources true
    }
}
```

**ProGuard rules** (`android/app/proguard-rules.pro`):
```proguard
# Capacitor
-keep class com.getcapacitor.** { *; }
-keep @com.getcapacitor.annotation.CapacitorPlugin class * { *; }

# Keep JSON serialization
-keepattributes *Annotation*
-keepclassme mbers class * {
    @com.google.gson.annotations.SerializedName <fields>;
}
```

### Performance

**Enable hardware acceleration** (`AndroidManifest.xml`):
```xml
<application
    android:hardwareAccelerated="true">
```

**WebView optimization:**
```xml
<application>
    <activity
        android:configChanges="orientation|keyboardHidden|keyboard|screenSize|locale|smallestScreenSize|screenLayout|uiMode"
        android:launchMode="singleTask"
        android:windowSoftInputMode="adjustResize">
```

## Troubleshooting

### Gradle Sync Failed

```bash
cd android
./gradlew clean
./gradlew build --stacktrace
```

### ADB Device Not Found

```bash
adb kill-server
adb start-server
adb devices
```

### Build Failed - "SDK location not found"

Create `android/local.properties`:
```properties
sdk.dir=/Users/YourName/Library/Android/sdk
# Or Linux: /home/username/Android/Sdk
# Or Windows: C:\\Users\\YourName\\AppData\\Local\\Android\\Sdk
```

### App Crashes on Startup

Check logs:
```bash
adb logcat | grep -i capacitor
```

Common causes:
- Wrong webDir in capacitor.config.ts
- Missing permissions in AndroidManifest.xml
- Capacitor not synced: `npm run sync:android`

### "Cleartext communication not permitted"

Add to `AndroidManifest.xml`:
```xml
<application
    android:usesCleartextTraffic="true">
```

Or better, use HTTPS in production.

## Resources

- [Android Developer Docs](https://developer.android.com/)
- [Capacitor Android Docs](https://capacitorjs.com/docs/android)
- [Play Console Help](https://support.google.com/googleplay/android-developer)
- [Material Design Guidelines](https://material.io/design)

---

**Ready to build for Android! 🚀**
