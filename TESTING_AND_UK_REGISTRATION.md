# Testing: Restrict Access & UK Company Registration

## 1. Restricting the app during testing (so others can’t use it)

You can’t really “hide” the URL—if insight.meldra.ai is live, people can find it. The control is: **only people you allow can create an account**.

### How it works

- **BETA_MODE** = turn on “private beta”: registration is restricted.
- **BETA_ALLOWED_EMAILS** = comma‑separated list of emails that *can* register. Anyone else gets: *“Meldra is in private beta. To request access, email support@meldra.ai.”*

Existing accounts (e.g. yours) keep working. Only *new* sign‑ups are blocked for non‑allowed emails.

### What to set

#### Backend (where the API runs)

**A) Local (`backend/.env`)**

```env
# Private beta: only these emails can register. Comma‑separated. Remove or set BETA_MODE=false to open registration.
BETA_MODE=true
BETA_ALLOWED_EMAILS=sumitagaria@gmail.com,tester1@example.com,tester2@example.com
```

**B) Railway (production backend)**

1. Railway Dashboard → your backend service → **Variables**.
2. Add:
   - `BETA_MODE` = `true`
   - `BETA_ALLOWED_EMAILS` = `sumitagaria@gmail.com,tester1@example.com`  
     (comma‑separated, no spaces between emails, or spaces are ok—they are trimmed)

3. **Redeploy** the backend so the new variables are used.

### Adding or removing testers

- **Add:** Put their email in `BETA_ALLOWED_EMAILS`, redeploy (or restart backend locally).
- **Remove:** Take their email out of `BETA_ALLOWED_EMAILS`. They can still *log in* if they already have an account; to fully lock them out you’d need to deactivate/delete the user in your database (or add a separate “banned” check).

### When you’re ready to go public

- Set `BETA_MODE=false` or remove `BETA_MODE`.
- Restart/redeploy the backend. Registration is then open to everyone.

### Optional: hide the Register / Sign up button

If you want to avoid random people even trying to register:

- You can replace “Register” / “Sign up” with something like *“Private beta — contact support@meldra.ai”* and link to `mailto:support@meldra.ai`.
- The backend will still block non‑allowed emails if they hit `/register` directly.

---

## 2. Registering Meldra as a company in the UK

Below is an overview. For your exact case (e.g. visa, residency, liability), use **gov.uk**, an **accountant**, or a **solicitor**.

### Main options

| Type | Best if | Liability | Setup |
|------|---------|-----------|--------|
| **Sole trader** | Just you, simple start | You’re personally liable | Register for Self Assessment (HMRC) |
| **Limited company (Ltd)** | You want a company, limited liability, “Meldra Ltd” | Limited to the company | Register with Companies House (+ HMRC) |

### Limited company (Ltd) – practical steps

1. **Companies House**
   - gov.uk: [Set up a limited company](https://www.gov.uk/limited-company-formation)
   - Or: [Companies House: Incorporate a company](https://www.gov.uk/incorporate-a-company-online)
   - You need:
     - Company name (e.g. “Meldra Ltd” — check it’s not taken)
     - Registered office address (England/Wales/Scotland/NI)
     - At least one director (you)
     - At least one shareholder (you)
     - SIC code (e.g. 62012 “Business and domestic software development” or 62020 “IT consultancy”)
     - Memorandum and Articles of Association (defaults are provided)
   - Fee: about £12–50 online (gov.uk) or more via an agent.
   - Incorporation often within 24 hours.

2. **HMRC**
   - After incorporation, register the company for:
     - **Corporation Tax** (within 3 months of starting to trade): [Register for Corporation Tax](https://www.gov.uk/limited-company-formation/set-up-your-company-for-corporation-tax)
     - **VAT** (if turnover is or will be over the VAT threshold, or you want to register voluntarily): [VAT registration](https://www.gov.uk/vat-registration)

3. **If you’re a director and take a salary/dividends**
   - You’ll need **Self Assessment** and possibly **PAYE** for the company. An accountant can set this up.

### Sole trader – short version

- [Register as a sole trader](https://www.gov.uk/set-up-business) (Self Assessment with HMRC).
- You trade as yourself; no Companies House. Simpler, but you’re personally liable.

### Useful links

- [GOV.UK: Set up a business](https://www.gov.uk/set-up-business)
- [GOV.UK: Limited company formation](https://www.gov.uk/limited-company-formation)
- [Companies House](https://www.gov.uk/government/organisations/companies-house)
- [HMRC: Corporation Tax](https://www.gov.uk/corporation-tax)
- [HMRC: Register for VAT](https://www.gov.uk/vat-registration)

### After you have a UK company

- You can put the company name and registered number in the Disclaimer/Terms and in the footer (e.g. “Meldra Ltd, registered in England and Wales, no. 12345678”).
- Governing law and courts in your terms are already set to England and Wales; they stay the same.

---

## Summary

| Goal | What to do |
|------|------------|
| **Limit who can use the app during testing** | Set `BETA_MODE=true` and `BETA_ALLOWED_EMAILS=your@email.com,tester@email.com` in the **backend** (.env locally, Railway Variables in production). Redeploy/restart. |
| **Register Meldra in the UK** | Choose sole trader or limited company. For Ltd: incorporate via gov.uk/Companies House, then register for Corporation Tax (and VAT if needed) with HMRC. Use an accountant/solicitor for your specific situation. |
