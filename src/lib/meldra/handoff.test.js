import { describe, it, expect } from 'vitest';
import { accepts, peekHandoff, setHandoff, takeHandoff } from './handoff';

const file = (name, type = '') => ({ name, type });

describe('Ask Meldra handoff', () => {
  it('is delivered once, only to the page it was meant for (any letter case)', () => {
    setHandoff({ path: '/FileToPPT', toolTitle: 'Excel to PowerPoint', files: [file('sales.xlsx')], instruction: '' });
    expect(peekHandoff('/Reconciliation')).toBeNull();
    expect(peekHandoff('/filetoppt')?.toolTitle).toBe('Excel to PowerPoint');
    expect(takeHandoff('/FileToPPT').files[0].name).toBe('sales.xlsx');
    expect(takeHandoff('/FileToPPT')).toBeNull();
  });

  it('matches files to an upload box by its accept list', () => {
    expect(accepts({ accept: '.csv,.xlsx' }, file('Bank.XLSX'))).toBe(true);
    expect(accepts({ accept: '.csv,.xlsx' }, file('scan.pdf'))).toBe(false);
    expect(accepts({ accept: 'image/*' }, file('a.png', 'image/png'))).toBe(true);
    expect(accepts({ accept: 'application/pdf' }, file('a.pdf', 'application/pdf'))).toBe(true);
    expect(accepts({ accept: '' }, file('anything.zip'))).toBe(true);
  });
});
