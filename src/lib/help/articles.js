// Help Center articles: one Markdown file per article under help/<category>/<slug>.md, with a small
// frontmatter block (title, summary, category, order, updated). This file only parses and organises
// them, with no Vite or browser imports, so the build step (scripts/prerender.mjs) can use it in Node
// to write a search-engine-readable page for every article.

export const CATEGORIES = [
  {
    id: 'getting-started',
    name: 'Getting started',
    description: 'What meldra Insight does, how to sign up and how your data is handled.',
  },
  {
    id: 'unified-reporting',
    name: 'Unified Reporting',
    description: 'Combine exports, databases and APIs, ask questions in plain English and build dashboards.',
  },
  {
    id: 'migration',
    name: 'Migration',
    description: 'Turn a legacy HR extract into load-ready SAP SuccessFactors files, cycle after cycle.',
  },
  {
    id: 'account-and-billing',
    name: 'Account and billing',
    description: 'Plans, limits, usage, and team and organisation licences.',
  },
];

const CATEGORY_BY_NAME = new Map(CATEGORIES.map((c) => [c.name.toLowerCase(), c]));

const slugFromPath = (path) => String(path).split('/').pop().replace(/\.md$/i, '');

/** Parse one article file. Returns null for files without frontmatter (such as help/README.md). */
export function parseArticle(raw, path) {
  const text = String(raw ?? '').replace(/^\uFEFF/, '').replace(/\r\n/g, '\n');
  const m = text.match(/^---\n([\s\S]*?)\n---\n?/);
  if (!m) return null;
  const meta = {};
  for (const line of m[1].split('\n')) {
    const i = line.indexOf(':');
    if (i < 1) continue;
    meta[line.slice(0, i).trim().toLowerCase()] = line.slice(i + 1).trim().replace(/^["']|["']$/g, '');
  }
  const category = CATEGORY_BY_NAME.get(String(meta.category || '').toLowerCase());
  if (!meta.title || !category) return null;
  const body = text.slice(m[0].length).trim();
  return {
    slug: slugFromPath(path),
    title: meta.title,
    summary: meta.summary || '',
    category: category.id,
    categoryName: category.name,
    order: Number(meta.order) || 999,
    updated: /^\d{4}-\d{2}-\d{2}$/.test(meta.updated || '') ? meta.updated : '',
    body,
    headings: headingsOf(body),
  };
}

/** The ## headings of an article, for the "On this page" list. Ids match the article page's anchors. */
export function headingsOf(body) {
  const out = [];
  let fenced = false;
  for (const line of String(body).split('\n')) {
    if (/^\s*```/.test(line)) fenced = !fenced;
    if (fenced) continue;
    const h = line.match(/^##\s+(.+?)\s*#*\s*$/);
    if (h) out.push({ text: plainText(h[1]), id: anchorId(plainText(h[1])) });
  }
  return out;
}

export const plainText = (s) => String(s).replace(/[*_`]/g, '').replace(/\[([^\]]+)\]\([^)]*\)/g, '$1').trim();

export const anchorId = (s) => String(s).toLowerCase().replace(/[^a-z0-9\s-]/g, '').trim().replace(/\s+/g, '-');

/** All articles from { path: raw } pairs, sorted by category then order. */
export function buildArticles(files) {
  const seen = new Set();
  const list = [];
  for (const [path, raw] of Object.entries(files)) {
    const a = parseArticle(raw, path);
    if (!a || seen.has(a.slug)) continue;
    seen.add(a.slug);
    list.push(a);
  }
  const catIndex = (id) => CATEGORIES.findIndex((c) => c.id === id);
  return list.sort((a, b) => catIndex(a.category) - catIndex(b.category) || a.order - b.order || a.title.localeCompare(b.title));
}

/** Articles grouped by category, in category order; empty categories are left out. */
export function groupByCategory(articles) {
  return CATEGORIES.map((c) => ({ ...c, articles: articles.filter((a) => a.category === c.id) })).filter((c) => c.articles.length);
}

/** Simple ranked search: title matches first, then summary, then body. */
export function searchArticles(articles, query) {
  const words = String(query || '').toLowerCase().split(/\s+/).filter((w) => w.length > 1);
  if (!words.length) return [];
  const scored = [];
  for (const a of articles) {
    const title = a.title.toLowerCase();
    const summary = a.summary.toLowerCase();
    const body = a.body.toLowerCase();
    let score = 0;
    for (const w of words) {
      if (title.includes(w)) score += 6;
      else if (summary.includes(w)) score += 3;
      else if (body.includes(w)) score += 1;
      else { score = 0; break; }
    }
    if (score) scored.push({ a, score });
  }
  return scored.sort((x, y) => y.score - x.score).map((x) => x.a);
}

/** The articles before and after this one in reading order. */
export function neighbours(articles, slug) {
  const i = articles.findIndex((a) => a.slug === slug);
  return { prev: i > 0 ? articles[i - 1] : null, next: i >= 0 && i < articles.length - 1 ? articles[i + 1] : null };
}

export function formatUpdated(iso) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-').map(Number);
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  return `${d} ${months.at(m - 1)} ${y}`;
}
