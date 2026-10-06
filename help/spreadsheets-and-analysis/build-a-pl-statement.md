---
title: Build a P&L statement
summary: Describe the profit and loss statement you need, or attach an Excel P&L, and download a formatted workbook with totals, formulas and a chart.
category: Spreadsheets and analysis
order: 4
updated: 2026-10-06
---

P&L Builder creates a profit and loss workbook in Excel. Start from a description, or attach a workbook that already holds a P&L so meldra can rebuild it with your figures.

## Build a P&L from a description

1. In the navigation bar, open the **File Analysis** menu and select **P&L Builder**.
2. Under **What kind of P&L statement do you need?**, describe the statement. Include the period and the lines you want, for example "Monthly P&L for 2024 with revenue, cost of goods sold and operating expenses". Or select one of the **Example Prompts**.
3. Optional: enter a **Company Name (Optional)** and choose the **Currency** and the **Period Type** (**Monthly**, **Quarterly** or **Yearly**).
4. Select **Generate P&L Statement**. The button shows **Generating P&L Statement…**.

Your browser downloads a file named `Profit_Loss_` followed by today's date.

meldra's AI reads your description, with the company name, currency and period type you chose, and decides the periods and the revenue and expense lines. The amounts are not made up: every amount starts at 0 for you to fill in.

## What the workbook contains

The workbook has one sheet, **Profit & Loss**:

- a title with the company name;
- a **Category** and a **Type** column, then one column per period and a **Total** column;
- a **REVENUE** section and a **Total Revenue** row;
- an **EXPENSES** section and a **Total Expenses** row;
- a **NET PROFIT / (LOSS)** row;
- a **Revenue vs Expenses** column chart under the table.

The total and net profit rows are Excel formulas, so they update when you type in your figures.

## Build a P&L from an existing workbook

If you already have a P&L or income statement in Excel, meldra can read its periods, lines and amounts.

1. Describe what you want in **What kind of P&L statement do you need?**. A description is always needed.
2. Under **Optional: attach a source document**, choose your `.xlsx` or `.xls` workbook.
3. Wait for the **Extraction Preview**. It runs as soon as you attach the file and shows:
   - **Periods detected** and **Line items detected**;
   - **Non-zero cells**, the number of amounts found;
   - **Confidence**, how sure meldra is that it found the right table;
   - a **Recommendation** and the main reason for it.
4. If meldra found more than one statement, choose the right one under **Choose detected statement**. Each choice shows the sheet, the layout, the number of periods and the number of items.
5. Optional: tick **Optional: AI assist (headers only)** to let the AI improve the order and grouping of the lines.
6. Select **Generate P&L Statement**.

Select **Refresh preview** to run the preview again.

The workbook uses the periods, lines and amounts from your file, in the same layout as above.

> **Note:** The file picker also accepts Word, PowerPoint, Markdown and PDF files, but meldra reads figures only from Excel workbooks. For other files the preview shows an error and the P&L is built from your description alone.

## Where your data goes

- **From a description:** your description, company name, currency and period type are sent to meldra's AI.
- **From a workbook:** your file is sent to meldra's server and read in memory. It is not stored. The amounts are read without AI. Your description is still sent to meldra's AI.
- **AI assist (headers only):** only the line and period labels are sent to the AI, never the amounts.

Each generated P&L uses one AI question from your monthly allowance. An attached file also counts towards your monthly uploads. See [Plans and limits](/help/plans-and-limits).

## Troubleshooting

| Problem | What to do |
|---|---|
| **Generate P&L Statement** is greyed out | Type a description first. |
| "Could not detect a P&L table in this workbook" | meldra could not find a statement with periods and amounts. Check the workbook has line names in one column and periods across the top or down the side. |
| "Could not confidently build a P&L from this upload (strict mode)" | Use the **Extraction Preview** to choose the right statement, then select **Generate P&L Statement** again. |
| **Backend Connection Required:** | meldra's server cannot be reached. Try again in a few minutes. |
| "You have used all … AI questions for this month" | Your allowance resets on the 1st, or you can upgrade your plan. |

## Next steps

- [Turn a spreadsheet into PowerPoint slides](/help/excel-to-powerpoint)
- [Analyse a file](/help/analyse-a-file)
