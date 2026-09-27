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
export const CHARTS = ['bar', 'line', 'area', 'combo', 'pie', 'treemap', 'funnel', 'radar', 'scatter', 'table', 'number', 'heatmap', 'waterfall'];
export const COMPARE = { prior_year: 12, prior_period: 1 };
const MAX_SERIES = 4;
const MAX_DERIVED = 2;
const MAX_SPLIT = 8;
const MAX_FILTERS = 8;

/* ---------------- catalog for the AI planner ---------------- */

export function distinctValues(m, view, dim, limit = 12) {
  const known = m.valuesOf?.(view, dim);
  if (known) return known.slice(0, limit);
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
    const range = v.remote ? m.byId?.[v.id]?.monthRange : null;
    if (range) {
      if (!lo || range[0] < lo) lo = range[0];
      if (!hi || range[1] > hi) hi = range[1];
      continue;
    }
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

function cleanFilters(list, allowed) {
  return (Array.isArray(list) ? list : [])
    .filter((f) => f && typeof f === 'object' && allowed(f.dim) && OPS.includes(f.op))
    .map((f) => ({ dim: String(f.dim), op: f.op, value: String(f.value ?? '').slice(0, 120) }))
    .slice(0, MAX_FILTERS);
}

const ADDITIVE = ['sum', 'count'];

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
      const filters = cleanFilters(s.filters, (d) => V.dims.includes(d));
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

  // Filters for the whole answer apply to every series whose source has that column.
  const dimsOf = new Set(series.flatMap((s) => m.views[s.view].dims));
  const filters = cleanFilters(sp.filters, (d) => dimsOf.has(d));

  // A second breakdown splits the one series into a series per value (stacked bars, heatmap).
  let splitBy = null;
  if (groupBy && sp.splitBy && sp.splitBy !== groupBy && series.length === 1 && !derived.length && m.views[series[0].view].dims.includes(sp.splitBy)) {
    splitBy = String(sp.splitBy);
  }
  const monthly = groupBy === 'month';
  const compare = monthly && !splitBy && COMPARE[sp.compare] ? sp.compare : null;
  const win = monthly ? parseInt(sp.window, 10) : NaN;
  const window = Number.isInteger(win) && win >= 2 && win <= 24 ? win : null;
  const share = Boolean(sp.share) && Boolean(groupBy) && !splitBy;

  let chart = CHARTS.includes(sp.chart) ? sp.chart : null;
  if (!groupBy) chart = 'number';
  else if (chart === 'scatter' && (series.length < 2 || monthly || splitBy)) chart = null;
  if (chart === 'heatmap' && !splitBy) chart = null;
  if (chart === 'waterfall' && !(series.length === 1 && !derived.length && !splitBy && ADDITIVE.includes(series[0].agg) && !window)) chart = null;
  if (groupBy && (!chart || chart === 'number')) chart = monthly ? 'line' : 'bar';
  if (chart === 'pie' && (series.length > 1 || derived.length || splitBy)) chart = 'bar';
  const single = series.length === 1 && !derived.length && !splitBy;
  if (chart === 'combo' && (splitBy || series.length + derived.length < 2)) chart = monthly ? 'line' : 'bar';
  if ((chart === 'treemap' || chart === 'funnel') && (!single || monthly)) chart = monthly ? 'line' : 'bar';
  if (chart === 'radar' && (monthly || splitBy)) chart = 'line';

  return {
    title: String(sp.title || 'Answer').slice(0, 90),
    chart,
    groupBy,
    splitBy,
    series,
    derived,
    filters,
    compare,
    window,
    share,
    sort: ['desc', 'asc', 'label'].includes(sp.sort) ? sp.sort : 'desc',
    limit: Math.min(50, Math.max(3, parseInt(sp.limit, 10) || 12)),
    followups: (Array.isArray(sp.followups) ? sp.followups : []).map(String).filter(Boolean).slice(0, 3),
  };
}

