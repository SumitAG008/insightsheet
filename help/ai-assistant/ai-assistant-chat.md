---
title: Use the AI Assistant with your files
summary: Give the AI agent a task about a spreadsheet or document, follow the steps it runs and download its report.
category: AI assistant
order: 2
updated: 2026-10-06
---

The AI Assistant takes one task at a time, such as "Find data quality issues and suggest fixes". With a spreadsheet, it plans a few steps, runs them and writes a report. With a document, it reads the document and writes a report. It is not a back-and-forth chat: each task is a new run.

## Open the AI Assistant

In the navigation bar, open the **AI Assistant** menu and select **AI Assistant**. The page is headed **Agentic AI**.

## Add a file

Under **Upload Your Data File**, drop a file or select **browse files**. You can add:

- a spreadsheet: `.csv`, `.xlsx` or `.xls`;
- a document: `.docx`, `.pptx`, `.md` or `.pdf`.

The largest file you can add depends on your plan. See [Plans and limits](/help/plans-and-limits).

If you already loaded a spreadsheet on the Dashboard in this browser tab, the AI Assistant uses it. The page shows **Data Loaded**, the file name and the **Local tabular** label. A document shows **Document Loaded** and the **Server-ingested document** label.

To use a different file, select **Remove File**.

## Run a task

1. Under **What would you like the AI agent to do?**, describe the task. Or select one of the **Quick Examples:**.
2. Select **Deploy AI Agent**.
3. Wait while the button shows **Agent Running...**.

The agent starts as soon as you select **Deploy AI Agent**. There is no separate step to approve its plan.

## What happens with a spreadsheet

First the agent plans. Under **Agent Execution** you see **Understanding:**, **Estimated Time:**, **Confidence:** and the **Execution Plan:**.

Then it runs each step in order and shows **Executing Step 1 of 4** (with your numbers) and a progress bar. Each step is one of these:

| Step | What it does | Where it runs |
|---|---|---|
| Analyse | Asks the AI for insights on a sample of your data. | Up to 20 rows and 30 columns are sent to meldra's AI. |
| Clean | Removes duplicate rows, trims spaces, and fills empty cells with the column's median (numbers) or most common value (text). | In your browser. |
| Transform | Asks the AI for a new column made from two existing columns, then adds it. | Column names and the first 15 rows are sent to meldra's AI. The column is added in your browser. |
| Calculate | Works out the average, minimum, maximum and count of each number column. | In your browser. |
| Visualise | Notes the step. It does not draw a chart. | Not applicable. |
| Report | Asks the AI for a written summary. | Column names and the row count are sent to meldra's AI. |

To plan, the agent sends your task, the row and column counts, up to 40 column names and the first 3 rows to meldra's AI.

> **Important:** Clean and Transform steps change the data loaded in this browser tab. The Dashboard then shows the changed data too. Keep a copy of your original file.

## What happens with a document

The whole document is sent to meldra's server. Its text is read there and sent to meldra's AI provider with your task. The AI writes a single report with a summary, key insights, risks and recommended next actions. meldra does not keep the document.

## Read and download the results

When the run finishes you see **Task Completed Successfully!** and the **Execution Summary**:

- **Total Steps** and **Actions Taken**;
- **Detailed Results:**, the output of each step;
- **Final Report**, a summary written by the AI.

Then:

- Select **Download Report** to save everything as a Markdown (`.md`) file.
- Select **Run Another Task** to clear the results and start again.

## Recent runs

**Recent Agent Executions** lists your last five runs. Select one to see its results again.

> **Note:** Recent runs, including their results, are kept in this browser's storage. They are not sent to meldra, and they are not available on other devices.

## AI questions

Each call to the AI counts as one AI question in your monthly allowance. A spreadsheet run uses several: one for the plan, one for each Analyse and Report step, and one for the final report. A document run uses one, and the document counts towards your monthly uploads. See [Plans and limits](/help/plans-and-limits).

## Troubleshooting

| Problem | What to do |
|---|---|
| **Deploy AI Agent** is greyed out | Add a file and type a task first. |
| **Execution Error** with "Failed to generate execution plan" | The AI's plan was incomplete. Select **Try Again** and run the task again. |
| "Please verify your email address to use this feature" | Verify your email address using the link we sent when you signed up. |
| "You have used all … AI questions for this month" | Your allowance resets on the 1st, or you can upgrade your plan. |

## Next steps

- [Start a task with Ask meldra](/help/ask-meldra)
- [Analyse a file](/help/analyse-a-file)
- [Your data and privacy](/help/your-data-and-privacy)
