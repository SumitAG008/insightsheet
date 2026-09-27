/**
 * Unified Reporting engine.
 *
 * The AI never writes SQL or formulas. It returns a query *spec* that picks
 * views, measures, filters and one shared dimension; this engine validates it
 * against the user's model and enforces the rules that make cross-source
 * numbers correct:
 *   1. Each series is aggregated inside its own source first.
 *   2. Only then are series joined, on the shared dimension (groupBy).
 *   3. Derived metrics (ratios such as cost per head) are computed on the
 *      aggregated totals, never averaged row by row.
 */

export const AGG = ['sum', 'count', 'avg', 'min', 'max'];
export const OPS = ['eq', 'neq', 'gte', 'lte'];
export const CHARTS = ['bar', 'line', 'pie', 'scatter', 'table', 'number'];
const MAX_SERIES = 4;
const MAX_DERIVED = 2;

/* ---------------- catalog for the AI planner ---------------- */

export function distinctValues(m, view, dim, limit = 12) {
  const seen = new Set();
  for (const r of m.rowsOf(view)) {
    const v = r[dim];
    if (v !== null && v !== undefined && v !== '') seen.add(String(v));
    if (seen.size >= limit) break;
  }
  return [...seen];
}

function monthRange(m) {
  let lo = null;
  let hi = null;
  for (const v of Object.values(m.views)) {
    if (!v.dims.includes('month')) continue;
    for (const r of m.rowsOf(v.key)) {
      if (!r.month) continue;
      if (!lo || r.month < lo) lo = r.month;
      if (!hi || r.month > hi) hi = r.month;
    }
  }
  return lo ? `${lo} to ${hi}` : 'no dates';
}

/** Metadata sent to the backend planner: names and a few example values, never rows. */
export function buildCatalog(m) {
  const known = [];
  for (const v of Object.values(m.views)) {
    for (const d of v.dims) {
      if (d === 'month') continue;
      const vals = distinctValues(m, v.key, d, 13);
      if (vals.length && vals.length <= 12) known.push(`${d} (${v.key}): ${vals.join(', ')}`);
    }
  }
  return {
    today: new Date().toISOString().slice(0, 10),
    data_range: monthRange(m),
    currency: m.currency || '',
    views: Object.values(m.views).map((v) => ({
      name: v.key,
      system: v.sys,
      description: v.desc,
      dimensions: v.dims,
      measures: v.measures.map((k) => `${k} (${v.units[k]})`),
    })),
    shared_dimensions: m.shared,
    known_values: known.slice(0, 40),
    notes: ['Measure names are given with their unit in brackets; use the name without the bracket.', 'month values look like "2026-01".'],
  };
}

/* ---------------- spec validation ---------------- */

const unitOf = (m, view, measure, agg) => (agg === 'count' || !measure ? 'count' : m.views[view]?.units[measure] || 'number');

/**
 * Validate and normalise a spec from the AI, the rules, or the user's edit
 * box. Anything not in the model is dropped, never guessed.
 */
