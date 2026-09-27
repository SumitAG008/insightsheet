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
export function fileRows(file, settings) {
  const f = file.entity.fields;
  const out = [f.map((x) => x.id)];
  if (settings.labelRow) out.push(f.map((x) => x.label));
  file.rows.forEach((r) => out.push(f.map((x) => r[x.id])));
  return out;
}

export function readme(result, target, settings) {
  const lines = [
    `Migration package for ${target.label}`,
    `Generated ${new Date().toISOString().slice(0, 16).replace('T', ' ')} by Meldra Next-Gen Migration.`,
    '',
    `Result: ${result.counts.error} errors, ${result.counts.warning} warnings.`,
    result.counts.error ? 'Resolve the errors in issues.csv before loading.' : 'No blocking errors were found.',
    '',
    'Load the files in this order (each file only references files above it):',
    ...result.files.map((f) => `  ${f.fileName.padEnd(34)} ${f.entity.label} — ${f.rows.length} rows`),
    '',
    'Settings used:',
    `  Date format: ${settings.dateFormat}`,
    `  Hire / change event reasons: ${settings.hireEventReason} / ${settings.changeEventReason}`,
    `  Default time zone: ${settings.defaultTimezone}`,
    `  Second header row with labels: ${settings.labelRow ? 'yes' : 'no'}`,
    '',
    'Column IDs follow the standard Employee Central import templates. Templates are',
    'generated per instance: compare with the templates downloaded from your own',
    'instance (Admin Center > Import Employee Data / Import Foundation Data) and add',
    'any custom fields there before loading.',
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

export async function buildZip({ result, target, settings, sheets, mapping }) {
  const JSZip = (await import('jszip')).default;
  const zip = new JSZip();
  for (const f of result.files) zip.file(f.fileName, toCsv(fileRows(f, settings)));
  zip.file('README.txt', readme(result, target, settings));
  zip.file('mapping_report.csv', mappingReport(sheets, mapping));
  zip.file('change_log.csv', toCsv([['change', 'count', 'examples'], ...result.data.changes.map((c) => [c.text, c.count, c.examples.map(([a, b]) => `${a} → ${b}`).join(' | ')])]));
  zip.file('issues.csv', toCsv([['severity', 'file', 'record', 'field', 'message'], ...result.issues.map((i) => [i.severity, i.entity, i.key, i.field || '', i.message])]));
  return zip.generateAsync({ type: 'blob' });
}
