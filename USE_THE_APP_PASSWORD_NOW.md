# 🔐 Use Your App Password - The Password is in the Modal!

## ✅ **Perfect! You Have the Password!**

I can see in your screenshot - **the App Password is displayed in the modal!**

---

## 🔍 **Where the Password Is**

**In the modal dialog, you can see:**

```
tlrk woou kidj gtgi
```

**This is your 16-character App Password!**

---

## 📋 **Step 1: Copy the Password**

**From the modal, copy this password:**
```
tlrk woou kidj gtgi
```

**Remove the spaces:**
```
tlrkwouukidjgtgi
```

**This is what you'll use in Railway!**

---

## 📋 **Step 2: Use in Railway**

1. **Railway Dashboard → insightsheet service → Variables tab**

2. **Find `SMTP_PASSWORD` variable**

3. **Paste the password (no spaces):**
   ```
   SMTP_PASSWORD=tlrkwouukidjgtgi
   ```

4. **Make sure these are also set:**
   ```
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=your-email@gmail.com
   SMTP_FROM_EMAIL=your-email@gmail.com
   ```

5. **Click "Save"** → Railway will auto-restart

6. **Click "Done"** in the Google modal (you've copied the password)

---

## ✅ **Step 3: Test**

1. **Go to:** `https://insight.meldra.ai/forgot-password`
2. **Enter your email**
3. **Click "Send Reset Link"**
4. **Check your Gmail inbox** (and spam folder)

---

## 📝 **Important Notes**

- **"insight-lite"** = Just the name/label (like a bookmark)
- **"tlrk woou kidj gtgi"** = The actual password (remove spaces!)
- **You can't see this password again** after clicking "Done"
- **Save it somewhere safe** if you might need it later

---

## 🎯 **Quick Summary**

1. ✅ Password is: `tlrkwouukidjgtgi` (remove spaces)
2. ✅ Railway → Variables → `SMTP_PASSWORD` → Paste it
3. ✅ Save → Railway restarts
4. ✅ Test password reset → Check email

---

**Copy the password from the modal and use it in Railway!** 🚀
