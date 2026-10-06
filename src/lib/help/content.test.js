import { describe, expect, it } from 'vitest';
import { ARTICLES } from './content';
import { CATEGORIES } from './articles';

const files = import.meta.glob('/help/**/*.md', { query: '?raw', import: 'default', eager: true });

describe('help centre content', () => {
  it('loads every article file (all but the staff README)', () => {
    const articleFiles = Object.keys(files).filter((p) => !/\/README\.md$/i.test(p));
    expect(ARTICLES.length).toBe(articleFiles.length);
    expect(ARTICLES.length).toBeGreaterThan(0);
  });

  it('keeps each article in the folder of its category, with a summary and date', () => {
    for (const a of ARTICLES) {
      const path = Object.keys(files).find((p) => p.endsWith(`/${a.slug}.md`));
      expect(path, a.slug).toContain(`/help/${a.category}/`);
      expect(a.summary, a.slug).not.toBe('');
      expect(a.updated, a.slug).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
    expect(new Set(ARTICLES.map((a) => a.category)).size).toBe(CATEGORIES.length);
  });

  it('only links to articles that exist', () => {
    const slugs = new Set(ARTICLES.map((a) => a.slug));
    for (const a of ARTICLES) {
      for (const [, slug] of a.body.matchAll(/\]\(\/help\/([a-z0-9-]+)/g)) {
        expect(slugs.has(slug), `${a.slug} links to /help/${slug}`).toBe(true);
      }
    }
  });
});
