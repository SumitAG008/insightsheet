# Security & Compliance 🔒

## Overview

**InsightSheet-lite** on **meldra.ai** is built with security and privacy as our top priorities. This document explains our security measures and compliance standards.

---

## 🛡️ Security Features

### 1. Data Protection

#### **ZERO File Storage**
- ✅ Your Excel, CSV, ZIP, and PDF files are **NEVER stored** on our servers
- ✅ All file processing happens **in-memory only**
- ✅ Files are automatically deleted after processing
- ✅ No temporary copies or backups
- ✅ No file content in logs or databases

**How it works:**
```
Your File → Upload → Process in Memory → Download Result → Delete Immediately
           (Not Saved)                    (Not Saved)
```

#### **ZERO AI Data Storage**
- ✅ Your questions to AI are **NOT stored** in our database
- ✅ AI responses are **NOT logged** anywhere
- ✅ Completely ephemeral - exists only during your session
- ✅ We only count how many AI queries you use (for billing)

**Example:**
```
You ask: "What are my top selling products?"
AI responds: "Product A is your top seller..."

What we store: "User made 1 AI query on 2025-01-15"
What we DON'T store: Your question or the AI response
```

#### **Password Security**
- ✅ Passwords are **hashed with bcrypt** (irreversible)
- ✅ We **cannot** see your actual password
- ✅ Passwords **never** stored in plain text
- ✅ Secure salt rounds for maximum protection

**Visual:**
```
Your Password: "mypassword123"
              ↓ (bcrypt hashing)
Stored in DB: "$2b$12$KIXxBj3GfJ6..."
              ↑ (impossible to reverse)
We CANNOT recover your original password
```

### 2. Authentication & Authorization

#### **JWT Token Authentication**
- ✅ Secure token-based authentication
- ✅ Tokens expire after 30 minutes
- ✅ Automatic logout on token expiration
- ✅ Tokens stored securely in browser

#### **Role-Based Access Control**
- ✅ **Regular Users**: Access to their own data only
- ✅ **Admin Users**: Access to system monitoring (security purposes)
- ✅ Users **CANNOT** access other users' data
- ✅ Admin features protected by additional checks

### 3. API Security

#### **HTTPS Only (Production)**
- ✅ All connections encrypted with SSL/TLS
- ✅ No plain HTTP allowed in production
- ✅ Secure data transmission
- ✅ Certificate validation

#### **CORS Protection**
- ✅ Only approved domains can access API
- ✅ Cross-origin requests blocked by default
- ✅ Whitelist: meldra.ai domain only

#### **Rate Limiting**
- ✅ Prevents brute force attacks
- ✅ Protects against DDoS
- ✅ Fair usage enforcement

### 4. File Upload Security

#### **File Type Validation**
- ✅ Magic number verification (checks actual file content)
- ✅ Rejects dangerous file types (.exe, .dll, .bat, etc.)
- ✅ Only allows: Excel, CSV, ZIP, PDF files

#### **File Size Limits**
- ✅ **Free Plan**: 10MB maximum
- ✅ **Premium Plan**: 500MB maximum
- ✅ Prevents resource abuse
- ✅ Protects server performance

#### **ZIP Bomb Protection**
- ✅ Checks uncompressed size before extraction
- ✅ Limits: 2GB uncompressed maximum
- ✅ Prevents malicious ZIP files
- ✅ Directory traversal prevention

### 5. Database Security

#### **SQL Injection Prevention**
- ✅ SQLAlchemy ORM (parameterized queries)
- ✅ Input validation with Pydantic
- ✅ No raw SQL queries
- ✅ Automatic escaping

#### **Encrypted Connections**
- ✅ PostgreSQL with SSL/TLS
- ✅ Secure connection strings
- ✅ No plain-text database credentials

---

## 📋 Compliance Standards

### 🇪🇺 GDPR (General Data Protection Regulation)

**Status: ✅ Compliant**

#### **Legal Basis for Data Processing**
We process data under:
1. **Contract Performance**: To provide our service
2. **Legitimate Interest**: Security monitoring (admin only)
3. **Consent**: Optional features

