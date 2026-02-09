# 🌐 Complete Domain Setup for meldra.ai

## ✅ What You Need

- ✅ Domain: `meldra.ai` (you have this!)
- ✅ Vercel deployment (in progress)
- ✅ GoDaddy account (where you bought domain)

---

## 🚀 Complete Process

### **Phase 1: Deploy to Vercel**

```bash
# Deploy first (get default URL)
vercel

# Follow prompts
# You'll get: https://meldra-xyz123.vercel.app
```

---

### **Phase 2: Add Domain in Vercel**

#### **Via Dashboard:**

1. **Go to [vercel.com/dashboard](https://vercel.com/dashboard)**
2. **Click your project** (meldra)
3. **Settings tab** → **Domains** (left sidebar)
4. **Click "Add Domain"**
5. **Enter:** `meldra.ai`
6. **Click "Add"**
7. **Also add:** `www.meldra.ai`

Vercel will show you DNS records to add.

---

### **Phase 3: Update DNS at GoDaddy**

1. **Log in to GoDaddy**
2. **My Products** → **DNS** (for meldra.ai)
3. **Add these records:**

**Record 1 (Root Domain):**
- Type: **A**
- Name: **@**
- Value: **76.76.21.21** (use IP Vercel shows)
- TTL: **600**

**Record 2 (www):**
- Type: **CNAME**
- Name: **www**
- Value: **cname.vercel-dns.com** (use value Vercel shows)
- TTL: **600**

4. **Save**

---

### **Phase 4: Wait & Verify**

1. **Wait 1-24 hours** for DNS propagation
2. **Check Vercel dashboard** → Domains → Status
3. **When "Valid"** ✅ → Domain is active!
4. **SSL certificate** issues automatically

---

### **Phase 5: Update Backend CORS**

After domain is active, update backend environment:

```
CORS_ORIGINS=https://meldra.ai,https://www.meldra.ai,https://meldra.vercel.app
```

---

## 📋 Quick Checklist

- [ ] Deploy to Vercel (`vercel`)
- [ ] Add `meldra.ai` in Vercel dashboard
- [ ] Add `www.meldra.ai` in Vercel dashboard
- [ ] Get DNS records from Vercel
- [ ] Add A record in GoDaddy
- [ ] Add CNAME record in GoDaddy
- [ ] Wait for DNS propagation
- [ ] Domain verified ✅
- [ ] Update backend CORS
- [ ] Test `https://meldra.ai`

---

## 🎯 Exact Steps Right Now

### **1. Complete Vercel Deployment:**

```bash
vercel
```

### **2. Add Domain in Vercel Dashboard:**

- Go to vercel.com
- Your project → Settings → Domains
- Add: `meldra.ai`
- Add: `www.meldra.ai`
- Copy DNS records shown

### **3. Update GoDaddy DNS:**

- Log in to GoDaddy
- My Products → DNS
- Add records (from Step 2)
- Save

### **4. Wait:**

- 1-24 hours for DNS
- Vercel will verify automatically
- SSL issues automatically

---

## ✅ Result

After setup:
- ✅ `https://meldra.ai` → Your app
- ✅ `https://www.meldra.ai` → Your app
- ✅ Professional domain
- ✅ SSL certificate (HTTPS)

---

## 📚 Documentation

- **Domain Setup:** `CUSTOM_DOMAIN_SETUP.md`
- **GoDaddy DNS:** `GODADDY_DNS_SETUP.md`
- **Vercel Deployment:** `VERCEL_DEPLOY_SIMPLE.md`

---

**First: Complete Vercel deployment, then add domain!** 🚀
