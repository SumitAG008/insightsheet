# Frontend Integration with Python Backend 🚀

## ✅ What's Been Done

Your frontend has been updated to work with the new Python backend!

### Files Created/Updated:

1. **`src/api/backendClient.js`** - Complete API client for Python backend
   - Authentication (login, register, logout)
   - AI/LLM integration
   - File processing (Excel to PPT, ZIP cleaning)
   - Subscriptions
   - Activity tracking
   - Admin endpoints

2. **`src/pages/Login.jsx`** - Login page with backend integration

3. **`src/pages/Register.jsx`** - Registration page with auto-login

4. **`src/pages/index.jsx`** - Updated routing to include login/register

5. **`.env`** - Environment configuration pointing to backend

6. **`.env.example`** - Template for environment variables

## 🚀 Quick Start

### 1. Start the Backend

```bash
# Terminal 1: Start Python backend
cd backend
./run.sh

# Or manually:
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Backend will run at: **http://localhost:8000**

### 2. Start the Frontend

```bash
# Terminal 2: Start React frontend
npm run dev
```

Frontend will run at: **http://localhost:5173**

### 3. Test the Application

1. Open **http://localhost:5173**
2. Click "Sign up" or go to **http://localhost:5173/register**
3. Create an account
4. You'll be auto-logged in and redirected to dashboard
5. Test features:
   - Excel to PPT: Upload Excel file and convert
   - ZIP cleaner: Upload ZIP and clean filenames
   - AI Assistant: Ask questions about your data

## 🔄 Migration from Base44

The new `backendClient.js` includes **backward compatibility** with Base44 API:

```javascript
// Old Base44 code still works:
import { base44 } from '@/api/backendClient';

// But you can also use the new backend API:
import { backendApi } from '@/api/backendClient';
```

### Components That Need Updating

These components currently use Base44 and should be updated:

1. **`src/pages/FileToPPT.jsx`** - Update to use `backendApi.files.excelToPpt()`
2. **`src/pages/FilenameCleaner.jsx`** - Update to use `backendApi.files.processZip()`
3. **`src/components/dashboard/AIAssistant.jsx`** - Update to use `backendApi.llm.invoke()`
4. **`src/components/subscription/SubscriptionChecker.jsx`** - Update to use `backendApi.subscriptions.getMy()`

### Example Migration

**Before (Base44):**
```javascript
import { base44 } from '@/api/base44Client';

const user = await base44.auth.me();
const result = await base44.integrations.Core.InvokeLLM(prompt);
```

**After (Backend API):**
```javascript
import { backendApi } from '@/api/backendClient';

const user = await backendApi.auth.me();
const result = await backendApi.llm.invoke(prompt);
```

## 🔑 Authentication

The new backend uses JWT tokens:

### Login Flow
1. User enters email/password
2. Backend returns JWT token
3. Token stored in localStorage
4. Token sent in `Authorization: Bearer {token}` header for all requests

### Token Management
```javascript
import { backendApi } from '@/api/backendClient';

// Login
const result = await backendApi.auth.login(email, password);
// Token automatically stored

// Check if authenticated
if (backendApi.auth.isAuthenticated()) {
  // User is logged in
}

// Logout
backendApi.auth.logout();
```

### Protected Routes

Add authentication check to components:

```javascript
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { backendApi } from '@/api/backendClient';

function ProtectedComponent() {
  const navigate = useNavigate();

  useEffect(() => {
    if (!backendApi.auth.isAuthenticated()) {
      navigate('/login');
    }
  }, [navigate]);

  // Component code...
}
```

## 📡 API Usage Examples

### AI/LLM

```javascript
import { backendApi } from '@/api/backendClient';

// Invoke GPT-4
const result = await backendApi.llm.invoke(
  "Analyze this sales data and provide insights",
  { addContext: false }
);
console.log(result.response);

// Generate formula
const formula = await backendApi.llm.generateFormula(
  "Sum all values in column A",
  "Sales spreadsheet"
);
console.log(formula.formula, formula.explanation);

// Analyze data
const analysis = await backendApi.llm.analyzeData(
  "Sales data with Product, Revenue, Date columns",
  "What are top selling products?"
);
console.log(analysis.insights);

// Suggest chart
const suggestion = await backendApi.llm.suggestChart(
  [
    { name: "Product", type: "text" },
    { name: "Revenue", type: "numeric" }
  ]
);
console.log(suggestion.primary_chart);
```

### File Processing

```javascript
import { backendApi } from '@/api/backendClient';

// Excel to PowerPoint
const excelFile = document.querySelector('input[type="file"]').files[0];
const pptBlob = await backendApi.files.excelToPpt(excelFile);

