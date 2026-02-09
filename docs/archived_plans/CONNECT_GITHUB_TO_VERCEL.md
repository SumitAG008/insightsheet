# 🔗 Connect GitHub Repository to Vercel

## 🎯 Goal

Connect `https://github.com/SumitAG008/insightsheet` to Vercel for automatic deployments.

---

## 🚀 Step-by-Step

### **Option 1: Via Vercel Dashboard (Easiest)**

#### **Step 1: Go to Vercel Dashboard**

1. **Go to [vercel.com/dashboard](https://vercel.com/dashboard)**
2. **Click "Add New..."** button (top right)
3. **Select "Project"**

#### **Step 2: Import from GitHub**

1. **Click "Import Git Repository"**
2. **If not connected, click "Connect GitHub"**
3. **Authorize Vercel** to access your repositories
4. **Search for:** `insightsheet`
5. **Click "Import"** next to `SumitAG008/insightsheet`

#### **Step 3: Configure Project**

Vercel will ask:

| Setting | Value |
|---------|-------|
| **Project Name** | `meldra` (or your choice) |
| **Framework Preset** | Vite (auto-detected) |
| **Root Directory** | `./` (current) |
| **Build Command** | `npm run build` (auto) |
| **Output Directory** | `dist` (auto) |
| **Install Command** | `npm install` (auto) |

**Click "Deploy"**

#### **Step 4: Wait for Deployment**

Vercel will:
- ✅ Clone your repository
- ✅ Install dependencies
- ✅ Build your app
- ✅ Deploy to a URL

**Time:** 2-5 minutes

#### **Step 5: Get Your URL**

After deployment:
- ✅ URL: `https://meldra-xyz123.vercel.app` (or similar)
- ✅ Auto-deploys on every `git push`

---

### **Option 2: Via Vercel CLI**

If you already deployed via CLI, link to GitHub:

```bash
# Link existing project to GitHub
vercel link

# Follow prompts:
# - Set up? → Yes
# - Which scope? → Your account
# - Link to existing project? → Yes
# - Select project → meldra (or your project name)
# - Which Git provider? → GitHub
# - Repo name? → SumitAG008/insightsheet
```

---

## ✅ After Connection

### **Automatic Deployments**

Now, every time you push to GitHub:

```bash
git add .
git commit -m "Update app"
git push
```

**Vercel automatically:**
- ✅ Detects the push
- ✅ Builds your app
- ✅ Deploys new version
- ✅ Updates your URL

---

### **Add Environment Variables**

1. **Go to Vercel Dashboard**
2. **Your Project → Settings → Environment Variables**
3. **Add:**
   - **Name:** `VITE_API_URL`
   - **Value:** `https://your-backend-url.com` (or `http://localhost:8000` for now)
   - **Environment:** Production, Preview, Development
   - **Click "Save"**

---

### **Add Custom Domain**

1. **Settings → Domains**
2. **Add Domain:** `meldra.ai`
3. **Add Domain:** `www.meldra.ai`
4. **Update DNS at GoDaddy** (see `MELDRA_AI_DOMAIN_SETUP.md`)

---

## 📋 Complete Setup Checklist

- [ ] GitHub repository: `SumitAG008/insightsheet`
- [ ] Vercel account created
- [ ] Import project from GitHub
- [ ] Configure build settings
- [ ] Deploy successfully
- [ ] Get deployment URL
- [ ] Add environment variables
- [ ] Add custom domain (meldra.ai)
- [ ] Test deployment
- [ ] Push to GitHub → Auto-deploys ✅

---

## 🎯 Quick Steps (Dashboard)

1. **Go to:** [vercel.com/dashboard](https://vercel.com/dashboard)
2. **Click "Add New..." → Project**
3. **Import from GitHub**
4. **Search:** `insightsheet`
5. **Import:** `SumitAG008/insightsheet`
6. **Configure** (use defaults)
7. **Deploy**
8. **Done!** 🎉

---

## 🔄 Update Deployment

### **Automatic (After Connection):**

```bash
# Make changes
# Commit and push
git add .
git commit -m "Update"
git push

# Vercel auto-deploys! 🚀
```

### **Manual:**

```bash
# Deploy from CLI
vercel --prod
```

---

## ✅ Benefits of GitHub Connection

- ✅ **Auto-deploy** on every push
- ✅ **Preview deployments** for pull requests
- ✅ **Deployment history** in Vercel
- ✅ **Rollback** to previous versions
- ✅ **Team collaboration**

---

## 🎉 That's It!

After connecting:
- ✅ Repository linked
- ✅ Auto-deploys enabled
- ✅ Every `git push` = new deployment

---

**Go to Vercel dashboard → Import from GitHub → Select your repo!** 🚀
