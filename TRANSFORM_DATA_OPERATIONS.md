# Transform Data — Operations (No Formulas)

This document explains how to use the **Transform Data** panel to create new columns from your spreadsheet(s) without writing Excel formulas.

## Concepts

### Active sheet

- The **Active Sheet** selector controls which sheet you are currently editing.
- All operations write results into the **active sheet** (they add a new column to the active sheet).

### Columns

- A **column** is selected by name (from the header row).
- Most operations create a **new column** so your source columns stay unchanged.

### Keys (for lookups)

A lookup uses a **key** to match rows between two sheets.

- **Lookup Value Column (active sheet)**
  - The values you want to match (e.g., `CustomerId`).
- **Lookup Key Column (lookup sheet)**
  - The column in the other sheet that contains the same IDs.
- **Return Column (lookup sheet)**
  - The value you want to bring back (e.g., `CustomerName`).

## Operation dropdowns

The Operation section has three dropdowns. Pick exactly one:

- **Mathematics**
- **Lookups**
- **Conditional**

---

## Mathematics

## Add / Subtract / Multiply / Divide / Percentage

Use these to compute a value row-by-row.

### What you select (Math)

- **Column 1** (numeric)
- **Column 2** (numeric)
- **New Column Name**

### What you get (Math)

- A new column is added to the active sheet.
- Each row is computed from its own values.

### Notes (Math)

- If a cell is blank or non-numeric, the result may be blank/0 depending on the input.
- Division by 0 will produce an empty result (or a non-finite number depending on input). If you see unexpected results, clean the data first.

## SUMIFS (group totals)

Creates a new column that contains a **group total** for each row.

### What you select (SUMIFS)

- **Sum Column** (numeric)
- **Criteria Column 1** (required)
- **Criteria Column 2** (optional)
- **New Column Name**

### What you get (SUMIFS)

- Rows that share the same criteria value(s) receive the same total.

### Example (SUMIFS)

- Sum Column: `Sales`
- Criteria 1: `Customer`
- Criteria 2: `Month`
- New Column: `CustomerMonthTotalSales`

## COUNTIFS (group counts)

Creates a new column that contains a **group row count** for each row.

### What you select (COUNTIFS)

- **Criteria Column 1** (required)
- **Criteria Column 2** (optional)
- **New Column Name**

### What you get (COUNTIFS)

- Rows that share the same criteria value(s) receive the same count.

---

## Lookups

Lookups bring data from another sheet into the active sheet.

## VLOOKUP / HLOOKUP / XLOOKUP

In this app these are presented as different lookup names, but they all use the same **sheet + key + return** selection so you do not need to know formulas.

### What you select (Lookup)

- **Lookup Value Column (active sheet)**
- **Lookup Sheet** (the sheet you want to pull data from)
- **Lookup Key Column (lookup sheet)**
- **Return Column (lookup sheet)**
- **New Column Name**

### What you get (Lookup)

- A new column is added to the active sheet.
- For each row, the system finds the first matching key in the lookup sheet and returns the chosen return column.

### Notes / best practices (Lookup)

- **Trim / formatting**: if keys look the same but don’t match, they may contain spaces or different formatting.
- **Duplicate keys in lookup sheet**: the first match is used.
- **Missing match**: the new value will be blank.

## Join Sheets (bring multiple columns)

Use Join when you want to bring **multiple columns** across at once.

### What you select (Join)

- **Active Sheet Key Column**
- **Join Sheet**
- **Join Sheet Key Column**
- **Columns to Bring Over** (comma-separated)

### What you get (Join)

- Multiple new columns added to the active sheet.
- Each row is filled by key matching.

---

## Conditional

## IF / THEN / ELSE

Creates a new column based on a simple condition.

### What you select (IF/THEN/ELSE)

- **IF column**
- **Condition** (Equals, Not equals, Greater than, Contains, Is blank, …)
- **Value** (not required for Is blank / Is not blank)
- **THEN**
  - Use a fixed value (e.g., `Yes`) OR a column value
- **ELSE**
  - Use a fixed value OR a column value
- **New Column Name**

### What you get

- A new column where each row becomes THEN or ELSE depending on the condition.

### Example

- IF column: `Status`
- Condition: `Equals`
- Value: `Approved`
- THEN value: `1`
- ELSE value: `0`
- New Column: `IsApproved`
