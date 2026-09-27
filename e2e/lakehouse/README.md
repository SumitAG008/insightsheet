# Lakehouse: end-to-end test

The real Unified Reporting UI, the real backend and a real **Apache Polaris** catalog
(Iceberg tables, Arrow + DuckDB queries). Only sign-in and the AI model's reply for
the report builder are replaced (see `live_backend.py`).

```bash
# 1. Apache Polaris (binary release, Java 21), with FILE storage enabled for local testing
POLARIS_BOOTSTRAP_CREDENTIALS=POLARIS,root,s3cr3t \
POLARIS_JAVA_OPTS='-Dpolaris.features."SUPPORTED_CATALOG_STORAGE_TYPES"=["FILE","S3"] -Dpolaris.features."ALLOW_INSECURE_STORAGE_TYPES"=true -Dpolaris.readiness.ignore-severe-issues=true' \
  polaris-bin-1.3.0-incubating/bin/server &
#    then create a catalog "meldra" (FILE storage) and grant CATALOG_MANAGE_CONTENT to service_admin
# 2. backend on :8001 against Polaris, and the frontend on :5173
ENVIRONMENT=development python3 e2e/lakehouse/live_backend.py > e2e/lakehouse/.out/backend.log 2>&1 &
VITE_API_URL=http://localhost:8001 npx vite --port 5173 &
# 3. the test (E2E_BIG_CSV: optional large CSV uploaded through the browser)
E2E_BIG_CSV=/path/to/big.csv PLAYWRIGHT_MODULE=$(npm root -g)/playwright/index.mjs node e2e/lakehouse/live.mjs
```

It checks, in 29 steps:
- A large CSV (tested with 5,000,000 rows / 203 MB) is uploaded through the browser into Iceberg and queried.
- The sample company is stored in the lakehouse.
- Parity: 12 kinds of answer give exactly the same numbers from the lakehouse as from the browser engine (ratios, lookups, splits, rolling windows, period comparison, filters, share, min/max, totals, cross-source).
- Charts named in a prompt, an AI-designed report (combo, treemap, funnel, area, heatmap, KPI), and the rule-based report when the AI is unavailable.
- Excel export and the dashboard.
- A fresh browser gets everything back from the lakehouse, with links suggested by the server.
- Edits are saved, and deletes remove the tables.
