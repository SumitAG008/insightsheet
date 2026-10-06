/**
 * SQL for Unified Reporting.
 *
 * specToSql() writes the SQL that gives the same numbers as compute() for a
 * spec: each source is totalled on its own, lookups are LEFT JOINs to the
 * linked source, and the totals are then joined on the shared dimension.
 * It is written against one table per source (named like the source, with
 * its own column names, numbers as numbers and "month" from the date column),
 * using only SQL that both SQLite (in the browser) and DuckDB (in the meldra
 * lakehouse) understand, so the customer can read it, edit it and run it.
 *
 * runSql() runs SQL where the data is: in the browser for sources kept there,
 * in the lakehouse for stored sources. sqlToResult() turns the rows into the
 * same result shape charts, tables and exports use.
 */
import { COMPARE, MAX_SPLIT, derivedUnit, seriesFilters, tablesIn, unitOf } from './engine';

export const MAX_RESULT_ROWS = 5000;

const RESERVED = new Set(('all and any as asc between both by case cast check collate column constraint create cross current current_date '
  + 'current_time current_timestamp default delete desc distinct do drop else end except exists false fetch filter for foreign from full glob '
  + 'group having ilike in index inner insert intersect into is isnull join lateral leading left like limit natural not notnull null offset on '
  + 'only or order outer over partition pivot placing primary qualify range recursive references regexp returning right row rows select set '
  + 'similar some summarize symmetric table then to trailing true union unique unpivot update using values variadic when where window with').split(' '));

/** A table or column name, quoted only when it has to be. */
export const ident = (k) => (/^[a-z_][a-z0-9_]*$/.test(k) && !RESERVED.has(k) ? k : `"${String(k).replace(/"/g, '""')}"`);
const lit = (v) => `'${String(v).replace(/'/g, "''")}'`;
/** Same as labelOf() in the engine: empty or missing → '(blank)'. */
const labelSql = (e) => `COALESCE(NULLIF(CAST(${e} AS TEXT), ''), '(blank)')`;
const monthIdx = (e) => `CASE WHEN ${e} GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]' THEN CAST(substr(${e}, 1, 4) AS INTEGER) * 12 + CAST(substr(${e}, 6, 2) AS INTEGER) END`;
const isNumber = (v) => String(v).trim() !== '' && !Number.isNaN(Number(v));

/**
 * The columns of a source's table as SQL sees them: its own columns (not the
 * ignored ones), numbers as numbers, plus month when it has a date column.
 */
export function tableColumns(m, viewKey) {
  const V = m.views[viewKey];
  const s = V && m.byId[V.id];
  if (!s) return [];
  const cols = s.columns.filter((c) => c.role !== 'ignore').map((c) => ({
    key: c.key, name: c.name, type: c.role === 'measure' ? 'number' : 'text', role: c.role, numericText: c.type === 'number', date: c.type === 'date',
  }));
  if (V.dateCol && !cols.some((c) => c.key === 'month')) cols.push({ key: 'month', name: `month (from ${V.dateCol})`, type: 'text', role: 'dimension', derived: true });
  return cols;
}

/** Same rules as pass() in the engine. */
function filterSql(e, f, numericColumn) {
  const v = f.value;
  if (f.op === 'eq') return v === '' ? `COALESCE(CAST(${e} AS TEXT), '') = ''` : `lower(${e}) = ${lit(v.toLowerCase())}`;
  if (f.op === 'neq') return `COALESCE(lower(${e}), '') <> ${lit(v.toLowerCase())}`;
  const cmp = f.op === 'gte' ? '>=' : '<=';
  if (numericColumn && isNumber(v)) {
    return f.op === 'gte' ? `CAST(NULLIF(${e}, '') AS DOUBLE) >= ${Number(v)}` : `(COALESCE(${e}, '') = '' OR CAST(${e} AS DOUBLE) <= ${Number(v)})`;
  }
  return /[a-z]/i.test(v) ? `lower(COALESCE(${e}, '')) ${cmp} ${lit(v.toLowerCase())}` : `COALESCE(${e}, '') ${cmp} ${lit(v)}`;
}

