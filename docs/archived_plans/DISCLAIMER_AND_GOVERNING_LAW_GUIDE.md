# Disclaimer & Governing Law — What to Use

## What should be present in the Disclaimer & Terms (Commercial terms)

A solid Commercial terms / Disclaimer & Terms page should include:

| # | Section | Status in Meldra |
|---|---------|------------------|
| 1 | **General disclaimer** — "AS IS", "AS AVAILABLE"; no warranties | ✅ Present |
| 2 | **Data accuracy & responsibility** — User verifies; not professional advice | ✅ Present |
| 3 | **Limitation of liability** — Cap on damages; 12‑month fees or $100 for free | ✅ Present |
| 4 | **Your responsibilities** — Lawful use, no illegal content, no misuse | ✅ Present |
| 5 | **Third‑party services** — Not responsible for Google, AI, payments | ✅ Present |
| 6 | **Not professional advice** — No financial, legal, medical, tax advice | ✅ Present |
| 7 | **API and commercial use** — Key confidentiality, no uptime warranty, acceptable use, suspension | ✅ Present |
| 8 | **Indemnification** — User indemnifies Meldra for their use, breach, content | ✅ Present |
| 9 | **Governing law & courts** — Law of England and Wales; courts of England and Wales | ✅ Present |
| 10 | **Changes to terms** — Right to modify; continued use = acceptance | ✅ Present |
| 11 | **Term and termination** — Right to suspend/terminate accounts or API | ✅ Added |
| 12 | **Force majeure** — No liability for events beyond our control | ✅ Added |
| 13 | **Entire agreement** — These terms + Privacy Policy = full agreement | ✅ Added |
| 14 | **Severability** — If one clause is invalid, the rest remain | ✅ Added |
| 15 | **No waiver** — Not enforcing once does not waive later | ✅ Added |
| 16 | **Assignment** — User may not assign; we may (e.g. in a sale) | ✅ Added |
| 17 | **Contact** — legal@meldra.ai, support@meldra.ai | ✅ Present |

---

## 1. Governing Law placeholders (now set in `src/pages/Disclaimer.jsx`)

### `[Your Jurisdiction]` (now: **England and Wales** — UK-based)
- **Meaning:** The **place whose laws** govern the contract (how the terms are interpreted and enforced).
- **You put:** The country (or state, if relevant) where your company is incorporated or where you choose the law to apply.
- **Examples:**
  - **India**
  - **England and Wales**
  - **State of Delaware, United States**
  - **Singapore**
  - **Republic of Ireland**

### `[Your City/State/Country]` (now: **the courts of England and Wales**)
- **Meaning:** The **venue/forum** where disputes (lawsuits, etc.) must be resolved.
- **You put:** The **courts** of a specific place. “City/State/Country” is a template: you can name only the country, or be more specific.
- **Examples:**
  - **the courts of India**
  - **the courts of England and Wales** or **London, England**
  - **the state and federal courts in Delaware, United States**
  - **the courts of Singapore**
  - **New Delhi, India** (if you want to pin to a city)

**Typical pairing:** Jurisdiction and courts are often the **same** place (e.g. laws of England and Wales → courts of England and Wales). Meldra is UK-based, so **England and Wales** for both. If you move or incorporate elsewhere, change both to that jurisdiction and those courts.

---

## 2. Commercial terms — “Disclaimer & Terms on insight.meldra.ai”

The **Commercial terms** for Meldra (including API use) are the Disclaimer & Terms page:  
`insight.meldra.ai/disclaimer`.

### What we’ve included (and that helps protect you)

| Section | Purpose |
|--------|---------|
| **General disclaimer** | “AS IS”, “AS AVAILABLE”; no warranties (merchantability, fitness, etc.). |
| **Data accuracy & responsibility** | User is responsible for checking results; not a substitute for professional advice. |
| **Limitation of liability** | Caps on indirect/consequential damages; 12‑month fees or $100 for free users. |
| **Your responsibilities** | Lawful use, no illegal content, verify results, no misuse. |
| **Indemnification** | User indemnifies Meldra for their use, breach, and content. |
| **Governing law & courts** | Law of England and Wales; disputes in the courts of England and Wales. |
| **API and commercial use** | API key confidentiality, no uptime warranty, acceptable use, suspension/revocation. |

### What other organisations often add (now in Disclaimer.jsx)

- **Term and termination** — Right to suspend/terminate accounts or API access.
- **Force majeure** — No liability for outages due to events beyond your control.
- **Export compliance** — User warrants they won’t use the service in breach of export laws.
- **Entire agreement** — These terms (plus Privacy Policy) are the full agreement.
- **Severability** — If one clause is invalid, the rest stay in effect.
- **No waiver** — Not enforcing a term once doesn’t mean you waive it later.
- **Assignment** — User may not assign; you may assign (e.g. in a sale).
- **Contact for legal/notices** — legal@meldra.ai, support@meldra.ai (already in the page).

---

## 3. Changing jurisdiction or courts

Meldra is currently set to **England and Wales** (UK-based). If you later move or incorporate elsewhere, edit `src/pages/Disclaimer.jsx` and replace:

- **Jurisdiction:**  
  `the laws of **England and Wales**` → e.g. `the laws of **India**` or `the laws of the **State of Delaware, United States**`.
- **Courts:**  
  `the courts of **England and Wales**` → e.g. `the courts of **India**` or `the state and federal courts in **Delaware, United States**`.

Use the place where you are domiciled or where you are willing to resolve disputes.
