# iOS-Specific Setup Guide 🍎

Detailed instructions for iOS app development and deployment.

## Prerequisites

### Required (macOS only)

1. **macOS** 12.0 (Monterey) or later
2. **Xcode** 14.0 or later
   - Download from Mac App Store
   - Run Xcode once and accept license agreement
3. **CocoaPods** (dependency manager)
   ```bash
   sudo gem install cocoapods
   ```
4. **Command Line Tools**
   ```bash
   xcode-select --install
   ```

### Apple Developer Account

**Free Account:**
- ✅ Development and testing on your own devices
- ✅ 7-day app certificates
- ❌ Cannot publish to App Store

**Paid Account ($99/year):**
- ✅ Publish to App Store
- ✅ TestFlight distribution
- ✅ 1-year certificates
- ✅ Advanced capabilities (push notifications, etc.)

Sign up: https://developer.apple.com/programs/

## Initial Setup

### 1. Add iOS Platform

```bash
cd mobile
npm run add:ios
```

This creates the `ios/` directory with:
- `ios/App/App.xcworkspace` - Main workspace (open this!)
- `ios/App/App.xcodeproj` - Xcode project
- `ios/App/App/` - App resources and config
- `ios/App/Pods/` - CocoaPods dependencies

### 2. Install Pods

```bash
cd ios/App
pod install
```

**If pod install fails:**
```bash
pod repo update
pod install
```

### 3. Open in Xcode

```bash
cd ../..  # Back to mobile/
npm run open:ios
```

**⚠️ Always open `.xcworkspace`, never `.xcodeproj`!**

## Development

### Build and Run

**From Command Line:**
```bash
# Build web app first
npm run build:web

# Sync to iOS
npm run sync:ios

# Run in simulator
npm run run:ios
```

**From Xcode:**
1. Select simulator from top bar (e.g., "iPhone 15 Pro")
2. Click ▶️ Play button (or ⌘R)
3. App will build, launch simulator, and install

### Select Simulator

Xcode > Top toolbar > Click device dropdown:
- iPhone 15 Pro (most common)
- iPhone 15 Pro Max (large screen)
- iPhone SE (small screen)
- iPad Pro 12.9" (tablet)

**Manage simulators:**
- Xcode > Window > Devices and Simulators
- Click "+" to add new simulators

### Test on Physical Device

1. **Connect iPhone via USB**

2. **Trust Computer:**
   - iPhone will show "Trust This Computer?"
   - Tap "Trust"
   - Enter passcode

3. **Select Device in Xcode:**
   - Top toolbar > Select your iPhone
   - Should show as "Your iPhone Name"

4. **Configure Signing (first time):**
   - Xcode > Select project "App"
   - Signing & Capabilities tab
   - Team: Select your Apple ID
   - ✅ "Automatically manage signing"

5. **Run:**
   - Click ▶️ Play button
   - First time: May need to trust developer on device
   - Settings > General > VPN & Device Management
   - Tap your email > Trust

## App Configuration

### App Information

**Bundle Identifier:** (must be unique)
- Xcode > Project > General
- Bundle Identifier: `com.meldra.insightsheet`
- Format: `com.company.appname`

**Display Name:**
- Xcode > Project > General
- Display Name: "InsightSheet"

**Version & Build:**
- Version: User-facing (1.0.0, 1.1.0)
- Build: Incremented for each upload (1, 2, 3...)

### App Icon

**Required sizes:** (all in `ios/App/App/Assets.xcassets/AppIcon.appiconset/`)
- 20x20 @2x, @3x (iPhone notification)
- 29x29 @2x, @3x (iPhone settings)
- 40x40 @2x, @3x (iPhone spotlight)
- 60x60 @2x, @3x (iPhone app)
- 1024x1024 (App Store)

**Easy method:**
1. Create 1024x1024 PNG icon
2. Visit https://appicon.co
3. Upload icon
4. Download iOS assets
5. Drag all images into AppIcon section in Xcode