const indent = (text, n = 2) => text.split('\n').map((l) => (l ? ' '.repeat(n) + l : l)).join('\n');
const cte = (name, body, comment) => `${comment ? `-- ${comment}\n` : ''}${name} AS (\n${indent(body)}\n)`;

/** One series: its source's rows, filtered, looked up and totalled per group (and split value). */
function seriesCtes(sp, m, s, i, filters, parts) {
  const V = m.views[s.view];
  const src = m.byId[V.id];
  const name = `s${i + 1}`;
  const G = sp.groupBy && ident(sp.groupBy);
  const SP = sp.splitBy && ident(sp.splitBy);
  const needed = new Set([sp.groupBy, sp.splitBy, ...filters.map((f) => f.dim)].filter(Boolean));

  // Borrowed columns come from the linked source: one row per key, LEFT JOINed on the link.
  const expr = {};
  const numeric = {};
  const joins = [];
  const byRel = new Map();
  for (const b of V.borrowed) {
    if (!needed.has(b.key)) continue;
    if (!byRel.has(b.via)) byRel.set(b.via, []);
    byRel.get(b.via).push(b.key);
  }
  [...byRel.entries()].forEach(([rel, dims], n) => {
    const target = Object.values(m.views).find((x) => x.id === rel.to.source);
    const to = ident(rel.to.col);
    const alias = `l${n + 1}`;
    joins.push(`LEFT JOIN ( -- one row per ${rel.to.col} in ${target.label} (${target.sys})\n`
      + `  SELECT lower(trim(CAST(${to} AS TEXT))) AS link_key, ${dims.map((d) => `MIN(${ident(d)}) AS ${ident(d)}`).join(', ')}\n`
      + `  FROM ${ident(target.key)}\n  WHERE trim(COALESCE(CAST(${to} AS TEXT), '')) <> ''\n  GROUP BY 1\n`
      + `) AS ${alias} ON ${alias}.link_key = lower(trim(CAST(src.${ident(rel.from.col)} AS TEXT)))`);
    const tcols = m.byId[rel.to.source].columns;
    dims.forEach((d) => {
      expr[d] = `${alias}.${ident(d)}`;
      numeric[d] = tcols.find((c) => c.key === d)?.type === 'number';
    });
  });
  const exprOf = (d) => expr[d] || `src.${ident(d)}`;
  const isNumeric = (d) => numeric[d] ?? src.columns.find((c) => c.key === d)?.type === 'number';

  const where = filters.map((f) => filterSql(exprOf(f.dim), f, isNumeric(f.dim)));
  const from = `FROM ${ident(s.view)} AS src${joins.length ? `\n${joins.join('\n')}` : ''}${where.length ? `\nWHERE ${where.join('\n  AND ')}` : ''}`;
  const measure = s.measure ? ident(s.measure) : null;
  const what = s.agg === 'count' ? 'number of rows' : `${s.agg} of ${s.measure}`;
  const comment = `${s.label}: ${what} in ${V.label} (${V.sys})`;
  const aggOf = (m1) => (s.agg === 'count' ? 'COUNT(*)' : `${s.agg.toUpperCase()}(${m1})`);
  // Rolling windows recombine the raw totals, so averages stay right over several months.
  const partsOf = (m1) => (s.agg === 'count' ? 'COUNT(*) AS agg_rows'
    : `COUNT(*) AS agg_rows, COUNT(${m1}) AS agg_count, SUM(${m1}) AS agg_sum, MIN(${m1}) AS agg_min, MAX(${m1}) AS agg_max`);
  const values = (m1) => (parts ? partsOf(m1) : `${aggOf(m1)} AS agg_value`);

  if (!sp.splitBy) {
    const keys = G ? [`${labelSql(exprOf(sp.groupBy))} AS ${G}`] : [];
    const body = `SELECT ${[...keys, values(measure && `src.${measure}`)].join(',\n       ')}\n${from}${G ? '\nGROUP BY 1' : ''}`;
    return [cte(name, body, comment)];
  }

  // Split: one series per value of splitBy, the largest MAX_SPLIT kept and the rest added up as Other.
  const rank = s.agg === 'sum' ? 'ABS(COALESCE(SUM(measure), 0))' : 'COUNT(*)';
  return [
    cte(`${name}_rows`, `SELECT ${labelSql(exprOf(sp.groupBy))} AS ${G}, ${labelSql(exprOf(sp.splitBy))} AS ${SP}${measure ? `, src.${measure} AS measure` : ''}\n${from}`, comment),
    cte(`${name}_rank`, `SELECT ${SP}, ROW_NUMBER() OVER (ORDER BY ${rank} DESC, ${SP}) AS split_rank\nFROM ${name}_rows\nGROUP BY ${SP}`,
      `${sp.splitBy} values ranked by size: the top ${MAX_SPLIT} get their own series`),
    cte(name, `SELECT r.${G},\n       CASE WHEN k.split_rank <= ${MAX_SPLIT} THEN substr(r.${SP}, 1, 40) `
      + `ELSE 'Other (' || CAST((SELECT COUNT(*) FROM ${name}_rank) - ${MAX_SPLIT} AS TEXT) || ')' END AS ${SP},\n`
      + `       MIN(k.split_rank) AS split_rank,\n       ${values(measure && 'r.measure')}\n`
      + `FROM ${name}_rows AS r\nJOIN ${name}_rank AS k ON k.${SP} = r.${SP}\nGROUP BY 1, 2`),
  ];
}

