export function excelSerialToDate(serial) {
  const n = Number(serial);
  if (!Number.isFinite(n)) return null;
  // Excel incorrectly treats 1900 as leap year; using 1899-12-30 is the common fix.
  const ms = (n - 25569) * 86400 * 1000;
  const d = new Date(ms);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function parsePeriodString(v) {
  const s = String(v || '').trim();
  if (!s) return null;

  // 2024-01 or 2024/01
  let m = s.match(/^\s*(\d{4})[-/](\d{1,2})\s*$/);
  if (m) {
    const y = Number(m[1]);
    const mo = Number(m[2]);
    if (y >= 1900 && y <= 2100 && mo >= 1 && mo <= 12) return new Date(Date.UTC(y, mo - 1, 1));
  }

  // Jan-24, Jan 24, January-2024
  m = s.match(/^\s*([A-Za-z]{3,9})[\s-]*(\d{2,4})\s*$/);
  if (m) {
    const monStr = m[1].slice(0, 3).toLowerCase();
    const months = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11 };
    const mo = months[monStr];
    if (mo !== undefined) {
      let y = Number(m[2]);
      if (y < 100) y += 2000;
      if (y >= 1900 && y <= 2100) return new Date(Date.UTC(y, mo, 1));
    }
  }

  // FY2024
  m = s.match(/^\s*fy\s*(\d{4})\s*$/i);
  if (m) {
    const y = Number(m[1]);
    if (y >= 1900 && y <= 2100) return new Date(Date.UTC(y, 0, 1));
  }

  // Q1 2024 or 2024 Q1
  m = s.match(/^\s*q([1-4])\s*(\d{4})\s*$/i) || s.match(/^\s*(\d{4})\s*q([1-4])\s*$/i);
  if (m) {
    const q = Number(m[1].toLowerCase?.().startsWith?.('q') ? m[1].slice(1) : m[1]);
    const y = Number(m[2]);
    if (y >= 1900 && y <= 2100 && q >= 1 && q <= 4) return new Date(Date.UTC(y, (q - 1) * 3, 1));
  }

  return null;
}

export function parseDateSmart(v) {
  if (v === null || v === undefined) return null;
  if (typeof v === 'string' && String(v).trim() === '') return null;
  if (v instanceof Date) return Number.isNaN(v.getTime()) ? null : v;

  if (typeof v === 'number') {
    // Likely Excel serial
    if (v >= 30000 && v <= 60000) return excelSerialToDate(v);
  }

  if (typeof v === 'string') {
    const n = Number(v);
    if (Number.isFinite(n) && n >= 30000 && n <= 60000) return excelSerialToDate(n);
    const p = parsePeriodString(v);
    if (p) return p;
  }

  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}
