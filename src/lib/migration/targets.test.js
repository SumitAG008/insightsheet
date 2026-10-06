import { describe, it, expect } from 'vitest';
import { mapSheets, runMigration, dayBefore } from './engine';
import { buildWorkdaySample } from './sampleWorkday';
import { fileRows, hdlText, packages, readme } from './exporter';
import { TARGETS, settingsFor, targetFor } from './targets';
import { WORKDAY } from './targets/workday';
import { ORACLE_HCM } from './targets/oracle';
import { SALESFORCE } from './targets/salesforce';
import { sourceFromRows } from '@/lib/unifiedReporting/model';

const runFor = (target) => {
  const sheets = buildWorkdaySample();
  const mapping = mapSheets(sheets);
  const settings = { ...settingsFor(target), asOf: '2026-09-27' };
  return { settings, result: runMigration(target, sheets, mapping, settings, {}) };
};
const file = (result, id) => result.files.find((f) => f.entity.id === id);

describe('target registry', () => {
  it('offers SuccessFactors, Workday, Oracle and Salesforce, each with every field filled in', () => {
    expect(TARGETS.map((t) => t.id)).toEqual(['successfactors', 'workday', 'oracle', 'salesforce']);
    for (const t of TARGETS) {
      for (const e of t.entities) {
        expect(e.fields.length, `${t.id}.${e.id}`).toBeGreaterThan(0);
        e.fields.forEach((f) => expect(!!(f.from || f.derive), `${t.id}.${e.id}.${f.id}`).toBe(true));
        e.dependsOn.forEach((d) => expect(t.entities.some((x) => x.id === d), `${t.id}.${e.id} needs ${d}`).toBe(true));
      }
    }
  });

  it('switching target brings that target’s date format and keeps the other choices', () => {
    const sf = settingsFor(targetFor('successfactors'), { sourceSystem: 'Workday' });
    const oracle = settingsFor(targetFor('oracle'), sf);
    expect(oracle.dateFormat).toBe('yyyy/MM/dd');
    expect(oracle.sourceSystem).toBe('Workday');
    expect(oracle.hdlSourceSystemOwner).toBe('LEGACY');
    expect(settingsFor(targetFor('nonsense')).target).toBe('successfactors');
  });
});

