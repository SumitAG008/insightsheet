# Mobile App Testing Guide

Complete guide to test your iOS and Android apps before release.

---

## 📱 Android App Testing

### Step 1: Install APK on Test Device

**You have the APK at:**
```
C:\Users\sumit\Documents\Insightlite\mobile\android\app\build\outputs\apk\debug\app-debug.apk
```

**Methods to install:**

**Option A: USB Transfer**
1. Connect Android phone via USB
2. Copy APK to phone
3. Open Files app → Find APK
4. Tap APK → Install
5. Enable "Unknown sources" if prompted

**Option B: ADB Install**
```bash
cd C:\Users\sumit\Documents\Insightlite\mobile\android
adb install app\build\outputs\apk\debug\app-debug.apk
```

---

### Step 2: Test Checklist

**✅ Launch & First Impressions**
- [ ] App icon appears correctly
- [ ] Splash screen shows
- [ ] App opens without crashes
- [ ] No white screen / blank screen

**✅ Authentication**
- [ ] Registration form works
- [ ] Email validation works
- [ ] Password strength check works
- [ ] Login successful
- [ ] Logout works
- [ ] "Remember me" works

**✅ Core Features**
- [ ] Dashboard loads
- [ ] File upload works
- [ ] File picker opens
- [ ] Upload progress shows
- [ ] Data displays correctly
- [ ] Charts render properly
- [ ] Navigation menu works

**✅ UI/UX**
- [ ] All text is readable (not too light/dark)
- [ ] Buttons are clickable
- [ ] Forms are usable
- [ ] No text cutoff
- [ ] Proper spacing
- [ ] Icons load correctly
- [ ] Colors match branding

**✅ Performance**
- [ ] App responds quickly (<1s)
- [ ] No lag when scrolling
- [ ] Smooth animations
- [ ] Memory usage acceptable
- [ ] Battery drain normal

**✅ Network**
- [ ] Works on WiFi
- [ ] Works on mobile data (4G/5G)
- [ ] Handles network errors gracefully
- [ ] Offline mode (if applicable)
- [ ] Retry logic works

**✅ Permissions**
- [ ] Camera permission works
- [ ] Storage permission works
- [ ] Location (if needed)
- [ ] Notifications (if needed)

**✅ Device Compatibility**
- [ ] Test on Android 8, 9, 10, 11, 12, 13+
- [ ] Test on different screen sizes (small, medium, large)
- [ ] Test on different manufacturers (Samsung, Google, Xiaomi, etc.)

**✅ Edge Cases**
- [ ] Handle empty states
- [ ] Handle errors (404, 500)
- [ ] Handle slow network
- [ ] Handle no network
- [ ] Handle large files
- [ ] Handle special characters in input

---

### Step 3: Bug Reporting

**Create a testing log:**

```
Device: Samsung Galaxy S21
Android Version: 13
App Version: 1.0.0 (debug)
Date: 2025-11-17

✅ PASS: App launches
✅ PASS: Login works
❌ FAIL: Upload button not visible on dark mode
❌ FAIL: Crash when selecting large file (>50MB)
⚠️  WARN: Slow loading on 3G network

Screenshots attached: bug1.png, bug2.png
```

---

## 🍎 iOS App Testing

### Prerequisite: Need Mac for iOS Testing

**iOS apps require macOS to build and test.**

If you don't have a Mac:
- Borrow a friend's Mac
- Use cloud Mac service (MacStadium, MacinCloud)
- Visit Apple Store/Mac café
- Use company Mac

---

### Step 1: Build iOS App (on Mac)

```bash
# 1. Clone repository on Mac
git clone https://github.com/SumitAG008/insightsheet.git
cd insightsheet/mobile

# 2. Install dependencies
npm install

# 3. Add iOS platform
npm run add:ios

# 4. Sync
npm run sync:ios

# 5. Open Xcode
npm run open:ios
```

---

### Step 2: Install on iPhone

**Option A: Simulator (Mac only)**
1. Xcode → Top bar → Select simulator (iPhone 15 Pro)
2. Click ▶️ Run
3. Simulator opens with your app

**Option B: Physical iPhone**
1. Connect iPhone via USB cable
2. iPhone: "Trust This Computer" → Trust
3. Xcode → Top bar → Select your iPhone
4. Click ▶️ Run
5. iPhone: Settings → General → VPN & Device Management → Trust developer
6. App installs on your iPhone

---

### Step 3: Test Checklist (Same as Android)

Use the same checklist as Android above, plus:

**✅ iOS-Specific**
- [ ] Works on iPhone (all sizes)
- [ ] Works on iPad
- [ ] Face ID / Touch ID (if used)
- [ ] iOS notifications
- [ ] iOS share sheet
- [ ] iOS keyboard
- [ ] Haptic feedback
- [ ] Dark mode / Light mode toggle
- [ ] Dynamic Type (accessibility)
- [ ] VoiceOver (accessibility)

**✅ iOS Versions**
- [ ] iOS 13
- [ ] iOS 14
- [ ] iOS 15
- [ ] iOS 16
- [ ] iOS 17 (latest)

---

## 🧪 Automated Testing Tools

### Android

