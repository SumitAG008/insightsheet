---
title: Design a data model
summary: Draw tables and relationships on a canvas, import an existing schema and generate SQL to create the database.
category: Data and integrations
order: 1
updated: 2026-10-06
---

The **Data Model Creator** lets you design a database schema visually. You add tables and columns, link them with relationships and then generate the SQL that creates them.

## Open the Data Model Creator

1. In the navigation bar at the top of the page, open **Data & Schema**.
2. Select **DB Schema**.

The bar under the page title shows how many **Tables**, **Relationships** and **Columns** your model has.

> **Important:** Your model is not saved in meldra. It is lost when you leave or reload the page. Select **Export** to download it as a JSON file, and import that file later to carry on.

## Add a table

1. Select **Add Table** at the top of the page.
2. meldra adds a table called Table1 (then Table2 and so on) with an `id` column. The `id` column is an INTEGER primary key with auto increment.

You can also select the **+** button next to **Tables** on the **Table Designer** tab.

## Design columns

1. Open the **Table Designer** tab.
2. Under **Tables**, select the table you want to change.
3. To change its name, select **Rename**, type the new name and select the tick.
4. Select **Add Column**. For each column, set:
   - **Column Name**
   - **Data Type**, for example INTEGER, BIGINT, DECIMAL, VARCHAR, TEXT, DATE, TIMESTAMP, BOOLEAN, JSON or UUID
   - **Default Value** (optional)
   - **Constraints**: **Primary Key**, **NOT NULL**, **Unique** and **Auto Increment**

To remove a column, select the bin icon on its row. A table must keep at least one column.

To remove a table, select the bin icon next to it under **Tables**. Any relationships to or from that table are removed too.

> **Note:** Tables are deleted straight away, without a confirmation message.

## Link tables with relationships

You can create a relationship in two ways.

### On the canvas

1. Open the **Visual Canvas** tab.
2. Select a column in one table.
3. Select a column in a different table.

meldra creates a many-to-one relationship between the two columns. Select **Cancel** to stop before choosing the second column.

### On the Relationships tab

1. Open the **Relationships** tab and select **Add Relationship**.
2. Choose the **From Table (Source)** and the **From Column (Foreign Key)**.
3. Choose the **Relationship Type**.
4. Choose the **To Table (Target)** and the **To Column (Primary Key)**.
5. Select **Create Relationship**.

A relationship must link two different tables.

| Relationship type | Example |
|---|---|
| **One to One (1:1)** | One user has one profile. |
| **One to Many (1:N)** | One user has many orders. |
| **Many to One (N:1)** | Many orders belong to one user. |
| **Many to Many (N:M)** | Students and courses. This needs a junction table. |

To remove a relationship, select the bin icon on its card.

## Arrange the canvas

On the **Visual Canvas** tab you can drag tables to arrange them. Use **Zoom +**, **Zoom -** and **Reset View** to change the view.

## Import an existing schema

Select **Import** at the top of the page and choose a source.

| Option | What it does |
|---|---|
| **From DB Connect** | Reads the tables, columns and foreign keys of the database you are connected to in DB Connect. See [Connect a database](/help/connect-a-database). |
| **From MySQL**, **From PostgreSQL**, **From SQL Server**, **From Snowflake**, **From Oracle SQL**, **From Rails (schema.rb)**, **From CSV** | Opens the **Schema Import Wizard**, where you paste or upload schema text. |
| **From JSON** | Opens a JSON or XML file. A file exported from the Data Model Creator is loaded as it is. Any other JSON or XML data is converted into tables. |

To use the **Schema Import Wizard**:

1. Paste your schema into **Schema Content**, or select **Upload .sql** to load a .sql, .txt or .csv file.
2. Turn on **Show Guide** to see how to export a schema from the source system.
3. Tick **Merge with existing schema** to add the tables to your current model. Leave it clear to replace your model.
4. Select **Submit**.

> **Important:** The wizard reads `CREATE TABLE` statements, with one column on each line. Check the result after importing. If no `CREATE TABLE` statements are found, you see "No tables found in the SQL content".

## Generate a schema with AI

1. Open the **AI Assistant** tab.
2. Under **Describe your database schema**, describe the tables you need and how they relate. You can also select one of the **Example Prompts**.
3. Select **Generate Schema with AI**.
4. Check the **Generated Schema** preview, then select **Apply to Canvas**.

> **Important:** **Apply to Canvas** replaces your current tables and relationships. Export your model first if you want to keep it.

## Generate SQL

1. Open the **SQL Generator** tab.
2. Choose the dialect: **PostgreSQL**, **MySQL**, **SQLite**, **Microsoft SQL Server** or **Oracle**.
3. Read the script on one of three tabs:
   - **CREATE Tables** creates every table, then adds the foreign keys.
   - **INSERT Samples** adds three rows of sample data to each table.
   - **DROP Tables** deletes every table.
4. Select **Copy** or **Download SQL**. Both use the **CREATE Tables** script.

Select **Explain** to get a plain-English explanation of the **CREATE Tables** script.

> **Important:** The **DROP Tables** script permanently deletes the tables and all their data. Check which database you are connected to before you run it.

## Next steps

- [Connect a database](/help/connect-a-database)
- [Plans and limits](/help/plans-and-limits)
