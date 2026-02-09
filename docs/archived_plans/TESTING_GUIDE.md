# Testing Guide - InsightSheet-lite

## 🧪 Local Testing Instructions

### Prerequisites
- Python 3.11+ installed
- Node.js 18+ installed
- OpenAI API key
- PostgreSQL (optional, SQLite works for testing)

---

## 📋 Step-by-Step Testing

### Step 1: Backend Setup

```bash
# Navigate to backend directory
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# Windows:
venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Create .env file
# Windows (PowerShell):
@"
DATABASE_URL=sqlite:///./insightsheet.db
OPENAI_API_KEY=sk-your-openai-key-here
JWT_SECRET_KEY=your-secret-key-for-testing
CORS_ORIGINS=http://localhost:5173,http://localhost:3000
"@ | Out-File -FilePath .env -Encoding utf8

# macOS/Linux:
cat > .env << EOF
DATABASE_URL=sqlite:///./insightsheet.db
OPENAI_API_KEY=sk-your-openai-key-here
JWT_SECRET_KEY=your-secret-key-for-testing
CORS_ORIGINS=http://localhost:5173,http://localhost:3000
EOF

# Initialize database
python -c "from app.database import init_db; init_db()"

# Start backend server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

**Expected Output:**
```
INFO:     Uvicorn running on http://0.0.0.0:8000
INFO:     Application startup complete.
```

**Test Backend:**
```bash
# Open new terminal, test health endpoint
curl http://localhost:8000/health

# Should return:
# {"status":"healthy","service":"InsightSheet-lite Backend","version":"1.0.0",...}
```

---

### Step 2: Frontend Setup

```bash
# Open new terminal, navigate to project root
cd /path/to/Insightlite

# Install dependencies
npm install

# Create .env file
# Windows (PowerShell):
@"
VITE_API_URL=http://localhost:8000
"@ | Out-File -FilePath .env -Encoding utf8

# macOS/Linux:
echo "VITE_API_URL=http://localhost:8000" > .env

# Start development server
npm run dev
```

**Expected Output:**
```
  VITE v6.x.x  ready in xxx ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
```

**Test Frontend:**
- Open browser: http://localhost:5173
- Should see the application homepage

---

### Step 3: Test Authentication

#### Register a Test User

```bash
# Using curl
curl -X POST http://localhost:8000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "test123456",
    "full_name": "Test User"
  }'
```

**Or use the frontend:**
1. Navigate to http://localhost:5173
2. Look for register/login option
3. Create account with test credentials

#### Login

```bash
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "test123456"
  }'
```

**Save the access_token from response!**

---

### Step 4: Test New Features

#### Test 1: File Analyzer

**Using curl:**
```bash
# Replace YOUR_TOKEN with actual token from login
curl -X POST http://localhost:8000/api/files/analyze \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@/path/to/your/test-file.xlsx"
```

**Using Frontend:**
1. Navigate to http://localhost:5173/FileAnalyzer
2. Click "Upload" or drag & drop an Excel file
3. Click "Analyze File"
4. Wait for results
5. Review the analysis

**Expected Results:**
- File structure analysis
- Column information
- Data quality assessment
- AI-powered insights
- Recommendations

---

#### Test 2: P&L Builder

**Using curl:**
```bash
curl -X POST http://localhost:8000/api/files/generate-pl \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Create monthly P&L for 2024 with revenue and expenses",
    "context": {
      "company_name": "Test Company",
      "currency": "USD",
      "period_type": "monthly"
    }
  }' \
  --output pl_statement.xlsx
```

**Using Frontend:**
1. Navigate to http://localhost:5173/PLBuilder
2. Enter prompt: "Create monthly P&L for 2024 with revenue and expenses"
3. Optionally set company name, currency, period type
4. Click "Generate P&L Statement"
5. File should download automatically

**Expected Results:**
- Excel file downloads
- Contains formatted P&L structure
- Has formulas for calculations
- Includes charts (if enabled)
- Professional formatting

**Open the downloaded file and verify:**
- ✓ Proper structure (Revenue, Expenses, Net Profit)
- ✓ Formulas work correctly
- ✓ Formatting looks professional
- ✓ Charts are present (if generated)

---

#### Test 3: Excel to PPT (Enhanced)

**Using curl:**
```bash
curl -X POST http://localhost:8000/api/files/excel-to-ppt \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@/path/to/your/test-file.xlsx" \
  --output presentation.pptx