describe('Workday target (EIB)', () => {
  const { result, settings } = runFor(WORKDAY);

  it('hires every employee once and loads job history as Change_Job after the hire', () => {
    const hires = file(result, 'Hire_Employee');
    const ids = new Set(hires.rows.map((r) => r.Employee_ID));
    expect(ids.size).toBe(hires.rows.length);
    expect(ids.size).toBe(result.data.people.length);
    const jobRows = [...result.data.jobsFor.values()].reduce((a, j) => a + j.length, 0);
    const changes = file(result, 'Change_Job');
    expect(changes.rows.length).toBe(jobRows - result.data.jobsFor.size);
    changes.rows.forEach((r) => expect(r.Reason_Reference).toMatch(/^Change_Job_/));
  });

  it('links each worker’s contact tabs with the same Spreadsheet Key', () => {
    const hireKey = Object.fromEntries(file(result, 'Hire_Employee').rows.map((r) => [r.Employee_ID, r['Spreadsheet Key*']]));
    for (const id of ['Contact_Email', 'Contact_Address']) {
      const f = file(result, id);
      expect(f.rows.length).toBeGreaterThan(0);
      f.rows.forEach((r) => expect(r['Spreadsheet Key*']).toBe(hireKey[r.Worker_Reference]));
    }
  });

  it('writes ISO dates and groups files into one EIB workbook per web service, foundation first', () => {
    expect(file(result, 'Hire_Employee').rows[0].Hire_Date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    const names = packages(result, WORKDAY).map((g) => g.name);
    expect(names.indexOf('Add_Update_Organization')).toBeLessThan(names.indexOf('Hire_Employee'));
    expect(names.indexOf('Hire_Employee')).toBeLessThan(names.indexOf('Change_Job'));
    expect(packages(result, WORKDAY).find((g) => g.name === 'Maintain_Contact_Information').files.map((f) => f.entity.id)).toEqual(expect.arrayContaining(['Contact_Email', 'Contact_Address']));
    // EIB tabs have one header row: no label row.
    const hire = file(result, 'Hire_Employee');
    expect(fileRows(hire, settings, WORKDAY).length).toBe(hire.rows.length + 1);
  });

  it('reconciles employees and pay to the Workday files', () => {
    const emp = result.reconciliation.find((r) => r.label === 'Employees');
    expect(emp.ok).toBe(true);
    expect(result.reconciliation.filter((r) => r.label.startsWith('Recurring pay')).every((r) => r.ok)).toBe(true);
  });
});

describe('Oracle HCM target (HDL)', () => {
  const { result, settings } = runFor(ORACLE_HCM);

  it('builds deterministic SourceSystemIds and links children to the person', () => {
    const w = file(result, 'Worker');
    w.rows.forEach((r) => expect(r.SourceSystemId).toBe(`PER_${r.PersonNumber}`));
    file(result, 'PersonName').rows.forEach((r) => expect(r['PersonId(SourceSystemId)']).toMatch(/^PER_/));
    // Same input, same IDs: a reload updates the same records.
    expect(runFor(ORACLE_HCM).result.files.find((f) => f.entity.id === 'Worker').rows.map((r) => r.SourceSystemId)).toEqual(w.rows.map((r) => r.SourceSystemId));
  });

  it('writes assignment history as contiguous date-effective rows in date order', () => {
    const rows = file(result, 'Assignment').rows;
    const byPerson = {};
    rows.forEach((r) => (byPerson[r.SourceSystemId] ||= []).push(r));
    const multi = Object.values(byPerson).filter((rs) => rs.length > 1);
    expect(multi.length).toBeGreaterThan(0);
    for (const rs of Object.values(byPerson)) {
      for (let i = 0; i < rs.length - 1; i++) {
        const start = rs[i + 1].EffectiveStartDate.replace(/\//g, '-');
        expect(rs[i].EffectiveStartDate <= rs[i + 1].EffectiveStartDate).toBe(true);
        expect(rs[i].EffectiveEndDate).toBe(dayBefore(start).replace(/-/g, '/'));
      }
      expect(rs[0].ActionCode).toBe(settings.hdlHireAction);
    }
    expect(rows.some((r) => r.EffectiveEndDate === '4712/12/31')).toBe(true);
  });

  it('writes HDL METADATA and MERGE lines, escaping pipes, with Worker before its children', () => {
    const g = packages(result, ORACLE_HCM).find((x) => x.name === 'Worker.dat');
    const text = hdlText(g.files);
    const lines = text.split('\r\n').filter(Boolean);
    expect(lines[0]).toMatch(/^METADATA\|Worker\|SourceSystemOwner\|SourceSystemId\|/);
    expect(lines.indexOf(lines.find((l) => l.startsWith('METADATA|Assignment|')))).toBeGreaterThan(lines.indexOf(lines.find((l) => l.startsWith('METADATA|WorkTerms|'))));
    expect(hdlText([{ entity: { component: 'X', fields: [{ id: 'A' }] }, rows: [{ A: 'a|b' }] }])).toContain('MERGE|X|a\\|b');
    const names = packages(result, ORACLE_HCM).map((x) => x.name);
    expect(names.indexOf('Location.dat')).toBeLessThan(names.indexOf('Worker.dat'));
    expect(names.indexOf('Worker.dat')).toBeLessThan(names.indexOf('Salary.dat'));
  });

  it('only terminates leavers, in a separate load', () => {
    // Leavers: a termination date, or marked inactive (a missing date is then reported as an error).
    const leavers = result.data.people.filter((p) => p.values.termination_date || p.values.status === 'inactive').length;
    expect(file(result, 'WorkRelationshipTermination')?.rows.length || 0).toBe(leavers);
    expect(readme(result, ORACLE_HCM, settings)).toContain('hdl_terminations/Worker.dat');
  });

  it('reconciles salary totals even though HDL salaries carry no currency', () => {
    const sal = result.reconciliation.find((r) => r.label === 'Salary');
    expect(sal).toBeTruthy();
    expect(sal.ok).toBe(true);
  });
});

describe('Salesforce target (preview)', () => {
  const { result, settings } = runFor(SALESFORCE);

  it('loads employees first, then links managers by external ID', () => {
    const emp = file(result, 'Employee');
    const mgr = file(result, 'Employee_Managers');
    expect(emp.order).toBeLessThan(mgr.order);
    expect(mgr.rows.length).toBe(result.data.people.filter((p) => (result.data.jobsFor.get(p.id) || []).some((j) => j.values.manager_id) || p.values.manager_id).length);
    mgr.rows.forEach((r) => expect(r['Manager__r.EmployeeNumber']).toBeTruthy());
    // Bulk API: a single header row of API names.
    expect(fileRows(emp, { ...settings, labelRow: true }, SALESFORCE)[1]).not.toEqual(emp.entity.fields.map((f) => f.label));
  });
});

describe('source packs', () => {
  it('maps SuccessFactors and Oracle column names without help', () => {
    const sheets = [
      sourceFromRows('sf_export', [{ 'person-id-external': 'E1', FIRSTNAME: 'Ana', LASTNAME: 'Ruiz', 'start-date': '2020-01-01' }]),
      sourceFromRows('oracle_export', [{ PersonNumber: 'E2', FirstName: 'Raj', LastName: 'Iyer', TownOrCity: 'Pune', LegalEmployerName: 'Acme India' }]),
    ];
    const mapping = mapSheets(sheets);
    const conceptOf = (i, name) => mapping[sheets[i].id][sheets[i].columns.find((c) => c.name === name).key]?.concept;
    expect(conceptOf(0, 'person-id-external')).toBe('employee_id');
    expect(conceptOf(0, 'FIRSTNAME')).toBe('first_name');
    expect(conceptOf(1, 'PersonNumber')).toBe('employee_id');
    expect(conceptOf(1, 'TownOrCity')).toBe('city');
    expect(conceptOf(1, 'LegalEmployerName')).toBe('company_name');
  });
});

describe('settings the target needs', () => {
  it('reports a missing business unit once, and not at all once it is set', () => {
    const sheets = buildWorkdaySample();
    const mapping = mapSheets(sheets);
    const base = { ...settingsFor(ORACLE_HCM), asOf: '2026-09-27' };
    const missing = runMigration(ORACLE_HCM, sheets, mapping, base, {}).issues.filter((i) => i.field === 'hdlBusinessUnit' || i.field === 'BusinessUnitShortCode');
    expect(missing).toHaveLength(1);
    expect(missing[0].message).toContain('Settings');
    const set = runMigration(ORACLE_HCM, sheets, mapping, { ...base, hdlBusinessUnit: 'UK_BU' }, {});
    expect(set.issues.some((i) => i.field === 'hdlBusinessUnit' || i.field === 'BusinessUnitShortCode')).toBe(false);
    expect(set.counts.error).toBeLessThan(10);
  });
});
