// The same tool list the server ranks (backend/app/services/personalization.py). Used to show
// icons, and to search on the device when the server can't be reached.
import {
  ArrowRightLeft, Bot, Database, FileArchive, FileSpreadsheet, FileText, GitCompareArrows, Globe,
  LineChart, Presentation, Receipt, ScanLine, Settings, Sparkles, Table2, Workflow,
} from 'lucide-react';

export const TOOLS = [
  { id: 'excel_to_ppt', title: 'Excel to PowerPoint', path: '/FileToPPT', icon: Presentation, description: 'Turn spreadsheets and CSV files into slides with their charts and tables', keywords: ['excel to ppt', 'excel to powerpoint', 'xlsx to pptx', 'spreadsheet to slides', 'charts to slides', 'csv to ppt', 'presentation', 'deck', 'slides'] },
  { id: 'filename_cleaner', title: 'Filename Cleaner', path: '/FilenameCleaner', icon: FileArchive, description: 'Clean, rename or replace text in many file names at once, inside a ZIP', keywords: ['rename files', 'file names', 'bulk rename', 'replace in file names', 'clean names', 'zip', 'remove spaces', 'tidy files'] },
  { id: 'pdf_editor', title: 'PDF Editor', path: '/PDFEditor', icon: FileText, description: 'Fill and edit any PDF or photo of a form, add text anywhere, white-out, merge and split', keywords: ['edit pdf', 'fill pdf', 'fill form', 'type on pdf', 'add text to pdf', 'white out', 'sign pdf', 'merge pdf', 'split pdf', 'combine pdf', 'pdf pages'] },
  { id: 'pdf_doc_converter', title: 'PDF and Document Converter', path: '/PdfDocConverter', icon: FileSpreadsheet, description: 'Convert between PDF, Word, Excel and images', keywords: ['pdf to word', 'word to pdf', 'pdf to excel', 'excel to pdf', 'docx', 'convert document', 'pdf to image'] },
  { id: 'ocr', title: 'OCR Converter', path: '/OCRConverter', icon: ScanLine, description: 'Read text from scanned documents and images', keywords: ['ocr', 'scan to text', 'image to text', 'scanned pdf', 'extract text', 'read text from image'] },
  { id: 'workbench', title: 'Workbench', path: '/workbench', icon: Sparkles, description: 'Check a spreadsheet for problems, fix them and download a clean copy', keywords: ['analyse', 'analyze', 'insights', 'summary', 'profile data', 'understand spreadsheet', 'data quality', 'clean data', 'standardise', 'standardize', 'dedupe', 'duplicates', 'fix formats', 'data cleaning'] },
  { id: 'pl_builder', title: 'P&L Builder', path: '/PLBuilder', icon: LineChart, description: 'Build a profit and loss statement from a prompt or a trial balance', keywords: ['p&l', 'profit and loss', 'income statement', 'trial balance', 'financial statement', 'pnl'] },
  { id: 'reconciliation', title: 'Reconciliation', path: '/Reconciliation', icon: GitCompareArrows, description: 'Match two files and find the differences, e.g. bank vs ledger', keywords: ['reconcile', 'bank reconciliation', 'bank rec', 'match', 'compare files', 'ledger', 'differences'] },
  { id: 'unified_reporting', title: 'Unified Reporting', path: '/UnifiedReporting', icon: LineChart, description: 'Combine exports from several systems and ask questions across them', keywords: ['report', 'dashboard', 'combine data', 'multiple sources', 'cross system', 'kpi', 'bi', 'join files'] },
  { id: 'migration', title: 'Migration', path: '/Migration', icon: ArrowRightLeft, description: 'Map and validate data for moving between systems (SAP, SuccessFactors, Workday)', keywords: ['migration', 'data migration', 'mapping', 'sap', 'successfactors', 'workday', 'load file', 'payroll'] },
  { id: 'invoice_extractor', title: 'Invoice Extractor', path: '/InvoiceExtractor', icon: Receipt, description: 'Pull header fields and line items out of invoices into Excel', keywords: ['invoice', 'extract invoice', 'scanned invoice', 'line items', 'accounts payable', 'receipts', 'bills'] },
  { id: 'database_connection', title: 'Database Connection', path: '/DatabaseConnection', icon: Database, description: 'Connect to a database and run read-only queries', keywords: ['database', 'sql', 'postgres', 'mysql', 'query', 'connect'] },
  { id: 'data_model_creator', title: 'Data Model Creator', path: '/DataModelCreator', icon: Table2, description: 'Design a data model from your tables', keywords: ['data model', 'schema', 'erd', 'tables', 'relationships'] },
  { id: 'agentic_ai', title: 'AI Agent', path: '/AgenticAI', icon: Bot, description: 'Describe a task in plain words and let AI plan and run the steps', keywords: ['ai', 'agent', 'automate', 'workflow', 'prompt', 'ask ai', 'automation'] },
  { id: 'web_scraper', title: 'Web Data Connector', path: '/PlaywrightConnector', icon: Globe, description: 'Collect table data from a public website', keywords: ['scrape', 'website data', 'web table', 'crawl'] },
  { id: 'settings', title: 'Settings', path: '/Settings', icon: Settings, description: 'Profile, language, branding and signed-in devices', keywords: ['settings', 'devices', 'sign out', 'profile', 'language', 'branding'] },
];

export const TOOLS_BY_ID = Object.fromEntries(TOOLS.map((t) => [t.id, t]));
export const DEFAULT_ICON = Workflow;

const words = (text) => (text || '').toLowerCase().match(/[a-z0-9&]+/g) || [];
const stem = (w) => (w.length > 4 ? w.replace(/(ies|ing|ers|er|ed|s)$/, '') : w);

/** Search on the device: every query word must appear (as a word start) in the tool's text. */
export function searchLocally(query, limit = 8) {
  const q = words(query).map(stem);
  if (!q.length) return [];
  return TOOLS.map((tool) => {
    const text = words([tool.title, tool.description, ...tool.keywords].join(' ')).map(stem);
    const title = words(tool.title).map(stem);
    let score = 0;
    for (const w of q) {
      if (title.some((t) => t.startsWith(w))) score += 2;
      else if (text.some((t) => t.startsWith(w))) score += 1;
      else return null;
    }
    return { ...tool, score };
  })
    .filter(Boolean)
    .sort((a, b) => b.score - a.score)
    .filter((t, _, all) => t.score >= all[0].score * 0.6)
    .slice(0, limit);
}
