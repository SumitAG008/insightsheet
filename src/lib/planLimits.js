// Plan limits as shown on the website. The server's table (backend/app/services/plan_limits.py,
// served at /api/plans/limits) is the source of truth; this copy is only used if that call fails.

export const PLAN_ORDER = ['free', 'pro', 'team', 'business'];

// What each plan's price is for; the amount and currency come from the visitor's region (src/lib/region.js).
export const PLAN_PRICE_UNITS = {
  free: '',
  pro: 'per month',
  team: 'per user per month',
  business: 'annual licence',
};

export const LIMIT_LABELS = {
  file_size_mb: 'Largest single file (MB)',
  spreadsheet_rows: 'Rows per spreadsheet (all sheets together)',
  pdf_pages: 'Pages per PDF',
  ocr_pages: 'Scanned pages read by OCR per file',
  conversions_per_month: 'Conversions and file jobs per month',
  ai_queries_per_month: 'AI questions per month',
  monthly_upload_mb: 'Total uploads per month (MB)',
  concurrent_jobs: 'Files processing at the same time',
  requests_per_minute: 'Requests per minute',
};

export const FALLBACK_LIMITS = {
  keys: LIMIT_LABELS,
  plans: {
    free: { name: 'Free', limits: { file_size_mb: 10, spreadsheet_rows: 50000, pdf_pages: 50, ocr_pages: 5, conversions_per_month: 20, ai_queries_per_month: 20, monthly_upload_mb: 200, concurrent_jobs: 1, requests_per_minute: 120 } },
    pro: { name: 'Pro', limits: { file_size_mb: 50, spreadsheet_rows: 300000, pdf_pages: 300, ocr_pages: 50, conversions_per_month: 500, ai_queries_per_month: 300, monthly_upload_mb: 5000, concurrent_jobs: 2, requests_per_minute: 240 } },
    team: { name: 'Team', limits: { file_size_mb: 100, spreadsheet_rows: 1000000, pdf_pages: 1000, ocr_pages: 100, conversions_per_month: 2000, ai_queries_per_month: 1000, monthly_upload_mb: 20000, concurrent_jobs: 3, requests_per_minute: 300 } },
    business: { name: 'Business', limits: { file_size_mb: 200, spreadsheet_rows: 2000000, pdf_pages: 2000, ocr_pages: 300, conversions_per_month: 5000, ai_queries_per_month: 3000, monthly_upload_mb: 50000, concurrent_jobs: 4, requests_per_minute: 600 } },
  },
  unlimited: -1,
};

// Which limits customers compare plans on (the rest are server protections).
export const HEADLINE_KEYS = ['file_size_mb', 'spreadsheet_rows', 'pdf_pages', 'ocr_pages', 'conversions_per_month', 'ai_queries_per_month', 'concurrent_jobs'];

export function formatLimit(value, key) {
  if (value === null || value === undefined) return '—';
  const n = Number(value);
  if (n < 0) return 'Unlimited';
  if (key === 'file_size_mb' || key === 'monthly_upload_mb') {
    return n >= 1000 && n % 1000 === 0 ? `${n / 1000} GB` : `${n.toLocaleString()} MB`;
  }
  return n.toLocaleString();
}
