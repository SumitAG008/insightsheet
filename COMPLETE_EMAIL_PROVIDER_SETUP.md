# 📧 Complete Email Provider Setup Guide
## Support for Gmail, GMX, Rediffmail, Outlook, and More

---

## 🎯 **How It Works**

The email service uses **SMTP** (Simple Mail Transfer Protocol), which works with **any email provider** that supports SMTP. You just need to configure the correct SMTP settings for your provider.

---

## 📋 **Step 1: Add SMTP Variables in Railway**

1. **Railway Dashboard → insightsheet service → Variables tab**
2. **Add these 5 variables:**

```
SMTP_HOST=[your-provider-smtp-server]
SMTP_PORT=[usually-587-or-465]
SMTP_USER=[your-email@domain.com]
SMTP_PASSWORD=[your-password-or-app-password]
SMTP_FROM_EMAIL=[your-email@domain.com]
```

3. **Replace values** with your provider's settings (see below)
4. **Save** → Railway auto-restarts

---

## 📧 **Email Provider Configurations**

### **1. Gmail**

```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
SMTP_FROM_EMAIL=your-email@gmail.com
```

**How to get App Password:**
1. Go to: [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords)
2. Sign in → "Select app" → "Mail" → "Select device" → "Other" → Type "Railway"
3. Click "Generate" → Copy 16-character password (no spaces)

**Note:** You **cannot** use your regular Gmail password. You **must** use an App Password.

---

### **2. GMX**

```
SMTP_HOST=mail.gmx.com
SMTP_PORT=587
SMTP_USER=your-email@gmx.com
SMTP_PASSWORD=your-gmx-password
SMTP_FROM_EMAIL=your-email@gmx.com
```

**Alternative GMX servers:**
- `smtp.gmx.com` (port 587)
- `mail.gmx.net` (port 587)

**Note:** Use your regular GMX password. No App Password needed.

---

### **3. Rediffmail**

```
SMTP_HOST=smtp.rediffmail.com
SMTP_PORT=587
SMTP_USER=your-email@rediffmail.com
SMTP_PASSWORD=your-rediffmail-password
SMTP_FROM_EMAIL=your-email@rediffmail.com
```

**Alternative Rediffmail servers:**
- `smtp.rediffmailpro.com` (for Rediffmail Pro)

**Note:** Use your regular Rediffmail password.

---

### **4. Outlook / Hotmail / Live**

```
SMTP_HOST=smtp-mail.outlook.com
SMTP_PORT=587
SMTP_USER=your-email@outlook.com
SMTP_PASSWORD=your-outlook-password
SMTP_FROM_EMAIL=your-email@outlook.com
```

**Alternative:**
- `smtp.live.com` (port 587)

**Note:** For Outlook, you might need to enable "Less secure app access" or use an App Password.

---

### **5. Yahoo Mail**

```
SMTP_HOST=smtp.mail.yahoo.com
SMTP_PORT=587
SMTP_USER=your-email@yahoo.com
SMTP_PASSWORD=your-app-password
SMTP_FROM_EMAIL=your-email@yahoo.com
```

