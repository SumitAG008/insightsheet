/**
 * Unified Reporting — data model built from the user's own sources.
 *
 * A source is one uploaded table (a CSV, or one Excel sheet). Columns are
 * profiled into dimensions (things to break down by) and measures (numbers to
 * add up). Two kinds of links make sources combinable:
 *   - Shared dimensions: the same column key in several sources (department,
 *     month, customer…). Series from different sources join on these.
 *   - Relationships: a key in one source that looks up a row in another
 *     (expenses.employee_id → employees.employee_id). The looked-up source's
 *     dimensions become available to the first one, so expenses can be broken
 *     down by the employee's department.
 */

export const MAX_ROWS = 200000;
const PROFILE_SAMPLE = 300;

/* ---------------- column profiling ---------------- */

export const toKey = (name) =>
  String(name ?? '')
    .trim()
    .toLowerCase()
    .replace(/[%]/g, ' pct')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '') || 'column';

const NUM_RE = /^[-+(]?\s*[£$€¥₹]?\s*-?[\d,]*\.?\d+\s*[)%]?$/;
export function parseNumber(v) {
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  if (!s || !NUM_RE.test(s)) return null;
  const neg = /^\(.*\)$/.test(s) || /^-/.test(s.replace(/^[£$€¥₹\s+]+/, ''));
  const n = parseFloat(s.replace(/[^\d.]/g, ''));
  if (!Number.isFinite(n)) return null;
  return neg ? -n : n;
}

const ISO_RE = /^\d{4}-\d{1,2}(-\d{1,2})?([ T].*)?$/;
const DMY_RE = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})$/;
/** Returns 'YYYY-MM' for a date-like value, else null. */
export function toMonth(v) {
  if (v instanceof Date && !Number.isNaN(v.getTime())) return v.toISOString().slice(0, 7);
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  if (ISO_RE.test(s)) {
    const [y, m] = s.split(/[-T ]/);
    return `${y}-${m.padStart(2, '0')}`;
  }
  const dmy = s.match(DMY_RE);
  if (dmy) {
    let [, a, b, y] = dmy;
    if (y.length === 2) y = `20${y}`;
    // Day-first unless the first part cannot be a day (UK/EU default).
    const month = Number(b) <= 12 ? b : a;
    return `${y}-${String(month).padStart(2, '0')}`;
  }
  return null;
}

const MONEY_RE = /amount|revenue|sales|cost|salary|salaries|price|spend|value|total|fee|budget|profit|margin|income|expense|invoice|pay|gbp|usd|eur/;
const ID_RE = /(^id$|_id$|^id_|_code$|^code$|_no$|_number$|^year$|zip|postcode|phone)/;

export function profileColumns(rows, headers) {
  const sample = rows.slice(0, PROFILE_SAMPLE);
  const used = new Set();
  return headers.map((name) => {
    let key = toKey(name);
    while (used.has(key)) key = `${key}_2`;
    used.add(key);
    const vals = sample.map((r) => r[name]).filter((v) => v !== null && v !== undefined && String(v).trim() !== '');
    const n = vals.length || 1;
    const nums = vals.filter((v) => parseNumber(v) !== null).length;
    const dates = vals.filter((v) => v instanceof Date || (typeof v === 'string' && toMonth(v))).length;
    let type = 'text';
    if (dates / n >= 0.9 && vals.some((v) => typeof v !== 'number')) type = 'date';
    else if (nums / n >= 0.9) type = 'number';
    const role = type === 'number' && !ID_RE.test(key) ? 'measure' : 'dimension';
    const currency = type === 'number' ? (vals.map(String).join('').match(/[£$€¥₹]/) || [null])[0] : null;
    const unit = role === 'measure' ? (currency || MONEY_RE.test(key) ? 'money' : /days?$|^days_/.test(key) ? 'days' : 'number') : null;
    return { name: String(name), key, type, role, unit, currency };
  });
}

/* ---------------- file parsing ---------------- */

const baseName = (f) => String(f).replace(/\.[^.]+$/, '');

function makeSource(name, headers, rawRows, kind = 'file') {
  const rows = rawRows.slice(0, MAX_ROWS);
  const columns = profileColumns(rows, headers);
  const keyed = rows.map((r) => {
    const o = {};
    columns.forEach((c) => { o[c.key] = r[c.name] instanceof Date ? r[c.name].toISOString().slice(0, 10) : r[c.name]; });
    return o;
  });
  return {
    id: `src_${Math.random().toString(36).slice(2, 9)}`,
    name,
    key: toKey(name),
    system: name,
    kind,
    columns,
    rows: keyed,
    truncated: rawRows.length > MAX_ROWS,
    addedAt: new Date().toISOString(),
  };
}

