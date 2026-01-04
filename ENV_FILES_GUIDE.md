# 📝 Environment Variables Guide (.env Files)

## 🎯 What are .env Files?

`.env` files store environment variables (configuration settings) that your app needs. They're kept separate from code for security.

---

## 📁 Two .env Files Needed

### 1. **Frontend .env** (Root directory)
- Location: `C:\Users\sumit\Documents\Insightlite\.env`
- Used by: React/Vite frontend
- Variables start with `VITE_` (required by Vite)

### 2. **Backend .env** (Backend directory)
- Location: `C:\Users\sumit\Documents\Insightlite\backend\.env`
- Used by: FastAPI backend
- Contains database, API keys, secrets

---

## 🚀 Quick Setup

### **Step 1: Create Frontend .env**

1. **In root directory** (`C:\Users\sumit\Documents\Insightlite\`):
   - Create file: `.env`
   - Add this content:

```env
VITE_API_URL=http://localhost:8000
```

**For Production (after backend deployed):**
```env
VITE_API_URL=https://your-backend-url.com
```

### **Step 2: Create Backend .env**

1. **In backend directory** (`C:\Users\sumit\Documents\Insightlite\backend\`):
   - Create file: `.env`
   - Add this content:

```env
# Database (use your Neon PostgreSQL)
DATABASE_URL=postgresql://neondb_owner:npg_fDwMP0Rk2vAe@ep-small-dream-abw9afwj-pooler.eu-west-2.aws.neon.tech/neondb?sslmode=require

# OpenAI API Key (get from https://platform.openai.com/api-keys)
OPENAI_API_KEY=sk-your-openai-api-key-here

# JWT Secret (generate a random string)
JWT_SECRET_KEY=your-super-secret-jwt-key-change-this

# CORS Origins
CORS_ORIGINS=http://localhost:5173,http://localhost:3000,https://meldra.ai

# Environment
ENVIRONMENT=development
```

---

## 🔑 Where to Get Values

### **1. DATABASE_URL**
- You already have this: `postgresql://neondb_owner:npg_fDwMP0Rk2vAe@ep-small-dream-abw9afwj-pooler.eu-west-2.aws.neon.tech/neondb?sslmode=require`
- **Remove** `&channel_binding=require` if present

### **2. OPENAI_API_KEY**
- Go to: [platform.openai.com/api-keys](https://platform.openai.com/api-keys)
- Sign in or create account
- Click "Create new secret key"
- Copy the key (starts with `sk-`)

### **3. JWT_SECRET_KEY**
- Generate a random string (32+ characters)
- You can use: [randomkeygen.com](https://randomkeygen.com/)
- Or run: `python -c "import secrets; print(secrets.token_urlsafe(32))"`

### **4. CORS_ORIGINS**
- Already set correctly
- Add more domains if needed (comma-separated)

---

## 📋 For Vercel Deployment

### **Option 1: Import .env in Vercel**

1. **Create a .env file** with frontend variables:
   ```env
   VITE_API_URL=http://localhost:8000
   ```

2. **In Vercel configuration page:**
   - Click **"Import .env"** button
   - Select your `.env` file
   - Vercel will read the variables

3. **Or paste directly:**
   - Click in the Environment Variables section
   - Paste: `VITE_API_URL=http://localhost:8000`

### **Option 2: Add Manually in Vercel**

1. **In Vercel configuration:**
   - Scroll to "Environment Variables"
   - Click **"+ Add More"**
   - Add:
     - **Key:** `VITE_API_URL`
     - **Value:** `http://localhost:8000` (or your backend URL)
     - **Environments:** Check Production, Preview, Development

---

## ⚠️ Important Notes

### **Frontend (.env in root):**
- ✅ Variables MUST start with `VITE_`
- ✅ Only `VITE_API_URL` is needed for now
- ✅ This file is safe to commit (no secrets)

### **Backend (.env in backend/):**
- ❌ **NEVER commit this file** (contains secrets)
- ✅ Add `backend/.env` to `.gitignore`
- ✅ Contains: API keys, database passwords, JWT secrets

---

## 🔒 Security

### **What to Commit:**
- ✅ `.env.example` files (templates)
- ✅ `backend/.env.example` (template)

### **What NOT to Commit:**
- ❌ `.env` (frontend - but safe if only has public URLs)
- ❌ `backend/.env` (backend - contains secrets!)

---

## 📝 Example Files

I've created:
- ✅ `.env.example` (frontend template)
- ✅ `backend/.env.example` (backend template)

**Copy these and fill in your values:**

```bash
# Frontend
copy .env.example .env

# Backend
copy backend\.env.example backend\.env
```

Then edit `.env` files with your actual values.

---

## 🚀 For Vercel Right Now

**On the Vercel configuration page:**

1. **In "Environment Variables" section:**
   - Click **"+ Add More"**
   - **Key:** `VITE_API_URL`
   - **Value:** `http://localhost:8000`
   - **Environments:** Check all (Production, Preview, Development)

2. **Or use "Import .env":**
   - Create `.env` file with: `VITE_API_URL=http://localhost:8000`
   - Click "Import .env" button
   - Select the file

**Then click "Deploy"!** 🚀

---

## 📚 More Info

- **Frontend variables:** Only `VITE_API_URL` needed for now
- **Backend variables:** Set up when deploying backend
- **Vercel:** Can add variables later in Project Settings → Environment Variables
