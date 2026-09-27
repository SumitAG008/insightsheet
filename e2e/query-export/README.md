# Query panel and report downloads: end-to-end test

The real Unified Reporting UI and the real backend. It checks, in 30 steps:
- **Query panel** on an answer: each series with its table, system, column, calculation and filters;
  the lookup (`expenses.employee_id → employees.employee_id`) and the join on department; the SQL.
- **Running the SQL** gives the numbers shown in the answer, in the browser (SQLite) or in the lakehouse (DuckDB).
- **Editing the SQL**: an edited query runs, its result replaces the chart and downloads with its own columns;
  a non-SELECT is refused; a wrong column gives the database's error; "Back to Meldra's query" restores the answer.
- **Downloads** of a report built from one prompt as **PDF, PowerPoint, Word and Excel**, opened with PyMuPDF,
  python-pptx, python-docx, openpyxl and LibreOffice (`check_files.py`): pages/slides per chart, titles,
  native editable charts in PowerPoint, data tables in Word, one sheet per chart in Excel. The dashboard as PowerPoint.

```bash
# backend on :8001 (lakehouse off → browser mode; LAKEHOUSE_CATALOG=sql or Polaris → lakehouse mode), frontend on :5173
LAKEHOUSE_CATALOG=none ENVIRONMENT=development python3 e2e/lakehouse/live_backend.py &
VITE_API_URL=http://localhost:8001 npx vite --port 5173 &
PLAYWRIGHT_MODULE=$(npm root -g)/playwright/index.mjs node e2e/query-export/run.mjs   # writes RESULTS-browser.md

LAKEHOUSE_CATALOG=sql LAKEHOUSE_WAREHOUSE=file:///tmp/wh ENVIRONMENT=development python3 e2e/lakehouse/live_backend.py &
PLAYWRIGHT_MODULE=$(npm root -g)/playwright/index.mjs node e2e/query-export/run.mjs   # writes RESULTS-lakehouse.md
```

Needs Python packages `pymupdf python-pptx python-docx openpyxl` and LibreOffice (impress, writer) for `check_files.py`.
The fixture for the backend SQL test is regenerated with `npx vite-node e2e/sql/make_fixture.mjs`.
