/**
 * Download answers, prompt-built reports and dashboards as PDF, PowerPoint,
 * Word or Excel. Every format carries the same numbers as the screen: charts
 * are captured from the page (PowerPoint gets native, editable charts where
 * the chart type allows), with the data table and the sources under each.
 */
import { columnsOf, compute, fmt, sanitize } from './engine';
import { downloadBlob, downloadWorkbook, slug } from './export';

export const FORMATS = [
  { id: 'pdf', label: 'PDF', ext: 'pdf' },
  { id: 'pptx', label: 'PowerPoint', ext: 'pptx' },
  { id: 'docx', label: 'Word', ext: 'docx' },
  { id: 'xlsx', label: 'Excel', ext: 'xlsx' },
];

const MAX_TABLE_ROWS = 30;
const today = () => new Date().toISOString().slice(0, 10);

/** Header and formatted rows for one chart's data. */
export function tableOf(spec, res, currency) {
  const cols = columnsOf(res);
  const first = res.labelName || (spec.groupBy ? spec.groupBy.replace(/_/g, ' ') : '');
  if (!spec.groupBy && !res.labelName) return { header: cols.map((c) => c.label), rows: [cols.map((c) => fmt(c.data[0], c.unit, currency))], more: 0 };
  const rows = res.labels.slice(0, MAX_TABLE_ROWS).map((l, i) => [l, ...cols.map((c) => fmt(c.data[i], c.unit, currency))]);
  return { header: [first, ...cols.map((c) => c.label)], rows, more: Math.max(0, res.labels.length - MAX_TABLE_ROWS) };
}

const systemsOf = (res) => [...new Set(res.series.map((s) => s.sys).filter(Boolean))];

/** PNG of a chart on the page (null when it isn't shown or is a table/number). */
async function capture(node) {
  if (!node) return null;
  const html2canvas = (await import('html2canvas')).default;
  let bg = '#ffffff';
  for (let el = node; el; el = el.parentElement) {
    const c = getComputedStyle(el).backgroundColor;
    if (c && c !== 'transparent' && !/rgba\(.*,\s*0\)$/.test(c)) { bg = c; break; }
  }
  // A little room below: html2canvas draws text slightly lower than the browser, which clipped legends.
  const canvas = await html2canvas(node, { backgroundColor: bg, scale: 2, logging: false, useCORS: true, height: node.scrollHeight + 16 });
  return { url: canvas.toDataURL('image/png'), w: canvas.width, h: canvas.height };
}

/**
 * Compute every chart and capture its picture. items: [{ spec, node? }].
 * extraFilters: dashboard filters, applied where a chart's sources have the column.
 */
export async function prepare(items, m, { computeFn = compute, extraFilters = [] } = {}) {
  const out = [];
  for (const it of items) {
    try {
      const spec = extraFilters.length && !it.spec.sql ? sanitize({ ...it.spec, filters: [...(it.spec.filters || []), ...extraFilters] }, m) : it.spec;
      const res = await computeFn(spec, m);
      const image = ['table', 'number'].includes(spec.chart) ? null : await capture(it.node).catch(() => null);
      out.push({ spec, res, image });
    } catch {
      /* a chart whose data was removed is left out */
    }
  }
  return out;
}

/* ---------------- PDF ---------------- */

