// Workbench: turns the file check (/api/files/analyze) into plain findings, each tied to the fix
// that solves it (/api/files/standardize). Pure functions, so they are unit-tested.

export const ACCEPT = '.xlsx,.xls,.csv';
export const ACCEPT_RE = /\.(xlsx|xls|csv)$/i;

// The fixes the clean-up step can apply. Keys match the standardize API options.
export const FIXES = {
  dedupeRows: { label: 'Remove duplicate rows', example: 'Two identical rows become one' },
  parseNumbers: { label: 'Turn text into numbers', example: '"(1,234.50)" becomes -1234.5' },
  parseDates: { label: 'Turn text into dates', example: '"03/10/2026" becomes 3 October 2026' },
  unifyText: { label: 'Make spellings consistent', example: '" north " and "north" become "North"' },
  normalizeHeaders: { label: 'Tidy column names', example: '" Invoice Date" becomes "invoice_date"' },
};
export const FIX_KEYS = Object.keys(FIXES);

export function qualityLabel(score) {
  if (score == null || Number.isNaN(Number(score))) return null;
  const s = Number(score);
  if (s >= 80) return { label: 'Good', tone: 'good' };
  if (s >= 50) return { label: 'Needs attention', tone: 'warn' };
  return { label: 'Poor', tone: 'bad' };
}

const NUMBER_AS_TEXT = /^\(?\s*-?\s*[£$€₹]?\s*\d{1,3}(,\d{3})+(\.\d+)?\s*\)?%?$|^\(?\s*-?\s*[£$€₹]\s*\d+(\.\d+)?\s*\)?$|^\(\s*\d+(\.\d+)?\s*\)$/;
const DATE_AS_TEXT = /^(\d{1,2}[/.-]\d{1,2}[/.-]\d{2,4}|\d{4}[/.-]\d{1,2}[/.-]\d{1,2}|\d{1,2}[\s-][A-Za-z]{3,9}[\s-]\d{2,4})$/;

function mostlyMatch(values, re) {
  const vals = (values || []).map((v) => String(v ?? '').trim()).filter(Boolean);
  if (vals.length === 0) return false;
  return vals.filter((v) => re.test(v)).length / vals.length >= 0.6;
}

const list = (names, max = 3) => {
  const shown = names.slice(0, max).map((n) => `"${n}"`).join(', ');
  return names.length > max ? `${shown} and ${names.length - max} more` : shown;
};

const plural = (n, one, many) => `${Number(n).toLocaleString()} ${n === 1 ? one : many}`;

/**
 * Findings for one analysed sheet, most serious first. Each has a severity (high, medium, low),
 * a title, a detail sentence, and either `fix` (a FIXES key the clean-up step applies) or `review`
 * (what the person should check themselves, when no automatic fix is safe).
 */
