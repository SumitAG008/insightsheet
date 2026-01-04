# 🚀 Deploy Meldra to Vercel - Step by Step

## ✅ You're Already on Vercel!

Your dashboard: [vercel.com/sumit-ags-projects](https://vercel.com/sumit-ags-projects)

---

## 📋 Deploy Steps

### **Step 1: Add New Project**

1. On your Vercel dashboard, click **"Add New..."** button (top right)
2. Click **"Project"**

### **Step 2: Import from GitHub**

1. Click **"Import Git Repository"**
2. If you see your GitHub account, select it
3. If not connected:
   - Click **"Connect GitHub"**
   - Authorize Vercel
   - Grant access to your repositories

### **Step 3: Select Repository**

1. Search for: `insightsheet`
2. Find: `SumitAG008/insightsheet`
3. Click **"Import"** button

### **Step 4: Configure Project**

Vercel will auto-detect these (verify they're correct):

| Setting | Value |
|---------|-------|
| **Project Name** | `meldra` (or `insightsheet`) |
| **Framework Preset** | `Vite` ✅ |
| **Root Directory** | `./` ✅ |
| **Build Command** | `npm run build` ✅ |
| **Output Directory** | `dist` ✅ |
| **Install Command** | `npm install` ✅ |

**All settings should be auto-detected correctly!**

### **Step 5: Environment Variables (Optional)**

If you need to set backend API URL:

1. Scroll down to **"Environment Variables"**
2. Click **"Add"**
3. Add:
   - **Name:** `VITE_API_URL`
   - **Value:** `http://localhost:8000` (or your backend URL)
   - **Environment:** Production, Preview, Development

### **Step 6: Deploy!**

1. Click **"Deploy"** button
2. Wait 2-5 minutes for build
3. You'll get a URL like: `https://meldra-xyz123.vercel.app` 🎉

---

## 🌐 Add Custom Domain (meldra.ai)

After deployment:

1. Go to your project → **Settings** → **Domains**
2. Click **"Add Domain"**
3. Enter: `meldra.ai`
4. Click **"Add"**
5. Enter: `www.meldra.ai`
6. Click **"Add"**
7. **Copy the DNS records** shown by Vercel
8. **Go to GoDaddy** → DNS Management
9. **Add the DNS records** (see `MELDRA_AI_DOMAIN_SETUP.md`)

---

## ✅ After Deployment

- **Live URL:** `https://meldra-xyz123.vercel.app`
- **Auto-deploy:** Every `git push` to main branch
- **Custom Domain:** Add `meldra.ai` in Settings → Domains

---

## 🔄 Future Deployments

Every time you push to GitHub:
```bash
git push origin main
```

Vercel will automatically:
1. Detect the push
2. Build your app
3. Deploy the new version
4. Update your live site

---

## 📚 Your Repository

GitHub: [github.com/SumitAG008/insightsheet](https://github.com/SumitAG008/insightsheet)

---

**Go ahead and click "Add New..." → "Project" → Import your repository!** 🚀
