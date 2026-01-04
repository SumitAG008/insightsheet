# InsightSheet-lite Deployment Guide

## 📱 iOS Deployment

### Prerequisites
- macOS with Xcode installed
- Apple Developer Account ($99/year)
- Node.js and npm
- Capacitor CLI

### Step 1: Build Web App
```bash
# Build production version
npm run build

# This creates optimized files in dist/
```

### Step 2: Sync to iOS
```bash
cd mobile
npx cap sync ios
```

### Step 3: Configure iOS App

#### Update `mobile/ios/App/App/Info.plist`
```xml
<key>CFBundleDisplayName</key>
<string>InsightSheet</string>
<key>CFBundleIdentifier</key>
<string>com.meldra.insightsheet</string>
<key>NSPhotoLibraryUsageDescription</key>
<string>We need access to your photos to process files</string>
<key>NSDocumentPickerUsageDescription</key>
<string>We need access to files to process them</string>
```

#### Configure App Icons
1. Open `mobile/ios/App/App/Assets.xcassets/AppIcon.appiconset/`
2. Add icons in sizes: 20x20, 29x29, 40x40, 60x60, 76x76, 83.5x83.5, 1024x1024

### Step 4: Open in Xcode
```bash
npx cap open ios
```

### Step 5: Configure Signing
1. In Xcode, select project → Signing & Capabilities
2. Select your Team
3. Xcode will automatically manage provisioning profiles

### Step 6: Build and Test
1. Select a simulator or connected device
2. Click Run (⌘R)
3. Test the app

### Step 7: Archive for App Store
1. Select "Any iOS Device" as target
2. Product → Archive
3. Wait for archive to complete
4. Click "Distribute App"
5. Choose "App Store Connect"
6. Follow the wizard

