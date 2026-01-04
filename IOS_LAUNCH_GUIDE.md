# iOS Launch Guide for InsightSheet-lite

## 📱 Overview

This guide covers how to deploy InsightSheet-lite as a native iOS app using React Native or as a Progressive Web App (PWA).

---

## 🎯 Option 1: Progressive Web App (PWA) - **RECOMMENDED**

### Why PWA?
- ✅ **Fastest to deploy** - No App Store approval needed
- ✅ **Cross-platform** - Works on iOS, Android, Desktop
- ✅ **No code changes** - Uses existing React app
- ✅ **Installable** - Users can add to home screen
- ✅ **Offline support** - Can work without internet

### Steps to Convert to PWA:

#### 1. **Install PWA Dependencies**
```bash
npm install --save-dev vite-plugin-pwa
```

#### 2. **Update `vite.config.js`**
```javascript
import { VitePWA } from 'vite-plugin-pwa'

export default {
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png'],
      manifest: {
        name: 'InsightSheet-lite',
        short_name: 'InsightSheet',
        description: 'AI-powered Excel operations and data analysis',
        theme_color: '#2563eb',
        background_color: '#ffffff',
        display: 'standalone',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      }
    })
  ]
}
```

#### 3. **Add iOS Meta Tags to `index.html`**
```html
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="default">
<meta name="apple-mobile-web-app-title" content="InsightSheet">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
```

#### 4. **Create App Icons**
- Create `public/apple-touch-icon.png` (180x180px)
- Create `public/pwa-192x192.png` (192x192px)
- Create `public/pwa-512x512.png` (512x512px)

#### 5. **Deploy**
- Deploy to Vercel/Netlify
- Users can "Add to Home Screen" from Safari
- App works like native app!

---

## 🎯 Option 2: React Native (Native iOS App)

### Prerequisites:
- Mac with Xcode installed
- Apple Developer Account ($99/year)
- Node.js and React Native CLI

### Steps:

#### 1. **Create React Native App**
```bash
npx react-native init InsightSheetMobile
cd InsightSheetMobile
```

#### 2. **Share Code Between Web & Mobile**
- Create shared components in `shared/` folder
- Use React Native Web for web compatibility
- Or use Expo for easier development

#### 3. **Install Dependencies**
```bash
npm install @react-navigation/native
npm install react-native-screens react-native-safe-area-context
npm install @react-native-async-storage/async-storage
```

#### 4. **Configure iOS**
```bash
cd ios
pod install
cd ..
```

#### 5. **Build for iOS**
```bash
# Development
npx react-native run-ios

# Production
npx react-native run-ios --configuration Release
```

#### 6. **Archive for App Store**
1. Open `ios/InsightSheetMobile.xcworkspace` in Xcode
2. Select "Any iOS Device" as target
3. Product → Archive
4. Distribute App → App Store Connect

---

## 🎯 Option 3: Capacitor (Hybrid App)

### Why Capacitor?
- ✅ Use existing React code
- ✅ Native iOS features
- ✅ Faster than React Native setup

### Steps:

#### 1. **Install Capacitor**
```bash
npm install @capacitor/core @capacitor/cli
npm install @capacitor/ios
npx cap init
```

#### 2. **Add iOS Platform**
```bash
npx cap add ios
npx cap sync
```

#### 3. **Open in Xcode**
```bash
npx cap open ios
```

#### 4. **Build & Deploy**
- Build in Xcode
- Archive for App Store

---

## 📋 App Store Requirements

### 1. **Apple Developer Account**
- Sign up at developer.apple.com
- $99/year fee
- Required for App Store distribution

### 2. **App Store Connect Setup**
1. Create App ID
2. Create App Store listing
3. Upload screenshots (required sizes):
   - iPhone 6.7" (1290 x 2796)
   - iPhone 6.5" (1242 x 2688)
   - iPhone 5.5" (1242 x 2208)
   - iPad Pro 12.9" (2048 x 2732)

### 3. **Privacy & Compliance**
- Privacy Policy URL (required)
- Data usage disclosure
- Terms of Service
- App Store Review Guidelines compliance

### 4. **App Icons**
- 1024x1024px (required)
- No transparency
- No rounded corners (iOS adds them)

### 5. **App Store Listing**
- App name (30 chars max)
- Subtitle (30 chars)
- Description (4000 chars)
- Keywords (100 chars)
- Support URL
- Marketing URL (optional)

---

## 🚀 Deployment Checklist

### Pre-Launch:
- [ ] Test on multiple iOS devices
- [ ] Test on different iOS versions (iOS 14+)
- [ ] Test offline functionality
- [ ] Test file upload/download
- [ ] Test all features
- [ ] Performance testing
- [ ] Security audit
- [ ] Privacy policy ready
- [ ] Terms of service ready
- [ ] App Store screenshots
- [ ] App Store description
- [ ] App icon (1024x1024)
- [ ] Support email configured

### App Store Submission:
- [ ] App ID created
- [ ] Certificates & Provisioning Profiles
- [ ] App Store Connect listing
- [ ] Build uploaded
- [ ] Screenshots uploaded
- [ ] Description & metadata
- [ ] Privacy policy URL
- [ ] Age rating selected
- [ ] Pricing set
- [ ] Submit for review

### Post-Launch:
- [ ] Monitor crash reports
- [ ] Monitor user reviews
- [ ] Update based on feedback
- [ ] Plan feature updates

---

## 💰 Cost Breakdown

### PWA (Recommended):
- **Free** - No App Store fees
- **Hosting**: Vercel/Netlify (Free tier available)
- **Total**: $0/month

### Native iOS App:
- **Apple Developer**: $99/year
- **Hosting**: Same as web
- **Total**: $99/year + hosting

---

## ⚡ Quick Start: PWA (Recommended)

1. **Add PWA plugin** (5 minutes)
2. **Create icons** (10 minutes)
3. **Deploy to Vercel** (5 minutes)
4. **Test on iPhone** (5 minutes)
5. **Done!** Users can install from Safari

**Total time: ~30 minutes**

---

## 📱 Testing on iOS

### Safari (PWA):
1. Open app in Safari on iPhone
2. Tap Share button
3. Tap "Add to Home Screen"
4. App appears like native app

### Simulator (Native):
```bash
# Install Xcode
# Open Simulator
# Run app
```

---

## 🎯 Recommendation

**Start with PWA** because:
1. ✅ Fastest to launch
2. ✅ No App Store approval
3. ✅ Works immediately
4. ✅ Can convert to native later if needed

**Convert to Native later if:**
- Need App Store presence
- Need advanced iOS features
- Users request native app

---

## 📞 Next Steps

1. Choose deployment method (PWA recommended)
2. Follow setup steps
3. Test on iOS device
4. Deploy!
5. Submit to App Store (if native)

**Your app is ready for iOS!** 🎉
