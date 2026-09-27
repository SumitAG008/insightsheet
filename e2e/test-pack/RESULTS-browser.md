# Unified Reporting test pack: results (browser mode)

Run 2026-09-27 19:33 UTC against http://localhost:5173, data kept in the browser (lakehouse off).
**17 of 17 checks passed.** Files: employees.csv, expenses.csv, budget.xlsx, opportunities.xlsx (public/unified-reporting-test-pack).

| # | Check | Result | Detail |
|---|---|---|---|
| 1 | with one source, the Ask tab says unified reporting needs another system | PASS |  |
| 2 | progress is shown while files load | PASS | Reading employees.csv… → Reading expenses.csv (1 of 3)… → Reading budget.xlsx (2 of 3)… |
| 3 | source employees: 24 rows | PASS | 24 rows |
| 4 | source expenses: 90 rows | PASS | 90 rows |
| 5 | source budget: 30 rows | PASS | 30 rows |
| 6 | source opportunities: 40 rows | PASS | 40 rows |
| 7 | link suggested and accepted: expenses.employee_id → employees.employee_id | PASS |  |
| 8 | link suggested and accepted: opportunities.owner_employee_id → employees.employee_id | PASS |  |
| 9 | shared dimensions include department and month | PASS | department, month |
| 10 | Q1 "expenses amount by department" | PASS | 5 rows identical to the expected answer |
| 11 | Q2 "expenses amount vs budget amount by department" | PASS | 5 rows identical to the expected answer |
| 12 | Q3 "expenses amount vs budget amount by month" | PASS | 6 rows identical to the expected answer |
| 13 | Q4 "opportunities amount by department" | PASS | 3 rows identical to the expected answer |
| 14 | Q5 "active employees salary by department" | PASS | 5 rows identical to the expected answer |
| 15 | report "Department cost and pipeline report" built from one prompt | PASS | 6 charts from employees, expenses, budget, opportunities |
| 16 | removing a source clears the answers built on it (no "data removed" leftovers) | PASS | 6 → 3 answers, 0 "removed" messages |
| 17 | no browser errors | PASS |  |

## Answers compared with the expected numbers

### Q1. `expenses amount by department` (Concur + SuccessFactors (link)): identical
Expenses only have an employee ID; the department comes from HR through the link.

|  | amount: expected | amount: Meldra |
| --- | --- | --- |
| Engineering | £7,702.42 | £7,702.42 |
| Finance | £6,880.92 | £6,880.92 |
| Operations | £6,077.94 | £6,077.94 |
| People | £11,878.95 | £11,878.95 |
| Sales | £10,530.39 | £10,530.39 |

### Q2. `expenses amount vs budget amount by department` (Concur + SuccessFactors + Finance): identical
Actual spend (via the HR link) against the budget file, joined on department.

|  | expenses: expected | budget: expected | expenses: Meldra | budget: Meldra |
| --- | --- | --- | --- | --- |
| Sales | £10,530.39 | £17,100.00 | £10,530.39 | £17,100.00 |
| Engineering | £7,702.42 | £20,100.00 | £7,702.42 | £20,100.00 |
| Finance | £6,880.92 | £23,100.00 | £6,880.92 | £23,100.00 |
| People | £11,878.95 | £26,100.00 | £11,878.95 | £26,100.00 |
| Operations | £6,077.94 | £29,100.00 | £6,077.94 | £29,100.00 |

### Q3. `expenses amount vs budget amount by month` (Concur + Finance): identical
Two systems on a shared calendar: claim dates (dd/mm/yyyy) and budget months line up as months.

|  | expenses: expected | budget: expected | expenses: Meldra | budget: Meldra |
| --- | --- | --- | --- | --- |
| 2026-01 | £6,169.93 | £18,000.00 | £6,169.93 | £18,000.00 |
| 2026-02 | £4,623.97 | £18,500.00 | £4,623.97 | £18,500.00 |
| 2026-03 | £6,327.94 | £19,000.00 | £6,327.94 | £19,000.00 |
| 2026-04 | £9,815.95 | £19,500.00 | £9,815.95 | £19,500.00 |
| 2026-05 | £10,641.40 | £20,000.00 | £10,641.40 | £20,000.00 |
| 2026-06 | £5,491.43 | £20,500.00 | £5,491.43 | £20,500.00 |

### Q4. `opportunities amount by department` (Salesforce + SuccessFactors (link)): identical
Pipeline by the owner's department, looked up in HR.

|  | amount: expected | amount: Meldra |
| --- | --- | --- |
| Finance | £871,000.00 | £871,000.00 |
| Operations | £915,000.00 | £915,000.00 |
| Sales | £731,000.00 | £731,000.00 |

### Q5. `active employees salary by department` (SuccessFactors): identical
One system, with a filter (Status is Active) taken from the question.

|  | salary: expected | salary: Meldra |
| --- | --- | --- |
| Engineering | £285,000.00 | £285,000.00 |
| Finance | £194,500.00 | £194,500.00 |
| Operations | £144,000.00 | £144,000.00 |
| People | £260,000.00 | £260,000.00 |
| Sales | £237,500.00 | £237,500.00 |