### Step 8: Submit to App Store
1. Go to [App Store Connect](https://appstoreconnect.apple.com)
2. Create new app
3. Fill in app information
4. Upload build from Xcode
5. Submit for review

---

## 🤖 Android Deployment

### Prerequisites
- Android Studio
- Java Development Kit (JDK 11+)
- Google Play Developer Account ($25 one-time)

### Step 1: Build Web App
```bash
npm run build
```

### Step 2: Sync to Android
```bash
cd mobile
npx cap sync android
```

### Step 3: Configure Android App

#### Update `mobile/android/app/build.gradle`
```gradle
android {
    defaultConfig {
        applicationId "com.meldra.insightsheet"
        minSdkVersion 22
        targetSdkVersion 34
        versionCode 1
        versionName "1.0.0"
    }
}
```

#### Update `mobile/android/app/src/main/AndroidManifest.xml`
```xml
<manifest>
    <uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />
    <uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" />
    <uses-permission android:name="android.permission.INTERNET" />
    
    <application>
        <activity>
            <intent-filter>
                <action android:name="android.intent.action.VIEW" />
                <category android:name="android.intent.category.DEFAULT" />
                <data android:mimeType="application/vnd.ms-excel" />
                <data android:mimeType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" />
            </intent-filter>
        </activity>
    </application>
</manifest>
```

### Step 4: Open in Android Studio
```bash
npx cap open android
```

### Step 5: Generate Signed Bundle
1. Build → Generate Signed Bundle / APK
2. Choose "Android App Bundle"
3. Create keystore (save credentials securely!)
4. Select release build variant
5. Generate bundle

### Step 6: Upload to Google Play
1. Go to [Google Play Console](https://play.google.com/console)
2. Create new app
3. Fill in store listing
4. Upload AAB file
5. Complete content rating
6. Submit for review

---

## 🌐 Web Deployment

### Option 1: Vercel (Recommended - Easiest)

#### Setup
```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy
vercel

# Set environment variables
vercel env add VITE_API_URL production
# Enter: https://your-backend-url.com
```

#### Configure `vercel.json`
```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

#### Auto-deploy from GitHub
1. Connect GitHub repo to Vercel
2. Vercel auto-deploys on push to main
3. Preview deployments for PRs

---

### Option 2: Netlify

#### Setup
```bash
# Install Netlify CLI
npm i -g netlify-cli

# Login
netlify login

# Deploy
netlify deploy --prod
```

#### Configure `netlify.toml`
```toml
[build]
  command = "npm run build"
  publish = "dist"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

#### Environment Variables
Set in Netlify dashboard:
- `VITE_API_URL` = your backend URL

---

### Option 3: Cloudflare Pages

1. Connect GitHub repo
2. Build command: `npm run build`
3. Build output: `dist`
4. Set environment variables
5. Deploy!

---

## 🖥️ Backend Deployment

### Option 1: Railway (Easiest)

#### Setup
```bash
# Install Railway CLI
npm i -g @railway/cli

# Login
railway login

# Initialize
cd backend
railway init

# Add PostgreSQL
railway add postgresql

# Set environment variables
railway variables set OPENAI_API_KEY=sk-...
railway variables set JWT_SECRET_KEY=your-secret-key
railway variables set DATABASE_URL=${{Postgres.DATABASE_URL}}

# Deploy
railway up
```

Railway automatically:
- Detects Python project
- Installs dependencies
- Runs migrations
- Deploys on git push

---

### Option 2: Render

1. Connect GitHub repo
2. Create new Web Service
3. Select `backend` directory
4. Build command: `pip install -r requirements.txt`
5. Start command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
6. Add PostgreSQL database
7. Set environment variables
8. Deploy!

---

### Option 3: DigitalOcean App Platform

1. Connect GitHub repo
2. Create new App
3. Add Python service
4. Add PostgreSQL database
5. Configure environment variables
6. Deploy!

---

### Option 4: Docker Deployment

#### Build Image
```bash
cd backend
docker build -t insightsheet-backend .
```

#### Run Container
```bash
docker run -d \
  -p 8000:8000 \
  -e DATABASE_URL=postgresql://... \
  -e OPENAI_API_KEY=sk-... \
  -e JWT_SECRET_KEY=your-secret \
  --name insightsheet-backend \
  insightsheet-backend
```

#### Docker Compose
```bash
docker-compose up -d
```

---

## 🔧 Environment Variables

### Frontend (.env)
```env
VITE_API_URL=https://your-backend-url.com
```

### Backend (.env)
```env
# Database
DATABASE_URL=postgresql://user:password@host:5432/dbname

# JWT
JWT_SECRET_KEY=your-super-secret-key-change-this
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# OpenAI
OPENAI_API_KEY=sk-your-key-here

# CORS
CORS_ORIGINS=https://your-frontend-url.com,https://meldra.ai

# Server
HOST=0.0.0.0
PORT=8000
ENVIRONMENT=production
```

---

## ✅ Pre-Deployment Checklist

### Security
- [ ] Change default admin credentials
- [ ] Set strong JWT_SECRET_KEY
- [ ] Restrict CORS origins
- [ ] Enable HTTPS
- [ ] Set up rate limiting
- [ ] Configure proper logging

### Database
- [ ] Set up PostgreSQL (not SQLite for production)
- [ ] Run database migrations
- [ ] Set up backups
- [ ] Configure connection pooling

### Monitoring
- [ ] Set up error tracking (Sentry)
- [ ] Configure uptime monitoring
- [ ] Set up log aggregation
- [ ] Configure alerts

### Performance
- [ ] Enable CDN for static assets
- [ ] Configure caching
- [ ] Optimize images
- [ ] Enable compression

### Testing
- [ ] Test all features
- [ ] Load testing
- [ ] Security testing
- [ ] Mobile testing

---

## 🚀 Post-Deployment

### 1. Verify Deployment
- [ ] Frontend loads correctly
- [ ] Backend API responds
- [ ] Database connection works
- [ ] File uploads work
- [ ] AI features work

### 2. Monitor
- [ ] Check error logs
- [ ] Monitor API response times
- [ ] Track user signups
- [ ] Monitor file processing

### 3. Optimize
- [ ] Analyze performance metrics
- [ ] Optimize slow queries
- [ ] Cache frequently accessed data
- [ ] Scale resources as needed

---

## 📞 Support

For deployment issues:
1. Check logs: `railway logs` or `docker logs`
2. Verify environment variables
3. Test database connection
4. Check API health: `/health` endpoint

---

*Last updated: January 2025*
