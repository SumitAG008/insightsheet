# 🌐 Setup insightsheet.meldra.ai Subdomain

## 🎯 Goal

Set up your Vercel deployment to use: `https://insightsheet.meldra.ai`

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
   - Enter: `insightsheet.meldra.ai`
   - Click **"Add"**

4. **Vercel will show DNS configuration:**
   - You'll see DNS records to add
   - Usually a **CNAME record** pointing to Vercel

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
   - Click **"Add"** or **"Add Record"**
   - Select **"CNAME"** from dropdown
   - Fill in:
     - **Name/Host:** `insightsheet`
     - **Value/Points to:** `cname.vercel-dns.com` (or what Vercel shows)
     - **TTL:** `600` (or default)
   - Click **"Save"**

4. **Verify:**
   - You should see the CNAME record in your DNS list
   - It may take a few minutes to appear

---

### **Step 3: Wait for DNS Propagation**

- **Time:** 5 minutes to 48 hours (usually 1-2 hours)
- **Check:** Visit `https://insightsheet.meldra.ai`
- **Status:** Vercel dashboard will show "Valid Configuration" when ready

---

## 📋 What Vercel Will Show You

When you add the domain, Vercel will display something like:

```
Add this DNS record:

Type: CNAME
Name: insightsheet
Value: cname.vercel-dns.com
```

**Copy this exactly** and add it to GoDaddy DNS.

---

## ✅ Verification

### **Check in Vercel:**
1. Go to Settings → Domains
2. `insightsheet.meldra.ai` should show:
   - ✅ "Valid Configuration" (green)
   - Or ⏳ "Pending" (waiting for DNS)

### **Check DNS:**
1. Use [dnschecker.org](https://dnschecker.org)
2. Enter: `insightsheet.meldra.ai`
3. Check CNAME record points to Vercel

### **Test:**
1. Visit: `https://insightsheet.meldra.ai`
2. Should show your deployed app!

---

## 🔧 Troubleshooting

### **Domain Not Working?**
- **Wait longer:** DNS can take up to 48 hours
- **Check DNS:** Verify CNAME record is correct
- **Check Vercel:** Settings → Domains → See status

### **Wrong DNS Record?**
- **Delete old record** in GoDaddy
- **Add new record** with Vercel's exact values
- **Wait for propagation**

### **Still Not Working?**
- **Check Vercel logs:** Settings → Domains → View errors
- **Verify domain ownership:** Make sure you own `meldra.ai`
- **Contact support:** Vercel or GoDaddy support

---

## 📝 Quick Checklist

- [ ] Add `insightsheet.meldra.ai` in Vercel → Settings → Domains
- [ ] Copy CNAME record from Vercel
- [ ] Go to GoDaddy → DNS Management
- [ ] Add CNAME record: `insightsheet` → `cname.vercel-dns.com`
- [ ] Wait for DNS propagation (1-48 hours)
- [ ] Test: `https://insightsheet.meldra.ai`
- [ ] Verify in Vercel dashboard (should show "Valid")

---

## 🎯 Summary

1. **Vercel:** Add domain `insightsheet.meldra.ai`
2. **GoDaddy:** Add CNAME record `insightsheet` → Vercel's value
3. **Wait:** DNS propagation (1-48 hours)
4. **Test:** Visit `https://insightsheet.meldra.ai`

**Your site will be live at `https://insightsheet.meldra.ai`!** 🎉

---

**Follow these steps and your subdomain will be working!**
