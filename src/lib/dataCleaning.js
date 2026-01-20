/**
 * Shared data cleaning utilities (ML-aware).
 * Used by CleaningTools and AgenticAI. Uses meldra ML for outliers.
 */
import { detectOutliers } from '@/lib/meldra/ml/data-processing';

/** Only null, undefined, or '' are treated as missing. Non-numeric strings (e.g. "N/A") are never filled. */
export function isMissing(v) {
  return v == null || v === '' || (typeof v === 'string' && v.trim() === '');
}
function _isMissing(v) {
  return isMissing(v);
}

function _mean(arr) {
  if (!arr.length) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}
function _median(arr) {
  if (!arr.length) return 0;
  const s = [...arr].sort((a, b) => a - b);
  const m = (s.length - 1) / 2;
  return (s[Math.floor(m)] + s[Math.ceil(m)]) / 2;
}
function _mode(arr) {
  if (!arr.length) return null;
  const f = {};
  let best = null, n = 0;
  arr.forEach((v) => { f[v] = (f[v] || 0) + 1; if (f[v] > n) { n = f[v]; best = v; } });
  return best;
}

/**
 * Remove duplicate rows (by full row stringify).
 * @param {Array<Object>} rows
 * @returns {{ rows: Array<Object>, removed: number }}
 */
export function dedupe(rows) {
  const seen = new Set();
  const out = rows.filter((row) => {
    const key = JSON.stringify(row);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  return { rows: out, removed: rows.length - out.length };
}

/**
 * Trim whitespace from all string cells.
 * @param {Array<Object>} rows
 * @returns {Array<Object>}
 */
export function trim(rows) {
  return rows.map((row) => {
    const r = {};
    Object.keys(row).forEach((k) => {
      r[k] = typeof row[k] === 'string' ? row[k].trim() : row[k];
    });
    return r;
  });
}

/**
 * Infer types: numeric, boolean, null.
 * @param {Array<Object>} rows
 * @returns {Array<Object>}
 */
export function inferTypes(rows) {
  return rows.map((row) => {
    const r = {};
    Object.keys(row).forEach((key) => {
      const v = row[key];
      if (v === null || v === undefined || v === '') {
        r[key] = null;
      } else if (v === 'true' || v === 'false') {
        r[key] = v === 'true';
      } else if (!isNaN(v) && !isNaN(parseFloat(v))) {
        r[key] = parseFloat(v);
      } else {
        r[key] = v;
      }
    });
    return r;
  });
}

/**
 * Remove rows where the value in `col` is an outlier (IQR). Only considers numeric values.
 * @param {Array<Object>} rows
 * @param {string} col
 * @param {{ threshold?: number }} opts - threshold = IQR multiplier (default 1.5)
 * @returns {{ rows: Array<Object>, removed: number, outlierIndices: number[] }}
 */
export function removeOutliers(rows, col, opts = {}) {
  const threshold = opts.threshold ?? 1.5;
  const enumerated = rows.map((r, i) => [parseFloat(r[col]), i]).filter(([v]) => !isNaN(v));
  if (enumerated.length === 0) return { rows: [...rows], removed: 0, outlierIndices: [] };
  const values = enumerated.map(([v]) => v);
  const origIndices = enumerated.map(([, i]) => i);
  const { indices } = detectOutliers(values, threshold);
  const toRemove = new Set(indices.map((j) => origIndices[j]));
  const out = rows.filter((_, i) => !toRemove.has(i));
  return { rows: out, removed: toRemove.size, outlierIndices: [...toRemove] };
}

/**
 * Fill missing values in column (null/undefined/''). Supports mean/median/mode/forward/backward.
 * For mean/median: uses only numeric non-missing; for mode: most frequent non-missing; forward/backward: last/next non-missing.
 * @param {Array<Object>} rows - will not be mutated
 * @param {string} col
 * @param {'mean'|'median'|'mode'|'forward'|'backward'} strategy
 * @returns {Array<Object>} new rows
 */
export function fillMissing(rows, col, strategy) {
  const values = rows.map((r) => r[col]);
  let fillValue;
  if (strategy === 'forward') {
    let last = null;
    const filled = values.map((v) => {
      if (!_isMissing(v)) { last = v; return v; }
      return last;
    });
    return rows.map((r, i) => ({ ...r, [col]: filled[i] }));
  }
  if (strategy === 'backward') {
    let next = null;
    const filled = [...values].reverse().map((v) => {
      if (!_isMissing(v)) { next = v; return v; }
      return next;
    }).reverse();
    return rows.map((r, i) => ({ ...r, [col]: filled[i] }));
  }
  if (strategy === 'mean') {
    const valid = values.filter((v) => !_isMissing(v)).map((v) => parseFloat(v)).filter((v) => !isNaN(v));
    fillValue = valid.length ? _mean(valid) : null;
  } else if (strategy === 'median') {
    const valid = values.filter((v) => !_isMissing(v)).map((v) => parseFloat(v)).filter((v) => !isNaN(v));
    fillValue = valid.length ? _median(valid) : null;
  } else {
    const valid = values.filter((v) => !_isMissing(v));
    fillValue = _mode(valid);
  }
  // Only replace null/undefined/''; never overwrite non-numeric strings (e.g. "N/A")
  const filled = values.map((v) => (_isMissing(v) ? fillValue : v));
  return rows.map((r, i) => ({ ...r, [col]: filled[i] }));
}

/**
 * Infer fill strategies for columns that have missing (null/undefined/'').
 * Numeric columns → median; others → mode.
 * @param {Array<Object>} rows
 * @param {string[]} headers
 * @returns {{ fill: Record<string,'mean'|'median'|'mode'|'forward'|'backward'> }}
 */
export function getAutoFillOptions(rows, headers) {
  const fill = {};
  if (!headers || !rows?.length) return { fill };
  for (const col of headers) {
    const hasMissing = rows.some((r) => _isMissing(r[col]));
    if (!hasMissing) continue;
    const hasNumeric = rows.some((r) => {
      const v = r[col];
      return !_isMissing(v) && !isNaN(parseFloat(v));
    });
    fill[col] = hasNumeric ? 'median' : 'mode';
  }
  return { fill };
}

/**
 * Run clean pipeline: dedupe, trim, optional fill per column, optional removeOutliers.
 * @param {Object} data - { headers, rows }
 * @param {{ fill?: Record<string,'mean'|'median'|'mode'|'forward'|'backward'>, outlierColumns?: string[], outlierThreshold?: number }} opts
 * @returns {{ data: { headers, rows }, summary: string[] }}
 */
export function runCleanPipeline(data, opts = {}) {
  const summary = [];
  let rows = data.rows;

  const d = dedupe(rows);
  rows = d.rows;
  if (d.removed > 0) summary.push(`Removed ${d.removed} duplicates`);

  rows = trim(rows);
  summary.push('Trimmed whitespace');

  if (opts.fill && Object.keys(opts.fill).length > 0) {
    for (const [col, strategy] of Object.entries(opts.fill)) {
      if (!data.headers.includes(col)) continue;
      rows = fillMissing(rows, col, strategy);
      summary.push(`Filled missing in ${col} with ${strategy}`);
    }
  }

  if (opts.outlierColumns && opts.outlierColumns.length > 0) {
    const th = opts.outlierThreshold ?? 1.5;
    for (const col of opts.outlierColumns) {
      if (!data.headers.includes(col)) continue;
      const res = removeOutliers(rows, col, { threshold: th });
      rows = res.rows;
      if (res.removed > 0) summary.push(`Removed ${res.removed} outliers from ${col}`);
    }
  }

  return { data: { ...data, rows }, summary };
}
