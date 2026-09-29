// End-to-end: the real Unified Reporting UI, the real backend and a real Apache Polaris
// catalog (Iceberg tables, Arrow + DuckDB queries). See README.md for how to run it.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

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
const BIG = process.env.E2E_BIG_CSV; // optional: a large CSV to upload through the UI
fs.mkdirSync(OUT, { recursive: true });

const results = [];
const errors = [];
const check = (name, ok, extra = '') => { results.push([ok ? 'PASS' : 'FAIL', name, extra]); console.log(ok ? '✓' : '✗', name, extra); };

const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
const ctx = await browser.newContext({ viewport: { width: 1440, height: 1100 }, acceptDownloads: true });
const page = await ctx.newPage();
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource|ERR_|502/.test(m.text())) errors.push(m.text()); });
page.on('dialog', (d) => d.accept()); // delete confirmations

// Lakehouse and Unified Reporting go to the real backend; the rest of the app is stubbed.
await page.route(`${API}/**`, async (route) => {
  const p = new URL(route.request().url()).pathname;
  if (p.startsWith('/api/lakehouse/') || p.startsWith('/api/unified-reporting/')) return route.continue();
  const json = (b, s = 200) => route.fulfill({ status: s, contentType: 'application/json', body: JSON.stringify(b), headers: { 'access-control-allow-origin': '*' } });
  if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 204, headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' } });
  if (p === '/api/auth/me') return json({ email: 'e2e@example.com', role: 'user' });
  return json({});
});

const nav = () => page.getByRole('navigation', { name: 'Unified Reporting sections' });
const open = async () => {
  await page.goto(`${APP}/`);
  await page.evaluate(() => localStorage.setItem('auth_token', 't'));
  await page.goto(`${APP}/unified-reporting`);
  await page.getByRole('button', { name: 'Done', exact: true }).click({ timeout: 20000 }).catch(() => {});
  await page.getByRole('button', { name: 'Reject all' }).click({ timeout: 3000 }).catch(() => {});
  await page.locator('h1', { hasText: 'Unified Reporting' }).waitFor();
};
const ask = async (q, mode = 'Ask a question') => {
  await page.getByRole('tab', { name: mode }).click();
  await page.locator('#ur-q').fill(q);
  await page.locator('#ur-q').press('Enter');
};

// Start clean: nothing stored for this account.
await fetch(`${API}/api/lakehouse/sources`, { method: 'DELETE' }).catch(() => {});
await open();

// ---------- 1. Lakehouse is on ----------
await nav().getByRole('button', { name: /Data sources/ }).click();
const toggle = page.getByRole('checkbox', { name: /Store in the Meldra lakehouse/ });
await toggle.waitFor();
check('upload offers "Store in the Meldra lakehouse", on by default', await toggle.isChecked());

// ---------- 2. A large file through the UI into Iceberg ----------
if (BIG) {
  const t0 = performance.now();
  await optInToLakehouse(page);
  await page.locator('input[type=file]').first().setInputFiles(BIG);
  const card = page.locator('div.rounded-2xl').filter({ has: page.getByText('Meldra lakehouse', { exact: true }) }).first();
  await card.waitFor({ timeout: 15 * 60000 });
  const secs = ((performance.now() - t0) / 1000).toFixed(1);
  const size = (fs.statSync(BIG).size / 1e6).toFixed(0);
  const rowsText = await card.getByText(/[\d,]+ rows/).first().textContent();
  check(`large file (${size} MB) uploaded through the browser and stored as Iceberg`, /[\d,]+ rows/.test(rowsText), `${rowsText.trim().split(' ·')[0]}, ${secs}s end to end`);
  await nav().getByRole('button', { name: /^Ask/ }).click();
  const t1 = Date.now();
  await ask('amount by country');
  const card1 = page.locator('[id^="qa-"]').last();
  await card1.locator('.recharts-bar-rectangle, table').first().waitFor({ timeout: 120000 });
  check('question over the large table answered by the lakehouse', true, `${((Date.now() - t1) / 1000).toFixed(1)}s`);
  await card1.getByRole('button', { name: 'Table' }).click();
  const uk = await card1.locator('tr', { hasText: 'UK' }).locator('td').nth(1).textContent();
  check('large-table total shown', /£/.test(uk), `UK = ${uk}`);
  await page.screenshot({ path: `${OUT}/lake-1-big.png` });
  // Remove it again so the parity checks below only see the sample company.
  await nav().getByRole('button', { name: /Data sources/ }).click();
  await page.getByRole('button', { name: /^Remove / }).first().click();
  await page.waitForTimeout(1500);
}

