# 📱 Complete App Store Deployment Guide for Meldra

## 🎯 Overview

You already have **Capacitor** set up! This guide will walk you through deploying your Meldra app to the iOS App Store step-by-step.

---

## ✅ Prerequisites Checklist

### 1. **Apple Developer Account** ($99/year)
- [ ] Sign up at [developer.apple.com](https://developer.apple.com)
- [ ] Complete enrollment (takes 24-48 hours)
- [ ] Verify email and payment

### 2. **Required Tools**
- [ ] **Mac computer** (required for iOS development)
- [ ] **Xcode** (latest version from Mac App Store)
- [ ] **Node.js** (already installed)
- [ ] **CocoaPods** (for iOS dependencies)

### 3. **App Store Connect Access**
- [ ] Access to [App Store Connect](https://appstoreconnect.apple.com)
- [ ] App Store Connect API key (optional, for CI/CD)

---

## 🚀 Step-by-Step Deployment

### **Step 1: Install CocoaPods** (if not installed)

```bash
# Install CocoaPods
sudo gem install cocoapods

# Verify installation
pod --version
```

---

### **Step 2: Build Your Web App**

```bash
# From project root
npm run build

# This creates optimized files in dist/
```

---

### **Step 3: Sync to iOS**

```bash
# Navigate to mobile directory
cd mobile

# Sync web build to iOS
npx cap sync ios

# This copies your built files to iOS app
```

---

### **Step 4: Configure App Identity**

#### Update `mobile/ios/App/App/Info.plist`

```xml
<key>CFBundleDisplayName</key>
<string>Meldra</string>

<key>CFBundleIdentifier</key>
<string>com.meldra.app</string>

<key>CFBundleVersion</key>
<string>1</string>

<key>CFBundleShortVersionString</key>
<string>1.0.0</string>
```

#### Update `mobile/ios/App/App/capacitor.config.json`

```json
{
  "appId": "com.meldra.app",
  "appName": "Meldra",
  "webDir": "../../dist",
  "server": {
    "url": "https://meldra.ai",
    "cleartext": false
  }
}
```

---

### **Step 5: Configure App Icons**

1. **Create App Icon** (1024x1024px, PNG, no transparency)
   - Save as `mobile/ios/App/App/Assets.xcassets/AppIcon.appiconset/icon-1024.png`

2. **Open Xcode:**
   ```bash
   cd mobile/ios
   open App/App.xcworkspace
   ```

3. **In Xcode:**
   - Select `App` project in left sidebar
   - Select `App` target
   - Go to "General" tab
   - Under "App Icons and Launch Screen"
   - Drag your 1024x1024 icon to the AppIcon slot

---

### **Step 6: Configure Signing & Capabilities**

1. **In Xcode:**
   - Select `App` project
   - Select `App` target
   - Go to "Signing & Capabilities" tab
   - Check "Automatically manage signing"
   - Select your **Team** (Apple Developer account)
   - Xcode will automatically create:
     - App ID
     - Provisioning Profile
     - Certificates

2. **Bundle Identifier:**
   - Should be: `com.meldra.app`
   - Must be unique (change if needed)

---

### **Step 7: Configure App Permissions**

Add required permissions in `Info.plist`:

```xml
<!-- File Access -->
<key>NSPhotoLibraryUsageDescription</key>
<string>We need access to your photos to process Excel files</string>

<key>NSDocumentPickerUsageDescription</key>
<string>We need access to files to process Excel and ZIP files</string>

<!-- Network -->
<key>NSAppTransportSecurity</key>
<dict>
    <key>NSAllowsArbitraryLoads</key>
    <false/>
    <key>NSExceptionDomains</key>
    <dict>
        <key>meldra.ai</key>
        <dict>
            <key>NSIncludesSubdomains</key>
            <true/>
            <key>NSTemporaryExceptionAllowsInsecureHTTPLoads</key>
            <false/>
        </dict>
    </dict>
</dict>
```

---

### **Step 8: Test on Simulator**

```bash
# In Xcode
# 1. Select a simulator (e.g., iPhone 15 Pro)
# 2. Click Run (⌘R) or press Play button
# 3. App should launch in simulator
```

**Test:**
- [ ] App launches
- [ ] Login works
- [ ] File upload works
- [ ] All features functional

---

### **Step 9: Test on Physical Device**

1. **Connect iPhone via USB**
2. **In Xcode:**
   - Select your device from device dropdown
   - Click Run
   - On first run, trust developer on iPhone:
     - Settings → General → VPN & Device Management
     - Trust your developer certificate

**Test on device:**
- [ ] App installs
- [ ] All features work
- [ ] Performance is good
- [ ] No crashes

---

### **Step 10: Create App Store Connect Listing**

1. **Go to [App Store Connect](https://appstoreconnect.apple.com)**
2. **Click "My Apps" → "+" → "New App"**
3. **Fill in:**
   - **Platform:** iOS
   - **Name:** Meldra
   - **Primary Language:** English
   - **Bundle ID:** com.meldra.app (select from dropdown)
   - **SKU:** meldra-ios-001 (unique identifier)
   - **User Access:** Full Access

4. **Click "Create"**

---

### **Step 11: Prepare App Store Assets**

#### **App Screenshots** (Required)

Create screenshots for these sizes:

1. **iPhone 6.7" Display** (1290 x 2796 pixels)
   - iPhone 14 Pro Max, 15 Pro Max
   - Take 3-10 screenshots

2. **iPhone 6.5" Display** (1242 x 2688 pixels)
   - iPhone 11 Pro Max, XS Max
   - Take 3-10 screenshots

3. **iPhone 5.5" Display** (1242 x 2208 pixels)
   - iPhone 8 Plus
   - Take 3-10 screenshots

4. **iPad Pro 12.9"** (2048 x 2732 pixels) - Optional
   - Take 3-10 screenshots

**How to create:**
- Use iPhone Simulator
- Take screenshots (⌘S)
- Or use design tools (Figma, Sketch)

#### **App Preview Video** (Optional but Recommended)
- 15-30 seconds
- Show key features
- Same sizes as screenshots

#### **App Description**

```
Meldra - Data Made Simple

Transform your Excel workflow with AI-powered tools. Create, analyze, and convert spreadsheets effortlessly.

✨ Key Features:
• AI-Powered Excel Builder - Create complex spreadsheets with natural language
• Excel to PowerPoint - Convert spreadsheets to professional presentations
• P&L Generator - Build profit & loss statements instantly
• File Analyzer - Get AI insights from your data
• ZIP Processor - Clean and organize file archives
• Zero Data Storage - Your files are processed securely and never stored

🎯 Perfect For:
• Business professionals
• Students and educators
• Data analysts
• Small businesses
• Government officials

🔒 Privacy First:
• Zero data storage
• Files processed in-memory
• No tracking
• Secure processing

Download now and experience the future of Excel operations!
```

#### **Keywords** (100 characters max)
```
Excel, spreadsheet, AI, data analysis, PowerPoint, P&L, business, productivity, automation
```

#### **Support URL**
```
https://meldra.ai/support
```

#### **Marketing URL** (Optional)
```
https://meldra.ai
```

#### **Privacy Policy URL** (Required)
```
https://meldra.ai/privacy
```

---

### **Step 12: Build Archive for App Store**

1. **In Xcode:**
   - Select "Any iOS Device" from device dropdown (top left)
   - Product → Archive
   - Wait for archive to complete (5-10 minutes)

2. **Archive Window Opens:**
   - Click "Distribute App"
   - Select "App Store Connect"
   - Click "Next"
   - Select "Upload"
   - Click "Next"
   - Review options, click "Upload"
   - Wait for upload (10-30 minutes)

---

### **Step 13: Complete App Store Listing**

1. **Go to App Store Connect**
2. **Select your app**
3. **Go to "App Store" tab**
4. **Fill in:**

   **App Information:**
   - [ ] Name: Meldra
   - [ ] Subtitle: Data Made Simple
   - [ ] Category: Productivity
   - [ ] Secondary Category: Business
   - [ ] Privacy Policy URL

   **Pricing and Availability:**
   - [ ] Price: Free (or set price)
   - [ ] Available in: All countries (or select)

   **Version Information:**
   - [ ] Version: 1.0.0
   - [ ] Copyright: © 2025 Meldra
   - [ ] Description: (paste from Step 11)
   - [ ] Keywords: (paste from Step 11)
   - [ ] Support URL
   - [ ] Marketing URL (optional)

   **App Preview and Screenshots:**
   - [ ] Upload screenshots for each device size
   - [ ] Upload app preview video (optional)

   **App Review Information:**
   - [ ] Contact Information
   - [ ] Demo Account (if login required)
   - [ ] Notes: "This is a productivity app for Excel operations. No special setup required."

   **Version Release:**
   - [ ] Automatic Release (or Manual)

---

### **Step 14: Submit for Review**

1. **Select your build:**
   - Go to "TestFlight" tab
   - Wait for build to process (10-30 minutes)
   - Once processed, go back to "App Store" tab
   - Select the build under "Build"

2. **Complete App Review:**
   - Answer export compliance questions
   - Add content rights if using third-party content
   - Complete age rating questionnaire

3. **Click "Submit for Review"**

---

### **Step 15: Wait for Review**

- **Typical Review Time:** 24-48 hours
- **Status Updates:** Check App Store Connect
- **If Rejected:** Address feedback and resubmit

---

## 📋 Pre-Submission Checklist

### **App Functionality**
- [ ] App launches without crashes
- [ ] All features work correctly
- [ ] Login/authentication works
- [ ] File upload/download works
- [ ] No broken links
- [ ] Error handling works

### **App Store Requirements**
- [ ] App icon (1024x1024) uploaded
- [ ] Screenshots for all required sizes
- [ ] App description complete
- [ ] Privacy policy URL working
- [ ] Support URL working
- [ ] Keywords added
- [ ] Age rating completed

### **Legal & Compliance**
- [ ] Privacy policy published
- [ ] Terms of service published
- [ ] Data usage disclosure complete
- [ ] Export compliance answered

### **Testing**
- [ ] Tested on iOS 14+
- [ ] Tested on multiple devices
- [ ] Tested on different screen sizes
- [ ] Performance is acceptable
- [ ] No memory leaks

---

## 🐛 Common Issues & Solutions

### **Issue: "No signing certificate found"**
**Solution:**
- Make sure you're logged into Xcode with Apple ID
- Go to Xcode → Preferences → Accounts
- Add your Apple ID
- Select team in Signing & Capabilities

### **Issue: "Bundle identifier already exists"**
**Solution:**
- Change bundle ID to something unique
- Use: `com.yourcompany.meldra` or `com.yourname.meldra`

### **Issue: "Archive failed"**
**Solution:**
- Clean build folder: Product → Clean Build Folder (⇧⌘K)
- Check for errors in Issue Navigator
- Make sure "Any iOS Device" is selected

### **Issue: "Upload failed"**
**Solution:**
- Check internet connection
- Try again (sometimes temporary)
- Check App Store Connect status

### **Issue: "App rejected"**
**Solution:**
- Read rejection reason carefully
- Address all issues mentioned
- Update app and resubmit
- Common reasons:
  - Missing privacy policy
  - App crashes
  - Broken functionality
  - Misleading description

---

## 💰 Costs

### **One-Time Costs:**
- Apple Developer Account: **$99/year**
- App icons/screenshots design: **$0-500** (if hiring designer)

### **Ongoing Costs:**
- Apple Developer renewal: **$99/year**
- Hosting (backend): **$5-50/month**
- Hosting (frontend): **$0-20/month** (Vercel free tier available)

---

## 🎯 Quick Start (TL;DR)

```bash
# 1. Build web app
npm run build

# 2. Sync to iOS
cd mobile
npx cap sync ios

# 3. Open in Xcode
npx cap open ios

# 4. In Xcode:
#    - Configure signing
#    - Select "Any iOS Device"
#    - Product → Archive
#    - Distribute App → App Store Connect

# 5. In App Store Connect:
#    - Create app listing
#    - Upload screenshots
#    - Fill in description
#    - Submit for review
```

---

## 📞 Support Resources

- **Apple Developer Documentation:** [developer.apple.com/documentation](https://developer.apple.com/documentation)
- **App Store Review Guidelines:** [developer.apple.com/app-store/review/guidelines](https://developer.apple.com/app-store/review/guidelines)
- **App Store Connect Help:** [help.apple.com/app-store-connect](https://help.apple.com/app-store-connect)

---

## ✅ Success!

Once approved, your app will be:
- Available on the App Store
- Searchable by name
- Downloadable by users
- Ready for updates

**Congratulations! Your app is live! 🎉**

---

## 🔄 Updating Your App

For future updates:

1. **Update version number** in `Info.plist`
2. **Build and archive** again
3. **Upload new build** to App Store Connect
4. **Submit update** for review

---

**Need help?** Check the troubleshooting section or Apple's documentation.
