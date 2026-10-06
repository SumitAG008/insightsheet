---
title: Reconcile two files
summary: Match two files on a key column, compare their amounts and download a report of matches, differences and missing items.
category: Spreadsheets and analysis
order: 3
updated: 2026-10-06
---

Reconciliation compares two files, such as a bank statement and a ledger, or a supplier statement and your purchase ledger. It matches rows on a key, such as an invoice number, and compares the amounts.

## Reconcile two files

1. In the navigation bar, open the **File Analysis** menu and select **Reconciliation**.
2. Under **Upload 2 files**, choose the **Left file** and the **Right file**. You can use `.xlsx`, `.xls`, `.csv` or `.tsv` files.
3. Under **Mapping**, set the four columns:
   - **Left key column** and **Right key column**: the column that identifies each item in each file, for example "Invoice Number" and "Invoice No".
   - **Left amount column** and **Right amount column**: the amounts to compare, for example "Total" and "Amount".
4. Optional: set a **Tolerance**, for example 0.01. A difference within the tolerance counts as a match. The default is 0.
5. Select **Preview** to see the counts and totals.
6. Select **Reconcile & Download**. Your browser downloads `reconciliation_report.xlsx`.

The buttons stay greyed out until both files and all four columns are set.

### Choose the columns

- **CSV and TSV files:** meldra reads the header row in your browser and shows the column names as buttons. Select one. Up to 24 columns are shown.
- **Excel files:** type each column name as it appears in the file. Capital letters and extra spaces do not matter.

## How matching works

Select **How this works** for a short summary on screen. In detail:

1. Spaces at the start and end of each key are removed. Keys must otherwise match exactly.
2. Amounts are read as numbers. Commas and the symbols $, £, € and ₹ are ignored, and amounts in brackets are negative.
3. If a key appears more than once in a file, its amounts are added together.
4. For each key, meldra works out the variance: the left amount minus the right amount.
5. Each key gets one status.

| Status | Meaning |
|---|---|
| **Matched** | The key is in both files and the variance is within the tolerance. |
| **Mismatch** | The key is in both files but the variance is larger than the tolerance. |
| **Missing left** | The key is only in the right file. |
| **Missing right** | The key is only in the left file. |

> **Important:** For Excel workbooks, only the first sheet of each file is used. Put the data you want to reconcile on the first sheet.

## Read the preview

The **Preview** shows how many keys are **Matched**, **Mismatch**, **Missing left** and **Missing right**, and the **Total keys**.

Under that, **Left total** and **Right total** add up all amounts in each file, and **Variance total** is the sum of all variances.

Changing a file, a column or the tolerance clears the preview.

## The report

The downloaded workbook has four sheets:

| Sheet | What it lists |
|---|---|
| **Summary** | Every key, with its left amount, right amount, variance and status. |
| **Mismatches** | Keys in both files whose amounts differ by more than the tolerance. |
| **Missing_On_Left** | Keys found only in the right file. |
| **Missing_On_Right** | Keys found only in the left file. |

## Where your data goes

Both files are sent to meldra's server and processed in memory. They are not stored, and no AI is used.

Each **Reconcile & Download** counts as one conversion and file job and adds the size of both files to your monthly uploads. **Preview** does not count towards either. See [Plans and limits](/help/plans-and-limits).

## Troubleshooting

| Problem | What to do |
|---|---|
| "Missing columns: …" | A column name does not match the file. Check the spelling, or pick the column from the buttons for CSV files. |
| Items you expect to match show as missing | Check the keys look the same in both files. For example, "INV-001" and "INV001" do not match. |
| Number keys do not match | If a number key column has empty cells, keys can be read as, for example, 1001.0 and not match 1001 in the other file. Fill or remove the empty rows, or format the keys as text. |
| Your key column is not among the buttons | Only the first 24 columns are shown. Move the column nearer the start of the file. |
| "Each file must be <= … MB" | A file is larger than your plan allows. See [Plans and limits](/help/plans-and-limits). |

## Next steps

- [Clean and standardise data](/help/clean-and-standardise-data)
- [Start a task with Ask meldra](/help/ask-meldra)
