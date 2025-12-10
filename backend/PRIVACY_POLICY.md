# InsightSheet-lite Privacy & Data Storage Policy

## 🔒 ZERO DATA STORAGE GUARANTEE

### What We **NEVER** Store:

❌ **User Files** - Excel, CSV, ZIP, PDF files are NEVER saved to our servers
- Files are processed entirely in-memory
- Immediately deleted after processing
- No backups or temporary copies
- No file content in logs

❌ **AI Prompts & Responses** - Your questions and AI responses are NEVER stored
- Sent directly to OpenAI API
- Not logged or saved locally
- Completely ephemeral
- No conversation history

❌ **Chart Data** - Charts and visualizations are NEVER stored
- Generated in your browser
- No server-side storage
- No data mining or analysis

❌ **Spreadsheet Content** - Your actual data values are NEVER stored
- Only metadata (filename, size) for processing history
- No cells, formulas, or values
- Zero access to your business data

### What We **DO** Store (Admin Only):

✅ **User Accounts** (for authentication & billing):
- Email address
- Hashed password (bcrypt - irreversible)
- Full name (optional)
- User role (user/admin)
- Account creation date

✅ **Subscription Information** (for billing):
- Plan type (Free/Premium)
- Payment status
- Stripe customer ID (if paid)
- AI query usage count
- File upload count (number only, not content)
- Subscription start/end dates

✅ **Login History** (SECURITY & FRAUD PREVENTION - Admin Only):
- User email
- Login/logout timestamps
- Failed login attempts
- IP address
- Geographic location (city/country)
- Browser user agent
- Device information
- Session duration
- **Purpose**: Detect suspicious activity, prevent unauthorized access

✅ **User Activity Metadata** (ANALYTICS - Admin Only):
- Activity type (e.g., "file_upload", "ai_query", "chart_created")
- Page visited
- Timestamp
- **NO CONTENT** - Only that an action occurred, not what was processed

✅ **File Processing History** (USAGE TRACKING - Admin Only):
- Original filename (name only, not content)
- File size in MB
- Processing type (excel_to_ppt, zip_clean)
- Success/failure status
- Error message (if failed)
- Timestamp
- **NO FILE CONTENT** - Only metadata

## 🛡️ Security Metadata - Admin Access Only

### Login Tracking (Security Dashboard)

The admin (sumitagaria@gmail.com) can access:

1. **Login Security Dashboard**:
   - When: All login timestamps
   - Who: User email addresses
   - Where: IP addresses, city, country, region
   - How many times: Login frequency per user per day
   - Device: Browser, OS, device type
   - Failed attempts: Security breach detection

2. **Usage Analytics**:
   - Daily active users
   - Feature usage (which features are used most)
   - File processing counts (not content)
   - AI query counts (not prompts)

### User Access = ZERO

Regular users **CANNOT** access:
- Other users' login history
- IP addresses or locations
- System analytics
- Admin dashboards
- Any metadata beyond their own subscription info

### Admin Endpoints (Restricted)

Only `sumitagaria@gmail.com` can access:

```
GET /api/admin/users              # List all users
GET /api/admin/subscriptions      # View all subscriptions
GET /api/admin/login-history      # Security audit logs
GET /api/admin/activity           # System-wide activity
GET /api/admin/analytics          # Usage statistics
```

All other users receive: `403 Forbidden - Not enough permissions`

## 📊 Database Tables

### What's Stored:

1. **Users** (Authentication)
   ```
   - id, email, hashed_password, full_name, role, created_date
   ```

2. **Subscriptions** (Billing)
   ```
   - user_email, plan, status, ai_queries_used, ai_queries_limit,
     payment_status, stripe_customer_id, created_date
   ```

3. **LoginHistory** (Security - ADMIN ONLY)
   ```
   - user_email, event_type, ip_address, location, browser,
     device, session_duration, created_date
   ```

4. **UserActivity** (Analytics - ADMIN ONLY)
   ```
   - user_email, activity_type, page_name, created_date
   - NO DETAILS FIELD (removed to prevent accidental data storage)
   ```

5. **FileProcessingHistory** (Metadata - ADMIN ONLY)
   ```
   - user_email, processing_type, original_filename (name only),
     file_size_mb, status, error_message, created_date
   ```

### What's NOT Stored:

❌ File contents
❌ AI prompts or responses
❌ Chart data or visualizations
❌ Spreadsheet cells or formulas
❌ Cleaned filenames from ZIP processing
❌ User passwords (only bcrypt hashes)

## 🔐 Data Security

### Encryption
- Passwords: bcrypt hashed (irreversible)
- JWT Tokens: HS256 signed
- Database: SSL/TLS encrypted connections
- API: HTTPS only in production

### Access Control
- JWT authentication required for all endpoints
- Role-based access (user/admin)
- Admin endpoints restricted to sumitagaria@gmail.com
- Token expiration: 30 minutes

### Compliance
- GDPR compliant (EU data protection)
- No data mining or profiling
- No third-party data sharing
- No advertising or tracking cookies

## 📝 User Rights

### You Can:
- Request account deletion (removes all your data)
- View your subscription information
- View your activity history (metadata only)
- Export your account data (email, subscription info)

### We Cannot:
- Recover your files (we never stored them)
- Show you AI conversation history (not stored)
- Share your login details (hashed passwords)

## 🎯 Purpose of Data Collection

### Login History (Security)
- **Detect unauthorized access**: Multiple failed logins
- **Fraud prevention**: Unusual IP addresses or locations
- **Account security**: Alert if login from new device/location
- **Compliance**: Security audit trail

### Activity Metadata (Analytics)
- **Improve features**: See which features are used
- **Bug detection**: Find where users encounter errors
- **Capacity planning**: Ensure servers can handle load
- **User experience**: Optimize popular workflows

### Subscription Data (Billing)
- **Payment processing**: Stripe integration
- **Usage limits**: Enforce Free vs Premium limits
- **Renewals**: Manage subscription lifecycle
- **Support**: Help with billing questions

## 🚨 Data Breach Policy

In the unlikely event of a data breach:

1. **Immediate notification** to all affected users
2. **Investigation** to determine scope
3. **Password reset** for all users
4. **Security patch** deployment
5. **Transparency report** published

**Good news**: Even if breached, attackers would get:
- Hashed passwords (useless without rainbow tables)
- Email addresses
- Login metadata
- NO FILES, NO AI DATA, NO BUSINESS INFORMATION

## 📞 Contact

Questions about privacy or data storage?
- **Admin**: sumitagaria@gmail.com
- **Domain**: meldra.ai

---

**Last Updated**: 2025-01-15
**Policy Version**: 1.0
**Effective Date**: Immediately

---

## Summary

✅ **We store**: Login metadata for security (admin only)
✅ **We store**: Subscription data for billing
✅ **We store**: Activity metadata for analytics (admin only)

❌ **We NEVER store**: Your files
❌ **We NEVER store**: Your AI prompts/responses
❌ **We NEVER store**: Your data content

**You own your data. We just help you analyze it.**
