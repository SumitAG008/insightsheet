---
title: Export and load into SuccessFactors
summary: Set the output options, download the ZIP and review workbook, and load the files into SAP SuccessFactors Employee Central in the right order.
category: Migration
order: 5
updated: 2026-10-05
---

The **Load order & export** step produces your load files. This article explains the output settings, what the download contains and how to load the files into SuccessFactors.

## Before you export: check Settings

Select **Settings** at the top right of the Migration page. Set these to match your SuccessFactors instance.

| Setting | Default | Use |
|---|---|---|
| **Output date format** | MM/dd/yyyy | Match what your instance's import expects. Also yyyy-MM-dd or dd/MM/yyyy. |
| **Source date order** | Detect per column | How to read dates in your extract: detect, **Month / day / year** or **Day / month / year**. |
| **Hire event reason** | HIRNEW | First job record. |
| **Job change event reason** | JOBCHG | Later records where the job, title or grade changed. |
| **Transfer event reason** | TRANSFER | Later records where the org, location or cost center changed. |
| **Data change event reason** | DATACHG | Any other later record. |
| **Default payment method code** | BANK_TRANSFER | Used when the extract has none. |
| **Retirement event reason** | RETIRE | Termination reason code used for retirees. |
| **Pension payout frequency code** | MON | Used when the retirees tab has none. |
| **Default time zone** | Europe/London | Used when neither the job nor its location has one. |
| **Base pay component** | BASE | Pay component code for base salary. |
| **Work email type code** | B | Email type on the email file. |
| **Work phone type code** | B | Phone type on the phone file. |
| **Address type code** | home | Address type on the address file. |
| **Foundation start date (ISO)** | 1900-01-01 | Effective start for org records. |
| **Include the second header row with field labels** | On | Adds a label row under the column IDs, as in downloaded templates. |

### SAP payroll legacy transfer (optional)

Tick **Generate SAP payroll legacy transfer files (T558B / T558C)** for a mid-year go-live on SAP payroll. Then set:

- **SAP country grouping (MOLGA)**: required by T558C.
- **SAP period modifier**: for example 01 = monthly.
- **Off-cycle payroll type**: used for runs marked off-cycle or bonus.

## Review the load order

The **Load order** list shows every file in the order to load it. Each file only references files above it, so nothing is orphaned on load. For each file you see its number, name, row count and any errors.

Select a file to preview its first rows. Bank numbers are masked in the preview and complete in the download.

Files are produced only when your extract has data for them. The full order is:

| Order | File | Content |
|---|---|---|
| 1 | FOCompany | Legal Entity |
| 2 | FOBusinessUnit | Business Unit |
| 3 | FODivision | Division |
| 4 | FOCostCenter | Cost Center |
| 5 | FODepartment | Department |
| 6 | FOLocation | Location |
| 7 | FOJobCode | Job Classification |
| 8 | User | Basic User Import |
| 9 | PerPerson | Biographical Information |
| 10 | EmpEmployment | Employment Details |
| 11 | PerPersonal | Personal Information |
| 12 | EmpJob | Job History |
| 13 | PerEmail | Email Information |
| 14 | PerPhone | Phone Information |
| 15 | PerAddressDEFLT | Addresses |
| 16 | EmpCompensation | Compensation Information |
| 17 | EmpPayCompRecurring | Recurring Pay Components |
| 18 | EmpPayCompNonRecurring | Non-Recurring Pay Components |
| 19 | PaymentInformation | Payment Information (bank details) |
| 20 | PayrollYTD | Payroll YTD Balances (for payroll) |
| 21 | PensionEnrollment | Pension Enrolment (for payroll) |
| 22 | PensionPayout | Pension Payouts for Retirees (for payroll) |
| 23 | SAP_T558B | SAP payroll legacy periods (T558B) |
| 24 | SAP_T558C | SAP payroll legacy wage types (T558C) |
| 25 | EmpEmploymentTermination | Termination Details |

Files are numbered in the order of your own package, for example `01_FOCompany.csv`. Skipped files do not leave gaps. Carried-over data with no standard target follows last, in the `custom` folder.

## Download the package

1. Select **Download ZIP for SuccessFactors**.
2. Select **Review workbook (.xlsx)** to get one Excel file for checking with the business.

If there are errors, Meldra tells you how many records would be rejected. You can still download.

### What is in the ZIP

| File | Content |
|---|---|
| `01_FOCompany.csv` and so on | One CSV per target file, numbered in load order. |
| `SAP_T558B` and `SAP_T558C` (`.txt`) | Only with the SAP payroll option. Tab-delimited, no header lines. |
| `custom/` | Data with no standard SuccessFactors file yet, carried as-is. |
| `README.txt` | Load order, row counts, settings used and loading notes. |
| `mapping_report.csv` | Each source column, the field it maps to, its confidence and method. |
| `change_log.csv` | Every automatic correction, with counts and examples. |
| `reconciliation.csv` | Control totals from source and output, and any difference. |
| `issues.csv` | Severity, file, record, field and message for everything still open. |

### What is in the review workbook

- **Summary**: errors, warnings, number of files, columns migrated, carried and left behind, and the load order.
- **Issues**, **Reconciliation** and **Automatic fixes**.
- One tab per output file, numbered in load order.

> **Important:** The download holds complete personal and bank data. Store and share it as your data protection rules require.

## Load the files into SuccessFactors

These steps are done in SuccessFactors, not in Meldra. Exact menu names depend on your instance and permissions.

1. **Compare templates.** Column IDs follow the standard Employee Central import templates, but templates are generated per instance. Download your templates from **Admin Center › Import Employee Data** and **Import Foundation Data**. Add any custom fields before loading.
2. **Load foundation data** (FO files) through **Import Foundation Data**, in the order given.
3. **Load employee data** (User, Person, Employment, Job and the rest) through **Import Employee Data**, choosing the matching entity for each file, in the order given.
4. **Load Payment Information** through **Import and Export Data**. It is an MDF object. Download its template from your instance and match the columns.
5. **Hand payroll files to payroll.** Year-to-date balances and pension files are loaded by payroll (Employee Central Payroll or your payroll provider), not by an Employee Central import. For SAP payroll, load T558B first, then T558C, as described in `README.txt`.
6. **Handle the `custom` folder.** Load it into a custom MDF object, or hand it to payroll or benefits.
7. **Reconcile.** After each import, check the import job results in SuccessFactors. Compare record counts with the row counts in `README.txt` and the totals in `reconciliation.csv`.

> **Tip:** Load each file only after the files above it have loaded without errors. A failed foundation file will cause rejections further down.

## Next steps

- [Reuse mappings across mock cycles](/help/reuse-mappings-across-mock-cycles)