export function sanitize(sp, m) {
  if (!sp || typeof sp !== 'object') throw new Error('empty spec');
  if (sp.cannot) return { cannot: String(sp.cannot).slice(0, 300) };
  if (sp.clarify) {
    const options = (Array.isArray(sp.options) ? sp.options : []).map(String).filter(Boolean).slice(0, 4);
    if (options.length >= 2) return { clarify: String(sp.clarify).slice(0, 200), options };
  }

  let series = (Array.isArray(sp.series) ? sp.series : [])
    .filter((s) => s && m.views[s.view])
    .slice(0, MAX_SERIES)
    .map((s) => {
      const V = m.views[s.view];
      const measure = V.measures.includes(s.measure) ? s.measure : null;
      let agg = AGG.includes(s.agg) ? s.agg : measure ? 'sum' : 'count';
      if (!measure) agg = 'count';
      const filters = (Array.isArray(s.filters) ? s.filters : [])
        .filter((f) => f && V.dims.includes(f.dim) && OPS.includes(f.op))
        .map((f) => ({ dim: f.dim, op: f.op, value: String(f.value ?? '') }));
      const fallback = agg === 'count' ? `${V.label} (count)` : `${measure.replace(/_/g, ' ')}`;
      return { view: s.view, measure: agg === 'count' ? null : measure, agg, filters, label: String(s.label || fallback).slice(0, 40) };
    });
  if (!series.length) throw new Error('no series');

  let groupBy = null;
  if (sp.groupBy) {
    // A series can only join on a dimension its source actually has.
    const ok = series.filter((s) => m.views[s.view].dims.includes(sp.groupBy));
    if (ok.length) {
      series = ok;
      groupBy = sp.groupBy;
    }
  }

  const derived = (Array.isArray(sp.derived) ? sp.derived : [])
    .map((d) => {
      if (!d || typeof d !== 'object') return null;
      const numerator = (Array.isArray(d.numerator) ? d.numerator : [d.numerator])
        .map((i) => parseInt(i, 10))
        .filter((i) => Number.isInteger(i) && i >= 0 && i < series.length);
      const den = d.denominator === null || d.denominator === undefined ? null : parseInt(d.denominator, 10);
      const denominator = Number.isInteger(den) && den >= 0 && den < series.length ? den : null;
      if (!numerator.length) return null;
      return { label: String(d.label || 'Derived').slice(0, 40), numerator: [...new Set(numerator)], denominator };
    })
    .filter(Boolean)
    .slice(0, MAX_DERIVED);

  let chart = CHARTS.includes(sp.chart) ? sp.chart : null;
  if (!groupBy) chart = 'number';
  else if (chart === 'scatter' && (series.length < 2 || groupBy === 'month')) chart = null;
  if (groupBy && (!chart || chart === 'number')) chart = groupBy === 'month' ? 'line' : 'bar';
  if (chart === 'pie' && (series.length > 1 || derived.length)) chart = 'bar';

  return {
    title: String(sp.title || 'Answer').slice(0, 90),
    chart,
    groupBy,
    series,
    derived,
    sort: ['desc', 'asc', 'label'].includes(sp.sort) ? sp.sort : 'desc',
    limit: Math.min(50, Math.max(3, parseInt(sp.limit, 10) || 12)),
    followups: (Array.isArray(sp.followups) ? sp.followups : []).map(String).filter(Boolean).slice(0, 3),
  };
}

/** Chart types that make sense for a spec, for the chart switcher. */
export function chartOptions(sp) {
  if (!sp.groupBy) return ['number'];
  const opts = ['bar', 'line', 'table'];
  if (sp.series.length === 1 && !sp.derived.length) opts.push('pie');
  if (sp.series.length >= 2 && sp.groupBy !== 'month') opts.push('scatter');
  return opts;
}

/* ---------------- compute ---------------- */

function pass(v, f) {
  const a = String(v ?? '').toLowerCase();
  const b = f.value.toLowerCase();
  if (f.op === 'eq') return a === b;
  if (f.op === 'neq') return a !== b;
  const na = Number(v);
  const nb = Number(f.value);
  const cmp = !Number.isNaN(na) && !Number.isNaN(nb) && a !== '' ? na - nb : a < b ? -1 : a > b ? 1 : 0;
  return f.op === 'gte' ? cmp >= 0 : cmp <= 0;
}

function derivedUnit(d, series) {
  const numUnits = d.numerator.map((i) => series[i].unit);
  const numUnit = numUnits.every((u) => u === numUnits[0]) ? numUnits[0] : 'number';
  if (d.denominator === null) return numUnit;
  return series[d.denominator].unit === numUnit ? 'pct' : numUnit;
}

/**
 * Aggregate each series within its own source, then join on groupBy.
 * Returns { labels, series[], derived[] } with values aligned to labels.
 */
