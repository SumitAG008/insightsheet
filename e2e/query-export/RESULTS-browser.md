# Query panel and report downloads: results (browser mode)

Run 2026-09-27 20:50 UTC against http://localhost:5173; data kept in the browser, SQL run by SQLite (sql.js).
**30 of 30 checks passed.**

| # | Check | Result | Detail |
|---|---|---|---|
| 1 | Query panel lists each series with its table, system, column and calculation | PASS | Headcount	employees (SuccessFactors)	*	COUNT rows	status = Active / Salaries	employees (SuccessFactors)	salary	SUM of salary	status = Active |
| 2 | Query panel explains the joins (lookup through a link and the join on the breakdown) | PASS |  |
| 3 | SQL shows the LEFT JOIN lookup and the join on department | PASS |  |
| 4 | Tables you can query lists every source with its columns | PASS |  |
| 5 | the SQL runs in the browser (SQLite) | PASS | 6 rows · ran in this browser · 98 ms |
| 6 | running the SQL gives the numbers shown in the answer | PASS | HR/7/£521K ; Finance/11/£724K ; Support/23/£1.8M |
| 7 | edited SQL runs and shows its rows | PASS | level	headcount	avg_salary / L3	38	74232.97368421052 |
| 8 | the chart now shows the custom SQL result | PASS |  |
| 9 | the custom SQL answer downloads with its own columns | PASS | level,headcount,avg_salary |
| 10 | a non-SELECT statement is refused with a clear message | PASS |  |
| 11 | a wrong column gives the database error | PASS | no such column: nope |
| 12 | "Back to Meldra's query" restores the original answer | PASS |  |
| 13 | report built from one prompt | PASS | 6 charts |
| 14 | each report chart has its Query panel with SQL | PASS |  |
| 15 | report downloads as PDF | PASS | browser-workforce-cost-and-revenue.pdf, 220 KB, 6.5s |
| 16 | report downloads as PowerPoint | PASS | browser-workforce-cost-and-revenue.pptx, 298 KB, 5.6s |
| 17 | report downloads as Word | PASS | browser-workforce-cost-and-revenue.docx, 251 KB, 5.6s |
| 18 | report downloads as Excel | PASS | browser-workforce-cost-and-revenue.xlsx, 30 KB, 0.4s |
| 19 | PDF: cover page plus one page per chart | PASS | 7 pages |
| 20 | PDF: every chart title is in the file | PASS |  |
| 21 | PDF: charts are embedded as pictures | PASS | 35 pictures |
| 22 | PowerPoint: title slide plus one slide per chart | PASS | 7 slides |
| 23 | PowerPoint: native, editable charts (not just pictures) | PASS | 2 native charts, 3 pictures |
| 24 | PowerPoint: every chart title on its slide | PASS |  |
| 25 | PowerPoint: opens in LibreOffice | PASS |  |
| 26 | Word: a heading and a data table per chart | PASS | 6 headings, 6 tables, 5 pictures |
| 27 | Word: opens in LibreOffice | PASS |  |
| 28 | Excel: contents sheet plus one sheet per chart | PASS | Contents, Headline, Cost per head by department, Supplier spend by category, Pipeline by stage, Orders by month, 3-month rol, Expenses by department and c |
| 29 | dashboard downloads as PowerPoint | PASS | browser-meldra-dashboard-2026-09-27.pptx |
| 30 | no browser errors | PASS |  |
