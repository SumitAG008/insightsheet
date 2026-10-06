# Selling meldra to organisations

How to price, record, track and report on deals with universities, hospitals, insurers,
manufacturers and other companies. The technical side (limits, enforcement, servers) is in
`docs/PLAN_LIMITS_AND_CAPACITY.md`.

## 1. What an organisation buys

An **annual licence**: a number of seats for a fixed term, on the Team or Business plan, with:

- an admin page for their IT team (add and remove people, roles, usage per person, CSV export,
  change history);
- optional sign-up by email domain (everyone `@uni.ac.uk` gets a seat while seats remain);
- invoice and purchase-order billing, with GST/VAT;
- custom limits where agreed (e.g. 8,000 conversions a month per person);
- a data processing agreement, and the Terms of Service at `/terms`;
- a 14-day grace period after the end date, so nobody is cut off while the renewal is processed.

Coming after launch: single sign-on (Google/Microsoft), a full audit log, and multi-document
summaries with citations.

## 2. Regional prices and legal notices

The website picks the visitor's region from their IP address (falling back to the browser's time
zone; visitors can change it) and shows prices, tax wording and their local legal rights on the
pricing page, Terms (section 13) and Privacy page. Settings: `src/lib/region.js`.

| Region | Currency | Pro a month | Team per user a month | Seat per year | Tax shown | Legal notice |
|---|---|---|---|---|---|---|
| India | INR | ₹1,499 | ₹999 | ₹9,990 | + GST 18% | DPDP Act 2023, IT Act 2000, Grievance Officer, Data Protection Board |
| United Kingdom | GBP | £25 | £15 | £150 | + VAT 20% | UK GDPR, DPA 2018, ICO, 14-day consumer cancellation |
| European Union | EUR | €29 | €17 | €170 | + VAT (country rate / reverse charge) | GDPR, national authority, 14-day withdrawal |
| Rest of world | USD | $29 | $19 | $190 | + local sales tax | US state privacy rights (e.g. California) |

Company details appear in the footer, Terms and notices once set in Vercel (Project → Settings →
Environment Variables), then redeploy. Unset values are not shown.

| Variable | What |
|---|---|
| `VITE_COMPANY_NAME`, `VITE_COMPANY_ADDRESS`, `VITE_COMPANY_CIN` | Registered company name, office and CIN |
| `VITE_COMPANY_GSTIN`, `VITE_COMPANY_UK_VAT`, `VITE_COMPANY_EU_VAT` | Tax registrations, once you have them |
| `VITE_GRIEVANCE_OFFICER_NAME`, `VITE_GRIEVANCE_OFFICER_EMAIL` | **Required for India.** Until set, the notice shows legal@meldra.ai without a name |
| `VITE_EU_REPRESENTATIVE` | GDPR Article 27 EU representative, if you sell to EU consumers without an EU office |
| `VITE_LEGAL_EMAIL`, `VITE_PRIVACY_EMAIL` | Defaults: legal@meldra.ai, privacy@meldra.ai |

Selling in the EU also means registering for VAT OSS (consumer sales) and, without an EU office,
appointing an EU representative. Charging VAT or GST needs the registrations above first.

## 3. Deal terms (suggested starting points)

| Term | Suggestion |
|---|---|
| Base price | Team list price £15 / ₹999 per user per month, billed yearly: **£150 / ₹9,999 per seat per year** (about two months free versus monthly) |
| Volume discount | 10–49 seats 15% · 50–199 seats 25% · 200+ seats 35% |
| Academic discount | Further 20% for universities and colleges (not stacked above 45% total) |
| Site licence | Flat yearly fee by size band instead of seats, e.g. £8k / £15k / £25k; unlimited seats from the domain, fair use applies |
| Paid pilot | 60–90 days, 10–25 seats, small fee credited to year 1 if they sign; 2–3 written success measures (e.g. "hours saved on monthly reconciliation") |
| Multi-year | 5–10% off for a 2–3 year price lock, invoiced yearly |
| Minimum contract | e.g. £3,000 / ₹2.5 lakh a year, so support cost doesn't exceed the deal |
| Payment | Annual in advance, 30 days from invoice, against a PO |
| Over the limit | Warn at 80% and 100%; offer a top-up or seat increase; never block a paying institution mid-term (the 14-day grace and per-licence custom limits are how) |
| Seats added mid-term | Pro rata to the end date |
| Add-ons | AI question packs, OCR page packs, priority support / SLA (Business), onboarding and training days, custom connectors (day rate) |

