// The signed-in app's main menu: one list used by the desktop bar and the mobile menu.
// Six entries, each with one job (docs/PRODUCT_STRUCTURE.md):
//   Home · Workbench · Unified Reporting · Migration · Documents · Solutions
// plus licensed add-ons that only appear for accounts that bought them (Legal).
// Automations (Agentic Workflows) is out of the menu until it is rebuilt as Recipes; /AgenticWorkflows still opens.
// Ask meldra (Ctrl/⌘ + K) is available on every page, so there is no separate AI menu.
// Icons are lucide-react names, resolved in Layout.jsx, so this file stays plain data for tests.

export const NAV = [
  { id: 'home', label: 'Home', icon: 'Home', to: '/Dashboard' },
  { id: 'workbench', label: 'Workbench', icon: 'Table2', to: '/workbench' },
  {
    id: 'unified_reporting',
    label: 'Unified Reporting',
    icon: 'LineChart',
    items: [
      { label: 'Reports and questions', description: 'Combine sources, ask in plain English, build dashboards', icon: 'LineChart', to: '/unified-reporting' },
      { label: 'Database connection', description: 'Read from your databases', icon: 'Plug', to: '/DatabaseConnection' },
      { label: 'Web data', description: 'Collect data from websites', icon: 'Globe', to: '/PlaywrightConnector' },
      { label: 'Data model', description: 'Design tables and relationships', icon: 'Database', to: '/DataModelCreator' },
    ],
  },
  { id: 'migration', label: 'Migration', icon: 'ArrowRightLeft', to: '/migration' },
  {
    id: 'documents',
    label: 'Documents',
    icon: 'FileText',
    items: [
      { label: 'PDF tools and editor', description: 'Edit, fill, merge and split PDFs', icon: 'FileType', to: '/pdfeditor' },
      { label: 'Document converter', description: 'PDF, Word and PowerPoint', icon: 'FileType', to: '/PdfDocConverter' },
      { label: 'OCR', description: 'Scans and photos to text, Word or PDF', icon: 'ScanLine', to: '/OCRConverter' },
      { label: 'Invoice extraction', description: 'Invoices to a spreadsheet', icon: 'Receipt', to: '/InvoiceExtractor' },
      { label: 'Excel to PowerPoint', description: 'Charts and tables to slides', icon: 'Presentation', to: '/FileToPPT' },
      { label: 'Rename files', description: 'Clean many file names at once', icon: 'FileArchive', to: '/FilenameCleaner' },
    ],
  },
  {
    id: 'solutions',
    label: 'Solutions',
    icon: 'Briefcase',
    items: [
      { label: 'Finance', description: 'Reconciliation and P&L (beta)', icon: 'GitCompareArrows', to: '/solutions/finance' },
      { label: 'Law firms', description: 'Client account checks, bundles, conflicts, billing', icon: 'Scale', to: '/solutions/law-firms' },
      { label: 'HR and payroll', description: 'Migrations, payroll checks, headcount', icon: 'Users', to: '/solutions/hr-payroll' },
      { label: 'All solutions', description: 'Insurance, universities, manufacturing', icon: 'Briefcase', to: '/solutions' },
    ],
  },
  // meldra Legal: matter and hearing diary, a paid add-on. Hidden unless the account has the licence.
  { id: 'legal', label: 'Legal', icon: 'Scale', to: '/legal', restricted: 'legal' },
];

const lower = (p) => String(p || '').split('?')[0].replace(/\/+$/, '').toLowerCase();

// Every path a menu entry covers, for highlighting the active entry.
export function entryPaths(entry) {
  return entry.items ? entry.items.map((i) => i.to) : [entry.to];
}

// True when `pathname` belongs to this entry (case-insensitive; /solutions/* counts for Solutions).
export function isEntryActive(entry, pathname) {
  const here = lower(pathname);
  if (entry.id === 'solutions' && (here === '/solutions' || here.startsWith('/solutions/'))) return true;
  if (entry.id === 'home' && (here === '' || here === '/dashboard')) return true;
  return entryPaths(entry).some((p) => lower(p) === here);
}

// The menu for this user: entries restricted to a capability are left out when the user lacks it.
export function visibleNav(capabilities = {}) {
  return NAV.filter((e) => !e.restricted || capabilities[e.restricted]);
}
