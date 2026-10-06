# Real multi-source test

Three real systems are brought into meldra through the UI, stored in the lakehouse
(Iceberg on Apache Polaris), linked, and asked questions across them. Every number is
checked against an independent calculation straight from the source systems.

| System | What it is | How it enters meldra |
|---|---|---|
| Spreadsheet | `team_budgets.xlsx`: team, department, budget | Upload |
| Database | PostgreSQL 16 `it_finance`: software usage per team, 540 licence invoices; read-only user | Connect a database (two tables) |
| Live API | npm registry search (registry.npmjs.org), 2 pages of 50 | Connect an API (offset paging `from` / `size`) |

The sources share real values: the database uses package names read from the live API, and the database
and workbook share team codes.

```bash
python3 e2e/multisource/setup_sources.py /tmp/meldra-multisource   # PostgreSQL on :5433, the workbook, sources.json
# Polaris, the backend on :8001 (lakehouse on, real AI path) and the frontend on :5173, as in e2e/lakehouse/README.md.
# Behind a TLS-inspecting proxy also set CONNECTOR_EGRESS_PROXY and CONNECTOR_CA_BUNDLE.
ENVIRONMENT=development E2E_STUB_AI=0 python3 e2e/lakehouse/live_backend.py &
node e2e/multisource/live.mjs
```

It checks, in 16 steps:
- The three sources arrive as Iceberg tables.
- The lakehouse suggests the team_code links.
- `package_name` is shared by the database and the API.
- Licence cost by department (database joined to the workbook) matches PostgreSQL plus the workbook to the penny.
- Cost against budget by department matches both sources.
- Seats against live monthly downloads per package matches PostgreSQL and a separate call to npm.
- Invoices by month match PostgreSQL, and the prior-month comparison works.
- A report built from one prompt uses all three systems.
- A fresh browser gets every source back.
