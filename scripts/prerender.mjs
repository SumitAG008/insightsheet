// After `vite build`: give every public page its own HTML with the right title, description and
// link-preview tags, plus a plain-text version of the page in <noscript> for search engines and
// tools that do not run JavaScript. vercel.json serves these files for the matching paths; the app
// itself loads exactly as before. Run automatically by `npm run build`.
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { PRODUCT, PUBLIC_PAGES, headTags } from '../src/lib/seo.js';
import { buildArticles, groupByCategory } from '../src/lib/help/articles.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist');
const template = readFileSync(join(dist, 'index.html'), 'utf8');

const HEAD_START = '<!-- seo:head -->';
const HEAD_END = '<!-- /seo:head -->';
if (!template.includes(HEAD_START) || !template.includes(HEAD_END)) {
  throw new Error('index.html is missing the <!-- seo:head --> markers');
}

const noscriptStyle =
  'font-family:Inter,system-ui,sans-serif;max-width:860px;margin:32px auto;padding:0 16px;line-height:1.6;color:#02161A';

function render(path, page = PUBLIC_PAGES[path]) {
  const head = template.slice(0, template.indexOf(HEAD_START) + HEAD_START.length) +
    '\n    ' + headTags(path, page) + '\n    ' + template.slice(template.indexOf(HEAD_END));
  return head.replace(
    '<div id="root"></div>',
    `<div id="root"></div>\n    <noscript><div style="${noscriptStyle}">${page.body()}</div></noscript>`,
  );
}

mkdirSync(join(dist, 'seo'), { recursive: true });
for (const path of Object.keys(PUBLIC_PAGES)) {
  const html = render(path);
  writeFileSync(join(dist, 'seo', `${PUBLIC_PAGES[path].file}.html`), html);
  if (path === '/') writeFileSync(join(dist, 'index.html'), html); // the home page is index.html itself
}
console.log(`prerender: wrote ${Object.keys(PUBLIC_PAGES).length} public pages to dist/seo/`);

// Help Center: the index and one page per article (help/<category>/<slug>.md).
const esc = (t) => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const helpRoot = join(root, 'help');
const mdFiles = (dir) => readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? mdFiles(join(dir, e.name)) : e.name.endsWith('.md') ? [join(dir, e.name)] : []));
let helpFiles = {};
try {
  helpFiles = Object.fromEntries(mdFiles(helpRoot).map((f) => ['/' + relative(root, f).split('\\').join('/'), readFileSync(f, 'utf8')]));
} catch {
  helpFiles = {};
}
const articles = buildArticles(helpFiles);
mkdirSync(join(dist, 'seo', 'help'), { recursive: true });
const helpIndex = {
  title: `Help Center | ${PRODUCT}`,
  description: `Step-by-step guides for ${PRODUCT}: Unified Reporting, Migration, plans and team licences.`,
  body: () => `<h1>${PRODUCT} Help Center</h1>` + groupByCategory(articles).map((g) =>
    `<h2>${esc(g.name)}</h2><p>${esc(g.description)}</p><ul>` +
    g.articles.map((a) => `<li><a href="/help/${a.slug}">${esc(a.title)}</a>: ${esc(a.summary)}</li>`).join('') + '</ul>').join(''),
};
writeFileSync(join(dist, 'seo', 'help.html'), render('/help', helpIndex));
for (const a of articles) {
  const page = {
    title: `${a.title} | ${PRODUCT} Help`,
    description: a.summary || helpIndex.description,
    body: () => `<p><a href="/help">Help Center</a> / ${esc(a.categoryName)}</p><h1>${esc(a.title)}</h1><p>${esc(a.summary)}</p>` +
      renderToStaticMarkup(createElement(Markdown, { remarkPlugins: [remarkGfm] }, a.body)),
  };
  writeFileSync(join(dist, 'seo', 'help', `${a.slug}.html`), render(`/help/${a.slug}`, page));
}
console.log(`prerender: wrote the Help Center and ${articles.length} help articles to dist/seo/help/`);
