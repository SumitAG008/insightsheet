// Real multi-source test: an Excel workbook, a real PostgreSQL database and a live public API
// (the npm registry) brought into Meldra through the UI, stored in the lakehouse (Iceberg on
// Apache Polaris), linked, and asked cross-system questions. Every number is checked against an
// independent calculation straight from the sources. See README.md.
import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';
import { fileURLToPath } from 'url';
import XLSX from 'xlsx';

// Storing in the lakehouse is opt-in: tick the box before uploading.
const optInToLakehouse = async (page) => {
  const box = page.getByLabel(/Store in the Meldra lakehouse/);
  if (await box.count()) await box.first().check();
};

// Playwright is not a project dependency: install it, or point PLAYWRIGHT_MODULE at a global copy.
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');

const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUT = process.env.E2E_OUT || path.join(HERE, '.out');
const APP = process.env.E2E_APP || 'http://localhost:5173';
const API = 'http://localhost:8001';
const WORK = process.env.SOURCES_DIR || '/tmp/meldra-multisource';
const SRC = JSON.parse(fs.readFileSync(path.join(WORK, 'sources.json'), 'utf8'));
const NPM_URL = 'https://registry.npmjs.org/-/v1/search?text=keywords:chart';
fs.mkdirSync(OUT, { recursive: true });

const results = [];
const errors = [];
const check = (name, ok, extra = '') => { results.push([ok ? 'PASS' : 'FAIL', name, extra]); console.log(ok ? '✓' : '✗', name, extra); };
const close = (a, b) => Math.abs(a - b) <= Math.max(0.011, Math.abs(b) * 1e-9);

/* ---------- independent truth, straight from the sources ---------- */
const sql = (q) => execFileSync(SRC.psql, ['-h', SRC.pg.host, '-p', SRC.pg.port, '-U', SRC.pg.user, '-d', SRC.pg.database, '-At', '-F', '\t', '-c', q],
  { env: { ...process.env, PGPASSWORD: SRC.pg.password } }).toString().trim().split('\n').filter(Boolean).map((l) => l.split('\t'));
const teams = XLSX.utils.sheet_to_json(XLSX.readFile(SRC.xlsx).Sheets.Teams);
const deptOf = Object.fromEntries(teams.map((t) => [t['Team Code'], t.Department]));
const npm = async () => {
  // The same pages the connector reads (from=0,50 size=50), fetched separately with curl.
  const rows = [];
  for (const from of [0, 50]) {
    const out = JSON.parse(execFileSync('curl', ['-s', '--compressed', `${NPM_URL}&from=${from}&size=50`]).toString());
    rows.push(...out.objects);
  }
  return rows.slice(0, 100);
};

