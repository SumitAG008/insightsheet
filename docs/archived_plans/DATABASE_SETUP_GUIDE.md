# Database Setup Guide - Neon PostgreSQL

## 🔧 Quick Fix for Login Issue

Your Neon PostgreSQL database connection string is:
```
postgresql://USER:PASSWORD@YOUR-NEON-HOST/neondb?sslmode=require&channel_binding=require
```

---

## 📝 Step 1: Update .env File

1. **Navigate to backend folder:**
   ```bash
   cd backend
   ```

2. **Create or edit `.env` file:**
   ```bash
   # If .env doesn't exist, create it
   # If it exists, edit it
   ```

3. **Add this line:**
   ```env
   DATABASE_URL=postgresql://USER:PASSWORD@YOUR-NEON-HOST/neondb?sslmode=require
   ```

   **Note:** Remove `&channel_binding=require` as it might cause issues with SQLAlchemy.

4. **Also add JWT secret:**
   ```env
   JWT_SECRET_KEY=your-super-secret-key-change-this-in-production
   JWT_ALGORITHM=HS256
   ACCESS_TOKEN_EXPIRE_MINUTES=30
   ```

---

## 🔍 Step 2: Test Database Connection

Run the test script:

```bash
cd backend
python test_database_connection.py
```

This will:
- ✅ Test connection to Neon database
- ✅ List all existing tables
- ✅ Check if `users` table exists
- ✅ Show existing users (if any)

---

## 🛠️ Step 3: Fix Database Setup

If tables don't exist or are missing:

```bash
cd backend
python fix_database_setup.py
```

This will:
- ✅ Create all required tables
- ✅ Create default admin user
- ✅ Set up subscriptions table
- ✅ Verify everything is working

---

## 👤 Step 4: Test Login

### Default Admin Credentials (if created):
- **Email:** `sumit@meldra.ai`
- **Password:** `admin123`

**⚠️ IMPORTANT:** Change this password after first login!

### Or Create New User:
1. Go to registration page
2. Create a new account
3. Login with new credentials

---

## 🐛 Troubleshooting

### Issue: "DATABASE_URL not found"
**Solution:**
- Ensure `.env` file exists in `backend/` folder
- Check file name is exactly `.env` (not `.env.txt`)
- Restart your backend server after updating `.env`

### Issue: "Connection refused" or "SSL error"
**Solution:**
- Verify connection string is correct
- Check if Neon database is active
- Try removing `&channel_binding=require` from connection string
- Use `sslmode=require` (not `require&channel_binding=require`)

### Issue: "Table 'users' does not exist"
**Solution:**
- Run `python fix_database_setup.py`
- This will create all required tables

### Issue: "No users in database"
**Solution:**
- Run `python fix_database_setup.py` to create admin user
- Or register a new user through the UI

### Issue: "Login fails but user exists"
**Solution:**
1. Check password is correct
2. Verify user is active: `is_active = true`
3. Check database connection is working
4. Check backend logs for errors

---

## 📋 Required Tables

Your database should have these tables:
- ✅ `users` - User accounts
- ✅ `subscriptions` - Subscription plans
- ✅ `login_history` - Login/logout tracking
- ✅ `user_activities` - User activity metadata
- ✅ `file_processing_history` - File processing logs

---

## 🔐 Security Notes

1. **Never commit `.env` file to git**
2. **Change default admin password**
3. **Use strong JWT_SECRET_KEY in production**
4. **Rotate database passwords regularly**

---

## ✅ Verification Checklist

- [ ] `.env` file created with DATABASE_URL
- [ ] Database connection test passes
- [ ] All tables exist
- [ ] Admin user created (or existing user verified)
- [ ] Login works with credentials
- [ ] Backend server starts without errors

---

## 🚀 Quick Start Commands

```bash
# 1. Navigate to backend
cd backend

# 2. Create .env file with your connection string
echo "DATABASE_URL=postgresql://USER:PASSWORD@YOUR-NEON-HOST/neondb?sslmode=require" > .env
echo "JWT_SECRET_KEY=your-secret-key-here" >> .env

# 3. Test connection
python test_database_connection.py

# 4. Fix setup (create tables if needed)
python fix_database_setup.py

# 5. Start backend server
python -m uvicorn app.main:app --reload
```

---

## 📞 Still Having Issues?

1. **Check backend logs** for error messages
2. **Verify Neon database** is active in Neon dashboard
3. **Test connection** using `psql` command:
   ```bash
   psql 'postgresql://USER:PASSWORD@YOUR-NEON-HOST/neondb?sslmode=require'
   ```
4. **Check table structure** matches expected schema

---

**After following these steps, login should work!** 🎉