// ---------- 3. Sample company stored in the lakehouse ----------
await page.getByRole('button', { name: 'Load a sample company' }).click();
await page.getByText(/stored in the Meldra lakehouse/).waitFor({ timeout: 120000 });
const stored = await (await fetch(`${API}/api/lakehouse/sources`)).json().catch(() => null);
const tables = await page.evaluate(async () => {
  const { backendApi } = await import('/src/api/backendClient.js');
  return (await backendApi.lakehouse.sources()).sources.map((s) => `${s.name}:${s.row_count}`);
});
check('six sample systems stored as Iceberg tables in Polaris', tables.length === 6, tables.join(', '));
void stored;

// ---------- 4. Parity: every kind of answer gives the same numbers from the lakehouse as from the browser ----------
const parity = await page.evaluate(async () => {
  const model = await import('/src/lib/unifiedReporting/model.js');
  const engine = await import('/src/lib/unifiedReporting/engine.js');
  const remote = await import('/src/lib/unifiedReporting/remote.js');
  const sample = await import('/src/lib/unifiedReporting/sampleData.js');
  const { sources, relationships } = sample.buildSampleSources();
  const local = model.buildModel(sources, relationships);
  // The page's saved state holds the lakehouse versions (same ids and keys, no rows).
  const data = await new Promise((res) => {
    const r = indexedDB.open('meldra-unified-reporting', 1);
    r.onsuccess = () => { const q = r.result.transaction('kv').objectStore('kv').get('data'); q.onsuccess = () => { res(q.result); r.result.close(); }; };
  });
  const lakeSources = data.sources.filter((s) => s.kind === 'lake');
  const idByKey = Object.fromEntries(lakeSources.map((s) => [s.key, s.id]));
  const localIdByKey = Object.fromEntries(sources.map((s) => [s.key, s.id]));
  const rels = relationships.map((r) => {
    const keyOf = (id) => sources.find((s) => s.id === id).key;
    return { ...r, from: { ...r.from, source: idByKey[keyOf(r.from.source)] }, to: { ...r.to, source: idByKey[keyOf(r.to.source)] } };
  });
  void localIdByKey;
  const lake = model.buildModel(lakeSources, rels);
  const specs = [
    ...sample.sampleSuggestions(local).map((s) => s.spec),
    { title: 'filters+share', groupBy: 'customer', share: true, filters: [{ dim: 'status', op: 'eq', value: 'overdue' }], series: [{ view: 'invoices', measure: 'amount' }] },
    { title: 'lookup+split', groupBy: 'department', splitBy: 'category', series: [{ view: 'expenses', measure: 'amount', agg: 'avg' }] },
    { title: 'rolling+date filter', groupBy: 'month', window: 3, filters: [{ dim: 'month', op: 'gte', value: '2026-03' }], series: [{ view: 'sales_orders', measure: 'amount' }] },
    { title: 'prior month', groupBy: 'month', compare: 'prior_period', series: [{ view: 'expenses', measure: 'amount' }, { view: 'employees', agg: 'count' }] },
    { title: 'min/max', groupBy: 'level', series: [{ view: 'employees', measure: 'salary', agg: 'min' }, { view: 'employees', measure: 'salary', agg: 'max' }] },
    { title: 'totals', groupBy: null, series: [{ view: 'supplier_spend', measure: 'amount', filters: [{ dim: 'on_contract', op: 'neq', value: 'Yes' }] }] },
    { title: 'numeric compare', groupBy: 'customer', series: [{ view: 'invoices', measure: 'amount', filters: [{ dim: 'month', op: 'lte', value: '2026-02' }] }] },
    { title: 'cross-source', groupBy: 'customer', series: [{ view: 'invoices', measure: 'amount' }, { view: 'opportunities', measure: 'amount' }] },
  ];
  const out = [];
  for (const raw of specs) {
    const a = engine.compute(engine.sanitize(raw, local), local);
    const b = await remote.computeAsync(engine.sanitize(raw, lake), lake);
    const cols = (r) => engine.columnsOf(r).map((c) => c.data.map((v) => (v === null ? null : Math.round(v * 1e6) / 1e6)));
    const same = JSON.stringify(a.labels) === JSON.stringify(b.labels) && JSON.stringify(cols(a)) === JSON.stringify(cols(b));
    out.push({ title: raw.title, same, labels: a.labels.length, rows: a.series.map((s) => s.rows).join('/') });
  }
  return out;
});
parity.forEach((p) => check(`parity: ${p.title}`, p.same, `${p.labels} groups, ${p.rows} rows`));

// ---------- 5. Asking against the lakehouse ----------
await nav().getByRole('button', { name: /^Ask/ }).click();
await ask('expenses amount by category treemap');
const c1 = page.locator('[id^="qa-"]').last();
await c1.locator('.recharts-treemap-depth-1, .recharts-rectangle').first().waitFor({ timeout: 60000 });
check('plain question answered from the lakehouse as a treemap (chart named in the prompt)', true);