/** Parse a CSV/TSV/XLSX/XLS file into one source per non-empty sheet. */
export async function parseFile(file) {
  const ext = (file.name.split('.').pop() || '').toLowerCase();
  if (ext === 'csv' || ext === 'tsv' || ext === 'txt') {
    const Papa = (await import('papaparse')).default;
    const text = await file.text();
    const out = Papa.parse(text, { header: true, skipEmptyLines: 'greedy', dynamicTyping: false, delimiter: ext === 'tsv' ? '\t' : '' });
    const headers = (out.meta.fields || []).filter((h) => h !== undefined && String(h).trim() !== '');
    if (!headers.length || !out.data.length) throw new Error(`${file.name} has no rows with a header line.`);
    return [makeSource(baseName(file.name), headers, out.data)];
  }
  if (ext === 'xlsx' || ext === 'xls') {
    const XLSX = await import('xlsx');
    const wb = XLSX.read(await file.arrayBuffer(), { type: 'array', cellDates: true });
    const sources = [];
    for (const sheet of wb.SheetNames) {
      const rows = XLSX.utils.sheet_to_json(wb.Sheets[sheet], { defval: null, raw: true });
      if (!rows.length) continue;
      const headers = Object.keys(rows[0]).filter((h) => !/^__EMPTY/.test(h));
      if (!headers.length) continue;
      const name = wb.SheetNames.length > 1 ? `${baseName(file.name)} · ${sheet}` : baseName(file.name);
      sources.push(makeSource(name, headers, rows));
    }
    if (!sources.length) throw new Error(`${file.name} has no sheets with data.`);
    return sources;
  }
  throw new Error(`${file.name}: upload a .csv, .tsv, .xlsx or .xls file.`);
}

/** A source from rows fetched by a connector (API or database). origin holds settings without secrets. */
export function sourceFromTable(name, headers, rows, system, kind, origin) {
  if (!rows.length || !headers.length) throw new Error('No rows were returned.');
  const s = makeSource(name, headers, rows, kind);
  s.system = system || name;
  if (origin) s.origin = origin;
  s.refreshedAt = s.addedAt;
  return s;
}

/**
 * Replace a source's rows with a fresh pull, keeping its id, key, system and
 * the user's choices for columns that still exist (role, join name).
 */
export function refreshSource(old, fresh) {
  const prev = Object.fromEntries(old.columns.map((c) => [c.name, c]));
  const used = new Set();
  const columns = fresh.columns.map((c) => {
    const p = prev[c.name];
    const col = p ? { ...c, key: p.key, role: p.role, unit: p.unit ?? c.unit } : { ...c };
    while (used.has(col.key)) col.key = `${col.key}_2`;
    used.add(col.key);
    return col;
  });
  const rename = Object.fromEntries(fresh.columns.map((c, i) => [c.key, columns[i].key]));
  const rows = fresh.rows.map((r) => {
    const o = {};
    for (const [k, v] of Object.entries(r)) o[rename[k] || k] = v;
    return o;
  });
  return { ...old, columns, rows, truncated: fresh.truncated, origin: fresh.origin || old.origin, refreshedAt: new Date().toISOString() };
}

export function sourceFromRows(name, rows, system, kind = 'sample') {
  const s = makeSource(name, Object.keys(rows[0] || {}), rows, kind);
  s.system = system || name;
  return s;
}

/* ---------------- relationships ---------------- */

const distinct = (rows, key, cap = 5000) => {
  const set = new Set();
  for (const r of rows) {
    const v = r[key];
    if (v !== null && v !== undefined && String(v).trim() !== '') set.add(String(v).trim().toLowerCase());
    if (set.size >= cap) break;
  }
  return set;
};

const looksLikeKey = (key) => /(^id$|_id$|_code$|^code$|_no$|_number$|_key$|email)/.test(key);

/**
 * Suggest lookups A.col → B.col where B.col is unique in B (a key) and most
 * of A's values are found in B. Same-named non-key columns are shared
 * dimensions already and need no relationship.
 */
export function suggestRelationships(sources, existing = []) {
  const has = (f, t) => existing.some((r) => r.from.source === f.source && r.from.col === f.col && r.to.source === t.source);
  const out = [];
  for (const b of sources) {
    for (const bc of b.columns) {
      if (bc.role === 'ignore' || !looksLikeKey(bc.key)) continue;
      const bVals = distinct(b.rows, bc.key, 1e9);
      if (bVals.size < 2 || bVals.size < b.rows.length * 0.98) continue; // not unique → not a key
      for (const a of sources) {
        if (a.id === b.id) continue;
        for (const ac of a.columns) {
          if (ac.role === 'ignore') continue;
          const nameMatch = ac.key === bc.key || ac.key.replace(/_id$/, '') === bc.key.replace(/_id$/, '');
          // "emp_id" ↔ "employee_id": a meaningful part of either name appears in the other.
          const parts = (k) => k.split('_').filter((p) => p.length > 2 && !['num', 'code', 'key'].includes(p));
          const partMatch = looksLikeKey(ac.key) && (parts(ac.key).some((p) => bc.key.includes(p)) || parts(bc.key).some((p) => ac.key.includes(p)));
          if (!nameMatch && !partMatch) continue;
          const aVals = distinct(a.rows, ac.key);
          if (aVals.size < 2) continue;
          let hit = 0;
          aVals.forEach((v) => { if (bVals.has(v)) hit++; });
          const overlap = hit / aVals.size;
          if (overlap < 0.6) continue;
          const from = { source: a.id, col: ac.key };
          const to = { source: b.id, col: bc.key };
          if (!has(from, to)) out.push({ id: `rel_${a.id}_${ac.key}_${b.id}`, from, to, overlap });
        }
      }
    }
  }
  return out.sort((x, y) => y.overlap - x.overlap);
}

