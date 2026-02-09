# What to Do After Launching insight.meldra.ai (GoDaddy + Vercel)

You have **meldra.ai** on GoDaddy and **insight.meldra.ai** is set up. Here’s what to do next.

---

## 1. GoDaddy DNS (if not already done)

In **GoDaddy → My Products → meldra.ai → DNS**:

| Type  | Name    | Value / Points to      | Purpose                    |
|-------|---------|-------------------------|----------------------------|
| CNAME | `insight` | `cname.vercel-dns.com` | insight.meldra.ai → Vercel |

- **Name:** `insight` only (GoDaddy may add `.meldra.ai`).
- **Value:** `cname.vercel-dns.com` (or the exact value Vercel shows for insight.meldra.ai).

Save and wait **about 1–2 hours** for DNS to propagate.

---

## 2. Vercel – Domains

1. **Vercel** → your project → **Settings → Domains**.
2. **Add** `insight.meldra.ai` (if it’s not there).
3. Use the DNS instructions Vercel shows; they should match the CNAME above.
4. When status is **Valid**, `https://insight.meldra.ai` will serve your app.

---

## 3. Vercel – Environment Variables

In **Vercel → Project → Settings → Environment Variables** add (or confirm):

| Name            | Value                                      | Where    |
|-----------------|--------------------------------------------|----------|
| `VITE_API_URL`  | `https://insightsheet-production.up.railway.app` | Production (and Preview if you use it) |

(Use your real Railway URL if it’s different.)

Redeploy the project after changing env vars.

---

## 4. Railway (backend)

1. **CORS**  
   `https://insight.meldra.ai` and `https://meldra.ai` are already in the backend. If you add more domains (e.g. `www.meldra.ai`), add them to `CORS_ORIGINS` or `PRODUCTION_ORIGINS` in `backend/app/main.py`.

2. **FRONTEND_URL** (for password reset, emails, etc.)  
   In **Railway → your backend service → Variables**:
   - `FRONTEND_URL` = `https://insight.meldra.ai`

3. **Redeploy** the backend after changing variables.

---

## 5. (Optional) meldra.ai and www.meldra.ai

If you want `https://meldra.ai` and `https://www.meldra.ai` to open the same app:

### In Vercel

- Domains → Add: `meldra.ai` and `www.meldra.ai`.
- Note the DNS records Vercel shows (usually **A** for `@` and **CNAME** for `www`).

### In GoDaddy DNS

| Type  | Name | Value / Points to        |
|-------|------|---------------------------|
| A     | `@`  | `76.76.21.21`             |
| CNAME | `www`| `cname.vercel-dns.com`    |

(Use the exact **A** value Vercel gives for `meldra.ai` if it’s different.)

---

## 6. (Optional) Email with @meldra.ai (Resend)

To send from `hello@meldra.ai` or `noreply@meldra.ai`:

1. **Resend** → Domains → Add `meldra.ai`.
2. In **GoDaddy DNS** add the records Resend shows, for example:
   - **TXT** `resend._domainkey` → DKIM value from Resend
   - **TXT** `send` → SPF value from Resend
3. In Resend, run **Verify**.
4. In your **backend** (or app) set:
   - `SMTP_FROM_EMAIL` = `hello@meldra.ai` (or the address you want)
   - And your Resend API key / SMTP settings.

See `ADD_DNS_RECORDS_STEP_BY_STEP.md` and `RESEND_DOMAIN_VERIFICATION_GUIDE.md` for Resend details.

---

## 7. developer.meldra.ai

Not required. The **API docs** live at:

- **https://insight.meldra.ai/developers**

You can add **developer.meldra.ai** later in GoDaddy and Vercel if you want a separate subdomain.

---

## 8. Quick checklist

- [ ] GoDaddy: CNAME `insight` → `cname.vercel-dns.com`
- [ ] Vercel: Domain `insight.meldra.ai` added and **Valid**
- [ ] Vercel: `VITE_API_URL` = your Railway backend URL
- [ ] Railway: `FRONTEND_URL` = `https://insight.meldra.ai`
- [ ] (Optional) GoDaddy: A `@` and CNAME `www`; Vercel: `meldra.ai`, `www.meldra.ai`
- [ ] (Optional) Resend: `meldra.ai` verified; DKIM/SPF in GoDaddy; `SMTP_FROM_EMAIL` in backend

---

## 9. Test

- **https://insight.meldra.ai** → app (Landing, Login, etc.)
- **https://insight.meldra.ai/developers** → API docs
- **Login, password reset, Document Converter** → should work if `VITE_API_URL` and `FRONTEND_URL` are correct.

---

**Order that works well:**  
DNS in GoDaddy → Domains in Vercel → Env in Vercel and Railway → test in the browser.
