# 🚀 Get Started - InsightSheet-lite

## Quick Start Guide

This guide will help you test the new features locally and prepare for deployment.

---

## 📦 What's New

### ✅ Completed Features

1. **P&L Builder** - Generate Profit & Loss statements from natural language
2. **File Analyzer** - AI-powered Excel file analysis with insights
3. **Enhanced ZIP Processor** - Search & replace in filenames
4. **No File Size Limits** - Process files of any size
5. **New Frontend Pages** - Beautiful UI for all features

---

## 🧪 Testing Locally

### Step 1: Backend Setup (5 minutes)

```bash
# Navigate to backend
cd backend

# Create virtual environment
python -m venv venv

# Activate (Windows)
venv\Scripts\activate

# Activate (Mac/Linux)
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Create .env file
# Windows PowerShell:
@"
DATABASE_URL=sqlite:///./insightsheet.db
OPENAI_API_KEY=sk-your-key-here
JWT_SECRET_KEY=test-secret-key-12345
CORS_ORIGINS=http://localhost:5173
"@ | Out-File -FilePath .env -Encoding utf8

# Mac/Linux:
cat > .env << EOF
DATABASE_URL=sqlite:///./insightsheet.db
OPENAI_API_KEY=sk-your-key-here
JWT_SECRET_KEY=test-secret-key-12345
CORS_ORIGINS=http://localhost:5173
EOF

# Initialize database
python -c "from app.database import init_db; init_db()"

# Start server
uvicorn app.main:app --reload --port 8000
```

**✅ Backend should be running at http://localhost:8000**

---

### Step 2: Frontend Setup (3 minutes)

```bash
# Open NEW terminal, go to project root
cd /path/to/Insightlite

# Install dependencies
npm install

# Create .env file
# Windows PowerShell:
@"
VITE_API_URL=http://localhost:8000
"@ | Out-File -FilePath .env -Encoding utf8

# Mac/Linux:
echo "VITE_API_URL=http://localhost:8000" > .env

# Start dev server
npm run dev
```

**✅ Frontend should be running at http://localhost:5173**

---

### Step 3: Test Features

#### Test P&L Builder
1. Open http://localhost:5173/PLBuilder
2. Enter: "Create monthly P&L for 2024 with revenue and expenses"
3. Click "Generate P&L Statement"
4. Excel file should download automatically

#### Test File Analyzer
1. Open http://localhost:5173/FileAnalyzer
2. Upload an Excel file (.xlsx, .xls, or .csv)
3. Click "Analyze File"
4. Review the AI-generated insights

#### Test Excel to PPT
1. Open http://localhost:5173/FileToPPT
2. Upload an Excel file
3. Wait for conversion
4. Download PowerPoint file

---

## 🐛 Troubleshooting

### Backend won't start?
```bash
# Check if port 8000 is in use
# Try different port:
uvicorn app.main:app --reload --port 8001
```

### Frontend can't connect to backend?
- Check `VITE_API_URL` in frontend `.env`
- Ensure backend is running
- Check CORS settings in backend

### Import errors?
```bash
# Reinstall dependencies
# Backend:
pip install -r requirements.txt

# Frontend:
npm install
```

---

## 📱 Testing Mobile Apps

### iOS
```bash
# Build web app
npm run build

# Sync to iOS
cd mobile
npx cap sync ios

# Open in Xcode
npx cap open ios

# Run on simulator or device
```

### Android
```bash
# Build web app
npm run build

# Sync to Android
cd mobile
npx cap sync android

# Open in Android Studio
npx cap open android

# Run on emulator or device
```

---

## 🚀 Deployment

### Quick Deploy (Recommended)

#### Backend: Railway
1. Go to [railway.app](https://railway.app)
2. Sign up/login
3. New Project → Deploy from GitHub
4. Select your repo
5. Add PostgreSQL database
6. Set environment variables:
   - `OPENAI_API_KEY`
   - `JWT_SECRET_KEY`
   - `DATABASE_URL` (auto-set from PostgreSQL)
7. Deploy!

#### Frontend: Vercel
1. Go to [vercel.com](https://vercel.com)
2. Sign up/login
3. New Project → Import from GitHub
4. Select your repo
5. Set environment variable:
   - `VITE_API_URL` = Your Railway backend URL
6. Deploy!

**✅ Your app is live!**

---

### Detailed Deployment

See `DEPLOYMENT_CHECKLIST.md` for complete deployment guide.

---

## 📚 Documentation

- **Testing**: `TESTING_GUIDE.md` - Complete testing instructions
- **Deployment**: `DEPLOYMENT_CHECKLIST.md` - Step-by-step deployment
- **Strategy**: `ENHANCEMENT_STRATEGY.md` - Feature roadmap
- **UI/UX**: `UI_UX_IMPROVEMENTS.md` - Design improvements
- **Analysis**: `PROJECT_ANALYSIS.md` - Codebase analysis

---

## 🎯 Next Steps

### Immediate
1. ✅ Test all features locally
2. ✅ Fix any issues you find
3. ✅ Get OpenAI API key if needed
4. ✅ Test with real Excel files

### Short-term
1. Deploy to staging environment
2. Test in production-like environment
3. Get user feedback
4. Fix bugs and optimize

### Long-term
1. Deploy to production
2. Submit mobile apps to stores
3. Market your application
4. Scale as needed

---

## 🔐 Security Reminders

**Before deploying to production:**
- [ ] Change CORS from `["*"]` to specific domains
- [ ] Set strong `JWT_SECRET_KEY`
- [ ] Remove default admin credentials
- [ ] Use PostgreSQL (not SQLite)
- [ ] Enable HTTPS
- [ ] Set up rate limiting

---

## 📞 Need Help?

1. Check the documentation files
2. Review error messages carefully
3. Check backend logs: `backend/logs/app.log`
4. Test endpoints with curl/Postman
5. Verify environment variables

---

## ✅ Checklist

Before you start:
- [ ] Python 3.11+ installed
- [ ] Node.js 18+ installed
- [ ] OpenAI API key obtained
- [ ] Git repository set up
- [ ] Code pulled from repo

Ready to test:
- [ ] Backend running
- [ ] Frontend running
- [ ] Can access both in browser
- [ ] Can register/login
- [ ] Can test new features

Ready to deploy:
- [ ] All features tested
- [ ] No errors in logs
- [ ] Security configured
- [ ] Environment variables set
- [ ] Database ready

---

**You're all set! Happy coding! 🎉**

*For detailed instructions, see the other documentation files.*
