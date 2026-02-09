# ⚡ Connect GitHub to Vercel - Quick Guide

## 🎯 3 Steps

### **1. Go to Vercel Dashboard**

[vercel.com/dashboard](https://vercel.com/dashboard)

### **2. Import Project**

- Click **"Add New..."** → **"Project"**
- Click **"Import Git Repository"**
- Search: **`insightsheet`**
- Click **"Import"** next to `SumitAG008/insightsheet`

### **3. Deploy**

- Click **"Deploy"** (use default settings)
- Wait 2-5 minutes
- Get your URL! 🎉

---

## ✅ After Import

**Every `git push` = Auto-deploy!**

```bash
git push
# Vercel automatically deploys! 🚀
```

---

## 🔧 Add Environment Variable

**Settings → Environment Variables → Add:**
- Name: `VITE_API_URL`
- Value: `https://your-backend-url.com`

---

**That's it! Import your repo in Vercel dashboard!** 🚀
