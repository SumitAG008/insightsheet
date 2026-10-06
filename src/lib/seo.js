// Page titles and descriptions for meldra Insight, and the plain-text version of each public page.
// Used in two places: the browser sets the tab title from titleFor() on every navigation, and the
// build step (scripts/prerender.mjs) writes each public page's title, description, link-preview tags
// and plain-text content into its HTML, so search engines and link previews see the page without
// running JavaScript. No app imports here, so Node can read this file during the build.
import { REGIONS, ANNUAL_NOTE } from './prices.js';

export const PRODUCT = 'meldra Insight';
export const SITE_URL = 'https://insight.meldra.ai';
export const DEFAULT_DESCRIPTION =
  'Turn spreadsheets and PDFs into charts, P&L statements and board-ready PowerPoint slides by asking in plain English. ' +
  'Built for UK finance teams and accountancy firms. Files are processed in memory and not stored.';

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const TOOLS = [
  ['Ask your data', 'Ask a question about a spreadsheet in plain English and get the answer, a chart or a summary.'],
  ['P&L from a sentence', 'Describe the profit and loss statement you need and get a formatted P&L workbook.'],
  ['Excel to PowerPoint', 'Turn a workbook into board-ready slides with charts, ready for month-end packs.'],
  ['Reconciliation', 'Match two files (bank, ledger, supplier statement) and see what does not agree.'],
  ['Invoice and statement extraction', 'Pull the figures out of PDF invoices and bank statements into Excel.'],
  ['PDF tools and OCR', 'Convert, merge, split, fill and edit PDFs, and read scanned documents.'],
  ['Clean and standardise', 'Remove duplicates, fix headers, dates and numbers without writing formulas.'],
];

const toolsHtml = () =>
  '<ul>' + TOOLS.map(([t, d]) => `<li><strong>${esc(t)}</strong>: ${esc(d)}</li>`).join('') + '</ul>';

function pricingHtml() {
  const gb = REGIONS.GB;
  const rows = [
    ['Free', gb.prices.free, '10 MB files, 20 conversions and 20 AI questions a month'],
    ['Pro (one person)', `${gb.prices.pro} a month, or ${gb.yearly.pro} a year`, '100 MB files, 1,000 conversions and 500 AI questions a month'],
    ['Team (from 3 users)', `${gb.prices.team} per user a month, or ${gb.yearly.team} per user a year`, '100 MB files, 2,000 conversions and 1,000 AI questions a month per user, admin page and usage reports'],
    ['Business and universities', 'Custom annual licence', 'Custom limits, invoice and purchase-order billing, data processing agreement'],
  ];
  return (
    '<table><thead><tr><th>Plan</th><th>Price</th><th>Includes</th></tr></thead><tbody>' +
    rows.map((r) => `<tr><td>${esc(r[0])}</td><td>${esc(r[1])}</td><td>${esc(r[2])}</td></tr>`).join('') +
    '</tbody></table>' +
    `<p>${esc(ANNUAL_NOTE)} ${esc(gb.tax)} Prices are shown in your local currency (GBP, EUR, USD or INR) based on your location.</p>`
  );
}

const startFree = `<p><a href="${SITE_URL}/register">Start free</a> · <a href="${SITE_URL}/pricing">See pricing</a></p>`;