export function compute(sp, m) {
  const out = sp.series.map((s) => {
    const rows = m.rowsOf(s.view).filter((x) => s.filters.every((f) => pass(x[f.dim], f)));
    const groups = new Map();
    for (const x of rows) {
      const raw = sp.groupBy ? x[sp.groupBy] : 'All';
      const k = raw === null || raw === undefined || raw === '' ? '(blank)' : String(raw);
      const a = groups.get(k) || { n: 0, cnt: 0, sum: 0, min: Infinity, max: -Infinity };
      a.n++;
      if (s.measure) {
        const v = x[s.measure];
        if (typeof v === 'number') {
          a.cnt++;
          a.sum += v;
          a.min = Math.min(a.min, v);
          a.max = Math.max(a.max, v);
        }
      }
      groups.set(k, a);
    }
    const vals = {};
    groups.forEach((a, k) => {
      if (s.agg === 'count') vals[k] = a.n;
      else if (!a.cnt) vals[k] = null;
      else vals[k] = s.agg === 'avg' ? a.sum / a.cnt : s.agg === 'min' ? a.min : s.agg === 'max' ? a.max : a.sum;
    });
    return { s, vals, rows: rows.length };
  });

  let labels = [...new Set(out.flatMap((o) => Object.keys(o.vals)))];
  const series = out.map((o) => ({ ...o.s, vals: o.vals, rows: o.rows, sys: m.views[o.s.view].sys, source: m.views[o.s.view].label, unit: unitOf(m, o.s.view, o.s.measure, o.s.agg) }));

  const derivedVals = (sp.derived || []).map((d) => {
    const vals = {};
    for (const l of labels) {
      const num = d.numerator.reduce((acc, i) => acc + (series[i].vals[l] || 0), 0);
      if (d.denominator === null) vals[l] = num;
      else {
        const den = series[d.denominator].vals[l] || 0;
        vals[l] = den ? num / den : null;
      }
    }
    return { ...d, vals, unit: derivedUnit(d, series) };
  });

  // Rank by the headline number: the first derived metric if any, else the first series.
  const key = derivedVals[0] ? derivedVals[0].vals : series[0].vals;
  if (sp.groupBy === 'month' || sp.sort === 'label') labels.sort();
  else {
    labels.sort((a, b) => (key[b] ?? -Infinity) - (key[a] ?? -Infinity));
    if (sp.sort === 'asc') labels.reverse();
  }
  if (sp.groupBy !== 'month') labels = labels.slice(0, sp.limit);

  return {
    labels,
    series: series.map(({ vals, ...s }) => ({ ...s, data: labels.map((l) => vals[l] ?? null) })),
    derived: derivedVals.map(({ vals, ...d }) => ({ ...d, data: labels.map((l) => vals[l] ?? null) })),
  };
}

/* ---------------- formatting ---------------- */

