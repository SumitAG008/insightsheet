import { describe, it, expect } from 'vitest';
import { sanitize, compute, heuristic, fmt, suggestQuestions, buildCatalog, chartOptions as chartOptionsOf, distinctValues as distinctValuesOf } from './engine';
import { buildModel, profileColumns, sourceFromRows, suggestRelationships, toMonth, parseNumber } from './model';
import { buildSampleSources, sampleSuggestions } from './sampleData';
import { specToSql } from './sqlQuery';

const toSQL = (sp, m) => specToSql(sp, m).sql;

const sample = () => {
  const { sources, relationships } = buildSampleSources();
  return buildModel(sources, relationships);
};

describe('column profiling', () => {
  it('detects measures, dimensions, dates and money', () => {
    const rows = [
      { 'Emp ID': 'E1', Dept: 'Sales', 'Hire Date': '2024-03-01', 'Salary (£)': '£52,000', Year: '2024' },
      { 'Emp ID': 'E2', Dept: 'HR', 'Hire Date': '2023-11-15', 'Salary (£)': '£48,500', Year: '2023' },
    ];
    const cols = profileColumns(rows, Object.keys(rows[0]));
    const by = Object.fromEntries(cols.map((c) => [c.key, c]));
    expect(by.emp_id.role).toBe('dimension');
    expect(by.dept.role).toBe('dimension');
    expect(by.hire_date.type).toBe('date');
    expect(by.salary).toMatchObject({ type: 'number', role: 'measure', unit: 'money', currency: '£' });
    expect(by.year.role).toBe('dimension');
  });

  it('parses numbers and months in common formats', () => {
    expect(parseNumber('(1,200.50)')).toBe(-1200.5);
    expect(parseNumber('$3.4')).toBe(3.4);
    expect(parseNumber('abc')).toBeNull();
    expect(toMonth('2026-3-9')).toBe('2026-03');
    expect(toMonth('25/12/2025')).toBe('2025-12');
  });
});

describe('relationships', () => {
  it('suggests the expenses → employees lookup from real value overlap', () => {
    const { sources, relationships } = buildSampleSources();
    const exp = sources.find((s) => s.key === 'expenses');
    const emp = sources.find((s) => s.key === 'employees');
    expect(relationships).toContainEqual(expect.objectContaining({ from: { source: exp.id, col: 'employee_id' }, to: { source: emp.id, col: 'employee_id' } }));
  });

  it('does not suggest a lookup to a non-unique column', () => {
    const a = sourceFromRows('A', [{ team_id: 'x', v: 1 }, { team_id: 'y', v: 2 }], 'A', 'file');
    const b = sourceFromRows('B', [{ team_id: 'x', n: 1 }, { team_id: 'x', n: 2 }, { team_id: 'y', n: 3 }], 'B', 'file');
    expect(suggestRelationships([a, b]).filter((r) => r.to.source === b.id)).toHaveLength(0);
  });

  it('borrows department through the lookup so expenses break down by it', () => {
    const m = sample();
    expect(m.views.expenses.dims).toContain('department');
    const res = compute(sanitize({ groupBy: 'department', series: [{ view: 'expenses', measure: 'amount' }] }, m), m);
    expect(res.labels).toContain('Sales');
    expect(res.labels).not.toContain('(blank)');
  });
});

