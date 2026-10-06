// Workbench one-click work: read the spreadsheet in the browser, suggest useful tasks from its
// columns (totals by category, monthly totals, top rows, one sheet per group) and run them
// instantly, with an Excel download. Nothing here calls the server.
import * as XLSX from 'xlsx';

const MAX_GROUPS = 60; // a column with more distinct values than this is not a useful grouping

/** "52,000", "£1,200.50", "(300)" and 12% as numbers; null when the value is not a number. */
export function toNumber(v) {
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  if (v == null || typeof v === 'boolean' || v instanceof Date) return null;
  let s = String(v).trim();
  if (!s) return null;
  let neg = false;
  if (/^\(.*\)$/.test(s)) {
    neg = true;
    s = s.slice(1, -1);
  }
  s = s.replace(/[£$€₹,\s]/g, '').replace(/%$/, '');
  if (!/^-?\d+(\.\d+)?$/.test(s)) return null;
  const n = Number(s);
  return neg ? -n : n;
}

/** Dates from real date cells, ISO text (2026-10-03) or day-first text (03/10/2026). */
export function toDate(v) {
  if (v instanceof Date) return Number.isNaN(v.getTime()) ? null : v;
  if (v == null || typeof v === 'number') return null;
  const s = String(v).trim();
  let m = s.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
  if (m) return new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  m = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})$/);
  if (m) {
    const year = m[3].length === 2 ? 2000 + Number(m[3]) : Number(m[3]);
    const day = Number(m[1]);
    const month = Number(m[2]);
    if (month < 1 || month > 12 || day < 1 || day > 31) return null;
    return new Date(Date.UTC(year, month - 1, day));
  }
  return null;
}

// Sum amounts; average measures where a total means nothing (scores, rates, prices, ages).
export function aggregationFor(columnName) {
  return /(score|rate|ratio|%|percent|age|rating|grade|mark|price|avg|average|mean|margin|temperature|attendance)/i.test(columnName)
    ? 'average'
    : 'total';
}

const share = (values, test) => {
  const filled = values.filter((v) => v != null && String(v).trim() !== '');
  return filled.length ? filled.filter(test).length / filled.length : 0;
};

/** Each column's name and kind: number, date, category (few repeated values) or text. */
export function profileColumns(rows) {
  if (!rows?.length) return [];
  const names = Object.keys(rows[0]);
  return names.map((name) => {
    const values = rows.map((r) => r[name]);
    const filled = values.filter((v) => v != null && String(v).trim() !== '');
    const distinct = new Set(filled.map((v) => String(v).trim())).size;
    let kind = 'text';
    if (share(values, (v) => toDate(v) !== null) >= 0.8) kind = 'date';
    else if (share(values, (v) => toNumber(v) !== null) >= 0.8) kind = 'number';
    else if (distinct >= 2 && distinct <= MAX_GROUPS && distinct <= Math.max(2, filled.length * 0.6)) kind = 'category';
    return { name: name.trim() || name, key: name, kind, distinct };
  });
}

/** Read the first sheet with data into plain row objects. */
export async function readRows(file) {
  const wb = XLSX.read(await file.arrayBuffer(), { cellDates: true });
  for (const sheetName of wb.SheetNames) {
    const rows = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { defval: null, raw: true });
    if (rows.length) return { sheetName, rows };
  }
  return { sheetName: wb.SheetNames[0] || 'Sheet1', rows: [] };
}

/**
 * Up to `limit` tasks worth doing on this data, best first. Each is { id, type, label, params }.
 * Types: total (sum, count and average of a number by a category), monthly (sum by month),
 * top (largest rows by a number) and split (one sheet per category value).
 */
export function suggestActions(columns, limit = 6) {
  const nums = columns.filter((c) => c.kind === 'number' && !/(^|\b)(id|code|number|no)\b/i.test(c.name));
  const cats = columns.filter((c) => c.kind === 'category').sort((a, b) => a.distinct - b.distinct);
  const dates = columns.filter((c) => c.kind === 'date');
  const out = [];
  for (const cat of cats.slice(0, 2)) {
    for (const num of nums.slice(0, 2)) {
      const how = aggregationFor(num.name);
      out.push({
        id: `total:${cat.key}:${num.key}`,
        type: 'total',
        label: `${how === 'average' ? 'Average' : 'Total'} ${num.name} by ${cat.name}`,
        params: { by: cat.key, value: num.key, how },
      });
    }
  }
  if (dates[0] && nums[0]) {
    out.push({ id: `monthly:${dates[0].key}:${nums[0].key}`, type: 'monthly', label: `${nums[0].name} by month of ${dates[0].name}`, params: { date: dates[0].key, value: nums[0].key } });
  }
  if (nums[0]) out.push({ id: `top:${nums[0].key}`, type: 'top', label: `Top 10 rows by ${nums[0].name}`, params: { value: nums[0].key, n: 10 } });
  if (cats[0]) out.push({ id: `split:${cats[0].key}`, type: 'split', label: `One sheet per ${cats[0].name}`, params: { by: cats[0].key } });
  if (!nums.length && cats[0]) {
    out.unshift({ id: `count:${cats[0].key}`, type: 'total', label: `Count rows by ${cats[0].name}`, params: { by: cats[0].key, value: null } });
  }
  return out.slice(0, limit);
}

