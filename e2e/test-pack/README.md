# Unified Reporting test pack

**Why several files:** unified reporting means answering questions that no single system can answer.
The pack has four exports from four systems that only make sense together:

| File | System | Joins the others through |
|---|---|---|
| `employees.csv` | SuccessFactors (HR) | Employee ID; its Department and Status |
| `expenses.csv` | Concur | Employee ID (the department comes from HR); claim date → month |
| `budget.xlsx` | Finance | Department and month |
| `opportunities.xlsx` | Salesforce | Owner Employee ID (the department comes from HR) |

The files and a step-by-step page with the expected answers are served by the app at
**`/unified-reporting-test-pack/README.html`** (linked under "Choose files" in Data sources).
They are generated with fixed seeds by `make_test_pack.py`, which also writes `expected.json`.

## Manual test (anyone can follow it)

1. Open Unified Reporting → Data sources and click Remove all data.
2. Choose files: select all four at once (Ctrl or ⌘ + click).
3. Accept the two suggested links.
4. Ask the five questions on the README page and compare the numbers.
5. Build a report with "Department cost and pipeline report".

## Automated run

```bash
node e2e/test-pack/run.mjs      # needs the frontend on :5173 and a backend on :8001 (see e2e/lakehouse/README.md)
```

The runner follows the same steps in the real UI, downloads each answer's CSV and compares every number.
It writes `RESULTS-browser.md` (lakehouse off) or `RESULTS-lakehouse.md` (lakehouse on).
Both are committed next to this file.
