# 🔧 Fix Duplicate Environment Variables in Vercel

## ⚠️ Issue Found

You have **two `VITE_API_URL` entries**:
- `VITE_API_URL` = `http://localhost:8000`
- `VITE_API_URL` = `http://localhost:8001`

**You should only have ONE!**

---

## ✅ Solution: Remove Duplicate

### **Step 1: Remove One of Them**

1. **Find the duplicate `VITE_API_URL` entries**
2. **Click the horizontal line icon (─)** next to one of them
3. **Remove the one you don't need**

**Which one to keep?**
- Keep: `http://localhost:8001` (matches your `.env` file)
- Remove: `http://localhost:8000`

### **Step 2: Verify Final Variables**

You should have exactly **3 variables**:

| Key | Value |
|-----|-------|
| `VITE_API_URL` | `http://localhost:8001` |
| `VITE_APP_NAME` | `InsightSheet-lite` |
| `VITE_APP_DOMAIN` | `meldra.ai` |

---

## 🚀 After Fixing: Deploy!

1. **Remove the duplicate**
2. **Verify all 3 variables are correct**
3. **Click "Deploy" button** at the bottom
4. **Wait 2-5 minutes**
5. **Get your live URL!** 🎉

---

## 📝 Note About `VITE_API_URL`

**Right now:** `http://localhost:8001` (for local development)

**After backend is deployed:**
- You'll update this to: `https://your-backend.railway.app`
- In Vercel → Settings → Environment Variables
- Then redeploy

**For now, `http://localhost:8001` is fine for testing!**

---

**Remove the duplicate, then click "Deploy"!** 🚀
