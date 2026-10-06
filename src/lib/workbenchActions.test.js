import { describe, expect, it } from 'vitest';
import * as XLSX from 'xlsx';
import { profileColumns, readRows, resultWorkbook, runAction, sheetName, suggestActions, toDate, toNumber } from './workbenchActions';

const staff = [
  { 'Employee ID': 'E001', Name: 'Asha', ' Department': 'Finance', Salary: '52,000', 'Start Date': '03/01/2021' },
  { 'Employee ID': 'E002', Name: 'Ben', ' Department': 'HR', Salary: '48,500', 'Start Date': '14/02/2020' },
  { 'Employee ID': 'E003', Name: 'Chen', ' Department': 'Finance', Salary: '61,200', 'Start Date': '01/06/2019' },
  { 'Employee ID': 'E004', Name: 'Dana', ' Department': 'IT', Salary: '990,000', 'Start Date': '22/11/2022' },
  { 'Employee ID': 'E005', Name: 'Eli', ' Department': 'IT', Salary: '57,300', 'Start Date': '05/05/2018' },
  { 'Employee ID': 'E006', Name: 'Fay', ' Department': 'Finance', Salary: '45,900', 'Start Date': '30/01/2021' },
];

describe('averages where totals mean nothing', () => {
  it('suggests and charts the average score, not the sum', () => {
    const rows = [{ Course: 'Maths', Score: 80 }, { Course: 'Maths', Score: 60 }, { Course: 'Physics', Score: 90 }, { Course: 'Physics', Score: 50 }, { Course: 'Art', Score: 75 }];
    const action = suggestActions(profileColumns(rows)).find((a) => a.type === 'total');
    expect(action.label).toBe('Average Score by Course');
    const r = runAction(rows, action);
    expect(r.chart).toEqual([{ label: 'Art', value: 75 }, { label: 'Maths', value: 70 }, { label: 'Physics', value: 70 }]);
  });
});

describe('reading values', () => {
  it('reads numbers written as text', () => {
    expect(toNumber('52,000')).toBe(52000);
    expect(toNumber('£1,200.50')).toBe(1200.5);
    expect(toNumber('(300)')).toBe(-300);
    expect(toNumber('E001')).toBeNull();
    expect(toNumber('')).toBeNull();
  });

  it('reads day-first and ISO dates, and rejects impossible ones', () => {
    expect(toDate('14/02/2020').toISOString().slice(0, 10)).toBe('2020-02-14');
    expect(toDate('2026-10-03').toISOString().slice(0, 10)).toBe('2026-10-03');
    expect(toDate('31/13/2020')).toBeNull();
    expect(toDate('Finance')).toBeNull();
  });
});

describe('one-click work', () => {
  const cols = profileColumns(staff);

  it('recognises the columns', () => {
    const kinds = Object.fromEntries(cols.map((c) => [c.name, c.kind]));
    expect(kinds).toMatchObject({ Department: 'category', Salary: 'number', 'Start Date': 'date', Name: 'text', 'Employee ID': 'text' });
  });

  it('suggests real tasks from the columns', () => {
    const labels = suggestActions(cols).map((a) => a.label);
    expect(labels).toContain('Total Salary by Department');
    expect(labels).toContain('Salary by month of Start Date');
    expect(labels).toContain('Top 10 rows by Salary');
    expect(labels).toContain('One sheet per Department');
  });

  it('totals by category, largest first, with a grand total that adds up', () => {
    const r = runAction(staff, suggestActions(cols).find((a) => a.type === 'total'));
    expect(r.rows[0]).toEqual(['IT', 2, 1047300, 523650, '83.46%']);
    expect(r.rows.at(-1)).toEqual(['Total', 6, 1254900, 209150, '100%']);
    expect(r.chart.map((c) => c.label)).toEqual(['IT', 'Finance', 'HR']);
  });

  it('totals by month and lists the largest rows', () => {
    const monthly = runAction(staff, suggestActions(cols).find((a) => a.type === 'monthly'));
    expect(monthly.rows.find(([m]) => m === '2021-01')).toEqual(['2021-01', 97900]);
    const top = runAction(staff, suggestActions(cols).find((a) => a.type === 'top'));
    expect(top.rows[0][1]).toBe('Dana');
  });

  it('splits into one sheet per group and writes a real Excel file', async () => {
    const r = runAction(staff, suggestActions(cols).find((a) => a.type === 'split'));
    expect(Object.keys(r.sheets)).toEqual(['Finance', 'IT', 'HR']);
    const blob = resultWorkbook(r);
    const wb = XLSX.read(await blob.arrayBuffer());
    expect(wb.SheetNames).toEqual(['Summary', 'Finance', 'IT', 'HR']);
  });

  it('reads an uploaded CSV file', async () => {
    const csv = 'Region,Sales\nNorth,"1,000"\nSouth,500\nNorth,250\n';
    const file = new File([csv], 'sales.csv', { type: 'text/csv' });
    const { rows } = await readRows(file);
    const action = suggestActions(profileColumns(rows)).find((a) => a.type === 'total');
    expect(runAction(rows, action).rows[0]).toEqual(['North', 2, 1250, 625, '71.43%']);
  });

  it('makes safe, unique sheet names', () => {
    const used = new Set();
    expect(sheetName('A/B: very long department name that goes on', used)).toBe('A B  very long department name');
    expect(sheetName('Finance', used)).toBe('Finance');
    expect(sheetName('finance', used)).toBe('finance 2');
  });
});
