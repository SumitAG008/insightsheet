---
title: Connect a database
summary: Connect to a PostgreSQL, MySQL, SQL Server, SQLite or MongoDB database and run read-only queries from your browser.
category: Data and integrations
order: 2
updated: 2026-10-06
---

The **Database Connection** page connects meldra to one of your databases so you can run read-only SQL queries and bring its schema into the Data Model Creator.

## Before you start

- meldra's servers make the connection, not your computer. The database must accept connections from the internet.
- meldra only runs read-only queries. It cannot change your data.

## Open DB Connect

1. In the navigation bar at the top of the page, open **Data & Schema**.
2. Select **DB Connect**.

## Connect

1. Under **Connection Settings**, choose the **Database Type**.
2. Fill in the fields for that type. Fields marked with an asterisk are required.
3. Select **Test Connection**.

When the connection works, you see "Connection successful!". The panel then shows, for example, "Connected to PostgreSQL", with the **Database:** and **Host:** you used. If it fails, the error from the database appears under the fields.

| Database Type | Fields |
|---|---|
| **PostgreSQL** | **Host**, **Port** (5432), **Database Name**, **Username**, **Password**, **SSL Mode** (**disable**, **require**, **prefer**, **verify-ca** or **verify-full**; **prefer** by default) |
| **MySQL** | **Host**, **Port** (3306), **Database Name**, **Username**, **Password**, **SSL CA Certificate (optional)** |
| **MongoDB** | **Connection String**, **Database Name**, **Auth Source (optional)** |
| **Microsoft SQL Server** | **Server**, **Port** (1433), **Database Name**, **Username**, **Password**, **Encrypt Connection** (**true** by default), **Trust Server Certificate** (**false** by default) |
| **SQLite** | **Database File Path**, **Read Only Mode** |

> **Note:** For SQLite, the **Database File Path** is opened by meldra's server, not by your browser. A file on your own computer cannot be opened this way.

## Run a query

1. Open the **Query** tab.
2. Type your query in the **SQL Query Editor**.
3. Select **Execute Query**.

The results appear in a table under the editor, with the number of rows returned. A query returns at most 200,000 rows.

meldra accepts one statement per query, and it must start with `SELECT` or `WITH`. It refuses a query that contains a word that could change data, such as `INSERT`, `UPDATE`, `DELETE`, `DROP`, `CREATE` or `INTO`. Words inside quotes and comments are ignored. On PostgreSQL and MySQL, every query also runs in a read-only transaction.

> **Tip:** If a column or table name is one of those words, put it in quotes. For example, write `"update"` in PostgreSQL or `` `update` `` in MySQL.

> **Note:** You can connect to MongoDB, but the **Query** tab cannot run MongoDB queries.

## See the schema

The **Schema** tab lists the tables in the database. Select a table to see its columns, data types, primary keys and NOT NULL columns.

To work with the schema as a diagram, open **DB Schema** and select **Import** then **From DB Connect** while you are connected. See [Design a data model](/help/design-a-data-model).

## What meldra stores

| Item | Where it is kept |
|---|---|
| Connection settings, including the password | In your browser tab's session storage, until you disconnect, log out or close the tab. |
| The open connection | In the memory of meldra's server while you use it. It is never written to disk or to a database. |
| Query results | Shown in your browser only. They are not stored. |

meldra also gives your browser an encrypted connection token, so the server can reopen the connection if needed. The token expires after some hours.

> **Important:** Your password is held in this browser tab while you are connected. On a shared computer, select **Disconnect** when you finish.

## Disconnect

Select **Disconnect** in the connection panel. meldra closes the connection and clears the settings from your browser. Logging out does the same.

## Troubleshooting

| Problem | What to do |
|---|---|
| "Only SELECT queries are allowed for security" | Start the query with `SELECT` or `WITH`. |
| "Only one statement is allowed" | Remove any second statement after a semicolon. |
| "Read-only queries only: '…' is not allowed" | Remove that word, or quote it if it is a column or table name. |
| "Connection expired or not found. Please connect again." | Select **Disconnect**, then connect again. |
| The **Schema** tab shows "No tables found or schema not loaded" | Run a query on the **Query** tab, or import the schema in **DB Schema** with **From DB Connect**. |
| The connection times out | Check that the database accepts connections from the internet and that the host and port are correct. |

## Next steps

- [Design a data model](/help/design-a-data-model)
- [Add your data](/help/add-your-data) to Unified Reporting from a database
