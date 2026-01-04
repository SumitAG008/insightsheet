# 🚀 Deploy to Vercel - Simple Steps

## ✅ Your Code is Ready on GitHub!

Repository: `https://github.com/SumitAG008/insightsheet`

---

## 📋 Step-by-Step (5 minutes)

### **1. Go to Vercel Dashboard**

👉 **Open:** [vercel.com/dashboard](https://vercel.com/dashboard)

### **2. Import Project**

1. Click **"Add New..."** (top right)
2. Click **"Project"**
3. Click **"Import Git Repository"**

### **3. Connect GitHub (if needed)**

- If you see "Connect GitHub", click it
- Authorize Vercel to access your repositories
- Select "All repositories" or just `insightsheet`

### **4. Select Your Repository**

- Search: `insightsheet`
- Click **"Import"** next to `SumitAG008/insightsheet`

### **5. Configure (Auto-detected)**

Vercel will auto-detect these settings:

| Setting | Value |
|---------|-------|
| **Framework Preset** | Vite ✅ |
| **Root Directory** | `./` ✅ |
| **Build Command** | `npm run build` ✅ |
| **Output Directory** | `dist` ✅ |
| **Install Command** | `npm install` ✅ |

**Just verify these are correct!**

### **6. Deploy!**

1. Click **"Deploy"** button
2. Wait 2-5 minutes
3. Get your URL: `https://meldra-xyz123.vercel.app` 🎉

---

## 🌐 Add Custom Domain (meldra.ai)

After deployment:

1. **Vercel Dashboard** → Your Project → **Settings** → **Domains**
2. **Add Domain:** `meldra.ai`
3. **Add Domain:** `www.meldra.ai`
4. **Copy DNS records** shown by Vercel
5. **Go to GoDaddy** → DNS Management
6. **Add the records** (see `MELDRA_AI_DOMAIN_SETUP.md`)

---

## ⚙️ Environment Variables (Optional)

If you need backend API URL:

1. **Project Settings** → **Environment Variables**
2. **Add:**
   - Name: `VITE_API_URL`
   - Value: `http://localhost:8000` (or your backend URL)
3. **Redeploy**

---

## ✅ That's It!

Your app will be live at: `https://meldra-xyz123.vercel.app`

**Every time you push to GitHub, Vercel will auto-deploy!** 🚀

---

## 🆘 Need Help?

- **Vercel Docs:** [vercel.com/docs](https://vercel.com/docs)
- **Your Repo:** [github.com/SumitAG008/insightsheet](https://github.com/SumitAG008/insightsheet)