/** Final value of a rolled window from the raw totals (same as finalize() in the engine). */
function rolledValue(agg) {
  if (agg === 'count') return 'CASE WHEN l.month_idx IS NOT NULL THEN COALESCE(SUM(x.agg_rows), 0) END';
  const v = { sum: 'SUM(x.agg_sum)', avg: 'CAST(SUM(x.agg_sum) AS DOUBLE) / SUM(x.agg_count)', min: 'MIN(x.agg_min)', max: 'MAX(x.agg_max)' }[agg];
  return `CASE WHEN SUM(x.agg_count) > 0 THEN ${v} END`;
}

/**
 * SQL giving the same numbers as compute(sp, m), with meta describing its
 * columns (units, which are derived, prior period, share) for charts.
 */
export function specToSql(sp, m) {
  if (sp.sql) return { sql: sp.sql, meta: sp.sqlMeta || null };
  const { perSeries, monthFilters } = seriesFilters(sp, m);
  const G = sp.groupBy && ident(sp.groupBy);
  const SP = sp.splitBy && ident(sp.splitBy);
  const win = sp.window;
  const needIdx = Boolean(win || sp.compare);
  const meta = { label: sp.groupBy || null, split: sp.splitBy || null, columns: {} };
  const taken = new Set([sp.groupBy, sp.splitBy, 'month_idx', 'split_rank'].filter(Boolean));
  const nameOf = (label) => {
    let n = String(label);
    for (let i = 2; taken.has(n); i++) n = `${label} (${i})`;
    taken.add(n);
    return n;
  };
  const q = (name) => `"${name.replace(/"/g, '""')}"`;

  const ctes = [];
  sp.series.forEach((s, i) => ctes.push(...seriesCtes(sp, m, s, i, perSeries[i], Boolean(win))));
  const seriesInfo = sp.series.map((s) => {
    const V = m.views[s.view];
    return { ...s, label: win ? `${s.label} (${win}-mo rolling)` : s.label, unit: unitOf(m, s.view, s.measure, s.agg), sys: V.sys, source: V.label };
  });
  const top = [
    sp.series.length > 1 ? `-- Each source is totalled on its own first${sp.groupBy ? `, then joined on ${sp.groupBy}` : ''}; ratios use the totals.` : null,
    sp.splitBy ? `-- One series per ${sp.splitBy} (the ${MAX_SPLIT} largest, the rest as Other).` : null,
    win ? `-- Rolling ${win} months: each month adds up the raw totals of that month and the ${win - 1} before it.` : null,
  ].filter(Boolean);

  // ---- no breakdown: one row of totals ----
  if (!sp.groupBy) {
    const cols = seriesInfo.map((s, i) => {
      const n = nameOf(s.label);
      meta.columns[n] = { kind: 'series', unit: s.unit, sys: s.sys, source: s.source, agg: s.agg };
      return `x${i + 1}.agg_value AS ${q(n)}`;
    });
    (sp.derived || []).forEach((d) => {
      const n = nameOf(d.label);
      meta.columns[n] = { kind: 'derived', unit: derivedUnit(d, seriesInfo) };
      cols.push(`${derivedSql(d, (k) => `x${k + 1}.agg_value`)} AS ${q(n)}`);
    });
    const sql = `${top.join('\n')}${top.length ? '\n' : ''}WITH ${ctes.join(',\n')}\nSELECT ${cols.join(',\n       ')}\nFROM ${sp.series.map((_, i) => `s${i + 1} AS x${i + 1}`).join('\nCROSS JOIN ')};`;
    return { sql, meta };
  }

  const labelsFrom = sp.series.length === 1 ? `SELECT DISTINCT ${G} FROM s1` : sp.series.map((_, i) => `SELECT ${G} FROM s${i + 1}`).join('\nUNION\n');
  const needLabels = sp.series.length > 1 || win || sp.compare || sp.splitBy;
  if (needLabels) {
    ctes.push(cte('labels', needIdx ? `SELECT ${G}, ${monthIdx(G)} AS month_idx\nFROM (\n${indent(labelsFrom)}\n) AS u` : labelsFrom,
      `every ${sp.groupBy} found in any source`));
  }
  if (sp.splitBy) ctes.push(cte('splits', `SELECT ${SP}, MIN(split_rank) AS split_rank FROM s1 GROUP BY ${SP}`));
  // Rolling: for each month, the totals of the months in the window.
  const xs = sp.series.map((s, i) => {
    if (!win) return `s${i + 1}`;
    const body = `SELECT l.${G}${SP ? `, k.${SP}` : ''}, ${rolledValue(s.agg)} AS agg_value\nFROM labels AS l\n${SP ? `CROSS JOIN splits AS k\n` : ''}`
      + `LEFT JOIN labels AS w ON w.month_idx BETWEEN l.month_idx - ${win - 1} AND l.month_idx\n`
      + `LEFT JOIN s${i + 1} AS x ON x.${G} = w.${G}${SP ? ` AND x.${SP} = k.${SP}` : ''}\nGROUP BY l.${G}, l.month_idx${SP ? `, k.${SP}` : ''}`;
    ctes.push(cte(`r${i + 1}`, body));
    return `r${i + 1}`;
  });
  const monthWhere = (e) => monthFilters.map((f) => filterSql(e, f, false));

  // ---- split: long format (one row per group and split value) ----
  if (sp.splitBy) {
    const s = seriesInfo[0];
    const n = nameOf(s.label);
    meta.columns[n] = { kind: 'series', unit: s.unit, sys: s.sys, source: s.source, agg: s.agg };
    if (win) meta.splitSuffix = ` (${win}-mo rolling)`;
    const disp = (a) => `CASE WHEN ${a}.split_rank > ${MAX_SPLIT} THEN 2 WHEN ${a}.${SP} = '(blank)' THEN 1 ELSE 0 END, ${sp.splitBy === 'month' ? `${a}.${SP}, ` : ''}${a}.split_rank`;
    const byLabel = sp.groupBy === 'month' || sp.sort === 'label';
    const order = byLabel ? `l.${G}` : `h.agg_value ${sp.sort === 'asc' ? 'ASC NULLS FIRST' : 'DESC NULLS LAST'}`;
    ctes.push(cte('head', `SELECT ${SP} FROM splits AS k ORDER BY ${disp('k')} LIMIT 1`, 'groups are ordered by the first series'));
    ctes.push(cte('ordered', `SELECT l.${G}, ROW_NUMBER() OVER (ORDER BY ${order}${byLabel ? '' : `, l.${G}`}) AS pos\nFROM labels AS l\n`
      + `LEFT JOIN ${xs[0]} AS h ON h.${G} = l.${G} AND h.${SP} = (SELECT ${SP} FROM head)`));
    const where = [...(sp.groupBy !== 'month' ? [`o.pos <= ${sp.limit}`] : []), ...monthWhere(`x.${G}`)];
    const sql = `${top.join('\n')}${top.length ? '\n' : ''}WITH ${ctes.join(',\n')}\nSELECT x.${G}, x.${SP}, x.agg_value AS ${q(n)}\nFROM ${xs[0]} AS x\n`
      + `JOIN ordered AS o ON o.${G} = x.${G}\nJOIN splits AS k ON k.${SP} = x.${SP}${where.length ? `\nWHERE ${where.join('\n  AND ')}` : ''}\n`
      + `ORDER BY o.pos, ${disp('k')};`;
    return { sql, meta };
  }

  // ---- one column per series, joined on the breakdown ----
  const cols = [];
  const names = seriesInfo.map((s, i) => {
    const n = nameOf(s.label);
    meta.columns[n] = { kind: 'series', unit: s.unit, sys: s.sys, source: s.source, agg: s.agg };
    cols.push(`x${i + 1}.agg_value AS ${q(n)}`);
    return n;
  });
  const derivedInfo = (sp.derived || []).map((d) => {
    const n = nameOf(d.label);
    const unit = derivedUnit(d, seriesInfo);
    meta.columns[n] = { kind: 'derived', unit };
    cols.push(`${derivedSql(d, (k) => `x${k + 1}.agg_value`)} AS ${q(n)}`);
    return { ...d, name: n, unit };
  });
  const head = derivedInfo[0] || { name: names[0], label: seriesInfo[0].label, unit: seriesInfo[0].unit };
  let body;
  if (needLabels) {
    body = `SELECT l.${G}${needIdx ? ', l.month_idx' : ''},\n       ${cols.join(',\n       ')}\nFROM labels AS l\n`
      + xs.map((x, i) => `LEFT JOIN ${x} AS x${i + 1} ON x${i + 1}.${G} = l.${G}`).join('\n');
  } else {
    body = `SELECT x1.${G},\n       ${cols.join(',\n       ')}\nFROM ${xs[0]} AS x1`;
  }
  ctes.push(cte('t', body, 'one row per group'));
  let from = 't';
  const outCols = [G, ...names.map(q), ...derivedInfo.map((d) => q(d.name))];
  if (sp.compare) {
    const lag = COMPARE[sp.compare];
    const word = sp.compare === 'prior_year' ? 'prior year' : 'prior month';
    const pn = nameOf(`${head.label}, ${word}`);
    const cn = nameOf(`Change vs ${word}`);
    meta.columns[pn] = { kind: 'prior', unit: head.unit };
    meta.columns[cn] = { kind: 'change', unit: 'pct' };
    const H = q(head.name);
    ctes.push(cte('c', `SELECT t.*,\n       p.${H} AS ${q(pn)},\n       CASE WHEN p.${H} <> 0 THEN (t.${H} - p.${H}) / ABS(CAST(p.${H} AS DOUBLE)) END AS ${q(cn)}\n`
      + `FROM t\nLEFT JOIN t AS p ON p.month_idx = t.month_idx - ${lag}`, `same month ${lag === 12 ? 'a year earlier' : 'one month earlier'}`));
    from = 'c';
    outCols.push(q(pn), q(cn));
  }
  if (sp.share) {
    const base = derivedInfo[0] && derivedInfo[0].denominator === null ? derivedInfo[0] : { name: names[0], label: seriesInfo[0].label };
    const sn = nameOf(`Share of ${base.label.toLowerCase()}`);
    meta.columns[sn] = { kind: 'share', unit: 'pct' };
    outCols.push(`CAST(COALESCE(${q(base.name)}, 0) AS DOUBLE) / NULLIF(SUM(COALESCE(${q(base.name)}, 0)) OVER (), 0) AS ${q(sn)}`);
  }
  const where = monthWhere(G);
  const order = sp.groupBy === 'month' || sp.sort === 'label' ? G : `${q(head.name)} ${sp.sort === 'asc' ? 'ASC NULLS FIRST' : 'DESC NULLS LAST'}, ${G}`;
  const sql = `${top.join('\n')}${top.length ? '\n' : ''}WITH ${ctes.join(',\n')}\nSELECT ${outCols.join(',\n       ')}\nFROM ${from}`
    + `${where.length ? `\nWHERE ${where.join('\n  AND ')}` : ''}\nORDER BY ${order}${sp.groupBy !== 'month' ? `\nLIMIT ${sp.limit}` : ''};`;
  return { sql, meta };
}

