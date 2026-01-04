# Quick Start Guide

## 🚀 Get Started in 5 Minutes

### 1. Backend Setup
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt

# Create .env file
echo "OPENAI_API_KEY=sk-your-key-here" > .env
echo "DATABASE_URL=sqlite:///./insightsheet.db" >> .env
echo "JWT_SECRET_KEY=your-secret-key" >> .env

# Initialize database
python -c "from app.database import init_db; init_db()"

# Run server
uvicorn app.main:app --reload
```

### 2. Frontend Setup
```bash
# Install dependencies
npm install

# Create .env file
echo "VITE_API_URL=http://localhost:8000" > .env

# Run dev server
npm run dev
```

### 3. Test New Features

#### Test P&L Builder
```bash
curl -X POST http://localhost:8000/api/files/generate-pl \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "prompt": "Create monthly P&L for 2024 with revenue and expenses"
  }'
```

#### Test File Analyzer
```bash
curl -X POST http://localhost:8000/api/files/analyze \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@your-file.xlsx"
```

---

## 📱 Mobile App Setup

### iOS
```bash
npm run build
cd mobile
npx cap sync ios
npx cap open ios
```

### Android
```bash
npm run build
cd mobile
npx cap sync android
npx cap open android
```

---

## 🎯 Key Features

1. **Excel to PPT** - Convert spreadsheets to presentations
2. **File Analyzer** - AI-powered file insights
3. **P&L Builder** - Generate financial statements from text
4. **ZIP Cleaner** - Clean and rename files in ZIP archives
5. **No Limits** - Process files of any size

---

## 📚 Documentation

- **Strategy**: `ENHANCEMENT_STRATEGY.md`
- **Deployment**: `DEPLOYMENT_GUIDE.md`
- **UI/UX**: `UI_UX_IMPROVEMENTS.md`
- **Analysis**: `PROJECT_ANALYSIS.md`

---

*Happy coding! 🎉*
