---
title: Build and run an agentic workflow
summary: Set out your own list of analyse, clean, transform, calculate and report steps and run them in order on a spreadsheet.
category: AI assistant
order: 3
updated: 2026-10-06
---

Agentic Workflows lets you choose the steps yourself, instead of letting the AI plan them. You list the steps, describe each one and run them in order on a spreadsheet you loaded on the Dashboard.

> **Important:** Agentic Workflows (Beta) is in private beta. It is not available on most accounts. If your account does not have access, the page shows "Agentic Workflows is in private beta" and takes you back to the Dashboard. For the same kind of task, use the [AI Assistant](/help/ai-assistant-chat).

## Unlock the module

If your account is in the beta, open the **AI Assistant** menu and select **Agentic Workflows (Beta)**.

The module is locked until you redeem a feature key. The status next to **Refresh Access** shows **Locked** or **Enabled**.

1. Ask your administrator or meldra support for a feature key. Keys start with `fk_`.
2. Paste the key under **Unlock with feature key**.
3. Select **Redeem**. A message confirms "Access granted" and the status changes to **Enabled**.

If you were given access another way, select **Refresh Access** to check again.

## Load your data

Workflows run on a spreadsheet only. Load a CSV or Excel file on the Dashboard first, in the same browser tab, then open Agentic Workflows. If no data is loaded, the page shows "No dataset found. Upload a CSV/XLSX in Dashboard first, then come back here."

See [Start a task with Ask meldra](/help/ask-meldra) for how to load a spreadsheet on the Dashboard.

## Build the workflow

The workflow starts with **Step 1**, an **Analyze** step.

1. For each step, choose what it does: **Analyze**, **Clean**, **Transform**, **Calculate** or **Report**.
2. In the box, describe what the step should do.
3. Select **Add Step** to add another step at the end.
4. Select **Remove** to delete a step. The last remaining step cannot be removed.

Steps with an empty description are skipped when the workflow runs.

| Step | What it does | Where it runs |
|---|---|---|
| **Analyze** | Asks the AI for insights on a sample of your data, guided by your description. | Up to 20 rows and 30 columns are sent to meldra's AI. |
| **Clean** | Removes duplicate rows, trims spaces, and fills empty cells with the column's median (numbers) or most common value (text). Your description is not used. | In your browser. |
| **Transform** | Asks the AI for a new column made from two existing columns, following your description, then adds it. | Column names and the first 15 rows are sent to meldra's AI. The column is added in your browser. |
| **Calculate** | Works out the average, minimum, maximum and count of each number column. Your description is not used. | In your browser. |
| **Report** | Asks the AI for a written summary, guided by your description. | Column names and the row count are sent to meldra's AI. |

## Run the workflow

1. Select **Run Workflow**. The button shows **Running…** until every step is done.
2. Read the results. The panel shows **Run status: completed** (or **Error**) and one line per step, such as "1. analyze — ok", with its output under it.

Each step works on the data as the previous step left it. For example, a **Calculate** step after a **Clean** step uses the cleaned data.

> **Important:** **Clean** and **Transform** steps change the data loaded in this browser tab, and the Dashboard then shows the changed data too. Keep a copy of your original file.

## Good to know

- Workflows are not saved. If you leave or refresh the page, your steps are lost.
- Workflows run only when you select **Run Workflow**. They cannot be scheduled.
- Each **Analyze** and **Report** step uses one AI question from your monthly allowance. See [Plans and limits](/help/plans-and-limits).

## Next steps

- [Use the AI Assistant with your files](/help/ai-assistant-chat)
- [Clean and standardise data](/help/clean-and-standardise-data)