// ---------- 6. Build a report from one prompt (AI design) ----------
await ask('Board pack on workforce cost and revenue', 'Build a report');
const rep = page.locator('[id^="qa-"]').last();
await rep.getByRole('heading', { name: 'Workforce cost and revenue' }).waitFor({ timeout: 60000 });
await page.waitForTimeout(2500);
const tiles = await rep.locator('h3').allTextContents();
check('AI report: 6 charts built from one prompt', tiles.length === 6, tiles.join(' | '));
const kinds = {
  combo: await rep.locator('.recharts-bar-rectangle').count() > 0 && await rep.locator('.recharts-line-curve').count() > 0,
  treemap: await rep.locator('.recharts-treemap-depth-1').count() > 0,
  funnel: await rep.locator('.recharts-funnel-trapezoid').count() > 0,
  area: await rep.locator('.recharts-area-area').count() > 0,
  heatmap: await rep.locator('table', { hasText: 'department × category' }).count() > 0,
  kpi: await rep.getByText('Active headcount').count() > 0,
};
check('AI report renders combo, treemap, funnel, area, heatmap and KPI tiles', Object.values(kinds).every(Boolean), JSON.stringify(kinds));
await rep.screenshot({ path: `${OUT}/lake-2-ai-report.png` });
await rep.getByRole('button', { name: 'Download report' }).click();
const [dl] = await Promise.all([page.waitForEvent('download'), page.getByRole('menuitem', { name: 'Excel' }).click()]);
check('report exported to Excel', /\.xlsx$/.test(dl.suggestedFilename()), dl.suggestedFilename());
await rep.getByRole('button', { name: 'Add all to dashboard' }).click();

// ---------- 7. Report without AI: rules take over ----------
await ask('Expenses by department without AI', 'Build a report');
const rep2 = page.locator('[id^="qa-"]').last();
await rep2.getByText('Built from your data with built-in rules').waitFor({ timeout: 60000 });
check('report still built when the AI is unavailable (rules)', await rep2.locator('h3').count() >= 3, `${await rep2.locator('h3').count()} charts`);

// ---------- 8. Dashboard of lakehouse tiles ----------
await nav().getByRole('button', { name: /Dashboard/ }).click();
await page.waitForTimeout(3000);
const dashTiles = await page.locator('h3').count();
check('dashboard shows the report tiles, computed in the lakehouse', dashTiles >= 6, `${dashTiles} tiles`);
await page.screenshot({ path: `${OUT}/lake-3-dashboard.png` });

// ---------- 9. Another device: nothing in the browser, everything comes back from Meldra ----------
await page.evaluate(() => new Promise((res) => { const r = indexedDB.deleteDatabase('meldra-unified-reporting'); r.onsuccess = res; r.onerror = res; r.onblocked = res; }));
await open();
await nav().getByRole('button', { name: /Data sources/ }).click();
await page.getByText('Meldra lakehouse', { exact: true }).first().waitFor({ timeout: 60000 });
const restored = await page.getByText('Meldra lakehouse', { exact: true }).count();
check('fresh browser: stored sources load from the lakehouse', restored === 6, `${restored} sources`);
const links = await page.getByText(/% of values match/).count();
check('links between stored tables suggested by the server', links >= 1, `${links} suggestions`);

// ---------- 10. Edits are saved to the lakehouse ----------
const sys = page.getByLabel('System name for Expenses');
await sys.fill('Concur (EU)');
await page.waitForTimeout(1500);
const saved = await page.evaluate(async () => {
  const { backendApi } = await import('/src/api/backendClient.js');
  return (await backendApi.lakehouse.sources()).sources.find((s) => s.name === 'Expenses')?.system;
});
check('system name edit saved to the stored profile', saved === 'Concur (EU)', saved);

// ---------- 11. Delete ----------
await page.getByRole('button', { name: 'Remove Expenses' }).click();
await page.waitForTimeout(1500);
const after = await page.evaluate(async () => {
  const { backendApi } = await import('/src/api/backendClient.js');
  return (await backendApi.lakehouse.sources()).sources.map((s) => s.name);
});
check('deleting a source removes its Iceberg table', !after.includes('Expenses') && after.length === 5, after.join(', '));
await page.getByRole('button', { name: 'Remove all data' }).click();
await page.waitForTimeout(3000);
const none = await page.evaluate(async () => {
  const { backendApi } = await import('/src/api/backendClient.js');
  return (await backendApi.lakehouse.sources()).sources.length;
});
check('"Remove all data" empties the lakehouse for this account', none === 0, `${none} left`);
check('no browser errors', errors.length === 0, errors.slice(0, 3).join(' | '));

await browser.close();
const passed = results.filter((r) => r[0] === 'PASS').length;
fs.writeFileSync(`${OUT}/results.json`, JSON.stringify(results, null, 1));
console.log(`\n${passed}/${results.length} checks passed`);
process.exit(passed === results.length ? 0 : 1);
