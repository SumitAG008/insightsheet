# 🔑 Fix OpenAI API Key Error

## ❌ Current Error

**Error:** `Incorrect API key provided: your-ope************here`

This means the backend is using a placeholder API key instead of a real one.

---

## ✅ Solution: Set OpenAI API Key

### **Step 1: Get Your OpenAI API Key**

1. **Go to OpenAI Platform:**
   - Visit: [https://platform.openai.com/account/api-keys](https://platform.openai.com/account/api-keys)
   - Sign in to your OpenAI account

2. **Create a New API Key:**
   - Click **"Create new secret key"**
   - Give it a name (e.g., "Meldra Production")
   - Click **"Create secret key"**
   - **Copy the key immediately** (it starts with `sk-` and you won't see it again)

3. **Save the Key:**
   - Store it securely (password manager, notes app, etc.)
   - Format: `sk-...` (long string)

---

### **Step 2: Set API Key in Railway (Backend)**

1. **Go to Railway Dashboard:**
   - [railway.app](https://railway.app)
   - Click on your **"insightsheet"** service

2. **Open Environment Variables:**
   - Click **"Variables"** tab (or **"Settings"** → **"Variables"**)

3. **Add/Update OPENAI_API_KEY:**
   - Look for `OPENAI_API_KEY` in the list
   - If it exists and shows `your-ope************here` → **Click to edit**
   - If it doesn't exist → **Click "New Variable"**
   - **Variable Name:** `OPENAI_API_KEY`
   - **Value:** Paste your OpenAI API key (starts with `sk-`)
   - **Click "Add"** or **"Update"**

4. **Redeploy:**
   - Railway will automatically redeploy when you change environment variables
   - Or go to **"Deployments"** tab → Click **"Redeploy"**
   - Wait 2-3 minutes for deployment

---

### **Step 3: Set API Key Locally (For Development)**

If you're running the backend locally:

1. **Open `backend/.env` file:**
   ```bash
   cd backend
   # Edit .env file
   ```

2. **Add/Update the key:**
   ```env
   OPENAI_API_KEY=sk-your-actual-key-here
   ```

3. **Restart the backend:**
   ```bash
   # Stop the current server (Ctrl+C)
   # Then restart:
   uvicorn app.main:app --reload --host 0.0.0.0 --port 8001
   ```

---

## 🔍 Verify It's Working

1. **Test the AI Assistant:**
   - Go to your app: `http://localhost:5173/agenticai` (local) or your Vercel URL
   - Try the "Deploy AI Agent" button
   - Should work without the API key error

2. **Check Backend Logs:**
   - Railway → Your Service → **"Logs"** tab
   - Should NOT show "Incorrect API key" errors

---

## ⚠️ Important Notes

- **Never commit API keys to GitHub** - They're in `.env` which is in `.gitignore`
- **Keep your API key secret** - Don't share it publicly
- **Monitor usage** - Check [OpenAI Usage Dashboard](https://platform.openai.com/usage) to track costs
- **Set usage limits** - In OpenAI dashboard, set spending limits to avoid unexpected charges

---

## 🚀 After Setting the Key

1. ✅ Railway will auto-redeploy (or manually redeploy)
2. ✅ Wait 2-3 minutes for deployment
3. ✅ Test AI Assistant feature
4. ✅ Should work without errors!

---

## 📋 Quick Checklist

- [ ] Get OpenAI API key from [platform.openai.com](https://platform.openai.com/account/api-keys)
- [ ] Add `OPENAI_API_KEY` to Railway environment variables
- [ ] Update local `.env` file (if running locally)
- [ ] Redeploy Railway service
- [ ] Test AI Assistant feature
- [ ] Verify no more API key errors

---

**Once the API key is set correctly, the AI Assistant will work!** 🎉