**Manual method:**
1. Xcode > App > Assets.xcassets
2. Click AppIcon
3. Drag images into each size slot

### Splash Screen (Launch Screen)

**Edit storyboard:**
- Xcode > App > App > LaunchScreen.storyboard
- Add logo and background color
- Use Auto Layout constraints

**Or use image assets:**
1. Assets.xcassets > New Image Set
2. Name: "Splash"
3. Add splash images (@1x, @2x, @3x)
4. Update LaunchScreen.storyboard to use image

### Permissions (Info.plist)

Add descriptions for privacy-sensitive features:

Xcode > App > Info.plist > Add row:

```xml
<!-- Camera -->
<key>NSCameraUsageDescription</key>
<string>To scan documents and upload files</string>

<!-- Photo Library -->
<key>NSPhotoLibraryUsageDescription</key>
<string>To select and upload Excel files</string>

<!-- Location (if needed) -->
<key>NSLocationWhenInUseUsageDescription</key>
<string>To show nearby data points</string>

<!-- File Access -->
<key>UIFileSharingEnabled</key>
<true/>
<key>LSSupportsOpeningDocumentsInPlace</key>
<true/>
```

**⚠️ Required:** Must provide clear, user-friendly descriptions. Generic text may cause App Store rejection.

### Supported File Types

To open .xlsx and .csv files in your app:

Info.plist:
```xml
<key>CFBundleDocumentTypes</key>
<array>
    <dict>
        <key>CFBundleTypeName</key>
        <string>Excel Spreadsheet</string>
        <key>LSItemContentTypes</key>
        <array>
            <string>org.openxmlformats.spreadsheetml.sheet</string>
        </array>
        <key>LSHandlerRank</key>
        <string>Owner</string>
    </dict>
    <dict>
        <key>CFBundleTypeName</key>
        <string>CSV Document</string>
        <key>LSItemContentTypes</key>
        <array>
            <string>public.comma-separated-values-text</string>
        </array>
        <key>LSHandlerRank</key>
        <string>Owner</string>
    </dict>
</array>
```

## Code Signing & Certificates

### Automatic Signing (Recommended)

1. Xcode > Project > Signing & Capabilities
2. ✅ "Automatically manage signing"
3. Team: Select your Apple ID
4. Xcode handles certificates automatically

### Manual Signing (Advanced)

1. **Create Certificate:**
   - Xcode > Preferences > Accounts > Select Apple ID
   - Manage Certificates > + > iOS Development

2. **Create Provisioning Profile:**
   - developer.apple.com > Certificates, IDs & Profiles
   - Profiles > + > iOS App Development
   - Select App ID and certificates
   - Select devices
   - Generate and download

3. **Install Profile:**
   - Double-click .mobileprovision file
   - Or drag into Xcode > Preferences > Accounts

4. **Configure in Xcode:**
   - Signing & Capabilities
   - ❌ Uncheck "Automatically manage signing"
   - Select provisioning profile manually

## Building for Release

### Development Build (Testing)

**For simulator:**
```bash
npm run sync:ios
# Xcode: Select simulator > ⌘R
```

**For device:**
```bash
npm run sync:ios
# Xcode: Select device > ⌘R
```

### Archive Build (App Store)

**1. Prepare:**
```bash
# Build production web app
cd ..
npm run build

# Sync to iOS
cd mobile
npm run sync:ios
```

**2. Configure Xcode:**
- Select "Any iOS Device (arm64)" from device dropdown
- Product > Scheme > Edit Scheme
- Run > Build Configuration > Release
- Archive > Build Configuration > Release

**3. Archive:**
- Product > Archive (⌘⌥⇧B)
- Wait for build (2-5 minutes)
- Archives window opens automatically

