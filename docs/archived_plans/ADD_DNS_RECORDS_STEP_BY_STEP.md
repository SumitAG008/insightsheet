# Step-by-Step: Add DNS Records for meldra.ai in Your Domain Provider

## Records You Need to Add (from Resend Dashboard)

Based on your Resend dashboard, you need to add these **3 DNS records**:

### 1. DKIM Record (Domain Verification)
- **Type:** `TXT`
- **Name/Host:** `resend._domainkey`
- **Value:** `p=MIGfMAOGCSqGSIb3DQEB...` (the full long key from Resend)
- **TTL:** `Auto` or `3600`

### 2. SPF Record (Enable Sending)
- **Type:** `TXT`
- **Name/Host:** `send`
- **Value:** `v=spf1 include:amazons...` (the full value from Resend)
- **TTL:** `Auto` or `3600`

### 3. MX Record (Enable Sending) - Optional but Recommended
- **Type:** `MX`
- **Name/Host:** `send`
- **Value:** `feedback-smtp.eu-west-...` (the full value from Resend)
- **Priority:** `10`
- **TTL:** `Auto` or `3600`

---

## Step-by-Step Instructions

### Step 1: Open Your Domain DNS Management

You're already in the right place! You're looking at:
- **Domain:** `meldra.ai`
- **Tab:** "DNS Records" ✅

### Step 2: Add DKIM Record (First Record)

1. Click **"Add New Record"** button
2. Fill in the form:
   - **Type:** Select `TXT` from dropdown
   - **Name/Host:** Enter `resend._domainkey`
   - **Value:** Copy the **entire** value from Resend (starts with `p=MIGfMAOGCSqGSIb3DQEB...`)
     - ⚠️ **Important:** Copy the FULL value, don't truncate it
   - **TTL:** Leave as default (usually `3600` or `Auto`)
3. Click **"Save"** or **"Add Record"**

### Step 3: Add SPF Record (Second Record)

1. Click **"Add New Record"** button again
2. Fill in the form:
   - **Type:** Select `TXT` from dropdown
   - **Name/Host:** Enter `send`
   - **Value:** Copy the **entire** value from Resend (starts with `v=spf1 include:amazons...`)
     - ⚠️ **Important:** Copy the FULL value
   - **TTL:** Leave as default
3. Click **"Save"** or **"Add Record"**

### Step 4: Add MX Record (Third Record - Optional)

1. Click **"Add New Record"** button again
2. Fill in the form:
   - **Type:** Select `MX` from dropdown
   - **Name/Host:** Enter `send`
   - **Value/Priority:** 
     - **Priority:** Enter `10`
     - **Value:** Copy the **entire** value from Resend (starts with `feedback-smtp.eu-west-...`)
   - **TTL:** Leave as default
3. Click **"Save"** or **"Add Record"**

---

## Important Notes

### ⚠️ Copy Values Exactly
- Copy the **ENTIRE** value from Resend
- Don't add spaces or quotes
- Don't truncate the value
- The DKIM value is very long - make sure you get it all

### 📝 Name/Host Field
- For `resend._domainkey`: Enter exactly `resend._domainkey`
- For `send`: Enter exactly `send`
- Some providers might auto-add the domain, that's fine

### ⏰ Wait for DNS Propagation
- After adding records, wait **5-60 minutes**
- DNS changes take time to propagate worldwide
- You can check propagation at [dnschecker.org](https://dnschecker.org)

---

## After Adding Records

### Step 5: Verify in Resend

1. Go back to **Resend Dashboard** → **Domains** → `meldra.ai`
2. Click **"I've added the records"** button (the green button you saw)
3. Resend will check if records are correct
4. Status should change to **"Verified"** ✅

### Step 6: Test Email Sending

Once verified:
1. Go to your app: `https://insight.meldra.ai/forgot-password`
2. Request a password reset
3. Check your email - it should come from `noreply@meldra.ai` ✅

---

## Troubleshooting

### Records Not Showing Up?

1. **Wait longer:** DNS can take up to 48 hours (usually 1 hour)
2. **Check spelling:** Make sure Name/Host matches exactly
3. **Check value:** Make sure you copied the entire value
4. **Check type:** Make sure Type is correct (TXT or MX)

### Resend Says "Not Verified"?

1. **Check DNS propagation:**
   - Go to [dnschecker.org](https://dnschecker.org)
   - Search for your TXT records
   - Wait if they're not showing yet

2. **Double-check values:**
   - Go back to your DNS records
   - Compare with Resend's values
   - Make sure they match exactly

3. **Contact support:**
   - If still not working after 24 hours
   - Check Resend dashboard for specific error messages

---

## Quick Checklist

- [ ] Added DKIM record (TXT, `resend._domainkey`)
- [ ] Added SPF record (TXT, `send`)
- [ ] Added MX record (MX, `send`, Priority 10) - Optional
- [ ] Copied FULL values (not truncated)
- [ ] Saved all records
- [ ] Waited 5-60 minutes
- [ ] Clicked "I've added the records" in Resend
- [ ] Domain shows "Verified" in Resend
- [ ] Tested email sending

---

## What Happens Next?

Once your domain is verified:
- ✅ Emails will automatically use `noreply@meldra.ai`
- ✅ Better deliverability (less spam)
- ✅ Professional appearance
- ✅ No code changes needed (automatic!)

Good luck! 🚀
