# 📧 Email Setup Guide - Password Reset & Notifications

## ✅ **What's Implemented**

Email sending functionality has been added! Now you need to configure SMTP credentials.

---

## 🔧 **How to Set Up Email Sending**

### **Option 1: Gmail SMTP (Recommended for Testing)**

1. **Enable App Password in Gmail:**
   - Go to: https://myaccount.google.com/apppasswords
   - Sign in with your Gmail account
   - Select "Mail" and "Other (Custom name)"
   - Enter "Meldra" as the name
   - Click "Generate"
   - **Copy the 16-character app password** (you'll need this)

2. **Add to Railway Environment Variables:**
   - Go to Railway Dashboard → Your Service → Variables
   - Add these variables:

   ```
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=your-email@gmail.com
   SMTP_PASSWORD=your-16-char-app-password
   SMTP_FROM_EMAIL=your-email@gmail.com
   FRONTEND_URL=https://insight.meldra.ai
   ```

---

### **Option 2: SendGrid (Recommended for Production)**

1. **Create SendGrid Account:**
   - Go to: https://sendgrid.com
   - Sign up for free account (100 emails/day free)
   - Verify your email

2. **Create API Key:**
   - SendGrid Dashboard → Settings → API Keys
   - Click "Create API Key"
   - Name it "Meldra Password Reset"
   - Select "Full Access" or "Mail Send" permissions
   - **Copy the API key** (shown only once!)

3. **Add to Railway Environment Variables:**
   ```
   SMTP_HOST=smtp.sendgrid.net
   SMTP_PORT=587
   SMTP_USER=apikey
   SMTP_PASSWORD=your-sendgrid-api-key
   SMTP_FROM_EMAIL=noreply@meldra.ai
   FRONTEND_URL=https://insight.meldra.ai
   ```

---

### **Option 3: AWS SES (For High Volume)**

1. **Set up AWS SES:**
   - AWS Console → SES
   - Verify your email domain
   - Create SMTP credentials

2. **Add to Railway:**
   ```
   SMTP_HOST=email-smtp.us-east-1.amazonaws.com
   SMTP_PORT=587
   SMTP_USER=your-ses-smtp-username
   SMTP_PASSWORD=your-ses-smtp-password
   SMTP_FROM_EMAIL=noreply@meldra.ai
   FRONTEND_URL=https://insight.meldra.ai
   ```

---

### **Option 4: Any SMTP Server**

If you have your own SMTP server:

```
SMTP_HOST=your-smtp-server.com
SMTP_PORT=587
SMTP_USER=your-username
SMTP_PASSWORD=your-password
SMTP_FROM_EMAIL=noreply@meldra.ai
FRONTEND_URL=https://insight.meldra.ai
```

---

## 📋 **Railway Environment Variables Setup**

1. **Go to Railway Dashboard:**
   - Click on your "insightsheet" service
   - Click "Variables" tab

2. **Add These Variables:**
   - Click "+ New Variable" for each:
   
   | Variable Name | Example Value | Description |
   |--------------|---------------|-------------|
   | `SMTP_HOST` | `smtp.gmail.com` | SMTP server hostname |
   | `SMTP_PORT` | `587` | SMTP port (usually 587 for TLS) |
   | `SMTP_USER` | `your-email@gmail.com` | SMTP username |
   | `SMTP_PASSWORD` | `your-app-password` | SMTP password or API key |
   | `SMTP_FROM_EMAIL` | `noreply@meldra.ai` | Email address to send from |
   | `FRONTEND_URL` | `https://insight.meldra.ai` | Your frontend URL |

3. **Save and Redeploy:**
   - Railway will auto-restart with new variables
   - Or manually redeploy

---

## ✅ **Testing Email Sending**

### **After Setting Up:**

1. **Request Password Reset:**
   - Go to: `https://insight.meldra.ai/forgot-password`
   - Enter your email
   - Click "Send Reset Link"

2. **Check Email:**
   - Check your inbox (and spam folder)
   - You should receive a password reset email
   - Click the reset link

3. **Check Railway Logs:**
   - Railway Dashboard → Logs
   - Look for: "Password reset email sent successfully"
   - Or: "Failed to send password reset email" (if error)

---

## 🐛 **Troubleshooting**

### **Email Not Sending:**

1. **Check Railway Logs:**
   - Look for error messages
   - Common errors:
     - "SMTP credentials not configured" → Add environment variables
     - "Authentication failed" → Wrong password/username
     - "Connection refused" → Wrong SMTP host/port

2. **Verify Environment Variables:**
   - Railway → Variables tab
   - Make sure all SMTP variables are set
   - Check for typos

3. **Test SMTP Connection:**
   - Use a tool like: https://www.smtper.net/
   - Test with your SMTP credentials

### **Gmail Specific Issues:**

- **"Less secure app access" error:**
  - Use App Password (not regular password)
  - Enable 2FA first, then create App Password

- **"Username and Password not accepted":**
  - Make sure you're using App Password, not Gmail password
  - App Password is 16 characters, no spaces

---

## 📧 **Email Templates**

The system sends:
1. **Password Reset Email:**
   - HTML formatted
   - Contains reset link
   - Expires in 1 hour

2. **Welcome Email:**
   - Sent after registration
   - HTML formatted
   - Welcome message

---

## 🔒 **Security Notes**

- ✅ **Never commit SMTP credentials to Git**
- ✅ **Use environment variables only**
- ✅ **Use App Passwords (not regular passwords)**
- ✅ **Rotate credentials regularly**
- ✅ **Use production email service (SendGrid/AWS SES) for production**

---

## ✅ **Summary**

1. ✅ **Email service implemented** (backend code ready)
2. ⏳ **Add SMTP credentials** to Railway environment variables
3. ⏳ **Redeploy Railway** (auto-deploys after adding variables)
4. ✅ **Test password reset** - should receive email!

**Once SMTP credentials are added, password reset emails will be sent automatically!** 📧