// Public pages: [path] -> title, description, plain-text body (HTML).
export const PUBLIC_PAGES = {
  '/': {
    file: 'home',
    title: `${PRODUCT}: Data Made Simple`,
    description: DEFAULT_DESCRIPTION,
    body: () =>
      `<h1>${PRODUCT}: Data Made Simple</h1><p>${esc(DEFAULT_DESCRIPTION)}</p>${toolsHtml()}${startFree}`,
  },
  '/pricing': {
    file: 'pricing',
    title: `Pricing | ${PRODUCT}`,
    description: `Free plan, Pro ${REGIONS.GB.prices.pro} a month and Team ${REGIONS.GB.prices.team} per user a month. ${ANNUAL_NOTE} Annual licences for firms and universities.`,
    body: () => `<h1>${PRODUCT} pricing</h1>${pricingHtml()}${startFree}`,
  },
  '/faq': {
    file: 'faq',
    title: `FAQ | ${PRODUCT}`,
    description: `Answers about ${PRODUCT}: supported files, how charts and reports are made, privacy, limits and plans.`,
    body: () =>
      `<h1>${PRODUCT}: frequently asked questions</h1><p>How spreadsheets are analysed, why a chart may be blocked when a workbook's formulas were not calculated, how reconciliation and standardisation work, and what is stored (file contents are not).</p>${toolsHtml()}${startFree}`,
  },
  '/developers': {
    file: 'developers',
    title: `Developers and API | ${PRODUCT}`,
    description: `The ${PRODUCT} API: run conversions, P&L generation and reporting pipelines from your own systems.`,
    body: () =>
      `<h1>${PRODUCT} for developers</h1><p>Use the API to automate repeatable reporting: P&L generation, Excel operations, document conversion and form extraction. API keys are issued per account.</p>${startFree}`,
  },
  '/terms': {
    file: 'terms',
    title: `Terms of Service | ${PRODUCT}`,
    description: `Terms for using ${PRODUCT}: plans and fair use, organisation licences, payment, your data, sensitive data, AI features and liability.`,
    body: () =>
      `<h1>${PRODUCT} Terms of Service</h1><p>Covers plans, limits and fair use; organisation licences and seats; fees and payment; your files and data (processed in memory, not stored unless you save them); sensitive and regulated data; AI features; availability; suspension; liability; and governing law (England and Wales).</p>`,
  },
  '/privacy': {
    file: 'privacy',
    title: `Privacy Policy | ${PRODUCT}`,
    description: `How ${PRODUCT} handles your data: files are processed in memory and not stored, no advertising or third-party tracking, and your rights under UK GDPR.`,
    body: () =>
      `<h1>${PRODUCT} Privacy Policy</h1><p>File contents are processed in memory and not kept. Data is stored only if you choose to save it, and you can delete it at any time. No advertising, and no third-party or cross-site tracking. You can access, correct, erase or export your personal data.</p>`,
  },
  '/security': {
    file: 'security',
    title: `Security | ${PRODUCT}`,
    description: `Security at ${PRODUCT}: in-memory file processing, encryption in transit, two-step sign-in, device limits and encrypted backups.`,
    body: () =>
      `<h1>${PRODUCT} security</h1><p>Files are processed in memory and discarded when the result is ready. Connections are encrypted, sign-in uses a one-time code, accounts are limited to two devices, and records backups are encrypted.</p>`,
  },
  '/disclaimer': {
    file: 'disclaimer',
    title: `Disclaimer | ${PRODUCT}`,
    description: `Disclaimer for ${PRODUCT}: check results before relying on them; not financial, legal or medical advice.`,
    body: () => `<h1>${PRODUCT} disclaimer</h1><p>Results and AI answers can contain errors; check them before you rely on them. ${PRODUCT} is not financial, legal, tax or medical advice.</p>`,
  },
};

// Tab titles for signed-in pages (by lower-case path).
const APP_TITLES = {
  '/dashboard': 'Home',
  '/solutions': 'Solutions',
  '/agenticworkflows': 'Automations',
  '/usage': 'Plan and usage',
  '/organization': 'Organisation',
  '/adminlicenses': 'Licences',
  '/settings': 'Settings',
  '/plbuilder': 'P&L builder',
  '/filetoppt': 'Excel to PowerPoint',
  '/pdfdocconverter': 'Document converter',
  '/ocrconverter': 'OCR',
  '/pdfeditor': 'PDF tools and editor',
  '/fileanalyzer': 'File analysis',
  '/reconciliation': 'Reconciliation',
  '/unifiedreporting': 'Unified reporting',
  '/migration': 'Migration',
  '/login': 'Sign in',
  '/register': 'Create your account',
};

export function titleFor(pathname) {
  const p = (String(pathname || '/').toLowerCase().replace(/\/+$/, '') || '/');
  if (PUBLIC_PAGES[p]) return PUBLIC_PAGES[p].title;
  if (APP_TITLES[p]) return `${APP_TITLES[p]} | ${PRODUCT}`;
  return `${PRODUCT}: Data Made Simple`;
}

export function descriptionFor(pathname) {
  const p = (String(pathname || '/').toLowerCase().replace(/\/+$/, '') || '/');
  return PUBLIC_PAGES[p]?.description || DEFAULT_DESCRIPTION;
}

// The <head> tags for one public page (title, description, canonical, link previews).
export function headTags(path, page = PUBLIC_PAGES[path]) {
  const url = SITE_URL + (path === '/' ? '/' : path);
  const image = `${SITE_URL}/meldra.png`;
  return [
    `<title>${esc(page.title)}</title>`,
    `<meta name="description" content="${esc(page.description)}" />`,
    `<link rel="canonical" href="${url}" />`,
    `<meta property="og:site_name" content="${PRODUCT}" />`,
    `<meta property="og:type" content="website" />`,
    `<meta property="og:title" content="${esc(page.title)}" />`,
    `<meta property="og:description" content="${esc(page.description)}" />`,
    `<meta property="og:url" content="${url}" />`,
    `<meta property="og:image" content="${image}" />`,
    `<meta name="twitter:card" content="summary" />`,
    `<meta name="twitter:title" content="${esc(page.title)}" />`,
    `<meta name="twitter:description" content="${esc(page.description)}" />`,
    `<meta name="twitter:image" content="${image}" />`,
  ].join('\n    ');
}
