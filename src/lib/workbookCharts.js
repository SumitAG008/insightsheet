// Charts for every tab of a workbook. Each tab's table is found (titles and blank rows above it
// are skipped), its layout recognised, and the right chart chosen:
//   - statement layout (items down the side, periods across the top, e.g. a P&L): one line per item;
//   - time down the side (Month, North, South...): one line per column over time;
//   - list layout (Course, Score...): a total or average per category, and a monthly line if dated.
// Pure functions apart from readWorkbook, so they are unit-tested. Nothing is sent to the server.
import * as XLSX from 'xlsx';
import { aggregationFor, groupingOrder, profileColumns, toDate, toNumber } from '@/lib/workbenchActions';

export { aggregationFor };

export const MAX_SERIES = 8; // the categorical palette has 8 hues; never generate a 9th
const MAX_BARS = 15;

const blank = (v) => v == null || (typeof v === 'string' && !v.trim());

/** Headers and data rows from a tab's raw cells (mirrors the server's _table_from_rows). */
export function tableFromRows(raw) {
  const rows = (raw || []).filter((r) => (r || []).some((v) => !blank(v)));
  if (!rows.length) return { headers: [], rows: [] };
  const width = Math.max(...rows.map((r) => r.reduce((w, v, i) => (blank(v) ? w : i + 1), 0)));
  const grid = rows.map((r) => Array.from({ length: width }, (_, i) => (r[i] === undefined ? null : r[i])));
  const filled = grid.slice(0, 15).map((r) => r.filter((v) => !blank(v)).length);
  const most = Math.max(...filled);
  const target = most > 1 ? Math.max(2, Math.ceil(most * 0.6)) : 1;
  const head = Math.max(0, filled.findIndex((n) => n >= target));
  const used = new Map();
  const headers = grid[head].map((v, i) => {
    let name = blank(v) ? `Column${i + 1}` : String(v instanceof Date ? v.toISOString().slice(0, 10) : v).trim();
    const n = used.get(name) || 0;
    used.set(name, n + 1);
    if (n) name = `${name} (${n + 1})`;
    return name;
  });
  return { headers, rows: grid.slice(head + 1) };
}

/** Every tab: { name, headers, rows (objects), columns (profile), note? }. */
export async function readWorkbook(file) {
  const wb = XLSX.read(await file.arrayBuffer(), { cellDates: true });
  return wb.SheetNames.map((name) => {
    const raw = XLSX.utils.sheet_to_json(wb.Sheets[name], { header: 1, defval: null, raw: true, blankrows: false });
    const { headers, rows } = tableFromRows(raw);
    const objects = rows.map((r) => Object.fromEntries(headers.map((h, i) => [h, r[i]])));
    const sheet = { name, headers, rows: objects, columns: profileColumns(objects, headers) };
    if (!objects.length) sheet.note = 'No table of data on this tab (it may hold only charts, notes or headings).';
    return sheet;
  });
}

const MONTHS = 'jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec|january|february|march|april|june|july|august|september|october|november|december';
const PERIOD = new RegExp(`^(q[1-4]|h[12]|fy\\s?'?\\d{2,4}|(${MONTHS})(\\b|[\\s'-]?\\d{2,4})|\\d{4}|\\d{4}[-/]\\d{1,2}|(week|wk|month|period|p)\\s?\\d{1,2})$`, 'i');

/** "Q1", "Jan", "Jan-24", "FY2025", "2024", "2024-03", "Week 3", or a real date. */
export function isPeriod(v) {
  if (v instanceof Date) return true;
  if (blank(v)) return false;
  return PERIOD.test(String(v).trim()) || toDate(v) !== null;
}

const periodLabel = (v) => (v instanceof Date ? v.toISOString().slice(0, 10) : String(v).trim());

const round2 = (n) => Math.round(n * 100) / 100;
const share = (list, test) => (list.length ? list.filter(test).length / list.length : 0);

function topByMagnitude(series, n) {
  const ranked = [...series].sort(
    (a, b) => b.values.reduce((s, v) => s + Math.abs(v ?? 0), 0) - a.values.reduce((s, v) => s + Math.abs(v ?? 0), 0),
  );
  return { kept: ranked.slice(0, n), dropped: Math.max(0, series.length - n) };
}

/**
 * Charts for one tab. Each chart: { id, title, kind: 'line' | 'bar', x: string[],
 * series: [{ name, values }], note? }. Returns { charts, reason } where reason explains an empty list.
 */