**How to get App Password:**
1. Go to: [account.yahoo.com](https://account.yahoo.com)
2. Security → "Generate app password"
3. Copy the password

---

### **6. ProtonMail**

```
SMTP_HOST=127.0.0.1
SMTP_PORT=1025
SMTP_USER=your-email@protonmail.com
SMTP_PASSWORD=your-password
SMTP_FROM_EMAIL=your-email@protonmail.com
```

**Note:** ProtonMail requires ProtonMail Bridge (desktop app) for SMTP access.

---

### **7. Zoho Mail**

```
SMTP_HOST=smtp.zoho.com
SMTP_PORT=587
SMTP_USER=your-email@zoho.com
SMTP_PASSWORD=your-zoho-password
SMTP_FROM_EMAIL=your-email@zoho.com
```

**Alternative:**
- `smtp.zoho.eu` (for European accounts)
- `smtp.zoho.in` (for Indian accounts)

---

### **8. Custom Domain Email (cPanel, etc.)**

If you have email with your own domain (e.g., `noreply@meldra.ai`):

```
SMTP_HOST=mail.yourdomain.com
SMTP_PORT=587
SMTP_USER=noreply@yourdomain.com
SMTP_PASSWORD=your-email-password
SMTP_FROM_EMAIL=noreply@yourdomain.com
```

**Common cPanel SMTP servers:**
- `mail.yourdomain.com`
- `smtp.yourdomain.com`

**Check with your hosting provider** for the correct SMTP server.

---

### **9. SendGrid (Professional Email Service)**

```
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASSWORD=your-sendgrid-api-key
SMTP_FROM_EMAIL=your-verified-email@domain.com
```

**Note:** `SMTP_USER` must be exactly `apikey` (not your email).

---

### **10. Mailgun (Professional Email Service)**

```
SMTP_HOST=smtp.mailgun.org
SMTP_PORT=587
SMTP_USER=your-mailgun-username
SMTP_PASSWORD=your-mailgun-password
SMTP_FROM_EMAIL=your-verified-email@domain.com
```

---

### **11. Amazon SES (AWS)**

```
SMTP_HOST=email-smtp.us-east-1.amazonaws.com
SMTP_PORT=587
SMTP_USER=your-ses-smtp-username
SMTP_PASSWORD=your-ses-smtp-password
SMTP_FROM_EMAIL=your-verified-email@domain.com
```

**Note:** Replace `us-east-1` with your AWS region.

---

## 🔧 **Port Options**

Most providers support **two ports**:

- **Port 587** (TLS/STARTTLS) - **Recommended** ✅
  - Uses encryption after connection
  - Works with most providers

- **Port 465** (SSL) - Alternative
  - Uses SSL encryption from start
  - Some providers prefer this

**Try 587 first. If it doesn't work, try 465.**

---

## ✅ **Step 2: Test Your Configuration**

After setting up SMTP variables:

1. **Railway will auto-restart** (wait 1-2 minutes)
2. **Go to:** `https://insight.meldra.ai/forgot-password`
3. **Enter your email**
4. **Click "Send Reset Link"**
5. **Check your email inbox** (and spam folder)

---

## 🔍 **Verify in Railway Logs**

1. **Railway → insightsheet service → Logs**
2. **Look for:**
   - ✅ `Password reset email sent successfully to [email]` (success!)
   - ❌ `SMTP credentials not configured` (variables not set)
   - ❌ `Failed to send password reset email` (wrong credentials or server)

---

## 🐛 **Troubleshooting**

### **Issue: "Authentication failed" (535 error)**

**Causes:**
- Wrong password
- Need App Password (Gmail, Yahoo)
- Account security settings blocking access

**Fixes:**
- **Gmail/Yahoo:** Use App Password, not regular password
- **Other providers:** Check if "Less secure apps" needs to be enabled
- **Double-check:** Username and password are correct

---

### **Issue: "Connection refused" or "Connection timeout"**

**Causes:**
- Wrong SMTP_HOST
- Wrong SMTP_PORT
- Firewall blocking

**Fixes:**
- Verify SMTP_HOST is correct (check provider's documentation)
- Try port 465 instead of 587 (or vice versa)
- Check Railway logs for specific error

---

### **Issue: "Email not received"**

**Check:**
1. Railway logs show "email sent successfully"
2. Spam/junk folder
3. Email address is correct
4. Provider's email delivery status

---

## 📋 **Quick Reference Table**

| Provider | SMTP_HOST | SMTP_PORT | App Password? |
|----------|-----------|-----------|---------------|
| Gmail | `smtp.gmail.com` | 587 | ✅ Yes |
| GMX | `mail.gmx.com` | 587 | ❌ No |
| Rediffmail | `smtp.rediffmail.com` | 587 | ❌ No |
| Outlook | `smtp-mail.outlook.com` | 587 | Maybe |
| Yahoo | `smtp.mail.yahoo.com` | 587 | ✅ Yes |
| Zoho | `smtp.zoho.com` | 587 | ❌ No |
| Custom Domain | `mail.yourdomain.com` | 587 | ❌ No |

---

## 🎯 **Recommended Setup**

**For Production:**
- Use **SendGrid** or **Mailgun** (reliable, professional)
- Or use **Gmail with App Password** (free, easy)

**For Development:**
- Use any provider that works
- Or skip email (link shown in UI for testing)

---

## ✅ **Complete Checklist**

- [ ] Chosen email provider
- [ ] Found correct SMTP_HOST for provider
- [ ] Set SMTP_PORT (usually 587)
- [ ] Set SMTP_USER (your email)
- [ ] Set SMTP_PASSWORD (App Password if needed)
- [ ] Set SMTP_FROM_EMAIL (your email)
- [ ] Saved variables in Railway
- [ ] Railway restarted
- [ ] Tested password reset - email received
- [ ] Checked Railway logs for success

---

**Any email provider that supports SMTP will work! Just use the correct SMTP settings.** 🚀