const round2 = (n) => Math.round(n * 100) / 100;
const label = (v) => (v == null || String(v).trim() === '' ? '(blank)' : String(v).trim());

/**
 * Run a task. Returns { title, columns, rows, chart?, sheets? }: `rows` are arrays in column
 * order; `chart` is [{ label, value }] for a bar chart; `sheets` (split only) maps a sheet name
 * to its rows for the download.
 */
export function runAction(rows, action) {
  const { type, params } = action;
  if (type === 'total') {
    const groups = new Map();
    for (const r of rows) {
      const k = label(r[params.by]);
      const g = groups.get(k) || { count: 0, sum: 0, n: 0 };
      g.count += 1;
      const v = params.value ? toNumber(r[params.value]) : null;
      if (v !== null) {
        g.sum += v;
        g.n += 1;
      }
      groups.set(k, g);
    }
    const avg = params.how === 'average';
    const measure = (g) => (!params.value ? g.count : avg ? (g.n ? g.sum / g.n : 0) : g.sum);
    const sorted = [...groups.entries()].sort((a, b) => measure(b[1]) - measure(a[1]));
    if (!params.value) {
      return {
        title: action.label,
        columns: [params.by.trim(), 'Rows'],
        rows: [...sorted.map(([k, g]) => [k, g.count]), ['Total', rows.length]],
        chart: sorted.map(([k, g]) => ({ label: k, value: g.count })),
      };
    }
    const total = sorted.reduce((s, [, g]) => s + g.sum, 0);
    return {
      title: action.label,
      columns: [params.by.trim(), 'Rows', `Total ${params.value.trim()}`, `Average ${params.value.trim()}`, 'Share of total'],
      rows: [
        ...sorted.map(([k, g]) => [k, g.count, round2(g.sum), g.n ? round2(g.sum / g.n) : null, total ? `${round2((g.sum / total) * 100)}%` : '']),
        ['Total', rows.length, round2(total), rows.length ? round2(total / rows.length) : null, '100%'],
      ],
      chart: sorted.map(([k, g]) => ({ label: k, value: round2(measure(g)) })),
    };
  }
  if (type === 'monthly') {
    const months = new Map();
    let skipped = 0;
    for (const r of rows) {
      const d = toDate(r[params.date]);
      const v = toNumber(r[params.value]);
      if (!d || v === null) {
        skipped += 1;
        continue;
      }
      const k = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
      months.set(k, (months.get(k) || 0) + v);
    }
    const sorted = [...months.entries()].sort((a, b) => a[0].localeCompare(b[0]));
    return {
      title: action.label,
      columns: ['Month', `Total ${params.value.trim()}`],
      rows: sorted.map(([k, v]) => [k, round2(v)]),
      chart: sorted.map(([k, v]) => ({ label: k, value: round2(v) })),
      note: skipped ? `${skipped} row${skipped === 1 ? '' : 's'} without a date or amount left out.` : null,
    };
  }
  if (type === 'top') {
    const cols = Object.keys(rows[0] || {});
    const sorted = rows
      .filter((r) => toNumber(r[params.value]) !== null)
      .sort((a, b) => toNumber(b[params.value]) - toNumber(a[params.value]))
      .slice(0, params.n || 10);
    return { title: action.label, columns: cols.map((c) => c.trim()), rows: sorted.map((r) => cols.map((c) => r[c])) };
  }
  if (type === 'split') {
    const sheets = new Map();
    for (const r of rows) {
      const k = label(r[params.by]);
      if (!sheets.has(k)) sheets.set(k, []);
      sheets.get(k).push(r);
    }
    const ordered = [...sheets.entries()].sort((a, b) => b[1].length - a[1].length);
    return {
      title: action.label,
      columns: [params.by.trim(), 'Rows'],
      rows: ordered.map(([k, list]) => [k, list.length]),
      chart: ordered.map(([k, list]) => ({ label: k, value: list.length })),
      sheets: Object.fromEntries(ordered),
    };
  }
  throw new Error(`Unknown task: ${type}`);
}

// Excel sheet names: at most 31 characters, none of : \ / ? * [ ], unique.
export function sheetName(name, used = new Set()) {
  const base = String(name).replace(/[:\\/?*[\]]/g, ' ').slice(0, 31).trim() || 'Sheet';
  let n = base;
  let i = 2;
  while (used.has(n.toLowerCase())) n = `${base.slice(0, 28)} ${i++}`;
  used.add(n.toLowerCase());
  return n;
}

/** The task's result as an Excel file (Blob): a Result sheet, or one sheet per group for a split. */
export function resultWorkbook(result) {
  const wb = XLSX.utils.book_new();
  const used = new Set();
  if (result.sheets) {
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([result.columns, ...result.rows]), sheetName('Summary', used));
    for (const [k, list] of Object.entries(result.sheets)) {
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(list), sheetName(k, used));
    }
  } else {
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([result.columns, ...result.rows]), sheetName('Result', used));
  }
  const out = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  return new Blob([out], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}
