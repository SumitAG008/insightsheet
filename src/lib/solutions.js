// Industry solution packs: the same meldra engine, with the use cases each sector buys.
// status: 'available' (a working tool today, linked by `to`), 'beta' (works, still being tested on
// real files) or 'planned' (on the roadmap; shown so customers can register interest).
// Keep claims honest: only mark a use case available when the linked tool does the whole job.

export const SOLUTIONS = [
  {
    id: 'law-firms',
    name: 'Law firms',
    summary:
      'The operations, finance and paperwork of running a firm: checked, repeatable and with every value traced to its page. meldra does not give legal advice.',
    useCases: [
      {
        title: 'Court and hearing bundles',
        problem: 'Hours spent merging, ordering and paginating documents before a deadline.',
        delivers: 'Merge, order, split and page-number PDFs; OCR scanned pages so the bundle is searchable.',
        status: 'available',
        to: '/pdfeditor',
      },
      {
        title: 'Scanned documents to searchable text',
        problem: 'Old files and signed copies that cannot be searched or quoted.',
        delivers: 'OCR to Word or searchable PDF.',
        status: 'available',
        to: '/OCRConverter',
      },
      {
        title: 'Client account (trust) reconciliation',
        problem: 'The monthly three-way check of bank, client ledger and cash book that regulators require.',
        delivers: 'Line-by-line matching, an exceptions list and a sign-off pack, with the same rules every month.',
        status: 'beta',
        to: '/Reconciliation',
      },
      {
        title: 'Matter profitability and unpaid bills',
        problem: 'Work in progress and debt reports pieced together from practice-system exports.',
        delivers: 'Monthly reports and dashboards from your exports, with the source of every number.',
        status: 'available',
        to: '/unified-reporting',
      },
      {
        title: 'Conflict checks',
        problem: 'New clients and parties checked by hand against years of records.',
        delivers: 'Fuzzy name matching against past clients and parties, with the reason for each match.',
        status: 'planned',
      },
      {
        title: 'Billing code checks (LEDES / UTBMS)',
        problem: 'Invoices rejected by clients’ e-billing systems.',
        delivers: 'Time entries checked against billing guidelines and codes before the invoice goes out.',
        status: 'planned',
      },
      {
        title: 'Redaction',
        problem: 'Names, account numbers and IDs removed by hand before disclosure.',
        delivers: 'Find and redact personal data, with a log of every redaction.',
        status: 'planned',
      },
      {
        title: 'Contract and lease review to a spreadsheet',
        problem: 'Key dates and terms copied out of hundreds of documents.',
        delivers: 'Parties, dates, renewal, notice and liability caps in one table, each value linked to its page.',
        status: 'planned',
      },
      {
        title: 'Moving to a new practice system',
        problem: 'Client, matter and ledger data moved by hand, with errors found after go-live.',
        delivers: 'Mapping, cleansing and load-ready files, repeated test cycle after test cycle.',
        status: 'planned',
      },
    ],
  },
  {
    id: 'finance',
    name: 'Finance',
    summary: 'Month-end work that has to be right every time: matching, statements and reports you can rerun.',
    useCases: [
      {
        title: 'Two-file reconciliation',
        problem: 'Bank, ledger and system extracts matched by hand in spreadsheets.',
        delivers: 'Match on a key, compare amounts with a tolerance, and export matched, unmatched and variances.',
        status: 'beta',
        to: '/Reconciliation',
      },
      {
        title: 'P&L builder',
        problem: 'Profit and loss statements rebuilt from scratch every period.',
        delivers: 'A formatted P&L workbook with live formulas and charts, from a description or an existing P&L.',
        status: 'beta',
        to: '/PLBuilder',
      },
      {
        title: 'Invoices to a spreadsheet',
        problem: 'Supplier invoices keyed in by hand.',
        delivers: 'Invoice fields extracted to Excel.',
        status: 'available',
        to: '/InvoiceExtractor',
      },
      {
        title: 'Management reporting',
        problem: 'Monthly packs assembled from several systems.',
        delivers: 'Combined sources, plain-English questions and dashboards.',
        status: 'available',
        to: '/unified-reporting',
      },
      {
        title: 'Reconciliation with saved rules and sign-off',
        problem: 'One-to-many matches, date differences and fuzzy references that simple matching misses.',
        delivers: 'Several keys, fuzzy and date-window matching, saved rules, an exceptions queue and an audit pack.',
        status: 'planned',
      },
      {
        title: 'P&L from a trial balance',
        problem: 'Mapping ledger accounts to statement lines every month.',
        delivers: 'A saved chart-of-accounts mapping, budget versus actual and prior period.',
        status: 'planned',
      },
    ],
  },
  {
    id: 'hr-payroll',
    name: 'HR and payroll',
    summary: 'System migrations and recurring people reporting, with the target system’s rules built in.',
    useCases: [
      {
        title: 'Migration to SAP SuccessFactors',
        problem: 'Legacy extracts mapped and cleansed by hand for every mock cycle.',
        delivers: 'Field mapping, value translation and load-ready files, reused cycle after cycle.',
        status: 'available',
        to: '/migration',
      },
      {
        title: 'Headcount and people reporting',
        problem: 'Reports rebuilt from several HR and payroll exports.',
        delivers: 'Combined sources, plain-English questions and dashboards.',
        status: 'available',
        to: '/unified-reporting',
      },
      {
        title: 'Payroll reconciliation',
        problem: 'Payroll totals checked against HR and finance by hand.',
        delivers: 'Employee-level matching between payroll and HR or ledger extracts.',
        status: 'beta',
        to: '/Reconciliation',
      },
      {
        title: 'Workday and Oracle HCM targets',
        problem: 'The same migration work for other HR systems.',
        delivers: 'Load templates and validation rules for more target systems.',
        status: 'planned',
      },
    ],
  },
  {
    id: 'insurance',
    name: 'Insurance',
    summary: 'Policy and claims data from partners and documents, checked before it reaches your systems.',
    useCases: [
      {
        title: 'Claims and policy documents to data',
        problem: 'Forms and scanned documents keyed in by hand.',
        delivers: 'OCR and form reading to structured data.',
        status: 'available',
        to: '/OCRConverter',
      },
      {
        title: 'Bordereaux cleansing and checks',
        problem: 'Monthly policy and claims files from partners in different layouts.',
        delivers: 'Map each partner’s layout once, validate every month, report exceptions.',
        status: 'planned',
      },
      {
        title: 'Premium and claims payment matching',
        problem: 'Payments matched to policies and claims by hand.',
        delivers: 'Matching with tolerances and an exceptions list.',
        status: 'beta',
        to: '/Reconciliation',
      },
    ],
  },
  {
    id: 'universities',
    name: 'Universities',
    summary: 'Student, staff and research data moved, reported and returned to regulators.',
    useCases: [
      {
        title: 'Department and research reporting',
        problem: 'Reports built from several systems every term.',
        delivers: 'Combined sources, plain-English questions and dashboards.',
        status: 'available',
        to: '/unified-reporting',
      },
      {
        title: 'Scanned archives to searchable text',
        problem: 'Theses and records that cannot be searched.',
        delivers: 'OCR to Word or searchable PDF.',
        status: 'available',
        to: '/OCRConverter',
      },
      {
        title: 'Student system migration',
        problem: 'Student records moved to a new system by hand.',
        delivers: 'Mapping, cleansing and load-ready files, repeated per test cycle.',
        status: 'planned',
      },
      {
        title: 'Statutory returns',
        problem: 'Annual data returns (HESA, IPEDS) assembled and checked by hand.',
        delivers: 'Validation rules and return files from your records.',
        status: 'planned',
      },
    ],
  },
  {
    id: 'manufacturing',
    name: 'Manufacturing',
    summary: 'Stock, bills of materials and supplier data kept consistent across systems.',
    useCases: [
      {
        title: 'Plant and inventory reporting',
        problem: 'Reports built from ERP and spreadsheet exports.',
        delivers: 'Combined sources, plain-English questions and dashboards.',
        status: 'available',
        to: '/unified-reporting',
      },
      {
        title: 'Inventory and stock reconciliation',
        problem: 'System stock compared with counts by hand.',
        delivers: 'Matching with tolerances and an exceptions list.',
        status: 'beta',
        to: '/Reconciliation',
      },
      {
        title: 'Purchase order, goods received and invoice matching',
        problem: 'Three documents matched line by line before payment.',
        delivers: 'Three-way matching with quantity and price tolerances.',
        status: 'planned',
      },
      {
        title: 'Supplier price list cleansing',
        problem: 'Price files in every layout.',
        delivers: 'Map each supplier’s layout once and standardise every update.',
        status: 'planned',
      },
    ],
  },
];

export const SOLUTIONS_BY_ID = Object.fromEntries(SOLUTIONS.map((s) => [s.id, s]));

export const STATUS_LABELS = { available: 'Available', beta: 'Beta', planned: 'Planned' };