```

**Using Frontend:**
1. Navigate to http://localhost:5173/FileToPPT
2. Upload Excel file
3. Wait for conversion
4. Download PowerPoint file

**Expected Results:**
- PowerPoint file downloads
- Contains slides with data
- Has charts and visualizations
- Professional formatting

---

#### Test 4: ZIP Processor (Enhanced with Search/Replace)

**Using curl:**
```bash
curl -X POST http://localhost:8000/api/files/process-zip \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@/path/to/your/test-file.zip" \
  -F 'options={"search_pattern":"old_name","replace_with":"new_name","use_regex":false}' \
  --output processed.zip
```

**Using Frontend:**
1. Navigate to http://localhost:5173/FilenameCleaner
2. Upload ZIP file
3. Configure options (search/replace, language, etc.)
4. Process and download

---

### Step 5: Test Large Files

**Test with large Excel file (>100MB):**
1. Create or use a large Excel file
2. Upload to File Analyzer
3. Verify it processes without errors
4. Check processing time is reasonable

**Expected:**
- No file size limit errors
- Processing completes successfully
- Results are accurate

---

### Step 6: Test Error Handling

#### Test Invalid File Types
1. Try uploading a .pdf to File Analyzer
2. Should show appropriate error message

#### Test Invalid Prompts
1. Try empty prompt in P&L Builder
2. Should show validation error

#### Test Network Errors
1. Stop backend server
2. Try making a request
3. Should show appropriate error

---

## 🐛 Troubleshooting

### Backend Issues

**Issue: Module not found**
```bash
# Solution: Reinstall dependencies
pip install -r requirements.txt
```

**Issue: Database connection error**
```bash
# Solution: Check DATABASE_URL in .env
# For SQLite, ensure path is correct
# For PostgreSQL, check connection string
```

**Issue: OpenAI API error**
```bash
# Solution: Verify OPENAI_API_KEY in .env
# Check API key is valid and has credits
```

**Issue: Port already in use**
```bash
# Solution: Use different port
uvicorn app.main:app --reload --port 8001
```

### Frontend Issues

**Issue: Cannot connect to backend**
```bash
# Solution: Check VITE_API_URL in .env
# Ensure backend is running
# Check CORS settings
```

**Issue: Module not found**
```bash
# Solution: Reinstall dependencies
npm install
```

**Issue: Build errors**
```bash
# Solution: Clear cache and rebuild
rm -rf node_modules .vite
npm install
npm run dev
```

---

## ✅ Testing Checklist

### Backend Tests
- [ ] Backend starts without errors
- [ ] Health endpoint responds
- [ ] Database initializes correctly
- [ ] User registration works
- [ ] User login works
- [ ] JWT tokens are generated
- [ ] File analyzer endpoint works
- [ ] P&L builder endpoint works
- [ ] Excel to PPT endpoint works
- [ ] ZIP processor endpoint works
- [ ] Large files process correctly
- [ ] Error handling works

### Frontend Tests
- [ ] Frontend starts without errors
- [ ] Pages load correctly
- [ ] File upload works
- [ ] File analyzer page works
- [ ] P&L builder page works
- [ ] Excel to PPT page works
- [ ] ZIP cleaner page works
- [ ] Error messages display correctly
- [ ] Loading states work
- [ ] File downloads work

### Integration Tests
- [ ] Frontend can connect to backend
- [ ] Authentication flow works
- [ ] File upload → processing → download works
- [ ] All features work end-to-end
- [ ] Mobile responsive (if applicable)

---

## 📊 Performance Testing

### Test File Processing Speed
```bash
# Time a file analysis
time curl -X POST http://localhost:8000/api/files/analyze \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@test-file.xlsx"
```

### Test Concurrent Requests
```bash
# Use Apache Bench or similar
ab -n 10 -c 2 -H "Authorization: Bearer YOUR_TOKEN" \
  -p test-file.xlsx -T "multipart/form-data" \
  http://localhost:8000/api/files/analyze
```

---

## 🎯 Next Steps After Testing

1. **Fix any issues found**
2. **Optimize slow operations**
3. **Add more error handling**
4. **Improve user feedback**
5. **Prepare for deployment**

---

## 📝 Test Data

### Sample Excel Files
Create test files with:
- Small file (<1MB): 10 rows, 5 columns
- Medium file (1-10MB): 1000 rows, 10 columns
- Large file (>10MB): 10000+ rows, 20+ columns

### Sample P&L Prompts
- "Create monthly P&L for 2024"
- "Build quarterly profit and loss statement"
- "Generate annual P&L with department breakdown"

---

*Happy Testing! 🚀*
