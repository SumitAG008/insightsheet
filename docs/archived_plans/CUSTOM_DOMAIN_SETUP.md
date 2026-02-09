# 🌐 Custom Domain Setup - meldra.ai

## 🎯 Goal

Use your domain `meldra.ai` instead of `meldra-xyz123.vercel.app`

---

## 📋 Step-by-Step

### **Step 1: Deploy to Vercel First**

If you haven't deployed yet:

```bash
vercel
```

Follow prompts and get your default Vercel URL.

---

### **Step 2: Add Custom Domain in Vercel**

#### **Option A: Via Vercel Dashboard (Easiest)**

1. **Go to [vercel.com](https://vercel.com)**
2. **Click on your project** (meldra)
3. **Go to "Settings" tab**
4. **Click "Domains"** (left sidebar)
5. **Click "Add Domain"**
6. **Enter:** `meldra.ai`
7. **Click "Add"**

#### **Option B: Via CLI**

```bash
vercel domains add meldra.ai
```

---

### **Step 3: Configure DNS at GoDaddy**

Since you bought the domain from GoDaddy, you need to update DNS records:

#### **A. Go to GoDaddy**

1. **Log in to [godaddy.com](https://godaddy.com)**
2. **Go to "My Products"**
3. **Click "DNS"** next to `meldra.ai`

#### **B. Add DNS Records**

Vercel will show you what to add. Typically:

**For Root Domain (meldra.ai):**

Add an **A Record**:
- **Type:** A
- **Name:** @ (or leave blank)
- **Value:** `76.76.21.21` (Vercel's IP - they'll show you the exact one)
- **TTL:** 3600

**OR Add a CNAME Record:**
- **Type:** CNAME
- **Name:** @ (or leave blank)
- **Value:** `cname.vercel-dns.com`
- **TTL:** 3600

**For www subdomain (www.meldra.ai):**

Add a **CNAME Record**:
- **Type:** CNAME
- **Name:** www
- **Value:** `cname.vercel-dns.com`
- **TTL:** 3600

---

### **Step 4: Vercel Will Verify**

1. **Vercel checks DNS** (takes 1-24 hours)
2. **When verified**, domain is active
3. **SSL certificate** is automatically issued

---

### **Step 5: Update Environment Variables**

After domain is active:

```bash
# Update CORS in backend to include your domain
CORS_ORIGINS=https://meldra.ai,https://www.meldra.ai
```

---

## 🔧 Detailed DNS Configuration

### **If Using A Record (Root Domain):**

In GoDaddy DNS settings, add:

| Type | Name | Value | TTL |
|------|------|-------|-----|
| A | @ | `76.76.21.21` | 3600 |
| CNAME | www | `cname.vercel-dns.com` | 3600 |

### **If Using CNAME (Root Domain):**

Some registrars don't support CNAME for root. Use A record instead.

---

## ✅ Verification

### **Check DNS Propagation:**

```bash
# Check if DNS is configured
nslookup meldra.ai

# Should show Vercel's IP
```

### **Check in Vercel:**

1. Go to Vercel Dashboard
2. Settings → Domains
3. Status should show "Valid" (green checkmark)

---

## 🎯 Quick Setup (GoDaddy)

### **1. In GoDaddy:**

1. Log in
2. My Products → DNS (for meldra.ai)
3. Add these records:

**Record 1:**
- Type: **A**
- Name: **@**
- Value: **76.76.21.21** (Vercel will show exact IP)
- TTL: **3600**

**Record 2:**
- Type: **CNAME**
- Name: **www**
- Value: **cname.vercel-dns.com**
- TTL: **3600**

### **2. In Vercel:**

1. Dashboard → Your Project → Settings → Domains
2. Add Domain: `meldra.ai`
3. Add Domain: `www.meldra.ai`
4. Wait for verification (1-24 hours)

---

## 🔄 After Domain is Active

### **Update Backend CORS:**

In your backend environment variables (Railway/Render):

```
CORS_ORIGINS=https://meldra.ai,https://www.meldra.ai,https://meldra.vercel.app
```

### **Update Frontend Environment:**

```bash
# In Vercel, update VITE_API_URL if needed
vercel env add VITE_API_URL production
# Enter: https://api.meldra.ai (or your backend URL)
```

---

## 📋 Checklist

- [ ] Deployed to Vercel
- [ ] Added `meldra.ai` domain in Vercel
- [ ] Added `www.meldra.ai` domain in Vercel
- [ ] Updated DNS at GoDaddy:
  - [ ] A record for root domain
  - [ ] CNAME for www
- [ ] Waited for DNS propagation (1-24 hours)
- [ ] Domain verified in Vercel
- [ ] SSL certificate issued (automatic)
- [ ] Updated backend CORS
- [ ] Tested `https://meldra.ai`

---

## 🎉 Result

After setup:
- ✅ `https://meldra.ai` → Your app
- ✅ `https://www.meldra.ai` → Your app
- ✅ SSL certificate (automatic)
- ✅ Professional domain

---

## ⏱️ Timeline

- **DNS Update:** Immediate (in GoDaddy)
- **DNS Propagation:** 1-24 hours
- **Vercel Verification:** Automatic after DNS propagates
- **SSL Certificate:** Automatic (5-10 minutes after verification)

---

## 🆘 Troubleshooting

### **"Domain not verified"**
- Wait longer (DNS can take 24 hours)
- Check DNS records are correct
- Use `nslookup meldra.ai` to verify

### **"SSL certificate pending"**
- Wait 5-10 minutes after domain verification
- Vercel issues SSL automatically

### **"Domain already in use"**
- Remove from other services first
- Or use subdomain: `app.meldra.ai`

---

## 📚 Vercel Domain Docs

- [Vercel Domain Documentation](https://vercel.com/docs/concepts/projects/domains)

---

**Add your domain in Vercel dashboard, then update DNS at GoDaddy!** 🚀
