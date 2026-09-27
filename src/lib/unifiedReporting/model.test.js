import { describe, expect, it } from 'vitest';
import { refreshSource, suggestRelationships, relationshipsFromForeignKeys, selectAll, sourceFromTable } from './model';

const origin = (table) => ({ type: 'database', dbType: 'postgresql', database: 'hr', table, query: selectAll('postgresql', table) });

describe('database sources', () => {
  it('builds a source from a query result, keeping column order', () => {
    const s = sourceFromTable('employees', ['emp_id', 'dept', 'salary'], [{ emp_id: 1, dept: 'Sales', salary: 100 }, { emp_id: 2, dept: 'HR', salary: 90 }], 'HR DB', origin('employees'));
    expect(s.kind).toBe('database');
    expect(s.system).toBe('HR DB');
    expect(s.origin.table).toBe('employees');
    expect(s.columns.map((c) => c.name)).toEqual(['emp_id', 'dept', 'salary']);
    expect(s.rows).toHaveLength(2);
    expect(s.refreshedAt).toBeTruthy();
  });

  it('keeps column roles and renamed join keys on refresh', () => {
    const s = sourceFromTable('employees', ['emp_id', 'dept', 'salary'], [{ emp_id: 1, dept: 'Sales', salary: 100 }], 'HR', origin('employees'));
    const dept = s.columns.find((c) => c.name === 'dept');
    const salary = s.columns.find((c) => c.name === 'salary');
    const edited = {
      ...s,
      columns: s.columns.map((c) => (c === dept ? { ...c, key: 'department' } : c === salary ? { ...c, role: 'ignore' } : c)),
    };
    const r = refreshSource(edited, ['emp_id', 'dept', 'salary', 'grade'], [{ emp_id: 1, dept: 'Sales', salary: 100, grade: 'A' }, { emp_id: 3, dept: 'Ops', salary: 80, grade: 'B' }]);
    expect(r.id).toBe(s.id);
    expect(r.rows).toHaveLength(2);
    expect(r.columns.find((c) => c.name === 'dept').key).toBe('department');
    expect(r.rows[1].department).toBe('Ops');
    expect(r.rows[1].dept).toBeUndefined();
    expect(r.columns.find((c) => c.name === 'salary').role).toBe('ignore');
    expect(r.columns.some((c) => c.name === 'grade')).toBe(true);
  });

  it('turns foreign keys into links between the added tables', () => {
    const emp = sourceFromTable('employees', ['emp_id', 'dept_id'], [{ emp_id: 1, dept_id: 10 }], 'HR', origin('employees'));
    const dept = sourceFromTable('departments', ['id', 'name'], [{ id: 10, name: 'Sales' }], 'HR', origin('departments'));
    const links = relationshipsFromForeignKeys([
      { fromTable: 'employees', fromColumn: 'dept_id', toTable: 'departments', toColumn: 'id' },
      { fromTable: 'employees', fromColumn: 'manager_id', toTable: 'employees', toColumn: 'emp_id' },
      { fromTable: 'payroll', fromColumn: 'emp_id', toTable: 'employees', toColumn: 'emp_id' },
    ], [emp, dept]);
    expect(links).toHaveLength(1);
    expect(links[0].from).toEqual({ source: emp.id, col: emp.columns[1].key });
    expect(links[0].to).toEqual({ source: dept.id, col: dept.columns[0].key });
  });

  it('quotes table names for each database', () => {
    expect(selectAll('postgresql', 'my "table"')).toBe('SELECT * FROM "my ""table"""');
    expect(selectAll('mysql', 'a`b')).toBe('SELECT * FROM `a``b`');
    expect(selectAll('mssql', 'a]b')).toBe('SELECT * FROM [a]]b]');
  });

  it('does not suggest a link that already exists the other way round', () => {
    const emp = sourceFromTable('employees', ['emp_id', 'dept'], [{ emp_id: 1, dept: 'A' }, { emp_id: 2, dept: 'B' }, { emp_id: 3, dept: 'A' }], 'HR', origin('employees'));
    const exp = sourceFromTable('expenses', ['emp_id', 'amount'], [{ emp_id: 1, amount: 5 }, { emp_id: 2, amount: 6 }, { emp_id: 3, amount: 7 }], 'HR', origin('expenses'));
    expect(suggestRelationships([emp, exp], []).length).toBe(2);
    const fk = relationshipsFromForeignKeys([{ fromTable: 'expenses', fromColumn: 'emp_id', toTable: 'employees', toColumn: 'emp_id' }], [emp, exp]);
    expect(suggestRelationships([emp, exp], fk)).toEqual([]);
  });
});
