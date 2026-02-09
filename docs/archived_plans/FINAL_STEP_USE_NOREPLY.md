# Final Step: Use noreply@meldra.ai (Domain is Verified! ✅)

## Great News! 🎉

Your domain `meldra.ai` is **VERIFIED** in Resend! All DNS records are correct:
- ✅ DKIM: Verified
- ✅ SPF: Verified  
- ✅ MX: Verified
- ✅ Enable Sending: ON

Now we just need to make sure Railway uses `noreply@meldra.ai`!

---

## Step 1: Set Railway Variable

1. Go to **Railway Dashboard** → Your service → **Variables** tab
2. Look for `SMTP_FROM_EMAIL`
3. **If it's missing or different:**
   - Click **"New Variable"** or **"Edit"**
   - Variable Name: `SMTP_FROM_EMAIL`
   - Variable Value: `noreply@meldra.ai`
   - Click **"Save"**
4. Railway will automatically restart (wait 2-3 minutes)

---

## Step 2: Verify Railway Restarted

1. Go to **Railway Dashboard** → Your service → **Logs** tab
2. Look for: `Application startup complete`
3. This confirms Railway restarted with the new variable

---

## Step 3: Test Password Reset

1. Go to: `https://insight.meldra.ai/forgot-password`
2. Enter your email
3. Click **"Send Reset Link"**

---

## Step 4: Check Railway Logs

After requesting password reset, check Railway logs for:

### ✅ Success (Using noreply@meldra.ai):
```
Attempting to use verified domain email: noreply@meldra.ai
✅ Password reset email sent successfully via Resend to [your-email]
```

### ⚠️ Still Using Test Email:
```
⚠️ Domain not verified for noreply@meldra.ai. Falling back to Resend test email...
```

**If you see the fallback message:**
- The domain might not be fully propagated yet
- Wait 5-10 more minutes
- Try again

---

## Step 5: Check Your Email

1. Open the password reset email
2. Check the **"From"** field
3. Should show: `noreply@meldra.ai` ✅

---

## Troubleshooting

### Problem: Still Getting onboarding@resend.dev

**Check 1: Railway Variable**
- Railway → Variables → `SMTP_FROM_EMAIL`
- Must be exactly: `noreply@meldra.ai`
- If different, update it and restart

**Check 2: Railway Restarted**
- Railway → Logs
- Look for recent restart
- If not restarted, manually restart: Railway → Settings → Restart

**Check 3: Wait a Bit**
- Sometimes takes 5-10 minutes after verification
- DNS propagation can take time
- Try again in a few minutes

---

## Expected Result

Once everything is set:
- ✅ Domain verified in Resend
- ✅ `SMTP_FROM_EMAIL=noreply@meldra.ai` in Railway
- ✅ Railway restarted
- ✅ Emails come from `noreply@meldra.ai`

---

## Quick Checklist

- [ ] Domain verified in Resend ✅ (You have this!)
- [ ] `SMTP_FROM_EMAIL=noreply@meldra.ai` in Railway
- [ ] Railway restarted
- [ ] Tested password reset
- [ ] Checked Railway logs
- [ ] Email shows `noreply@meldra.ai` as sender

---

## You're Almost There! 🚀

Since your domain is verified, you just need to:
1. Set `SMTP_FROM_EMAIL=noreply@meldra.ai` in Railway
2. Wait for Railway to restart
3. Test again

That's it! Once Railway has the variable set, emails will automatically use `noreply@meldra.ai`.
