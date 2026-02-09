import { describe, expect, it } from 'vitest';

import { excelSerialToDate, parseDateSmart, parsePeriodString } from './dateParsing';

describe('dateParsing', () => {
  it('parses YYYY-MM into a UTC date', () => {
    const d = parsePeriodString('2024-01');
    expect(d).toBeInstanceOf(Date);
    expect(d.getUTCFullYear()).toBe(2024);
    expect(d.getUTCMonth()).toBe(0);
  });

  it('parses Jan-24 style month-year', () => {
    const d = parseDateSmart('Jan-24');
    expect(d).toBeInstanceOf(Date);
    expect(d.getUTCFullYear()).toBe(2024);
    expect(d.getUTCMonth()).toBe(0);
  });

  it('parses FY year labels', () => {
    const d = parseDateSmart('FY2023');
    expect(d).toBeInstanceOf(Date);
    expect(d.getUTCFullYear()).toBe(2023);
    expect(d.getUTCMonth()).toBe(0);
  });

  it('parses quarters', () => {
    const d = parseDateSmart('Q2 2024');
    expect(d).toBeInstanceOf(Date);
    expect(d.getUTCFullYear()).toBe(2024);
    expect(d.getUTCMonth()).toBe(3);
  });

  it('converts Excel serial dates in the expected range', () => {
    const d = excelSerialToDate(45292); // ~2024-01-01
    expect(d).toBeInstanceOf(Date);
    expect(Number.isNaN(d.getTime())).toBe(false);
  });

  it('returns null for invalid values', () => {
    expect(parseDateSmart(null)).toBeNull();
    expect(parseDateSmart(undefined)).toBeNull();
    expect(parseDateSmart('not-a-date')).toBeNull();
  });
});
