---
title: Add your data
summary: Upload exports, connect a database or an API, load the sample company, and link your sources so they can be combined.
category: Unified Reporting
order: 2
updated: 2026-10-05
---

This article shows every way to add data to Unified Reporting and how to link sources so you can ask questions across them. All of it happens on the **Data sources** tab.

## Upload files

1. Open **Unified Reporting** and select the **Data sources** tab.
2. Drag your exports onto the area that says **Drop exports from several systems here**, or select **Choose files**.
3. Wait while meldra reads each file. A message confirms which sources were added.

What you can upload:

- CSV, TSV, Excel `.xlsx` and `.xls` files.
- Up to 50 MB per file.
- Up to 200,000 rows per source. Larger files keep the first 200,000 rows, and the source card says "row limit reached".
- Each sheet of an Excel workbook with data becomes its own source.

Select several files at once with Ctrl or ⌘ + click, or add them one after another.

> **Tip:** Upload one file or sheet per system, for example an HR export, an expenses export and a sales export. To try a ready-made set, select **Download a 4-file test pack** under the upload area.

## Connect a database

meldra connects read-only. Only single SELECT queries run, in a read-only transaction.

1. On **Data sources**, select **Connect a database**.
2. Choose the **Database**: **PostgreSQL**, **MySQL / MariaDB** or **SQL Server / Azure SQL**.
3. Enter the **Host** (or **Server**), **Port**, **Database name**, **Username** and **Password**. For PostgreSQL, also choose **SSL**: **Prefer**, **Require** or **Disable**.
4. Select **Connect**.
5. Choose what to add:
   - On the **Tables** tab, tick the tables you want, or
   - On the **Custom query** tab, enter a **Source name** and a **SELECT query**.
6. Optionally set **System name (shown on answers)** and **Row limit per source** (50,000 by default, 200,000 at most).
7. Select **Add 2 tables** (the number matches your selection) or **Run and add**.

If the tables you pick have foreign keys between them, meldra adds those links automatically.

> **Important:** The database server must be reachable from meldra's backend. Use a read-only database user. The password is used once to connect and is never stored.

To refresh a database source later, select the refresh icon on its card, enter the password again and select **Connect and refresh**. Your column choices are kept.

## Connect an API

Pull records from a business system over HTTPS.

1. On **Data sources**, select **Connect an API**.
2. Choose a **System**. Ready-made settings are available for:
   - Any REST / JSON API
   - SAP SuccessFactors (OData v2)
   - SAP S/4HANA / SAP BTP (OData)
   - Microsoft Graph
   - Workday report (RaaS)
   - Salesforce (SOQL query)
   - QuickBooks Online (query)
   - Stripe (payments)
   - Kyriba (treasury)
   - GraphQL endpoint
   - SOAP / XML API
3. Enter the **System name (shown on answers)** and the **Address (HTTPS)**. Replace anything in {braces} with your own values.
4. Choose the **Method** (**GET** or **POST**). For POST, choose the **Body type** and enter the **Body**.
5. Choose the **Authentication** and fill in its fields. Options are OAuth 2.0 client credentials, OAuth 2.0 SAML 2.0 bearer (certificate), OAuth 2.0 JWT bearer (certificate), OAuth 2.0 refresh token, User name and password, Bearer token / access token, API key, or None.
6. Optional: open **Records, paging and headers** to set **Records at (path to the list)**, **Paging**, **Maximum rows**, **Source name** and **Extra headers (JSON)**. meldra finds the records and paging automatically if you leave them.
7. Select **Fetch and add**.

Credentials are used for this request and never stored. To refresh, select the refresh icon on the source card, enter the credentials again and select **Fetch again**.

> **Important:** If the system issues a new refresh token, meldra shows it once. Copy it and select **I saved it, continue**. The old token no longer works and meldra does not keep the new one.

## Load the sample company

Select **Try the sample company** at the top of Unified Reporting (shown until you add data), or **Load a sample company** on **Data sources**. It adds six linked systems: SAP S/4, Billing, Salesforce, SuccessFactors, Concur and Ariba.

## Store data in the meldra lakehouse

If the lakehouse is available on your account, the upload area shows a **Store in the meldra lakehouse** tick box.

- Ticked: new files, database tables and API pulls are stored as Apache Iceberg tables on meldra's servers. You can then use them from any device. Files can be CSV, Excel or Parquet, up to the size shown under the upload area.
- Not ticked (the default): data stays in this browser.

To move existing sources, select **Store all in the meldra lakehouse**, or the warehouse icon on one source card. Stored sources show a **meldra lakehouse** label.

> **Important:** Deleting a lakehouse source removes the stored data permanently.

## Check how each column is used

Each source has a card. On it you can:

- Edit **System**. This name appears on answers and charts.
- Open **Columns** to see each **Column in file**, its **Name used for joining** and how to **Use as**:
  - **Break down by**: a category, such as department or region.
  - **Number to add up**: an amount or quantity.
  - **Ignore**: leave the column out.
- Date columns give a **month** you can break down and filter by.

## Link your sources

Sources combine in two ways.

**Shared dimensions.** Columns with the same join name in two or more sources. Any numbers can be compared across sources on these. To create one, give matching columns the same **Name used for joining**. For example, rename both `Dept` and `Department` to `department`.

**Links between sources.** A link lets one source look up another's columns.

1. Under **Suggested from your data**, check the suggestion and the share of values that match.
2. Select **Link** to accept it.
3. To add your own, choose a source and **column**, then the source and **column** it **looks up**, and select **Add link**.

Remove a link with the cross next to it.

## Remove data

- To remove one source, select the bin icon on its card.
- To remove everything, including answers and the dashboard, select **Remove all data**.

## Next steps

- [Ask questions and build reports](/help/ask-questions-and-build-reports)
- [Your data and privacy](/help/your-data-and-privacy)