**4. Export:**
- Select archive
- Click "Distribute App"
- Choose distribution method:
  - **App Store Connect** - For app store
  - **Ad Hoc** - For testing (100 devices max)
  - **Development** - For your devices only
  - **Enterprise** - For in-house distribution

**5. Upload to App Store Connect:**
- Choose "App Store Connect"
- Select team
- ✅ Upload symbols for crash reports
- ✅ Manage Version and Build Number
- Click "Upload"
- Wait for processing (10-60 minutes)

## App Store Deployment

### 1. App Store Connect Setup

**Create App:**
1. Visit https://appstoreconnect.apple.com
2. My Apps > + > New App
3. Fill in:
   - Platform: iOS
   - Name: "InsightSheet"
   - Primary Language: English
   - Bundle ID: Select from dropdown
   - SKU: insightsheet-ios (internal identifier)
   - User Access: Full Access

### 2. App Information

**General Information:**
- App Name: "InsightSheet"
- Subtitle (optional): "Data Analysis Made Simple"
- Category: Primary: Productivity, Secondary: Business
- Content Rights: Choose appropriate option

**Version Information:**
- What's New: Release notes for this version
- Screenshots: Required for all device sizes
- App Previews: Optional videos

### 3. Pricing and Availability

- Price: Free
- Availability: All countries or select specific
- Pre-order: Optional

### 4. App Privacy

Fill out privacy questionnaire:
- Data Types: What data you collect
- Usage: How you use the data
- Tracking: If you track users across apps
- Privacy Policy URL: Required!

### 5. Screenshots

**Required sizes:**
- 6.5" Display (iPhone 15 Pro Max): 1290 x 2796 px
- 5.5" Display (iPhone 8 Plus): 1242 x 2208 px

