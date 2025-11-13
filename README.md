# InsightSheet

A modern data analysis application built with React and Base44. Available as a web app and native mobile apps for iOS and Android.

## 🌐 Web Application

This is a Vite+React app that communicates with the Base44 API.

### Running the web app

```bash
npm install
npm run dev
```

### Building the web app

```bash
npm run build
```

## 📱 Mobile Applications

Native iOS and Android apps are available in the `mobile/` directory.

### Quick Start

```bash
cd mobile
./quick-start.sh
```

### Documentation

- **[SETUP.md](mobile/SETUP.md)** - Quick setup guide
- **[README.md](mobile/README.md)** - Complete mobile documentation
- **[ios-setup.md](mobile/ios-setup.md)** - iOS specific guide
- **[android-setup.md](mobile/android-setup.md)** - Android specific guide
- **[STRUCTURE.md](mobile/STRUCTURE.md)** - Project structure overview

### Features

- ✅ Native iOS and Android applications
- ✅ Built with Capacitor (wraps React web app)
- ✅ Access to native device features
- ✅ Offline support
- ✅ App Store & Google Play ready

## 📂 Project Structure

```
insightsheet/
├── src/              # React web app source code
├── public/           # Public web assets
├── dist/             # Built web app (generated)
├── mobile/           # Native mobile apps
│   ├── ios/          # iOS app (Xcode project)
│   ├── android/      # Android app (Android Studio project)
│   └── *.md          # Mobile documentation
└── README.md         # This file
```

## 🚀 Deployment

### Web App
```bash
npm run build
# Deploy dist/ to your hosting provider
```

### Mobile Apps
See [mobile/README.md](mobile/README.md) for iOS App Store and Google Play Store deployment instructions.

## 📧 Support

For more information and support, please contact Base44 support at app@base44.com.