import { describe, it, expect } from 'vitest';
import { buildModel } from './model';
import { buildSampleSources, sampleSuggestions } from './sampleData';
import { compute, sanitize } from './engine';
import { buildWorkbook, describeSpec, sheetName, toCSV } from './export';

const sample = () => {
  const { sources, relationships } = buildSampleSources();
  return buildModel(sources, relationships);
};

describe('export', () => {
  it('writes CSV with extra columns and percentages as fractions', () => {
    const m = sample();
    const sp = sanitize({ groupBy: 'customer', share: true, series: [{ view: 'invoices', measure: 'amount' }] }, m);
    const csv = toCSV(sp, compute(sp, m)).split('\n');
    expect(csv[0]).toBe('customer,amount,Share of amount (%)');
    const share = Number(csv[1].split(',').pop());
    expect(share).toBeGreaterThan(0);
    expect(share).toBeLessThan(1);
  });

  it('makes unique, valid sheet names', () => {
    const taken = new Set();
    expect(sheetName('Cost per head: by [dept]/region?', taken)).toBe('Cost per head by dept region');
    expect(sheetName('Cost per head: by [dept]/region?', taken)).toBe('Cost per head by dept region 2');
    expect(sheetName('x'.repeat(50), taken).length).toBeLessThanOrEqual(31);
  });

  it('builds a workbook with contents and one sheet per report, applying dashboard filters', async () => {
    const m = sample();
    const items = sampleSuggestions(m).map((s) => ({ spec: sanitize(s.spec, m) }));
    const { wb, count, XLSX } = await buildWorkbook(items, m, [{ dim: 'department', op: 'eq', value: 'Sales' }]);
    expect(count).toBe(items.length);
    expect(wb.SheetNames[0]).toBe('Contents');
    const first = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[1]], { header: 1 });
    expect(first[0][0]).toBe('Cost per employee by department');
    expect(first[1][0]).toMatch(/department = Sales/);
    expect(first.slice(4).map((r) => r[0])).toEqual(['Sales']);
  });

  it('describes analysis options', () => {
    expect(describeSpec({ series: [], filters: [{ dim: 'month', op: 'gte', value: '2026-01' }], window: 3, compare: 'prior_year' }))
      .toBe('Filters: month ≥ 2026-01 · 3-month rolling · Compared with same month last year');
  });
});
