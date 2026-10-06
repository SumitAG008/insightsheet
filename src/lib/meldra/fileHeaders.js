// Spreadsheet column headers for Ask meldra's planner, read on the device.

/** Column headers of a spreadsheet (first sheet, first row), read on the device. Nothing else is sent. */
export async function readHeaders(file) {
  const ext = (file.name.split('.').pop() || '').toLowerCase();
  try {
    if (ext === 'csv' || ext === 'tsv' || ext === 'txt') {
      const Papa = (await import('papaparse')).default;
      const text = await file.slice(0, 64 * 1024).text();
      const out = Papa.parse(text, { preview: 1, delimiter: ext === 'tsv' ? '\t' : '' });
      return (out.data[0] || []).map(String).filter((h) => h.trim()).slice(0, 40);
    }
    if (ext === 'xlsx' || ext === 'xls') {
      const XLSX = await import('xlsx');
      const wb = XLSX.read(await file.arrayBuffer(), { type: 'array', sheetRows: 1 });
      const first = wb.Sheets[wb.SheetNames[0]];
      const row = XLSX.utils.sheet_to_json(first, { header: 1 })[0] || [];
      return row.map((h) => String(h ?? '')).filter((h) => h.trim()).slice(0, 40);
    }
  } catch {
    // Headers are only a hint for the planner; carry on without them.
  }
  return [];
}
