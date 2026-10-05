---
title: Unified Reporting troubleshooting
summary: What each Unified Reporting message means and how to fix it, from uploads and connections to questions and SQL.
category: Unified Reporting
order: 5
updated: 2026-10-05
---

Use this article when Unified Reporting shows a message you do not expect. Messages are grouped by where they appear.

## Asking questions

| Message | Why it happens | What to do |
|---|---|---|
| Add some data first: upload an export from any system, or load the sample company. | There are no sources yet. | Go to **Data sources** and add data. See [Add your data](/help/add-your-data). |
| That question could not be matched to your data. Try naming a column and a breakdown, like "amount by region". | Meldra could not find a number or breakdown in your question. | Use the column names shown on **Data sources**, for example "amount by department". |
| No report could be built from this data. Try naming the numbers and breakdowns you want. | **Build a report** found nothing to chart. | Name the numbers and breakdowns, for example "headcount and salary cost by department and month". |
| No rows matched. | The filters remove every row. | Remove or change a filter on the answer. |
| This answer used data that has since been removed. | A source used by the answer was deleted. | Add the data again and ask the question again. |
| Read with built-in rules (AI was not needed or not available). | Shown under **Query: SQL, columns, joins**. The AI was not used. | No action needed. Check the chart matches your question, and rephrase if not. |

## Only one source

If you have one source, the **Ask** tab shows **You have one source.** Unified Reporting is built to combine systems.

1. Select **Add another source**.
2. Add an export from another system that shares something with the first, such as an employee ID, a department, a customer or a date.
3. Check **Shared dimensions** and **Links between sources** on **Data sources**.

## Sources do not combine

**Shared dimensions** shows "None yet. Add a second source, or align column names."

1. On **Data sources**, open **Columns** on each source card.
2. Give columns that mean the same thing the same **Name used for joining**, for example `department`.
3. Or add a link under **Links between sources** and select **Add link**.

If renaming fails with "… already has a column named …", that source already uses the name. Choose another name or rename the other column first.

## Uploading files

| Message | What to do |
|---|---|
| *file* is larger than 50 MB. | Split the file, or export fewer columns or a shorter period. |
| *file* has no rows with a header line. | Make sure the first row holds column names and there is data below it. |
| *file* has no sheets with data. | Check the workbook has at least one sheet with a header row and data. |
| *file*: upload a .csv, .tsv, .xlsx or .xls file. | Save the file in one of these formats. Parquet is accepted only when storing in the Meldra lakehouse. |
| row limit reached: first 200,000 kept (on the source card) | Only the first 200,000 rows were kept. Split the export, for example by year. |

## Connecting a database

| Message | What to do |
|---|---|
| Connection failed | Check the host, port, database name, user name and password. The server must be reachable from Meldra's backend. |
| No tables found in the default schema. Use a custom query instead. | Select the **Custom query** tab and write a SELECT query that names the schema. |
| Choose at least one table. | Tick at least one table before selecting add. |

## Connecting an API

| Message | What to do |
|---|---|
| Extra headers must be a JSON object, e.g. {"Accept": "application/json"}. | Fix the **Extra headers (JSON)** field. |
| The request body is not valid JSON. | Fix the **Body**, or change the **Body type**. |
| The API answered but returned no records. Check the address and "Records at". | Check the **Address (HTTPS)**. Set **Records at (path to the list)** under **Records, paging and headers**. |
| The API could not be read. Check the address and try again. | Check the address, authentication and that the API is reachable over HTTPS from a public address. |
| Too many API pulls in a short time. Wait a few minutes and try again. | Wait a few minutes before the next pull. |

## Running your own SQL

| Message | What to do |
|---|---|
| Write a SELECT query first. | Enter a query in the SQL box. |
| Only SELECT queries can be run here (they read your data and never change it). | Start the query with SELECT or WITH. |
| Run one query at a time. | Remove the semicolon and any second query. |
| That query is too long. | Shorten the query. |
| Name one of your sources in FROM (see "Tables you can query"). | Use a table name listed under **Tables you can query**. |
| This query uses sources kept in your browser and sources stored in the Meldra lakehouse… | Store both sources in the same place on **Data sources**, then run the query again. |
| That definition could not be run… | When editing **Report definition (JSON)**, check the JSON and use source, column and measure names from **Data sources**. |

## Dashboard and downloads

See the troubleshooting table in [Dashboards and downloads](/help/dashboards-and-downloads).

## Data missing after you return

Data in Unified Reporting is kept in the browser you used. It is cleared when you sign out or use **Remove all data**, and it is not on other devices or in private windows. Data stored in the Meldra lakehouse is available on any device.