async function toPdf(doc, charts, currency) {
  const { jsPDF } = await import('jspdf');
  const autoTable = (await import('jspdf-autotable')).default;
  const pdf = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4', compress: true });
  const W = pdf.internal.pageSize.getWidth();
  const H = pdf.internal.pageSize.getHeight();
  const M = 40;
  const text = (t) => String(t).replace(/[≥]/g, '>=').replace(/[≤]/g, '<=').replace(/[≠]/g, '!=');

  pdf.setFont('helvetica', 'bold').setFontSize(26).text(text(doc.title), M, 120, { maxWidth: W - 2 * M });
  pdf.setFont('helvetica', 'normal').setFontSize(12).setTextColor(90);
  let y = 160;
  if (doc.summary) {
    const lines = pdf.splitTextToSize(text(doc.summary), W - 2 * M);
    pdf.text(lines, M, y);
    y += lines.length * 16 + 12;
  }
  const systems = [...new Set(charts.flatMap((c) => systemsOf(c.res)))];
  pdf.text(`${charts.length} chart${charts.length === 1 ? '' : 's'}${systems.length ? ` from ${systems.join(', ')}` : ''}`, M, y);
  pdf.text(`meldra Unified Reporting · ${today()}`, M, y + 18);

  charts.forEach(({ spec, res, image }) => {
    pdf.addPage();
    pdf.setTextColor(20).setFont('helvetica', 'bold').setFontSize(16).text(text(spec.title), M, M + 8, { maxWidth: W - 2 * M });
    let top = M + 26;
    if (image) {
      const w = Math.min(W - 2 * M, (image.w / image.h) * 260);
      const h = (w / image.w) * image.h;
      pdf.addImage(image.url, 'PNG', M, top, w, h, undefined, 'FAST');
      top += h + 14;
    }
    const t = tableOf(spec, res, currency);
    autoTable(pdf, {
      head: [t.header.map(text)],
      body: t.rows.map((r) => r.map(text)),
      startY: top,
      margin: { left: M, right: M },
      styles: { fontSize: 8, cellPadding: 3 },
      headStyles: { fillColor: [37, 99, 235] },
      columnStyles: Object.fromEntries(t.header.map((_, i) => [i, { halign: i === 0 && t.header.length > 1 ? 'left' : 'right' }])),
    });
    const after = pdf.lastAutoTable.finalY + 14;
    pdf.setFont('helvetica', 'normal').setFontSize(9).setTextColor(110);
    const note = [t.more ? `First ${MAX_TABLE_ROWS} of ${res.labels.length} rows; the Excel download has all of them.` : null,
      systemsOf(res).length ? `Sources: ${systemsOf(res).join(', ')}` : null, spec.sql ? 'Custom SQL' : null].filter(Boolean).join(' · ');
    if (note && after < H - M) pdf.text(text(note), M, after);
  });
  const pages = pdf.getNumberOfPages();
  for (let i = 2; i <= pages; i++) {
    pdf.setPage(i);
    pdf.setFont('helvetica', 'normal').setFontSize(8).setTextColor(150).text(`${text(doc.title)} · ${i - 1} / ${pages - 1}`, W - M, H - 18, { align: 'right' });
  }
  return pdf.output('blob');
}

/* ---------------- PowerPoint ---------------- */

const NATIVE = { bar: 'bar', line: 'line', area: 'area', pie: 'pie', radar: 'radar', combo: 'bar' };

