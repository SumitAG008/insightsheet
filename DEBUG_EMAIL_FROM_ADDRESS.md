# Debug: Why Emails Still Come from onboarding@resend.dev

## Current Issue
Emails are being sent from `onboarding@resend.dev` instead of `noreply@meldra.ai`.

## Possible Causes & Solutions

### Cause 1: Domain Not Verified in Resend (MOST LIKELY)

**Check:**
1. Go to [resend.com/domains](https://resend.com/domains)
2. Find `meldra.ai`
3. What does the status say?
   - ✅ **"Verified"** = Should work, check other causes
   - ⚠️ **"Pending"** = Still verifying, wait longer
   - ❌ **"Failed"** = DNS records incorrect

**Solution if "Pending" or "Failed":**
1. Click on `meldra.ai` domain
2. Click "I've added the records" button again
3. Wait 5-60 minutes
4. Check DNS records are correct at [dnschecker.org](https://dnschecker.org)

---

### Cause 2: SMTP_FROM_EMAIL Not Set in Railway

**Check:**
1. Railway Dashboard → Your service → **Variables** tab
2. Look for `SMTP_FROM_EMAIL`
3. What is the value?
   - ✅ Should be: `noreply@meldra.ai`
   - ❌ Missing or different = This is the problem!

**Solution:**
1. Railway → Variables → Add/Edit
2. Variable: `SMTP_FROM_EMAIL`
3. Value: `noreply@meldra.ai`
4. Save (Railway will restart automatically)
5. Wait 2-3 minutes for restart
6. Test again

---

### Cause 3: DNS Records Not Propagated Yet

**Check:**
1. Go to [dnschecker.org](https://dnschecker.org)
2. Search for: `resend._domainkey.meldra.ai` (TXT record)
3. Are the records showing up?

**Solution:**
- If not showing: Wait longer (can take up to 48 hours, usually 1 hour)
- If showing but Resend says "Failed": Check values match exactly

---

### Cause 4: Code Falling Back to Test Email

**Check Railway Logs:**
1. Railway Dashboard → Your service → **Logs** tab
2. Request a password reset
3. Look for these messages:

**If you see this (Domain not verified):**
```
⚠️ Domain not verified for noreply@meldra.ai. Falling back to Resend test email...
✅ Password reset email sent successfully via Resend (test email) to [email]
```

**If you see this (Should work):**
```
Attempting to use verified domain email: noreply@meldra.ai
✅ Password reset email sent successfully via Resend to [email]
```

**Solution:**
- If logs show "Falling back", domain is not verified
- Follow Cause 1 solution above

---

## Step-by-Step Debugging

### Step 1: Check Resend Domain Status
- [ ] Go to Resend Dashboard → Domains
- [ ] Is `meldra.ai` showing "Verified"? 
  - ✅ Yes → Go to Step 2
  - ❌ No → Fix DNS records, wait, then verify

### Step 2: Check Railway Variable
- [ ] Railway → Variables → `SMTP_FROM_EMAIL`
- [ ] Is it set to `noreply@meldra.ai`?
  - ✅ Yes → Go to Step 3
  - ❌ No → Set it, wait for restart, test again

### Step 3: Check Railway Logs
- [ ] Request password reset
- [ ] Check logs - what message appears?
  - "Attempting to use verified domain email" → Should work, check email
  - "Falling back to Resend test email" → Domain not verified

### Step 4: Check DNS Propagation
- [ ] Go to [dnschecker.org](https://dnschecker.org)
- [ ] Search for `resend._domainkey.meldra.ai`
- [ ] Are records showing?
  - ✅ Yes → Wait for Resend to verify
  - ❌ No → Wait longer or check DNS records

---

## Most Common Issue

**90% of the time, it's one of these:**

1. **Domain not verified in Resend** (most common)
   - DNS records added but Resend hasn't verified yet
   - Solution: Wait longer, click "I've added the records" again

2. **SMTP_FROM_EMAIL not set in Railway**
   - Variable missing or wrong value
   - Solution: Set `SMTP_FROM_EMAIL=noreply@meldra.ai` in Railway

3. **DNS records not propagated**
   - Records added but not visible worldwide yet
   - Solution: Wait 1-24 hours for propagation

---

## Quick Fix Checklist

Run through this checklist:

- [ ] Resend Dashboard: `meldra.ai` = "Verified"?
- [ ] Railway Variables: `SMTP_FROM_EMAIL=noreply@meldra.ai`?
- [ ] Railway restarted after setting variable?
- [ ] DNS records showing at dnschecker.org?
- [ ] Waited at least 1 hour after adding DNS records?
- [ ] Clicked "I've added the records" in Resend?

---

## What to Do Right Now

1. **Check Resend Dashboard first:**
   - Go to [resend.com/domains](https://resend.com/domains)
   - What status does `meldra.ai` show?
   - Share the status with me

2. **Check Railway Variables:**
   - Railway → Variables
   - Is `SMTP_FROM_EMAIL` set to `noreply@meldra.ai`?
   - If not, set it now

3. **Check Railway Logs:**
   - Request password reset
   - What message appears in logs?
   - Share the log message with me

Once I know these 3 things, I can tell you exactly what's wrong! 🔍