export function fmt(v, unit, currency = '') {
  if (v === null || v === undefined || Number.isNaN(v)) return '—';
  if (unit === 'pct') return `${(v * 100).toFixed(1)}%`;
  if (unit === 'days') return `${Math.round(v)} days`;
  const a = Math.abs(v);
  const sym = unit === 'money' ? currency : '';
  if (unit === 'money' || a >= 1e4) {
    if (a >= 1e6) return `${sym}${(v / 1e6).toFixed(a >= 1e7 ? 0 : 1)}M`;
    if (a >= 1e4) return `${sym}${Math.round(v / 1e3)}K`;
    if (a >= 1e3) return `${sym}${(v / 1e3).toFixed(1)}K`;
    return `${sym}${Math.round(v)}`;
  }
  return Number.isInteger(v) ? v.toLocaleString() : v.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

/** Every column of a result, raw series first then derived metrics. */
export function columnsOf(res) {
  return [...res.series, ...res.derived.map((d) => ({ ...d, derived: true }))];
}

/** Columns worth charting: derived metrics when present (units differ otherwise). */
export function chartColumns(res) {
  return res.derived.length ? res.derived.map((d) => ({ ...d, derived: true })) : res.series;
}

/* ---------------- SQL preview ---------------- */

export function toSQL(sp, m) {
  const opm = { eq: '=', neq: '<>', gte: '>=', lte: '<=' };
  const one = (s, i) => {
    const V = m.views[s.view];
    const agg = s.agg === 'count' ? 'COUNT(*)' : `${s.agg.toUpperCase()}(${s.measure})`;
    const w = s.filters.length
      ? `\n  WHERE ${s.filters.map((f) => `${f.dim} ${opm[f.op]} '${f.value.replace(/'/g, "''")}'`).join('\n    AND ')}`
      : '';
    const lookups = V.borrowed.filter((b) => sp.groupBy === b.key || s.filters.some((f) => f.dim === b.key));
    const via = [...new Set(lookups.map((b) => b.via))];
    const joins = via.map((r) => {
      const t = Object.values(m.views).find((x) => x.id === r.to.source);
      return `\n  LEFT JOIN ${t ? t.key : 'lookup'} USING (${r.from.col})   -- lookup in ${t ? t.sys : 'source'}`;
    }).join('');
    return `SELECT ${sp.groupBy ? `${sp.groupBy}, ` : ''}${agg} AS s${i + 1}\n  FROM ${s.view}   -- from ${V.sys}${joins}${w}${sp.groupBy ? `\n  GROUP BY ${sp.groupBy}` : ''}`;
  };
  const derivedCols = (sp.derived || []).map((d, i) => {
    const num = d.numerator.map((n) => `COALESCE(s${n + 1}, 0)`).join(' + ');
    const expr = d.denominator === null ? num : `(${num}) / NULLIF(s${d.denominator + 1}, 0)`;
    return `${expr} AS d${i + 1}`;
  });
  const sortCol = derivedCols.length ? 'd1' : 's1';
  const order = sp.groupBy
    ? sp.groupBy === 'month'
      ? '\nORDER BY month'
      : `\nORDER BY ${sortCol} ${sp.sort === 'asc' ? 'ASC' : 'DESC'}\nLIMIT ${sp.limit}`
    : '';

  if (sp.series.length === 1 && !derivedCols.length) return `${one(sp.series[0], 0)}${order};`;

  const ctes = sp.series.map((s, i) => `s${i + 1} AS (\n  ${one(s, i).replace(/\n/g, '\n  ')}\n)`).join(',\n');
  const cols = [...sp.series.map((_, i) => `s${i + 1}`), ...derivedCols];
  if (!sp.groupBy) {
    return `-- Each source is aggregated first, then combined.\nWITH ${ctes}\nSELECT ${cols.join(', ')}\nFROM ${sp.series.map((_, i) => `s${i + 1}`).join(' CROSS JOIN ')};`;
  }
  const joins = sp.series.slice(1).map((_, i) => `\nFULL JOIN s${i + 2} USING (${sp.groupBy})`).join('');
  return `-- Each source is aggregated to ${sp.groupBy} first, then joined.\nWITH ${ctes}\nSELECT ${sp.groupBy}, ${cols.join(', ')}\nFROM s1${joins}${order};`;
}

/* ---------------- rules planner (no AI needed) ---------------- */

const words = (s) => String(s).toLowerCase().replace(/_/g, ' ').split(/[^a-z0-9]+/).filter(Boolean);
const stem = (w) => w.replace(/(ies)$/, 'y').replace(/(es|s)$/, '');

function mentions(q, key) {
  const qs = new Set(words(q).map(stem));
  const ks = words(key).map(stem);
  return ks.length > 0 && ks.every((k) => qs.has(k));
}

/** Position of the first mention of a key in the question, or Infinity. */
function mentionAt(q, key) {
  const qw = words(q).map(stem);
  const ks = words(key).map(stem);
  const i = qw.indexOf(ks[0]);
  return i < 0 ? Infinity : i;
}

