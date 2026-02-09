# 🔐 Gmail App Password - Step-by-Step Guide

## ❓ **Why Do You Need an App Password?**

Gmail requires an **App Password** (not your regular password) when using SMTP from external applications like Railway. This is a security feature.

**Regular Gmail password = ❌ Won't work**
**Gmail App Password = ✅ Will work**

---

## 📋 **Step-by-Step: Get Gmail App Password**

### **Step 1: Enable 2-Step Verification**

**You MUST have 2-Step Verification enabled first!**

1. Go to: [myaccount.google.com/security](https://myaccount.google.com/security)
2. Sign in with your Gmail account
3. Scroll to **"2-Step Verification"**
4. If it says **"Off"** → Click **"Get started"** → Follow steps to enable it
5. If it says **"On"** → ✅ You're ready! Go to Step 2

---

### **Step 2: Go to App Passwords**

1. Go to: [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords)
2. Sign in with your Gmail account
3. You'll see a page titled **"App passwords"**

---

### **Step 3: Generate App Password**

1. **At the top, you'll see:**
   - "Select app" dropdown
   - "Select device" dropdown
   - "Generate" button

2. **Click "Select app" dropdown:**
   - Choose **"Mail"** (or "Other" if Mail isn't listed)

3. **Click "Select device" dropdown:**
   - Choose **"Other (Custom name)"**
   - A text box will appear
   - Type: **"Railway"** (or any name you want)

4. **Click "Generate" button**

5. **A popup will show:**
   - A 16-character password like: `abcd efgh ijkl mnop`
   - **Copy this password** (you can't see it again!)
   - **Remove the spaces** when using it: `abcdefghijklmnop`

---

### **Step 4: Use in Railway**

1. **Railway Dashboard → insightsheet service → Variables**
2. **Set `SMTP_PASSWORD` to the 16-character password** (no spaces)
3. **Save**

---

## ⚠️ **Common Issues**

### **Issue: "App passwords" option not showing**

**Cause:** 2-Step Verification is not enabled

**Fix:**
1. Enable 2-Step Verification first (Step 1 above)
2. Then try App Passwords again

---

### **Issue: "This feature is not available for your account"**

**Cause:** 
- Your Google account doesn't support App Passwords
- Or 2-Step Verification not enabled

**Fix:**
- Enable 2-Step Verification
- Or use a different Gmail account
- Or use a different email provider (GMX, Rediffmail, etc.)

---

## 🎯 **Quick Summary**

1. Enable 2-Step Verification ✅
2. Go to App Passwords page
3. Select "Mail" → "Other" → Type "Railway"
4. Click "Generate"
5. Copy 16-character password (remove spaces)
6. Use in Railway as `SMTP_PASSWORD`

---

**That's it! The App Password is a special password just for Railway to send emails.** 🔐
