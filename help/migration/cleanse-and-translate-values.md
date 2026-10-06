---
title: Cleanse and translate values
summary: Review automatic fixes, clear pre-flight errors, check reconciliation and coverage, and translate source values into your SuccessFactors codes.
category: Migration
order: 4
updated: 2026-10-05
---

The **Cleanse & validate** step shows what meldra fixed, what still needs attention and how your values translate into SuccessFactors codes. Work through it before you export, so the load runs clean.

## Check the summary

The cards at the top show:

| Card | Meaning |
|---|---|
| **Employees** | People found in the extract. |
| **Files to load** | Output files that will be produced. |
| **Automatic fixes** | Values meldra corrected for you. |
| **Errors** | Records that would be rejected on import. |
| **Warnings** | Records worth checking, which would still load. |

## Review the automatic fixes

**What we fixed automatically** lists each kind of fix, how many times it was applied and up to three before → after examples. Fixes include:

- Rewrote dates into one standard format.
- Lower-cased email addresses.
- Stripped formatting from phone numbers.
- Converted countries to ISO 3-letter codes, and currencies to ISO codes.
- Translated gender, marital status, employment status, yes / no and pay frequency values to picklist codes.
- Normalised IBANs after checksum validation, and normalised BIC/SWIFT codes.
- Removed spaces and dashes from account numbers and sort codes.
- Converted FTE percentages (100 → 1.0).
- Restored IDs that Excel had turned into numbers.
- Created org records and cost centers that were referenced but missing from the lists.
- Turned retirement dates into terminations with the retirement reason.
- Built a job record from worker data when there is no job history tab.
- Merged duplicate rows for the same employee.

Every fix is also written to `change_log.csv` in the export.

## Clear the pre-flight check

**Pre-flight check** tests every record against the target's rules before anything is loaded: required fields, references between files, dates and codes.

1. Select **Errors**, **Warnings** or **Notes** to filter the list.
2. For each row, read the record key, the file and field, and the message.
3. Fix the cause. Usually this means changing a mapping on **Map fields**, a code under **Value translations**, a value in **Settings**, or the source extract.

Examples of what you may see:

- a date that can be read either way. Change **Source date order** in **Settings** if meldra read it wrongly;
- an age at hire outside 14 to 90, which suggests the day and month are swapped;
- a cost center that belongs to a different legal entity than the employee;
- an email address shared by several employees.

> **Note:** You can export with errors. They are listed in `issues.csv`. Fixing them first gives a clean load.

## Check reconciliation

**Reconciliation** compares the same totals summed from your source tabs and from the files produced, such as pay amounts. A difference means rows were dropped or merged on the way. The badge shows **All control totals match** or how many differ.

## Check data coverage

**Data coverage** accounts for every source column:

- **migrated** into SuccessFactors files;
- **carried** in custom files, because there is no standard target yet (for example dependents);
- **left behind**, listed by name for each tab.

If a column you need is left behind, map it on **Map fields**.

## Translate values

Picklist codes are configured per SuccessFactors instance. **Value translations** lists every distinct value found for each coded field, how often it appears and the code it will become.

Fields covered include gender, marital status, employment status, yes / no, pay frequency, termination reason → event reason code, pay component → pay component code, payroll balance / wage type → target wage type code, and payment method → payment method code.

1. Compare each suggested code with your instance's picklists.
2. To change a code, type over it and click away from the field.
3. Fill every field outlined in red. These values need a code.

The label next to each code shows where it came from: **suggested**, **AI suggested**, **set by you** or **needs a code**.

### Translate with AI

1. Select **Translate values with AI**.
2. meldra fills codes its dictionary does not know, and gives termination reasons and pay components one consistent code.
3. Check every value marked **AI suggested** against your instance.

The AI gets only the distinct values listed (for example "Resigned"), never employee IDs, names or counts. It runs only when you select the button.

> **Important:** Codes you typed are kept. The AI never overwrites them.

## Next steps

When errors are cleared and the codes match your instance, select **Next: Load order & export**.

- [Export and load into SuccessFactors](/help/export-and-load-into-successfactors)
- [Reuse mappings across mock cycles](/help/reuse-mappings-across-mock-cycles)
