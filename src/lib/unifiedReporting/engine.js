/**
 * Unified Reporting engine.
 *
 * The AI never writes SQL or formulas. It returns a query *spec* that picks
 * views, measures, filters and one shared dimension; this engine validates it
 * and enforces the rules that make cross-system numbers correct:
 *   1. Each series is aggregated inside its own system first.
 *   2. Only then are series joined, on the shared dimension (groupBy).
 *   3. Derived metrics (ratios such as cost per head) are computed on the
 *      aggregated totals, never averaged row by row.
 */
import { DATA, GOLD, PENDING, VIEWS, TODAY, PERSONAS } from './sampleData';

export const AGG = ['sum', 'count', 'avg', 'min', 'max'];
export const OPS = ['eq', 'neq', 'gte', 'lte'];
export const CHARTS = ['bar', 'line', 'pie', 'scatter', 'table', 'number'];
const MAX_SERIES = 4;
const MAX_DERIVED = 2;

/* ---------------- data access ---------------- */

function resolveCustomer(src, decisions) {
  const p = PENDING.find((x) => x.src === src);
  if (p) {
    if (decisions[p.id] === 'yes') {
      return { customer: p.golden, region: GOLD[p.golden].region, industry: GOLD[p.golden].industry };
    }
    return { customer: src, region: 'Unmatched', industry: 'Unmatched' };
  }
  const g = GOLD[src];
  return { customer: src, region: g ? g.region : 'Unmatched', industry: g ? g.industry : 'Unmatched' };
}

export function rowsOf(view, decisions = {}) {
  switch (view) {
    case 'invoices':
      return DATA.invoices.map((x) => ({ ...x, ...resolveCustomer(x.source_customer, decisions), month: x.date.slice(0, 7) }));
    case 'pipeline':
      return DATA.pipeline.map((x) => ({ ...x, ...resolveCustomer(x.source_customer, decisions), month: x.close_month }));
    case 'employees':
      return DATA.employees.map((x) => ({ ...x, month: x.hire_date.slice(0, 7) }));
    default:
      return (DATA[view] || []).map((x) => ({ ...x, month: x.date.slice(0, 7) }));
  }
}

export function distinctValues(view, dim, limit = 14) {
  return [...new Set(rowsOf(view).map((x) => x[dim]))].slice(0, limit);
}

/** Catalog sent to the backend planner: metadata only, never rows. */
export function buildCatalog() {
  const known = [
    'status@invoices', 'stage@pipeline', 'region@orders', 'industry@orders', 'product_line@orders',
    'department@employees', 'country@employees', 'level@employees', 'category@expenses', 'category@spend', 'supplier@spend',
  ].map((x) => {
    const [d, v] = x.split('@');
    return `${d} (${v}): ${distinctValues(v, d).join(', ')}`;
  });
  return {
    today: TODAY,
    data_range: '2025-10 to 2026-09',
    currency: 'GBP',
    views: Object.entries(VIEWS).map(([name, V]) => ({ name, system: V.sys, description: V.desc, dimensions: V.dims, measures: V.measures })),
    customers: Object.keys(GOLD),
    known_values: known,
    notes: [
      'yes/no dimensions (in_policy, on_contract) use "Yes" or "No".',
      'Employee status is "Active" or "Left".',
      '"This year" means month gte "2026-01".',
    ],
  };
}

/* ---------------- spec validation ---------------- */

const unitOf = (measure, agg) => {
  if (agg === 'count' || !measure) return 'count';
  if (measure === 'amount' || measure === 'salary') return 'money';
  if (measure === 'days_overdue') return 'days';
  return 'count';
};

/**
 * Validate and normalise a spec from the AI, the rules fallback, or the
 * builder's edit box. Anything not in the model is dropped, never guessed.
 */
