# Product, Billing, Audit & Data-Retention Spec

**Document type:** Living spec (append/update only)

**Created:** 2026-02-01

**Current version:** v0.2

---

## 1. Identity & Accounts

### 1.1 Primary identity

- **User identity anchor:** `email`
- **Database primary key:** internal `users.id`
- **Uniqueness:** `users.email` must be unique (case-insensitive)

### 1.2 Signup/login rules

- Duplicate signup attempts using the same email must not create multiple accounts.
- Login history and security signals must be tracked per user:
  - IP address
  - Location (best-effort)
  - Browser/device (best-effort)

---

## 2. Free Tier / Trial Policy

### 2.1 Free tier eligibility

- Free tier is allowed per email.

### 2.2 One-time free policy

- A user must not receive a second “free” trial/benefit when re-registering or re-subscribing using the same email.
- Trial usage must be stored as an auditable timestamp (e.g., `trial_used_at`).

---

## 3. Subscription Lifecycle Policy

### 3.1 Charging

- If a subscription is active, the user is chargeable as per plan.
- If a subscription is canceled/unsubscribed, the user must not be charged.

### 3.2 Notifications

- Subscription cancellation/unsubscribe must be recorded (audit) and a notification should be sent.

### 3.3 Resubscribe

- If a user re-subscribes using the same email, they must not receive a new free trial.

---

## 4. API Keys, Limits, Usage Metering

### 4.1 API style

- Developer API will be REST.

### 4.2 Daily limits

- Default: **1000 requests/day per API key**.

### 4.3 Overage policy

- Per API key policy:
  - `allow_overage=false`: hard block with `429` after daily limit.
  - `allow_overage=true`: allow requests above limit and mark them as overage/billable.

### 4.4 Billing basis

- Overage billing uses **per-request + tokens** (for AI endpoints).

---

## 5. Audit Logging & Dispute Handling

### 5.1 Billing fairness rule

- Usage/cost should be billed only when the request is successfully completed.
- Failures must be logged, but should not be billed.

### 5.2 Evidence stored

- Request logs must store enough metadata for disputes:
  - endpoint/method/status
  - timestamps
  - request_id
  - tokens used (where applicable)
  - cost fields
  - IP and user agent

---

## 6. Data Retention / “No customer work stored”

### 6.1 File processing history retention

- `file_processing_history` is treated as session-scoped metadata.
- It must be deleted:
  - on login (clear stale session metadata)
  - on logout
  - after session expiry via TTL cleanup

---

## 7. Change Log (append/update only)

### v0.1 — 2026-02-01

- Added session-scoped deletion policy for `file_processing_history`.
- Defined identity, free tier, subscription, API usage, and audit policies.

### v0.2 — 2026-02-01

- Implemented email normalization on register/login (case-insensitive uniqueness behavior).
- Added one-time trial tracking via `users.trial_used_at` and a one-time `start-trial` flow.
- Added subscription cancel flow (moves user back to free plan and marks subscription canceled).
- Added append-only subscription audit logging (`subscription_event_log`).
