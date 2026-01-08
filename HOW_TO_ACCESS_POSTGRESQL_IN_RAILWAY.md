# 📍 How to Access PostgreSQL in Railway

## 🎯 **Quick Answer**

PostgreSQL is a **separate service** in your Railway project, not inside the "insightsheet" service.

---

## 📋 **Step-by-Step Guide**

### **Step 1: Go to Railway Dashboard**

1. Visit: [railway.app](https://railway.app)
2. Log in to your account
3. Click on your **project** (likely "pure-unity" based on your screenshots)

---

### **Step 2: Find PostgreSQL Service**

In your Railway project, you should see **multiple services**:

1. **"insightsheet"** - Your backend service (Python/FastAPI)
2. **"PostgreSQL"** or **"Database"** or similar name - Your database service

**Look for:**
- A service with a **database icon** (usually looks like a cylinder or database symbol)
- Or a service named "PostgreSQL", "Postgres", "Database", or "Neon" (if using Neon)

**Note:** Based on your `DATABASE_URL`, you're using **Neon PostgreSQL** (`neondb_owner@ep-smal1-dream-abw9afwj-pooler.eu-west-2.aws.neon.tech`), so it might be named "Neon" or "PostgreSQL".

---

### **Step 3: Open PostgreSQL Service**

1. **Click on the PostgreSQL/Neon service** (not the "insightsheet" service)
2. You'll see tabs: **"Deployments"**, **"Variables"**, **"Metrics"**, **"Settings"**
3. **Look for a "Data" or "Query" tab** - This is where you run SQL

---

### **Step 4: Access Query Tab**

**Option A: If Railway has built-in Query tab:**
1. Click on the **"Data"** or **"Query"** tab
2. You'll see a SQL editor
3. Paste your SQL queries here
4. Click **"Run"** or **"Execute"**

**Option B: If Railway doesn't have Query tab:**
You'll need to use an external tool:

1. **Get Connection String:**
   - Railway → PostgreSQL service → **"Variables"** tab
   - Find `DATABASE_URL` or `POSTGRES_URL`
   - Copy the full connection string

2. **Use External Tool:**
   - **pgAdmin** (desktop app)
   - **DBeaver** (desktop app)
   - **TablePlus** (desktop app)
   - **Neon Console** (if using Neon - [console.neon.tech](https://console.neon.tech))

---

## 🔍 **Alternative: Use Neon Console (If Using Neon)**

Since your `DATABASE_URL` shows you're using **Neon PostgreSQL**, you can also:

1. **Go to Neon Console:**
   - Visit: [console.neon.tech](https://console.neon.tech)
   - Log in with your Neon account

2. **Select Your Project:**
   - Find your project (likely "neondb" based on your connection string)

3. **Open SQL Editor:**
   - Click on **"SQL Editor"** or **"Query"** tab
   - Paste your SQL queries
   - Click **"Run"**

---

## 📝 **SQL Queries to Run**

Once you find the Query tab, run these:

```sql
-- 1. Create login_history table if it doesn't exist
CREATE TABLE IF NOT EXISTS login_history (
    id SERIAL PRIMARY KEY,
    user_email VARCHAR(255) NOT NULL,
    event_type VARCHAR(50),
    ip_address VARCHAR(100),
    location VARCHAR(255),
    browser VARCHAR(255),
    device VARCHAR(255),
    session_duration INTEGER,
    created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_login_history_user_email ON login_history(user_email);
CREATE INDEX IF NOT EXISTS idx_login_history_created_date ON login_history(created_date);

-- 3. Add missing columns to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS verification_token VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token_expires TIMESTAMP;

-- 4. Set existing users as verified (so they can login)
UPDATE users SET is_verified = TRUE WHERE is_verified IS NULL;
```

---

## 🎯 **Visual Guide**

**Railway Project Structure:**
```
Your Project (pure-unity)
├── insightsheet (Backend Service)
│   ├── Deployments
│   ├── Variables ← FRONTEND_URL goes here
│   ├── Metrics
│   └── Settings
│
└── PostgreSQL / Neon (Database Service) ← PostgreSQL is here
    ├── Deployments
    ├── Variables
    ├── Data / Query ← SQL queries go here
    ├── Metrics
    └── Settings
```

---

## 🆘 **Can't Find PostgreSQL?**

If you don't see a PostgreSQL service:

1. **Check if it's in a different project:**
   - Railway Dashboard → Switch projects
   - Look for other projects

2. **Check if it's a shared resource:**
   - Some Railway setups have shared databases
   - Look for "Shared Resources" or "Infrastructure" section

3. **Use Neon Console directly:**
   - Since you're using Neon, go to [console.neon.tech](https://console.neon.tech)
   - Log in and access your database there

4. **Check Railway Variables:**
   - Railway → insightsheet service → Variables
   - Look at `DATABASE_URL`
   - The connection string shows the database provider

---

## ✅ **Quick Checklist**

- [ ] Found PostgreSQL/Neon service in Railway project
- [ ] Opened "Data" or "Query" tab
- [ ] Ran SQL queries to create `login_history` table
- [ ] Ran SQL queries to add `is_verified` column
- [ ] Verified queries succeeded

---

**Once you find PostgreSQL and run the SQL queries, the 500 error should be fixed!** 🚀
