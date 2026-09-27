import { describe, it, expect } from 'vitest';
import { sanitize, compute, heuristic, presetFor, toSQL, fmt, rowsOf } from './engine';

describe('unified reporting engine', () => {
  it('drops views, measures and filters that are not in the model', () => {
    const sp = sanitize({
      groupBy: 'department',
      series: [
        { view: 'employees', measure: 'bogus', agg: 'sum', filters: [{ dim: 'nope', op: 'eq', value: 'x' }] },
        { view: 'not_a_view', measure: 'amount' },
      ],
    });
    expect(sp.series).toHaveLength(1);
    expect(sp.series[0]).toMatchObject({ view: 'employees', measure: null, agg: 'count', filters: [] });
  });

  it('keeps only series that can join on the shared dimension', () => {
    const sp = sanitize({
      groupBy: 'department',
      series: [{ view: 'invoices', measure: 'amount' }, { view: 'expenses', measure: 'amount' }],
    });
    expect(sp.series.map((s) => s.view)).toEqual(['expenses']);
  });

  it('computes cost per head on aggregated totals, not row averages', () => {
    const sp = presetFor('Cost per employee by department');
    const res = compute(sp);
    const i = res.labels.indexOf('Sales');
    expect(i).toBeGreaterThanOrEqual(0);

    const [heads, salaries, expenses, spend] = res.series.map((s) => s.data[i]);
    const activeSales = rowsOf('employees').filter((e) => e.department === 'Sales' && e.status === 'Active');
    expect(heads).toBe(activeSales.length);
    expect(salaries).toBe(activeSales.reduce((a, e) => a + e.salary, 0));
    expect(res.derived[0].data[i]).toBeCloseTo((salaries + expenses + spend) / heads, 6);
    expect(res.derived[0].unit).toBe('money');
  });

  it('joining systems does not inflate totals', () => {
    const one = compute(sanitize({ groupBy: 'department', series: [{ view: 'expenses', measure: 'amount', agg: 'sum' }] }));
    const two = compute(sanitize({
      groupBy: 'department',
      series: [{ view: 'expenses', measure: 'amount', agg: 'sum' }, { view: 'employees', agg: 'count' }],
    }));
    for (const l of one.labels) {
      expect(two.series[0].data[two.labels.indexOf(l)]).toBe(one.series[0].data[one.labels.indexOf(l)]);
    }
  });

  it('merges a matched customer only after the decision', () => {
    const sp = sanitize({ groupBy: 'customer', limit: 25, series: [{ view: 'invoices', measure: 'amount' }] });
    expect(compute(sp).labels).toContain('British Telecommunications plc');
    const merged = compute(sp, { m1: 'yes' });
    expect(merged.labels).not.toContain('British Telecommunications plc');
    expect(merged.labels).toContain('BT Group');
  });

  it('builds a bubble chart spec for x vs y vs z', () => {
    const sp = presetFor('Customers: invoiced vs days overdue, sized by pipeline');
    expect(sp.chart).toBe('scatter');
    expect(sp.series).toHaveLength(3);
  });

  it('falls back from scatter when there is only one series', () => {
    expect(sanitize({ groupBy: 'customer', chart: 'scatter', series: [{ view: 'orders', measure: 'amount' }] }).chart).toBe('bar');
  });

  it('reads plain questions with rules when AI is off', () => {
    const sp = heuristic('Headcount vs expenses by department');
    expect(sp.groupBy).toBe('department');
    expect(sp.series.map((s) => s.view)).toEqual(['employees', 'expenses']);
    expect(heuristic('Invoiced amount by month').chart).toBe('line');
  });

  it('passes through cannot and clarify answers', () => {
    expect(sanitize({ cannot: 'No link between expenses and customers.' })).toEqual({ cannot: 'No link between expenses and customers.' });
    expect(sanitize({ clarify: 'Which cost?', options: ['Salaries only', 'Fully loaded'] }).options).toHaveLength(2);
  });

  it('emits aggregate-then-join SQL with derived columns', () => {
    const sql = toSQL(presetFor('Cost per employee by department'));
    expect(sql).toMatch(/GROUP BY department/);
    expect(sql).toMatch(/FULL JOIN s4 USING \(department\)/);
    expect(sql).toMatch(/NULLIF\(s1, 0\) AS d1/);
  });

  it('formats units', () => {
    expect(fmt(118400, 'money')).toBe('£118K');
    expect(fmt(0.123, 'pct')).toBe('12.3%');
    expect(fmt(null, 'money')).toBe('—');
  });
});
