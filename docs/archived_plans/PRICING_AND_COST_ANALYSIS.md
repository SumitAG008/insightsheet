# Meldra — Pricing & Cost Analysis

**Effective: Mid‑February 2025 — application fully paid, no promotional offers.**

---

## 1. Cost assumptions (typical monthly)

| Service | Typical use | Est. monthly (USD) | Notes |
|--------|-------------|--------------------|-------|
| **Database** (Railway Postgres / Supabase / Neon) | ~1–5 GB, moderate queries | **$5–25** | $5–7 for small; $20–25 for Pro/higher limits. |
| **Vercel** (frontend) | Hobby or Pro | **$0–20** | Hobby $0; Pro ~$20/mo for team features, more bandwidth. |
| **Railway** (backend) | 1 backend, 512MB–1GB RAM | **$5–20** | ~$5 for minimal; $15–20 for always-on, more resources. |
| **Resend** (email) | 3k–10k emails/mo | **$0–20** | Free tier ~3k; $20 for 50k. |
| **Stripe** (payments) | 2.9% + 30¢ per successful charge | **~2.9% + 30¢** | On top of each paid subscription charge. |
| **developer.meldra.ai / API infra** (if you host it) | Optional | **$0–30** | If you run PDF↔DOC, ZIP API: extra compute. |

**Rough monthly infrastructure range:** **$10–115** depending on scale and which services you use. A moderate setup (DB ~$10, Railway ~$10, Vercel $0–20, Resend ~$0–10) is often **~$20–50/month** before Stripe.

---

## 2. Stripe

- **Fees:** 2.9% + 30¢ per successful charge (US).
- **Payouts:** Usually 2–7 days; you receive net of fees.

Example: $15/mo plan → you receive about **$14.57** per subscriber per month (Stripe keeps ~$0.43 + 30¢).

---

## 3. Margin

- **Target margin on subscription revenue (after infra, before your time):** **25–35%**.
- Example: if total infra + third‑party is **$50/mo** and you want 30% margin on that piece, you need at least **~$72/mo** in revenue so that **~$22** is “margin” above that $50. In practice, margin is applied to the full price and other costs (see below).

---

## 4. Cost to improve the product

- **Buffer for product work:** **15–25%** of revenue or a fixed amount (e.g. **$50–150/mo** early on) to cover:
  - New features (e.g. developer.meldra.ai, more conversions).
  - Security, performance, and compliance.
  - Support and documentation.

---

## 5. Aggregate cost (simplified)

Assume a **moderate** stack:

| Item | USD/month |
|------|-----------|
| DB | 10 |
| Railway (backend) | 10 |
| Vercel | 0–20 (use 10 as midpoint) |
| Resend | 5 |
| developer.meldra.ai / extra API | 0–15 (use 10) |
| **Subtotal infra** | **~45** |
| Stripe (on revenue) | 2.9% + 30¢ per transaction |
| Product buffer (e.g. 20% of rev or $80) | 50–100 |
| **Total “costs” to recover** | **~95–145** before margin |

To have **~30% margin** on the part that’s “costs” (infra + buffer), you need revenue such that:

- **Revenue ≈ (Infra + Buffer) / (1 − 0.30) ≈ (95–145) / 0.7 ≈ 135–205 USD/month** from subscriptions, before counting Stripe (Stripe is already a % of that revenue).

So, as a **minimum sustainable range** for a small user base: **~\$140–210/month** in subscription revenue. That implies:

- **~\$140–210** if you have **1** user on a high plan, or  
- **~\$14–21/user** if you have **10** users, or  
- **~\$7–10/user** if you have **20** users.

---

## 6. Suggested pricing (fully paid from mid‑Feb, no promotions)

All amounts in **USD per month**, before any tax you may need to add.

| Plan | Price/mo | Main limits | Role |
|------|----------|-------------|------|
| **Starter** | **$9–12** | e.g. 10MB file, 5 AI queries/day, core tools | Entry, cover Stripe + some infra per user. |
| **Pro** | **$19–29** | e.g. 100–500MB, more AI, PDF↔DOC, ZIP, Excel→PPT, etc. | Main revenue; covers infra + margin + product buffer. |
| **Team / Business** | **$49–79** | Higher limits, priority, API (developer.meldra.ai), support | Margin and product improvement. |

- **Recommended anchor:** **$19–24/mo** for Pro.  
- **Starter** at **$9–12** helps conversion; **Team** at **$49+** for power users and API.

### Stripe (illustrative)

- **$12/mo:** you keep **~\$11.35** (Stripe ~\$0.65).  
- **$24/mo:** you keep **~\$22.70** (Stripe ~\$1.30).  
- **$49/mo:** you keep **~\$46.07** (Stripe ~\$2.93).

---

## 7. developer.meldra.ai and Meldra API key

- File conversion (PDF↔DOC, etc.) and ZIP Cleaner via **developer.meldra.ai** require a **paid Meldra API key**.
- You can:
  - **Bundle** a certain usage in Pro/Team (you pay the developer.meldra.ai cost and price it into the plan), or  
  - **Charge separately** for API access (e.g. add‑on or higher tier).

Pricing in **§6** assumes you either:

- include modest API usage in Pro/Team and absorb the cost in the **~\$45** infra + buffer, or  
- price an “API” or “developer” tier higher (e.g. **$49–79**) so it explicitly includes that cost and margin.

---

## 8. “Fully paid from mid‑February, no promotional offer”

- **From mid‑Feb 2025:**  
  - No free tier that gives meaningful, ongoing use of paid features.  
  - No time‑limited “promo” discounts (e.g. “50% off for 3 months”) unless you explicitly treat them as one‑off, non‑renewable.

- You can still:  
  - Offer a **short free trial** (e.g. 7–14 days) with card required, and/or  
  - Use **Starter** as a low‑price, limited plan instead of “free”.

---

## 9. Summary table (target)

| Metric | Value |
|--------|--------|
| Infra (DB, Railway, Vercel, Resend, API) | **~\$45/mo** (moderate) |
| Product buffer | **~\$50–100/mo** |
| Target margin on “costs” | **~25–35%** |
| **Min. subscription revenue to sustain** | **~\$140–210/mo** |
| **Suggested Pro (main) price** | **\$19–24/mo** |
| **Starter** | **\$9–12/mo** |
| **Team / API** | **\$49–79/mo** |

---

## 10. What to do next

1. **Set Stripe products/prices** to your chosen numbers (e.g. **$12**, **$24**, **$49**).  
2. **Turn off or severely limit** any free plan as of **mid‑Feb 2025**.  
3. **Remove** or expire all “promotional” discount codes by then.  
4. ** developer.meldra.ai:** decide whether Pro/Team includes a certain API usage or if it’s a separate, higher‑priced tier, and document limits and Overage/upgrades.  
5. **Review quarterly:** as DB, Railway, Resend, and API usage grow, re‑run this (infra + buffer + margin) and adjust list prices or limits.

---

*This is an estimate. Your actual DB, Vercel, Railway, Resend, and Stripe costs will vary. Adjust the table in §1 with your real bills and recompute §5–6.*
