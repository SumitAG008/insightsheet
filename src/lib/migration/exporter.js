/**
 * Package the migration as a ZIP: one CSV per target file, numbered in load
 * order, plus a README with the load sequence and reports of the mapping,
 * every automatic change, and open issues.
 */
import { CONCEPT_BY_ID } from './concepts';

const cell = (v) => {
  const s = String(v ?? '');
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
export const toCsv = (rows) => rows.map((r) => r.map(cell).join(',')).join('\r\n');

/** Rows for one target file: technical header, optional label row, data. */
export function fileRows(file, settings, target = {}) {
  const f = file.entity.fields;
  const out = [f.map((x) => x.id)];
  // Bulk APIs and EIB/HDL take a single header row.
  if (settings.labelRow && !target.noLabelRow && !['eib', 'hdl'].includes(target.format) && !file.entity.custom) out.push(f.map((x) => x.label));
  file.rows.forEach((r) => out.push(f.map((x) => r[x.id])));
  return out;
}

/** HDL text for the entities that share one .dat file: METADATA then MERGE lines per component. */
export function hdlText(files) {
  const esc = (v) => String(v ?? '').replace(/\\/g, '\\\\').replace(/\|/g, '\\|').replace(/\r?\n/g, ' ');
  const lines = [];
  for (const f of files) {
    const comp = f.entity.component || f.entity.id;
    const ids = f.entity.fields.map((x) => x.id);
    lines.push(['METADATA', comp, ...ids].join('|'));
    f.rows.forEach((r) => lines.push(['MERGE', comp, ...ids.map((id) => esc(r[id]))].join('|')));
    lines.push('');
  }
  return lines.join('\r\n');
}

/** Group a target's files into what is actually loaded: EIB workbooks or HDL .dat files, in load order. */
export function packages(result, target) {
  const groups = [];
  const byName = new Map();
  for (const f of result.files) {
    if (f.entity.custom) continue;
    const name = target.format === 'eib' ? f.entity.workbook : target.format === 'hdl' ? f.entity.datFile : null;
    if (!name) continue;
    if (!byName.has(name)) {
      const g = { name, files: [] };
      byName.set(name, g);
      groups.push(g);
    }
    byName.get(name).files.push(f);
  }
  return groups.map((g, i) => ({ ...g, order: i + 1, rows: g.files.reduce((a, f) => a + f.rows.length, 0) }));
}

export function readme(result, target, settings) {
  const pkgs = packages(result, target);
  const lines = [
    `Migration package for ${target.label}`,
    `Generated ${new Date().toISOString().slice(0, 16).replace('T', ' ')} by meldra Next-Gen Migration.`,
    '',
    `Result: ${result.counts.error} errors, ${result.counts.warning} warnings.`,
    result.counts.error ? 'Resolve the errors in issues.csv before loading.' : 'No blocking errors were found.',
    '',
    'Load the files in this order (each file only references files above it):',
    ...(pkgs.length
      ? pkgs.map((g) => `  ${String(g.order).padStart(2, '0')} ${g.name.padEnd(40)} ${g.files.map((f) => f.entity.label).join(', ')} — ${g.rows} rows`)
      : result.files.filter((f) => !f.entity.custom).map((f) => `  ${f.fileName.padEnd(34)} ${f.entity.label} — ${f.rows.length} rows`)),
    '',
    'Settings used:',
    `  Date format: ${settings.dateFormat}`,
    ...(target.id === 'successfactors' ? [
      `  Event reasons: hire ${settings.hireEventReason}, job change ${settings.jobChangeEventReason}, transfer ${settings.transferEventReason}, data change ${settings.changeEventReason}`,
      `  Default time zone: ${settings.defaultTimezone}`,
      `  Second header row with labels: ${settings.labelRow ? 'yes' : 'no'}`,
      '',
      'Column IDs follow the standard Employee Central import templates. Templates are',
      'generated per instance: compare with the templates downloaded from your own',
      'instance (Admin Center > Import Employee Data / Import Foundation Data) and add',
      'any custom fields there before loading.',
    ] : ['', ...(target.readmeNotes ? target.readmeNotes(settings) : [])]),
    '',
    ...(result.files.some((f) => f.entity.mdf) ? ['', 'PaymentInformation is an MDF object: use Import and Export Data with the template', 'from your instance. It contains bank details; handle the file accordingly.'] : []),
    ...(result.files.some((f) => f.entity.payroll) ? ['', 'PayrollYTD is for payroll (Employee Central Payroll or your provider), not an', 'Employee Central import.'] : []),
    ...(result.files.some((f) => f.entity.sapTransfer) ? ['', 'SAP_T558B.txt / SAP_T558C.txt: legacy payroll results for a mid-year go-live on SAP payroll', '(ECP / S/4HANA HCM). Tab-delimited without header lines, as the SAP upload programs expect.', 'Load T558B first, then T558C, then run the payroll driver with the country transfer schema.', 'Before loading: payroll periods and infotypes 0000/0001/0002/0007/0008/0009 must exist from the first period.', 'After loading: set earliest retro and master-data-change dates (IT0003) to the go-live date.', 'Wage types must exist in table T512W; set the country grouping (MOLGA) in Settings.', 'Column layout follows the standard T558B/T558C tables: verify against the template in the', 'SAP note for your country before the first upload.'] : []),
    ...(result.reconciliation?.length ? ['', 'Reconciliation (source -> output):', ...result.reconciliation.map((r) => `  ${r.ok ? 'OK  ' : 'DIFF'} ${r.label}: ${r.source} -> ${r.target}`)] : []),
    ...(result.files.some((f) => f.entity.custom) ? ['', `custom/ holds data with no standard ${target.short || target.label} file yet (for example dependents`, 'or unmapped worker columns), carried as-is so nothing is lost. Load it into a custom', 'object or hand it to payroll or benefits.'] : []),
    '',
    'Also included: mapping_report.csv (source column -> field), change_log.csv',
    '(every automatic correction) and issues.csv (what still needs attention).',
  ];
  return lines.join('\r\n');
}

export function mappingReport(sheets, mapping) {
  const rows = [['sheet', 'column', 'mapped_to', 'confidence', 'method']];
  for (const s of sheets) {
    for (const c of s.columns) {
      const m = mapping[s.id]?.[c.key];
      rows.push([s.name, c.name, m?.concept ? CONCEPT_BY_ID[m.concept]?.label || m.concept : '(not used)', m?.confidence ?? '', m?.method ?? '']);
    }
  }
  return toCsv(rows);
}

/** One Excel workbook for reviewing everything: a tab per output file plus the reports. */
export async function buildReviewWorkbook({ result, settings, target = {} }) {
  const XLSX = await import('xlsx');
  const wb = XLSX.utils.book_new();
  const used = new Set();
  const add = (name, rows) => {
    let n = name.replace(/[\\/?*[\]:]/g, ' ').slice(0, 31);
    for (let i = 2; used.has(n); i++) n = `${name.slice(0, 28)} ${i}`;
    used.add(n);
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), n);
  };
  add('Summary', [
    ['meldra Next-Gen Migration', ''],
    ['Errors', result.counts.error],
    ['Warnings', result.counts.warning],
    ['Files', result.files.length],
    ['Columns migrated', result.coverage?.mapped ?? ''],
    ['Columns carried as-is', result.coverage?.carried ?? ''],
    ['Columns left behind', result.coverage?.left ?? ''],
    [],
    ['Load order', 'File', 'Rows'],
    ...result.files.map((f) => [f.order, f.fileName, f.rows.length]),
  ]);
  add('Issues', [['severity', 'file', 'record', 'field', 'message'], ...result.issues.map((i) => [i.severity, i.entity, i.key, i.field || '', i.message])]);
  add('Reconciliation', [['control', 'source', 'output', 'difference', 'status'], ...(result.reconciliation || []).map((r) => [r.label, r.source, r.target, Math.round((r.target - r.source) * 100) / 100, r.ok ? 'match' : 'DIFFERS'])]);
  add('Automatic fixes', [['change', 'count', 'examples'], ...result.data.changes.map((c) => [c.text, c.count, c.examples.map(([a, b]) => `${a} → ${b}`).join(' | ')])]);
  for (const f of result.files) add(`${String(f.order).padStart(2, '0')} ${f.entity.id}`, fileRows(f, settings, target));
  const out = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
  return new Blob([out], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}

