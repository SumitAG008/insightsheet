# 🔄 Restart Railway After Setting FRONTEND_URL

## ❌ **Current Problem**

Even though `FRONTEND_URL` is set to `https://insight.meldra.ai` in Railway, reset links still show `http://localhost:5173`.

**Why:** Railway needs to **restart** to pick up the new environment variable.

---

## ✅ **Solution: Restart Railway Service**

### **Option 1: Manual Restart (Easiest)**

1. **Railway Dashboard → Your Service → Deployments**
2. Click **"..."** menu (three dots) on the latest deployment
3. Click **"Redeploy"** or **"Restart"**
4. Wait 1-2 minutes for restart

---

### **Option 2: Trigger Restart via Variable Change**

1. **Railway Dashboard → Your Service → Variables**
2. Click on `FRONTEND_URL` to edit
3. **Don't change the value**, just click **"Save"** (this triggers a restart)
4. Wait 1-2 minutes

---

### **Option 3: Make a Small Code Change**

1. Make a tiny change to any file in your backend
2. Commit and push to GitHub
3. Railway will auto-deploy and restart

---

## ✅ **Verify It Worked**

After restart:

1. **Go to:** `https://insight.meldra.ai/forgot-password`
2. **Enter email** and request reset
3. **Check the reset link:**
   - ✅ Should be: `https://insight.meldra.ai/reset-password?token=...`
   - ❌ NOT: `http://localhost:5173/reset-password?token=...`

---

## 🔍 **Why This Happens**

Environment variables are loaded when the application **starts**. If you set `FRONTEND_URL` after the service is already running, it won't use the new value until restart.

---

## 📋 **Quick Checklist**

- [ ] `FRONTEND_URL` = `https://insight.meldra.ai` in Railway Variables ✅ (confirmed)
- [ ] Railway service restarted after setting variable
- [ ] Test password reset - link should use production URL

---

**After restarting Railway, the reset links should use the production URL!** 🚀
