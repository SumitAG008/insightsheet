---
title: Map fields
summary: Check how each source column maps to a target field, use AI to refine the mapping, and fix any column by hand.
category: Migration
order: 3
updated: 2026-10-05
---

On the **Map fields** step you confirm which target field each column of your extract feeds. This article explains the automatic matching, the labels you see and how to change a mapping.

## How matching works

When you upload an extract, meldra maps every column in two passes:

1. **Rules.** meldra matches column names, known synonyms (for example "Given Name" or "Forename" for First name) and the shape of the values. This runs in your browser.
2. **AI.** meldra's AI then reads your tab and column names. It identifies what each tab holds and maps columns the rules could not place confidently. The AI sees only tab and column names, never employee values.

The AI never overwrites your own choices, choices from a profile, or confident rule matches.

## Read the summary

The bar at the top shows:

- how many columns are mapped across how many tabs;
- how many tabs are joined on the employee ID;
- how many lower-confidence matches are worth a look.

Under it, a message reports what the AI did, for example "AI identified 16 tabs and mapped 4 more columns". If the AI did not run, the message says why. The rule-based mapping is complete on its own.

## Read each tab

Each tab has a card. The header shows:

- the tab name;
- **AI:** and what the AI thinks the tab is, such as **AI: Job history** or **AI: Bank details**;
- how meldra will use the tab, such as **Worker data (one row per employee)**, **Job history (several rows per employee)** or **Department list**;
- how many columns are mapped, and the row count.

Select the header to collapse or expand the card.

The table lists each **Source column**, up to three **Sample values** and what it **Maps to**. Sample values are read from your file in the browser.

### Mapping labels

| Label | Meaning |
|---|---|
| **Auto · 92%** | Matched by the rules, with that confidence. |
| **AI · 80%** | Mapped by the AI, with that confidence. |
| **Set by you** | You chose this mapping. |
| **From profile** | Applied from a saved profile. |
| **Not used** | The column is not mapped to any field. |

Green labels are 85% or above. Amber labels are below 85% and are worth checking.

## Change a mapping

1. Find the column in its tab card.
2. Open the **Maps to** list.
3. Choose the right field. Fields are grouped, for example **Person**, **Contact**, **Address**, **Employment**, **Termination**, **Job**, **Organization**, **Finance**, **Compensation**, **One-time pay**, **Bank**, **Pension**, **Payroll results** and **Payroll balances**.
4. To leave a column out, choose **— Not used —**.

The label changes to **Set by you**, or to **Not used** if you left the column out. Your choice always wins over the rules and the AI.

> **Tip:** Map the employee ID on every employee tab. Tabs without it cannot be joined to the worker record.

## Run the AI again

Select **Refine with AI** at any time, for example after adding tabs. It keeps your own choices and confident matches.

## Next steps

When the mapping looks right, select **Next: Cleanse & validate**.

- [Cleanse and translate values](/help/cleanse-and-translate-values)
- [Reuse mappings across mock cycles](/help/reuse-mappings-across-mock-cycles)