// Download result
const url = URL.createObjectURL(pptBlob);
const a = document.createElement('a');
a.href = url;
a.download = 'presentation.pptx';
a.click();

// Process ZIP file
const zipFile = document.querySelector('input[type="file"]').files[0];
const options = {
  allowed_chars: 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789._-',
  disallowed_chars: '',
  replace_char: '_',
  remove_spaces: false,
  max_length: 255,
  languages: ['german', 'italian']
};

const processedZip = await backendApi.files.processZip(zipFile, options);

// Download result
const url2 = URL.createObjectURL(processedZip);
const a2 = document.createElement('a');
a2.href = url2;
a2.download = 'processed.zip';
a2.click();
```

### Subscriptions

```javascript
import { backendApi } from '@/api/backendClient';

// Get subscription
const subscription = await backendApi.subscriptions.getMy();
console.log(subscription.plan); // 'free' or 'premium'
console.log(subscription.ai_queries_used);
console.log(subscription.ai_queries_limit);

// Upgrade to premium
await backendApi.subscriptions.upgrade();
```

### Activity Logging

```javascript
import { backendApi } from '@/api/backendClient';

// Log activity
await backendApi.activity.log(
  'file_upload',
  'dashboard',
  'Excel file uploaded'
);

// Get history
const activities = await backendApi.activity.getHistory(50);
```

## 🔒 File Size Limits

The backend enforces file size limits based on subscription:

- **Free Plan**: 10MB maximum
- **Premium Plan**: 500MB maximum

These are checked on the backend, so you'll get a 413 error if exceeded:

```javascript
try {
  const result = await backendApi.files.excelToPpt(file);
} catch (error) {
  if (error.message.includes('exceeds')) {
    // Show upgrade message
    alert('File too large. Upgrade to Premium for 500MB limit!');
  }
}
```

## 🛠️ Updating Existing Components

### Update FileToPPT.jsx

Find this line:
```javascript
import { base44 } from '@/api/base44Client';
```

Change to:
```javascript
import { backendApi } from '@/api/backendClient';
```

Then update the file upload handler to use the new API (already backwards compatible).

### Update FilenameCleaner.jsx

Same process - import `backendApi` instead of `base44`.

### Update AIAssistant.jsx

Update LLM calls to use `backendApi.llm.invoke()`.

## 🧪 Testing

### Test Authentication

1. Visit http://localhost:5173/register
2. Create account with any email/password
3. Should auto-login and redirect to dashboard
4. Logout and login again at /login

### Test File Processing

1. Login first
2. Go to Excel to PPT page
3. Upload a small Excel file (< 10MB for free plan)
4. Should convert and download automatically

### Test AI Features

1. Login first
2. Go to AI Assistant or Dashboard
3. Ask a question
4. Should get GPT-4 response
5. Check your AI query count in subscription

### Test Admin Features

1. Register with email: **sumitagaria@gmail.com**
2. This account gets admin role automatically
3. Visit /AdminDashboard
4. Should see all users and subscriptions

## 📊 Database Initialization

The backend automatically creates database tables on first run. If using SQLite (default), you'll see `insightsheet.db` file created.

If using PostgreSQL (production):
```bash
cd backend
cp .env.example .env
# Edit .env with your Neon PostgreSQL URL
python -c "from app.database import init_db; init_db()"
```

## 🚀 Deployment

### Backend Deployment

Deploy backend to:
- Heroku
- Railway
- DigitalOcean
- Render
- Your VPS

Update frontend `.env`:
```env
VITE_API_URL=https://your-backend-domain.com
```

### Frontend Deployment

Deploy frontend to:
- Vercel
- Netlify
- Base44 (if you want to keep it there)
- Your hosting

Make sure to set environment variables in your hosting platform.

## 🔧 Troubleshooting

### Backend not starting?

```bash
cd backend
python test_backend.py
```

This will check all imports and database connectivity.

### Frontend can't connect to backend?

Check `.env` file has correct backend URL:
```env
VITE_API_URL=http://localhost:8000
```

Restart Vite after changing `.env`.

### Authentication not working?

1. Check backend is running at http://localhost:8000
2. Visit http://localhost:8000/docs to test API
3. Try registering a new account
4. Check browser console for errors

### File upload fails?

1. Check file size (< 10MB for free plan)
2. Check file type (.xlsx, .xls, .csv for Excel; .zip for ZIP)
3. Make sure you're logged in
4. Check backend logs: `tail -f backend/logs/app.log`

## 📞 Support

- Backend docs: `backend/README.md`
- API docs: http://localhost:8000/docs
- Privacy policy: `backend/PRIVACY_POLICY.md`

---

**Your frontend is now fully integrated with the Python backend!** 🎉

Test it out by starting both servers and accessing http://localhost:5173
