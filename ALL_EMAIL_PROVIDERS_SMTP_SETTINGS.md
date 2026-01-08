# 📧 All Email Providers SMTP Settings
## Outlook, GMX, Gmail - Complete Reference

---

## 🎯 **Important: You Can Only Use ONE at a Time**

**You can only use ONE email provider at a time.** But you can easily switch by updating the variables!

---

## 📋 **Complete SMTP Settings for All Providers**

---

## 1️⃣ **Microsoft Outlook / Office 365**

```
SMTP_HOST=smtp-mail.outlook.com
SMTP_PORT=587
SMTP_USER=noreply@meldra.ai
SMTP_PASSWORD=[Password for noreply@meldra.ai]
SMTP_FROM_EMAIL=noreply@meldra.ai
```

**Alternative SMTP servers (if first doesn't work):**
- `smtp.office365.com` (port 587)
- `smtp.live.com` (port 587)

**Notes:**
- Use regular password (unless 2FA enabled, then use App Password)
- May need to enable SMTP AUTH in Microsoft 365 admin

---

## 2️⃣ **GMX**

```
SMTP_HOST=mail.gmx.com
SMTP_PORT=587
SMTP_USER=your-email@gmx.com
SMTP_PASSWORD=[Your GMX password]
SMTP_FROM_EMAIL=your-email@gmx.com
```

**Alternative GMX servers:**
- `smtp.gmx.com` (port 587)
- `mail.gmx.net` (port 587)

**Notes:**
- Use regular password (no App Password needed!)
- Easy setup - no special requirements

---

## 3️⃣ **Gmail**

```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=[Gmail App Password - 16 characters]
SMTP_FROM_EMAIL=your-email@gmail.com
```

**Alternative Gmail servers:**
- `smtp.gmail.com` (port 587) - Recommended
- `smtp.gmail.com` (port 465) - SSL alternative

**Notes:**
- **MUST use App Password** (not regular password)
- Requires 2-Step Verification enabled
- Get App Password: [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords)

---

## 📊 **Quick Comparison Table**

| Provider | SMTP_HOST | SMTP_PORT | App Password? | Notes |
|----------|-----------|-----------|---------------|-------|
| **Outlook** | `smtp-mail.outlook.com` | 587 | Maybe (if 2FA) | May need SMTP AUTH enabled |
| **GMX** | `mail.gmx.com` | 587 | ❌ No | Easiest - regular password |
| **Gmail** | `smtp.gmail.com` | 587 | ✅ Yes | Requires App Password |

---

## 🔄 **How to Switch Between Providers**

### **To Switch to Outlook:**

1. **Railway → Variables**
2. **Update:**
   - `SMTP_HOST` → `smtp-mail.outlook.com`
   - `SMTP_USER` → `noreply@meldra.ai`
   - `SMTP_PASSWORD` → Password for noreply account
   - `SMTP_FROM_EMAIL` → `noreply@meldra.ai`
3. **Save** → Railway restarts

---

### **To Switch to GMX:**

1. **Railway → Variables**
2. **Update:**
   - `SMTP_HOST` → `mail.gmx.com`
   - `SMTP_USER` → `your-email@gmx.com`
   - `SMTP_PASSWORD` → Your GMX password
   - `SMTP_FROM_EMAIL` → `your-email@gmx.com`
3. **Save** → Railway restarts

---

### **To Switch to Gmail:**

1. **Railway → Variables**
2. **Update:**
   - `SMTP_HOST` → `smtp.gmail.com`
   - `SMTP_USER` → `your-email@gmail.com`
   - `SMTP_PASSWORD` → Gmail App Password (16 chars)
   - `SMTP_FROM_EMAIL` → `your-email@gmail.com`
3. **Save** → Railway restarts

---

## 🎯 **Recommended Setup**

### **For Production (Best):**

**Option 1: Outlook (Your Domain)**
```
SMTP_HOST=smtp-mail.outlook.com
SMTP_PORT=587
SMTP_USER=noreply@meldra.ai
SMTP_PASSWORD=[Password for noreply@meldra.ai]
SMTP_FROM_EMAIL=noreply@meldra.ai
```
✅ Most professional (uses your domain)

---

**Option 2: GMX (Easiest)**
```
SMTP_HOST=mail.gmx.com
SMTP_PORT=587
SMTP_USER=your-email@gmx.com
SMTP_PASSWORD=[GMX password]
SMTP_FROM_EMAIL=your-email@gmx.com
```
✅ Easiest setup (no App Password needed)

---

**Option 3: Gmail (If you prefer)**
```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=[Gmail App Password]
SMTP_FROM_EMAIL=your-email@gmail.com
```
✅ Free and reliable (but needs App Password)

---

## 📋 **Copy-Paste Ready Configurations**

### **Outlook Configuration:**
```
SMTP_HOST=smtp-mail.outlook.com
SMTP_PORT=587
SMTP_USER=noreply@meldra.ai
SMTP_PASSWORD=your-outlook-password
SMTP_FROM_EMAIL=noreply@meldra.ai
```

---

### **GMX Configuration:**
```
SMTP_HOST=mail.gmx.com
SMTP_PORT=587
SMTP_USER=your-email@gmx.com
SMTP_PASSWORD=your-gmx-password
SMTP_FROM_EMAIL=your-email@gmx.com
```

---

### **Gmail Configuration:**
```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-gmail-app-password
SMTP_FROM_EMAIL=your-email@gmail.com
```

---

## ✅ **Which One Should You Use?**

**My Recommendation:**

1. **Outlook** (`noreply@meldra.ai`) - **Best for production**
   - Uses your domain
   - Most professional
   - You already have it set up

2. **GMX** - **Easiest to set up**
   - No App Password needed
   - Simple configuration
   - Good for testing

3. **Gmail** - **If you prefer Gmail**
   - Free and reliable
   - But needs App Password setup

---

## 🔧 **Quick Setup Steps**

1. **Choose one provider** (Outlook recommended)
2. **Railway → Variables**
3. **Update all 5 SMTP variables** with that provider's settings
4. **Save** → Railway restarts
5. **Test** → Request password reset → Check email

---

## 📋 **Complete Checklist**

**For Outlook:**
- [ ] `SMTP_HOST` = `smtp-mail.outlook.com`
- [ ] `SMTP_PORT` = `587`
- [ ] `SMTP_USER` = `noreply@meldra.ai`
- [ ] `SMTP_PASSWORD` = Password for noreply account
- [ ] `SMTP_FROM_EMAIL` = `noreply@meldra.ai`

**For GMX:**
- [ ] `SMTP_HOST` = `mail.gmx.com`
- [ ] `SMTP_PORT` = `587`
- [ ] `SMTP_USER` = `your-email@gmx.com`
- [ ] `SMTP_PASSWORD` = GMX password
- [ ] `SMTP_FROM_EMAIL` = `your-email@gmx.com`

**For Gmail:**
- [ ] `SMTP_HOST` = `smtp.gmail.com`
- [ ] `SMTP_PORT` = `587`
- [ ] `SMTP_USER` = `your-email@gmail.com`
- [ ] `SMTP_PASSWORD` = Gmail App Password
- [ ] `SMTP_FROM_EMAIL` = `your-email@gmail.com`

---

**All three providers' settings are here! Choose one and configure Railway.** 🚀