export function sanitize(sp) {
  if (!sp || typeof sp !== 'object') throw new Error('empty spec');
  if (sp.cannot) return { cannot: String(sp.cannot).slice(0, 300) };
  if (sp.clarify) {
    const options = (Array.isArray(sp.options) ? sp.options : []).map(String).filter(Boolean).slice(0, 4);
    if (options.length >= 2) return { clarify: String(sp.clarify).slice(0, 200), options };
  }

  let series = (Array.isArray(sp.series) ? sp.series : [])
    .filter((s) => s && VIEWS[s.view])
    .slice(0, MAX_SERIES)
    .map((s) => {
      const V = VIEWS[s.view];
      const measure = V.measures.includes(s.measure) ? s.measure : null;
      let agg = AGG.includes(s.agg) ? s.agg : measure ? 'sum' : 'count';
      if (!measure) agg = 'count';
      const filters = (Array.isArray(s.filters) ? s.filters : [])
        .filter((f) => f && V.dims.includes(f.dim) && OPS.includes(f.op))
        .map((f) => ({ dim: f.dim, op: f.op, value: String(f.value ?? '') }));
      return { view: s.view, measure: agg === 'count' ? null : measure, agg, filters, label: String(s.label || V.label).slice(0, 40) };
    });
  if (!series.length) throw new Error('no series');

  let groupBy = null;
  if (sp.groupBy) {
    // A series can only join on a dimension its system actually has.
    const ok = series.filter((s) => VIEWS[s.view].dims.includes(sp.groupBy));
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
    limit: Math.min(25, Math.max(3, parseInt(sp.limit, 10) || 10)),
    followups: (Array.isArray(sp.followups) ? sp.followups : []).map(String).filter(Boolean).slice(0, 3),
  };
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
  const numUnit = numUnits.every((u) => u === numUnits[0]) ? numUnits[0] : 'count';
  if (d.denominator === null) return numUnit;
  const denUnit = series[d.denominator].unit;
  if (denUnit === numUnit) return 'pct';
  return numUnit;
}

/**
 * Aggregate each series within its own system, then join on groupBy.
 * Returns { labels, series[], derived[] } with values aligned to labels.
 */
export function compute(sp, decisions = {}) {
  const out = sp.series.map((s) => {
    const rows = rowsOf(s.view, decisions).filter((x) => s.filters.every((f) => pass(x[f.dim], f)));
    const groups = new Map();
    for (const x of rows) {
      const k = sp.groupBy ? String(x[sp.groupBy] ?? '(blank)') : 'All';
      const a = groups.get(k) || { n: 0, sum: 0, min: Infinity, max: -Infinity };
      a.n++;
      if (s.measure) {
        const v = +x[s.measure] || 0;
        a.sum += v;
        a.min = Math.min(a.min, v);
        a.max = Math.max(a.max, v);
      }
      groups.set(k, a);
    }
    const vals = {};
    groups.forEach((a, k) => {
      vals[k] = s.agg === 'count' ? a.n : s.agg === 'avg' ? a.sum / a.n : s.agg === 'min' ? a.min : s.agg === 'max' ? a.max : a.sum;
    });
    return { s, vals, rows: rows.length };
  });

  let labels = [...new Set(out.flatMap((o) => Object.keys(o.vals)))];
  const series = out.map((o) => ({ ...o.s, vals: o.vals, rows: o.rows, sys: VIEWS[o.s.view].sys, unit: unitOf(o.s.measure, o.s.agg) }));

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
    labels.sort((a, b) => (key[b] || 0) - (key[a] || 0));
    if (sp.sort === 'asc') labels.reverse();
  }
  if (sp.groupBy !== 'month') labels = labels.slice(0, sp.limit);

  return {
    labels,
    series: series.map(({ vals, ...s }) => ({ ...s, data: labels.map((l) => vals[l] || 0) })),
    derived: derivedVals.map(({ vals, ...d }) => ({ ...d, data: labels.map((l) => vals[l]) })),
  };
}

/* ---------------- formatting ---------------- */

export function fmt(v, unit) {
  if (v === null || v === undefined || Number.isNaN(v)) return '—';
  if (unit === 'money') {
    const a = Math.abs(v);
    if (a >= 1e6) return `£${(v / 1e6).toFixed(a >= 1e7 ? 0 : 1)}M`;
    if (a >= 1e4) return `£${Math.round(v / 1e3)}K`;
    if (a >= 1e3) return `£${(v / 1e3).toFixed(1)}K`;
    return `£${Math.round(v)}`;
  }
  if (unit === 'days') return `${Math.round(v)} days`;
  if (unit === 'pct') return `${(v * 100).toFixed(1)}%`;
  return Math.round(v).toLocaleString();
}

/** Every column of a result, raw series first then derived metrics. */
export function columnsOf(res) {
  return [...res.series, ...res.derived.map((d) => ({ ...d, derived: true }))];
}

/** Columns worth charting: derived metrics when present (units differ otherwise). */
export function chartColumns(res) {
  return res.derived.length ? res.derived.map((d) => ({ ...d, derived: true })) : res.series;
}

export function usesCustomer(sp) {
  return (
    sp.groupBy === 'customer' ||
    (sp.groupBy && ['region', 'industry'].includes(sp.groupBy)) ||
    sp.series.some((s) => s.filters.some((f) => ['customer', 'region', 'industry'].includes(f.dim)))
  );
}

/* ---------------- SQL preview ---------------- */

