import { describe, expect, it } from 'vitest';
import { baseName, safePdfName, timestamp } from './pdfNaming';

describe('pdf download names', () => {
  it('keeps the uploaded name and adds a timestamp', () => {
    const d = new Date(2026, 9, 1, 9, 5, 7);
    expect(`${baseName('Network Agreement v2.pdf')}_${timestamp(d)}`).toBe('Network Agreement v2_20261001_090507');
    expect(baseName('scan.JPG')).toBe('scan');
  });

  it('uses the typed name, safely, and always ends in .pdf', () => {
    expect(safePdfName('Signed agreement', 'x')).toBe('Signed agreement.pdf');
    expect(safePdfName('Signed agreement.PDF', 'x')).toBe('Signed agreement.pdf');
    expect(safePdfName('a/b:c*?"<>|', 'x')).toBe('a_b_c______.pdf');
    expect(safePdfName('   ', 'fallback_20261001_090507')).toBe('fallback_20261001_090507.pdf');
  });
});
