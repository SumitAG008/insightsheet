import { describe, expect, it } from 'vitest';
import { buildArticles, groupByCategory, headingsOf, neighbours, parseArticle, searchArticles, formatUpdated } from './articles';

const doc = (title, category, order, body = 'Intro.\n\n## First step\n\nDo it.') =>
  `---\ntitle: ${title}\nsummary: About ${title}\ncategory: ${category}\norder: ${order}\nupdated: 2026-10-05\n---\n\n${body}\n`;

describe('help articles', () => {
  it('parses frontmatter and body', () => {
    const a = parseArticle(doc('Map fields', 'Migration', 2), '/help/migration/map-fields.md');
    expect(a).toMatchObject({ slug: 'map-fields', title: 'Map fields', category: 'migration', categoryName: 'Migration', order: 2, updated: '2026-10-05' });
    expect(a.body.startsWith('Intro.')).toBe(true);
    expect(a.headings).toEqual([{ text: 'First step', id: 'first-step' }]);
  });

  it('skips files without frontmatter or with an unknown category', () => {
    expect(parseArticle('# Staff notes', '/help/README.md')).toBeNull();
    expect(parseArticle(doc('X', 'Nowhere', 1), '/help/x.md')).toBeNull();
  });

  it('ignores headings inside code blocks and strips formatting', () => {
    expect(headingsOf('## **Bold** step\n```\n## not a heading\n```\n## [Link](/x) here')).toEqual([
      { text: 'Bold step', id: 'bold-step' },
      { text: 'Link here', id: 'link-here' },
    ]);
  });

  it('sorts by category then order, groups and finds neighbours', () => {
    const list = buildArticles({
      '/help/migration/b.md': doc('Second', 'Migration', 2),
      '/help/migration/a.md': doc('First', 'Migration', 1),
      '/help/getting-started/w.md': doc('Welcome', 'Getting started', 1),
    });
    expect(list.map((a) => a.slug)).toEqual(['w', 'a', 'b']);
    expect(groupByCategory(list).map((g) => [g.id, g.articles.length])).toEqual([['getting-started', 1], ['migration', 2]]);
    expect(neighbours(list, 'a')).toMatchObject({ prev: { slug: 'w' }, next: { slug: 'b' } });
  });

  it('ranks title matches above body matches and needs every word', () => {
    const list = buildArticles({
      '/help/migration/a.md': doc('Export files', 'Migration', 1, 'Load into SuccessFactors.'),
      '/help/migration/b.md': doc('Map fields', 'Migration', 2, 'Then export the result.'),
    });
    expect(searchArticles(list, 'export').map((a) => a.slug)).toEqual(['a', 'b']);
    expect(searchArticles(list, 'export successfactors').map((a) => a.slug)).toEqual(['a']);
    expect(searchArticles(list, ' ')).toEqual([]);
  });

  it('formats the updated date', () => {
    expect(formatUpdated('2026-10-05')).toBe('5 October 2026');
    expect(formatUpdated('')).toBe('');
  });
});
