import { describe, it, expect } from 'vitest';
import { sanitize, compute, heuristic, toSQL, fmt, suggestQuestions, buildCatalog } from './engine';
import { buildModel, profileColumns, sourceFromRows, suggestRelationships, toMonth, parseNumber } from './model';
import { buildSampleSources, sampleSuggestions } from './sampleData';

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
    expect(sql).toMatch(/LEFT JOIN employees USING \(employee_id\)/);
    expect(sql).toMatch(/FULL JOIN s4 USING \(department\)/);
    expect(sql).toMatch(/NULLIF\(s1, 0\) AS d1/);
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
