import { describe, it, expect } from 'vitest';
import { mapSheets, runMigration, cleanValue, detectDateOrder, toIsoDate, loadOrder, picklistValues, validIban, jobEventKind } from './engine';
import { sourceFromRows } from '@/lib/unifiedReporting/model';
import { SUCCESSFACTORS, DEFAULT_SETTINGS } from './targets/successfactors';
import { buildWorkdaySample } from './sampleWorkday';
import { fileRows } from './exporter';
import { toCountry } from './dictionaries';

const settings = { ...DEFAULT_SETTINGS, asOf: '2026-09-27' };
const run = (picklists = {}) => {
  const sheets = buildWorkdaySample();
  const mapping = mapSheets(sheets);
  return { sheets, mapping, result: runMigration(SUCCESSFACTORS, sheets, mapping, settings, picklists) };
};
const conceptOf = (sheets, mapping, sheetName, colName) => {
  const s = sheets.find((x) => x.name === sheetName);
  const col = s.columns.find((c) => c.name === colName);
  return mapping[s.id][col.key]?.concept;
};
const file = (result, id) => result.files.find((f) => f.entity.id === id);

describe('schema mapping', () => {
  it('maps Workday column names to canonical concepts', () => {
    const { sheets, mapping } = run();
    expect(conceptOf(sheets, mapping, 'Worker_Data', 'Legal_First_Name')).toBe('first_name');
    expect(conceptOf(sheets, mapping, 'Worker_Data', 'Primary_Work_Email')).toBe('email_work');
    expect(conceptOf(sheets, mapping, 'Worker_Data', 'Worker_Status')).toBe('status');
    expect(conceptOf(sheets, mapping, 'Job_History', 'Supervisory_Org')).toBe('department_code');
    expect(conceptOf(sheets, mapping, 'Job_History', 'Manager_Employee_ID')).toBe('manager_id');
    expect(conceptOf(sheets, mapping, 'Job_History', 'Job_Profile_ID')).toBe('job_code');
    expect(conceptOf(sheets, mapping, 'Compensation_History', 'Amount')).toBe('salary_amount');
    expect(conceptOf(sheets, mapping, 'One_Time_Payments', 'Amount')).toBe('one_time_amount');
    expect(conceptOf(sheets, mapping, 'Payroll_YTD', 'YTD_Amount')).toBe('ytd_amount');
    expect(conceptOf(sheets, mapping, 'Cost_Centers', 'Company')).toBe('cost_center_company');
    expect(conceptOf(sheets, mapping, 'Bank_Accounts', 'Bank_Country')).toBe('bank_country');
    expect(conceptOf(sheets, mapping, 'Terminations', 'Primary_Reason')).toBe('termination_reason');
  });

  it('reads the same word by sheet context', () => {
    const { sheets, mapping } = run();
    expect(conceptOf(sheets, mapping, 'Companies', 'Country')).toBe('company_country');
    expect(conceptOf(sheets, mapping, 'Home_Address', 'Country')).toBe('address_country');
    expect(conceptOf(sheets, mapping, 'Locations', 'Location_Country')).toBe('location_country');
  });
});

describe('cleansing', () => {
  it('normalises values and names the rule applied', () => {
    expect(cleanValue('gender', 'female', {})).toMatchObject({ value: 'F', rule: 'picklist:gender' });
    expect(cleanValue('address_country', 'Deutschland', {})).toMatchObject({ value: 'DEU', rule: 'country' });
    expect(cleanValue('fte', '50', {})).toMatchObject({ value: '0.5', rule: 'fte' });
    expect(cleanValue('employee_id', 21000, {})).toMatchObject({ value: '21000' });
    expect(cleanValue('email_work', 'A.B@X.COM', {})).toMatchObject({ value: 'a.b@x.com', rule: 'email' });
    expect(cleanValue('email_work', 'bad@host', {}).error).toBeTruthy();
    expect(cleanValue('salary_amount', '£52,000', {})).toMatchObject({ value: '52000' });
    expect(cleanValue('gender', 'Z', {}).picklist).toBe('gender');
    expect(cleanValue('gender', 'Z', { picklists: { gender: { z: 'U' } } }).value).toBe('U');
  });

  it('detects day/month order and two-digit years', () => {
    expect(detectDateOrder(['03/04/2020', '25/04/2020'])).toBe('DMY');
    expect(detectDateOrder(['03/04/2020', '04/25/2020'])).toBe('MDY');
    expect(detectDateOrder(['03/04/2020'])).toBeNull();
    expect(toIsoDate('02/29/24', 'MDY')).toBe('2024-02-29');
    expect(toIsoDate('07/14/85', 'MDY')).toBe('1985-07-14');
    expect(toIsoDate('02/30/2024', 'MDY')).toBeNull();
    expect(toIsoDate(45000, 'MDY')).toBe('2023-03-15');
    expect(toCountry('UK')).toBe('GBR');
  });
});

