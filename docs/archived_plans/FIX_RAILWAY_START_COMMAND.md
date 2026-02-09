# 🔧 Fix Railway Start Command

## ❌ **Current Issue**

Your Railway start command is:
```
uvicorn app.main:app --host 0.0.0.0
```

**Problem:** Missing `--port $PORT` - Railway sets the PORT environment variable, but uvicorn needs to be told to use it.

---

## ✅ **Solution: Update Start Command**

### **Step 1: Go to Railway Settings**

1. Railway Dashboard → insightsheet service
2. Click **"Settings"** tab
3. Scroll to **"Deploy"** section

---

### **Step 2: Update Custom Start Command**

**Current (WRONG):**
```
uvicorn app.main:app --host 0.0.0.0
```

**Should be:**
```
uvicorn app.main:app --host 0.0.0.0 --port $PORT
```

**Why:** Railway sets the `PORT` environment variable dynamically. You need to pass it to uvicorn.

---

### **Step 3: Fix Pre-deploy Command (Optional)**

I also notice you have:
```
Pre-deploy Command: npm run migrate
```

**This is for Node.js, not Python!** 

**Options:**
1. **Remove it** (if you don't need migrations)
2. **Change to Python command** (if you need to run migrations):
   ```
   python -m alembic upgrade head
   ```
   (Only if you're using Alembic for migrations)

---

### **Step 4: Save and Redeploy**

1. Click **"Save"** button
2. Railway will automatically redeploy
3. Wait 2-3 minutes for deployment

---

## ✅ **Correct Configuration**

**Deploy Section:**
- **Pre-deploy Command:** (empty or `python -m alembic upgrade head` if using Alembic)
- **Custom Start Command:** `uvicorn app.main:app --host 0.0.0.0 --port $PORT`

---

## 🔍 **Why This Matters**

Railway assigns a port dynamically. If uvicorn doesn't know which port to use:
- It might default to 8000
- But Railway might assign a different port
- This can cause connection issues

By adding `--port $PORT`, uvicorn will use whatever port Railway assigns.

---

## ✅ **After Fixing**

1. Railway will auto-redeploy
2. Check logs - should see: `Uvicorn running on http://0.0.0.0:XXXX`
3. Test login - should work correctly

---

**Update the start command and Railway will redeploy automatically!** 🚀
