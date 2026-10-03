# Meldra: platform overview and how to pitch it

Every claim here matches the product today. Before adding a claim, check it against `docs/marketing/CLAIMS.md`.

## 1. Positioning

**Meldra: Data Made Simple.** Tell Meldra what you need in your own words and get the report, the slides or the
clean file. Your files are never stored.

**Who it's for:** finance, operations, HR and advisory teams who live in Excel and exports but aren't data
specialists. No formulas, no IT ticket.

**How to pitch it:** most tools sell one job (an Excel-to-slides converter, a PDF tool, a reporting widget).
Meldra is one place for the everyday data jobs, with **Ask Meldra** in front: the customer describes the job,
and Meldra picks the tool and sets it up with their files.

## 2. How it fits together

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ ASK MELDRA  (Dashboard box, or Ctrl/⌘+K on any page)                          │
│ Request + file names + column headings → plan of 1–4 tools → each tool opens │
│ with the files loaded and its instruction filled in. The user runs it.       │
├──────────────────────────────────────────────────────────────────────────────┤
│ TOOLS                                                                         │
│ Excel → PowerPoint · File Analyzer · Auto Standardize · Reconciliation ·      │
│ P&L Builder · Unified Reporting · HR Migration · Invoice Extractor ·          │
│ PDF Editor · PDF/Doc Converter · OCR · Filename Cleaner · Web Data Connector ·│
│ Database Connection · Data Model Creator · AI Agent                           │
├──────────────────────────────────────────────────────────────────────────────┤
│ AI (backend/app/services/ai_service.py, one place to switch providers)        │
│ Gets only what each task needs, e.g. column names; the provider doesn't train │
│ on it.                                                                         │
├──────────────────────────────────────────────────────────────────────────────┤
│ PRIVACY                                                                        │
│ Spreadsheet analysis in the browser; server tools work in memory and discard  │
│ the file. Kept: account, sign-in and billing records (docs/DATA_PROTECTION.md)│
└──────────────────────────────────────────────────────────────────────────────┘
```

## 3. The tools that sell it

### Excel to PowerPoint
- **What it does:** turns a spreadsheet into a deck with its charts, tables and key numbers, in seconds (1.6–5.8 s for files up to about 5 MB in `docs/benchmark-results.md`).
- **Branding:** brand colour, font, company name and logo on every slide.

### Unified Reporting
- **What it does:** combine exports from several systems (files, databases or APIs) and ask questions across them in plain English.
- **How it works:** the AI plans the query from column names and a few example values. Rows are joined and totalled in the browser.
- **Lakehouse:** optional storage in Apache Iceberg, opt-in per upload, for customers who want their data kept.

### HR Data Migration
- **What it does:** turns an HR system extract (Workday, Oracle, SAP HCM, ADP and others) into load-ready **SAP SuccessFactors** files.
- **AI:** recognises each tab and maps the columns; translates picklist values on request.
- **Rules engine:** cleans dates, countries, IBANs (checksum-validated) and codes.
- **Checks and reconciliation:** a pre-flight check lists what SuccessFactors would reject, and a reconciliation proves pay and balance totals match the source.
- **Privacy:** employee data stays in the browser; the AI sees column names only.

### Reconciliation, invoices, PDFs
- **Reconciliation:** match two files (e.g. bank vs ledger) and list every difference.
- **Invoice Extractor:** header fields and line items into Excel.
- **PDF and scans:** PDF editing and filling, conversion between PDF, Word and Excel, and OCR.

### Web Data Connector
- **What it does:** collects table and list data from a public website into a CSV.

### Dashboard charts
- **What it does:** 30+ chart types for a spreadsheet, including P&L views and forecast charts.

## 4. Pitch hook

> "Your team spends hours turning exports into reports, decks and clean files. With Meldra they say what they
> need and get it in minutes, and their files are never stored."

## 5. What is not built yet (don't sell it)

- **Migration to targets other than SuccessFactors.**
- **Uploading your own `.pptx` template.** Branding is colour, font, name and logo today.
- **Certifications:** SOC 2, ISO 27001 and similar.
- **Enterprise features:** SSO / SAML and multi-user team workspaces.