function derivedSql(d, col) {
  const num = d.numerator.map((k) => `COALESCE(${col(k)}, 0)`).join(' + ');
  if (d.denominator === null) return num;
  return `CAST(${num} AS DOUBLE) / NULLIF(COALESCE(${col(d.denominator)}, 0), 0)`;
}

/* ---------------- running SQL ---------------- */

/** One read-only SELECT (or WITH … SELECT) statement, without trailing semicolons. */
export function checkSql(sql) {
  const text = String(sql || '').trim().replace(/;\s*$/, '').trim();
  const bare = text.replace(/--[^\n]*/g, ' ').replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/'(?:[^']|'')*'/g, "''").replace(/"(?:[^"]|"")*"/g, '""').trim();
  if (!bare) throw new Error('Write a SELECT query first.');
  if (!/^(select|with)\b/i.test(bare)) throw new Error('Only SELECT queries can be run here (they read your data and never change it).');
  if (bare.includes(';')) throw new Error('Run one query at a time.');
  if (text.length > 20000) throw new Error('That query is too long.');
  return text;
}

const MONEY_RE = /amount|revenue|sales|cost|salary|salaries|price|spend|value|total|fee|budget|profit|margin|income|expense|invoice|pay|gbp|usd|eur/i;
const isNum = (v) => typeof v === 'number' || typeof v === 'bigint';

