import { describe, expect, it } from 'vitest';
import JSZip from 'jszip';
import { cleanName, cleanPath, planRenames, DEFAULT_OPTIONS } from './filenameCleaning';
import { readArchive, writeRenamedArchive } from './zipRename';

describe('cleanName', () => {
  it('turns accents into plain letters and keeps the extension', () => {
    expect(cleanName('Übersicht März 2024.xlsx')).toBe('Ubersicht-Marz-2024.xlsx');
  });

  it('never leaves an empty name', () => {
    expect(cleanName('报告.pdf', DEFAULT_OPTIONS, { chinese: true })).toBe('file.pdf');
  });

  it('works with an empty or letter replacement character', () => {
    expect(cleanName('a  b.txt', { replacementCharacter: '' })).toBe('ab.txt');
    expect(cleanName('a  b.txt', { replacementCharacter: 'x' })).toBe('axb.txt');
    expect(cleanName('a  b.txt', { replacementCharacter: '.' })).toBe('a.b.txt');
  });

  it('applies custom find and replace rules', () => {
    expect(cleanName('Draft FINAL v2.docx', { customRules: [{ find: 'FINAL', replace: 'Final' }] })).toBe('Draft-Final-v2.docx');
  });

  it('keeps the extension within the length limit', () => {
    expect(cleanName(`${'a'.repeat(50)}.xlsx`, { maxLength: 20 })).toBe(`${'a'.repeat(15)}.xlsx`);
  });

  it('handles hidden files and names without an extension', () => {
    expect(cleanName('.env')).toBe('.env');
    expect(cleanName('README')).toBe('README');
  });
});

describe('cleanPath and planRenames', () => {
  it('cleans each folder separately so the structure is kept', () => {
    expect(cleanPath('Reports Q1/Übersicht/März.xlsx')).toBe('Reports-Q1/Ubersicht/Marz.xlsx');
    expect(cleanPath('My Folder.v2/')).toBe('My-Folder.v2/');
  });

  it('gives clashing names a number instead of overwriting', () => {
    const plan = planRenames(['Résumé.pdf', 'Resume.pdf', 'resume.pdf']);
    expect(plan.map((p) => p.processed)).toEqual(['Resume.pdf', 'Resume-2.pdf', 'resume-3.pdf']);
  });
});

describe('ZIP round trip', () => {
  it('renames entries and keeps contents, including archives with data descriptors', async () => {
    const src = new JSZip();
    src.file('Q1 Übersicht/März Bericht.txt', 'hello');
    src.file('Q1 Übersicht/Résumé.pdf', new Uint8Array([1, 2, 3]));
    src.file('__MACOSX/._x', 'junk');
    // streamFiles writes sizes in a trailing data descriptor (like macOS and Office do).
    const bytes = await src.generateAsync({ type: 'uint8array', compression: 'DEFLATE', streamFiles: true });

    const { zip, paths } = await readArchive(bytes);
    expect(paths).not.toContain('__MACOSX/._x');
    const plan = planRenames(paths);
    const out = await JSZip.loadAsync(await writeRenamedArchive(zip, plan, 'uint8array'));

    expect(await out.file('Q1-Ubersicht/Marz-Bericht.txt').async('string')).toBe('hello');
    expect(Array.from(await out.file('Q1-Ubersicht/Resume.pdf').async('uint8array'))).toEqual([1, 2, 3]);
    expect(out.file('__MACOSX/._x')).toBeNull();
  });
});
