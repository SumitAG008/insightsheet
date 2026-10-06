// The Help Center article for each app page, so every tool can link straight to its guide.
export const PAGE_GUIDES = {
  '/dashboard': 'ask-meldra',
  '/agenticai': 'ai-assistant-chat',
  '/agenticworkflows': 'automated-workflows',
  '/fileanalyzer': 'analyse-a-file',
  '/autostandardize': 'clean-and-standardise-data',
  '/reconciliation': 'reconcile-two-files',
  '/plbuilder': 'build-a-pl-statement',
  '/filetoppt': 'excel-to-powerpoint',
  '/pdfdocconverter': 'convert-documents',
  '/pdfeditor': 'edit-pdfs',
  '/ocrconverter': 'read-scanned-documents-ocr',
  '/invoiceextractor': 'extract-invoices-and-receipts',
  '/filenamecleaner': 'clean-up-file-names',
  '/datamodelcreator': 'design-a-data-model',
  '/databaseconnection': 'connect-a-database',
  '/playwrightconnector': 'collect-data-from-websites',
  '/unifiedreporting': 'unified-reporting-overview',
  '/unified-reporting': 'unified-reporting-overview',
  '/migration': 'migration-overview',
  '/settings': 'account-settings',
  '/usage': 'usage-and-limits-page',
  '/organization': 'organisations-and-team-licences',
};

/** The guide's path for a page, e.g. "/help/reconcile-two-files", or null when the page has none. */
export function guideFor(pathname) {
  const p = String(pathname || '').toLowerCase().replace(/\/+$/, '');
  return PAGE_GUIDES[p] ? `/help/${PAGE_GUIDES[p]}` : null;
}
