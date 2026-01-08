# 🔍 Troubleshoot: Email Not Sending to Gmail

## ❌ **Problem**

Frontend shows success message, but email not received in Gmail inbox.

---

## 🔍 **Step 1: Check Railway Logs**

This is the **most important step** - it will tell us exactly what's wrong.

### **How to Check:**

1. **Railway Dashboard → insightsheet service → Logs tab**
2. **Try password reset again** (while watching logs)
3. **Look for these messages:**

**✅ Success:**
```
Password reset email sent successfully to sumitagaria@gmail.com
```

**❌ SMTP Not Configured:**
```
SMTP credentials not configured. Email not sent. Reset link: ...
```

**❌ Authentication Failed:**
```
Failed to send password reset email to sumitagaria@gmail.com: 535 Authentication failed
```

**❌ Connection Error:**
```
Failed to send password reset email: Connection refused
```

**❌ Other Error:**
```
Failed to send password reset email: [error message]
```

---

## 🔧 **Step 2: Verify SMTP Variables in Railway**

Based on your screenshot, check these variables:

1. **Railway → insightsheet service → Variables tab**
2. **Verify these are set correctly:**

```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=mata@gmail.com  (or your Gmail address)
SMTP_PASSWORD=[Gmail App Password - 16 characters, no spaces]
SMTP_FROM_EMAIL=meldra@gmail.com  (should match SMTP_USER or be same domain)
```

---

## ⚠️ **Common Issues & Fixes**

### **Issue 1: SMTP_PASSWORD is Regular Password (Not App Password)**

**Symptom:** Logs show "535 Authentication failed"

**Fix:**
1. Get Gmail App Password:
   - Go to: [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords)
   - Enable 2-Step Verification first (if not enabled)
   - Generate App Password for "Mail" → "Other" → "Railway"
   - Copy 16-character password (remove spaces)

2. Update in Railway:
   - Railway → Variables → `SMTP_PASSWORD`
   - Replace with App Password (not regular password)
   - Save → Railway restarts

---

### **Issue 2: SMTP_USER and SMTP_FROM_EMAIL Don't Match**

**Symptom:** Email might not send or get rejected

**Fix:**
- `SMTP_USER` should be the Gmail account you're using
- `SMTP_FROM_EMAIL` should be the same email (or same domain)
- Example:
  ```
  SMTP_USER=sumitagaria@gmail.com
  SMTP_FROM_EMAIL=sumitagaria@gmail.com
  ```

---

### **Issue 3: 2-Step Verification Not Enabled**

**Symptom:** Can't generate App Password

**Fix:**
1. Go to: [myaccount.google.com/security](https://myaccount.google.com/security)
2. Enable "2-Step Verification"
3. Then generate App Password

---

### **Issue 4: Wrong SMTP_HOST or SMTP_PORT**

**Symptom:** Connection refused or timeout

**Fix:**
- `SMTP_HOST` must be exactly: `smtp.gmail.com`
- `SMTP_PORT` must be: `587` (or try `465`)

---

### **Issue 5: Gmail Blocking "Less Secure Apps"**

**Symptom:** Authentication fails even with App Password

**Fix:**
- App Passwords bypass this, but check:
  1. Go to: [myaccount.google.com/security](https://myaccount.google.com/security)
  2. Make sure 2-Step Verification is enabled
  3. Use App Password (not regular password)

---

## 🔍 **Step 3: Test SMTP Connection**

### **Check Railway Logs After Password Reset:**

1. **Request password reset** from `insight.meldra.ai/forgot-password`
2. **Immediately check Railway logs**
3. **Look for the exact error message**

**Common error messages:**

| Error | Cause | Fix |
|-------|-------|-----|
| `SMTP credentials not configured` | Variables not set | Set all 5 SMTP variables |
| `535 Authentication failed` | Wrong password or need App Password | Use Gmail App Password |
| `Connection refused` | Wrong SMTP_HOST or SMTP_PORT | Check SMTP_HOST and SMTP_PORT |
| `Timeout` | Firewall or network issue | Check Railway logs for details |
| `Email sent successfully` | ✅ Working! | Check spam folder |

---

## ✅ **Step 4: Verify Email Was Sent**

### **Check Railway Logs:**

Look for this line:
```
Password reset email sent successfully to sumitagaria@gmail.com
```

**If you see this:**
- ✅ Email was sent from Railway
- Check Gmail inbox (and spam folder)
- Check "All Mail" folder
- Wait 1-2 minutes (sometimes delayed)

**If you DON'T see this:**
- ❌ Email wasn't sent
- Check the error message in logs
- Fix the issue (see above)

---

## 📋 **Quick Checklist**

- [ ] Railway logs checked (what error shows?)
- [ ] `SMTP_HOST` = `smtp.gmail.com`
- [ ] `SMTP_PORT` = `587`
- [ ] `SMTP_USER` = your Gmail address
- [ ] `SMTP_PASSWORD` = Gmail App Password (16 chars, no spaces)
- [ ] `SMTP_FROM_EMAIL` = your Gmail address
- [ ] 2-Step Verification enabled on Gmail
- [ ] Railway restarted after setting variables
- [ ] Checked spam folder
- [ ] Checked "All Mail" folder

---

## 🎯 **Most Likely Issues**

Based on common problems:

1. **SMTP_PASSWORD is regular password** (not App Password) - **90% of issues**
2. **2-Step Verification not enabled** - Can't generate App Password
3. **Wrong email in SMTP_USER** - Should match the Gmail account
4. **SMTP variables not saved** - Railway didn't restart

---

## 🔍 **What to Do Now**

1. **Check Railway logs** (most important!)
   - Railway → insightsheet service → Logs
   - Request password reset
   - Copy the exact error message

2. **Share the error message** from logs
   - This will tell us exactly what's wrong

3. **Verify SMTP variables** are set correctly
   - Especially `SMTP_PASSWORD` (should be App Password)

---

**Check Railway logs first - that will tell us exactly what's wrong!** 🔍