/**
 * Rows from SQL → { labels, series, derived, extra } like compute(). The first
 * text column(s) become the labels; with [label, split, value] (or meta.split)
 * the split values become one series each; every number column is a series.
 */
export function sqlToResult({ columns, rows, truncated }, sqlMeta, currency) {
  // An edited query may no longer have the columns the generated one had: then read it like any query.
  const meta = sqlMeta && (!sqlMeta.label || columns.includes(sqlMeta.label)) && (!sqlMeta.split || columns.includes(sqlMeta.split)) ? sqlMeta : null;
  const known = sqlMeta?.columns || {};
  const numericCol = columns.map((_, j) => rows.some((r) => isNum(r[j])) && rows.every((r) => r[j] === null || r[j] === undefined || isNum(r[j])));
  const info = (name) => known[name] || null;
  const labelCols = [];
  if (meta) {
    [meta.label, meta.split].forEach((n) => { const j = n ? columns.indexOf(n) : -1; if (j >= 0) labelCols.push(j); });
  } else {
    columns.forEach((_, j) => { if (!numericCol[j]) labelCols.push(j); });
    if (!labelCols.length && rows.length > 1 && columns.length > 1) labelCols.push(0);
  }
  // Generated SQL says which columns are values; for edited SQL, every number column is one.
  const valueCols = columns.map((_, j) => j).filter((j) => !labelCols.includes(j) && (meta?.columns?.[columns[j]] || numericCol[j]));
  const splitCol = meta ? (meta.split ? columns.indexOf(meta.split) : -1) : (labelCols.length === 2 && valueCols.length === 1 ? labelCols[1] : -1);
  const text = (v) => (v === null || v === undefined || v === '' ? '(blank)' : String(v));
  const labelOfRow = (r) => (labelCols.filter((j) => j !== splitCol).map((j) => text(r[j])).join(' · ') || 'All');
  const guessUnit = (name) => (/(^|\W)(share|change|pct|percent)(\W|$)|%/i.test(name) ? 'pct' : MONEY_RE.test(name) && currency ? 'money' : 'number');
  const num = (v) => (v === null || v === undefined ? null : Number(v));

  const labels = [];
  const seen = new Map();
  rows.forEach((r) => {
    const l = labelOfRow(r);
    if (!seen.has(l)) { seen.set(l, labels.length); labels.push(l); }
  });
  const out = { labels, series: [], derived: [], extra: [], labelName: labelCols.length && labelCols[0] !== splitCol ? columns[labelCols[0]] : null, truncated: Boolean(truncated) };
  if (splitCol >= 0) {
    const vj = valueCols[0];
    const m0 = info(columns[vj]) || {};
    const bySplit = new Map();
    rows.forEach((r) => {
      const k = text(r[splitCol]);
      if (!bySplit.has(k)) bySplit.set(k, labels.map(() => null));
      bySplit.get(k)[seen.get(labelOfRow(r))] = num(r[vj]);
    });
    bySplit.forEach((data, k) => out.series.push({
      label: `${k.slice(0, 40)}${meta?.splitSuffix || ''}`, split: k, unit: m0.unit || guessUnit(columns[vj]), agg: m0.agg || 'sum', sys: m0.sys || 'SQL', source: m0.source || 'SQL', rows: null, data, measure: columns[vj], filters: [],
    }));
    return out;
  }
  valueCols.forEach((j) => {
    const name = columns[j];
    const c = info(name) || {};
    const data = labels.map(() => null);
    rows.forEach((r) => { data[seen.get(labelOfRow(r))] = num(r[j]); });
    const col = { label: name, unit: c.unit || guessUnit(name), data };
    if (c.kind === 'derived') out.derived.push({ ...col, numerator: [], denominator: null });
    else if (['prior', 'change', 'share'].includes(c.kind)) out.extra.push({ ...col, kind: c.kind });
    else out.series.push({ ...col, agg: c.agg || 'sum', sys: c.sys || 'SQL', source: c.source || 'SQL', rows: null, measure: name, filters: [] });
  });
  return out;
}

