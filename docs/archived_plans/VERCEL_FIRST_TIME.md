# 🎯 Vercel Deployment - First Time Guide

## ✅ What You Need

- ✅ Vercel account (you're logging in!)
- ✅ Project built (`npm run build` - already done!)
- ✅ Git repository (optional, but recommended)

---

## 🚀 Complete Process

### **1. Login to Vercel**

```bash
# If not logged in
vercel login

# Follow the prompts:
# - Press Enter to open browser
# - Log in to Vercel
# - Authorize CLI
```

---

### **2. Deploy**

```bash
# From project root
vercel
```

**Answer the questions:**

| Question | Answer |
|----------|--------|
| Set up and deploy? | **Y** (Yes) |
| Which scope? | **Your account** |
| Link to existing project? | **N** (No) |
| Project name? | **meldra** |
| Directory? | **./** (current) |
| Override settings? | **N** (No) |

---

### **3. Wait for Build**

Vercel will:
- Install dependencies
- Run `npm run build`
- Deploy to a URL

**Time:** 2-5 minutes

---

### **4. Get Your URL**

After deployment, you'll see:
```
✅  Production: https://meldra-xyz123.vercel.app
```

**That's your live app!** 🎉

---

### **5. Configure Environment Variables**

```bash
# Set backend URL
vercel env add VITE_API_URL production

# Enter value (for now):
http://localhost:8000

# Later, update to:
https://your-backend.railway.app
```

---

### **6. Redeploy**

```bash
vercel --prod
```

---

## 📱 Test on iPhone

1. **Open Safari**
2. **Go to:** `https://meldra-xyz123.vercel.app`
3. **Tap Share → "Add to Home Screen"**
4. **Done!** 🎉

---

## 🔄 Update Deployment

### **Automatic (Recommended):**

Connect to GitHub:
1. **Push code to GitHub:**
   ```bash
   git add .
   git commit -m "Ready for deployment"
   git push
   ```

2. **In Vercel Dashboard:**
   - Go to your project
   - Settings → Git
   - Connect GitHub repository
   - Enable "Auto-deploy"

**Now:** Every `git push` auto-deploys! 🚀

### **Manual:**

```bash
# Deploy again
vercel --prod
```

---

## 🎯 What Happens

1. **Vercel detects** your Vite project
2. **Runs** `npm install`
3. **Runs** `npm run build`
4. **Deploys** `dist/` folder
5. **Gives you** a URL
6. **App is live!**

---

## ✅ Success Indicators

You'll know it worked when you see:
- ✅ "Deployment complete!"
- ✅ A URL like `https://meldra-xyz.vercel.app`
- ✅ Can open URL in browser
- ✅ App loads correctly

---

## 🐛 Common Issues

### **"Project name already exists"**
**Fix:** Choose a different name or use the suggested one

### **"Build failed"**
**Fix:** 
- Check Vercel dashboard → Deployments → Logs
- Make sure all dependencies are in `package.json`

### **"Cannot find module"**
**Fix:** 
- Run `npm install` locally first
- Make sure `node_modules` is in `.gitignore`

---

## 📋 Checklist

- [ ] Vercel account created
- [ ] Logged in via CLI
- [ ] Ran `vercel` command
- [ ] Followed prompts
- [ ] Got deployment URL
- [ ] Tested URL in browser
- [ ] Set environment variables
- [ ] Tested on iPhone

---

## 🎉 You're Done!

Once you see the URL, your app is live!

**Next:** Deploy backend, then update `VITE_API_URL`

---

**Just run `vercel` and follow the prompts!** 🚀
