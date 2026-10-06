---
title: Analyse a file
summary: Upload an Excel or CSV file to get an AI summary, a data quality score, outliers, missing values and recommendations for each sheet.
category: Spreadsheets and analysis
order: 1
updated: 2026-10-06
---

The File Analyzer gives you a quick picture of a spreadsheet before you work with it: what the data is, how complete it is and where the problems are.

## Analyse a file

1. In the navigation bar, open the **File Analysis** menu and select **Analyzer**.
2. Under **Upload Your File**, drop your file on the box, or select the box to browse. You can use `.xlsx`, `.xls` or `.csv` files.
3. Check the file name and size shown in the box. To choose another file, select **Remove File**.
4. Select **Analyze File**. The button shows **Analyzing File…** while meldra works.

When the analysis is ready, a message confirms "File analyzed successfully!" and the results appear under the upload box.

The largest file you can analyse depends on your plan. See [Plans and limits](/help/plans-and-limits).

## Read the results

### Overview

The first **Overview** card shows:

- **File Type**, such as XLSX or CSV;
- **Sheets**, the number of sheets;
- **Total Rows**, the rows analysed across all sheets;
- **Data Quality Score (ML)**, the average of the sheet scores, out of 100.

The second **Overview** card is written by the AI from the first sheet. It shows the **Data Type** (for example sales or inventory data), a short **Summary** and **Key Insights**.

### Each sheet

Each sheet has its own card, headed with the sheet name and its rows and columns. It can show:

| Section | What it tells you |
|---|---|
| **Data quality** | A score out of 100. It starts at 100 and goes down for missing values, duplicate rows and outliers. |
| **Outliers (IQR)** | Number columns with unusually high or low values, how many, and up to three examples. |
| **Data Quality Issues** | Missing values, duplicate rows and outliers. A column that is more than half empty is shown in red. |
| **Columns** | The first 10 columns, each with its type and the percentage of values missing. |
| **Recommendations** | Suggested next actions, such as removing duplicate rows or filling columns that are more than half empty. |

> **Note:** meldra analyses the first 1,000 rows of each sheet. **Total Rows** and the row count on each sheet card count only those rows, so a larger file shows 1,000 rows per sheet.

## Where your data goes

- Your file is sent to meldra's server and analysed in memory. It is not stored.
- For the AI summary, meldra sends the sheet name, the column names and types, and the first five rows of each sheet to meldra's AI.
- The data quality score, outliers, issues and recommendations are worked out on meldra's server without AI.
- Results are shown on the page only. They are cleared when you leave the page.

## Troubleshooting

| Problem | What to do |
|---|---|
| "Please upload an Excel or CSV file" | Choose a `.xlsx`, `.xls` or `.csv` file. |
| **Backend Connection Required:** | meldra's server cannot be reached. Try again in a few minutes. |
| "File size (… MB) exceeds … MB limit" | Your file is larger than your plan allows. Split it, or see [Plans and limits](/help/plans-and-limits). |
| The AI summary says "Unable to generate AI summary" | The AI was not available. The other results are still correct. Select **Analyze File** again later for the summary. |

## Next steps

- [Clean and standardise data](/help/clean-and-standardise-data)
- [Use the AI Assistant with your files](/help/ai-assistant-chat)
