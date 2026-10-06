# meldra AI Assistant — Knowledge Base (Customer-Facing)

**Document type:** Canonical KB (customer-facing only)

**Created:** 2026-02-02

**Version:** v0.1

---

## 0) Purpose

This document is the single source of truth for the **meldra AI Assistant**.

The assistant must help users with:
- product features and how to use them
- developer API onboarding and usage
- plan limits, quotas, and fair-usage rules
- common troubleshooting (user-facing)

The assistant must NOT answer backend/internal implementation questions.

---

## 1) Scope rules (very important)

### 1.1 Allowed topics (the assistant may answer)

- Account signup, login, email verification
- How to obtain and use API keys (sandbox vs production)
- Base URLs and required request headers
- Free tier vs paid limits
- Rate-limit meaning and typical error codes (401/403/409/429)
- How to test endpoints (Developer Portal test console / Postman)
- How to interpret common user-facing errors (“Failed to fetch”, “Network error”, “CORS”, “key invalid”, etc.)
- High-level privacy policy: “no customer work stored” (customer explanation only)

### 1.2 Disallowed topics (the assistant must refuse)

If asked about any of the below, the assistant must reply:
- “I can help with product usage and account/API onboarding. For internal/backend implementation details, please contact meldra support.”

Disallowed examples:
- database schema, table names, migrations
- server logs and stack traces (except giving high-level guidance like “service may be down, contact support”)
- internal endpoints not documented for customers
- code, infrastructure, deployment, secrets, keys, environment variables

---

## 2) Product overview (customer view)

### 2.1 What meldra does

meldra provides:
- privacy-first data analysis workflows (in-app)
- a Developer API for document conversion and related utilities

### 2.2 “No customer work stored” (customer explanation)

meldra is designed to avoid storing customer uploaded work beyond what is required to complete the request.
- You receive your output immediately.
- Temporary processing metadata may exist briefly during a session.

---

## 3) Accounts & email verification

### 3.1 Signup flow

1. Create an account using your email.
2. Verify your email address using the verification email.
3. After verification, you can access the Developer Portal and request your sandbox API key.

### 3.2 Why verification is required

Email verification helps:
- prevent abuse
- ensure API keys are issued to a real inbox
- make sure the key is delivered to the correct owner

---

## 4) API keys (sandbox and production)

### 4.1 What is an API key?

A meldra API key is a secret token used to authenticate your requests.

Your key format looks like:
- `meldra_test_<hex>` (sandbox)
- `meldra_<hex>` (production)

### 4.2 Where do I get the API key?

**Sandbox key (self-serve):**
- After signup and email verification, go to the Developer Portal and click **“Request Sandbox Key”**.
- The sandbox key is shown **one time** and also emailed to your verified email.

**Production key (paid / approved):**
- Production keys are provided after your paid plan is activated (or approval for enterprise).

### 4.3 Key is shown only once

For security, the full key is only shown once.
- Save it securely when it is displayed.
- The system may show only a masked prefix later.

### 4.4 What email will I receive?

The email includes:
- your API key
- base URL (sandbox or production)
- required header name (`X-API-Key`)
- key safety warning: do not share or commit to git

### 4.5 I clicked “Request Sandbox Key” again and got an error

If you already requested a sandbox key, requesting again will return an error like:
- **409 Conflict**: “Sandbox API key already issued for this account.”

This is expected.

---

## 5) Base URLs & authentication

### 5.1 Base URLs

- **Production:** `https://api.developer.meldra.ai`
- **Sandbox:** `https://api-sandbox.developer.meldra.ai`

### 5.2 Required header

All Developer API requests require:

```http
X-API-Key: <your_api_key_here>
```

---

## 6) Free tier and paid limits (business rules)

### 6.1 Free tier conversion limits (key rule)

Free tier allows:
- **1 successful conversion per conversion type per email**

Examples (each is allowed once on free tier):
- PDF → DOCX: 1 time
- DOCX → PDF: 1 time
- PDF → PPTX: 1 time
- PPT/PPTX → PDF: 1 time
- Excel → PPTX: 1 time
- OCR → PDF: 1 time
- OCR → DOCX: 1 time

