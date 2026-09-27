/**
 * Exports for Unified Reporting answers and dashboards (CSV and Excel).
 * Numbers are written as numbers (rounded to 2 decimals; percentages as
 * fractions with a % format) so they stay usable in Excel.
 */
import { columnsOf, compute, sanitize } from './engine';

const round = (v) => (v === null || v === undefined || Number.isNaN(v) ? null : Math.round(v * 100) / 100);
const exact = (v) => (v === null || v === undefined || Number.isNaN(v) ? null : Math.round(v * 1e6) / 1e6);

/** Header + rows for one computed answer. */
export function resultTable(spec, res) {
  const cols = columnsOf(res);
  const header = [spec.groupBy ? spec.groupBy.replace(/_/g, ' ') : 'total', ...cols.map((c) => (c.unit === 'pct' ? `${c.label} (%)` : c.label))];
  const rows = res.labels.map((l, i) => [l, ...cols.map((c) => (c.unit === 'pct' ? exact(c.data[i]) : round(c.data[i])))]);
  return { header, rows, units: ['text', ...cols.map((c) => c.unit)] };
}

export function toCSV(spec, res) {
  const { header, rows } = resultTable(spec, res);
  const cell = (v) => {
    const s = String(v ?? '');
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [header, ...rows].map((r) => r.map(cell).join(',')).join('\n');
}

export const slug = (t) => String(t || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'report';

/** Excel sheet names: 31 chars max, no []:*?/\ and unique within the workbook. */
export function sheetName(title, taken) {
  const base = String(title || 'Sheet').replace(/[[\]:*?/\\]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 28) || 'Sheet';
  let name = base;
  for (let i = 2; taken.has(name.toLowerCase()); i++) name = `${base.slice(0, 30 - String(i).length)} ${i}`;
  taken.add(name.toLowerCase());
  return name;
}

/** Describe filters and analysis options in one line for the workbook. */
export function describeSpec(spec) {
  const words = { eq: '=', neq: '≠', gte: '≥', lte: '≤' };
  const bits = [];
  const f = [...(spec.filters || []), ...spec.series.flatMap((s) => s.filters || [])];
  if (f.length) bits.push(`Filters: ${f.map((x) => `${x.dim} ${words[x.op]} ${x.value}`).join('; ')}`);
  if (spec.splitBy) bits.push(`Split by ${spec.splitBy}`);
  if (spec.window) bits.push(`${spec.window}-month rolling`);
  if (spec.compare) bits.push(spec.compare === 'prior_year' ? 'Compared with same month last year' : 'Compared with previous month');
  if (spec.share) bits.push('Share of total');
  return bits.join(' · ');
}

/**
 * Build a workbook: a Contents sheet listing every report with its sources,
 * then one sheet per report. items = [{ spec, title? }].
 */
export async function buildWorkbook(items, m, extraFilters = [], computeFn = compute) {
  const XLSX = await import('xlsx');
  const wb = XLSX.utils.book_new();
  const taken = new Set(['contents']);
  const contents = [['Report', 'Sheet', 'Sources', 'Details']];
  const sheets = [];
  for (const it of items) {
    let spec;
    let res;
    try {
      spec = extraFilters.length ? sanitize({ ...it.spec, filters: [...(it.spec.filters || []), ...extraFilters] }, m) : it.spec;
      res = await computeFn(spec, m);
    } catch {
      continue;
    }
    const name = sheetName(spec.title, taken);
    const { header, rows, units } = resultTable(spec, res);
    const ws = XLSX.utils.aoa_to_sheet([[spec.title], [describeSpec(spec) || ''], [], header, ...rows]);
    // Number formats per column.
    rows.forEach((r, ri) => r.forEach((v, ci) => {
      if (ci === 0 || typeof v !== 'number') return;
      const ref = XLSX.utils.encode_cell({ r: ri + 4, c: ci });
      if (ws[ref]) ws[ref].z = units[ci] === 'pct' ? '0.0%' : units[ci] === 'money' ? '#,##0.00' : '#,##0.##';
    }));
    ws['!cols'] = header.map((h, i) => ({ wch: Math.min(40, Math.max(10, String(h).length + 2, i === 0 ? 18 : 0)) }));
    sheets.push([name, ws]);
    contents.push([spec.title, name, [...new Set(res.series.map((s) => s.sys))].join(', '), describeSpec(spec)]);
  }
  const cws = XLSX.utils.aoa_to_sheet([...contents, [], [`Exported from Meldra Unified Reporting on ${new Date().toISOString().slice(0, 10)}`]]);
  cws['!cols'] = [{ wch: 48 }, { wch: 30 }, { wch: 36 }, { wch: 60 }];
  XLSX.utils.book_append_sheet(wb, cws, 'Contents');
  sheets.forEach(([name, ws]) => XLSX.utils.book_append_sheet(wb, ws, name));
  return { XLSX, wb, count: sheets.length };
}

export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function downloadWorkbook(items, m, filename, extraFilters = [], computeFn = compute) {
  const { XLSX, wb, count } = await buildWorkbook(items, m, extraFilters, computeFn);
  if (!count) throw new Error('Nothing to export');
  const out = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  downloadBlob(new Blob([out], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), filename);
  return count;
}