async function toPptx(doc, charts, currency) {
  const PptxGenJS = (await import('pptxgenjs')).default;
  const pptx = new PptxGenJS();
  pptx.layout = 'LAYOUT_WIDE'; // 13.33 × 7.5 in
  pptx.title = doc.title;
  const blue = '2563EB';
  const s0 = pptx.addSlide();
  s0.addText(doc.title, { x: 0.6, y: 2.2, w: 12, h: 1.2, fontSize: 36, bold: true, color: '0F172A' });
  if (doc.summary) s0.addText(doc.summary, { x: 0.6, y: 3.5, w: 12, h: 1.4, fontSize: 16, color: '475569', valign: 'top' });
  s0.addText(`meldra Unified Reporting · ${today()}`, { x: 0.6, y: 6.6, w: 12, h: 0.4, fontSize: 12, color: '94A3B8' });

  for (const { spec, res, image } of charts) {
    const s = pptx.addSlide();
    s.addText(spec.title, { x: 0.5, y: 0.3, w: 12.3, h: 0.7, fontSize: 24, bold: true, color: '0F172A' });
    const systems = systemsOf(res);
    if (systems.length) s.addText(`Sources: ${systems.join(', ')}${spec.sql ? ' · custom SQL' : ''}`, { x: 0.5, y: 6.95, w: 12.3, h: 0.35, fontSize: 11, color: '64748B' });
    const cols = columnsOf(res);
    const pct = cols.length && cols.every((c) => c.unit === 'pct');
    const kind = NATIVE[spec.chart];
    const finite = cols.every((c) => c.data.every((v) => v === null || Number.isFinite(v)));
    if (spec.chart === 'number' || (!spec.groupBy && !res.labelName)) {
      // Headline numbers as large tiles.
      cols.slice(0, 6).forEach((c, i) => {
        const x = 0.5 + (i % 3) * 4.15;
        const y = 1.5 + Math.floor(i / 3) * 2.4;
        s.addShape(pptx.ShapeType.roundRect, { x, y, w: 3.9, h: 2.1, fill: { color: 'F1F5F9' }, line: { color: 'F1F5F9' }, rectRadius: 0.1 });
        s.addText(c.label, { x: x + 0.2, y: y + 0.2, w: 3.5, h: 0.5, fontSize: 14, color: '64748B' });
        s.addText(fmt(c.data[0], c.unit, currency), { x: x + 0.2, y: y + 0.8, w: 3.5, h: 1, fontSize: 32, bold: true, color: '0F172A' });
      });
    } else if (kind && finite && res.labels.length && !(kind === 'pie' && cols.length > 1)) {
      const data = cols.filter((c) => !(spec.chart === 'pie') || c === cols[0]).map((c) => ({ name: c.label, labels: res.labels, values: c.data.map((v) => (v === null ? null : v)) }));
      const opts = {
        x: 0.5, y: 1.1, w: 12.3, h: 5.7, showLegend: data.length > 1 || kind === 'pie', legendPos: 'b',
        chartColors: [blue, '10B981', 'F59E0B', 'EF4444', '8B5CF6', '06B6D4', 'EC4899', '84CC16'],
        catAxisLabelFontSize: 11, valAxisLabelFontSize: 11, dataLabelFontSize: 10,
        barGrouping: spec.splitBy && ['sum', 'count'].includes(res.series[0]?.agg) ? 'stacked' : 'clustered',
        ...(pct ? { valAxisLabelFormatCode: '0%', dataLabelFormatCode: '0.0%' } : { valAxisLabelFormatCode: '#,##0' }),
        ...(kind === 'pie' ? { showPercent: true } : {}),
      };
      if (spec.chart === 'combo' && data.length > 1) {
        // As on screen: the first number as bars; lines in another unit on the right-hand axis.
        const u0 = cols[0].unit;
        const ru = cols.find((c) => c.unit !== u0)?.unit;
        const left = data.slice(1).filter((_, k) => cols[k + 1].unit !== ru);
        const right = data.slice(1).filter((_, k) => cols[k + 1].unit === ru);
        const groups = [{ type: pptx.ChartType.bar, data: [data[0]], options: { chartColors: [blue] } }];
        if (left.length) groups.push({ type: pptx.ChartType.line, data: left, options: { chartColors: ['F59E0B', 'EF4444'] } });
        if (right.length) groups.push({ type: pptx.ChartType.line, data: right, options: { chartColors: ['10B981', '8B5CF6'], secondaryValAxis: true, secondaryCatAxis: true } });
        s.addChart(groups, right.length
          ? { ...opts, valAxes: [{ showValAxisTitle: false }, { showValAxisTitle: false, valGridLine: { style: 'none' } }], catAxes: [{ catAxisTitle: '' }, { catAxisHidden: true }] }
          : opts);
      } else {
        s.addChart(pptx.ChartType[kind], data, opts);
      }
    } else if (image) {
      const maxW = 12.3;
      const maxH = 5.7;
      const r = Math.min(maxW / image.w, maxH / image.h);
      s.addImage({ data: image.url, x: 0.5 + (maxW - image.w * r) / 2, y: 1.1, w: image.w * r, h: image.h * r });
    } else {
      const t = tableOf(spec, res, currency);
      const head = t.header.map((h) => ({ text: h, options: { bold: true, color: 'FFFFFF', fill: { color: blue } } }));
      s.addTable([head, ...t.rows.slice(0, 14)], { x: 0.5, y: 1.1, w: 12.3, fontSize: 11, border: { type: 'solid', color: 'E2E8F0', pt: 0.5 }, autoPage: false });
    }
    const t = tableOf(spec, res, currency);
    s.addNotes([`${spec.title}`, ...t.rows.slice(0, 20).map((r) => r.join(' | ')), spec.sql ? `SQL:\n${spec.sql}` : ''].join('\n'));
  }
  return pptx.write({ outputType: 'blob' });
}