After you use the free conversion for a specific type, the next successful attempt of the same type will be blocked until you upgrade.

### 6.2 Paid plan conversion limits

Paid plans allow higher limits (example):
- **100 successful conversions per day per conversion type**

Final limits depend on your plan and your key.

### 6.3 Rate limits vs conversion limits

There are two different limit concepts:

1) **Conversion limits (business rule):** free vs paid conversion quota by conversion type.
2) **Rate limits (technical rule):** protects the API from abuse (requests per minute/day).

A user may hit either limit depending on usage.

---

## 7) Supported endpoints (customer view)

Common Developer API endpoints:
- `POST /v1/convert/pdf-to-doc`
- `POST /v1/convert/doc-to-pdf`
- `POST /v1/convert/ppt-to-pdf`
- `POST /v1/convert/pdf-to-ppt`
- `POST /v1/zip/clean`

All are called with `multipart/form-data` and a `file` field.

---

## 8) How to test (Developer Portal)

### 8.1 Test from developer.meldra.ai

1. Open `https://developer.meldra.ai`
2. Paste your API key into the “API Key (Required)” field.
3. Select an endpoint.
4. Upload a file.
5. Click “Test API”.
6. Download the result.

### 8.2 Testing from Postman

1. Create a request to the endpoint URL.
2. Add header `X-API-Key: <your_key>`
3. Set Body to `form-data`.
4. Add key `file` type “File” and choose your input file.
5. Send.
6. Save the response as a file.

---

## 9) Common errors & what to do (customer)

### 9.1 “Network error” / “Site can’t be reached”

This usually means:
- the base URL is incorrect, or
- the service is temporarily unavailable, or
- DNS is not configured yet for the domain.

Try:
- open `.../docs` or `.../openapi.json` in a browser
- if it doesn’t load, contact support

### 9.2 “Failed to fetch” (in browser)

This can happen when:
- the API service is down, or
- the browser blocks the request due to cross-origin restrictions.

Try:
- confirm the API base URL is reachable
- retry later
- contact support if it persists

### 9.3 401 Unauthorized

Meaning:
- missing or incorrect `X-API-Key`.

Fix:
- ensure you pasted the correct key
- ensure header name is exactly `X-API-Key`

### 9.4 403 Forbidden

Meaning:
- your account may not be verified, or
- you don’t have access to this environment/plan.

Fix:
- verify your email
- ensure you’re using the sandbox key against the sandbox base URL

### 9.5 409 Conflict

Meaning:
- you already requested a sandbox key (one per account).

### 9.6 429 Too Many Requests

Meaning:
- you hit a rate limit or quota.

Fix:
- wait and retry later
- upgrade your plan if you are on free tier

---

## 10) Security guidance (customer)

- Never share your API key publicly.
- Do not commit API keys to GitHub.
- Store keys in environment variables or a secret manager.

---

## 11) Assistant behavior (how answers should be produced)

### 11.1 Output style

- Provide step-by-step instructions.
- Use short sections and clear headings.
- If user asks backend/internal questions, refuse and redirect.

### 11.2 What to do when unsure

If the assistant is not certain, it should:
- ask 1–2 clarifying questions
- recommend contacting support for account-specific issues

---

## 12) Do we need an LLM?

### Option A — No LLM (works, cheaper, more controlled)

You can build the assistant without an LLM by using:
- a searchable FAQ/KB (this document)
- keyword search + curated answers

Pros:
- predictable answers
- no hallucinations
- minimal cost

Cons:
- less natural conversation
- user must ask questions close to the FAQ wording

### Option B — With an LLM (recommended for best UX)

Use an LLM to:
- understand user questions in natural language
- select relevant KB sections
- respond in a friendly, structured way

To reduce hallucinations:
- always “ground” responses in this KB
- refuse questions outside scope

**Conclusion:**
- It can work without an LLM.
- For a premium, “support-chat” experience, an LLM is recommended.

---

## 13) Support contacts

- Email: `support@meldra.ai`

---

## 14) Change log

### v0.1 — 2026-02-02

- Initial KB created for AI assistant: API keys, onboarding, limits, endpoints, troubleshooting.