let cache = null; // { m, db, loaded } — one in-memory database for the current data

async function browserDb(m, keys, SQL) {
  if (!cache || cache.m !== m || cache.SQL !== SQL) {
    try { cache?.db.close(); } catch { /* already closed */ }
    cache = { m, SQL, db: new SQL.Database(), loaded: new Set() };
  }
  const { db, loaded } = cache;
  const todo = keys.filter((k) => !loaded.has(k));
  if (todo.length) {
    db.run('PRAGMA query_only = 0');
    for (const k of todo) {
      const cols = tableColumns(m, k);
      db.run(`CREATE TABLE ${ident(k)} (${cols.map((c) => `${ident(c.key)} ${c.type === 'number' ? 'REAL' : 'TEXT'}`).join(', ')})`);
      const ins = db.prepare(`INSERT INTO ${ident(k)} VALUES (${cols.map(() => '?').join(', ')})`);
      db.run('BEGIN');
      for (const r of m.baseRowsOf(k)) {
        ins.run(cols.map((c) => {
          const v = r[c.key];
          if (v === null || v === undefined) return null;
          if (c.type === 'number') return typeof v === 'number' && Number.isFinite(v) ? v : null;
          return String(v);
        }));
      }
      db.run('COMMIT');
      ins.free();
      loaded.add(k);
    }
    db.run('PRAGMA query_only = 1'); // queries can read the data but never change it
  }
  return db;
}

