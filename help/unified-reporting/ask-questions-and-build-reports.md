---
title: Ask questions and build reports
summary: Ask in plain English and get a chart, a written answer and the sources behind every number, or build a whole report from one prompt.
category: Unified Reporting
order: 3
updated: 2026-10-05
---

This article shows how to ask questions across your sources, refine the answers and build a multi-chart report from one prompt. You need at least one source first. See [Add your data](/help/add-your-data).

## Choose what to do with your prompt

Above the prompt box on the **Ask** tab there are two options:

| Option | What you get |
|---|---|
| **Ask a question** | One answer: a chart, a short written answer and the systems behind it. |
| **Build a report** | Up to six charts designed around your request, with a title and summary. |

## Ask a question

1. Open the **Ask** tab.
2. Select **Ask a question**.
3. Type your question, for example "expenses by department" or "revenue by month". Name the numbers and the breakdown you want.
4. Press Enter, or select the arrow button. Use Shift + Enter for a new line.

> **Tip:** Not sure where to start? Select one of the suggested questions. They are built from your own columns. After your first question, more appear under **Try asking**.

If your question could mean more than one thing, meldra asks one short question and offers options. Select the option that fits.

### Read the answer

Each answer shows:

- a title and a chart;
- a short written answer;
- the systems used, with row counts, such as "SuccessFactors · 1,240 rows";
- labels such as **Joined on department** when sources were combined, or **Ratios calculated after totals**.

### Ask a follow-up

Select one of the follow-up questions under the answer, or type a new one. meldra takes your previous question into account, so short follow-ups such as "and by month?" work.

## Change the chart

Use the chart buttons at the top right of the answer. The types offered depend on the data. They can include **Bar**, **Line**, **Area**, **Bar + line**, **Table**, **Pie**, **Treemap**, **Funnel**, **Radar**, **Bubble**, **Total**, **Heatmap** and **Waterfall**.

## Filter and analyse an answer

Under the answer title there is a bar of filters and analysis options.

### Add a filter

1. Select **Add filter**.
2. Choose a **Column…**.
3. Choose the condition: **is** or **is not**. For month you can also choose **from** or **up to**.
4. Choose a **Value…**.
5. Select **Apply**.

Remove a filter with the cross on its label. A filter applies only to sources that have that column.

### Analysis options

| Option | When it appears | What it does |
|---|---|---|
| **Split by** | One number, broken down by something | Adds a second breakdown. The 8 largest values are shown and the rest are added up as Other. |
| **Compare with** | Broken down by month | **Same month last year** or **Previous month**. |
| **Rolling** | Broken down by month | **3 months**, **6 months** or **12 months** rolling totals. |
| **% of total** | Most answers | Shows each group as a share of the total of all groups. |

The written answer is rewritten each time you change a filter or option.

## See where the numbers come from

Select **Query: SQL, columns, joins** under an answer. You see:

- **Where the numbers come from**: each number, its source and system, filters and any lookups.
- **Tables, columns and joins**: the table, column, calculation and rows kept for each series.
- **SQL**: the query that gives the numbers.
- **Report definition (JSON)**: the chart definition, which you can edit and run with **Run edited definition**.

### Write your own SQL

1. In the SQL box, change the query. Select **Tables you can query** to see every source and its columns.
2. Select **Run SQL**, or press Ctrl + Enter.
3. Check the result table.
4. Select **Use this result in the chart**.

To return to meldra's query, select **Back to meldra's query**. To discard unsaved changes, select **Undo edits**.

> **Note:** Only SELECT queries can be run, one at a time. They read your data and never change it. The result preview shows the first 5,000 rows.

## Build a report

1. On the **Ask** tab, select **Build a report**.
2. Describe the report, for example "Board pack on workforce cost and revenue by department, last 12 months".
3. Press Enter.

meldra designs up to six charts with a title and summary. Each chart has its own chart buttons and **Query** panel.

- Select **Add all to dashboard** to pin every chart.
- Select **Download report** to save it as PDF, PowerPoint, Word or Excel.

## How answers are made

meldra's AI plans each chart from your column names and a description of your data. It does not read your rows. If the AI is not available, built-in rules answer instead. Open **Query: SQL, columns, joins** to see which method was used. See [Your data and privacy](/help/your-data-and-privacy).

## Next steps

- [Dashboards and downloads](/help/dashboards-and-downloads)
- [Unified Reporting troubleshooting](/help/unified-reporting-troubleshooting)
