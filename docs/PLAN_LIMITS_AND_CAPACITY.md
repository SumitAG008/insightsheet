# Plan limits and capacity

How meldra stops one person, one file or a busy hour from slowing down or crashing the service, and how
to change any limit without a code change.

## 1. The plan table

Prices shown are UK list prices; other regions see INR, EUR or USD (src/lib/prices.js). Paying yearly gives 2 months free.

One table in `backend/app/services/plan_limits.py` drives everything: enforcement on the server, the
website's usage bar and **Plan and usage** page, the pricing page and the Terms of Service
(all read it from `GET /api/plans/limits`).

| Limit (per user) | Free | Pro £25 a month (£250 a year) | Team £15 per user a month (from 3 users; £150 a year) | Business |
|---|---|---|---|---|
| Largest single file | 10 MB | 100 MB | 100 MB | 200 MB, or as agreed |
| Rows per spreadsheet (all sheets) | 50,000 | 300,000 | 1,000,000 | 2,000,000, or as agreed |
| Pages per PDF | 50 | 500 | 1,000 | 2,000, or as agreed |
| Scanned pages read by OCR per file | 5 | 100 | 100 | 300, or as agreed |
| Conversions and file jobs per month | 20 | 1,000 | 2,000 | 5,000, or as agreed |
| AI questions per month | 20 | 500 | 1,000 | 3,000, or as agreed |
| Total uploads per month | 200 MB | 10 GB | 20 GB | 50 GB, or as agreed |
| Files processing at the same time | 1 | 2 | 3 | 4 |
| Requests per minute | 120 | 240 | 300 | 600 |

**Why these figures.** A single conversion of a 100 MB file or a 1,000-page PDF needs about
700 MB of memory on one worker. File size, rows and pages are capped so that the largest file
any plan allows still fits in one worker. The monthly counts control cost (AI tokens, OCR CPU).
The two server-protection limits (files at once, requests per minute) stop one person from taking
a whole server.

**Server ceilings.** No plan or licence can go above these, whatever is configured:
500 MB per file, 5,000,000 rows, 5,000 PDF pages, 1,000 OCR pages per file, 10 files at once,
2,000 requests a minute. Raising them needs bigger workers first (section 5).

### Older plan names

Subscriptions stored as `premium`, `premium_monthly`, `premium_quarterly` or `premium_yearly` get the
**Pro** limits. Developer API keys: `standard` = Free, `premium` = Pro, `enterprise` = Business.

### Changing a figure

Set an environment variable on the backend and restart it:

```
LIMIT_<PLAN>_<KEY>=<number or "unlimited">

LIMIT_FREE_FILE_SIZE_MB=15
LIMIT_PRO_AI_QUERIES_PER_MONTH=400
LIMIT_TEAM_CONVERSIONS_PER_MONTH=unlimited
```

Plans: `FREE`, `PRO`, `TEAM`, `BUSINESS`. Keys: `FILE_SIZE_MB`, `SPREADSHEET_ROWS`, `PDF_PAGES`,
`OCR_PAGES`, `CONVERSIONS_PER_MONTH`, `AI_QUERIES_PER_MONTH`, `MONTHLY_UPLOAD_MB`, `CONCURRENT_JOBS`,
`REQUESTS_PER_MINUTE`. Then update the prices in `src/lib/planLimits.js` if they changed, and
the Terms' version date if the change reduces a paid plan (30 days' notice, Terms section 3).

For one customer only, put the agreed figures on their licence instead (section 3).

`UPLOAD_LIMIT_MB` still works as an emergency override of the per-file size for everyone
(`off` = no limit, for load tests only; **remove it before launch**).

## 2. Where each limit is enforced

