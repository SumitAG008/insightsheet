import { beforeAll, describe, expect, it } from 'vitest';
import initSqlJs from 'sql.js';
import { columnsOf, compute, sanitize, sqlResults } from './engine';
import { buildModel, sourceFromRows } from './model';
import { buildSampleSources, sampleSuggestions } from './sampleData';
import { SQL_CASES } from './sqlCases';
import { checkSql, runSql, specToSql, sqlToResult, tableColumns } from './sqlQuery';

let SQL;
beforeAll(async () => { SQL = await initSqlJs(); });

const sample = () => {
  const { sources, relationships } = buildSampleSources();
  return buildModel(sources, relationships);
};

const close = (a, b) => (a === null || a === undefined ? b === null || b === undefined : Math.abs(a - b) <= 1e-6 * Math.max(1, Math.abs(b)));

/** The generated SQL, run in SQLite, gives exactly what compute() gives. */
async function sameNumbers(raw, m) {
  const sp = sanitize(raw, m);
  const want = compute(sp, m);
  const { sql, meta } = specToSql(sp, m);
  const got = sqlToResult(await runSql(sql, m, { SQL }), meta, m.currency);
  expect(got.labels, sql).toEqual(want.labels);
  const wantCols = columnsOf(want);
  const gotCols = columnsOf(got);
  expect(gotCols.map((c) => c.label).sort(), sql).toEqual(wantCols.map((c) => c.label).sort());
  for (const w of wantCols) {
    const g = gotCols.find((c) => c.label === w.label);
    expect(g.unit, w.label).toBe(w.unit);
    w.data.forEach((v, i) => expect(close(g.data[i], v), `${w.label} @ ${want.labels[i]}: SQL ${g.data[i]} vs engine ${v}\n${sql}`).toBe(true));
  }
  return { sp, sql, want };
}

describe('SQL gives the same numbers as the engine', () => {
  for (const [name, spec] of Object.entries(SQL_CASES)) {
    it(name, async () => { await sameNumbers({ title: name, ...spec }, sample()); });
  }

  it('for every showcase question', async () => {
    const m = sample();
    for (const s of sampleSuggestions(m)) await sameNumbers(s.spec, m);
  });

  it('for the headline cost-per-head answer, and shows the lookup as a LEFT JOIN', async () => {
    const m = sample();
    const { sql } = await sameNumbers(sampleSuggestions(m)[0].spec, m);
    expect(sql).toMatch(/LEFT JOIN \( -- one row per employee_id in Employees \(SuccessFactors\)/);
    expect(sql).toMatch(/Each source is totalled on its own first, then joined on department/);
  });
});

describe('running SQL', () => {
  it('lists each source table with its columns, numbers and month', () => {
    const m = sample();
    const cols = tableColumns(m, 'expenses');
    expect(cols.find((c) => c.key === 'amount').type).toBe('number');
    expect(cols.find((c) => c.key === 'month').derived).toBe(true);
    expect(cols.some((c) => c.key === 'department')).toBe(false); // looked up, not its own
  });

  it('runs an edited query and reads text columns as labels and numbers as series', async () => {
    const m = sample();
    const out = await runSql('SELECT region, COUNT(*) AS orders, SUM(amount) AS order_value FROM sales_orders GROUP BY region ORDER BY 2 DESC', m, { SQL });
    const res = sqlToResult(out, null, '£');
    expect(res.labelName).toBe('region');
    expect(res.series.map((s) => [s.label, s.unit])).toEqual([['orders', 'number'], ['order_value', 'money']]);
    const want = compute(sanitize({ groupBy: 'region', series: [{ view: 'sales_orders', agg: 'count' }] }, m), m);
    res.labels.forEach((l, i) => expect(res.series[0].data[i]).toBe(want.series[0].data[want.labels.indexOf(l)]));
  });

  it('pivots [label, split, value] into one series per split value', async () => {
    const m = sample();
    const res = sqlToResult(await runSql('select region, product_line, sum(amount) as v from sales_orders group by 1, 2', m, { SQL }), null, '');
    expect(res.series.length).toBe(new Set(m.rowsOf('sales_orders').map((r) => r.product_line)).size);
  });

  it('refuses anything but one SELECT, and the data cannot be changed', async () => {
    const m = sample();
    expect(() => checkSql('DELETE FROM sales_orders')).toThrow(/Only SELECT/);
    expect(() => checkSql('select 1; drop table sales_orders')).toThrow(/one query/);
    expect(checkSql("select ';' as x;  ")).toBe("select ';' as x");
    await expect(runSql('WITH x AS (DELETE FROM sales_orders RETURNING *) SELECT * FROM x', m, { SQL })).rejects.toThrow();
    const after = await runSql('select count(*) from sales_orders', m, { SQL });
    expect(after.rows[0][0]).toBe(m.rowsOf('sales_orders').length);
    await expect(runSql('select * from nothing_here', m, { SQL })).rejects.toThrow(/Name one of your sources/);
  });

  it('sends lakehouse-only queries to the lakehouse and refuses mixing places', async () => {
    const m = sample();
    const lake = { ...m, views: { ...m.views, invoices: { ...m.views.invoices, remote: true, table: 't_inv' } } };
    let sent;
    const out = await runSql('select customer, sum(amount) from invoices group by 1', lake, { SQL, remoteRun: async (b) => { sent = b; return { columns: ['customer', 's'], rows: [['A', 1]] }; } });
    expect(sent.tables).toEqual({ invoices: 't_inv' });
    expect(out.where).toBe('lakehouse');
    await expect(runSql('select * from invoices join sales_orders using (customer)', lake, { SQL })).rejects.toThrow(/same place/);
  });

  it('custom SQL becomes a chart the rest of the app can use', async () => {
    const m = buildModel([sourceFromRows('Costs', [{ team: 'A', cost: 5 }, { team: 'B', cost: 7 }, { team: 'A', cost: 1 }], 'ERP')], []);
    const sp = sanitize({ title: 'Mine', sql: 'select team, sum(cost) as cost from costs group by team order by team', chart: 'bar' }, m);
    expect(sp.tables).toEqual(['costs']);
    expect(() => compute(sp, m)).toThrow(/Waiting/);
    const { runSql: realRun } = await import('./sqlQuery');
    sqlResults.set(m, new Map([[sp.sql, sqlToResult(await realRun(sp.sql, m, { SQL }), null, '')]]));
    const res = compute(sp, m);
    expect(res.labels).toEqual(['A', 'B']);
    expect(res.series[0].data).toEqual([6, 7]);
  });
});