export function sheetFindings(sheet) {
  if (!sheet) return [];
  const rows = Number(sheet.row_count || 0);
  const columns = sheet.columns || [];
  const out = [];

  const dups = Number(sheet.duplicate_rows || 0);
  if (dups > 0) {
    out.push({
      id: 'duplicates',
      severity: rows && dups / rows > 0.05 ? 'high' : 'medium',
      title: `${plural(dups, 'duplicate row', 'duplicate rows')}`,
      detail: 'Identical rows are counted twice in totals and lookups.',
      fix: 'dedupeRows',
    });
  }

  const veryEmpty = columns.filter((c) => Number(c.null_percentage) > 50).map((c) => c.name);
  const someEmpty = columns.filter((c) => Number(c.null_percentage) > 20 && Number(c.null_percentage) <= 50).map((c) => c.name);
  if (veryEmpty.length) {
    out.push({
      id: 'missing-high',
      severity: 'high',
      title: `More than half empty: ${list(veryEmpty)}`,
      detail: 'Totals and averages from these columns will be misleading.',
      review: 'Fill in the gaps at source, or leave these columns out of reports.',
    });
  }
  if (someEmpty.length) {
    out.push({
      id: 'missing-medium',
      severity: 'medium',
      title: `Many blanks: ${list(someEmpty)}`,
      detail: '20–50% of the cells in these columns are empty.',
      review: 'Check whether the blanks mean zero, unknown or not applicable.',
    });
  }

  const numbersAsText = columns
    // By value, not type: the check calls "52,000" numeric, but Excel will not add it up as text.
    .filter((c) => mostlyMatch(c.sample_values, NUMBER_AS_TEXT))
    .map((c) => c.name);
  if (numbersAsText.length) {
    out.push({
      id: 'numbers-as-text',
      severity: 'medium',
      title: `Numbers stored as text: ${list(numbersAsText)}`,
      detail: 'Commas, currency signs or brackets stop these values adding up.',
      fix: 'parseNumbers',
    });
  }

  const datesAsText = columns
    .filter((c) => c.type !== 'date' && mostlyMatch(c.sample_values, DATE_AS_TEXT))
    .map((c) => c.name);
  if (datesAsText.length) {
    out.push({
      id: 'dates-as-text',
      severity: 'medium',
      title: `Dates stored as text: ${list(datesAsText)}`,
      detail: 'These cannot be sorted or filtered by date until they are real dates.',
      fix: 'parseDates',
    });
  }

  const variants = columns.filter((c) => Number(c.inconsistent_count) > 0);
  if (variants.length) {
    const count = variants.reduce((n, c) => n + Number(c.inconsistent_count), 0);
    const [from, to] = variants[0].inconsistent_values?.[0] || [];
    out.push({
      id: 'variants',
      severity: 'medium',
      title: `${plural(count, 'value is', 'values are')} spelt differently in ${list(variants.map((c) => c.name))}`,
      detail: `${from != null ? `"${from}" and "${to}"` : 'Values that differ only in capitals or spaces'} are counted as separate groups in totals.`,
      fix: 'unifyText',
    });
  }

  const names = columns.map((c) => String(c.name ?? ''));
  const seen = new Map();
  names.forEach((n) => {
    const k = n.trim().toLowerCase();
    seen.set(k, (seen.get(k) || 0) + 1);
  });
  const untidy = names.filter(
    (n) => !n.trim() || /^unnamed/i.test(n) || n !== n.trim() || /\s{2,}/.test(n) || seen.get(n.trim().toLowerCase()) > 1,
  );
  if (untidy.length) {
    out.push({
      id: 'headers',
      severity: 'low',
      title: `${plural(untidy.length, 'column name needs', 'column names need')} tidying`,
      detail: 'Blank, repeated or space-padded names break lookups and imports.',
      fix: 'normalizeHeaders',
    });
  }

  const outliers = sheet.outliers?.by_column || [];
  if (outliers.length) {
    const total = outliers.reduce((s, o) => s + Number(o.count || 0), 0);
    out.push({
      id: 'outliers',
      severity: 'low',
      title: `${plural(total, 'unusual value', 'unusual values')} in ${list(outliers.map((o) => o.column))}`,
      detail: 'Values far outside the usual range for their column, e.g. ' +
        outliers.slice(0, 2).map((o) => `${o.column}: ${(o.sample_values || []).slice(0, 2).join(', ')}`).join('; ') + '.',
      review: 'Check these are real and not typing mistakes.',
    });
  }

  const order = { high: 0, medium: 1, low: 2 };
  return out.sort((a, b) => order[a.severity] - order[b.severity]);
}

/** The fixes worth switching on for these findings. */
export function recommendedFixes(findings) {
  const on = Object.fromEntries(FIX_KEYS.map((k) => [k, false]));
  (findings || []).forEach((f) => {
    if (f.fix) on[f.fix] = true;
  });
  return on;
}

/** Share of empty cells across the sheet, 0–100. */
export function missingShare(sheet) {
  const cols = sheet?.columns || [];
  const rows = Number(sheet?.row_count || 0);
  if (!cols.length || !rows) return 0;
  const empty = cols.reduce((s, c) => s + Number(c.null_count || 0), 0);
  return Math.round((empty / (cols.length * rows)) * 1000) / 10;
}

export function formatBytes(bytes) {
  const b = Number(bytes || 0);
  if (b < 1024) return `${b} bytes`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / (1024 * 1024)).toFixed(1)} MB`;
}

/** The AI description of the sheet, or null when the AI could not write one. */
export function aiSummary(sheet) {
  const a = sheet?.ai_summary;
  if (!a?.summary || /^unable to generate/i.test(a.summary)) return null;
  return a;
}