/* ---------------- views ---------------- */

/**
 * Build the queryable model: one view per source, with dimensions (own,
 * month from the first date column, and those borrowed through
 * relationships) and measures.
 */
export function buildModel(sources = [], relationships = []) {
  const byId = Object.fromEntries(sources.map((s) => [s.id, s]));
  const views = {};
  const rowCache = new Map();

  for (const s of sources) {
    const dims = [];
    const units = {};
    const cols = s.columns.filter((c) => c.role !== 'ignore');
    const dateCol = cols.find((c) => c.type === 'date');
    cols.filter((c) => c.role === 'dimension' && c.type !== 'date').forEach((c) => dims.push(c.key));
    if (dateCol && !dims.includes('month')) dims.push('month');
    const measures = cols.filter((c) => c.role === 'measure').map((c) => c.key);
    cols.filter((c) => c.role === 'measure').forEach((c) => { units[c.key] = c.unit || 'number'; });
    const borrowed = [];
    for (const r of relationships) {
      if (r.from.source !== s.id || !byId[r.to.source]) continue;
      const t = byId[r.to.source];
      t.columns
        .filter((c) => c.role === 'dimension' && c.type !== 'date' && c.key !== r.to.col && !dims.includes(c.key))
        .forEach((c) => { dims.push(c.key); borrowed.push({ key: c.key, via: r, from: t.system }); });
    }
    views[s.key] = {
      id: s.id,
      key: s.key,
      label: s.name,
      sys: s.system,
      dims,
      measures,
      units,
      dateCol: dateCol?.key || null,
      borrowed,
      rowCount: s.rows.length,
      desc: `${s.rows.length.toLocaleString()} rows from ${s.system}.${dateCol ? ` month comes from ${dateCol.key}.` : ''}${borrowed.length ? ` ${[...new Set(borrowed.map((b) => b.key))].join(', ')} looked up from ${[...new Set(borrowed.map((b) => b.from))].join(', ')}.` : ''}`,
    };
  }

  function rowsOf(viewKey) {
    if (rowCache.has(viewKey)) return rowCache.get(viewKey);
    const v = views[viewKey];
    if (!v) return [];
    const s = byId[v.id];
    const measureKeys = v.measures;
    let rows = s.rows.map((r) => {
      const o = { ...r };
      for (const k of measureKeys) o[k] = parseNumber(r[k]);
      if (v.dateCol) o.month = toMonth(r[v.dateCol]);
      return o;
    });
    for (const rel of relationships) {
      if (rel.from.source !== s.id || !byId[rel.to.source]) continue;
      const t = byId[rel.to.source];
      const idx = new Map();
      for (const tr of t.rows) {
        const k = String(tr[rel.to.col] ?? '').trim().toLowerCase();
        if (k && !idx.has(k)) idx.set(k, tr);
      }
      const take = v.borrowed.filter((b) => b.via === rel).map((b) => b.key);
      rows = rows.map((r) => {
        const hit = idx.get(String(r[rel.from.col] ?? '').trim().toLowerCase());
        if (!hit) return r;
        const o = { ...r };
        for (const k of take) if (o[k] === undefined) o[k] = hit[k];
        return o;
      });
    }
    rowCache.set(viewKey, rows);
    return rows;
  }

  // Shared (conformed) dimensions: business columns that two or more sources
  // own themselves. Keys and columns borrowed through a link don't count —
  // they still work as breakdowns, but aren't useful comparison axes.
  const dimCount = {};
  Object.values(views).forEach((v) => {
    const borrowed = new Set(v.borrowed.map((b) => b.key));
    v.dims.forEach((d) => {
      if (borrowed.has(d) || looksLikeKey(d)) return;
      dimCount[d] = (dimCount[d] || 0) + 1;
    });
  });
  const shared = Object.entries(dimCount).filter(([, n]) => n > 1).map(([d]) => d);

  const currency = (sources.flatMap((s) => s.columns).find((c) => c.currency) || {}).currency || (sources.some((s) => s.kind === 'sample') ? '£' : '');

  return { sources, relationships, views, rowsOf, shared, currency, empty: !sources.length };
}