export function chartsForSheet(sheet) {
  if (!sheet?.rows?.length) return { charts: [], reason: sheet?.note || 'No table of data on this tab.' };
  const cols = sheet.columns;
  const rows = sheet.rows;
  const first = cols[0];
  const numeric = cols.slice(1).filter((c) => c.kind === 'number');
  const charts = [];

  // Statement / wide layouts: a label column followed by number columns.
  if (first && first.kind !== 'number' && numeric.length >= 2 && numeric.length >= (cols.length - 1) * 0.6) {
    const headerPeriods = share(numeric, (c) => isPeriod(c.name)) >= 0.6;
    const labels = rows.map((r) => r[first.key]);
    const filledLabels = labels.filter((v) => !blank(v));
    // Time down the side only when each period appears once; a long table (Month, Department,
    // Budget...) repeats its months and is charted as a list below.
    const uniquePeriods = new Set(filledLabels.map((v) => periodLabel(v))).size === filledLabels.length;
    const labelPeriods = uniquePeriods && share(filledLabels, isPeriod) >= 0.6;

    if (headerPeriods) {
      // P&L style: each line item over the periods across the top.
      const all = rows
        .filter((r) => !blank(r[first.key]))
        .map((r) => ({ name: String(r[first.key]).trim(), values: numeric.map((c) => toNumber(r[c.key])) }))
        .filter((s) => s.values.some((v) => v !== null));
      const { kept, dropped } = topByMagnitude(all, MAX_SERIES);
      charts.push({
        id: `${sheet.name}:items-over-periods`,
        title: `${/^Column\d+$/.test(first.name) ? 'Line items' : first.name} over ${numeric[0].name}–${numeric.at(-1).name}`,
        kind: numeric.length >= 3 ? 'line' : 'bar',
        x: numeric.map((c) => c.name),
        series: kept,
        note: dropped ? `The ${MAX_SERIES} largest of ${all.length} items are shown; the table has all of them.` : null,
      });
      return { charts, reason: null };
    }

    if (labelPeriods) {
      // Time down the side: each number column over time.
      const series = numeric.slice(0, MAX_SERIES).map((c) => ({ name: c.name, values: rows.map((r) => toNumber(r[c.key])) }));
      charts.push({
        id: `${sheet.name}:columns-over-time`,
        title: `${numeric.length > MAX_SERIES ? `First ${MAX_SERIES} columns` : numeric.map((c) => c.name).join(', ')} by ${first.name}`,
        kind: rows.length >= 3 ? 'line' : 'bar',
        x: labels.map(periodLabel),
        series,
        note: numeric.length > MAX_SERIES ? `${numeric.length} number columns; the first ${MAX_SERIES} are shown.` : null,
      });
      return { charts, reason: null };
    }
  }

  // List layout: a number per category, and per month when there is a date.
  const nums = cols.filter((c) => c.kind === 'number' && !/(^|\b)(id|code|no)\b/i.test(c.name));
  const cats = groupingOrder(cols);
  const dateCol = cols.find((c) => c.kind === 'date');

  // A number per category for the two best groupings (by Line and by Product, say).
  if (nums[0]) {
    const how = aggregationFor(nums[0].name);
    for (const labelCol of cats.slice(0, 2)) {
      const groups = new Map();
      for (const r of rows) {
        const k = blank(r[labelCol.key]) ? '(blank)' : String(r[labelCol.key]).trim();
        const v = toNumber(r[nums[0].key]);
        const g = groups.get(k) || { sum: 0, n: 0 };
        if (v !== null) {
          g.sum += v;
          g.n += 1;
        }
        groups.set(k, g);
      }
      const points = [...groups.entries()]
        .map(([k, g]) => [k, g.n ? round2(how === 'average' ? g.sum / g.n : g.sum) : null])
        .sort((a, b) => (b[1] ?? 0) - (a[1] ?? 0));
      const shown = points.slice(0, MAX_BARS);
      charts.push({
        id: `${sheet.name}:by-${labelCol.key}`,
        title: `${how === 'average' ? 'Average' : 'Total'} ${nums[0].name} by ${labelCol.name}`,
        kind: 'bar',
        x: shown.map((p) => p[0]),
        series: [{ name: `${how === 'average' ? 'Average' : 'Total'} ${nums[0].name}`, values: shown.map((p) => p[1]) }],
        note: points.length > MAX_BARS ? `The largest ${MAX_BARS} of ${points.length} are shown.` : null,
      });
    }
    // A short list of named rows (Client, Total owed) with no categories: one bar per row.
    if (!cats.length && first && first.kind === 'text' && first.distinct === rows.length && rows.length <= MAX_BARS) {
      const points = rows
        .map((r) => [String(r[first.key]).trim(), toNumber(r[nums[0].key])])
        .filter((p) => p[1] !== null)
        .sort((a, b) => b[1] - a[1]);
      charts.push({
        id: `${sheet.name}:by-${first.key}`,
        title: `${nums[0].name} by ${first.name}`,
        kind: 'bar',
        x: points.map((p) => p[0]),
        series: [{ name: nums[0].name, values: points.map((p) => p[1]) }],
        note: null,
      });
    }
  } else if (cats[0]) {
    const labelCol = cats[0];
    const counts = new Map();
    rows.forEach((r) => {
      const k = blank(r[labelCol.key]) ? '(blank)' : String(r[labelCol.key]).trim();
      counts.set(k, (counts.get(k) || 0) + 1);
    });
    const points = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, MAX_BARS);
    charts.push({
      id: `${sheet.name}:count-${labelCol.key}`,
      title: `Rows by ${labelCol.name}`,
      kind: 'bar',
      x: points.map((p) => p[0]),
      series: [{ name: 'Rows', values: points.map((p) => p[1]) }],
      note: null,
    });
  }

  if (dateCol && nums[0]) {
    const how = aggregationFor(nums[0].name);
    const months = new Map();
    for (const r of rows) {
      const d = toDate(r[dateCol.key]);
      const v = toNumber(r[nums[0].key]);
      if (!d || v === null) continue;
      const k = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
      const g = months.get(k) || { sum: 0, n: 0 };
      g.sum += v;
      g.n += 1;
      months.set(k, g);
    }
    const points = [...months.entries()].sort((a, b) => a[0].localeCompare(b[0]));
    if (points.length >= 2) {
      charts.push({
        id: `${sheet.name}:monthly-${dateCol.key}`,
        title: `${how === 'average' ? 'Average' : 'Total'} ${nums[0].name} by month of ${dateCol.name}`,
        kind: 'line',
        x: points.map((p) => p[0]),
        series: [{ name: nums[0].name, values: points.map(([, g]) => round2(how === 'average' ? g.sum / g.n : g.sum)) }],
        note: null,
      });
    }
  }

  if (!charts.length) {
    return { charts, reason: nums.length ? 'No column to group the numbers by.' : 'No number columns to chart.' };
  }
  return { charts, reason: null };
}

