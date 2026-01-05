# 🚀 Deploy Local Changes to Vercel & Railway via GitHub

## 📋 Overview

This guide shows you how to:
1. ✅ Push your local changes to GitHub
2. ✅ Trigger automatic deployments on Vercel and Railway
3. ✅ Verify deployments are successful

---

## 🔄 Step-by-Step Process

### **Step 1: Check Your Local Changes**

First, see what changes you have locally:

```bash
# Check status
git status

# See what files changed
git diff
```

---

### **Step 2: Add Changes to Git**

Add all your changed files:

```bash
# Add all changes
git add .

# Or add specific files
git add src/pages/AgenticAI.jsx
git add backend/app/main.py
```

---

### **Step 3: Commit Changes**

Create a commit with a descriptive message:

```bash
# Commit with message
git commit -m "Fix AI Assistant error handling and improve error messages"

# Or use a more detailed message
git commit -m "Fix AI Assistant: correct response parsing, improve backend error handling, and add better error messages"
```

---

### **Step 4: Push to GitHub**

Push your commits to GitHub:

```bash
# Push to main branch
git push origin main

# If you're on a different branch
git push origin your-branch-name
```

**Output should show:**
```
Enumerating objects: X, done.
Counting objects: 100% (X/X), done.
Writing objects: 100% (X/X), done.
To https://github.com/SumitAG008/insightsheet.git
   abc1234..def5678  main -> main
```

---

### **Step 5: Verify Push to GitHub**

