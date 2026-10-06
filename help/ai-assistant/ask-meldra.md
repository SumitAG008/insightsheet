---
title: Start a task with Ask meldra
summary: Describe what you want in your own words, and meldra picks the tools, sets them up with your files and lets you check everything before it runs.
category: AI assistant
order: 1
updated: 2026-10-06
---

Ask meldra turns a request in plain words into a short plan of meldra tools. It opens each tool with your files and instructions already in place, and nothing runs until you press the tool's own button. This article also covers the Dashboard, where Ask meldra sits.

## Open Ask meldra

You can open Ask meldra in two ways when you are signed in.

- **From the Dashboard.** Before you load a spreadsheet, the Dashboard opens with **What do you want to get done?** and the Ask meldra box under it.
- **From any page.** Press Ctrl + K (⌘ + K on a Mac). The tool search opens. Select **Ask meldra**, the first item in the list.

In the tool search, if you type four words or more, **Ask meldra** is selected for you, so pressing Enter opens it with your words already filled in. Select **Back to tool search** to return to the list of tools.

## Ask for what you need

1. Describe the task in the box, for example "Compare my bank statement with the ledger and show what doesn't match". You can write up to 1,000 characters.
2. To add files, select **Attach**, or drag files onto the box. You can attach up to 10 files. To take one off, select the cross next to its name.
3. Press Enter, or select the arrow button.

In the tool search, you can also select one of the example requests under the box to start from.

> **Note:** To plan the task, meldra sees your words, the names and types of attached files, and the column headings of attached spreadsheets. Headings are read in your browser from the first row of the first sheet (up to 40) of CSV, TSV, TXT and Excel files. File contents stay with you until you run a tool.

## Read the reply

meldra replies in one of three ways.

| Reply | What you see |
|---|---|
| A plan | One to four numbered steps. Each shows the tool, a line on what it does for you, the instruction meldra wrote for it (if the tool has an instruction box) and which of your files it uses. |
| A question | A short question in an amber box. Type in **Your answer** and select **Continue**. meldra plans again with your answer added. |
| An answer | A short written answer, when you asked about meldra itself rather than for a task. |

If the plan says "(best match from search)", meldra's AI was not available and the tool was chosen by keyword search instead.

## Open each step and review

1. Select **Open** next to the first step. meldra takes you to that tool.
2. Wait a moment while a banner at the bottom of the page, **Ask meldra** and the tool name, sets up your request.
3. Read the banner:
   - **Added** lists the files placed in the tool's upload boxes.
   - "Add … on this page yourself; it didn't fit its upload box" lists any file you need to add by hand.
   - **Instruction filled in. Check it, then run.** means meldra wrote your instruction into the tool's box. If the tool has no instruction box, the banner shows your instruction so you can act on it.
4. Check the files, options and instruction on the page.
5. Run the tool with its own button when you are happy.

Nothing runs automatically. Close the banner with the cross when you are done.

> **Important:** Steps are not chained for you. When a plan has more than one step, each later step says "Uses what step 1 gives you". Download the result of one step, then go back and open the next step and add that result.

The request is held in this browser tab only, and only for five minutes. If you refresh the page or open the tool later, it starts clean.

## Find a tool by name

To go straight to a tool, press Ctrl + K (⌘ + K on a Mac) and type a few words, such as "pdf", "rename" or "charts".

- With an empty box, the list shows **Suggested for you**, ranked from your recent and routine use.
- Use the arrow keys to move and Enter to open a tool. Press Esc to close.
- If meldra's server cannot be reached, the search runs in your browser instead.

When you open a tool from the search or from a plan, meldra keeps the first 100 characters of your words and the tool you chose. It uses them to rank that tool higher next time.

## Use the Dashboard

The Dashboard is the home page. Before you load data it shows Ask meldra, **Suggested for you**, **Templates** and an upload box.

### Load a spreadsheet

1. Drop a CSV or Excel file (`.csv`, `.xlsx` or `.xls`) on the upload box, or select **browse files**.
2. Or select **Templates** and choose a template, then **Use Template**, to try sample data.

The largest file you can load depends on your plan. See [Plans and limits](/help/plans-and-limits).

The spreadsheet is read in your browser and kept for this browser tab only. If you upload an Excel file, a copy is also sent to meldra's server to check its structure and charts for the **Overview** tab.

### Work with your data

Once a spreadsheet is loaded, the Dashboard has four tabs.

| Tab | What it holds |
|---|---|
| **Overview** | Charts and an automatic summary of the data, and a log of what you have done. |
| **Analysis & Cleaning** | **Advanced Filter & Search**, **Smart Cleaning Tools**, **Smart Data Validation**, **AI Analysis** and **Enhanced Charts**. |
| **Transform Data** | **Data Transform** and **Smart Formula Builder**. |
| **AI Tools** | **AI Assistant**: describe an operation in plain words. With **Apply to data** on, it tries to add a new column built from two existing columns. Otherwise it explains how to do the operation. |

For a workbook with several sheets, select a sheet name under the file name to switch sheets.

The AI features on these tabs send your column names and a small sample of rows (up to 20) to meldra's AI.

### Undo, save, export and clear

- Use the undo and redo buttons to step back through up to 50 changes.
- Select **Save** to keep the current data for this browser tab.
- Select **Export**, then **Export as PDF**, **Export as Excel (.xlsx)** or **Export as CSV**.
- Select **Clear All** to remove the data and start again.

## Next steps

- [Use the AI Assistant with your files](/help/ai-assistant-chat)
- [Reconcile two files](/help/reconcile-two-files)
- [Your data and privacy](/help/your-data-and-privacy)
