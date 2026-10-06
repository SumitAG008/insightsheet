---
title: Migration overview
summary: Turn an HR extract from your current system into SAP SuccessFactors Employee Central import files, in load order, in four steps.
category: Migration
order: 1
updated: 2026-10-05
---

Migration turns an HR extract from your current system into load-ready import files for SAP SuccessFactors Employee Central. This article explains what it produces, the four steps and where the work happens.

## What Migration does today

- **Source:** an HR extract from any system, as Excel or CSV. Examples include Workday, Oracle HCM Cloud, SAP HCM, ADP, UKG, BambooHR, Dayforce, PeopleSoft, Sage People or a custom spreadsheet.
- **Target:** SAP SuccessFactors Employee Central import files (CSV), with foundation data first, then people, employment, contact, compensation and payroll files.
- **Also produced:** a README with the load order, a mapping report, a log of every automatic fix, an issues list, reconciliation totals, and a review workbook in Excel.

## The four steps

Open **Migration** from the navigation bar. The steps run across the top of the page.

| Step | What you do |
|---|---|
| 1. **Upload extract** | Upload your extract, or try the sample. See [Prepare your extract](/help/prepare-your-extract). |
| 2. **Map fields** | Check which target field each source column maps to. See [Map fields](/help/map-fields). |
| 3. **Cleanse & validate** | Review automatic fixes, errors, reconciliation totals and value translations. See [Cleanse and translate values](/help/cleanse-and-translate-values). |
| 4. **Load order & export** | Preview each file in load order and download the ZIP and review workbook. See [Export and load into SuccessFactors](/help/export-and-load-into-successfactors). |

After you upload, meldra opens **Map fields** for you. From there, select the **Next** button at the bottom of each step, for example **Next: Cleanse & validate**. Once an extract is loaded you can also select any step at the top.

The buttons at the top right of the page are:

- **Load profile** and **Save profile**: reuse your decisions on the next extract.
- **Settings**: date formats, event reasons and other codes for the output.
- **Start over**: clear the extract and begin again.

## Mock cycles and profiles

A data migration is usually rehearsed several times before go-live. Each run of Migration on a new extract is one cycle. Save a profile after each cycle and load it at the start of the next. Your mappings, value translations and settings then carry over, so mock 2 and cutover use the same decisions as mock 1. See [Reuse mappings across mock cycles](/help/reuse-mappings-across-mock-cycles).

## What runs where

| Work | Where it runs |
|---|---|
| Reading the extract, matching columns by rules, cleansing, validation, building files | In your browser |
| Keeping your work between visits | In this browser's storage, until you select **Start over** or sign out |
| AI mapping of tabs and columns | meldra's AI service. Receives tab and column names only, never values. |
| **Translate values with AI** | meldra's AI service, only when you select it. Receives the distinct values listed for translation only. |

> **Note:** If the AI is unavailable, the rule-based mapping still works on its own. The AI only adds tab identification and hard-to-name columns.

## Next steps

- [Prepare your extract](/help/prepare-your-extract)
- [Your data and privacy](/help/your-data-and-privacy)
