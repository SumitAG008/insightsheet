# 🔧 Quick Fix: Add Database Columns for Password Reset

## ✅ **Your Database Connection**

You're using **Neon PostgreSQL**. Here's how to add the missing columns:

---

## 🚀 **Option 1: Run Python Script (Easiest)**

1. **Update connection string in script:**
   - Open: `backend/add_reset_columns_neon.py`
   - Connection string is already set (from your message)

2. **Run the script:**
   ```bash
   cd backend
   python add_reset_columns_neon.py
   ```

3. **Should see:**
   ```
   ✅ Added reset_token column
   ✅ Added reset_token_expires column
   🎉 Migration completed successfully!
   ```

---

## 🚀 **Option 2: Run SQL Directly (Fastest)**

### **Via Neon Dashboard:**

1. **Go to Neon Dashboard:**
   - [console.neon.tech](https://console.neon.tech)
   - Select your project
   - Click "SQL Editor"

2. **Run this SQL:**
   ```sql
   ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token VARCHAR(255);
   ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token_expires TIMESTAMP;
   ```

3. **Click "Run"**
4. **Should see:** Success message

---

### **Via psql Command Line:**

1. **Install psql** (if not installed)

2. **Run:**
   ```bash
   psql "postgresql://neondb_owner:npg_fDwMP0Rk2vAe@ep-small-dream-abw9afwj-pooler.eu-west-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require"
   ```

3. **In psql, run:**
   ```sql
   ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token VARCHAR(255);
   ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token_expires TIMESTAMP;
   ```

4. **Type:** `\q` to exit

---

## 🚀 **Option 3: Update Railway Environment Variable**

**If Railway is using a different database:**

1. **Railway Dashboard → Variables**
2. **Find `DATABASE_URL`**
3. **Update to your Neon connection string:**
   ```
   postgresql://neondb_owner:npg_fDwMP0Rk2vAe@ep-small-dream-abw9afwj-pooler.eu-west-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require
   ```
4. **Save** → Railway will restart
5. **Migration will run automatically** on startup

---

## ✅ **Verify Columns Were Added**

**Run this SQL to check:**
```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'users' 
AND column_name IN ('reset_token', 'reset_token_expires');
```

**Should return 2 rows:**
- `reset_token` | `character varying`
- `reset_token_expires` | `timestamp without time zone`

---

## 🎯 **After Adding Columns**

1. **Test password reset:**
   - Go to `/forgot-password`
   - Enter email
   - Get reset link
   - Use reset link
   - Enter password (10-72 characters)
   - **Should work!** ✅

---

## 📋 **Quick Checklist**

- [ ] Run SQL to add columns (Option 2 is fastest)
- [ ] Verify columns exist (run verification SQL)
- [ ] Test password reset
- [ ] Should work without 500 error!

---

**The fastest way: Use Neon SQL Editor and run the 2 ALTER TABLE commands!** 🚀
