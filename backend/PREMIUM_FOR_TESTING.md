# Premium Subscription for Testing & Development

This guide shows you how to grant premium subscriptions for testing and development purposes.

## 🚀 Quick Start - Grant Premium to Your User

### Method 1: Python Script (Recommended)

**Grant premium:**
```bash
cd backend
python grant_premium.py your-email@example.com
```

**List all subscriptions:**
```bash
python grant_premium.py list
```

**Revoke premium (back to free):**
```bash
python grant_premium.py revoke your-email@example.com
```

### Method 2: API Endpoint (Easy)

Use the development API endpoint:

```bash
curl -X POST http://localhost:8001/api/dev/grant-premium \
  -H "Content-Type: application/json" \
  -d '{"email": "your-email@example.com"}'
```

Or use a tool like Postman/Insomnia:
- **URL:** `http://localhost:8001/api/dev/grant-premium`
- **Method:** POST
- **Body (JSON):**
  ```json
  {
    "email": "your-email@example.com"
  }
  ```

### Method 3: Database Direct (Advanced)

```bash
# Connect to PostgreSQL
psql -U insightsheet_user -d insightsheet_db

# Grant premium
UPDATE subscriptions
SET
    plan = 'premium',
    status = 'active',
    ai_queries_limit = -1,
    subscription_start_date = NOW()
WHERE user_email = 'your-email@example.com';

# Verify
SELECT user_email, plan, status, ai_queries_limit FROM subscriptions;

# Exit
\q
```

## 📋 Full Examples

### Example 1: Grant Premium to Yourself

Replace with your actual email:

```bash
# Using Python script
python grant_premium.py sumit@example.com

# Using curl
curl -X POST http://localhost:8001/api/dev/grant-premium \
  -H "Content-Type: application/json" \
  -d '{"email": "sumit@example.com"}'
```

**Expected output:**
```
============================================================
✅ PREMIUM SUBSCRIPTION GRANTED!
============================================================
Email:              sumit@example.com
Plan:               PREMIUM
Status:             active
AI Queries:         Unlimited
Files Uploaded:     0
Start Date:         2024-01-15 10:30:00
============================================================
```

### Example 2: Check All Subscriptions

```bash
python grant_premium.py list
```

**Output:**
```
================================================================================
ALL SUBSCRIPTIONS
================================================================================

👑 sumit@example.com
   Plan:      PREMIUM
   Status:    active
   Queries:   ∞
   Files:     5

🆓 test@example.com
   Plan:      FREE
   Status:    active
   Queries:   2/5
   Files:     1

================================================================================
```

### Example 3: Downgrade to Free (for Testing)

```bash
python grant_premium.py revoke sumit@example.com
```

## 🔧 What Premium Gives You

When you grant premium, you get:

| Feature | Free | Premium |
|---------|------|---------|
| **AI Queries** | 5 per month | **Unlimited** |
| **File Uploads** | Limited | **Unlimited** |
| **Excel to PPT** | ✅ Basic | ✅ **Enhanced (Windows COM)** |
| **Agentic AI** | ❌ | ✅ |
| **Priority Support** | ❌ | ✅ |

## 🛠️ Troubleshooting

### Issue: "No module named 'app'"

**Solution:**
```bash
# Make sure you're in the backend directory
cd backend

# Run the script from backend directory
python grant_premium.py your-email@example.com
```

### Issue: "Could not connect to database"

**Solution:**
```bash
# Check if PostgreSQL is running
# Windows:
net start postgresql-x64-15

# Mac/Linux:
sudo systemctl start postgresql

# Verify connection
psql -U insightsheet_user -d insightsheet_db -c "SELECT 1;"
```

### Issue: "No subscription found"

This means the user doesn't exist yet. The script will automatically create a subscription for the user.

### Issue: API returns 403 Forbidden

This is expected for the regular upgrade endpoint. Use the **dev endpoint** instead:
- ❌ `/api/subscriptions/upgrade` (requires auth)
- ✅ `/api/dev/grant-premium` (no auth needed)

## 🔐 Security Note

**⚠️ IMPORTANT:** The `/api/dev/grant-premium` endpoint bypasses authentication and should **ONLY** be used in development.

### Disable in Production

Before deploying to production, either:

1. **Remove the endpoint** from `app/main.py`:
   ```python
   # Comment out or remove the dev endpoint
   # @app.post("/api/dev/grant-premium")
   # async def dev_grant_premium(...):
   #     ...
   ```

2. **Add environment check**:
   ```python
   if os.getenv("ENVIRONMENT") == "production":
       raise HTTPException(status_code=404, detail="Not found")
   ```

3. **Use firewall rules** to block access to `/api/dev/*` endpoints

## 📝 Integration with Frontend

If you want to add a "Dev: Grant Premium" button in your frontend for testing:

```javascript
// In your React component or developer tools
async function devGrantPremium(email) {
  const response = await fetch('http://localhost:8001/api/dev/grant-premium', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email })
  });

  const result = await response.json();
  console.log(result.message);

  // Refresh user data
  window.location.reload();
}

// Usage:
devGrantPremium('your-email@example.com');
```

## 🎯 Best Practices

1. **Always grant premium to your dev/test accounts** at the start of development
2. **Use the Python script** for one-time grants
3. **Use the API endpoint** for automated testing
4. **Document which test accounts have premium** in your team docs
5. **Reset test accounts** before major testing cycles

## 📞 Quick Reference

```bash
# Grant premium
python grant_premium.py user@example.com

# List all subscriptions
python grant_premium.py list

# Revoke premium
python grant_premium.py revoke user@example.com

# API grant (no auth)
curl -X POST http://localhost:8001/api/dev/grant-premium \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com"}'

# Direct database
psql -U insightsheet_user -d insightsheet_db \
  -c "UPDATE subscriptions SET plan='premium', ai_queries_limit=-1 WHERE user_email='user@example.com';"
```

## 🎓 Common Scenarios

### Scenario 1: New developer joins the team

```bash
# Grant them premium immediately
python grant_premium.py newdev@company.com

# They can now test all features
```

### Scenario 2: Testing subscription features

```bash
# Start with free
python grant_premium.py revoke test@example.com

# Test free tier limitations
# ... test ...

# Upgrade to premium
python grant_premium.py test@example.com

# Test premium features
# ... test ...
```

### Scenario 3: Automated testing

```python
# In your test suite
import requests

def setup_premium_user(email):
    response = requests.post(
        'http://localhost:8001/api/dev/grant-premium',
        json={'email': email}
    )
    assert response.status_code == 200
    return response.json()

# Test
setup_premium_user('test@example.com')
# ... run tests with premium features ...
```

## ✅ Verification

After granting premium, verify it worked:

1. **Check in database:**
   ```sql
   SELECT user_email, plan, ai_queries_limit
   FROM subscriptions
   WHERE user_email = 'your-email@example.com';
   ```

2. **Check via API:**
   ```bash
   # Login first to get token
   # Then:
   curl -X GET http://localhost:8001/api/subscriptions/me \
     -H "Authorization: Bearer YOUR_TOKEN"
   ```

3. **Check in browser:**
   - Login to your app
   - Go to Settings/Profile
   - Should show "Premium" plan

---

**Need help?** Check the backend logs in `backend/logs/app.log`