/** Charts for the whole workbook: [{ sheet, charts, reason }]. */
export function chartsForWorkbook(sheets) {
  return sheets.map((sheet) => ({ sheet: sheet.name, ...chartsForSheet(sheet) }));
}

// The categorical palette (validated: scripts/validate_palette.js, light on #ffffff and dark on #0f172a).
export const SERIES_LIGHT = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300', '#4a3aa7', '#e34948'];
export const SERIES_DARK = ['#3987e5', '#d95926', '#199e70', '#c98500', '#d55181', '#008300', '#9085e9', '#e66767'];

/** A PowerPoint (Blob) with one slide per chart, as native, editable PowerPoint charts. */
export async function chartsToPptx(results, fileName) {
  const { default: PptxGenJS } = await import('pptxgenjs');
  const pptx = new PptxGenJS();
  pptx.layout = 'LAYOUT_WIDE';
  const cover = pptx.addSlide();
  const count = results.reduce((n, r) => n + r.charts.length, 0);
  cover.addText(fileName, { x: 0.6, y: 2.3, w: 12, h: 1, fontSize: 32, bold: true, color: '0F172A' });
  cover.addText(`${count} chart${count === 1 ? '' : 's'} from ${results.filter((r) => r.charts.length).length} tab(s), made with meldra`, {
    x: 0.6, y: 3.3, w: 12, h: 0.6, fontSize: 16, color: '475569',
  });
  for (const r of results) {
    for (const c of r.charts) {
      const slide = pptx.addSlide();
      slide.addText(`${r.sheet}: ${c.title}`, { x: 0.5, y: 0.3, w: 12.3, h: 0.7, fontSize: 22, bold: true, color: '0F172A' });
      const data = c.series.map((s) => ({ name: s.name, labels: c.x, values: s.values.map((v) => v ?? 0) }));
      slide.addChart(c.kind === 'line' ? pptx.ChartType.line : pptx.ChartType.bar, data, {
        x: 0.5, y: 1.1, w: 12.3, h: 5.6,
        chartColors: SERIES_LIGHT.slice(0, c.series.length).map((h) => h.slice(1)),
        showLegend: c.series.length > 1,
        legendPos: 'b',
        lineSize: 2,
        barGapWidthPct: 60,
        valAxisLabelFormatCode: '#,##0',
        catAxisLabelFontSize: 11,
        valAxisLabelFontSize: 11,
      });
      if (c.note) slide.addText(c.note, { x: 0.5, y: 6.85, w: 12.3, h: 0.4, fontSize: 11, color: '64748B' });
    }
  }
  return pptx.write({ outputType: 'blob' });
}