/**
 * Read a plain question against the user's own model: which sources and
 * measures it names, what to break down by, and simple filters.
 */
export function heuristic(q, m) {
  const ql = q.toLowerCase();
  const views = Object.values(m.views);
  if (!views.length) throw new Error('no data');

  // Break down by: "by X", "per X", or a trend.
  let groupBy = null;
  const by = ql.match(/\b(?:by|per|for each|across)\s+([a-z0-9_ ]+)/);
  if (by) {
    const allDims = [...new Set(views.flatMap((v) => v.dims))];
    groupBy = allDims.filter((d) => mentions(by[1], d)).sort((a, b) => mentionAt(by[1], a) - mentionAt(by[1], b))[0] || null;
  }
  if (!groupBy && /trend|monthly|over time|each month|per month/.test(ql)) groupBy = 'month';

  // Score each view by how the question names it, its system or its measures.
  const scored = views.map((v) => {
    let score = 0;
    let at = Infinity;
    for (const name of [v.label, v.key, v.sys]) {
      if (mentions(q, name)) { score += 3; at = Math.min(at, mentionAt(q, name)); }
    }
    const ms = v.measures.filter((k) => mentions(q, k));
    if (ms.length) { score += 2; at = Math.min(at, ...ms.map((k) => mentionAt(q, k))); }
    if (groupBy && v.dims.includes(groupBy)) score += 1;
    return { v, score, at, ms };
  }).filter((x) => x.score > (groupBy ? 1 : 0)).sort((a, b) => a.at - b.at || b.score - a.score);

  let use = scored;
  if (!use.length) {
    const fallback = views.find((v) => !groupBy || v.dims.includes(groupBy)) || views[0];
    use = [{ v: fallback, ms: [] }];
  }
  const compare = /\bvs\b|versus|compare|against|\band\b/.test(ql);
  if (!compare) use = use.slice(0, 1);

  const count = /how many|count|number of|headcount/.test(ql);
  const agg = /average|avg|typical|mean/.test(ql) ? 'avg' : /highest|max/.test(ql) && !groupBy ? 'max' : 'sum';

  const series = use.slice(0, 3).map(({ v, ms }) => {
    const filters = [];
    // Filter on any known value the question names (e.g. "overdue", "Sales").
    for (const d of v.dims) {
      if (d === 'month' || d === groupBy) continue;
      for (const val of distinctValues(m, v.key, d, 30)) {
        if (val.length > 2 && new RegExp(`\\b${val.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`).test(ql)) {
          filters.push({ dim: d, op: 'eq', value: val });
          break;
        }
      }
    }
    if (/this year/.test(ql) && v.dims.includes('month')) filters.push({ dim: 'month', op: 'gte', value: `${new Date().getFullYear()}-01` });
    const measure = count ? null : ms[0] || v.measures[0] || null;
    return { view: v.key, measure, agg: measure ? agg : 'count', filters };
  });

  const lim = ql.match(/top (\d+)/);
  return sanitize({
    title: q.replace(/\?$/, '').replace(/^./, (c) => c.toUpperCase()),
    groupBy,
    chart: /bubble|scatter/.test(ql) ? 'scatter' : /pie|share/.test(ql) ? 'pie' : null,
    series,
    limit: lim ? +lim[1] : 12,
  }, m);
}

/* ---------------- suggestions from the user's data ---------------- */

const pretty = (k) => k.replace(/_/g, ' ');

