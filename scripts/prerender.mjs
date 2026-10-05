// After `vite build`: give every public page its own HTML with the right title, description and
// link-preview tags, plus a plain-text version of the page in <noscript> for search engines and
// tools that do not run JavaScript. vercel.json serves these files for the matching paths; the app
// itself loads exactly as before. Run automatically by `npm run build`.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PUBLIC_PAGES, headTags } from '../src/lib/seo.js';

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

function render(path) {
  const page = PUBLIC_PAGES[path];
  const head = template.slice(0, template.indexOf(HEAD_START) + HEAD_START.length) +
    '\n    ' + headTags(path) + '\n    ' + template.slice(template.indexOf(HEAD_END));
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
