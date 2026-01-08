# 🔧 Fix: Update SMTP_USER and SMTP_FROM_EMAIL

## ⚠️ **Problem Found!**

Your Railway variables show:
- ✅ `SMTP_PASSWORD=tlrkwouukidjgtgi` (correct!)
- ✅ `SMTP_HOST=smtp.gmail.com` (correct!)
- ✅ `SMTP_PORT=587` (correct!)
- ❌ `SMTP_USER=your-email@gmail.com` (placeholder - needs real email!)
- ❌ `SMTP_FROM_EMAIL=your-email@gmail.com` (placeholder - needs real email!)

**These need to be your actual Gmail address!**

---

## ✅ **Fix: Update to Your Real Email**

### **Step 1: Update SMTP_USER**

1. **Railway Dashboard → insightsheet service → Variables tab**
2. **Click on `SMTP_USER`** (or find it in the list)
3. **Change from:**
   ```
   SMTP_USER=your-email@gmail.com
   ```
4. **Change to:**
   ```
   SMTP_USER=sumitagaria@gmail.com
   ```
   (Or whatever your actual Gmail address is)

---

### **Step 2: Update SMTP_FROM_EMAIL**

1. **Still in Railway Variables**
2. **Click on `SMTP_FROM_EMAIL`**
3. **Change from:**
   ```
   SMTP_FROM_EMAIL=your-email@gmail.com
   ```
4. **Change to:**
   ```
   SMTP_FROM_EMAIL=sumitagaria@gmail.com
   ```
   (Should match `SMTP_USER`)

---

### **Step 3: Save and Restart**

1. **Click "Save"** (or Railway auto-saves)
2. **Railway will auto-restart** (wait 1-2 minutes)
3. **Or manually restart:** Deployments → "..." → "Redeploy"

---

## ✅ **Final Configuration Should Be:**

```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=sumitagaria@gmail.com
SMTP_PASSWORD=tlrkwouukidjgtgi
SMTP_FROM_EMAIL=sumitagaria@gmail.com
```

**All 5 variables should have real values, not placeholders!**

---

## 🧪 **Step 4: Test Again**

1. **Go to:** `https://insight.meldra.ai/forgot-password`
2. **Enter your email:** `sumitagaria@gmail.com`
3. **Click "Send Reset Link"**
4. **Check Railway logs** to see if email was sent
5. **Check your Gmail inbox** (and spam folder)

---

## 🔍 **Check Railway Logs**

After updating and testing:

1. **Railway → insightsheet service → Logs tab**
2. **Look for:**
   - ✅ `Password reset email sent successfully to sumitagaria@gmail.com` (success!)
   - ❌ `535 Authentication failed` (wrong email or password)
   - ❌ `SMTP credentials not configured` (variables not saved)

---

## 📋 **Quick Checklist**

- [ ] `SMTP_USER` = your actual Gmail address (not "your-email@gmail.com")
- [ ] `SMTP_FROM_EMAIL` = your actual Gmail address (not "your-email@gmail.com")
- [ ] `SMTP_PASSWORD` = `tlrkwouukidjgtgi` (already correct ✅)
- [ ] `SMTP_HOST` = `smtp.gmail.com` (already correct ✅)
- [ ] `SMTP_PORT` = `587` (already correct ✅)
- [ ] Railway restarted after changes
- [ ] Tested password reset → Check email

---

**Update `SMTP_USER` and `SMTP_FROM_EMAIL` to your real Gmail address!** 🚀