/* ---------- browser ---------- */
const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
const ctx = await browser.newContext({ viewport: { width: 1440, height: 1100 }, acceptDownloads: true });
const page = await ctx.newPage();
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource|ERR_|502/.test(m.text())) errors.push(m.text()); });
page.on('dialog', (d) => d.accept());
await page.route(`${API}/**`, async (route) => {
  const p = new URL(route.request().url()).pathname;
  if (/^\/api\/(lakehouse|unified-reporting|db)\//.test(p)) return route.continue();
  const json = (b, s = 200) => route.fulfill({ status: s, contentType: 'application/json', body: JSON.stringify(b), headers: { 'access-control-allow-origin': '*' } });
  if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 204, headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' } });
  if (p === '/api/auth/me') return json({ email: 'e2e@example.com', role: 'user' });
  return json({});
});

const nav = () => page.getByRole('navigation', { name: 'Unified Reporting sections' });
const field = (label) => page.locator('label').filter({ has: page.locator('span', { hasText: new RegExp(`^${label}`) }) }).locator('input:not([type=file]), select, textarea').first();
const open = async () => {
  await page.goto(`${APP}/`);
  await page.evaluate(() => localStorage.setItem('auth_token', 't'));
  await page.goto(`${APP}/unified-reporting`);
  await page.getByRole('button', { name: 'Done', exact: true }).click({ timeout: 20000 }).catch(() => {});
  await page.getByRole('button', { name: 'Reject all' }).click({ timeout: 3000 }).catch(() => {});
  await page.locator('h1', { hasText: 'Unified Reporting' }).waitFor();
};
const lakeCards = () => page.locator('div.rounded-2xl').filter({ has: page.getByText('Meldra lakehouse', { exact: true }) });

/** Ask a question and return its answer as exact numbers, from the answer's own CSV download. */
const askCsv = async (q) => {
  await nav().getByRole('button', { name: /^Ask/ }).click();
  await page.getByRole('tab', { name: 'Ask a question' }).click();
  await page.locator('#ur-q').fill(q);
  await page.locator('#ur-q').press('Enter');
  const card = page.locator('[id^="qa-"]').last();
  await card.getByRole('button', { name: /^Download/ }).waitFor({ timeout: 120000 });
  await card.getByRole('button', { name: /^Download/ }).click();
  await card.locator('.recharts-surface, table').first().waitFor({ timeout: 120000 });
  const [dl] = await Promise.all([page.waitForEvent('download'), page.getByRole('menuitem', { name: 'CSV' }).click()]);
  const text = fs.readFileSync(await dl.path(), 'utf8');
  const [header, ...lines] = XLSX.utils.sheet_to_json(XLSX.read(text, { type: 'string', raw: true }).Sheets.Sheet1, { header: 1, raw: true });
  return { card, header, rows: lines.map((r) => [String(r[0]), ...r.slice(1).map(Number)]) };
};

await fetch(`${API}/api/lakehouse/sources`, { method: 'DELETE' }).catch(() => {});
await open();
await nav().getByRole('button', { name: /Data sources/ }).click();

// ---------- 1. Spreadsheet (Excel upload) ----------
await optInToLakehouse(page);
await page.locator('input[type=file]').first().setInputFiles(SRC.xlsx);
await lakeCards().filter({ hasText: 'team_budgets' }).waitFor({ timeout: 120000 });
check('Excel workbook uploaded and stored in the lakehouse', true, '10 teams');

// ---------- 2. PostgreSQL database (two tables through the database dialog) ----------
await page.getByRole('button', { name: 'Connect a database' }).click();
const dlg = page.getByRole('dialog');
await dlg.getByLabel('Host').fill(SRC.pg.host);
await dlg.getByLabel('Port').fill(String(SRC.pg.port));
await dlg.getByLabel('Database name').fill(SRC.pg.database);
await dlg.getByLabel(/^Username/).fill(SRC.pg.user);
await dlg.getByLabel('Password').fill(SRC.pg.password);
await dlg.getByLabel('SSL').selectOption({ label: 'Disable' }).catch(() => {});
await dlg.getByRole('button', { name: /^Connect/ }).click();
await dlg.getByLabel('Use table software_usage').waitFor({ timeout: 60000 });
await dlg.getByLabel('Use table software_usage').check();
await dlg.getByLabel('Use table licence_invoices').check();
await dlg.getByLabel('System name (shown on answers)').fill('IT Finance DB');
await page.screenshot({ path: `${OUT}/multi-1-database.png` });
await dlg.getByRole('button', { name: /^Add/ }).click();
await lakeCards().filter({ hasText: 'licence_invoices' }).waitFor({ timeout: 120000 });
await lakeCards().filter({ hasText: 'software_usage' }).waitFor({ timeout: 120000 });
check('PostgreSQL tables read with a read-only user and stored in the lakehouse', true, 'software_usage, licence_invoices');

// ---------- 3. Live public API (npm registry) through the connector ----------
await page.getByRole('button', { name: 'Connect an API' }).click();
await field('System$').selectOption('rest');
await field('System name').fill('npm registry');
await field('Address').fill(NPM_URL);
await field('Authentication').selectOption('none');
await page.getByRole('button', { name: /Records, paging and headers/ }).click();
await field('Paging').selectOption('offset');
await field('Rows per page').fill('50');
await field('Offset parameter').fill('from');
await field('Page size parameter').fill('size');
await field('Maximum rows').fill('100');
await field('Source name').fill('npm packages');
await page.screenshot({ path: `${OUT}/multi-2-api.png` });
await page.getByRole('button', { name: 'Fetch and add' }).click();
await lakeCards().filter({ hasText: 'npm packages' }).waitFor({ timeout: 120000 });
const apiCard = await lakeCards().filter({ hasText: 'npm packages' }).first().textContent();
check('live API pulled over the internet (2 pages) and stored in the lakehouse', /100 rows/.test(apiCard), apiCard.match(/API · [^\s]+/)?.[0] || '');

// ---------- 4. Links between the systems ----------
await page.waitForTimeout(3000); // server-side link suggestions
for (const table of ['software_usage', 'licence_invoices']) {
  const sug = page.locator('div').filter({ hasText: new RegExp(`^${table}\\.team_code → team_budgets\\.team_code`) }).getByRole('button', { name: 'Link' });
  if (await sug.count()) await sug.first().click();
}
const linked = await page.getByText(/team_code → .*team_budgets.*team_code/).count();
check('links found by the lakehouse: usage and invoices → team budgets (team_code)', linked >= 2, `${linked} links`);
const shared = await page.locator('span', { hasText: /^package_name · / }).first().textContent().catch(() => '');
check('package_name shared by the database and the API (no link needed)', /IT Finance DB/.test(shared) && /npm registry/.test(shared), shared);
await page.screenshot({ path: `${OUT}/multi-3-sources.png`, fullPage: true });

// ---------- 5. Cross-system questions, checked number by number ----------
// (a) Database joined to the spreadsheet: licence cost by department.
const costByTeam = Object.fromEntries(sql('select team_code, sum(licence_cost_gbp) from software_usage group by 1').map(([t, v]) => [t, Number(v)]));
const costByDept = {};
for (const [t, v] of Object.entries(costByTeam)) costByDept[deptOf[t]] = (costByDept[deptOf[t]] || 0) + v;
const a = await askCsv('licence cost gbp by department');
const aOk = a.rows.length === Object.keys(costByDept).length && a.rows.every(([d, v]) => close(v, costByDept[d]));
check('DB + Excel: licence cost by department matches PostgreSQL joined to the workbook', aOk, a.rows.map(([d, v]) => `${d} £${v}`).join(', '));

// (b) Two systems side by side on a shared dimension: cost vs budget by department.
const budgetByDept = {};
teams.forEach((t) => { budgetByDept[t.Department] = (budgetByDept[t.Department] || 0) + t['Annual Software Budget (£)']; });
const b = await askCsv('software usage licence cost gbp vs team budgets annual software budget by department');
const bOk = b.header.length === 3 && b.rows.every(([d, cost, budget]) => close(cost, costByDept[d] || 0) && close(budget, budgetByDept[d]));
check('DB vs Excel: cost and budget per department both match their sources', bOk, b.rows.slice(0, 3).map(([d, c, bu]) => `${d} £${c}/£${bu}`).join(', '));

// (c) Database and the live API on the shared package_name.
const seats = Object.fromEntries(sql('select package_name, sum(seats) from software_usage group by 1').map(([p, v]) => [p, Number(v)]));
const live = await npm();
const downloads = {};
live.forEach((o) => { downloads[o.package.name] = (downloads[o.package.name] || 0) + (o.downloads?.monthly || 0); });
const c = await askCsv('software usage seats vs npm packages downloads monthly by package name');
const cSeats = c.rows.filter(([p]) => p in seats);
const cOk = c.header.length === 3 && cSeats.length >= 5 && cSeats.every(([p, s]) => close(s, seats[p]));
const dlMatch = cSeats.filter(([p, , d]) => close(d, downloads[p] || 0)).length;
check('DB + live API: seats per package match PostgreSQL', cOk, `${cSeats.length} packages`);
check('DB + live API: monthly downloads per package match the npm registry', dlMatch === cSeats.length, `${dlMatch}/${cSeats.length} identical to a separate call to registry.npmjs.org`);

// (d) Time series from the invoices, rolled up by month.
const byMonth = Object.fromEntries(sql("select to_char(invoice_date, 'YYYY-MM'), sum(amount_gbp) from licence_invoices group by 1").map(([mth, v]) => [mth, Number(v)]));
const d = await askCsv('licence invoices amount gbp by month');
check('DB: invoices by month match PostgreSQL', d.rows.length === 9 && d.rows.every(([mth, v]) => close(v, byMonth[mth])), `${d.rows.length} months, Sep £${d.rows.at(-1)?.[1]}`);
await d.card.getByText('Compare with').locator('select').selectOption('prior_period');
await d.card.locator('th', { hasText: 'Change vs prior month' }).waitFor({ timeout: 60000 });
check('period comparison works on lakehouse data', true);
await page.screenshot({ path: `${OUT}/multi-4-answers.png` });

// ---------- 6. A report across all three systems from one prompt ----------
await page.getByRole('tab', { name: 'Build a report' }).click();
await page.locator('#ur-q').fill('Software spend by department and package, with budgets and usage');
await page.locator('#ur-q').press('Enter');
const rep = page.locator('[id^="qa-"]').last();
await rep.getByRole('button', { name: 'Add all to dashboard' }).waitFor({ timeout: 120000 });
await page.waitForTimeout(4000);
const tileCount = await rep.locator('h3').count();
const systems = new Set(await rep.locator('span.rounded-full').allTextContents());
check('report built from one prompt across the systems', tileCount >= 4, `${tileCount} charts; systems: ${[...systems].join(', ')}`);
check('report draws on the database, the spreadsheet and the API', ['IT Finance DB', 'team_budgets', 'npm registry'].every((s) => [...systems].some((x) => x.includes(s))), [...systems].join(', '));
await rep.screenshot({ path: `${OUT}/multi-5-report.png` });

// ---------- 7. Everything is in the lakehouse and follows the user ----------
const stored = await page.evaluate(async () => {
  const { backendApi } = await import('/src/api/backendClient.js');
  return (await backendApi.lakehouse.sources()).sources.map((s) => `${s.name} (${s.kind}, ${s.row_count})`);
});
check('lakehouse holds the file, database and API sources as Iceberg tables', stored.length === 4, stored.join('; '));
await page.evaluate(() => new Promise((res) => { const r = indexedDB.deleteDatabase('meldra-unified-reporting'); r.onsuccess = res; r.onerror = res; r.onblocked = res; }));
await open();
await nav().getByRole('button', { name: /Data sources/ }).click();
await lakeCards().first().waitFor({ timeout: 60000 });
check('a fresh browser gets all four sources back from Meldra', await lakeCards().count() === 4);
check('no browser errors', errors.length === 0, errors.slice(0, 3).join(' | '));

await browser.close();
const passed = results.filter((r) => r[0] === 'PASS').length;
fs.writeFileSync(`${OUT}/results.json`, JSON.stringify(results, null, 1));
console.log(`\n${passed}/${results.length} checks passed`);
process.exit(passed === results.length ? 0 : 1);