**Install Firebase Test Lab:**
```bash
# Upload APK to Firebase Console
# Runs on 20+ real devices automatically
# Get screenshots and crash reports
```

**Install BrowserStack:**
- Upload APK
- Test on 100+ real devices
- Free trial available

### iOS

**TestFlight (Recommended)**
```bash
# 1. Archive in Xcode
# 2. Upload to App Store Connect
# 3. Add beta testers
# 4. They download TestFlight app
# 5. They test your app
# 6. Get feedback and crash reports
```

---

## 🐛 Common Issues & Fixes

### Android

**Issue: App crashes on startup**
```bash
# Check logs
adb logcat | grep -i "error"

# Common causes:
- Missing permissions in AndroidManifest.xml
- Capacitor not synced
- Wrong webDir in capacitor.config.ts
```

**Issue: White screen / blank screen**
```bash
# Check if web assets copied
# Should exist: android/app/src/main/assets/public/

# Fix:
cd mobile
npm run build:web
npx cap sync android
```

**Issue: Network requests fail**
```xml
<!-- Add to AndroidManifest.xml -->
<application
    android:usesCleartextTraffic="true">
```

### iOS

**Issue: "Untrusted Developer"**
```
iPhone: Settings → General → VPN & Device Management
Tap your email → Trust
```

**Issue: Build failed - "No signing certificate"**
```
Xcode → Preferences → Accounts
Add Apple ID
Xcode → Project → Signing & Capabilities
Team: Select your Apple ID
✓ Automatically manage signing
```

---

## 📊 Testing Metrics

**Track these:**

| Metric | Target | How to Measure |
|--------|--------|----------------|
| Crash-free rate | >99% | Firebase Crashlytics |
| Load time | <3s | Stopwatch |
| API response | <1s | Network tab |
| Memory usage | <200MB | Android Studio Profiler |
| Battery drain | <5%/hour | Settings → Battery |
| APK size | <20MB | File size |

---

## 🎯 Beta Testing Plan

### Phase 1: Internal Testing (1 week)
- You and team members
- Test all features thoroughly
- Fix critical bugs

### Phase 2: Closed Beta (2 weeks)
- 10-20 trusted users
- Google Play Internal Testing
- TestFlight (iOS)
- Collect feedback

### Phase 3: Open Beta (2 weeks)
- 100+ users
- Public beta link
- Monitor crash reports
- Fix bugs

### Phase 4: Production Release
- Stable version
- Submit to stores
- Monitor reviews

---

## 📝 Testing Report Template

**Date:** 2025-11-17
**Tester:** Your Name
**Device:** Samsung Galaxy S21
**OS:** Android 13
**App Version:** 1.0.0

**Test Results:**

| Feature | Status | Notes |
|---------|--------|-------|
| Login | ✅ PASS | Works smoothly |
| Upload | ❌ FAIL | Crashes with >50MB files |
| Charts | ✅ PASS | Renders correctly |
| Navigation | ⚠️  WARN | Slight lag |

**Bugs Found:** 3
**Critical:** 1 (upload crash)
**Medium:** 1 (navigation lag)
**Low:** 1 (text too small)

**Recommendation:** Fix critical bug before beta release

---

## 🚀 Pre-Release Checklist

**Before submitting to stores:**

**✅ Functionality**
- [ ] All features work
- [ ] No crashes
- [ ] No critical bugs
- [ ] Tested on 3+ devices
- [ ] Tested on different OS versions

**✅ UI/UX**
- [ ] All text readable
- [ ] Proper spacing
- [ ] Correct colors
- [ ] Icons load
- [ ] Smooth animations

**✅ Performance**
- [ ] Fast load times
- [ ] Low memory usage
- [ ] Good battery life
- [ ] Small app size

**✅ Security**
- [ ] HTTPS only
- [ ] No hardcoded secrets
- [ ] Secure storage for tokens
- [ ] Input validation

**✅ Legal**
- [ ] Privacy policy
- [ ] Terms of service
- [ ] Proper permissions descriptions
- [ ] GDPR compliance (if EU users)

**✅ Store Requirements**
- [ ] App icon (all sizes)
- [ ] Screenshots (all sizes)
- [ ] App description
- [ ] Keywords
- [ ] Content rating
- [ ] Age rating

---

## 🎓 Testing Best Practices

1. **Test on Real Devices** - Emulators miss real-world issues
2. **Test Different Networks** - WiFi, 4G, 3G, offline
3. **Test Edge Cases** - Empty states, errors, extremes
4. **Test Accessibility** - Screen readers, large text
5. **Test Interruptions** - Phone calls, notifications
6. **Test Updates** - Upgrade from old version
7. **Test Uninstall/Reinstall** - Clean state
8. **Get User Feedback** - Real users find different bugs

---

## 📞 Get Help

**Android Issues:**
- Stack Overflow: android + capacitor tags
- Capacitor Docs: https://capacitorjs.com/docs/android
- Android Docs: https://developer.android.com

**iOS Issues:**
- Stack Overflow: ios + capacitor tags
- Capacitor Docs: https://capacitorjs.com/docs/ios
- Apple Developer Forums: https://developer.apple.com/forums/

---

**Happy Testing! 🧪**

Remember: Better to find bugs in testing than in production!