/* ---------------- Word ---------------- */

const dataUrlBytes = (url) => Uint8Array.from(atob(url.split(',')[1]), (c) => c.charCodeAt(0));

async function toDocx(doc, charts, currency) {
  const d = await import('docx');
  const { Document, Packer, Paragraph, TextRun, HeadingLevel, ImageRun, Table, TableRow, TableCell, WidthType, AlignmentType, ShadingType } = d;
  const children = [
    new Paragraph({ text: doc.title, heading: HeadingLevel.TITLE }),
    ...(doc.summary ? [new Paragraph({ children: [new TextRun({ text: doc.summary, size: 24 })] })] : []),
    new Paragraph({ children: [new TextRun({ text: `meldra Unified Reporting · ${today()}`, color: '64748B', size: 20 })] }),
  ];
  for (const { spec, res, image } of charts) {
    children.push(new Paragraph({ text: spec.title, heading: HeadingLevel.HEADING_1, pageBreakBefore: children.length > 3 }));
    if (image) {
      const w = 620;
      children.push(new Paragraph({ children: [new ImageRun({ type: 'png', data: dataUrlBytes(image.url), transformation: { width: w, height: Math.round((w / image.w) * image.h) } })] }));
    }
    const t = tableOf(spec, res, currency);
    const cell = (text, i, head) => new TableCell({
      children: [new Paragraph({ alignment: i === 0 && t.header.length > 1 ? AlignmentType.LEFT : AlignmentType.RIGHT, children: [new TextRun({ text: String(text), bold: head, color: head ? 'FFFFFF' : undefined, size: 18 })] })],
      ...(head ? { shading: { type: ShadingType.CLEAR, color: 'auto', fill: '2563EB' } } : {}),
    });
    children.push(new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [new TableRow({ tableHeader: true, children: t.header.map((h, i) => cell(h, i, true)) }), ...t.rows.map((r) => new TableRow({ children: r.map((v, i) => cell(v, i, false)) }))],
    }));
    const note = [t.more ? `First ${MAX_TABLE_ROWS} of ${res.labels.length} rows; the Excel download has all of them.` : null,
      systemsOf(res).length ? `Sources: ${systemsOf(res).join(', ')}` : null].filter(Boolean).join(' · ');
    if (note) children.push(new Paragraph({ children: [new TextRun({ text: note, color: '64748B', size: 18 })] }));
    if (spec.sql) children.push(new Paragraph({ children: [new TextRun({ text: spec.sql, font: 'Consolas', size: 16 })] }));
  }
  return Packer.toBlob(new Document({ creator: 'meldra', title: doc.title, sections: [{ children }] }));
}

/**
 * Build and download one file. doc = { title, summary? }; items = [{ spec, node? }].
 * Returns the number of charts written.
 */
export async function downloadReport(format, doc, items, m, { computeFn = compute, extraFilters = [] } = {}) {
  const name = `${slug(doc.title)}.${FORMATS.find((f) => f.id === format)?.ext || format}`;
  if (format === 'xlsx') return downloadWorkbook(items.map(({ spec }) => ({ spec })), m, name, extraFilters, computeFn);
  const charts = await prepare(items, m, { computeFn, extraFilters });
  if (!charts.length) throw new Error('Nothing to export');
  const make = { pdf: toPdf, pptx: toPptx, docx: toDocx }[format];
  if (!make) throw new Error(`Unknown format ${format}`);
  downloadBlob(await make(doc, charts, m.currency), name);
  return charts.length;
}

export const _internal = { toPdf, toPptx, toDocx };
