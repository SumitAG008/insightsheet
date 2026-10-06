---
title: Prepare your extract
summary: What to export from your current HR system, how to lay out tabs and columns, and how to upload it or try the sample.
category: Migration
order: 2
updated: 2026-10-05
---

A well-shaped extract maps faster and loads cleaner. This article explains what to export, how to lay it out and how to upload it.

## File types

- Excel `.xlsx` or `.xls`, or CSV or TSV files.
- Each sheet of a workbook, and each CSV file, becomes one tab in Migration.
- You can upload several files at once, or add more later. New tabs are mapped without changing your choices on existing ones.

## What to export

Export everything you plan to migrate, one tab per kind of data. Put the employee ID on every employee tab, so meldra can join them.

| Tab | Shape | Typical columns |
|---|---|---|
| Worker data | One row per employee | Employee ID, names, gender, date of birth, nationality, work email and phone, hire dates, employment status |
| Job history | Several rows per employee, each with an effective date | Job effective date, job code and title, manager ID, legal entity, business unit, division, department, location, cost center, FTE, standard weekly hours, pay grade |
| Pay history | Several rows per employee, each with an effective date | Compensation effective date, pay group, pay component, base pay amount, currency, pay frequency |
| One-time payments | One row per payment | Payment date, payment type, amount |
| Bank details | One row per account | Payment method, account holder, IBAN or account number, sort code or routing number, BIC/SWIFT, bank name and country |
| Addresses | One row per address | Address lines, city, state or province, postal code, country |
| Terminations | One row per leaver | Termination date, termination reason, last day worked, eligible for rehire |
| Retirees and pension | One row per member or payout | Retirement date, pension scheme, member number, enrolment date, contribution percentages, payout amount |
| Payroll balances | Several rows per employee | Tax year, wage type or balance, year-to-date amount |
| Payroll results | One row per period and wage type | Pay period start and end, pay date, run type, amount |
| Organisation lists | One row per code | Codes and names for legal entities, business units, divisions, departments, locations, jobs and cost centers |

> **Tip:** Keep the codes in your organisation lists the same as the codes used in job history. If job history uses a code that is missing from a list, meldra creates the org record and logs it.

### Data with no standard target

Some tabs have no standard Employee Central import file here, such as dependents. meldra carries them as-is in a separate `custom` folder, so nothing is lost. This applies to tabs with several rows per employee and no effective date, and to tabs with no employee ID or org code.

## You do not need to clean the extract first

meldra fixes common problems for you and logs every change. For example:

- mixed date formats;
- Male/M/F style values;
- country names and two-letter codes;
- FTE given as a percentage;
- upper-case emails;
- IDs that Excel turned into numbers;
- duplicate rows for the same employee.

See [Cleanse and translate values](/help/cleanse-and-translate-values) for the full list.

## Upload your extract

1. Open **Migration** from the navigation bar. You start on **Upload extract**.
2. Check **Source system**. Choose from the list or type your system's name. The AI uses it as a hint when mapping.
3. Drag your files onto the upload area, or select **Choose files**.
4. Wait for the files to be read. meldra maps the columns and opens **Map fields**.

Your loaded tabs are listed under **Loaded tabs** on the **Upload extract** step, with row and column counts. Remove a tab with the bin icon next to it.

> **Tip:** Have a saved profile from an earlier cycle? Select **Load profile** before you upload. It is applied to the extract you upload next.

## Try the sample

To see the whole flow before using real data:

- Select **Try a sample system extract** to load a deliberately messy Workday-style extract with about 40 workers and 16 tabs.
- Select **Download sample as Excel** to save the same extract as `workday_extract_sample.xlsx`. Upload it with **Choose files** to try the real upload path.

## Next steps

- [Map fields](/help/map-fields)