| Limit | Where | What the user sees |
|---|---|---|
| File size, rows, PDF pages | `_check_upload_file()` in `main.py`, called right after each upload is read, in every upload endpoint (conversions, OCR, analysis, P&L, standardise, reconcile, ZIP, AI with file, PDF merge and split, developer API). Counting uses the PDF page table and the spreadsheet's stored size, so it takes milliseconds. | 413: "This PDF has 412 pages; the Free plan allows 50 per file. Split it into smaller PDFs or upgrade your plan." |
| OCR pages | `ocr_page_cap()` on the OCR endpoints: the smallest of what was asked, `OCR_MAX_PAGES_DEFAULT` and the plan. | Only the first N pages are read. |
| Conversions per month | `_enforce_transactions_quota()` / `_enforce_conversion_quota()`. | 429: "You have used all 20 conversions for this month..." |
| AI questions per month | `_enforce_ai_quota()`; one question counted per call. (It previously counted tokens against a question limit, which blocked paid users after one question.) | 429 with the reset date. |
| Uploads per month | `_enforce_upload_quota()`. | 413 with the monthly figure. |
| Requests per minute | `_server_guard` middleware, every `/api/` request. Signed-in users by plan; signed-out requests by IP (`GUARD_ANON_REQUESTS_PER_MINUTE`, default 300, because a campus can share one IP). | 429 + `Retry-After`. |
| Files at the same time | `_server_guard` middleware, file-processing `POST`s (`_HEAVY_JOB_PREFIXES`). A second file waits up to `GUARD_QUEUE_WAIT_SECONDS` for the first to finish. | Short wait; after 25 s, 429 "wait for your other file to finish". |
| Heavy jobs per server | Same middleware: at most `GUARD_HEAVY_JOBS_PER_PROCESS` (default 2) per worker process. Extra jobs queue up to 25 s. | Short wait; after 25 s, 503 + `Retry-After`, which the website retries automatically up to 3 times. |
| Web data (Playwright) | `_playwright_preflight()` and `_with_playwright_slot()` in `main.py`: paid plans and organisation licences only, one job at a time per person, each run counts as a conversion, at most `PLAYWRIGHT_MAX_CONCURRENT` (default 1) browsers per server process; later jobs wait as "queued". | 403 on Free; 429 "you already have a web data job running". |
| Request body | `_limit_request_body_size` middleware (`MAX_REQUEST_BODY_MB`, default 520). | 413 before the upload is read. |
| Devices | Two signed-in devices per account (`device_sessions.py`). | Choose a device to sign out. |

Monthly allowances reset on the 1st (UTC). Organisation members get their licence's limits
(section 3) everywhere above.

## 3. Organisation licences

Tables: `organizations`, `organization_members`, `licenses`, `organization_events`
(created automatically on start-up).

- A person belongs to at most one organisation. While their organisation's licence is **active**
  (or in its **grace** period, 14 days by default after the end date) they get the licence's plan
  limits plus any custom figures on the licence. For any limit where their own paid plan is higher,
  they keep their own figure.
- After grace, or if the licence is **suspended** or **cancelled**, they fall back to their own plan
  automatically. Nothing is deleted.
- **Domain auto-join**: with `email_domain` and `auto_join` set, anyone signing in with that domain
  gets a seat while seats remain. Public email domains (gmail.com etc.) are refused.
- Custom limits per licence: `{"conversions_per_month": 8000, "file_size_mb": 150}` (keys from the
  table above, capped by the server ceilings).

Endpoints (`backend/app/routes/organizations.py`):

| Who | Endpoint | Purpose |
|---|---|---|
| meldra admin | `GET/POST /api/admin/orgs`, `GET/PATCH /api/admin/orgs/{id}` | Customers |
| meldra admin | `POST /api/admin/orgs/{id}/licenses`, `PATCH /api/admin/licenses/{id}` | Record the deal, mark invoices paid, extend, suspend |
| meldra admin | `POST/DELETE /api/admin/orgs/{id}/members` | Add people (seat count not enforced for staff) |
| meldra admin | `GET /api/admin/licenses/report` (+ `.csv`) | ARR, unpaid invoices, seat use, renewals in 90 days, low-use customers |
| Customer admin | `GET /api/org/me`, `GET/POST/PATCH/DELETE /api/org/members` | Seats and people (seat count enforced) |
| Customer admin | `GET /api/org/usage.csv`, `GET /api/org/events` | Usage per person (counts only) and change history |

Website pages: **Licences** (`/adminlicenses`, meldra staff), **Organisation** (`/organization`,
customer admins), **Plan and usage** (`/usage`, everyone).

## 4. What happens under load

```
request ──► requests-per-minute check ──► file job?  ── no ──► handled
                                            │
                                            yes
                                            ▼
                         user's files-at-once slot free? ── wait up to 25 s ──► 429 "wait for your other file"
                                            │
                                            ▼
                      server's heavy-job slot free (2 per process)? ── wait up to 25 s ──► 503 + Retry-After
                                            │                                              (website retries 3x)
                                            ▼
                                    file processed
```

The point of the queue: when 100 people convert at once, people wait a few seconds instead of the
server running out of memory and failing for everyone.