export function toSQL(sp) {
  const opm = { eq: '=', neq: '<>', gte: '>=', lte: '<=' };
  const one = (s, i) => {
    const m = s.agg === 'count' ? 'COUNT(*)' : `${s.agg.toUpperCase()}(${s.measure})`;
    const w = s.filters.length
      ? `\n  WHERE ${s.filters.map((f) => `${f.dim} ${opm[f.op]} '${f.value.replace(/'/g, "''")}'`).join('\n    AND ')}`
      : '';
    return `SELECT ${sp.groupBy ? `${sp.groupBy}, ` : ''}${m} AS s${i + 1}\n  FROM meldra.${s.view}   -- from ${VIEWS[s.view].sys}${w}${sp.groupBy ? `\n  GROUP BY ${sp.groupBy}` : ''}`;
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
    return `-- Each system is aggregated first, then combined.\nWITH ${ctes}\nSELECT ${cols.join(', ')}\nFROM ${sp.series.map((_, i) => `s${i + 1}`).join(' CROSS JOIN ')};`;
  }
  const joins = sp.series.slice(1).map((_, i) => `\nFULL JOIN s${i + 2} USING (${sp.groupBy})`).join('');
  return `-- Each system is aggregated to ${sp.groupBy} first, then joined.\nWITH ${ctes}\nSELECT ${sp.groupBy}, ${cols.join(', ')}\nFROM s1${joins}${order};`;
}

/* ---------------- rules fallback (no AI) ---------------- */

const ACTIVE = { dim: 'status', op: 'eq', value: 'Active' };
const THIS_YEAR = { dim: 'month', op: 'gte', value: '2026-01' };

/** Hand-built specs for the suggested questions, so demos never depend on AI. */
const PRESETS = {
  'cost per employee by department': {
    title: 'Cost per employee by department',
    groupBy: 'department',
    chart: 'bar',
    series: [
      { view: 'employees', measure: null, agg: 'count', filters: [ACTIVE], label: 'Headcount' },
      { view: 'employees', measure: 'salary', agg: 'sum', filters: [ACTIVE], label: 'Salaries' },
      { view: 'expenses', measure: 'amount', agg: 'sum', filters: [THIS_YEAR], label: 'Expenses' },
      { view: 'spend', measure: 'amount', agg: 'sum', filters: [THIS_YEAR], label: 'Supplier spend' },
    ],
    derived: [{ label: 'Cost per head', numerator: [1, 2, 3], denominator: 0 }],
    followups: ['Headcount vs expenses by department', 'Out-of-policy expenses by department', 'Average salary by level'],
  },
  'customers: invoiced vs days overdue, sized by pipeline': {
    title: 'Customers: invoiced vs days overdue, sized by pipeline',
    groupBy: 'customer',
    chart: 'scatter',
    series: [
      { view: 'invoices', measure: 'amount', agg: 'sum', filters: [], label: 'Invoiced' },
      { view: 'invoices', measure: 'days_overdue', agg: 'avg', filters: [{ dim: 'status', op: 'eq', value: 'Overdue' }], label: 'Avg days overdue' },
      { view: 'pipeline', measure: 'amount', agg: 'sum', filters: [{ dim: 'stage', op: 'neq', value: 'Closed won' }, { dim: 'stage', op: 'neq', value: 'Closed lost' }], label: 'Open pipeline' },
    ],
    followups: ['Which customers have overdue invoices?', 'Open pipeline by owner', 'Ordered vs invoiced by customer'],
  },
};

/** Spec for a suggested question or the flagship cost-per-head example, else null. */
export function presetFor(q) {
  const ql = String(q).toLowerCase().trim().replace(/\?$/, '');
  if (PRESETS[ql]) return sanitize(PRESETS[ql]);
  if (/cost per (head|employee)|per.?head cost|fully loaded/.test(ql)) return sanitize(PRESETS['cost per employee by department']);
  return null;
}

