// The showcase samples (public/sample-data) give the charts and figures the demo scripts in
// src/lib/showcase.js promise, using the same Workbench code a customer runs.
import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { chartsForSheet, readWorkbook } from '@/lib/workbookCharts';
import { runAction, suggestActions } from '@/lib/workbenchActions';
import { COMPLEX_CASES, SAMPLES, fetchSample } from '@/lib/showcase';

const DIR = 'public/sample-data/';
const expected = JSON.parse(readFileSync(`${DIR}expected.json`, 'utf8'));

async function book(file) {
  const buf = readFileSync(`${DIR}${file}`);
  const sheets = await readWorkbook({ arrayBuffer: async () => buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) });
  return Object.fromEntries(sheets.map((s) => [s.name, s]));
}

const titles = (sheet) => chartsForSheet(sheet).charts.map((c) => c.title);
const run = (sheet, label) => {
  const action = suggestActions(sheet.columns, 20).find((a) => a.label === label);
  expect(action, `suggested: ${label}`).toBeTruthy();
  return Object.fromEntries(runAction(sheet.rows, action).rows.filter((r) => r[0] !== 'Total').map((r) => [r[0], r[2]]));
};
const close = (a, b, tol = 0.01) => expect(Math.abs(a - b)).toBeLessThanOrEqual(tol);

describe('every sample file exists', () => {
  it('has each file the catalogue lists', () => {
    for (const f of [...SAMPLES.map((s) => s.file), ...COMPLEX_CASES.flatMap((c) => c.files)]) expect(existsSync(`${DIR}${f}`), f).toBe(true);
  });

  it('loads a sample as a File', async () => {
    const fake = async (url) => ({ ok: true, blob: async () => new Blob([readFileSync(`public${url}`)]) });
    const f = await fetchSample('complex/bank-statement-september.csv', fake);
    expect(f.name).toBe('bank-statement-september.csv');
    expect(f.size).toBeGreaterThan(1000);
  });
});

describe('law firm', () => {
  const exp = expected['law-firm-hartwell-lane.xlsx'];
  it('charts every data tab and skips the read-me', async () => {
    const b = await book('law-firm-hartwell-lane.xlsx');
    expect(chartsForSheet(b['Read me']).charts).toHaveLength(0);
    expect(titles(b['Time entries'])).toEqual(['Total Hours by Practice area', 'Total Hours by Grade', 'Total Hours by month of Date']);
    expect(titles(b['Management accounts'])[0]).toBe('Line item over Apr-26–Sep-26');
    const debt = chartsForSheet(b['Aged debt']).charts[0];
    expect(debt.title).toBe('Owed by Client');
    expect(debt.x[0]).toBe('Linden Care Homes');
    const hours = chartsForSheet(b['Time entries']).charts[0];
    expect(hours.x[0]).toBe('Real Estate');
    expect(b['Time entries'].rows).toHaveLength(exp.time_entries_rows);
    expect(suggestActions(b['Time entries'].columns).map((a) => a.label)).toContain('One sheet per Practice area');
    for (const client of ['Northgate Retail', 'Silverline Haulage']) {
      const row = b['Aged debt'].rows.find((r) => r.Client === client);
      expect(row['Over 90 days'], client).toBeGreaterThan(row.Owed / 2);
    }
  });
  it('matches the expected value by practice area', async () => {
    const b = await book('law-firm-hartwell-lane.xlsx');
    const action = { type: 'total', params: { by: 'Practice area', value: 'Value', how: 'total' } };
    const got = Object.fromEntries(runAction(b['Time entries'].rows, action).rows.filter((r) => r[0] !== 'Total').map((r) => [r[0], r[2]]));
    for (const [k, v] of Object.entries(exp.value_by_practice_area)) close(got[k], v);
    expect(Math.min(...Object.values(exp.realisation_by_practice_area))).toBe(exp.realisation_by_practice_area['Real Estate']);
    const net = Object.values(exp.net_profit_by_month);
    expect(Math.min(...net)).toBeGreaterThan(92000);
    expect(Math.max(...net)).toBeLessThan(112000);
  });
});

describe('finance', () => {
  const exp = expected['finance-northbridge-group.xlsx'];
  it('charts the P&L as items over twelve months and budget by department', async () => {
    const b = await book('finance-northbridge-group.xlsx');
    const pl = chartsForSheet(b['Group P&L']).charts[0];
    expect(pl.x).toHaveLength(12);
    expect(pl.series.map((s) => s.name)).toContain('EBITDA');
    expect(titles(b['Budget vs actual'])).toEqual(['Total Budget by Department', 'Total Budget by month of Month']);
    const custom = { type: 'total', params: { by: 'Department', value: 'Variance', how: 'total' } };
    const variance = Object.fromEntries(runAction(b['Budget vs actual'].rows, custom).rows.filter((r) => r[0] !== 'Total').map((r) => [r[0], r[2]]));
    for (const [k, v] of Object.entries(exp.variance_by_department)) close(variance[k], v);
    expect(Object.entries(exp.variance_by_department).filter(([, v]) => v > 0).map(([k]) => k)).toEqual(['Technology']);
    expect(exp.ebitda_margin).toBe(17.2);
  });
});

