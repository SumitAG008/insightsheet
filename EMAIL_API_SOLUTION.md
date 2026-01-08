# Email Sending Solution: Use Resend API Instead of SMTP

## Problem
Railway is blocking SMTP connections on both port 587 and 465. This is common on cloud platforms.

## Solution: Use Resend API (Recommended)

Resend is a modern email API service that works perfectly with Railway and other cloud platforms.

### Step 1: Sign Up for Resend
1. Go to [resend.com](https://resend.com)
2. Sign up for a free account
3. Verify your email
4. Go to API Keys section
5. Create a new API key
6. Copy the API key (starts with `re_`)

### Step 2: Add Resend API Key to Railway
1. Go to Railway → insightsheet service → Variables
2. Add new variable:
   - **Name:** `RESEND_API_KEY`
   - **Value:** Your Resend API key (e.g., `re_1234567890abcdef...`)
3. Save (Railway will auto-restart)

### Step 3: Update Backend Code
The code will be updated to use Resend API instead of SMTP.

### Step 4: Verify Domain (Optional but Recommended)
1. In Resend dashboard, go to "Domains"
2. Add `meldra.ai` domain
3. Add DNS records (SPF, DKIM) to your domain
4. This ensures emails don't go to spam

## Alternative: SendGrid or Mailgun
If you prefer other services:
- **SendGrid:** Free tier: 100 emails/day
- **Mailgun:** Free tier: 5,000 emails/month

## Benefits of Email API Services
✅ Works on all cloud platforms (Railway, Vercel, etc.)
✅ Better deliverability (less spam)
✅ Built-in analytics
✅ No port/firewall issues
✅ Easy to set up
✅ Professional email templates

## Next Steps
1. Sign up for Resend
2. Get your API key
3. Add `RESEND_API_KEY` to Railway
4. Code will be updated to use Resend