**Example.** A university business school, 120 seats: 120 × £150 = £18,000; 25% volume and 20%
academic gives £18,000 × 0.75 × 0.80 = **£10,800 a year**. Two-year lock at 5% off: £10,260 a year.

**Where institutions buy.** India: **GeM** (Government e-Marketplace) for public universities and
hospitals, which needs company registration and usually DPIIT recognition. UK: **G-Cloud**
(Digital Marketplace) for the NHS and public bodies, and **Jisc** for universities. UK public buyers
usually ask for **Cyber Essentials** (about £300); get it early. ISO 27001 can come later.

## 4. Sector packs

The same product, with a landing section, starter templates and features switched on per sector
(the licence's `pack` field records which).

| Pack | Pitch | Tools it uses |
|---|---|---|
| University | Research and admin: summarise papers, thesis PDFs to Excel, OCR of scanned archives, department reporting | OCR, PDF tools, AI assistant, Excel to PPT, unified reporting |
| Hospital (finance & admin) | Supplier invoices to data, reconciliation, monthly reporting | Invoice extraction, reconciliation, unified reporting, P&L builder |
| Insurance | Claims documents and forms to data, bordereaux reconciliation | OCR, fillable PDFs, form reader, reconciliation |
| Manufacturing / operations | Plant and inventory reports, reconciliation, board packs, system migrations | Reconciliation, P&L builder, Excel to PPT, migration, database connectors |

**Hospitals:** sell to finance, procurement and HR first. Patient-identifiable data is excluded by
the Terms (section 7) until there is a signed agreement covering it, plus NHS DSPT (UK) or DPDP
Act consent handling (India).

## 5. Recording a deal in meldra

On the website, signed in as meldra admin: **Licences** (`/adminlicenses`).

1. **New customer**: name, sector, country, email domain (if they want auto-join), their IT admin's
   email (becomes the organisation's owner), billing email, GSTIN/VAT number, and the CRM reference.
2. Open the customer → **Record a licence**: plan, pack, seats, start/end, status (`pilot` or
   `active`), contract value for the whole term before tax, currency, billing period, PO number,
   invoice number and status, and any custom limits.
3. When the invoice is paid: **Mark paid**.
4. Renewal: record a new licence starting the day after the old one ends. Members keep their seats.
5. Non-payment: set the licence status to `suspended`; members fall back to their own plans at once.

The customer's admin then manages their own people at `/organization`.

## 5a. Renewals: built in

What meldra does on its own, so no renewal is missed:

| When | What happens |
|---|---|
| 90, 60, 30 and 7 days before the end date | The customer's owners and admins see a renewal strip under the menu, with **Request renewal**. The same days, they and the billing contact get one email each (daily job, never sent twice). |
| Admin clicks **Request renewal** (Organisation page) | They can give next term's seats and a note. meldra logs it in the change history and emails `MELDRA_SALES_EMAIL` (default sales@meldra.ai), at most once a day per organisation. |
| End date passes | 14-day grace period (per licence): everyone keeps access, members now see the notice too, and a final email goes out. |
| Grace ends | Members fall back to their own plans. Their organisation, members and history stay, so renewing restores access at once. |
| Renewal licence recorded (step 4 above) | Notices and emails stop. The Licences report marks the renewal as done. |

**Setup** (once):

1. Backend environment: `CRON_SECRET` (a long random value) and, if not sales@meldra.ai, `MELDRA_SALES_EMAIL`. Email needs `RESEND_API_KEY` or the `SMTP_*` settings already used for sign-up emails.
2. GitHub repository secrets: `MELDRA_API_URL` (the backend's public URL) and `CRON_SECRET` (same value).
3. Check it: **Actions → Licence renewal reminders → Run workflow** with *dry run* ticked lists who would be emailed without sending.

## 5b. Renewal strategy: why customers renew

Customers renew when meldra holds work they would have to rebuild elsewhere, and when the renewal is easier than the alternative. Lock-in by holding data hostage is not an option: customers can always export their data (the Privacy Policy promises data portability, and data protection law requires it).

**Make value build up inside meldra**
- Saved mappings, crosswalks, cleansing rules and templates (Migration today; Workbench recipes and Automations next). Each month of use adds to what a competitor would have to rebuild.
- Scheduled jobs and monitored pipelines (Automations, roadmap Phases 4–5): once month-end runs itself, stopping is a visible step backwards.
- History and audit trail: reconciliations, sign-offs and run logs that auditors ask for.

**Show the value before the renewal conversation**
- At 90 days, send a short value summary: jobs run, files processed, active members, hours saved (planned: generated from usage counts).
- Seat use under 50% at 90 days is a risk: offer a training session before the quote, not after.
- Seat use over 90%: quote more seats with the renewal.

**Contract terms that favour renewal**
- Annual or multi-year terms, invoiced yearly in advance.
- Auto-renewal clause in the order form: renews for another year unless either side gives 60 days' written notice.
- Price protection: renewal uplift capped (e.g. 5–7%), or a 2–3 year price lock for 5–10% off.
- Early-renewal incentive: renew 30+ days before the end date and keep this year's price.
- Co-terminate add-ons (solution packs, extra seats) with the main licence, so there is one renewal date.

**Individual Pro plans**
Card payments are not live yet. When Stripe goes live, sell monthly and yearly subscriptions that renew automatically, with the reminder email before a yearly renewal that consumer law in the UK and EU expects.

## 6. Tracking customers and deals (CRM)

Use **HubSpot CRM (free)** or **Zoho CRM** (pairs with Zoho Books for GST). Don't build a CRM.

Pipeline stages: **Lead → Discovery call → Demo → Pilot → Proposal → Security/procurement review →
Won / Lost** (record the reason).

Fields on each deal: organisation, sector, seats, annual contract value, probability, decision maker,
budget holder, next step and date, expected close date, and the meldra organisation id. Put the
CRM's deal id in the customer's **CRM reference** in meldra so the two connect.

Weekly, from meldra's **Licences** page:

- **Renewals in the next 90 days**: start renewal conversations at 90 days, send the quote at 60.
- **Seat use under 50%** (shown in amber): a renewal risk; offer training before the renewal.
- **Seat use over 90%**: an upsell; offer more seats.
- **Invoiced but unpaid**: chase anything past 30 days.

## 7. Financial reports

**Accounting**: Zoho Books (India, GST) or Xero (UK, VAT), with a CA or accountant for filings.
Card payments (Stripe, when live) and enterprise invoices both go into it. Keep a separate company
bank account from day one.

**Monthly one-page report** (for the founders, later for investors):

| Section | Figures | Source |
|---|---|---|
| Revenue | ARR and MRR (ARR ÷ 12); new, expansion and lost ARR this month; net revenue retention | meldra Licences report (`arr_by_currency`) + Stripe |
| Bookings vs billing vs revenue | Signed this month · invoiced · earned. A £12,000 annual deal is **booked** once, **invoiced** once, and **earned** £1,000 a month; the unearned part is **deferred revenue** | Licences report + accounting |
| Cash | Bank balance, money in, money out, monthly burn, months of runway | Accounting |
| Receivables | Invoiced but unpaid, and how old | Licences report (`unpaid_by_currency`) |
| Customers | Paying customers, pilots, seats sold vs used | Licences report |
| Costs per customer | Hosting, AI and OCR cost ÷ active seats → gross margin | Cloud and OpenAI bills ÷ usage counts per organisation (`/api/org/usage.csv` per customer) |
| Pipeline | Weighted pipeline (value × probability), win rate by sector, average sales cycle | CRM |

Export the customer list with **Export CSV** on the Licences page
(`/api/admin/licenses/report.csv`) and paste it into the monthly sheet.

**Annual value** in meldra is the contract value spread over a year: a 2-year contract of £20,000
counts as £10,000 of ARR. Pilots are listed but are not counted in ARR.

## 8. Before the first enterprise contract

- [ ] Company registered; contracting entity name on invoices and order forms, and the `VITE_COMPANY_*` and Grievance Officer variables set in Vercel
- [ ] Order form template (customer, seats, term, price, limits, PO, governing law)
- [ ] Data processing agreement (DPA), linked from the Terms
- [ ] Security questionnaire answers (from `docs/DATA_PROTECTION.md` and `docs/CONNECTOR_SECURITY.md`)
- [ ] Cyber Essentials (UK public sector)
- [ ] Lawyer review of `/terms`, especially governing law: the Terms say England and Wales; an
      Indian company selling to Indian institutions may want Indian law and courts instead
- [ ] GeM / G-Cloud registration when targeting public institutions