describe('end to end: Workday sample → SuccessFactors', () => {
  it('merges tabs per employee and builds every core file', () => {
    const { result } = run();
    expect(result.data.people).toHaveLength(40);
    const ids = result.files.map((f) => f.entity.id);
    expect(ids).toEqual(expect.arrayContaining(['FOCompany', 'FODepartment', 'FOLocation', 'FOJobCode', 'User', 'PerPerson', 'EmpEmployment', 'PerPersonal', 'EmpJob', 'PerEmail', 'PerAddressDEFLT', 'EmpCompensation', 'EmpPayCompRecurring', 'EmpEmploymentTermination']));
    const user = file(result, 'User').rows.find((r) => r.USERID === '21000');
    expect(user).toMatchObject({ STATUS: 'active', MANAGER: 'NO_MANAGER', DEPARTMENT: 'SO-100', LOCATION: 'LON' });
    expect(user.HIREDATE).toMatch(/^\d{2}\/\d{2}\/\d{4}$/);
    expect(file(result, 'EmpJob').rows.length).toBeGreaterThan(40); // job history kept
  });

  it('orders files so every reference loads first', () => {
    const { result } = run();
    const pos = Object.fromEntries(result.files.map((f) => [f.entity.id, f.order]));
    for (const f of result.files) for (const d of f.entity.dependsOn) if (pos[d]) expect(pos[d]).toBeLessThan(f.order);
    expect(result.files[0].fileName).toMatch(/^01_FO/);
  });

  it('auto-creates referenced org records and infers the legal entity country', () => {
    const { result } = run();
    const dept = file(result, 'FODepartment').rows.find((r) => r.externalCode === 'SO-500');
    expect(dept).toBeTruthy();
    expect(result.data.changes.map((c) => c.rule)).toEqual(expect.arrayContaining(['org-created', 'date', 'picklist:gender', 'country', 'fte', 'company-country']));
    expect(file(result, 'FOCompany').rows.find((r) => r.externalCode === 'US01').country).toBe('USA');
  });

  it('flags what SuccessFactors would reject', () => {
    const { result } = run();
    const msgs = result.issues.filter((i) => i.severity === 'error').map((i) => `${i.key}: ${i.message}`);
    expect(msgs.some((m) => m.startsWith('21031:') && /no termination date/.test(m))).toBe(true);
    expect(msgs.some((m) => /Manager 99999 is not in this migration/.test(m))).toBe(true);
    expect(msgs.some((m) => /not a valid email/.test(m))).toBe(true);
  });

  it('lets the user map a picklist value and re-run', () => {
    const { sheets, mapping, result } = run();
    const g = picklistValues(sheets, mapping).gender;
    expect(g.find((x) => x.key === 'not declared')).toMatchObject({ code: 'U', source: 'suggested' });
    const again = runMigration(SUCCESSFACTORS, sheets, mapping, settings, { gender: { 'not declared': 'X' } });
    expect(again.files.find((f) => f.entity.id === 'PerPersonal').rows.some((r) => r.gender === 'X')).toBe(true);
    expect(result.counts.error).toBeGreaterThan(0);
  });

  it('writes the template layout with a label row', () => {
    const { result } = run();
    const rows = fileRows(file(result, 'PerPerson'), settings);
    expect(rows[0]).toEqual(['person-id-external', 'user-id', 'date-of-birth', 'country-of-birth', 'place-of-birth']);
    expect(rows[1][0]).toBe('Person ID');
    expect(fileRows(file(result, 'PerPerson'), { ...settings, labelRow: false })[1][0]).toMatch(/^2\d{4}$/);
  });
});

describe('dependency resolver', () => {
  it('rejects cycles', () => {
    expect(() => loadOrder([{ id: 'A', dependsOn: ['B'] }, { id: 'B', dependsOn: ['A'] }])).toThrow(/Circular/);
  });
});

