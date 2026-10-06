# meldra product structure

How the signed-in app is organised, what each section is for, what is built and what comes next.
The menu itself is defined in `src/lib/navigation.js`; the industry packs in `src/lib/solutions.js`.

## Why the menu changed

The old menu had nine entries, and the same job lived in several places:

- six places to type a prompt (Ask meldra, the AI Assistant page, Agentic Workflows, an assistant inside the Dashboard, the support chat, and Unified Reporting's questions);
- four places to analyse or clean one spreadsheet (Dashboard, File Analyzer, Auto Standardize, the AI Assistant page);
- Reconciliation and P&L sat under "File Analysis" although they are finance products.

ChatGPT and Claude already analyse a file well. meldra is worth paying for where it does what they don't: the same job the same way every month, connected to the customer's systems, with industry rules built in and output the next system accepts. The menu now leads with that.

## The menu

**Home · Workbench · Unified Reporting · Migration · Documents · Solutions · Automations**

Ask meldra (Ctrl/⌘ + K) works on every page, so there is no separate AI menu. Developers, Organisation and licence, Plan and usage, and Settings are in the account menu.

| Entry | Job | Contains today | Was |
|---|---|---|---|
| Home | Start here | Ask meldra prompt box, suggested tools, spreadsheet workspace | Dashboard |
| Workbench | Work on one file | Profile a file, Clean and standardise | File Analysis (part) |
| Unified Reporting | Connect sources and report | Reports and questions, Database connection, Web data, Data model | Unified Reporting + Data & Schema |
| Migration | Move data between systems | SAP SuccessFactors migration | Migration |
| Documents | Files in, files out | PDF tools, Document converter, OCR, Invoice extraction, Excel to PowerPoint, Rename files | File Conversion (+ Invoice extraction, which had no menu entry) |
| Solutions | Industry packs | Finance, Law firms, HR and payroll, and all sectors | Reconciliation and P&L from File Analysis; law firms is new |
| Automations (beta) | Jobs that run themselves | Agentic Workflows | AI Assistant → Agentic Workflows |

The AI Assistant page (`/AgenticAI`) is out of the menu. Its address still works, and Ask meldra still opens it, until usage data shows whether anything on it needs moving into Ask meldra before it is deleted.

Every old address still works; only the menu changed.

## Solutions (industry packs)

One engine; each sector gets the use cases it pays for. Each use case is marked:

- **Available**: a working tool does the job today (linked).
- **Beta**: works, still being tested on real files. Reconciliation and P&L stay here until they pass tests on real customer-style files.
- **Planned**: on the roadmap; customers can register interest (email to sales).

| Sector | Available or beta now | Planned |
|---|---|---|
| Law firms | Court bundles (PDF tools), OCR, client account reconciliation (beta), matter profitability reporting | Conflict checks, billing code checks (LEDES/UTBMS), redaction, contract review to a spreadsheet, practice-system migration |
| Finance | Reconciliation (beta), P&L builder (beta), invoice extraction, management reporting | Reconciliation with saved rules and sign-off, P&L from a trial balance |
| HR and payroll | SuccessFactors migration, people reporting, payroll reconciliation (beta) | Workday and Oracle HCM targets |
| Insurance | Documents to data (OCR), payment matching (beta) | Bordereaux cleansing and checks |
| Universities | Reporting, OCR of archives | Student system migration, statutory returns |
| Manufacturing | Reporting, stock reconciliation (beta) | Three-way PO/receipt/invoice matching, supplier price lists |

meldra does not give legal advice; the law firm pack covers a firm's operations, finance and paperwork.

## What comes next, in order

1. **Workbench as one page**: merge the Dashboard's spreadsheet panels (grid, cleaning, transform, formula, validator, filter, charts), File Analyzer and Auto Standardize into tabs: Profile · Clean · Transform · Validate · Chart · Export. Home then keeps only the prompt box, recent jobs, templates and alerts.
2. **Transform by example and saved recipes** (roadmap Phase 1): fix two or three rows, meldra learns the rule and shows it in plain words; every step is saved to rerun on next month's file.
3. **Rebuild reconciliation**: several keys, fuzzy and date-window matching, one-to-many, saved rules, exceptions queue, sign-off and an audit pack. This serves Finance and the law firm client account check.
4. **Automations**: one prompt to a whole job with one approval (Phase 2), then schedules and triggers with emailed results (Phase 4), then monitored pipelines (Phase 5).
5. **Law firms pack**: show the three strongest use cases (client account reconciliation, bundles, practice-system migration) to five firms before building the planned ones.

### AI and ML to add, by section

| Section | AI | ML |
|---|---|---|
| Workbench | Transform by example; explain a column or number with links to source rows | Anomaly detection; fuzzy duplicates; column type and personal-data detection |
| Unified Reporting | Suggested joins between sources with a confidence score; saved metric definitions | Forecasting (builds on `predictive_ml_service.py`); alerts when a source changes shape |
| Migration | Mapping suggestions from past projects and crosswalks | Value translation that learns from each confirmed code |
| Documents | Any document to a spreadsheet, each value linked to its page | Personal-data redaction with a log |
| Solutions | Plain-English rule set-up per pack | Match suggestions that learn from approvals |
| Automations | Plain-English explanation of a failed run with a suggested fix | — |

## How each part is sold

| Part | Plan |
|---|---|
| Home, Ask meldra, Documents conversions | Free and Pro |
| Workbench saved recipes, batch document extraction and redaction | Pro and above, document volume by pages |
| Unified Reporting | Team and Business, by number of sources |
| Migration | Business, per project or per migration cycle |
| Solutions packs | Paid add-on per sector on Team or Business, co-terminated with the licence |
| Automations | Business, by runs per month |

Licences, seats and renewals: `docs/ENTERPRISE_LICENSING.md`.
