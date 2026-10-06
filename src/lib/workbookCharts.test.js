import { describe, expect, it } from 'vitest';
import * as XLSX from 'xlsx';
import { aggregationFor, chartsForWorkbook, isPeriod, readWorkbook, tableFromRows } from './workbookCharts';

function book() {
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
    ['Monthly sales by region'], [],
    ['Month', 'North', 'South', 'East'],
    ['Jan', 100, 200, 150], ['Feb', 120, 210, 160], ['Mar', 130, 190, 170], ['Apr', 160, 230, 180],
  ]), 'Sales');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
    ['Line item', 'Q1', 'Q2', 'Q3', 'Q4'],
    ['Revenue', 1200, 1350, 1500, 1620],
    ['Cost of sales', -500, -560, -610, -640],
    ['Net profit', 400, 470, 560, 630],
  ]), 'P&L');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([]), 'Chart only');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([['A', 'B', 'C']]), 'Headers only');
  const students = [['Student', 'Course', 'Score', 'Enrolled']];
  [['Maths', 80, '2025-01-10'], ['Maths', 60, '2025-01-20'], ['Physics', 90, '2025-02-05'], ['History', 70, '2025-02-15'], ['Physics', 70, '2025-03-01'], ['History', 50, '2025-03-11']]
    .forEach(([c, s, d], i) => students.push([`S${i}`, c, s, d]));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(students), 'Students');
  const out = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  return new File([out], 'project.xlsx');
}

describe('reading every tab', () => {
  it('finds the table under a title and skips blank rows', () => {
    const t = tableFromRows([['Report'], [], ['Name', 'Pay'], ['Asha', 10], [null, null], ['Ben', 20]]);
    expect(t.headers).toEqual(['Name', 'Pay']);
    expect(t.rows).toEqual([['Asha', 10], ['Ben', 20]]);
  });

  it('knows periods and when to average instead of total', () => {
    ['Q1', 'Jan', 'Jan-24', 'FY2025', '2024', '2024-03', 'Week 3'].forEach((p) => expect(isPeriod(p)).toBe(true));
    ['Revenue', 'North', 'Maths'].forEach((p) => expect(isPeriod(p)).toBe(false));
    expect(aggregationFor('Score')).toBe('average');
    expect(aggregationFor('Exam %')).toBe('average');
    expect(aggregationFor('Amount')).toBe('total');
  });
});

describe('charts for every tab', () => {
  it('charts each tab the right way and explains the tabs it cannot chart', async () => {
    const results = chartsForWorkbook(await readWorkbook(book()));
    const by = Object.fromEntries(results.map((r) => [r.sheet, r]));

    // Time down the side: one line per region over the months.
    const sales = by.Sales.charts[0];
    expect(sales.kind).toBe('line');
    expect(sales.x).toEqual(['Jan', 'Feb', 'Mar', 'Apr']);
    expect(sales.series.map((s) => s.name)).toEqual(['North', 'South', 'East']);

    // P&L: one line per line item over Q1-Q4, values kept with their sign.
    const pl = by['P&L'].charts[0];
    expect(pl.title).toBe('Line item over Q1–Q4');
    expect(pl.x).toEqual(['Q1', 'Q2', 'Q3', 'Q4']);
    expect(pl.series.find((s) => s.name === 'Cost of sales').values).toEqual([-500, -560, -610, -640]);

    // Scores are averaged, not summed; plus a monthly line from the enrolment date.
    const [byCourse, monthly] = by.Students.charts;
    expect(byCourse.title).toBe('Average Score by Course');
    expect(Object.fromEntries(byCourse.x.map((k, i) => [k, byCourse.series[0].values[i]]))).toEqual({ Physics: 80, Maths: 70, History: 60 });
    expect(monthly.x).toEqual(['2025-01', '2025-02', '2025-03']);

    for (const name of ['Chart only', 'Headers only']) {
      expect(by[name].charts).toEqual([]);
      expect(by[name].reason).toMatch(/no table of data/i);
    }
  });

  it('never draws more than 8 series, and says so', async () => {
    const wb = XLSX.utils.book_new();
    const rows = [['Item', 'Jan', 'Feb', 'Mar']];
    for (let i = 1; i <= 12; i += 1) rows.push([`Item ${i}`, i * 10, i * 11, i * 12]);
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), 'Many');
    const file = new File([XLSX.write(wb, { bookType: 'xlsx', type: 'array' })], 'many.xlsx');
    const [r] = chartsForWorkbook(await readWorkbook(file));
    expect(r.charts[0].series).toHaveLength(8);
    expect(r.charts[0].series[0].name).toBe('Item 12');
    expect(r.charts[0].note).toMatch(/8 largest of 12/);
  });
});
