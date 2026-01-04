# 🌐 Setup insight.meldra.ai Subdomain

## 🎯 Goal

Configure your Vercel deployment to use: `https://insight.meldra.ai`

---

## 🚀 Step-by-Step

### **Step 1: Add Subdomain in Vercel**

1. **Go to Vercel Dashboard:**
   - [vercel.com/dashboard](https://vercel.com/dashboard)
   - Click your project: `meldra` (or `insightsheet`)

2. **Go to Settings:**
   - Click **"Settings"** tab
   - Click **"Domains"** in the left sidebar

3. **Add Subdomain:**
   - Click **"Add Domain"** button
   - Enter: `insight.meldra.ai`
   - Click **"Add"**

4. **Vercel will show DNS configuration:**
   - You'll see a **CNAME record** to add
   - Usually: `insight` → `cname.vercel-dns.com`
   - **Copy this information!**

---

### **Step 2: Configure DNS at GoDaddy**

1. **Log in to GoDaddy:**
   - Go to [godaddy.com](https://godaddy.com)
   - Sign in to your account

2. **Go to DNS Management:**
   - Click **"My Products"** (top right)
   - Find **`meldra.ai`** domain
   - Click **"DNS"** button (or "Manage DNS")

3. **Add CNAME Record:**
   - Click **"Add"** or **"Add Record"** button
   - Select **"CNAME"** from the Type dropdown
   - Fill in:
     - **Name/Host:** `insight`
     - **Value/Points to:** `cname.vercel-dns.com` (or what Vercel shows)
     - **TTL:** `600` (or default)
   - Click **"Save"**

4. **Verify:**
   - You should see the CNAME record in your DNS list
   - It should show: `insight` → `cname.vercel-dns.com`

---

### **Step 3: Wait for DNS Propagation**

- **Time:** 5 minutes to 48 hours (usually 1-2 hours)
- **Check status:** Vercel dashboard → Domains → `insight.meldra.ai`
- **Status will show:**
  - ⏳ "Pending" (waiting for DNS)
  - ✅ "Valid Configuration" (ready!)

---

### **Step 4: Verify It Works**

1. **Check in Vercel:**
   - Settings → Domains
   - `insight.meldra.ai` should show "Valid Configuration" ✅

2. **Test DNS:**
   - Use [dnschecker.org](https://dnschecker.org)
   - Enter: `insight.meldra.ai`
   - Check CNAME record points to Vercel

3. **Visit your site:**
   - Go to: `https://insight.meldra.ai`
   - Should show your deployed app! 🎉

---

## 📋 What Vercel Will Show You

When you add the domain, Vercel will display something like:

```
Add this DNS record:

Type: CNAME
Name: insight
Value: cname.vercel-dns.com
```

**Copy this exactly** and add it to GoDaddy DNS.

---

## 🔧 Multiple Subdomains

You can have **multiple subdomains** pointing to the same app:

- `insight.meldra.ai` → Your app
- `insightsheet.meldra.ai` → Your app (if you add it)
- `www.meldra.ai` → Your app (if you add it)
- `meldra.ai` → Your app (root domain)

**All can point to the same Vercel deployment!**

---

## ✅ Quick Checklist

- [ ] Add `insight.meldra.ai` in Vercel → Settings → Domains
- [ ] Copy CNAME record from Vercel
- [ ] Go to GoDaddy → DNS Management
- [ ] Add CNAME record: `insight` → `cname.vercel-dns.com`
- [ ] Wait for DNS propagation (1-48 hours)
- [ ] Test: `https://insight.meldra.ai`
- [ ] Verify in Vercel dashboard (should show "Valid")

---

## 🆘 Troubleshooting

### **Domain Not Working?**
- **Wait longer:** DNS can take up to 48 hours
- **Check DNS:** Verify CNAME record is correct in GoDaddy
- **Check Vercel:** Settings → Domains → See status/errors

### **Wrong DNS Record?**
- **Delete old record** in GoDaddy
- **Add new record** with Vercel's exact values
- **Wait for propagation**

### **Still Not Working?**
- **Check Vercel logs:** Settings → Domains → View errors
- **Verify domain ownership:** Make sure you own `meldra.ai`
- **Contact support:** Vercel or GoDaddy support

---

## 📝 Summary

1. **Vercel:** Add domain `insight.meldra.ai`
2. **GoDaddy:** Add CNAME record `insight` → Vercel's value
3. **Wait:** DNS propagation (1-48 hours)
4. **Test:** Visit `https://insight.meldra.ai`

**Your site will be live at `https://insight.meldra.ai`!** 🎉

---

## 🎯 Quick Steps

1. **Vercel Dashboard** → Your Project → **Settings** → **Domains**
2. **Click "Add Domain"**
3. **Enter:** `insight.meldra.ai`
4. **Copy CNAME record** shown by Vercel
5. **GoDaddy** → DNS Management → **Add CNAME**
6. **Wait 1-2 hours**
7. **Visit:** `https://insight.meldra.ai` ✅

---

**Follow these steps and your subdomain will be working!** 🚀