describe('engine', () => {
  it('drops views, measures and filters that are not in the model', () => {
    const m = sample();
    const sp = sanitize({
      groupBy: 'department',
      series: [
        { view: 'employees', measure: 'bogus', agg: 'sum', filters: [{ dim: 'nope', op: 'eq', value: 'x' }] },
        { view: 'not_a_view', measure: 'amount' },
      ],
    }, m);
    expect(sp.series).toHaveLength(1);
    expect(sp.series[0]).toMatchObject({ view: 'employees', measure: null, agg: 'count', filters: [] });
  });

  it('computes cost per head on aggregated totals, not row averages', () => {
    const m = sample();
    const sp = sanitize(sampleSuggestions(m)[0].spec, m);
    const res = compute(sp, m);
    const i = res.labels.indexOf('Sales');
    const [heads, salaries, expenses, spend] = res.series.map((s) => s.data[i]);
    const active = m.rowsOf('employees').filter((e) => e.department === 'Sales' && e.status === 'Active');
    expect(heads).toBe(active.length);
    expect(salaries).toBe(active.reduce((a, e) => a + e.salary, 0));
    expect(res.derived[0].data[i]).toBeCloseTo((salaries + expenses + spend) / heads, 6);
    expect(res.derived[0].unit).toBe('money');
  });

  it('joining sources does not inflate totals', () => {
    const m = sample();
    const one = compute(sanitize({ groupBy: 'department', series: [{ view: 'expenses', measure: 'amount' }] }, m), m);
    const two = compute(sanitize({ groupBy: 'department', series: [{ view: 'expenses', measure: 'amount' }, { view: 'employees', agg: 'count' }] }, m), m);
    for (const l of one.labels) expect(two.series[0].data[two.labels.indexOf(l)]).toBe(one.series[0].data[one.labels.indexOf(l)]);
  });

  it('reads plain questions against the user model', () => {
    const m = sample();
    const sp = heuristic('Invoices amount by customer for overdue', m);
    expect(sp.groupBy).toBe('customer');
    expect(sp.series[0]).toMatchObject({ view: 'invoices', measure: 'amount' });
    expect(sp.series[0].filters).toContainEqual({ dim: 'status', op: 'eq', value: 'Overdue' });
    expect(heuristic('Expenses by month', m).chart).toBe('line');
    expect(heuristic('Employees vs expenses by department', m).series.map((s) => s.view)).toEqual(['employees', 'expenses']);
  });

  it('works on any uploaded table', () => {
    const src = sourceFromRows('Stores', [
      { Store: 'Leeds', Region: 'North', Revenue: '1200', Opened: '2024-01-05' },
      { Store: 'York', Region: 'North', Revenue: '800', Opened: '2024-02-10' },
      { Store: 'Bath', Region: 'South', Revenue: '950', Opened: '2024-02-11' },
    ], 'Stores', 'file');
    const m = buildModel([src], []);
    const res = compute(heuristic('revenue by region', m), m);
    expect(res.labels).toEqual(['North', 'South']);
    expect(res.series[0].data).toEqual([2000, 950]);
    expect(suggestQuestions(m).length).toBeGreaterThan(0);
    expect(buildCatalog(m).views[0]).toMatchObject({ name: 'stores', dimensions: expect.arrayContaining(['region', 'month']) });
  });

  it('suggests cross-source questions on shared dimensions', () => {
    const m = sample();
    expect(m.shared).toEqual(expect.arrayContaining(['customer', 'department', 'month']));
    expect(suggestQuestions(m)[0].src).toContain('+');
  });

  it('emits aggregate-then-join SQL with the lookup and derived columns', () => {
    const m = sample();
    const sql = toSQL(sanitize(sampleSuggestions(m)[0].spec, m), m);
    expect(sql).toMatch(/LEFT JOIN \( -- one row per employee_id in Employees/);
    expect(sql).toMatch(/LEFT JOIN s4 AS x4 ON x4\.department = l\.department/);
    expect(sql).toMatch(/NULLIF\(COALESCE\(x1\.agg_value, 0\), 0\) AS "Cost per head"/);
  });

  it('passes through cannot and clarify answers', () => {
    const m = sample();
    expect(sanitize({ cannot: 'No link.' }, m)).toEqual({ cannot: 'No link.' });
    expect(sanitize({ clarify: 'Which cost?', options: ['Salaries only', 'Fully loaded'] }, m).options).toHaveLength(2);
  });

  it('formats units', () => {
    expect(fmt(118400, 'money', '£')).toBe('£118K');
    expect(fmt(0.123, 'pct')).toBe('12.3%');
    expect(fmt(null, 'money')).toBe('—');
    expect(fmt(12.345, 'number')).toBe('12.35');
  });
});

describe('real-world column names', () => {
  it('links emp_id to employee_id and borrows the department', () => {
    const hr = sourceFromRows('HR', [
      { 'Emp ID': 'EMP1', Dept: 'Sales' },
      { 'Emp ID': 'EMP2', Dept: 'HR' },
      { 'Emp ID': 'EMP3', Dept: 'Sales' },
    ], 'HR', 'file');
    const ex = sourceFromRows('Claims', [
      { 'Employee ID': 'EMP1', Amount: '10' },
      { 'Employee ID': 'EMP3', Amount: '5' },
      { 'Employee ID': 'EMP2', Amount: '7' },
    ], 'Concur', 'file');
    const rels = suggestRelationships([hr, ex]);
    expect(rels[0]).toMatchObject({ from: { source: ex.id, col: 'employee_id' }, to: { source: hr.id, col: 'emp_id' } });
    const m = buildModel([hr, ex], rels);
    const res = compute(heuristic('amount by dept', m), m);
    expect(Object.fromEntries(res.labels.map((l, i) => [l, res.series[0].data[i]]))).toEqual({ Sales: 15, HR: 7 });
  });
});

describe('filters, splits and period analysis', () => {
  const monthly = () => {
    const rows = [];
    ['2025-01', '2025-02', '2025-03', '2026-01', '2026-02', '2026-03'].forEach((mo, i) => {
      rows.push({ Date: `${mo}-10`, Region: 'North', Product: 'A', Revenue: String(100 + i * 10) });
      rows.push({ Date: `${mo}-15`, Region: 'South', Product: 'B', Revenue: String(50 + i) });
    });
    return buildModel([sourceFromRows('Sales', rows, 'Billing', 'file')], []);
  };

  it('applies answer-wide filters only to sources that have the column', () => {
    const m = sample();
    const sp = sanitize({ groupBy: 'department', filters: [{ dim: 'department', op: 'eq', value: 'Sales' }, { dim: 'nope', op: 'eq', value: 'x' }], series: [{ view: 'expenses', measure: 'amount' }, { view: 'employees', agg: 'count' }] }, m);
    expect(sp.filters).toEqual([{ dim: 'department', op: 'eq', value: 'Sales' }]);
    const res = compute(sp, m);
    expect(res.labels).toEqual(['Sales']);
    expect(toSQL(sp, m)).toMatch(/lower\(src\.department\) = 'sales'/);
  });

  it('splits one series by a second breakdown without changing the total', () => {
    const m = monthly();
    const sp = sanitize({ groupBy: 'month', splitBy: 'region', series: [{ view: 'sales', measure: 'revenue' }] }, m);
    expect(sp.splitBy).toBe('region');
    expect(chartOptionsOf(sp)).toContain('heatmap');
    const res = compute(sp, m);
    expect(res.series.map((s) => s.label)).toEqual(['North', 'South']);
    const plain = compute(sanitize({ groupBy: 'month', series: [{ view: 'sales', measure: 'revenue' }] }, m), m);
    res.labels.forEach((l, i) => expect(res.series[0].data[i] + res.series[1].data[i]).toBe(plain.series[0].data[i]));
    // Not allowed with two series or a derived metric.
    expect(sanitize({ groupBy: 'month', splitBy: 'region', series: [{ view: 'sales', measure: 'revenue' }, { view: 'sales', agg: 'count' }] }, m).splitBy).toBeNull();
  });

  it('keeps the biggest split values and folds the rest into Other', () => {
    const rows = Array.from({ length: 12 }, (_, i) => ({ Team: `T${i}`, Region: 'N', Cost: String(i + 1) }));
    const m = buildModel([sourceFromRows('Costs', rows, 'ERP', 'file')], []);
    const res = compute(sanitize({ groupBy: 'region', splitBy: 'team', series: [{ view: 'costs', measure: 'cost' }] }, m), m);
    expect(res.series).toHaveLength(9);
    expect(res.series[8]).toMatchObject({ label: 'Other (4)', data: [1 + 2 + 3 + 4] });
    expect(res.series.reduce((a, s) => a + s.data[0], 0)).toBe(78);
  });

  it('compares with the prior year even when the answer is filtered to this year', () => {
    const m = monthly();
    const sp = sanitize({ groupBy: 'month', compare: 'prior_year', filters: [{ dim: 'month', op: 'gte', value: '2026-01' }], series: [{ view: 'sales', measure: 'revenue' }] }, m);
    const res = compute(sp, m);
    expect(res.labels).toEqual(['2026-01', '2026-02', '2026-03']);
    const prior = res.extra.find((e) => e.kind === 'prior');
    const change = res.extra.find((e) => e.kind === 'change');
    expect(prior.data).toEqual([150, 161, 172]); // 2025: (100+50), (110+51), (120+52)
    expect(res.series[0].data[0]).toBe(130 + 53);
    expect(change.data[0]).toBeCloseTo((183 - 150) / 150, 6);
    expect(toSQL(sp, m)).toMatch(/LEFT JOIN t AS p ON p\.month_idx = t\.month_idx - 12/);
    // Comparisons need a monthly breakdown.
    expect(sanitize({ groupBy: 'region', compare: 'prior_year', series: [{ view: 'sales', measure: 'revenue' }] }, m).compare).toBeNull();
  });

  it('computes rolling windows over calendar months, including months before a date filter', () => {
    const m = monthly();
    const sp = sanitize({ groupBy: 'month', window: 3, filters: [{ dim: 'month', op: 'gte', value: '2026-01' }], series: [{ view: 'sales', measure: 'revenue', agg: 'avg' }] }, m);
    const res = compute(sp, m);
    // 2026-01 window = 2025-11..2026-01: only 2026-01 has data → average of its two rows.
    expect(res.series[0].data[0]).toBe((130 + 53) / 2);
    // 2026-03 window = 2026-01..03: average of six rows, not an average of monthly averages.
    expect(res.series[0].data[2]).toBeCloseTo((130 + 53 + 140 + 54 + 150 + 55) / 6, 6);
    expect(res.series[0].label).toMatch(/3-mo rolling/);
  });

  it('adds share of total computed before the top-N cut', () => {
    const m = sample();
    const sp = sanitize({ groupBy: 'customer', share: true, limit: 3, series: [{ view: 'invoices', measure: 'amount' }] }, m);
    const res = compute(sp, m);
    const all = compute(sanitize({ groupBy: 'customer', limit: 50, series: [{ view: 'invoices', measure: 'amount' }] }, m), m);
    const total = all.series[0].data.reduce((a, v) => a + (v || 0), 0);
    const share = res.extra.find((e) => e.kind === 'share');
    expect(res.labels).toHaveLength(3);
    expect(share.data[0]).toBeCloseTo(res.series[0].data[0] / total, 6);
  });

  it('offers waterfall only for additive single series', () => {
    const m = sample();
    expect(chartOptionsOf(sanitize({ groupBy: 'department', series: [{ view: 'expenses', measure: 'amount' }] }, m))).toContain('waterfall');
    expect(chartOptionsOf(sanitize({ groupBy: 'department', series: [{ view: 'employees', measure: 'salary', agg: 'avg' }] }, m))).not.toContain('waterfall');
    expect(sanitize({ groupBy: 'department', chart: 'waterfall', series: [{ view: 'employees', measure: 'salary', agg: 'avg' }] }, m).chart).toBe('bar');
  });

  it('reads comparisons, rolling windows, shares and second breakdowns from plain questions', () => {
    const m = monthly();
    expect(heuristic('Revenue this year vs last year', m)).toMatchObject({ groupBy: 'month', compare: 'prior_year' });
    expect(heuristic('rolling 12 revenue', m)).toMatchObject({ groupBy: 'month', window: 12 });
    expect(heuristic('revenue by month and region', m)).toMatchObject({ groupBy: 'month', splitBy: 'region' });
    expect(heuristic('share of revenue by region', m)).toMatchObject({ groupBy: 'region', share: true, chart: 'pie' });
    expect(heuristic('revenue by region by product heatmap', m)).toMatchObject({ splitBy: 'product', chart: 'heatmap' });
  });
});

describe('connector sources', () => {
  it('builds an API source and refreshes it keeping column choices', async () => {
    const { sourceFromTable, refreshSource } = await import('./model');
    const s = sourceFromTable('Workers', ['userId', 'department', 'salary'], [{ userId: 'E1', department: 'Sales', salary: 10 }], 'SuccessFactors', { type: 'api', url: 'https://x' }, 'api');
    expect(s).toMatchObject({ kind: 'api', system: 'SuccessFactors', origin: { type: 'api' } });
    const edited = { ...s, columns: s.columns.map((c) => (c.name === 'department' ? { ...c, key: 'dept' } : c)), rows: s.rows.map(({ department, ...r }) => ({ ...r, dept: department })) };
    const r = refreshSource(edited, ['userId', 'department', 'salary', 'grade'], [{ userId: 'E2', department: 'HR', salary: 20, grade: 'G1' }]);
    expect(r.id).toBe(s.id);
    expect(r.kind).toBe('api');
    expect(r.columns.map((c) => c.key)).toEqual(['userid', 'dept', 'salary', 'grade']);
    expect(r.rows).toEqual([{ userid: 'E2', dept: 'HR', salary: 20, grade: 'G1' }]);
  });
});

describe('lakehouse sources', () => {
  const lake = async () => {
    const { lakeSource, buildModel: bm } = await import('./model');
    const emp = lakeSource({ table: 'emp_1', version: '7', name: 'Employees', system: 'SuccessFactors', kind: 'file', row_count: 3,
      columns: [{ name: 'Emp ID', key: 'emp_id', type: 'text', role: 'dimension' }, { name: 'Department', key: 'department', type: 'text', role: 'dimension' }],
      values: { department: { top: ['Sales', 'HR'], distinct: 2 } } });
    const exp = lakeSource({ table: 'exp_1', version: '3', name: 'Expenses', system: 'Concur', row_count: 5, month_range: ['2026-01', '2026-03'],
      columns: [{ name: 'Employee ID', key: 'employee_id', type: 'text', role: 'dimension' }, { name: 'Amount', key: 'amount', type: 'number', role: 'measure', unit: 'money' },
        { name: 'Date', key: 'date', type: 'date', role: 'dimension' }] });
    const rel = { id: 'r1', from: { source: exp.id, col: 'employee_id' }, to: { source: emp.id, col: 'emp_id' } };
    return bm([emp, exp], [rel]);
  };

  it('asks the server for exactly what the spec needs, including lookups and deferred month filters', async () => {
    const { lakeRequests: reqs } = await import('./engine');
    const m = await lake();
    expect(m.views.expenses.dims).toEqual(expect.arrayContaining(['month', 'department']));
    expect(distinctValuesOf(m, 'expenses', 'department')).toEqual(['Sales', 'HR']);
    const sp = sanitize({ groupBy: 'month', window: 3, filters: [{ dim: 'month', op: 'gte', value: '2026-02' }, { dim: 'department', op: 'eq', value: 'Sales' }],
      series: [{ view: 'expenses', measure: 'amount' }] }, m);
    expect(reqs(sp, m)).toEqual([{
      table: 'exp_1', version: '3', measure: 'amount', group_by: 'month', split_by: null,
      filters: [{ dim: 'department', op: 'eq', value: 'Sales' }], // month filter applied to labels, not rows
      lookups: [{ from_col: 'employee_id', table: 'emp_1', version: '7', to_col: 'emp_id', dims: ['department'] }],
    }]);
    expect(buildCatalog(m).data_range).toBe('2026-01 to 2026-03');
  });

  it('computes from server accumulators exactly like from rows', async () => {
    const { lakeRequests: reqs, remoteCache, requestKey, PendingError } = await import('./engine');
    const m = await lake();
    const sp = sanitize({ groupBy: 'department', splitBy: 'month', series: [{ view: 'expenses', measure: 'amount', agg: 'avg' }] }, m);
    expect(() => compute(sp, m)).toThrow(PendingError);
    const [req] = reqs(sp, m);
    remoteCache.set(requestKey(req), { rows: 5, groups: [
      { g: 'Sales', s: '2026-01', n: 2, cnt: 2, sum: 30, min: 10, max: 20 },
      { g: 'HR', s: '2026-01', n: 1, cnt: 1, sum: 7, min: 7, max: 7 },
      { g: 'Sales', s: '2026-02', n: 1, cnt: 0, sum: 0, min: null, max: null },
      { g: '(blank)', s: null, n: 1, cnt: 1, sum: 100, min: 100, max: 100 },
    ] });
    const res = compute(sp, m);
    const col = (label) => res.series.find((x) => x.label === label);
    expect(res.series[0].rows).toBe(5);
    expect(col('2026-01').data[res.labels.indexOf('Sales')]).toBe(15); // avg recombined from sum / count
    expect(col('2026-02').data[res.labels.indexOf('Sales')]).toBeNull(); // no numbers → no value
    expect(col('(blank)').data[res.labels.indexOf('(blank)')]).toBe(100);
  });
});

describe('chart types', () => {
  it('offers and validates area, combo, treemap, funnel and radar by the shape of the answer', () => {
    const m = sample();
    const one = sanitize({ groupBy: 'department', series: [{ view: 'expenses', measure: 'amount' }] }, m);
    expect(chartOptionsOf(one)).toEqual(expect.arrayContaining(['area', 'treemap', 'funnel', 'radar', 'pie']));
    expect(chartOptionsOf(one)).not.toContain('combo');
    const two = sanitize({ groupBy: 'department', chart: 'combo', series: [{ view: 'expenses', measure: 'amount' }, { view: 'employees', agg: 'count' }] }, m);
    expect(two.chart).toBe('combo');
    expect(sanitize({ groupBy: 'month', chart: 'treemap', series: [{ view: 'expenses', measure: 'amount' }] }, m).chart).toBe('line');
    expect(sanitize({ groupBy: 'department', chart: 'combo', series: [{ view: 'expenses', measure: 'amount' }] }, m).chart).toBe('bar');
    expect(heuristic('expenses amount by category treemap', m).chart).toBe('treemap');
    expect(heuristic('opportunities by stage funnel', m).chart).toBe('funnel');
  });
});

describe('rules planner regressions', () => {
  it('does not read "country" or "account" as a request to count rows', () => {
    const src = sourceFromRows('Sales', [
      { Country: 'UK', Account: 'A1', Amount: '10' }, { Country: 'UK', Account: 'A2', Amount: '5' }, { Country: 'DE', Account: 'A3', Amount: '7' },
    ], 'Sales', 'file');
    const m = buildModel([src], []);
    expect(heuristic('amount by country', m).series[0]).toMatchObject({ measure: 'amount', agg: 'sum' });
    expect(heuristic('amount by account', m).series[0]).toMatchObject({ measure: 'amount', agg: 'sum' });
    expect(heuristic('count of sales by country', m).series[0]).toMatchObject({ measure: null, agg: 'count' });
    expect(heuristic('how many sales by country', m).series[0].agg).toBe('count');
  });

  it('builds a default report from a prompt without AI', async () => {
    const { defaultReport } = await import('./engine');
    const m = sample();
    const specs = defaultReport('expenses amount by department', m);
    expect(specs.length).toBeGreaterThanOrEqual(4);
    expect(specs[0]).toMatchObject({ groupBy: 'department', series: [expect.objectContaining({ view: 'expenses', measure: 'amount' })] });
    expect(specs.some((s) => s.chart === 'number')).toBe(true);
    expect(new Set(specs.map((s) => JSON.stringify([s.groupBy, s.series]))).size).toBe(specs.length);
  });
});

describe('cross-system suggestions', () => {
  it('pairs different systems before two tables of the same system', () => {
    const usage = sourceFromRows('software_usage', [{ package_name: 'a', seats: '3' }, { package_name: 'b', seats: '4' }], 'IT Finance DB', 'file');
    const inv = sourceFromRows('licence_invoices', [{ package_name: 'a', amount: '10' }, { package_name: 'b', amount: '5' }], 'IT Finance DB', 'file');
    const api = sourceFromRows('npm packages', [{ package_name: 'a', downloads: '100' }, { package_name: 'b', downloads: '9' }], 'npm registry', 'file');
    const m = buildModel([usage, inv, api], []);
    const cross = suggestQuestions(m).filter((x) => x.src.includes('+'));
    expect(cross[0].src).toMatch(/npm registry/);
    expect(new Set(cross.map((x) => x.src)).size).toBe(cross.length);
  });
});

describe('currency from column names', () => {
  it('reads £, GBP, USD in headers when values carry no symbol', async () => {
    const { currencyFromName } = await import('./model');
    expect(['Budget (£)', 'licence_cost_gbp', 'Cost USD', 'amount_eur', 'Amount'].map(currencyFromName)).toEqual(['£', '£', '$', '€', null]);
    const cols = profileColumns([{ 'Annual Budget (£)': '20000', amount_gbp: '5' }], ['Annual Budget (£)', 'amount_gbp']);
    expect(cols.map((c) => c.currency)).toEqual(['£', '£']);
  });
});

describe('named sources', () => {
  it('uses only the sources a question names, and labels each series by its source', () => {
    const mk = (name, rows) => sourceFromRows(name, rows, name, 'file');
    const m = buildModel([
      mk('expenses', [{ Date: '2026-01-05', Amount: '10' }]),
      mk('budget', [{ Month: '2026-01-01', Amount: '100' }]),
      mk('opportunities', [{ Close: '2026-01-09', Amount: '5000' }]),
    ], []);
    const sp = heuristic('expenses amount vs budget amount by month', m);
    expect(sp.series.map((s) => s.view)).toEqual(['expenses', 'budget']);
    expect(sp.series.map((s) => s.label)).toEqual(['expenses: amount', 'budget: amount']);
  });
});
