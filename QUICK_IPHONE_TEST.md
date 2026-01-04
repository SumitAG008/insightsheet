# ⚡ Quick iPhone Test Guide

## 🎯 Fastest Way: Deploy & Test as PWA

### **Step 1: Deploy (2 minutes)**

```bash
npm i -g vercel
vercel
```

### **Step 2: Test on iPhone (1 minute)**

1. Open Safari on iPhone
2. Go to your Vercel URL
3. Tap Share → "Add to Home Screen"
4. Done! 🎉

---

## 🏠 Alternative: Test Locally

### **Step 1: Start Servers**

```bash
# Terminal 1 - Backend
cd backend
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Terminal 2 - Frontend
npm run dev -- --host
```

### **Step 2: Find Your IP**

```bash
ipconfig
# Look for IPv4 Address (e.g., 192.168.1.100)
```

### **Step 3: Test on iPhone**

1. Make sure iPhone is on same Wi-Fi
2. Open Safari
3. Go to: `http://YOUR_IP:5173`
4. Add to Home Screen

---

## ✅ That's It!

Your app works on iPhone! 🎉

**See `TEST_ON_IPHONE_WINDOWS.md` for detailed options.**