**One server or many.** Counters live in each process by default. With `REDIS_URL` set, the
per-user limits (requests per minute, files at once) are shared by every process and server, so
they hold however many servers run. If Redis is unreachable the server logs a warning and falls
back to its own counters; it never stops serving. The heavy-jobs-per-process cap is always local,
because it protects that process's own memory.

## 5. Capacity planning

Estimates, to confirm with the load test (`docs/LOAD_TESTING.md`):

- One backend container = 2 worker processes (`app/runtime.py`, ~700 MB each) = 4 heavy jobs at once.
- A typical conversion takes 2–20 s; at ~8 s average one container finishes ~30 file jobs a minute.
- 100 people active at once, each running a file job every 2 minutes, means ~50 jobs a minute:
  **2 containers** (plus headroom = 3) with 3–4 GB of memory each.
- AI questions wait on the provider, not on CPU, and don't use heavy slots.

Settings to start with:

| Setting | Start | Raise when |
|---|---|---|
| `GUARD_HEAVY_JOBS_PER_PROCESS` | 2 | Memory stays under 60% under load |
| `GUARD_QUEUE_WAIT_SECONDS` | 25 | Users see "busy" often (add servers first) |
| `WEB_CONCURRENCY` | automatic | Container memory grows |
| Containers | 2 | CPU > 60% or memory > 70% for 5 minutes |

## 6. Running it

### Railway (now)

1. Backend service → Variables:
   - `REQUIRE_JWT_SECRET=true`, `JWT_SECRET_KEY` (long random value)
   - **delete** `UPLOAD_LIMIT_MB` (it was `off` for testing)
   - optional: `GUARD_*` and `LIMIT_*` as above
2. Add the Railway **Redis** service and reference its URL as `REDIS_URL` on the backend.
3. Backend → Settings → Replicas: **2**. Each replica runs the start command in `backend/Dockerfile`
   (graceful shutdown of 90 s so files in progress finish during a deploy).
4. Known gap until engineering item 3 lands: the free-trial e-mail job runs inside every worker,
   so with several replicas a warning e-mail can be sent twice. Turn it off on all but one replica,
   or wait for the scheduled-jobs change.

### Docker / docker-compose

`backend/docker-compose.yml` runs the same image. Add a `redis:7-alpine` service and
`REDIS_URL=redis://redis:6379/0` to share limits between containers.

### Kubernetes (`k8s/`)

- `backend-deployment.yaml`: 2 replicas minimum, rolling updates that never drop below the running
  count, spread across zones and machines, 120 s termination grace, pod disruption budget, and an
  autoscaler from 2 to 10 replicas on CPU 60% / memory 70%.
- `limits-configmap.yaml`: guard and OCR settings, and per-plan overrides.
- `redis.yaml`: counters only (no customer data, no persistence). Use ElastiCache on AWS.

Apply: `kubectl apply -f k8s/namespace.yaml -f k8s/limits-configmap.yaml -f k8s/redis.yaml -f k8s/backend-deployment.yaml`.

### AWS London (when Activate credits arrive)

| Piece | AWS service |
|---|---|
| Backend containers | ECS on Fargate, eu-west-2, 2+ tasks across 2–3 availability zones, same image and variables |
| Autoscaling | ECS service autoscaling on CPU 60%, memory 70% and ALB requests per target |
| Entry | Application Load Balancer + AWS WAF (rate rules as a first line, managed rule sets) |
| Shared limits | ElastiCache for Redis (`cache.t4g.micro`) → `REDIS_URL` |
| Database | Neon stays; or RDS PostgreSQL Multi-AZ later |
| Secrets | Secrets Manager → task environment |
| Worker pool | Fargate Spot, once conversions move to a job queue (engineering item 2) |

What this does not do yet: conversions still run inside the web servers. The guard stops them from
overloading a server; the job queue with separate workers (engineering item 2) is what lets
conversions scale separately from the website.

## 7. Tests

- `backend/tests/test_plan_limits.py`: the table, overrides, ceilings, page and row counting.
- `backend/tests/test_organizations.py`: deals, seats, domain auto-join, grace and expiry, admin
  permissions, the licence report.
- `backend/tests/test_server_guard.py`: requests per minute, files at once, the per-server queue,
  shared limits through Redis, and the middleware end to end.
- `src/lib/planLimits.test.js`: the website's copy of the table.

`backend/tests/conftest.py` turns the guard off for the rest of the suite (those tests call the API
without sign-in tokens, so they would all count as one visitor).