export function heuristic(q) {
  const preset = presetFor(q);
  if (preset) return preset;
  const ql = q.toLowerCase().trim().replace(/\?$/, '');

  const POS = {
    invoices: /invoice|revenue|billed|overdue|paid|owe/,
    orders: /order/,
    pipeline: /pipeline|opportunit|deal/,
    employees: /headcount|employee|staff|hire|people|salar/,
    expenses: /expense|travel|claim|hotel|meal/,
    spend: /spend|supplier|procure|purchase|contract|vendor/,
  };
  const vs = Object.keys(POS).filter((v) => POS[v].test(ql));
  if (!vs.length) vs.push('invoices');
  vs.sort((a, b) => {
    const ia = ql.search(POS[a]);
    const ib = ql.search(POS[b]);
    return (ia < 0 ? 1e9 : ia) - (ib < 0 ? 1e9 : ib);
  });

  const W = {
    customer: 'customer', customers: 'customer', client: 'customer', clients: 'customer', region: 'region', regions: 'region',
    industry: 'industry', product: 'product_line', products: 'product_line', stage: 'stage', owner: 'owner', rep: 'owner',
    department: 'department', departments: 'department', team: 'department', country: 'country', level: 'level',
    category: 'category', supplier: 'supplier', suppliers: 'supplier', vendor: 'supplier', month: 'month', status: 'status',
  };
  let g = null;
  const by = ql.match(/\b(?:by|per|for each) ([a-z_ ]+)/);
  if (by) {
    for (const w of by[1].split(/\s+/)) {
      if (W[w]) {
        g = W[w];
        break;
      }
    }
  }
  if (!g && /trend|monthly|over time|each month/.test(ql)) g = 'month';
  if (!g && /which customers|top .*customers/.test(ql)) g = 'customer';
  if (!g && /which suppliers|supplier/.test(ql)) g = 'supplier';

  let use = vs.filter((v) => !g || VIEWS[v].dims.includes(g));
  if (!use.length) {
    use = [vs[0]];
    g = null;
  }
  if (!/\bvs\b|versus|compare|against| and /.test(ql)) use = use.slice(0, 1);

  const series = use.slice(0, 3).map((v) => {
    const f = [];
    if (v === 'invoices' && /overdue|late|owe/.test(ql)) f.push({ dim: 'status', op: 'eq', value: 'Overdue' });
    if (v === 'spend' && /off.?contract/.test(ql)) f.push({ dim: 'on_contract', op: 'eq', value: 'No' });
    if (v === 'expenses' && /out of policy|policy/.test(ql)) f.push({ dim: 'in_policy', op: 'eq', value: 'No' });
    if (v === 'expenses' && /travel/.test(ql)) f.push({ dim: 'category', op: 'eq', value: 'Travel' });
    if (v === 'pipeline' && /open/.test(ql)) f.push({ dim: 'stage', op: 'neq', value: 'Closed won' }, { dim: 'stage', op: 'neq', value: 'Closed lost' });
    if (v === 'employees') f.push(ACTIVE);
    if (/this year/.test(ql) && v !== 'employees') f.push(THIS_YEAR);
    const cnt = v === 'employees' && !/salar|pay/.test(ql);
    return {
      view: v,
      measure: cnt ? null : v === 'employees' ? 'salary' : 'amount',
      agg: cnt ? 'count' : /average|avg|typical/.test(ql) ? 'avg' : 'sum',
      filters: f,
      label: cnt ? 'Headcount' : VIEWS[v].label,
    };
  });
  const lim = ql.match(/top (\d+)/);
  return sanitize({
    title: q.replace(/\?$/, '').replace(/^./, (c) => c.toUpperCase()),
    groupBy: g,
    chart: /bubble|scatter/.test(ql) ? 'scatter' : null,
    series,
    sort: 'desc',
    limit: lim ? +lim[1] : 10,
    followups: [],
  });
}

export function fallbackInsight(sp, res) {
  const cols = chartColumns(res);
  const c0 = cols[0];
  if (!res.labels.length) return 'Nothing matched this question in the connected data.';
  if (!sp.groupBy) return `${columnsOf(res).map((s) => `${s.label}: ${fmt(s.data[0], s.unit)}`).join('. ')}.`;
  const idx = c0.data.map((v, i) => [v ?? 0, i]).sort((a, b) => b[0] - a[0]);
  const top = res.labels[idx[0][1]];
  const low = res.labels[idx[idx.length - 1][1]];
  let t = `${top} is highest on ${c0.label.toLowerCase()} at ${fmt(idx[0][0], c0.unit)}`;
  if (res.labels.length > 1) t += `, and ${low} is lowest at ${fmt(idx[idx.length - 1][0], c0.unit)}`;
  t += '.';
  if (res.labels.includes('British Telecommunications plc') || res.labels.includes('VW Group UK')) {
    t += ' Some records are shown under their source name because a match still needs your decision.';
  }
  return t;
}

export function fallbackFollowups(sp) {
  const v = sp.series[0].view;
  return {
    invoices: ['Which customers have overdue invoices?', 'Ordered vs invoiced by customer', 'Invoiced amount by month'],
    orders: ['Orders by product line this year', 'Ordered vs invoiced by customer', 'Orders by region'],
    pipeline: ['Open pipeline by owner', 'Pipeline by customer', 'Pipeline by close month'],
    employees: ['Cost per employee by department', 'Headcount by country', 'Average salary by level'],
    expenses: ['Out-of-policy expenses by department', 'Expenses by category', 'Expenses by month'],
    spend: ['Off-contract spend by supplier', 'Spend by department', 'Spend by month'],
  }[v];
}

export { PERSONAS };
