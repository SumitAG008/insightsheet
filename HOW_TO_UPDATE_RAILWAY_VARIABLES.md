# 🔧 How to Update Railway Variables (Not Create New Ones)

## ❓ **Your Question**

> "I cannot create new same variable. How can I use the same variable and keep more than one value against the same variable?"

---

## ✅ **Answer: You UPDATE Existing Variables, Not Create New Ones!**

**You don't need multiple variables or multiple values. You just UPDATE the existing ones!**

---

## 🎯 **How Railway Variables Work**

### **You Already Have These Variables:**

```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=sumitagaria@gmail.com
SMTP_PASSWORD=tlrkwouukidjgtgi
SMTP_FROM_EMAIL=sumitagaria@gmail.com
```

**To switch to Microsoft 365, you just UPDATE them!**

---

## 🔧 **Step-by-Step: Update Existing Variables**

### **Step 1: Go to Railway Variables**

1. **Railway Dashboard → insightsheet service → Variables tab**
2. **You'll see your existing variables listed**

---

### **Step 2: Click on Each Variable to Edit**

**You don't create new ones - you EDIT the existing ones!**

#### **Update SMTP_HOST:**

1. **Find `SMTP_HOST` in the list**
2. **Click on it** (or click the "..." menu → Edit)
3. **Change the value from:**
   ```
   smtp.gmail.com
   ```
4. **Change to:**
   ```
   smtp-mail.outlook.com
   ```
5. **Click "Save"**

---

#### **Update SMTP_USER:**

1. **Find `SMTP_USER` in the list**
2. **Click on it** → Edit
3. **Change from:**
   ```
   sumitagaria@gmail.com
   ```
4. **Change to:**
   ```
   noreply@meldra.ai
   ```
5. **Click "Save"**

---

#### **Update SMTP_PASSWORD:**

1. **Find `SMTP_PASSWORD` in the list**
2. **Click on it** → Edit
3. **Change from:**
   ```
   tlrkwouukidjgtgi
   ```
4. **Change to:**
   ```
   [Password for noreply@meldra.ai]
   ```
5. **Click "Save"**

---

#### **Update SMTP_FROM_EMAIL:**

1. **Find `SMTP_FROM_EMAIL` in the list**
2. **Click on it** → Edit
3. **Change from:**
   ```
   sumitagaria@gmail.com
   ```
4. **Change to:**
   ```
   noreply@meldra.ai
   ```
5. **Click "Save"**

---

#### **SMTP_PORT (Usually Stays Same):**

- **Check if `SMTP_PORT` = `587`**
- **If yes, leave it** (no change needed)
- **If no, update to `587`**

---

## 📋 **Visual Guide**

**Before (Gmail):**
```
SMTP_HOST = smtp.gmail.com
SMTP_USER = sumitagaria@gmail.com
SMTP_PASSWORD = tlrkwouukidjgtgi
SMTP_FROM_EMAIL = sumitagaria@gmail.com
```

**After (Microsoft 365):**
```
SMTP_HOST = smtp-mail.outlook.com  ← Updated
SMTP_USER = noreply@meldra.ai       ← Updated
SMTP_PASSWORD = [new password]      ← Updated
SMTP_FROM_EMAIL = noreply@meldra.ai ← Updated
```

**Same variables, just different values!**

---

## ⚠️ **Important: You Can't Store Multiple Values**

**Environment variables can only have ONE value at a time.**

**You CAN'T do this:**
```
SMTP_USER = sumitagaria@gmail.com, noreply@meldra.ai  ❌ Won't work
```

**You CAN do this:**
```
SMTP_USER = noreply@meldra.ai  ✅ One value at a time
```

**To switch between accounts:**
- Just UPDATE the variable value
- Save → Railway restarts → Done!

---

## 🔄 **How to Switch Back (If Needed)**

**If you want to switch back to Gmail later:**

1. **Railway → Variables**
2. **Click `SMTP_HOST`** → Change to `smtp.gmail.com`
3. **Click `SMTP_USER`** → Change to `sumitagaria@gmail.com`
4. **Click `SMTP_PASSWORD`** → Change to Gmail App Password
5. **Click `SMTP_FROM_EMAIL`** → Change to `sumitagaria@gmail.com`
6. **Save** → Railway restarts

**Same variables, just different values!**

---

## 🎯 **Quick Summary**

| What | How |
|------|-----|
| **Update variable** | Click on it → Change value → Save |
| **Switch email provider** | Update all 5 SMTP variables → Save |
| **Store multiple values** | ❌ Not possible - one value per variable |
| **Switch between accounts** | ✅ Just update the values |

---

## ✅ **What You Need to Do**

1. **Railway → Variables tab**
2. **Click on `SMTP_HOST`** → Change to `smtp-mail.outlook.com`
3. **Click on `SMTP_USER`** → Change to `noreply@meldra.ai`
4. **Click on `SMTP_PASSWORD`** → Change to password for noreply account
5. **Click on `SMTP_FROM_EMAIL`** → Change to `noreply@meldra.ai`
6. **Check `SMTP_PORT`** → Should be `587` (update if needed)
7. **Save** → Railway auto-restarts
8. **Test** → Request password reset → Check email

---

## 📋 **Complete Checklist**

- [ ] Railway → Variables → Click `SMTP_HOST` → Update to `smtp-mail.outlook.com`
- [ ] Railway → Variables → Click `SMTP_USER` → Update to `noreply@meldra.ai`
- [ ] Railway → Variables → Click `SMTP_PASSWORD` → Update to noreply password
- [ ] Railway → Variables → Click `SMTP_FROM_EMAIL` → Update to `noreply@meldra.ai`
- [ ] Railway → Variables → Check `SMTP_PORT` = `587`
- [ ] All changes saved → Railway restarted
- [ ] Tested password reset → Check email

---

**You UPDATE existing variables, not create new ones! Just click on each variable and change its value.** 🚀
