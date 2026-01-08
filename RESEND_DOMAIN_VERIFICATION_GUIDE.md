# Resend Domain Verification Guide - Send Emails from noreply@meldra.ai

## Why Verify Your Domain?

- ✅ Professional: Emails come from `noreply@meldra.ai` instead of `onboarding@resend.dev`
- ✅ Better Deliverability: Less likely to go to spam
- ✅ Brand Trust: Users see your domain, not Resend's
- ✅ Required for Production: Best practice for production apps

---

## Step-by-Step: Verify meldra.ai Domain in Resend

### Step 1: Add Domain in Resend Dashboard

1. Go to [resend.com](https://resend.com) and log in
2. Click **"Domains"** in the left sidebar
3. Click **"Add Domain"** button
4. Enter: `meldra.ai`
5. Click **"Add Domain"**

### Step 2: Get DNS Records from Resend

After adding the domain, Resend will show you DNS records to add:

**You'll see something like:**

1. **SPF Record:**
   - Type: `TXT`
   - Name: `@` (or `meldra.ai`)
   - Value: `v=spf1 include:resend.com ~all`

2. **DKIM Record:**
   - Type: `TXT`
   - Name: `resend._domainkey` (or similar)
   - Value: `[long string provided by Resend]`

3. **DMARC Record (Optional but Recommended):**
   - Type: `TXT`
   - Name: `_dmarc`
   - Value: `v=DMARC1; p=none; rua=mailto:dmarc@meldra.ai`

**Copy all these records** - you'll need them in the next step.

---

## Step 3: Add DNS Records to Your Domain

### Where to Add DNS Records

**It depends on where your domain is hosted:**

#### Option A: GoDaddy
1. Go to [godaddy.com](https://godaddy.com) and log in
2. Go to **"My Products"** → **"Domains"**
3. Click on `meldra.ai`
4. Click **"DNS"** or **"Manage DNS"**
5. Click **"Add"** or **"Add Record"**
6. Add each TXT record from Resend

#### Option B: Namecheap
1. Go to [namecheap.com](https://namecheap.com) and log in
2. Go to **"Domain List"**
3. Click **"Manage"** next to `meldra.ai`
4. Go to **"Advanced DNS"** tab
5. Click **"Add New Record"**
6. Add each TXT record

#### Option C: Cloudflare
1. Go to [cloudflare.com](https://cloudflare.com) and log in
2. Select your domain `meldra.ai`
3. Go to **"DNS"** → **"Records"**
4. Click **"Add record"**
5. Add each TXT record

#### Option D: Other DNS Providers
- Google Domains
- AWS Route 53
- Name.com
- Any other DNS provider

**The process is the same:**
1. Log into your domain registrar/DNS provider
2. Find DNS management section
3. Add TXT records provided by Resend

---

## Step 4: Add DNS Records (Detailed)

### Record 1: SPF Record

**In your DNS provider:**
- **Type:** `TXT`
- **Name/Host:** `@` (or leave blank, or `meldra.ai`)
- **Value:** `v=spf1 include:resend.com ~all`
- **TTL:** `3600` (or default)

### Record 2: DKIM Record

**In your DNS provider:**
- **Type:** `TXT`
- **Name/Host:** `resend._domainkey` (exact value from Resend)
- **Value:** `[long string from Resend]` (copy exactly)
- **TTL:** `3600` (or default)

### Record 3: DMARC Record (Optional)

**In your DNS provider:**
- **Type:** `TXT`
- **Name/Host:** `_dmarc`
- **Value:** `v=DMARC1; p=none; rua=mailto:dmarc@meldra.ai`
- **TTL:** `3600` (or default)

---

## Step 5: Wait for DNS Propagation

1. **Save all DNS records** in your DNS provider
2. **Wait 5-60 minutes** for DNS to propagate
3. Go back to **Resend Dashboard** → **Domains**
4. Click **"Verify"** or wait for auto-verification
5. Status should change to **"Verified"** ✅

**Note:** DNS propagation can take up to 48 hours, but usually happens within 1 hour.

---

## Step 6: Test Domain Verification

1. In Resend Dashboard → Domains
2. Check if `meldra.ai` shows **"Verified"** status
3. If verified, you can now send from `noreply@meldra.ai`

---

## Step 7: Update Code (After Verification)

Once domain is verified, the code will automatically use `noreply@meldra.ai` if:
- Domain is verified in Resend
- `SMTP_FROM_EMAIL` is set to `noreply@meldra.ai` in Railway

**No code changes needed** - it will automatically detect and use the verified domain!

---

## Troubleshooting

### DNS Records Not Working?

1. **Check DNS propagation:**
   - Use [dnschecker.org](https://dnschecker.org)
   - Search for your TXT records
   - Wait if they're not showing yet

2. **Verify record format:**
   - Make sure you copied the exact value from Resend
   - No extra spaces or quotes
   - Name/Host matches exactly

3. **Check Resend dashboard:**
   - Go to Domains → meldra.ai
   - Look for error messages
   - Resend will tell you which records are missing

### Domain Still Not Verified?

1. Wait longer (up to 48 hours)
2. Double-check DNS records are correct
3. Contact Resend support if needed

---

## Quick Reference

**DNS Provider:** [Your provider - GoDaddy/Namecheap/Cloudflare/etc.]
**Domain:** `meldra.ai`
**Records to Add:** SPF, DKIM, DMARC (all TXT records)
**Verification Time:** 5-60 minutes (usually)
**Resend Dashboard:** [resend.com/domains](https://resend.com/domains)

---

## After Verification

Once `meldra.ai` is verified in Resend:
- ✅ Emails will send from `noreply@meldra.ai`
- ✅ Better deliverability
- ✅ Professional appearance
- ✅ No code changes needed (automatic)
