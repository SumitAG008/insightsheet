# 📧 Microsoft 365 SMTP Setup for noreply@meldra.ai

## ✅ **Good News!**

You already have `noreply@meldra.ai` created in Microsoft 365! Now we just need to configure it.

---

## 🔧 **Step 1: Set Password for noreply@meldra.ai**

**If you haven't set a password yet:**

1. **Go to:** [admin.microsoft.com](https://admin.microsoft.com)
2. **Users → Active users**
3. **Find:** `noreply@meldra.ai`
4. **Click on it** → Reset password
5. **Set a password** (save it - you'll need it for Railway)

**If password is already set:**
- Use that password for `SMTP_PASSWORD` in Railway

---

## 🔧 **Step 2: Enable SMTP Authentication (If Needed)**

**Some Microsoft 365 accounts need SMTP enabled:**

1. **Go to:** [admin.microsoft.com](https://admin.microsoft.com)
2. **Settings → Org settings → Mail**
3. **Look for "SMTP AUTH"** or "Authenticated SMTP"
4. **Enable it** if it's disabled

**Or:**
1. **PowerShell (if you have access):**
   ```powershell
   Set-CASMailbox -Identity noreply@meldra.ai -SmtpClientAuthenticationDisabled $false
   ```

---

## 📋 **Step 3: Configure Railway Variables**

**Railway Dashboard → insightsheet service → Variables tab**

**Set these variables:**

```
SMTP_HOST=smtp-mail.outlook.com
SMTP_PORT=587
SMTP_USER=noreply@meldra.ai
SMTP_PASSWORD=[Password for noreply@meldra.ai]
SMTP_FROM_EMAIL=noreply@meldra.ai
```

---

## 🔍 **Alternative SMTP Servers (If smtp-mail.outlook.com doesn't work):**

**Try these in order:**

1. **Primary:**
   ```
   SMTP_HOST=smtp-mail.outlook.com
   SMTP_PORT=587
   ```

2. **Alternative 1:**
   ```
   SMTP_HOST=smtp.office365.com
   SMTP_PORT=587
   ```

3. **Alternative 2:**
   ```
   SMTP_HOST=smtp.live.com
   SMTP_PORT=587
   ```

---

## ⚠️ **Important Notes for Microsoft 365**

### **1. App Password (If 2FA Enabled)**

**If `noreply@meldra.ai` has 2FA enabled:**

1. **Go to:** [account.microsoft.com/security](https://account.microsoft.com/security)
2. **Sign in as:** `noreply@meldra.ai`
3. **Security → Advanced security options**
4. **App passwords → Create new app password**
5. **Use that App Password** (not regular password)

**If 2FA is NOT enabled:**
- Use the regular password for `SMTP_PASSWORD`

---

### **2. Modern Authentication**

**Microsoft 365 uses Modern Authentication by default.**

**If you get authentication errors:**
- Make sure SMTP AUTH is enabled (see Step 2)
- Or use App Password if 2FA is enabled

---

## ✅ **Step 4: Test Configuration**

1. **Save variables in Railway**
2. **Railway auto-restarts** (wait 1-2 minutes)
3. **Go to:** `https://insight.meldra.ai/forgot-password`
4. **Enter email** → Click "Send Reset Link"
5. **Check Railway logs** for success/errors
6. **Check email inbox** (and spam folder)

---

## 🔍 **Check Railway Logs**

**After testing, check logs:**

1. **Railway → insightsheet service → Logs tab**
2. **Look for:**
   - ✅ `Password reset email sent successfully to [email]` (success!)
   - ❌ `535 Authentication failed` (wrong password or need App Password)
   - ❌ `Connection refused` (wrong SMTP_HOST)
   - ❌ `SMTP AUTH disabled` (need to enable SMTP AUTH)

---

## 🐛 **Troubleshooting**

### **Issue: "535 Authentication failed"**

**Causes:**
- Wrong password
- 2FA enabled (need App Password)
- SMTP AUTH disabled

**Fixes:**
1. Verify password is correct
2. If 2FA enabled → Get App Password
3. Enable SMTP AUTH in Microsoft 365 admin

---

### **Issue: "Connection refused"**

**Causes:**
- Wrong SMTP_HOST

**Fixes:**
- Try `smtp.office365.com` instead of `smtp-mail.outlook.com`
- Or try `smtp.live.com`

---

### **Issue: "SMTP AUTH disabled"**

**Fixes:**
1. Microsoft 365 Admin → Settings → Mail
2. Enable "SMTP AUTH"
3. Or use PowerShell command (see Step 2)

---

## 📋 **Complete Configuration**

**Final Railway variables:**

```
SMTP_HOST=smtp-mail.outlook.com
SMTP_PORT=587
SMTP_USER=noreply@meldra.ai
SMTP_PASSWORD=[Password for noreply@meldra.ai account]
SMTP_FROM_EMAIL=noreply@meldra.ai
```

**If 2FA is enabled on noreply account:**
- Use App Password instead of regular password

---

## ✅ **Quick Checklist**

- [ ] Password set for `noreply@meldra.ai` in Microsoft 365
- [ ] SMTP AUTH enabled (if needed)
- [ ] Railway → Variables → `SMTP_HOST` = `smtp-mail.outlook.com`
- [ ] Railway → Variables → `SMTP_PORT` = `587`
- [ ] Railway → Variables → `SMTP_USER` = `noreply@meldra.ai`
- [ ] Railway → Variables → `SMTP_PASSWORD` = Password for noreply account
- [ ] Railway → Variables → `SMTP_FROM_EMAIL` = `noreply@meldra.ai`
- [ ] Railway restarted after changes
- [ ] Tested password reset → Check email

---

**Set the password for noreply@meldra.ai and configure Railway!** 🚀
