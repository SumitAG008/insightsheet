# 🌐 meldra.ai Domain Setup - Complete Guide

## ✅ You Have meldra.ai Domain!

Here's how to use it with your Vercel deployment:

---

## 🚀 Step-by-Step

### **Step 1: Deploy to Vercel (Get Default URL)**

```bash
# Deploy first
vercel

# Follow prompts
# You'll get: https://meldra-xyz123.vercel.app
```

**Keep this URL** - you'll need it for now.

---

### **Step 2: Add Domain in Vercel Dashboard**

1. **Go to [vercel.com/dashboard](https://vercel.com/dashboard)**
2. **Click your project** (meldra)
3. **Click "Settings" tab**
4. **Click "Domains"** (left sidebar)
5. **Click "Add Domain"** button
6. **Enter:** `meldra.ai`
7. **Click "Add"**
8. **Also add:** `www.meldra.ai`

**Vercel will show you DNS records to add!**

---

### **Step 3: Update DNS at GoDaddy**

Since you bought the domain from GoDaddy:

#### **A. Log in to GoDaddy**

1. Go to [godaddy.com](https://godaddy.com)
2. Log in
3. Click **"My Products"** (top right)
4. Find **`meldra.ai`**
5. Click **"DNS"** button

#### **B. Add DNS Records**

Vercel will show you exact values, but typically:

**Record 1 - Root Domain (meldra.ai):**
- **Type:** A
- **Name:** `@` (or leave blank)
- **Value:** `76.76.21.21` (Vercel will show exact IP)
- **TTL:** 600

**Record 2 - www (www.meldra.ai):**
- **Type:** CNAME
- **Name:** `www`
- **Value:** `cname.vercel-dns.com` (Vercel will show exact value)
- **TTL:** 600

#### **C. Save**

Click "Save" for each record.

---

### **Step 4: Wait for DNS Propagation**

- **Time:** 1-24 hours (usually 1-2 hours)
- **Check:** Vercel dashboard → Domains → Status

**When status shows "Valid" ✅ → Domain is active!**

---

### **Step 5: SSL Certificate**

- **Automatic** - Vercel issues SSL certificate
- **Time:** 5-10 minutes after domain verification
- **Result:** `https://meldra.ai` works with HTTPS

---

## ✅ After Domain is Active

### **Update Backend CORS**

When you deploy backend, set this environment variable:

```
CORS_ORIGINS=https://meldra.ai,https://www.meldra.ai,https://meldra.vercel.app
```

**Note:** I've already updated `main.py` to include your domain by default!

---

## 📋 Quick Checklist

- [ ] Deploy to Vercel (`vercel` command)
- [ ] Get default Vercel URL
- [ ] Add `meldra.ai` in Vercel dashboard
- [ ] Add `www.meldra.ai` in Vercel dashboard
- [ ] Copy DNS records from Vercel
- [ ] Log in to GoDaddy
- [ ] Go to DNS settings
- [ ] Add A record for root domain
- [ ] Add CNAME record for www
- [ ] Save DNS records
- [ ] Wait 1-24 hours
- [ ] Check Vercel dashboard for "Valid" status
- [ ] Test `https://meldra.ai`

---

## 🎯 Exact Steps Right Now

### **1. Complete Vercel Deployment:**

```bash
vercel
```

### **2. Add Domain:**

- Go to Vercel dashboard
- Settings → Domains
- Add: `meldra.ai`
- Add: `www.meldra.ai`
- **Copy the DNS records shown**

### **3. Update GoDaddy:**

- Log in to GoDaddy
- My Products → DNS (for meldra.ai)
- Add the records Vercel showed you
- Save

### **4. Wait:**

- 1-24 hours for DNS
- Check Vercel dashboard for status

---

## 🎉 Result

After setup:
- ✅ `https://meldra.ai` → Your app
- ✅ `https://www.meldra.ai` → Your app
- ✅ Professional domain
- ✅ SSL certificate (HTTPS)
- ✅ Works on iPhone

---

## 📱 Test on iPhone

After domain is active:

1. **Open Safari**
2. **Go to:** `https://meldra.ai`
3. **Tap Share → "Add to Home Screen"**
4. **Done!** 🎉

---

## 🔧 Troubleshooting

### **"Domain not verified"**
- Wait longer (DNS can take 24 hours)
- Double-check DNS records match Vercel's instructions
- Use `nslookup meldra.ai` to check DNS

### **"SSL certificate pending"**
- Wait 5-10 minutes after domain verification
- Vercel issues SSL automatically

---

## 📚 Documentation

- **Complete Setup:** `DOMAIN_SETUP_COMPLETE.md`
- **GoDaddy DNS:** `GODADDY_DNS_SETUP.md`
- **Vercel Domain:** `CUSTOM_DOMAIN_SETUP.md`

---

**First: Complete `vercel` deployment, then add domain in dashboard!** 🚀
