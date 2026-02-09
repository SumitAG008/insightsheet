# 🌐 Add insight.meldra.ai - Step by Step

## 🎯 You're on the Right Page!

You're on the **Vercel Domains** settings page. Here's exactly what to do:

---

## 📋 Step-by-Step (What You See)

### **Step 1: Click "Add Domain" Button**

**On the page you're looking at:**

1. **Look at the top right** of the main content area
2. **You'll see two buttons:**
   - "Buy Domain" (gray button)
   - **"Add Domain"** (white button) ← **Click this one!**

3. **Click "Add Domain"**

---

### **Step 2: Enter Your Domain**

**A popup or form will appear:**

1. **In the input field, type:** `insight.meldra.ai`
2. **Click "Add"** or "Continue"

---

### **Step 3: Vercel Shows DNS Configuration**

**After clicking "Add", Vercel will show you:**

```
Add this DNS record:

Type: CNAME
Name: insight
Value: cname.vercel-dns.com
```

**Copy this information!** You'll need it for GoDaddy.

---

### **Step 4: Configure DNS at GoDaddy**

1. **Open new tab:** Go to [godaddy.com](https://godaddy.com)
2. **Sign in** to your account
3. **Click "My Products"** (top right)
4. **Find `meldra.ai`** domain
5. **Click "DNS"** button
6. **Click "Add"** or "Add Record"
7. **Fill in:**
   - **Type:** Select "CNAME"
   - **Name/Host:** `insight`
   - **Value/Points to:** `cname.vercel-dns.com` (or what Vercel shows)
   - **TTL:** `600` (or default)
8. **Click "Save"**

---

### **Step 5: Wait and Verify**

1. **Go back to Vercel** (this page)
2. **Refresh the page**
3. **You should see:**
   - `insight.meldra.ai` in the domain list
   - Status: ⏳ "Pending" (waiting for DNS)
   - Or ✅ "Valid Configuration" (when ready)

4. **Wait 1-2 hours** for DNS propagation
5. **Test:** Visit `https://insight.meldra.ai`

---

## 🎯 Quick Visual Guide

**On the page you're seeing:**

```
[Top Right Corner]
┌─────────────────┐
│ Buy Domain │ Add Domain │  ← Click "Add Domain"!
└─────────────────┘
```

**After clicking:**

```
[Popup/Form]
┌─────────────────────────┐
│ Add Domain               │
│                          │
│ Domain:                  │
│ [insight.meldra.ai    ]  │  ← Type this
│                          │
│         [ Add ]          │  ← Click this
└─────────────────────────┘
```

---

## ✅ What You'll See After Adding

**Back on the Domains page, you'll see:**

- ✅ `insightsheet-jpci.vercel.app` (your current domain)
- ✅ `insight.meldra.ai` (your new domain - will appear)

**Each domain will show:**
- Status (Valid/Pending)
- Environment (Production)
- Options to edit/remove

---

## 📝 Summary

**Right now, on the page you're looking at:**

1. **Click "Add Domain"** (top right, white button)
2. **Type:** `insight.meldra.ai`
3. **Click "Add"**
4. **Copy DNS info** from Vercel
5. **Add CNAME in GoDaddy**
6. **Wait 1-2 hours**
7. **Done!** ✅

---

**Click "Add Domain" button now!** 🚀
