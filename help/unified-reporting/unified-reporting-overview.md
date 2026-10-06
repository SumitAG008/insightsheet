---
title: Unified Reporting overview
summary: Combine exports from several systems and ask questions across them, with the sources behind every number.
category: Unified Reporting
order: 1
updated: 2026-10-05
---

Unified Reporting lets you ask one question across data from several systems. This article explains how it works, what each tab does and a typical way to use it.

## How it works

1. You add data: file exports, database tables, API pulls or the sample company. Each file, sheet or table becomes a **source**.
2. meldra finds columns that sources share, such as a department, an employee ID or a month. These are the **shared dimensions**.
3. meldra suggests **links** between sources. A link lets one source use another's columns. For example, expenses that only have an employee ID can be broken down by the employee's department.
4. You ask a question in plain English. meldra totals each source on its own, joins the totals and shows a chart, a short written answer and the systems each number came from.

## The three tabs

Open **Unified Reporting** from the navigation bar. The page has three tabs.

| Tab | What you do there |
|---|---|
| **Ask** | Ask questions or build a whole report from one prompt. Change chart types, add filters and open the query behind each chart. |
| **Dashboard** | Keep the charts you want to watch. Filter every tile at once and download the dashboard. |
| **Data sources** | Add, check and remove data. Choose how columns are used, rename join names and manage links between sources. |

The numbers next to **Dashboard** and **Data sources** show how many tiles and sources you have.

## A typical use

A finance team wants workforce cost against revenue by department.

1. On **Data sources**, upload an HR export (employees with department and salary), an expenses export (employee ID and amount) and a sales export (department or region and revenue).
2. Check **Shared dimensions** and accept a suggested link, such as expenses `employee_id` → employees `employee_id`.
3. On **Ask**, type "salary cost and revenue by department".
4. Switch the chart type, add a filter such as month from 2026-01, then select **Add to dashboard**.
5. Download the dashboard as PowerPoint for the monthly pack.

> **Tip:** No exports to hand? Select **Try the sample company** at the top of the page, or **Load a sample company** on **Data sources**. It loads six systems (SAP S/4, Billing, Salesforce, SuccessFactors, Concur and Ariba) that are already linked.

> **Note:** Unified Reporting is built to combine systems. With one source you can still ask questions, but meldra will remind you to add another.

## Next steps

- [Add your data](/help/add-your-data)
- [Ask questions and build reports](/help/ask-questions-and-build-reports)
- [Dashboards and downloads](/help/dashboards-and-downloads)
