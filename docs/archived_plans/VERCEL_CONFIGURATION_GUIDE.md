# ⚙️ Vercel Project Configuration Guide

## 📋 After Clicking "Import" on `insightsheet`

You'll see a configuration page. Here's what to set:

---

## 🎯 Configuration Settings

### **1. Project Name**
- **Value:** `meldra` (or keep `insightsheet`)
- **Location:** Top of the page

### **2. Framework Preset**
- **Value:** `Vite` ✅
- **Note:** Vercel should auto-detect this
- **If not auto-detected:** Select "Vite" from dropdown

### **3. Root Directory**
- **Value:** `./` (leave as default)
- **Note:** Your project is at the root

### **4. Build and Output Settings**

These should be **auto-detected**, but verify:

| Setting | Value |
|---------|-------|
| **Build Command** | `npm run build` |
| **Output Directory** | `dist` |
| **Install Command** | `npm install` |
| **Development Command** | `npm run dev` |

### **5. Environment Variables (Optional)**

If you need to set backend API URL:

1. Scroll to **"Environment Variables"** section
2. Click **"Add"** or **"Add Another"**
3. Add these variables:

#### **For Development:**
- **Name:** `VITE_API_URL`
- **Value:** `http://localhost:8000`
- **Environment:** Development ✅

#### **For Production (when backend is deployed):**
- **Name:** `VITE_API_URL`
- **Value:** `https://your-backend-url.com` (your backend URL)
- **Environment:** Production ✅, Preview ✅

**Note:** You can add production URL later after deploying backend.

---

## ✅ Quick Checklist

Before clicking "Deploy", verify:

- [ ] **Project Name:** `meldra` or `insightsheet`
- [ ] **Framework:** `Vite` ✅
- [ ] **Root Directory:** `./` ✅
- [ ] **Build Command:** `npm run build` ✅
- [ ] **Output Directory:** `dist` ✅
- [ ] **Install Command:** `npm install` ✅

---

## 🚀 Deploy!

1. **Scroll down** to the bottom
2. Click **"Deploy"** button
3. **Wait 2-5 minutes** for build
4. **Get your URL:** `https://meldra-xyz123.vercel.app` 🎉

---

## 📸 What You'll See

After clicking "Deploy":
- Build logs will appear
- You'll see progress: Installing → Building → Deploying
- When done: "Ready" with your live URL

---

## 🔄 After Deployment

1. **Your app is live!** Visit the URL shown
2. **Auto-deploy:** Every `git push` will deploy automatically
3. **Add custom domain:** Settings → Domains → Add `meldra.ai`

---

## ⚠️ Common Issues

### **Build Fails?**
- Check build logs in Vercel dashboard
- Verify `package.json` has correct scripts
- Make sure all dependencies are in `package.json`

### **404 Errors?**
- Verify `Output Directory` is `dist`
- Check `vercel.json` exists (we created it)

### **API Not Working?**
- Add `VITE_API_URL` environment variable
- Make sure backend is running/deployed

---

**Click "Deploy" and watch it build!** 🚀
