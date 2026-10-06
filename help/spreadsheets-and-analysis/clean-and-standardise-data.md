---
title: Clean and standardise data
summary: Remove duplicate rows, tidy column headers and turn text numbers and dates into real values, then download a clean Excel workbook.
category: Spreadsheets and analysis
order: 2
updated: 2026-10-06
---

Auto-Standardize cleans a messy spreadsheet in one go. It follows fixed rules, not AI, so the same file and options always give the same result.

## Clean a file

1. In the navigation bar, open the **File Analysis** menu and select **Auto-Standardize**.
2. Under **Upload**, choose your file. You can use `.xlsx`, `.xls`, `.csv` or `.tsv` files.
3. Tick the options you want. All four are ticked to start with.
4. Select **Preview changes** to see what will change. The button shows **Previewing…** while meldra works.
5. Select **Standardize & Download**. The button shows **Standardizing…**, then your browser downloads the clean workbook.

The download is an Excel file named `standardized_` followed by your file name, for example `standardized_sales.xlsx`. It has one sheet, **Standardized**.

> **Important:** For Excel workbooks, only the first sheet is cleaned. Other sheets are not included in the download. To clean another sheet, move it to the front of the workbook, or save it as a CSV file.

## The options

| Option | What it does | Example |
|---|---|---|
| **Remove duplicate rows** | Removes rows that exactly match an earlier row, after the other changes. | Two identical order lines become one. |
| **Normalize headers** | Makes headers lower case, replaces spaces with underscores, removes other symbols and makes every header unique. | "Invoice Date" becomes `invoice_date`. |
| **Parse numbers** | Turns text such as currency amounts into numbers. Commas, the symbols $, £, € and ₹, and % signs are removed. Brackets mean a negative number. | "(1,234.50)" becomes -1234.5. "15%" becomes 15. |
| **Parse dates** | Turns text dates such as 2024-03-01 or 01/03/2024 into real dates. | "2024-03-01" becomes a date. |

Spaces at the start and end of text are always removed.

**Parse numbers** and **Parse dates** only change a column when most of its first 30 filled values look like numbers or dates.

> **Important:** Dates written day first, such as 03/04/2024 for 3 April, may be read month first. Values in a date column that cannot be read as a date are left empty. Preview the download and check your dates, or untick **Parse dates** if the column must stay as it is.

## Read the preview

The **Preview** shows three figures:

- **Rows**: the number of rows before and after;
- **Columns**: the number of columns before and after;
- **Duplicates removed**: how many rows were dropped as duplicates.

Changing the file or any option clears the preview, so select **Preview changes** again.

## Where your data goes

Your file is sent to meldra's server and processed in memory. It is not stored, and no AI is used.

Each **Standardize & Download** counts as one conversion and file job and adds the file's size to your monthly uploads. **Preview changes** does not count towards either. See [Plans and limits](/help/plans-and-limits).

## Troubleshooting

| Problem | What to do |
|---|---|
| The buttons are greyed out | Choose a file first. |
| "File size exceeds … MB limit" | Your file is larger than your plan allows. Split it, or see [Plans and limits](/help/plans-and-limits). |
| "Please verify your email address to use this feature" | Verify your email address using the link we sent when you signed up. |
| "You have used all … conversions for this month" | Your allowance resets on the 1st, or you can upgrade your plan. |

## Next steps

- [Analyse a file](/help/analyse-a-file)
- [Reconcile two files](/help/reconcile-two-files)