1. **Go to GitHub:**
   - Visit: [github.com/SumitAG008/insightsheet](https://github.com/SumitAG008/insightsheet)

2. **Check Latest Commit:**
   - You should see your latest commit at the top
   - Commit message should match what you wrote

3. **Verify Files Changed:**
   - Click on the commit to see which files were changed

---

### **Step 6: Check Vercel Auto-Deploy**

1. **Go to Vercel Dashboard:**
   - [vercel.com/dashboard](https://vercel.com/dashboard)
   - Click on your project (e.g., "meldra" or "insightsheet")

2. **Check Deployments Tab:**
   - Go to **"Deployments"** tab
   - Look for a new deployment with your commit message
   - Status should show: **"Building"** → **"Ready"**

3. **If Auto-Deploy is Working:**
   - ✅ New deployment appears within 1-2 minutes
   - ✅ Build completes in 2-3 minutes
   - ✅ Status changes to "Ready"
   - ✅ Your changes are live!

4. **If No New Deployment:**
   - See "Manual Redeploy" section below

---

### **Step 7: Check Railway Auto-Deploy**

1. **Go to Railway Dashboard:**
   - [railway.app](https://railway.app)
   - Click on your **"insightsheet"** service

2. **Check Deployments Tab:**
   - Go to **"Deployments"** tab
   - Look for a new deployment
   - Status should show: **"Building"** → **"Active"**

3. **If Auto-Deploy is Working:**
   - ✅ New deployment appears within 1-2 minutes
   - ✅ Build completes in 2-3 minutes
   - ✅ Status changes to "Active"
   - ✅ Backend is updated!

4. **If No New Deployment:**
   - See "Manual Redeploy" section below

---

## 🔧 Manual Redeploy (If Auto-Deploy Didn't Work)

### **Vercel Manual Redeploy:**

1. **Go to Vercel Dashboard:**
   - [vercel.com/dashboard](https://vercel.com/dashboard)
   - Click on your project

2. **Redeploy:**
   - Go to **"Deployments"** tab
   - Click **"..."** menu (three dots) on latest deployment
   - Click **"Redeploy"**
   - Uncheck **"Use existing Build Cache"** (optional)
   - Click **"Redeploy"**

3. **Wait:**
   - Build time: 2-3 minutes
   - Status: "Building" → "Ready"

---

### **Railway Manual Redeploy:**

1. **Go to Railway Dashboard:**
   - [railway.app](https://railway.app)
   - Click on your **"insightsheet"** service

2. **Redeploy:**
   - Go to **"Deployments"** tab
   - Click **"Redeploy"** button (top right)
   - Or click **"..."** menu → **"Redeploy"**

3. **Wait:**
   - Build time: 2-3 minutes
   - Status: "Building" → "Active"

---

## ✅ Verify Deployment

### **Check Vercel (Frontend):**

1. **Visit Your Site:**
   - Go to your Vercel URL (e.g., `https://insight.meldra.ai` or `https://meldra-six.vercel.app`)
   - Test the features you changed
   - Check browser console for errors

2. **Verify Changes:**
   - If you fixed AI Assistant → Test it
   - If you fixed routing → Test navigation
   - If you fixed UI → Check the pages

---

### **Check Railway (Backend):**

1. **Test Health Endpoint:**
   - Visit: `https://insightsheet-production.up.railway.app/api/health`
   - Should return: `{"status": "ok"}`

2. **Test API Endpoints:**
   - Try logging in
   - Test AI Assistant (if you fixed it)
   - Check backend logs in Railway dashboard

---

## 🔍 Troubleshooting

### **Problem: Git Push Failed**

**Error:** `Permission denied` or `Authentication failed`

**Solution:**
```bash
# Check your Git remote
git remote -v

# Should show:
# origin  https://github.com/SumitAG008/insightsheet.git (fetch)
# origin  https://github.com/SumitAG008/insightsheet.git (push)

# If using SSH and it fails, use HTTPS:
git remote set-url origin https://github.com/SumitAG008/insightsheet.git
```

---

### **Problem: Vercel Not Auto-Deploying**

**Check:**
1. Vercel Dashboard → Settings → Git
2. Should show: "Connected to GitHub"
3. Repository should be: `SumitAG008/insightsheet`
4. Branch should be: `main`

**Fix:**
1. Go to Settings → Git
2. Click "Connect Git Repository"
3. Select `SumitAG008/insightsheet`
4. Choose `main` branch
5. Save

---

### **Problem: Railway Not Auto-Deploying**

**Check:**
1. Railway Dashboard → Service Settings → Source
2. Should show: "Connected to GitHub"
3. Repository should be: `SumitAG008/insightsheet`
4. Branch should be: `main`

**Fix:**
1. Go to Service Settings → Source
2. Click "Connect GitHub"
3. Select `SumitAG008/insightsheet`
4. Choose `main` branch
5. Save

---

### **Problem: Vercel Deployment Limit**

**Error:** `Resource is limited - try again in 2 hours`

**Solution:**
- Wait 2 hours for limit reset
- Or upgrade to Vercel Pro ($20/month)
- Or check if your code is already deployed (no redeploy needed)

---

## 📋 Quick Command Reference

```bash
# Check status
git status

# Add all changes
git add .

# Commit
git commit -m "Your commit message"

# Push to GitHub
git push origin main

# Check recent commits
git log --oneline -5

# See what changed
git diff
```

---

## 🎯 Complete Workflow Example

```bash
# 1. Check what changed
git status

# 2. Add changes
git add .

# 3. Commit
git commit -m "Fix AI Assistant error handling"

# 4. Push to GitHub
git push origin main

# 5. Wait 2-3 minutes

# 6. Check Vercel Dashboard → Deployments
# 7. Check Railway Dashboard → Deployments
# 8. Test your application
```

---

## ✅ Summary

**The Process:**
1. ✅ Make changes locally
2. ✅ `git add .` - Stage changes
3. ✅ `git commit -m "message"` - Commit changes
4. ✅ `git push origin main` - Push to GitHub
5. ✅ Vercel auto-deploys (if connected)
6. ✅ Railway auto-deploys (if connected)
7. ✅ Wait 2-3 minutes
8. ✅ Test your application

**If Auto-Deploy Doesn't Work:**
- Manually redeploy in Vercel and Railway dashboards
- Or check if deployments are already connected to GitHub

**All your local changes will be live in production after this process!** 🚀