/** Chart types that make sense for a spec, for the chart switcher. */
export function chartOptions(sp) {
  if (!sp.groupBy) return ['number'];
  const monthly = sp.groupBy === 'month';
  const opts = ['bar', 'line', 'area', 'table'];
  if (sp.splitBy) return [...opts, 'heatmap'];
  const single = sp.series.length === 1 && !sp.derived.length;
  if (sp.series.length + sp.derived.length >= 2) opts.push('combo');
  if (single) opts.push('pie');
  if (single && !monthly) opts.push('treemap', 'funnel');
  if (!monthly) opts.push('radar');
  if (sp.series.length >= 2 && !monthly) opts.push('scatter');
  if (single && ADDITIVE.includes(sp.series[0].agg) && !sp.window) opts.push('waterfall');
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

/** Shift a 'YYYY-MM' label by n months. */
export function shiftMonth(label, n) {
  const mm = /^(\d{4})-(\d{2})$/.exec(label || '');
  if (!mm) return null;
  const t = Number(mm[1]) * 12 + Number(mm[2]) - 1 + n;
  return `${Math.floor(t / 12)}-${String((t % 12) + 1).padStart(2, '0')}`;
}

const newAcc = () => ({ n: 0, cnt: 0, sum: 0, min: Infinity, max: -Infinity });
function addTo(a, b) {
  a.n += b.n;
  a.cnt += b.cnt;
  a.sum += b.sum;
  a.min = Math.min(a.min, b.min);
  a.max = Math.max(a.max, b.max);
  return a;
}
function finalize(a, agg) {
  if (!a) return null;
  if (agg === 'count') return a.n;
  if (!a.cnt) return null;
  return agg === 'avg' ? a.sum / a.cnt : agg === 'min' ? a.min : agg === 'max' ? a.max : a.sum;
}
const labelOf = (raw) => (raw === null || raw === undefined || raw === '' ? '(blank)' : String(raw));

/**
 * Aggregate each series within its own source, then join on groupBy.
 * Returns { labels, series[], derived[], extra[] } with values aligned to labels.
 * extra holds period comparisons and share of total, computed on the totals.
 */
/* ---------------- lakehouse series ---------------- */

/** Answers for lakehouse sources, keyed by request; filled by remote.js before compute() runs. */
export const remoteCache = new Map();

/** Thrown by compute() when a lakehouse series hasn't been fetched yet. */
export class PendingError extends Error {
  constructor(requests) {
    super('Waiting for the lakehouse');
    this.name = 'PendingError';
    this.requests = requests;
  }
}

export const requestKey = (req) => JSON.stringify(req);

/**
 * Row filters per series. Rolling windows and prior-period comparisons need
 * months outside a date filter, so month filters then apply to the result's
 * labels instead of the rows.
 */
function seriesFilters(sp, m) {
  const global = sp.filters || [];
  const deferMonths = Boolean(sp.compare || sp.window);
  const monthFilters = [];
  const perSeries = sp.series.map((s) => {
    const V = m.views[s.view];
    const all = [...s.filters, ...global.filter((f) => V.dims.includes(f.dim))];
    if (deferMonths && !monthFilters.length) monthFilters.push(...all.filter((f) => f.dim === 'month'));
    return deferMonths ? all.filter((f) => f.dim !== 'month') : all;
  });
  return { perSeries, monthFilters };
}

/** What the lakehouse needs for one series: its table, filters, breakdowns and the lookups they use. */
function seriesRequest(sp, m, s, rowFilters) {
  const V = m.views[s.view];
  const needed = new Set([sp.groupBy, sp.splitBy, ...rowFilters.map((f) => f.dim)].filter(Boolean));
  const byRel = new Map();
  for (const b of V.borrowed) {
    if (!needed.has(b.key)) continue;
    const target = m.byId[b.via.to.source];
    if (!byRel.has(b.via)) byRel.set(b.via, { from_col: b.via.from.col, table: target.lake.table, version: target.lake.version, to_col: b.via.to.col, dims: [] });
    byRel.get(b.via).dims.push(b.key);
  }
  return {
    table: V.table,
    version: V.version,
    measure: s.measure,
    filters: rowFilters,
    group_by: sp.groupBy,
    split_by: sp.splitBy,
    lookups: [...byRel.values()],
  };
}

/** Lakehouse requests a spec needs (empty when every source is in the browser). */
export function lakeRequests(sp, m) {
  const { perSeries } = seriesFilters(sp, m);
  return sp.series.map((s, i) => (m.views[s.view]?.remote ? seriesRequest(sp, m, s, perSeries[i]) : null)).filter(Boolean);
}

/**
 * Aggregate each series within its own source, then join on groupBy.
 * Returns { labels, series[], derived[], extra[] } with values aligned to labels.
 * extra holds period comparisons and share of total, computed on the totals.
 * Browser sources are aggregated from rows here; lakehouse sources arrive as the
 * same accumulators from the server, so everything after that is shared.
 */
export function compute(sp, m) {
  const { perSeries, monthFilters } = seriesFilters(sp, m);
  const missing = [];

  let parts = [];
  sp.series.forEach((s, si) => {
    const V = m.views[s.view];
    const rowFilters = perSeries[si];
    const unit = unitOf(m, s.view, s.measure, s.agg);
    let rowCount = 0;
    // split value ('' when not splitting) → group label → accumulator
    const bySplit = new Map();
    const accOf = (sk, g) => {
      if (!bySplit.has(sk)) bySplit.set(sk, new Map());
      const groups = bySplit.get(sk);
      if (!groups.has(g)) groups.set(g, newAcc());
      return groups.get(g);
    };

    if (V.remote) {
      const req = seriesRequest(sp, m, s, rowFilters);
      const hit = remoteCache.get(requestKey(req));
      if (!hit) {
        missing.push(req);
        return;
      }
      rowCount = hit.rows;
      for (const r of hit.groups) {
        const a = accOf(sp.splitBy ? r.s ?? '(blank)' : '', sp.groupBy ? r.g : 'All');
        addTo(a, { n: r.n, cnt: r.cnt, sum: r.sum || 0, min: r.min ?? Infinity, max: r.max ?? -Infinity });
      }
    } else {
      const rows = m.rowsOf(s.view).filter((x) => rowFilters.every((f) => pass(x[f.dim], f)));
      rowCount = rows.length;
      for (const x of rows) {
        const a = accOf(sp.splitBy ? labelOf(x[sp.splitBy]) : '', sp.groupBy ? labelOf(x[sp.groupBy]) : 'All');
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
      }
    }
    const base = { ...s, rows: rowCount, sys: V.sys, source: V.label, unit };

    if (!sp.splitBy) {
      parts.push({ ...base, groups: bySplit.get('') || new Map() });
      return;
    }
    // Split one series into one per value of splitBy: the biggest values, the rest as "Other".
    const ranked = [...bySplit.entries()].map(([k, groups]) => {
      const tot = [...groups.values()].reduce((acc, a) => addTo(acc, { ...a }), newAcc());
      // Rank split values by their total (or row count when the measure isn't additive).
      return { k, groups, rank: Math.abs(finalize(tot, ADDITIVE.includes(s.agg) ? s.agg : 'count') || 0) };
    }).sort((a, b) => b.rank - a.rank || a.k.localeCompare(b.k));
    const keep = ranked.slice(0, MAX_SPLIT);
    const rest = ranked.slice(MAX_SPLIT);
    keep.sort((a, b) => (a.k === '(blank)') - (b.k === '(blank)') || (sp.splitBy === 'month' ? a.k.localeCompare(b.k) : 0));
    keep.forEach((x) => parts.push({ ...base, label: x.k.slice(0, 40), split: x.k, groups: x.groups }));
    if (rest.length) {
      const other = new Map();
      rest.forEach((x) => x.groups.forEach((a, k) => other.set(k, addTo(other.get(k) || newAcc(), a))));
      parts.push({ ...base, label: `Other (${rest.length})`, split: null, groups: other });
    }
  });
  if (missing.length) throw new PendingError(missing);

  let labels = [...new Set(parts.flatMap((p) => [...p.groups.keys()]))];
  if (sp.groupBy === 'month' && sp.window) {
    // Rolling totals over the last N calendar months, recombining the raw totals (so averages stay correct).
    const months = labels.filter((l) => shiftMonth(l, 0));
    parts = parts.map((p) => {
      const rolled = new Map();
      for (const l of months) {
        const a = newAcc();
        for (let i = 0; i < sp.window; i++) {
          const g = p.groups.get(shiftMonth(l, -i));
          if (g) addTo(a, g);
        }
        rolled.set(l, a);
      }
      return { ...p, groups: rolled, label: `${p.label} (${sp.window}-mo rolling)` };
    });
  }

  const series = parts.map(({ groups, ...p }) => {
    const vals = {};
    groups.forEach((a, k) => { vals[k] = finalize(a, p.agg); });
    return { ...p, vals };
  });

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

  // The headline number: the first derived metric if any, else the first series.
  const head = derivedVals[0] || series[0];
  const extra = [];
  if (sp.compare) {
    const lag = COMPARE[sp.compare];
    const word = sp.compare === 'prior_year' ? 'prior year' : 'prior month';
    const prior = {};
    const change = {};
    for (const l of labels) {
      const p = head.vals[shiftMonth(l, -lag)];
      prior[l] = p ?? null;
      const v = head.vals[l];
      change[l] = p && v !== null && v !== undefined ? (v - p) / Math.abs(p) : null;
    }
    extra.push({ label: `${head.label}, ${word}`, unit: head.unit, vals: prior, kind: 'prior' });
    extra.push({ label: `Change vs ${word}`, unit: 'pct', vals: change, kind: 'change' });
  }

  if (monthFilters.length) labels = labels.filter((l) => monthFilters.every((f) => pass(l, f)));

  if (sp.share) {
    // Share of the total across every group shown or not (before the top-N cut).
    const base = derivedVals[0] && derivedVals[0].denominator === null ? derivedVals[0] : series[0];
    const total = labels.reduce((acc, l) => acc + (base.vals[l] || 0), 0);
    const vals = {};
    for (const l of labels) vals[l] = total ? (base.vals[l] || 0) / total : null;
    extra.push({ label: `Share of ${base.label.toLowerCase()}`, unit: 'pct', vals, kind: 'share' });
  }

  const key = head.vals;
  if (sp.groupBy === 'month' || sp.sort === 'label') labels.sort();
  else {
    labels.sort((a, b) => (key[b] ?? -Infinity) - (key[a] ?? -Infinity));
    if (sp.sort === 'asc') labels.reverse();
  }
  if (sp.groupBy !== 'month') labels = labels.slice(0, sp.limit);

  const align = ({ vals, ...c }) => ({ ...c, data: labels.map((l) => vals[l] ?? null) });
  return {
    labels,
    series: series.map(align),
    derived: derivedVals.map(align),
    extra: extra.map(align),
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
  return [...res.series, ...res.derived.map((d) => ({ ...d, derived: true })), ...(res.extra || []).map((e) => ({ ...e, derived: true }))];
}

/** Columns worth charting: derived metrics when present (units differ otherwise), plus a prior period to compare. */
export function chartColumns(res) {
  const base = res.derived.length ? res.derived.map((d) => ({ ...d, derived: true })) : res.series;
  const prior = (res.extra || []).filter((e) => e.kind === 'prior').map((e) => ({ ...e, derived: true }));
  return [...base, ...prior];
}

/* ---------------- SQL preview ---------------- */

export function toSQL(sp, m) {
  const opm = { eq: '=', neq: '<>', gte: '>=', lte: '<=' };
  const keys = [sp.groupBy, sp.splitBy].filter(Boolean);
  const one = (s, i) => {
    const V = m.views[s.view];
    const filters = [...s.filters, ...(sp.filters || []).filter((f) => V.dims.includes(f.dim))];
    const agg = s.agg === 'count' ? 'COUNT(*)' : `${s.agg.toUpperCase()}(${s.measure})`;
    const w = filters.length
      ? `\n  WHERE ${filters.map((f) => `${f.dim} ${opm[f.op]} '${f.value.replace(/'/g, "''")}'`).join('\n    AND ')}`
      : '';
    const lookups = V.borrowed.filter((b) => keys.includes(b.key) || filters.some((f) => f.dim === b.key));
    const via = [...new Set(lookups.map((b) => b.via))];
    const joins = via.map((r) => {
      const t = Object.values(m.views).find((x) => x.id === r.to.source);
      return `\n  LEFT JOIN ${t ? t.key : 'lookup'} USING (${r.from.col})   -- lookup in ${t ? t.sys : 'source'}`;
    }).join('');
    return `SELECT ${keys.length ? `${keys.join(', ')}, ` : ''}${agg} AS s${i + 1}\n  FROM ${s.view}   -- from ${V.sys}${joins}${w}${keys.length ? `\n  GROUP BY ${keys.join(', ')}` : ''}`;
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

  // Period comparisons, rolling windows and shares are window functions over the joined totals.
  const post = [];
  const headCol = derivedCols.length ? 'd1' : 's1';
  if (sp.window) post.push(`SUM(${headCol}) OVER (ORDER BY month ROWS BETWEEN ${sp.window - 1} PRECEDING AND CURRENT ROW) AS rolling_${sp.window}m   -- missing months count as 0`);
  if (sp.compare) {
    const lag = COMPARE[sp.compare];
    post.push(`LAG(${headCol}, ${lag}) OVER (ORDER BY month) AS prior   -- same month ${lag === 12 ? 'last year' : 'previous month'}`);
    post.push(`(${headCol} - prior) / ABS(NULLIF(prior, 0)) AS change_pct`);
  }
  if (sp.share) post.push(`s1 / NULLIF(SUM(s1) OVER (), 0) AS share_of_total`);
  const wrap = (sql) => (post.length ? `SELECT t.*,\n  ${post.join(',\n  ')}\nFROM (\n${sql.replace(/;$/, '')}\n) t;` : sql);
  const pivot = sp.splitBy ? `\n-- One column per ${sp.splitBy} (top ${MAX_SPLIT}, the rest as Other).` : '';

  if (sp.series.length === 1 && !derivedCols.length) return wrap(`${one(sp.series[0], 0)}${order};`) + pivot;

  const ctes = sp.series.map((s, i) => `s${i + 1} AS (\n  ${one(s, i).replace(/\n/g, '\n  ')}\n)`).join(',\n');
  const cols = [...sp.series.map((_, i) => `s${i + 1}`), ...derivedCols];
  if (!sp.groupBy) {
    return `-- Each source is aggregated first, then combined.\nWITH ${ctes}\nSELECT ${cols.join(', ')}\nFROM ${sp.series.map((_, i) => `s${i + 1}`).join(' CROSS JOIN ')};`;
  }
  const joins = sp.series.slice(1).map((_, i) => `\nFULL JOIN s${i + 2} USING (${sp.groupBy})`).join('');
  return wrap(`-- Each source is aggregated to ${sp.groupBy} first, then joined.\nWITH ${ctes}\nSELECT ${sp.groupBy}, ${cols.join(', ')}\nFROM s1${joins}${order};`);
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
  let splitBy = null;
  const by = ql.match(/\b(?:by|per|for each|across)\s+([a-z0-9_ ]+)/);
  if (by) {
    const allDims = [...new Set(views.flatMap((v) => v.dims))];
    // "by month and department", "by region split by product": the second one splits the series.
    const named = allDims.filter((d) => mentions(by[1], d) || (d === 'month' && /\bmonth(ly)?\b/.test(by[1]))).sort((a, b) => mentionAt(by[1], a) - mentionAt(by[1], b));
    [groupBy = null, splitBy = null] = named;
  }
  const compare = /year over year|\byoy\b|(?:vs|versus|against|compared (?:to|with)) (?:last|prior|previous) year/.test(ql) ? 'prior_year'
    : /month over month|\bmom\b|(?:vs|versus|against|compared (?:to|with)) (?:last|prior|previous) month/.test(ql) ? 'prior_period' : null;
  const roll = ql.match(/(?:rolling|trailing|moving)\s+(\d+|twelve|six|three)/);
  const window = roll ? ({ twelve: 12, six: 6, three: 3 }[roll[1]] || +roll[1]) : null;
  const share = /share of|% of total|percent(?:age)? of total|proportion|contribution/.test(ql);
  if ((compare || window) && groupBy && groupBy !== 'month') {
    splitBy = null;
    groupBy = 'month';
  }
  if (!groupBy && (compare || window || /trend|monthly|over time|each month|per month/.test(ql))) groupBy = 'month';

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
  const combine = !compare && /\bvs\b|versus|compare|against|\band\b/.test(ql.replace(by ? by[0] : '', ''));
  if (!combine) use = use.slice(0, 1);

  const count = /\bhow many\b|\bcount\b|\bnumber of\b|\bheadcount\b/.test(ql); // whole words: not "country" or "account"
  const agg = /average|avg|typical|mean/.test(ql) ? 'avg' : /highest|max/.test(ql) && !groupBy ? 'max' : 'sum';

  const series = use.slice(0, 3).map(({ v, ms }) => {
    const filters = [];
    // Filter on any known value the question names (e.g. "overdue", "Sales").
    for (const d of v.dims) {
      if (d === 'month' || d === groupBy || d === splitBy) continue;
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
    splitBy: series.length === 1 ? splitBy : null,
    compare,
    window,
    share,
    chart: /bubble|scatter/.test(ql) ? 'scatter' : /heat ?map/.test(ql) ? 'heatmap' : /waterfall|bridge/.test(ql) ? 'waterfall'
      : /tree ?map/.test(ql) ? 'treemap' : /funnel/.test(ql) ? 'funnel' : /radar|spider/.test(ql) ? 'radar'
        : /combo|bar and line|bars? with (?:a )?line/.test(ql) ? 'combo' : /\barea\b/.test(ql) ? 'area'
          : /\bpie\b/.test(ql) || (share && !/\bbar\b/.test(ql)) ? 'pie' : null,
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
  const change = (res.extra || []).find((e) => e.kind === 'change');
  const lastChange = change ? [...change.data].reverse().find((v) => v !== null) : null;
  if (lastChange !== null && lastChange !== undefined) {
    const i = change.data.lastIndexOf(lastChange);
    t += ` ${res.labels[i]} is ${lastChange >= 0 ? 'up' : 'down'} ${fmt(Math.abs(lastChange), 'pct')} ${change.label.replace(/^Change /, '')}.`;
  }
  if (res.labels.includes('(blank)')) t += ' Rows with no value for this breakdown are grouped as (blank); check the links between your sources if that group is large.';
  return t;
}

/**
 * A report without the AI: the chart the request itself describes, then the
 * most useful cross-source and single-source questions for this data.
 */
export function defaultReport(request, m, max = 6) {
  const specs = [];
  const seen = new Set();
  const add = (sp) => {
    if (!sp || sp.cannot || sp.clarify) return;
    const k = JSON.stringify([sp.groupBy, sp.splitBy, sp.series.map((s) => [s.view, s.measure, s.agg, s.filters])]);
    if (seen.has(k) || specs.length >= max) return;
    seen.add(k);
    specs.push(sp);
  };
  try { add(heuristic(request, m)); } catch { /* the request names nothing in the data */ }
  // Headline totals from the first sources with numbers.
  const kpis = Object.values(m.views).filter((v) => v.measures.length).slice(0, 3)
    .map((v) => ({ view: v.key, measure: v.measures[0], agg: 'sum', label: `${v.label}: ${pretty(v.measures[0])}` }));
  if (kpis.length) {
    try { add(sanitize({ title: 'Headline totals', groupBy: null, series: kpis }, m)); } catch { /* no numbers */ }
  }
  suggestQuestions(m).forEach((s) => add(s.spec));
  return specs;
}
