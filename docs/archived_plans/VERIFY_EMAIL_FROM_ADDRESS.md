# How to Verify Emails Are Sent from noreply@meldra.ai

## Step 1: Verify Domain in Resend Dashboard

1. Go to [resend.com](https://resend.com) and log in
2. Click **"Domains"** in the left sidebar
3. Find `meldra.ai` in the list
4. Check the status:
   - ✅ **"Verified"** = Domain is ready, emails will use `noreply@meldra.ai`
   - ⚠️ **"Pending"** = Still verifying, wait a bit longer
   - ❌ **"Failed"** = DNS records not correct, check them again

**If status is "Verified":** ✅ You're good to go!

---

## Step 2: Set Railway Environment Variable

Make sure Railway has the correct FROM email:

1. Go to **Railway Dashboard** → Your service → **Variables** tab
2. Check if `SMTP_FROM_EMAIL` is set:
   - **Should be:** `noreply@meldra.ai`
   - If not set or different, add/update it:
     - Variable: `SMTP_FROM_EMAIL`
     - Value: `noreply@meldra.ai`
3. Railway will restart automatically

---

## Step 3: Test Password Reset (Send an Email)

1. Go to: `https://insight.meldra.ai/forgot-password`
2. Enter your email address
3. Click **"Send Reset Link"**
4. Wait for success message

---

## Step 4: Check Railway Logs (See Which Email Was Used)

1. Go to **Railway Dashboard** → Your service → **Logs** tab
2. Look for these log messages after you request password reset:

### ✅ If Using noreply@meldra.ai (SUCCESS):
```
Attempting to use verified domain email: noreply@meldra.ai
✅ Password reset email sent successfully via Resend to [your-email]
```

### ⚠️ If Still Using Test Email (Domain Not Verified):
```
⚠️ Domain not verified for noreply@meldra.ai. Falling back to Resend test email...
✅ Password reset email sent successfully via Resend (test email) to [your-email]
💡 To use noreply@meldra.ai, verify domain in Resend dashboard: https://resend.com/domains
```

**What to look for:**
- If you see "Attempting to use verified domain email: noreply@meldra.ai" → ✅ Working!
- If you see "Falling back to Resend test email" → Domain not verified yet

---

## Step 5: Check Your Email (Verify Sender Address)

### Option A: Check Email Header (Most Accurate)

1. Open the password reset email you received
2. Click **"Show original"** or **"View source"** (depends on email client)
3. Look for these headers:

**✅ Correct (Using noreply@meldra.ai):**
```
From: Meldra <noreply@meldra.ai>
Return-Path: noreply@meldra.ai
```

**❌ Wrong (Still using test email):**
```
From: Meldra <onboarding@resend.dev>
Return-Path: onboarding@resend.dev
```

### Option B: Check Email Client Display

**Gmail:**
- Look at the **"From"** field in the email
- Should show: `Meldra <noreply@meldra.ai>` or `noreply@meldra.ai`

**Outlook:**
- Look at the **"From"** field
- Should show: `noreply@meldra.ai`

**Other Clients:**
- Check the sender address in the email header
- Should be `noreply@meldra.ai`

---

## Step 6: Verify Email Content

The email should:
- ✅ Come from `noreply@meldra.ai` (not `onboarding@resend.dev`)
- ✅ Have subject: "Reset Your Password - Meldra"
- ✅ Contain the password reset link
- ✅ Show "Meldra" branding

---

## Troubleshooting

### Problem: Still Getting Emails from onboarding@resend.dev

**Possible Causes:**

1. **Domain Not Verified in Resend:**
   - Go to Resend Dashboard → Domains
   - Check if `meldra.ai` shows "Verified"
   - If not, wait longer or check DNS records

2. **SMTP_FROM_EMAIL Not Set in Railway:**
   - Railway → Variables → Check `SMTP_FROM_EMAIL`
   - Should be: `noreply@meldra.ai`
   - If missing, add it and restart Railway

3. **DNS Records Not Propagated:**
   - Check at [dnschecker.org](https://dnschecker.org)
   - Search for `resend._domainkey.meldra.ai` (TXT record)
   - Wait if not showing yet (can take up to 48 hours)

4. **Railway Not Restarted:**
   - After setting `SMTP_FROM_EMAIL`, Railway should auto-restart
   - Check Railway logs to see if it restarted

### Problem: Railway Logs Show "Domain not verified"

**Solution:**
1. Go to Resend Dashboard → Domains → `meldra.ai`
2. Check if status is "Verified"
3. If not verified:
   - Click "I've added the records" button again
   - Wait 5-60 minutes
   - Check DNS records are correct

### Problem: Email Not Received

**Check:**
1. Railway logs - did email send successfully?
2. Spam folder - check there
3. Email address - make sure it's correct
4. Wait 1-2 minutes - sometimes delayed

---

## Quick Verification Checklist

- [ ] Domain shows "Verified" in Resend Dashboard
- [ ] `SMTP_FROM_EMAIL=noreply@meldra.ai` in Railway Variables
- [ ] Railway logs show "Attempting to use verified domain email: noreply@meldra.ai"
- [ ] Email received shows sender as `noreply@meldra.ai`
- [ ] Email headers show `From: noreply@meldra.ai`

---

## Expected Results

### ✅ Success (Everything Working):
- Resend Dashboard: `meldra.ai` = **"Verified"** ✅
- Railway Logs: `Attempting to use verified domain email: noreply@meldra.ai` ✅
- Email From: `noreply@meldra.ai` ✅
- Email Headers: `From: Meldra <noreply@meldra.ai>` ✅

### ⚠️ Still Using Test Email:
- Resend Dashboard: `meldra.ai` = **"Pending"** or **"Failed"** ⚠️
- Railway Logs: `Falling back to Resend test email...` ⚠️
- Email From: `onboarding@resend.dev` ⚠️

---

## Next Steps After Verification

Once emails are coming from `noreply@meldra.ai`:
- ✅ Professional appearance
- ✅ Better deliverability
- ✅ Brand consistency
- ✅ No further action needed - it's automatic!

---

## Need Help?

If emails are still coming from `onboarding@resend.dev`:
1. Check Resend Dashboard domain status
2. Check Railway logs for error messages
3. Verify DNS records are correct
4. Wait for DNS propagation (up to 48 hours)

Good luck! 🚀
