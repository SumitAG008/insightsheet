# ⚙️ Vercel Configuration

## 📋 Recommended Settings

### **Build Settings (Auto-detected by Vercel):**

- **Framework Preset:** Vite
- **Build Command:** `npm run build`
- **Output Directory:** `dist`
- **Install Command:** `npm install`
- **Root Directory:** `./`

### **Environment Variables:**

Add these in Vercel Dashboard → Settings → Environment Variables:

```
VITE_API_URL=https://your-backend-url.com
```

---

## 📁 Create `vercel.json` (Optional)

Create `vercel.json` in project root for custom settings:

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "devCommand": "npm run dev",
  "installCommand": "npm install",
  "framework": "vite",
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

**Note:** Vercel auto-detects Vite, so this is optional!

---

## 🔄 Auto-Deploy Settings

After connecting GitHub:

1. **Go to:** Settings → Git
2. **Production Branch:** `main` (or `master`)
3. **Auto-deploy:** Enabled ✅
4. **Preview Deployments:** Enabled ✅

---

## ✅ That's It!

Vercel handles everything automatically! 🚀
