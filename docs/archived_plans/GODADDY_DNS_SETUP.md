# 🔧 GoDaddy DNS Setup for meldra.ai

## 🎯 Goal

Point `meldra.ai` to your Vercel deployment.

---

## 📋 Step-by-Step

### **Step 1: Get DNS Records from Vercel**

1. **In Vercel Dashboard:**
   - Go to your project
   - Settings → Domains
   - Click "Add Domain"
   - Enter: `meldra.ai`
   - Vercel will show you DNS records to add

**You'll see something like:**
```
Type: A
Name: @
Value: 76.76.21.21
```

---

### **Step 2: Log in to GoDaddy**

1. **Go to [godaddy.com](https://godaddy.com)**
2. **Log in**
3. **Click "My Products"** (top right)
4. **Find `meldra.ai`**
5. **Click "DNS"** button

---

### **Step 3: Add DNS Records**

In GoDaddy DNS Management:

#### **For Root Domain (meldra.ai):**

**Add A Record:**
1. **Click "Add"** button
2. **Type:** Select "A"
3. **Name:** `@` (or leave blank)
4. **Value:** `76.76.21.21` (use the IP Vercel shows you)
5. **TTL:** `600` (or default)
6. **Click "Save"**

#### **For www Subdomain (www.meldra.ai):**

**Add CNAME Record:**
1. **Click "Add"** button
2. **Type:** Select "CNAME"
3. **Name:** `www`
4. **Value:** `cname.vercel-dns.com` (Vercel will show exact value)
5. **TTL:** `600` (or default)
6. **Click "Save"**

---

### **Step 4: Remove Old Records (If Any)**

If you see old A or CNAME records pointing elsewhere:
- **Delete them** (they might conflict)

---

### **Step 5: Wait for DNS Propagation**

- **Time:** 1-24 hours (usually 1-2 hours)
- **Check status:** Vercel dashboard → Domains

---

## 📋 DNS Records Summary

| Type | Name | Value | Purpose |
|------|------|-------|---------|
| A | @ | `76.76.21.21` | Points root domain to Vercel |
| CNAME | www | `cname.vercel-dns.com` | Points www to Vercel |

**Note:** Vercel will show you the exact values to use!

---

## ✅ Verification

### **Check DNS:**

```bash
# In terminal
nslookup meldra.ai

# Should show Vercel's IP address
```

### **Check in Vercel:**

1. Dashboard → Project → Settings → Domains
2. Status should show "Valid" ✅

---

## 🎯 Quick Reference

**GoDaddy Steps:**
1. My Products → DNS
2. Add A record: `@` → Vercel IP
3. Add CNAME: `www` → `cname.vercel-dns.com`
4. Save
5. Wait 1-24 hours

**Vercel Steps:**
1. Settings → Domains
2. Add: `meldra.ai`
3. Add: `www.meldra.ai`
4. Wait for verification

---

## 🎉 Result

After DNS propagates:
- ✅ `https://meldra.ai` → Your app
- ✅ `https://www.meldra.ai` → Your app
- ✅ SSL certificate (automatic)

---

**Add domain in Vercel first, then update DNS at GoDaddy!** 🚀