describe('university', () => {
  const exp = expected['university-ashford.xlsx'];
  it('charts years across the top as a trend, and averages percentages', async () => {
    const b = await book('university-ashford.xlsx');
    const trend = chartsForSheet(b.Enrolment).charts[0];
    expect(trend.x).toEqual(['2022', '2023', '2024', '2025', '2026']);
    const computing = trend.series.find((s) => s.name === 'Computing').values;
    close(computing.at(-1) / computing[0], 1.4, 0.02);
    expect(titles(b.Students)).toContain('Average Attendance % by Faculty');
    expect(titles(b['Research income'])).toEqual(['Total Income by Funder', 'Total Income by Year']);
    const att = chartsForSheet(b.Students).charts.find((c) => c.title === 'Average Attendance % by Faculty');
    expect(att.x[0]).toBe('Health Sciences');
    expect(att.x.at(-1)).toBe('Arts & Humanities');
    close(att.series[0].values.at(-1), exp.average_attendance_by_faculty['Arts & Humanities']);
    expect(exp.withdrawal_rate_low_attendance / exp.withdrawal_rate).toBeGreaterThan(5.5);
  });
});

describe('insurance', () => {
  const exp = expected['insurance-kingsmere-claims.xlsx'];
  it('totals incurred and earned premium by line, which give the loss ratio', async () => {
    const b = await book('insurance-kingsmere-claims.xlsx');
    const incurred = run(b.Claims, 'Total Incurred by Line of business');
    const earned = run(b.Premiums, 'Total Earned premium by Line of business');
    for (const [k, v] of Object.entries(exp.loss_ratio_by_line)) close((incurred[k] / earned[k]) * 100, v, 0.06);
    expect(Object.entries(incurred).sort((a, c) => c[1] - a[1])[0][0]).toBe('Liability');
    expect(suggestActions(b.Claims.columns).map((a) => a.label)).toContain('One sheet per Status');
    const reserve = b.Claims.rows.filter((r) => r.Status !== 'Closed').reduce((n, r) => n + r.Reserve, 0);
    close(reserve, exp.open_reserve_total, 0.05);
    expect(Object.entries(exp.loss_ratio_by_line).sort((a, c) => c[1] - a[1])[0][0]).toBe('Marine');
  });
});

describe('manufacturing', () => {
  const exp = expected['manufacturing-corran-precision.xlsx'];
  it('charts units by line and shows which line scraps and stops most', async () => {
    const b = await book('manufacturing-corran-precision.xlsx');
    expect(titles(b.Production)).toEqual(['Total Units produced by Line', 'Total Units produced by Product', 'Total Units produced by month of Date']);
    const scrap = run(b.Production, 'Total Units scrapped by Line');
    const made = run(b.Production, 'Total Units produced by Line');
    const rates = Object.fromEntries(Object.keys(made).map((k) => [k, (scrap[k] / made[k]) * 100]));
    for (const [k, v] of Object.entries(exp.scrap_rate_by_line)) close(rates[k], v);
    const others = Object.entries(exp.scrap_rate_by_line).filter(([k]) => k !== 'Line C').map(([, v]) => v);
    expect(exp.scrap_rate_by_line['Line C']).toBeGreaterThan(2 * Math.max(...others));
    const down = Object.entries(exp.downtime_by_line).filter(([k]) => k !== 'Line D').map(([, v]) => v);
    expect(exp.downtime_by_line['Line D']).toBeGreaterThan(2 * Math.max(...down));
    expect(b.Inventory.rows.filter((r) => r['On hand'] < r['Reorder point'])).toHaveLength(12);
    expect(suggestActions(b.Inventory.columns).map((a) => a.label)).toContain('Total On hand by Stock status');
  });
});

describe('hr', () => {
  it('charts salary by location and payroll by department', async () => {
    const b = await book('hr-fernhill-people.xlsx');
    expect(titles(b.Employees).slice(0, 2)).toEqual(['Total Salary by Location', 'Total Salary by Grade']);
    expect(titles(b.Payroll)[0]).toBe('Total Gross pay by Department');
    expect(chartsForSheet(b.Payroll).charts[0].x[0]).toBe('Engineering');
    expect(b.Employees.rows.filter((r) => r.Status === 'Active')).toHaveLength(103);
  });
});

describe('the messy pack', () => {
  it('skips the cover and the empty tab and finds the tables under their titles', async () => {
    const b = await book('complex/messy-management-pack.xlsx');
    expect(chartsForSheet(b.Cover).charts).toHaveLength(0);
    expect(b['Notes (blank)'].note).toMatch(/No table/);
    expect(b['Regional sales'].rows).toHaveLength(152);
    expect(titles(b['P&L'])).toEqual(['Line items over Jul–Sep']);
    // Before cleaning, " north " is its own group: the reason the quality check offers the fix.
    expect(chartsForSheet(b['Regional sales']).charts[0].x).toContain('north');
  });
});