/** Questions that are guaranteed to work on this model. */
export function suggestQuestions(m) {
  const out = [];
  const views = Object.values(m.views).filter((v) => v.rowCount);
  const good = (v, d) => d !== 'month' && distinctValues(m, v.key, d, 60).length <= 50 && distinctValues(m, v.key, d, 60).length > 1;

  // Cross-source comparisons on shared dimensions first: that is the point of unified reporting.
  for (const d of m.shared) {
    const vs = views.filter((v) => v.dims.includes(d));
    if (vs.length < 2) continue;
    const [a, b] = vs;
    const qa = a.measures[0] ? pretty(a.measures[0]) : `${a.label.toLowerCase()} count`;
    const qb = b.measures[0] ? pretty(b.measures[0]) : `${b.label.toLowerCase()} count`;
    const spec = {
      title: `${a.label} vs ${b.label} by ${pretty(d)}`,
      groupBy: d,
      series: [a, b].map((v) => ({ view: v.key, measure: v.measures[0] || null, agg: v.measures[0] ? 'sum' : 'count', label: `${v.label}${v.measures[0] ? '' : ' (count)'}` })),
    };
    out.push({ q: `${a.label}: ${qa} vs ${b.label}: ${qb} by ${pretty(d)}`, src: `${a.sys} + ${b.sys}`, spec });
    if (out.length >= 3) break;
  }
  for (const v of views) {
    const dim = v.dims.find((d) => good(v, d));
    const meas = v.measures[0];
    if (dim) {
      out.push({
        q: meas ? `${pretty(meas)} in ${v.label} by ${pretty(dim)}` : `${v.label} count by ${pretty(dim)}`,
        src: v.sys,
        spec: { title: `${v.label}: ${meas ? pretty(meas) : 'count'} by ${pretty(dim)}`, groupBy: dim, series: [{ view: v.key, measure: meas || null, agg: meas ? 'sum' : 'count' }] },
      });
    }
    if (meas && v.dims.includes('month')) {
      out.push({ q: `${v.label} ${pretty(meas)} by month`, src: v.sys, spec: { title: `${v.label}: ${pretty(meas)} by month`, groupBy: 'month', chart: 'line', series: [{ view: v.key, measure: meas, agg: 'sum' }] } });
    }
    if (out.length >= 9) break;
  }
  const seen = new Set();
  return out.filter((s) => {
    if (seen.has(s.q)) return false;
    seen.add(s.q);
    try {
      s.spec = sanitize(s.spec, m);
      return true;
    } catch {
      return false;
    }
  }).slice(0, 6);
}

export function fallbackFollowups(sp, m) {
  const v = m.views[sp.series[0].view];
  const out = [];
  const others = v.dims.filter((d) => d !== sp.groupBy && d !== 'month' && distinctValues(m, v.key, d, 40).length <= 30);
  if (others[0]) out.push(`${v.label} by ${pretty(others[0])}`);
  if (sp.groupBy !== 'month' && v.dims.includes('month')) out.push(`${v.label} by month`);
  const partner = Object.values(m.views).find((x) => x.key !== v.key && sp.groupBy && x.dims.includes(sp.groupBy));
  if (partner) out.push(`${v.label} vs ${partner.label} by ${pretty(sp.groupBy)}`);
  return out.slice(0, 3);
}

export function fallbackInsight(sp, res, currency) {
  if (!res.labels.length) return 'Nothing matched this question in your data.';
  const cols = chartColumns(res);
  const c0 = cols[0];
  if (!sp.groupBy) return `${columnsOf(res).map((s) => `${s.label}: ${fmt(s.data[0], s.unit, currency)}`).join('. ')}.`;
  const idx = c0.data.map((v, i) => [v ?? -Infinity, i]).filter(([v]) => v !== -Infinity).sort((a, b) => b[0] - a[0]);
  if (!idx.length) return 'No values to compare for this breakdown.';
  const top = res.labels[idx[0][1]];
  const low = res.labels[idx[idx.length - 1][1]];
  let t = `${top} is highest on ${c0.label.toLowerCase()} at ${fmt(idx[0][0], c0.unit, currency)}`;
  if (idx.length > 1) t += `, and ${low} is lowest at ${fmt(idx[idx.length - 1][0], c0.unit, currency)}`;
  t += '.';
  if (res.labels.includes('(blank)')) t += ' Rows with no value for this breakdown are grouped as (blank); check the links between your sources if that group is large.';
  return t;
}
