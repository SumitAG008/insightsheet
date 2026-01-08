# 🔐 How to Use Your Existing App Password

## ✅ **Good News!**

You already have an App Password created: **"insight-lite"** (created at 10:06 PM)

---

## ⚠️ **Important: You Can't See the Password Again**

**Google doesn't show existing App Passwords** - you can only see them when you first create them.

**You have 2 options:**

---

## 🎯 **Option 1: Create a New App Password (Recommended)**

Since you can't see the old password, create a new one:

### **Step 1: Create New App Password**

1. **On the App Passwords page** (where you are now)
2. **Look for a button** that says:
   - "Select app" dropdown
   - "Select device" dropdown  
   - "Generate" button

3. **If you don't see these buttons:**
   - Look for **"Create app password"** or **"Generate"** button
   - Or scroll down to find the form

4. **Fill in:**
   - **App:** Select "Mail" (or "Other")
   - **Device:** Select "Other (Custom name)"
   - **Name:** Type "Railway" (or "insightsheet")
   - **Click "Generate"**

5. **Copy the 16-character password immediately!**
   - It will look like: `abcd efgh ijkl mnop`
   - **Remove spaces:** `abcdefghijklmnop`
   - **Save it somewhere safe!** (You can't see it again)

---

### **Step 2: Use in Railway**

1. **Railway Dashboard → insightsheet service → Variables tab**

2. **Find or add `SMTP_PASSWORD`**

3. **Paste the 16-character password** (no spaces):
   ```
   SMTP_PASSWORD=abcdefghijklmnop
   ```

4. **Also make sure these are set:**
   ```
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=your-email@gmail.com
   SMTP_FROM_EMAIL=your-email@gmail.com
   ```

5. **Click "Save"** → Railway will auto-restart

---

## 🎯 **Option 2: Use the Existing Password (If You Saved It)**

**If you saved the "insight-lite" password somewhere:**

1. **Find where you saved it** (notes, password manager, etc.)
2. **Copy the 16-character password** (no spaces)
3. **Use it in Railway** as `SMTP_PASSWORD`

---

## 🔍 **How to Find the "Generate" Button**

**If you don't see the form to create a new password:**

1. **Look for:**
   - A button that says **"Generate"** or **"Create app password"**
   - Or a form with dropdowns at the top of the page
   - Or scroll down on the page

2. **Sometimes it's at the top**, sometimes at the bottom

3. **If you still can't find it:**
   - Try refreshing the page
   - Or go to: [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords)

---

## 📋 **Complete Setup Checklist**

After creating a new App Password:

- [ ] Created new App Password (16 characters)
- [ ] Copied password (removed spaces)
- [ ] Railway → Variables → `SMTP_PASSWORD` = App Password
- [ ] Railway → Variables → `SMTP_HOST` = `smtp.gmail.com`
- [ ] Railway → Variables → `SMTP_PORT` = `587`
- [ ] Railway → Variables → `SMTP_USER` = your Gmail address
- [ ] Railway → Variables → `SMTP_FROM_EMAIL` = your Gmail address
- [ ] Saved variables → Railway restarted
- [ ] Tested password reset → Check email

---

## 🎯 **Quick Steps**

1. **Create new App Password** (since you can't see the old one)
2. **Copy 16-character password** (remove spaces)
3. **Railway → Variables → `SMTP_PASSWORD`** → Paste password
4. **Save** → Railway restarts
5. **Test** → Request password reset → Check email

---

## ⚠️ **Important Notes**

- **You can have multiple App Passwords** - it's fine to create a new one
- **Each App Password is 16 characters** (remove spaces when using)
- **You can delete old ones** (click trash icon) if you want
- **App Passwords are different from your regular Gmail password**

---

**Create a new App Password, copy it, and use it in Railway!** 🚀
