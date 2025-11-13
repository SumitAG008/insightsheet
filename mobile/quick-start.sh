#!/bin/bash

# InsightSheet Mobile - Quick Start Script
# This script automates the initial setup of the mobile app

set -e  # Exit on error

echo "🚀 InsightSheet Mobile - Quick Start Setup"
echo "=========================================="
echo ""

# Check if we're in the mobile directory
if [ ! -f "capacitor.config.ts" ]; then
    echo "❌ Error: Please run this script from the mobile/ directory"
    exit 1
fi

# Check Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Error: Node.js is not installed"
    echo "   Install from: https://nodejs.org/"
    exit 1
fi

echo "✅ Node.js found: $(node --version)"
echo ""

# Step 1: Install dependencies
echo "📦 Step 1/5: Installing Capacitor dependencies..."
npm install
echo "✅ Dependencies installed"
echo ""

# Step 2: Build web app
echo "🔨 Step 2/5: Building React web app..."
cd ..
if [ ! -d "node_modules" ]; then
    echo "   Installing web app dependencies first..."
    npm install
fi
npm run build
cd mobile
echo "✅ Web app built"
echo ""

# Step 3: Check platform
PLATFORM="$(uname)"
echo "💻 Detected platform: $PLATFORM"
echo ""

# Step 4: Add platforms
echo "📱 Step 3/5: Adding mobile platforms..."

if [ "$PLATFORM" = "Darwin" ]; then
    # macOS - can add both iOS and Android
    echo "   Adding iOS platform..."
    npx cap add ios || echo "   ⚠️  iOS already added or failed"

    echo "   Adding Android platform..."
    npx cap add android || echo "   ⚠️  Android already added or failed"

    # Install CocoaPods dependencies
    if command -v pod &> /dev/null; then
        echo "   Installing iOS CocoaPods..."
        cd ios/App
        pod install
        cd ../..
        echo "✅ iOS pods installed"
    else
        echo "   ⚠️  CocoaPods not found. Install with: sudo gem install cocoapods"
    fi
else
    # Linux/Windows - only Android
    echo "   Adding Android platform..."
    npx cap add android || echo "   ⚠️  Android already added or failed"
    echo "   ℹ️  iOS development requires macOS"
fi

echo "✅ Platforms added"
echo ""

# Step 5: Sync
echo "🔄 Step 4/5: Syncing web app to native platforms..."
npx cap sync
echo "✅ Sync complete"
echo ""

# Step 6: Final instructions
echo "🎉 Step 5/5: Setup Complete!"
echo "=========================================="
echo ""
echo "Next Steps:"
echo ""

if [ "$PLATFORM" = "Darwin" ]; then
    echo "For iOS:"
    echo "  npm run open:ios"
    echo "  Then click ▶️  in Xcode to run"
    echo ""
fi

echo "For Android:"
echo "  npm run open:android"
echo "  Then click ▶️  in Android Studio to run"
echo ""

echo "📚 Documentation:"
echo "  • SETUP.md - Quick setup guide"
echo "  • README.md - Complete documentation"
echo "  • ios-setup.md - iOS specific guide"
echo "  • android-setup.md - Android specific guide"
echo ""

echo "💡 Development workflow:"
echo "  1. Make changes to React app in ../src"
echo "  2. npm run sync"
echo "  3. Run from Xcode/Android Studio"
echo ""

echo "✨ Happy coding!"
