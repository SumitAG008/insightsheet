# 🎯 How to Find Service Settings in Railway

## ❌ You're in the Wrong Place!

You're currently on **Project Settings** (general project info).

You need to go to **Service Settings** (settings for the "insightsheet" service).

---

## ✅ Correct Steps

### **Step 1: Go to Architecture/Deployments View**

1. **Click "Architecture"** tab (top menu) - or "Deployments"
2. You should see your service **"insightsheet"** as a box/card

---

### **Step 2: Click on Your Service**

1. **Click directly on the "insightsheet" service** (the box/card)
2. This opens the service details page

---

### **Step 3: Go to Service Settings**

1. You should see tabs like: **"Details"**, **"Build Logs"**, **"Deploy Logs"**, **"Settings"**
2. **Click "Settings"** tab
3. Now you're in **Service Settings** (not Project Settings)

---

### **Step 4: Find Deploy Section**

1. In Service Settings, scroll down
2. Look for **"Deploy"** section
3. You should see:
   - **Root Directory** (currently empty or set to root)
   - **Start Command** (currently empty or default)
   - **Build Command** (optional)

---

### **Step 5: Set Root Directory**

1. In **"Deploy"** section, find **"Root Directory"** field
2. Type: `backend` (exactly this, no slashes)
3. Click **"Save"** button

---

### **Step 6: Set Start Command**

1. Still in **"Deploy"** section
2. Find **"Start Command"** field
3. Type: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
4. Click **"Save"** button

---

## 🗺️ Navigation Path

```
Railway Dashboard
  └─> Click "Architecture" (top menu)
      └─> Click on "insightsheet" service (the box)
          └─> Click "Settings" tab
              └─> Scroll to "Deploy" section
                  └─> Set Root Directory: `backend`
                  └─> Set Start Command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
```

---

## 🔍 Visual Guide

**What you're seeing now:**
- Project Settings (General, Usage, Environments, etc.)
- Project name: "pure-unity"

**What you need:**
- Service Settings (for "insightsheet" service)
- Deploy section with Root Directory field

---

## 💡 Quick Alternative

If you can't find it:

1. **Go to Architecture tab**
2. **Click on the service name "insightsheet"** (not the project)
3. **Look for Settings tab** in the service view
4. **Scroll down to Deploy section**

---

## 🆘 Still Can't Find It?

**Try this:**
1. Go to Railway Dashboard
2. Click on your project "pure-unity"
3. Click "Architecture" tab
4. You should see a service card/box
5. **Click directly on that service card** (not the project name)
6. This should open service-specific settings

---

**The key: You need Service Settings, not Project Settings!** 🎯