describe('lookups and messages', () => {
  it('fills cost centre and time zone from org lists, and reports a missing termination once', () => {
    const { result } = run();
    const job = file(result, 'EmpJob').rows.find((r) => r['user-id'] === '21000');
    expect(job['cost-center']).toBe('GB01-100');
    const berlin = file(result, 'EmpJob').rows.find((r) => r.location === 'BER');
    if (berlin) expect(berlin.timezone).toBe('Europe/Berlin');
    expect(result.issues.filter((i) => i.key === '21031')).toHaveLength(1);
    expect(cleanValue('phone_work', '+44 (0)20 7946 1000', {}).value).toBe('+442079461000');
  });
});

describe('payroll, finance and history', () => {
  it('builds cost centers top-down and checks them against legal entities', () => {
    const { result } = run();
    const cc = file(result, 'FOCostCenter');
    const pos = (code) => cc.rows.findIndex((r) => r.externalCode === code);
    expect(pos('GB01-000')).toBeLessThan(pos('GB01-200'));
    expect(file(result, 'FODepartment').order).toBeGreaterThan(cc.order);
    const msgs = result.issues.map((i) => i.message);
    expect(msgs).toContain('FR01 does not exist in FOCompany');
    expect(msgs.some((m) => /^Cost center \S+ belongs to \w+, but the employee is in \w+$/.test(m))).toBe(true);
  });

  it('keeps full pay history with several components per date', () => {
    const { result } = run();
    const recurring = file(result, 'EmpPayCompRecurring').rows;
    const comp = file(result, 'EmpCompensation').rows;
    expect(recurring.length).toBeGreaterThan(comp.length); // car allowance shares a date with base pay
    expect(new Set(comp.map((r) => `${r['user-id']}|${r['start-date']}`)).size).toBe(comp.length);
    expect(recurring.some((r) => r['pay-component'] === 'Car Allowance')).toBe(true);
  });

  it('classifies job history events', () => {
    expect(jobEventKind({ job_code: 'A', department_code: 'D' }, { job_code: 'B', department_code: 'D' })).toBe('jobChange');
    expect(jobEventKind({ job_code: 'A', department_code: 'D' }, { job_code: 'A', department_code: 'E' })).toBe('transfer');
    expect(jobEventKind({ job_code: 'A' }, { job_code: 'A', fte: '0.5' })).toBe('data');
    const reasons = new Set(file(run().result, 'EmpJob').rows.map((r) => r['event-reason']));
    expect([...reasons].sort()).toEqual(['DATACHG', 'HIRNEW', 'JOBCHG', 'TRANSFER']);
  });

  it('validates bank details and one-time payments', () => {
    expect(validIban('GB82WEST12345698765432')).toBe(true);
    expect(validIban('GB82WEST12345698765433')).toBe(false);
    expect(cleanValue('iban', 'gb82 west 1234 5698 7654 32', {})).toMatchObject({ value: 'GB82WEST12345698765432', rule: 'iban' });
    const { result } = run();
    const errs = result.issues.filter((i) => i.severity === 'error').map((i) => i.message);
    expect(errs.some((m) => /^IBAN •+\d{4} fails its checksum$/.test(m))).toBe(true);
    expect(errs).toContain('UK sort code must be 6 digits (has 5)');
    expect(file(result, 'EmpPayCompNonRecurring').rows[0]['pay-component-code']).toBe('Annual Bonus');
    expect(file(result, 'PayrollYTD').rows.length).toBeGreaterThan(0);
  });

  it('reconciles money to the cent and catches values lost in a merge', () => {
    const { result } = run();
    expect(result.reconciliation.length).toBeGreaterThan(5);
    expect(result.reconciliation.every((r) => r.ok)).toBe(true);

    // The same employee twice on a one-row-per-employee tab: only one salary survives.
    const sheets = [sourceFromRows('Workers', [
      { Employee_ID: 'E1', Legal_First_Name: 'A', Legal_Last_Name: 'B', Hire_Date: '2020-01-01', Base_Pay_Amount: '100', Currency: 'GBP' },
      { Employee_ID: 'E1', Legal_First_Name: 'A', Legal_Last_Name: 'B', Hire_Date: '2020-01-01', Base_Pay_Amount: '150', Currency: 'GBP' },
    ], 'Workday', 'file')];
    const r2 = runMigration(SUCCESSFACTORS, sheets, mapSheets(sheets), settings, {});
    const pay = r2.reconciliation.find((r) => r.label === 'Recurring pay (GBP)');
    expect(pay).toMatchObject({ source: 250, target: 100, ok: false });
  });
});
