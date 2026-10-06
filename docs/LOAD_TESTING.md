# Testing meldra and working out what to charge

Three kinds of testing, from cheapest to most realistic:

| Test | What it tells you | Tool | Where |
|---|---|---|---|
| Integration and system tests | Every tool works end to end through the real API | `pytest` (153 backend tests), `npm test` (110 frontend tests) | On your computer; also run automatically on every pull request |
| Cost benchmark | Time, CPU and memory per operation, and the server cost per 1,000 operations | `backend/tools/benchmark_costs.py` | On your computer |
| Load test | How many people can use meldra at once before it slows down or fails | `backend/tools/locustfile.py` (Locust) | Against a staging copy of the backend |

## 1. Switch off upload size limits while testing

Upload limits are one setting on the backend, `UPLOAD_LIMIT_MB`:

| Value | Effect |
|---|---|
| not set | Normal plan limits: Free 10 MB per file, Premium 500 MB per file |
| `off` | No size limit per file and no monthly upload cap |
| a number, e.g. `2000` | That limit per file for everyone |

In Railway: your service → **Variables** → add `UPLOAD_LIMIT_MB` = `off` → the service restarts. The website reads the limit from the server, so it shows "no size limit" automatically. **Remove the variable before launch.**

The monthly conversion count still applies. For unlimited testing, sign in with the account named in `ADMIN_PREMIUM_EMAIL`; it has unlimited conversions and AI queries.

## 2. Integration and system tests

```bash
# backend (from backend/)
pip install -r requirements.txt pytest
pytest -q                     # 153 tests: auth, 2-device limit, every file tool, retention, lakehouse...

# frontend (from the repository root)
npm install
npm test                      # 110 tests
npm run build
```

These also run on GitHub for every pull request (the `backend-test` and `frontend-test` checks).

## 3. Cost benchmark: what one operation costs

```bash
cd backend
python tools/benchmark_costs.py                          # every tool, small/medium/large (a few minutes)
python tools/benchmark_costs.py --tools excel_to_ppt --sizes large
python tools/benchmark_costs.py --vcpu-month 20 --gb-month 10 --out ../docs/benchmark-results.md
```

The script makes its own sample files (no customer data), sends them through the real API, and measures each run in a fresh process. Prices default to Railway's usage pricing ($20 per vCPU per month, $10 per GB of RAM per month); check railway.com/pricing and pass other prices for AWS or a new plan.

### Results (measured 30 Sep 2026, one CPU)

Sizes: small = 1,000 rows / 50 files / 5 pages, medium = 20,000 rows / 1,000 files / 50 pages, large = 100,000 rows / 5,000 files / 300 pages.

| Tool | Small | Medium | Large | Peak memory (large) | Server cost per 1,000 (large) |
|---|---|---|---|---|---|
| Excel → PowerPoint | 1.6 s | 5.8 s | 4.2 s | 560 MB | $0.03 |
| File analysis | 0.4 s | 2.4 s | 12.3 s | 695 MB | $0.10 |
| Standardize | 0.5 s | 5.4 s | 23.3 s | 671 MB | $0.19 |
| Filename cleaner (ZIP) | 0.2 s | 0.2 s | 0.7 s | 300 MB | $0.005 |
| PDF merge | 0.1 s | 0.2 s | 0.6 s | 343 MB | $0.005 |
| PDF → Word | 0.5 s | 3.0 s | 20.2 s | 533 MB | $0.17 |

Full table: [benchmark-results.md](benchmark-results.md). (Excel → PowerPoint "large" is faster than "medium" because large workbooks are read in streaming mode.)

**What this means:** the server cost of the work itself is tiny, under $0.20 for 1,000 even of the largest jobs. Your costs come from:

1. **The always-on server**: one worker holds about 0.3 GB of RAM and some CPU even when idle, around $3–10 a month on Railway per worker. Add the database (Neon) and the website (Vercel).
2. **AI calls (OpenAI)**: AI Assistant, Unified Reporting, Migration mapping, invoice extraction and AI summaries are charged by OpenAI per token. These are usually the biggest cost per user, so AI queries per month are the right thing to limit per plan. Check actual spend in the OpenAI usage dashboard after a test day.
3. **Capacity**: a CPU can only do one heavy conversion at a time (see the load test below). To serve more people at once you pay for more CPU, not for the work itself.

## 4. Load test: how many users at once

Run this against a **staging** backend, never against the live site while customers use it.

**Set up staging on Railway (once):** in your Railway project → **Environments** → **New environment** → "staging" (a copy of the services). Give it its own database (a new Neon branch, or Railway Postgres) and set `UPLOAD_LIMIT_MB=off` and `ADMIN_PREMIUM_EMAIL=<your test account>`.

**Get a sign-in token for the test account:** sign in to the staging site in your browser, open the browser console (F12 → Console) and run `localStorage.getItem('auth_token')`. The token lasts for the login session.

**Run it:**

```bash
pip install locust
export MELDRA_TOKEN="<the token>"
cd backend/tools
locust -f locustfile.py --host https://<your-staging-backend>.up.railway.app
```

Open http://localhost:8089, enter the number of users (start with 10, then 25, 50, 100) and a spawn rate (e.g. 2 per second), and press Start. Each simulated user mostly browses and now and then converts a file (Excel → PowerPoint, analysis, filename cleaner, PDF merge), with 2–8 seconds between actions.

Without the web page, saving CSV results:

```bash
locust -f locustfile.py --host https://... --headless -u 25 -r 2 -t 5m --csv results-25-users
```

**While it runs, watch in Railway → your service → Metrics:** CPU, memory, and whether the service restarts (a restart means it ran out of memory).

**Read the results:**
- **Failures** should stay at 0%. A failure at "429" means a plan limit was hit (use the admin test account); "502/503" or a restart means the server is overloaded.
- **95th percentile response time**: browsing should stay under 1 second. Conversions take their normal time (table above) plus waiting behind other conversions.
- Increase users until conversions take too long for you (e.g. over 30 seconds) or failures appear. That user count is your **capacity per server**.

### Local result (one CPU, one worker, 10 users, 45 seconds)

114 requests, **0 failures**. Browsing requests averaged under 0.1 s. Excel → PowerPoint (1,000 rows) took 1.6 s alone but averaged 8.7 s with 10 users converting at once, because conversions queue on the one CPU. More CPU (Railway: more vCPU, or `WEB_CONCURRENCY=2` with enough memory) shortens that queue.

## 5. From results to prices

1. **Fixed monthly cost** = server (Railway) + database (Neon) + website (Vercel) + email (Resend) + domain.
2. **Capacity per server** from the load test, e.g. "25 people converting at the same time with acceptable waits". Most subscribers are not active at the same moment; 20–50 subscribers per concurrently active user is a common starting assumption for business tools.
3. **AI cost per user per month** from the OpenAI usage dashboard after a test day, divided by active test users, times expected monthly use.
4. **Price per plan** ≥ (fixed cost ÷ expected subscribers) + AI cost per user + payment fees (Stripe ≈ 1.5–3% + fixed fee) + margin.
5. Keep plan limits that protect you: AI queries per month (costly), file size per plan (memory), conversions per month (CPU). With the numbers above, file conversions are cheap enough to be generous; AI is where limits matter.

## Before launch

- Remove `UPLOAD_LIMIT_MB` (or set the value you want to sell).
- Set `ADMIN_PREMIUM_EMAIL` back to your own account on production.
- Delete the staging environment or keep it for future tests (it costs money while running).