/** One EIB workbook: a tab per entity, each starting with Spreadsheet Key. */
async function eibWorkbook(group, settings, target) {
  const XLSX = await import('xlsx');
  const wb = XLSX.utils.book_new();
  for (const f of group.files) {
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(fileRows(f, settings, target)), f.entity.id.slice(0, 31));
  }
  return XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
}

export async function buildZip({ result, target, settings, sheets, mapping }) {
  const JSZip = (await import('jszip')).default;
  const zip = new JSZip();
  if (target.format === 'eib' || target.format === 'hdl') {
    for (const g of packages(result, target)) {
      const n = String(g.order).padStart(2, '0');
      if (target.format === 'eib') zip.file(`${n}_${g.name}.xlsx`, await eibWorkbook(g, settings, target));
      else {
        // HDL: hdl_upload/ holds the main load in order; leavers' terminations are a second load.
        const second = g.name.includes('/');
        zip.file(second ? `hdl_${g.name}` : `hdl_upload/${n}_${g.name}`, hdlText(g.files));
      }
    }
    for (const f of result.files.filter((x) => x.entity.custom)) zip.file(f.fileName, toCsv(fileRows(f, settings, target)));
  } else {
    for (const f of result.files) {
      // SAP conversion-table uploads (T558B/T558C) are tab-delimited with no header lines.
      if (f.entity.format === 'tsv') zip.file(f.fileName, fileRows(f, { ...settings, labelRow: false }).slice(1).map((r) => r.join('\t')).join('\r\n'));
      else zip.file(f.fileName, toCsv(fileRows(f, settings, target)));
    }
  }
  zip.file('README.txt', readme(result, target, settings));
  zip.file('mapping_report.csv', mappingReport(sheets, mapping));
  zip.file('change_log.csv', toCsv([['change', 'count', 'examples'], ...result.data.changes.map((c) => [c.text, c.count, c.examples.map(([a, b]) => `${a} → ${b}`).join(' | ')])]));
  if (result.reconciliation?.length) zip.file('reconciliation.csv', toCsv([['control', 'source', 'output', 'difference', 'status'], ...result.reconciliation.map((r) => [r.label, r.source, r.target, Math.round((r.target - r.source) * 100) / 100, r.ok ? 'match' : 'DIFFERS'])]));
  zip.file('issues.csv', toCsv([['severity', 'file', 'record', 'field', 'message'], ...result.issues.map((i) => [i.severity, i.entity, i.key, i.field || '', i.message])]));
  return zip.generateAsync({ type: 'blob' });
}