#### **Data Minimization**
- ✅ We collect only what's necessary
- ✅ No excessive data collection
- ✅ Files not stored (processed only)

#### **Right to be Forgotten**
- ✅ Delete your account anytime
- ✅ All your data deleted within 30 days
- ✅ No backups retained

#### **Data Portability**
- ✅ Export your subscription data
- ✅ Download your activity history
- ✅ Machine-readable format (JSON)

#### **Breach Notification**
- ✅ We'll notify you within 72 hours
- ✅ Clear explanation of what happened
- ✅ Steps we're taking to fix it

### 🇺🇸 CCPA (California Consumer Privacy Act)

**Status: ✅ Compliant**

#### **Your Rights Under CCPA**
1. **Right to Know**: What data we collect about you
2. **Right to Delete**: Request deletion of your data
3. **Right to Opt-Out**: Opt-out of data sharing (we don't share anyway)
4. **Right to Non-Discrimination**: No penalty for exercising rights

#### **Data We Collect**
- ✅ Personal info: Email, name
- ✅ Account info: Password (hashed), subscription
- ✅ Usage info: Login times, feature usage (no content)
- ❌ We do NOT sell your data

### 🏥 HIPAA Considerations

**Status: ⚠️ Not HIPAA Compliant Yet**

**Warning:** Do **NOT** upload:
- ❌ Protected Health Information (PHI)
- ❌ Medical records
- ❌ Patient data
- ❌ Healthcare-related files with personal identifiers

**Future:** HIPAA compliance planned for healthcare edition.

### 💳 PCI-DSS (Payment Card Industry)

**Status: ✅ Compliant (via Stripe)**

- ✅ We use **Stripe** for payments
- ✅ We **NEVER** handle your credit card details
- ✅ Stripe is PCI-DSS Level 1 certified
- ✅ Your payment info stays with Stripe only

---

## 📊 What Data We Collect

### ✅ **Data We DO Collect**

#### 1. **Account Information** (Required for service)
```
✅ Email address
✅ Full name (optional)
✅ Hashed password
✅ Account creation date
```

#### 2. **Subscription Information** (Required for billing)
```
✅ Plan type (Free/Premium)
✅ Payment status
✅ Stripe customer ID
✅ Subscription start/end dates
✅ AI query count (number only)
✅ File upload count (number only)
```

#### 3. **Security Logs** (Admin only - for fraud prevention)
```
✅ Login timestamps
✅ IP addresses
✅ Geographic location (city, country)
✅ Browser and device info
✅ Failed login attempts
```

**Purpose:** Detect unauthorized access, prevent fraud

**Access:** Only admin (sumitagaria@gmail.com) can view

#### 4. **Activity Metadata** (Admin only - for analytics)
```
✅ Activity type (e.g., "file_upload", "ai_query")
✅ Page name
✅ Timestamp
```

**What we DON'T log:**
- ❌ File contents
- ❌ AI prompts or responses
- ❌ Any user data content

#### 5. **File Processing History** (Admin only - for usage tracking)
```
✅ Original filename (name only, not content)
✅ File size in MB
✅ Processing type (excel_to_ppt, zip_clean)
✅ Success/failure status
✅ Timestamp
```

**What we DON'T store:**
- ❌ File contents
- ❌ Processed results
- ❌ Any data from your files

### ❌ **Data We DO NOT Collect**

```
❌ File contents (Excel, CSV, ZIP, PDF)
❌ AI prompts or responses
❌ Chart data or visualizations
❌ Spreadsheet cells, formulas, or values
❌ Cleaned filenames from ZIP processing
❌ Social Security Numbers
❌ Credit card information
❌ Biometric data
❌ Health information
❌ Browsing history outside our app
❌ Location data (except city/country for security)
```

---

## 🔐 Data Storage & Retention

### **Where Your Data is Stored**

#### **Database** (Neon PostgreSQL - US/EU regions)
- ✅ User accounts
- ✅ Subscriptions
- ✅ Security logs
- ✅ Activity metadata

**Security:**
- ✅ Encrypted at rest
- ✅ Encrypted in transit (SSL/TLS)
- ✅ Regular backups
- ✅ Access logs

#### **Processing** (In-Memory Only)
- ✅ Files processed in RAM
- ✅ No disk storage
- ✅ Automatic cleanup after processing

### **Data Retention Policy**

| Data Type | Retention Period | Reason |
|-----------|------------------|--------|
| Account info | Until you delete | Service provision |
| Subscription | Until you delete | Billing |
| Login history | 90 days | Security monitoring |
| Activity logs | 90 days | Analytics |
| File metadata | 30 days | Usage tracking |
| **Files** | **0 days (never stored)** | **Privacy** |
| **AI data** | **0 days (never stored)** | **Privacy** |

### **Account Deletion**

When you delete your account:
1. ✅ Account marked for deletion immediately
2. ✅ All data deleted within 30 days
3. ✅ Backups purged
4. ✅ No recovery possible after deletion

---

## 🚨 Security Incidents & Response

### **If We Detect a Breach**

#### **Within 24 Hours:**
1. Investigate and contain the breach
2. Assess what data was affected
3. Notify affected users

#### **Within 72 Hours:**
1. Full incident report
2. Email notification to all affected users
3. Public transparency report (if appropriate)

#### **Your Actions:**
1. ✅ Change your password immediately
2. ✅ Review account activity
3. ✅ Enable any additional security features we release

### **What We'll Tell You**
- What happened
- What data was affected
- What we're doing about it
- What you should do
- How to contact us

---

## 👤 Your Rights & Controls

### **Access Your Data**
- ✅ View your subscription information
- ✅ Download your activity history
- ✅ Export your account data (JSON format)

**How:** Settings → Privacy → Download My Data

### **Delete Your Data**
- ✅ Delete your account
- ✅ All data removed within 30 days
- ✅ No recovery after deletion

**How:** Settings → Account → Delete Account

### **Correct Your Data**
- ✅ Update your email
- ✅ Change your name
- ✅ Update subscription preferences

**How:** Settings → Profile → Edit

### **Opt-Out**
- ✅ Unsubscribe from marketing emails
- ✅ Disable activity tracking (coming soon)

**How:** Settings → Privacy → Communications

### **Contact Admin**
- ✅ Questions about your data
- ✅ Request data deletion
- ✅ Report security issues

**Email:** sumitagaria@gmail.com

---

## 🌍 International Data Transfers

### **Data Location**
- **Database:** Neon PostgreSQL (US or EU region)
- **Backend:** Deployed on Railway/Heroku/Render
- **Frontend:** Deployed on Vercel (Global CDN)

### **EU Users**
- ✅ GDPR compliant
- ✅ Standard contractual clauses
- ✅ Data minimization
- ✅ Right to be forgotten

### **California Users**
- ✅ CCPA compliant
- ✅ Do Not Sell notice
- ✅ Data deletion rights

---

## 🔍 Third-Party Services

We use these trusted services:

### **OpenAI (AI Features)**
- **What they get:** Your AI prompts
- **What they do:** Process and return responses
- **Storage:** NOT stored (ephemeral, 30-day abuse monitoring)
- **Compliance:** GDPR compliant, SOC 2 Type II
- **Link:** https://openai.com/privacy

### **Stripe (Payments)**
- **What they get:** Payment information
- **What they do:** Process payments
- **Storage:** Encrypted, PCI-DSS compliant
- **Compliance:** PCI-DSS Level 1
- **Link:** https://stripe.com/privacy

### **Neon (Database)**
- **What they get:** Database data (accounts, subscriptions)
- **What they do:** Store and manage database
- **Storage:** Encrypted at rest and in transit
- **Compliance:** SOC 2 Type II, GDPR compliant
- **Link:** https://neon.tech/privacy

---

## 📱 Browser & Cookie Policy

### **Cookies We Use**

#### **Essential Cookies**
- ✅ Authentication token (JWT)
- ✅ Session management
- ✅ Security features

**Purpose:** Make the app work
**Duration:** 30 minutes (auto-expire)

#### **We DO NOT Use:**
- ❌ Tracking cookies
- ❌ Advertising cookies
- ❌ Third-party analytics (Google Analytics, etc.)
- ❌ Social media pixels

### **Local Storage**
We store in your browser:
- ✅ JWT authentication token
- ✅ User preferences (theme, language)
- ✅ Temporary data during session

**Cleared when:** You logout or clear browser data

---

## 🏆 Certifications & Audits

### **Current Status**

| Standard | Status | Notes |
|----------|--------|-------|
| GDPR | ✅ Compliant | EU data protection |
| CCPA | ✅ Compliant | California privacy |
| SOC 2 | 🔄 In Progress | Security audit |
| ISO 27001 | 📋 Planned | Information security |
| HIPAA | ⚠️ Not Compliant | Don't upload PHI |
| PCI-DSS | ✅ Compliant | Via Stripe |

### **Third-Party Audits**
- 🔄 Annual security audit (planned)
- 🔄 Penetration testing (planned)
- 🔄 Vulnerability scanning (planned)

---

## 🛡️ Best Practices for Users

### **Protect Your Account**

1. **Use a Strong Password**
   - ✅ At least 12 characters
   - ✅ Mix of letters, numbers, symbols
   - ✅ Unique to this account
   - ❌ Don't reuse passwords

2. **Enable Two-Factor Authentication** (Coming Soon)
   - ✅ Extra layer of security
   - ✅ SMS or authenticator app

3. **Be Careful with Sensitive Data**
   - ⚠️ Don't upload files with SSNs
   - ⚠️ Don't upload medical records
   - ⚠️ Don't include credit card numbers

4. **Logout on Shared Computers**
   - ✅ Always logout after use
   - ✅ Clear browser cache/cookies
   - ✅ Use private browsing mode

5. **Monitor Your Account**
   - ✅ Check activity dashboard regularly
   - ✅ Review login history (if admin)
   - ✅ Report suspicious activity

---

## 📞 Security Contact

### **Report a Security Issue**

If you find a security vulnerability:

**Email:** security@meldra.ai (or sumitagaria@gmail.com)

**Include:**
- Description of the issue
- Steps to reproduce
- Potential impact
- Your contact information

**We'll respond within:** 24 hours

### **Responsible Disclosure**
- ✅ We won't take legal action against security researchers
- ✅ We'll credit you (if you want) when we fix the issue
- ✅ We appreciate responsible disclosure

---

## 📄 Privacy Policy & Terms

### **Full Legal Documents**

- **Privacy Policy:** https://meldra.ai/privacy
- **Terms of Service:** https://meldra.ai/terms
- **Cookie Policy:** https://meldra.ai/cookies
- **Data Processing Agreement:** Available on request

### **Updates to This Policy**

- ✅ We'll notify you of material changes
- ✅ 30-day notice before changes take effect
- ✅ Continued use = acceptance

**Last Updated:** 2025-01-15
**Version:** 1.0

---

## ✅ Summary

### **What Makes Us Secure?**

1. ✅ **ZERO file storage** - Your files never saved
2. ✅ **ZERO AI data storage** - Prompts/responses not logged
3. ✅ **Strong encryption** - Passwords hashed, connections encrypted
4. ✅ **GDPR & CCPA compliant** - Your rights protected
5. ✅ **Transparent** - Clear about what we collect
6. ✅ **Admin-only access** - Security logs protected
7. ✅ **Regular audits** - Continuous security monitoring
8. ✅ **Breach notification** - We'll tell you within 72 hours

### **Your Data, Your Control**

- ✅ You own your data
- ✅ You can delete anytime
- ✅ You can export anytime
- ✅ We don't sell your data
- ✅ We don't share without permission

---

**Questions?** Contact us at sumitagaria@gmail.com

**Report Security Issues:** security@meldra.ai

**Domain:** meldra.ai

**Built with Privacy First** 🔒