**Optional but recommended:**
- 6.7" Display
- iPad Pro (12.9")
- iPad Pro (11")

**Tools to create:**
- Simulator > Take Screenshot (⌘S)
- Use https://appscreenshots.com for frames
- Canva for adding text and graphics

**Requirements:**
- 3-10 screenshots per size
- PNG or JPEG
- RGB color space
- No transparency

### 6. App Review Information

**Required:**
- First Name, Last Name
- Phone Number
- Email
- Demo Account (if app requires login)
- Notes for reviewer (explain features)

**⚠️ Important:** If your app requires authentication, provide working demo credentials!

### 7. Submit for Review

1. Select build (uploaded from Xcode)
2. Review all sections (must have ✓)
3. Click "Submit for Review"
4. Choose manual or automatic release
5. Submit

**Review time:** Typically 24-72 hours

### 8. Track Status

App Store Connect > My Apps > InsightSheet:

**Statuses:**
- Waiting for Review (queue)
- In Review (being reviewed)
- Pending Developer Release (approved, waiting for you)
- Ready for Sale (live on App Store!)
- Rejected (fix issues and resubmit)

## TestFlight (Beta Testing)

**Why use TestFlight:**
- Test with up to 10,000 external users
- Get feedback before App Store launch
- Automatic distribution

**Setup:**
1. Archive and upload to App Store Connect (same as above)
2. App Store Connect > TestFlight
3. Add build
4. Manage missing compliance info
5. Add internal testers (team members)
6. Add external testers (public beta)
7. Create public link or invite by email

**Testers:**
- Install TestFlight app from App Store
- Accept invitation
- Download your app
- Provide feedback

## Capabilities

Enable advanced features in Xcode > Signing & Capabilities > + Capability:

**Common capabilities:**
- Push Notifications
- In-App Purchase
- iCloud (CloudKit)
- Apple Pay
- Sign in with Apple
- Associated Domains
- Background Modes

**For each capability:**
1. Enable in Xcode
2. Configure in developer.apple.com
3. Update provisioning profile

## Optimization

### Reduce App Size

**1. Enable bitcode** (Xcode 14+):
- Build Settings > Enable Bitcode > Yes
- Apple recompiles for optimal size per device

**2. Strip unused code:**
- Build Settings > Strip Debug Symbols > Yes
- Build Settings > Strip Linked Product > Yes

**3. Optimize assets:**
- Use PNG for simple graphics
- Use JPEG for photos
- Use vector PDFs for icons (scales better)

**4. App Thinning:**
- Automatically enabled
- App Store delivers only assets needed for user's device

### Performance

**1. Enable hardware acceleration:**
Already enabled by Capacitor

**2. Optimize images:**
- Use @2x and @3x assets appropriately
- Compress PNGs (ImageOptim, TinyPNG)

**3. Profile with Instruments:**
- Xcode > Product > Profile
- Use "Time Profiler" and "Leaks"

## Troubleshooting

### Pod Install Fails

```bash
cd ios/App
pod repo update
pod deintegrate
pod install
```

### Code Signing Error

**"Failed to create provisioning profile":**
1. Xcode > Preferences > Accounts
2. Select Apple ID > Download Manual Profiles
3. Or change Bundle Identifier to unique value

**"No signing certificate found":**
1. Xcode > Preferences > Accounts
2. Manage Certificates > + > Apple Development
3. Or connect to paid developer account

### Build Failed - "No such module"

```bash
cd ios/App
rm -rf Pods
pod install
# Xcode: Product > Clean Build Folder (⇧⌘K)
```

### Simulator Issues

**App doesn't launch:**
```bash
# Reset simulator
xcrun simctl shutdown all
xcrun simctl erase all
```

**Simulator slow:**
- Use newer device (iPhone 15 vs iPhone 8)
- Reduce simulator size: Window > Physical Size

### Archive Validation Failed

**"Missing Info.plist values":**
- Add required privacy descriptions

**"Invalid code signing":**
- Ensure correct provisioning profile
- Check certificate is valid

**"Invalid bundle":**
- Clean build folder
- Archive again

### App Store Rejection

**Common reasons:**
- Missing privacy policy
- Crashes during review
- Incomplete functionality
- Misleading screenshots
- Poor performance

**How to respond:**
1. Read rejection reason carefully
2. Fix issues
3. Test thoroughly
4. Submit new build
5. Add notes for reviewer explaining changes

## Useful Commands

```bash
# List simulators
xcrun simctl list

# Boot simulator
xcrun simctl boot "iPhone 15 Pro"

# Install app on simulator
xcrun simctl install booted path/to/App.app

# View device logs
xcrun simctl spawn booted log stream --level=debug

# Clean derived data
rm -rf ~/Library/Developer/Xcode/DerivedData

# View provisioning profiles
security find-identity -v -p codesigning
```

## Resources

- [iOS Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/)
- [App Store Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- [Capacitor iOS Documentation](https://capacitorjs.com/docs/ios)
- [Apple Developer Forums](https://developer.apple.com/forums/)
- [App Store Connect Help](https://developer.apple.com/help/app-store-connect/)

## Best Practices

### App Store Optimization (ASO)

1. **App Name:** Include relevant keywords (30 chars max)
2. **Subtitle:** Clear value proposition (30 chars)
3. **Keywords:** Research popular search terms (100 chars)
4. **Description:** Clear, concise, feature-focused
5. **Screenshots:** Show best features first
6. **Preview Video:** 15-30 second demo

### User Experience

1. **Fast Launch:** Optimize splash screen duration
2. **Intuitive Navigation:** Follow iOS design patterns
3. **Dark Mode:** Support system appearance
4. **Accessibility:** VoiceOver, Dynamic Type
5. **Haptic Feedback:** Use appropriately

### Maintenance

1. **Monitor Crashes:** Xcode > Organizer > Crashes
2. **Read Reviews:** Respond within 24 hours
3. **Update Regularly:** Monthly or as needed
4. **Test on Real Devices:** Don't rely only on simulator
5. **Support Latest iOS:** Update within 2 months of release

---

**Ready to build for iOS! 🚀**