/**
 * Run SQL where the data is. Returns { columns, rows, truncated, where }.
 * opts.SQL: an initialised sql.js module (tests); opts.remoteRun: lakehouse call (tests).
 */
export async function runSql(sql, m, opts = {}) {
  const text = checkSql(sql);
  const keys = tablesIn(text, m);
  if (!keys.length) throw new Error('Name one of your sources in FROM (see "Tables you can query").');
  const remote = keys.filter((k) => m.views[k].remote);
  if (remote.length && remote.length < keys.length) {
    throw new Error('This query uses sources kept in your browser and sources stored in the meldra lakehouse. SQL runs where the data is, so store them in the same place (Data sources) to query them together.');
  }
  if (remote.length) {
    const call = opts.remoteRun || (async (body) => (await import('@/api/backendClient')).backendApi.lakehouse.sql(body));
    const out = await call({ sql: text, tables: Object.fromEntries(keys.map((k) => [k, m.views[k].table])) });
    return { ...out, where: 'lakehouse' };
  }
  const SQL = opts.SQL || await (await import('./sqlEngine')).loadSqlJs();
  const db = await browserDb(m, keys, SQL);
  const stmt = db.prepare(text);
  try {
    const columns = stmt.getColumnNames();
    const rows = [];
    let truncated = false;
    while (stmt.step()) {
      if (rows.length === MAX_RESULT_ROWS) { truncated = true; break; }
      rows.push(stmt.get());
    }
    return { columns, rows, truncated, where: 'browser' };
  } finally {
    stmt.free();
  }
}
