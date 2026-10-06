import { describe, expect, it } from 'vitest';
import { aiSummary, missingShare, qualityLabel, recommendedFixes, sheetFindings } from './workbench';

const sheet = (over = {}) => ({
  row_count: 100,
  column_count: 4,
  duplicate_rows: 0,
  outliers: { by_column: [] },
  columns: [
    { name: 'Employee', type: 'text', null_count: 0, null_percentage: 0, sample_values: ['Asha', 'Ben'] },
    { name: 'Salary', type: 'numeric', null_count: 0, null_percentage: 0, sample_values: [1, 2] },
  ],
  ...over,
});

describe('workbench findings', () => {
  it('finds nothing in a clean sheet', () => {
    expect(sheetFindings(sheet())).toEqual([]);
    expect(recommendedFixes([])).toEqual({ dedupeRows: false, parseNumbers: false, parseDates: false, normalizeHeaders: false });
  });

  it('ties duplicates, text numbers and text dates to the fix that solves them', () => {
    const f = sheetFindings(sheet({
      duplicate_rows: 12,
      columns: [
        { name: 'Amount', type: 'text', null_percentage: 0, sample_values: ['1,234.50', '(2,000.00)', '£3,100'] },
        { name: 'Paid on', type: 'text', null_percentage: 0, sample_values: ['03/10/2026', '14/09/2026', '1/2/26'] },
      ],
    }));
    expect(f[0]).toMatchObject({ id: 'duplicates', severity: 'high', fix: 'dedupeRows' });
    expect(f.find((x) => x.id === 'numbers-as-text')).toMatchObject({ fix: 'parseNumbers' });
    expect(f.find((x) => x.id === 'dates-as-text')).toMatchObject({ fix: 'parseDates' });
    expect(recommendedFixes(f)).toEqual({ dedupeRows: true, parseNumbers: true, parseDates: true, normalizeHeaders: false });
  });

  it('asks for a review where no automatic fix is safe', () => {
    const f = sheetFindings(sheet({
      columns: [{ name: 'Manager', type: 'text', null_percentage: 72, sample_values: ['A'] }],
      outliers: { by_column: [{ column: 'Salary', count: 2, sample_values: [990000, 1] }] },
    }));
    expect(f[0]).toMatchObject({ id: 'missing-high', severity: 'high' });
    expect(f[0].fix).toBeUndefined();
    expect(f[0].review).toBeTruthy();
    expect(f.find((x) => x.id === 'outliers').title).toContain('2 unusual values');
  });

  it('flags blank, padded and repeated column names', () => {
    const f = sheetFindings(sheet({
      columns: [
        { name: ' Name', type: 'text', null_percentage: 0 },
        { name: 'name', type: 'text', null_percentage: 0 },
        { name: 'Unnamed: 3', type: 'text', null_percentage: 0 },
      ],
    }));
    expect(f.find((x) => x.id === 'headers')).toMatchObject({ fix: 'normalizeHeaders', severity: 'low' });
  });

  it('labels the score and works out the share of empty cells', () => {
    expect(qualityLabel(92).label).toBe('Good');
    expect(qualityLabel(60).label).toBe('Needs attention');
    expect(qualityLabel(20).label).toBe('Poor');
    expect(qualityLabel(null)).toBeNull();
    expect(missingShare({ row_count: 10, columns: [{ null_count: 5 }, { null_count: 0 }] })).toBe(25);
  });
});

describe('workbench real-world cases', () => {
  it('spots numbers stored as text even when the check calls the column numeric', () => {
    const f = sheetFindings(sheet({ columns: [{ name: 'Salary', type: 'numeric', null_percentage: 0, sample_values: ['52,000', '48,500'] }] }));
    expect(f.map((x) => x.id)).toContain('numbers-as-text');
  });

  it('leaves real numbers alone', () => {
    const f = sheetFindings(sheet({ columns: [{ name: 'Salary', type: 'numeric', null_percentage: 0, sample_values: [52000, 48500] }] }));
    expect(f.map((x) => x.id)).not.toContain('numbers-as-text');
  });

  it('hides the AI description when the AI could not write one', () => {
    expect(aiSummary({ ai_summary: { summary: 'Unable to generate AI summary' } })).toBeNull();
    expect(aiSummary({ ai_summary: { summary: 'Staff list with salaries.' } }).summary).toBe('Staff list with salaries.');
  });
});
