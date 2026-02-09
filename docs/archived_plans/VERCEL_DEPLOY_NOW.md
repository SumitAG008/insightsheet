# 🚀 Deploy to Vercel - Right Now!

## ✅ Your Code is on GitHub!

Your repository is ready: `https://github.com/SumitAG008/insightsheet`

---

## 🎯 Option 1: Deploy via Vercel Dashboard (Easiest)

### **Step 1: Go to Vercel**

1. **Open:** [vercel.com/dashboard](https://vercel.com/dashboard)
2. **Click:** "Add New..." button (top right)
3. **Select:** "Project"

### **Step 2: Import from GitHub**

1. **Click:** "Import Git Repository"
2. **If not connected:**
   - Click "Connect GitHub"
   - Authorize Vercel
3. **Search:** `insightsheet`
4. **Click:** "Import" next to `SumitAG008/insightsheet`

### **Step 3: Configure**

Vercel will auto-detect settings, but verify:

| Setting | Value |
|---------|-------|
| **Project Name** | `meldra` |
| **Framework Preset** | Vite (auto) |
| **Root Directory** | `./` |
| **Build Command** | `npm run build` (auto) |
| **Output Directory** | `dist` (auto) |

### **Step 4: Deploy**

1. **Click:** "Deploy" button
2. **Wait:** 2-5 minutes
3. **Get URL:** `https://meldra-xyz123.vercel.app` 🎉

---

## 🎯 Option 2: Deploy via CLI

### **If Already Logged In:**

```bash
# Deploy
vercel

# Follow prompts:
# - Link to existing project? → No
# - Project name? → meldra
# - Directory? → ./
# - Deploy
```

### **If Not Logged In:**

```bash
# Login first
vercel login

# Then deploy
vercel
```

---

## ⚙️ After Deployment

### **1. Set Environment Variable**

```bash
# Set backend URL
vercel env add VITE_API_URL production

# Enter value:
http://localhost:8000
# (Update later when backend is deployed)
```

### **2. Redeploy**

```bash
vercel --prod
```

---

## 🌐 Add Custom Domain

1. **Vercel Dashboard** → Your Project → Settings → Domains
2. **Add:** `meldra.ai`
3. **Add:** `www.meldra.ai`
4. **Update DNS at GoDaddy** (see `MELDRA_AI_DOMAIN_SETUP.md`)

---

## ✅ Quick Steps (Dashboard)

1. [vercel.com/dashboard](https://vercel.com/dashboard)
2. Add New → Project
3. Import from GitHub
4. Select: `SumitAG008/insightsheet`
5. Deploy
6. Done! 🎉

---

**Go to Vercel dashboard and import your GitHub repo!** 🚀
