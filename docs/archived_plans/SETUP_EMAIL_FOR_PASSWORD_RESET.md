# 📧 Setup Email for Password Reset

## ✅ **What Was Fixed**

The code now:
- ✅ **Sends emails in production** (when SMTP is configured)
- ✅ **Never shows reset link in production UI** (security)
- ✅ **Only shows link in development** (for testing)

---

## 🔧 **Step 1: Configure SMTP in Railway**

To send password reset emails, you need to configure SMTP credentials in Railway.

### **Option A: Gmail SMTP (Easiest)**

1. **Railway Dashboard → insightsheet service → Variables tab**
2. **Add these variables:**

```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
SMTP_FROM_EMAIL=your-email@gmail.com
```

3. **Get Gmail App Password:**
   - Go to: [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords)
   - Sign in with your Gmail account
   - Click "Select app" → "Mail"
   - Click "Select device" → "Other (Custom name)" → Type "Railway"
   - Click "Generate"
   - **Copy the 16-character password** (no spaces)
   - Use this as `SMTP_PASSWORD`

---

### **Option B: Other Email Providers**

**Outlook/Hotmail:**
```
SMTP_HOST=smtp-mail.outlook.com
SMTP_PORT=587
SMTP_USER=your-email@outlook.com
SMTP_PASSWORD=your-password
SMTP_FROM_EMAIL=your-email@outlook.com
```

**SendGrid:**
```
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASSWORD=your-sendgrid-api-key
SMTP_FROM_EMAIL=your-verified-email@domain.com
```

**Mailgun:**
```
SMTP_HOST=smtp.mailgun.org
SMTP_PORT=587
SMTP_USER=your-mailgun-username
SMTP_PASSWORD=your-mailgun-password
SMTP_FROM_EMAIL=your-verified-email@domain.com
```

---

## 🔄 **Step 2: Restart Railway**

After adding SMTP variables:

1. Railway will auto-restart
2. Or manually: Deployments → "..." → "Redeploy"
3. Wait 1-2 minutes

---

## ✅ **Step 3: Test Password Reset**

1. Go to: `https://insight.meldra.ai/forgot-password`
2. Enter your email
3. Click "Send Reset Link"
4. **Check your email inbox** (and spam folder)
5. You should receive an email with the reset link
6. **The link should NOT appear in the UI** (only in email)

---

## 🔍 **Verify It's Working**

### **Check Railway Logs:**

1. Railway → insightsheet service → Logs
2. Look for:
   - ✅ `Password reset email sent successfully to [email]` (success)
   - ❌ `SMTP credentials not configured` (SMTP not set up)
   - ❌ `Failed to send password reset email` (SMTP error)

### **Test Email:**

1. Request password reset
2. Check email inbox
3. Click reset link in email
4. Should redirect to reset password page

---

## 🐛 **Troubleshooting**

### **Issue: Email not received**

**Check:**
1. Railway logs for SMTP errors
2. Spam/junk folder
3. SMTP credentials are correct
4. Gmail App Password (not regular password)

**Common errors:**
- `535 Authentication failed` → Wrong password or need App Password
- `Connection refused` → Wrong SMTP_HOST or SMTP_PORT
- `Timeout` → Firewall blocking port 587

---

### **Issue: Still seeing link in UI**

**Cause:** Frontend is in development mode or SMTP not configured

**Fix:**
1. Make sure `ENVIRONMENT=production` in Railway
2. Make sure SMTP credentials are set
3. Redeploy Vercel (frontend)

---

## 📋 **Quick Checklist**

- [ ] SMTP_HOST set in Railway
- [ ] SMTP_PORT set (usually 587)
- [ ] SMTP_USER set (your email)
- [ ] SMTP_PASSWORD set (App Password for Gmail)
- [ ] SMTP_FROM_EMAIL set (your email)
- [ ] Railway restarted after adding variables
- [ ] Tested password reset - email received
- [ ] Reset link NOT shown in UI (only in email)

---

## 🔒 **Security Notes**

- ✅ Reset links expire after **1 hour**
- ✅ Links are **single-use** (token cleared after reset)
- ✅ Email doesn't reveal if account exists (security)
- ✅ Reset link never shown in production UI

---

**After setting up SMTP, password reset emails will be sent automatically!** 🚀
