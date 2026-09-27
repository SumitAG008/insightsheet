// Runs the Unified Reporting test pack script (public/unified-reporting-test-pack/README.html) in the real UI
// and writes RESULTS-<mode>.md: every expected number next to what Meldra answered.
// Mode "browser": the lakehouse is off (data stays in the browser). Mode "lakehouse": the backend has
// LAKEHOUSE_CATALOG set and sources are stored as Iceberg tables. The backend decides; the runner reports it.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import XLSX from 'xlsx';

// Playwright is not a project dependency: install it, or point PLAYWRIGHT_MODULE at a global copy.
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PACK = path.join(HERE, '..', '..', 'public', 'unified-reporting-test-pack');
const OUT = process.env.E2E_OUT || path.join(HERE, '.out');
const APP = process.env.E2E_APP || 'http://localhost:5173';
const API = 'http://localhost:8001';
const EXPECTED = JSON.parse(fs.readFileSync(path.join(PACK, 'expected.json'), 'utf8'));
fs.mkdirSync(OUT, { recursive: true });

const steps = [];
const errors = [];
const step = (name, ok, detail = '') => { steps.push({ name, ok, detail }); console.log(ok ? '✓' : '✗', name, detail); };
const close = (a, b) => Math.abs(a - b) <= 0.011;
const gbp = (v) => `£${Number(v).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
const ctx = await browser.newContext({ viewport: { width: 1440, height: 1100 }, acceptDownloads: true });
const page = await ctx.newPage();
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource|ERR_|502/.test(m.text())) errors.push(m.text()); });
page.on('dialog', (d) => d.accept());
await page.route(`${API}/**`, async (route) => {
  const p = new URL(route.request().url()).pathname;
  if (/^\/api\/(lakehouse|unified-reporting)\//.test(p)) return route.continue();
  const json = (b, s = 200) => route.fulfill({ status: s, contentType: 'application/json', body: JSON.stringify(b), headers: { 'access-control-allow-origin': '*' } });
  if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 204, headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' } });
  if (p === '/api/auth/me') return json({ email: 'testpack@example.com', role: 'user' });
  return json({});
});

const nav = () => page.getByRole('navigation', { name: 'Unified Reporting sections' });
await page.goto(`${APP}/`);
await page.evaluate(() => localStorage.setItem('auth_token', 't'));
await page.goto(`${APP}/unified-reporting`);
await page.getByRole('button', { name: 'Done', exact: true }).click({ timeout: 20000 }).catch(() => {});
await page.getByRole('button', { name: 'Reject all' }).click({ timeout: 3000 }).catch(() => {});
await page.locator('h1', { hasText: 'Unified Reporting' }).waitFor();
const status = await (await fetch(`${API}/api/lakehouse/status`)).json().catch(() => ({ enabled: false }));
const MODE = status.enabled ? 'lakehouse' : 'browser';
console.log(`mode: ${MODE}${status.enabled ? ` (${status.catalog})` : ''}`);

// Status messages shown while files are read or uploaded (the progress the user sees).
await page.evaluate(() => {
  window.__statusTexts = [];
  new MutationObserver(() => {
    document.querySelectorAll('[role=status]').forEach((el) => { const t = el.textContent.trim(); if (t && !window.__statusTexts.includes(t)) window.__statusTexts.push(t); });
  }).observe(document.body, { subtree: true, childList: true, characterData: true });
});

// ---- Step 1: start clean ----
await nav().getByRole('button', { name: /Data sources/ }).click();
if (await page.getByRole('button', { name: 'Remove all data' }).count()) {
  await page.getByRole('button', { name: 'Remove all data' }).click();
  await page.waitForTimeout(1500);
}

// ---- One source is not unified reporting ----
const file = (f) => path.join(PACK, f);
await page.locator('input[type=file]').first().setInputFiles([file('employees.csv')]);
await page.getByText(/One source so far/).waitFor({ timeout: 60000 });
await nav().getByRole('button', { name: /^Ask/ }).click();
const banner = await page.getByText(/You have one source/).count();
step('with one source, the Ask tab says unified reporting needs another system', banner === 1);
await page.screenshot({ path: `${OUT}/${MODE}-1-one-source.png` });
await page.getByRole('button', { name: 'Add another source' }).click();

// ---- Step 2: the other three files in one go ----
await page.locator('input[type=file]').first().setInputFiles(['expenses.csv', 'budget.xlsx', 'opportunities.xlsx'].map(file));
await page.getByText(/opportunities/).first().waitFor({ timeout: 120000 });
await page.waitForTimeout(1000);
const texts = await page.evaluate(() => window.__statusTexts);
step('progress is shown while files load', texts.some((t) => /Reading|Uploading|Storing/.test(t)), texts.filter((t) => /Reading|Uploading|Storing/.test(t)).slice(0, 3).join(' → '));

// ---- Step 3: four sources ----
const counts = {};
for (const [name, rows] of [['employees', 24], ['expenses', 90], ['budget', 30], ['opportunities', 40]]) {
  const card = page.locator('div.rounded-2xl').filter({ has: page.locator('h3', { hasText: new RegExp(`^${name}$`) }) }).first();
  counts[name] = (await card.getByText(/[\d,]+ rows/).first().textContent()).match(/[\d,]+/)[0];
  step(`source ${name}: ${rows} rows`, Number(counts[name].replace(/,/g, '')) === rows, `${counts[name]} rows`);
}

// ---- Step 4: links ----
for (const link of EXPECTED.links) {
  const [from, to] = link.split(' → ');
  const row = page.locator('div').filter({ hasText: new RegExp(`^${from.replace('.', '\\.')} → ${to.replace('.', '\\.')}`) }).getByRole('button', { name: 'Link' });
  const found = await row.count();
  if (found) await row.first().click();
  step(`link suggested and accepted: ${link}`, found > 0);
}

// ---- Step 5: shared dimensions ----
const shared = await page.locator('span', { hasText: / · / }).allTextContents();
step('shared dimensions include department and month', shared.some((s) => s.startsWith('department')) && shared.some((s) => s.startsWith('month')), shared.map((s) => s.split(' · ')[0]).join(', '));
await page.screenshot({ path: `${OUT}/${MODE}-2-sources.png`, fullPage: true });

// ---- Step 6: questions ----
const answers = [];
for (const q of EXPECTED.questions) {
  await nav().getByRole('button', { name: /^Ask/ }).click();
  await page.getByRole('tab', { name: 'Ask a question' }).click();
  await page.locator('#ur-q').fill(q.ask);
  await page.locator('#ur-q').press('Enter');
  const card = page.locator('[id^="qa-"]').last();
  await card.getByRole('button', { name: 'CSV' }).waitFor({ timeout: 120000 });
  const [dl] = await Promise.all([page.waitForEvent('download'), card.getByRole('button', { name: 'CSV' }).click()]);
  const rows = XLSX.utils.sheet_to_json(XLSX.read(fs.readFileSync(await dl.path(), 'utf8'), { type: 'string', raw: true }).Sheets.Sheet1, { header: 1, raw: true });
  const got = Object.fromEntries(rows.slice(1).map((r) => [String(r[0]), r.slice(1).map(Number)]));
  const keys = Object.keys(q.expected);
  // Same rows, same number of columns, same values: nothing missing and nothing extra.
  const ok = keys.every((k) => got[k] && got[k].length === q.expected[k].length && q.expected[k].every((v, i) => close(got[k][i], v)))
    && Object.keys(got).length === keys.length;
  answers.push({ q, got, ok });
  step(`${q.id} "${q.ask}"`, ok, `${keys.length} rows ${ok ? 'identical' : 'DIFFERENT'} to the expected answer`);
  await card.screenshot({ path: `${OUT}/${MODE}-3-${q.id}.png` });
}

// ---- Step 7: report from one prompt ----
await page.getByRole('tab', { name: 'Build a report' }).click();
await page.locator('#ur-q').fill(EXPECTED.report_prompt);
await page.locator('#ur-q').press('Enter');
const rep = page.locator('[id^="qa-"]').last();
await rep.getByRole('button', { name: 'Add all to dashboard' }).waitFor({ timeout: 120000 });
await page.waitForTimeout(2500);
const charts = await rep.locator('h3').count();
const systems = [...new Set((await rep.locator('span.rounded-full').allTextContents()).map((s) => s.trim()))];
step(`report "${EXPECTED.report_prompt}" built from one prompt`, charts >= 4 && systems.length >= 3, `${charts} charts from ${systems.join(', ')}`);
await rep.screenshot({ path: `${OUT}/${MODE}-4-report.png` });

// ---- Removing a source clears the answers that used it ----
const before = await page.locator('[id^="qa-"]').count();
await nav().getByRole('button', { name: /Data sources/ }).click();
await page.getByRole('button', { name: 'Remove expenses' }).click();
await page.waitForTimeout(1500);
await nav().getByRole('button', { name: /^Ask/ }).click();
const after = await page.locator('[id^="qa-"]').count();
const stale = await page.getByText('This answer used data that has since been removed').count();
step('removing a source clears the answers built on it (no "data removed" leftovers)', stale === 0 && after < before, `${before} → ${after} answers, ${stale} "removed" messages`);
step('no browser errors', errors.length === 0, errors.slice(0, 2).join(' | '));
await browser.close();

// ---- Results file ----
const passed = steps.filter((s) => s.ok).length;
const md = [
  `# Unified Reporting test pack: results (${MODE} mode)`,
  '',
  `Run ${new Date().toISOString().slice(0, 16).replace('T', ' ')} UTC against ${APP}, ${MODE === 'lakehouse' ? `data stored in the Meldra lakehouse (${status.catalog})` : 'data kept in the browser (lakehouse off)'}.`,
  `**${passed} of ${steps.length} checks passed.** Files: ${EXPECTED.files.join(', ')} (public/unified-reporting-test-pack).`,
  '',
  '| # | Check | Result | Detail |', '|---|---|---|---|',
  ...steps.map((s, i) => `| ${i + 1} | ${s.name} | ${s.ok ? 'PASS' : '**FAIL**'} | ${s.detail.replace(/\|/g, '/')} |`),
  '',
  '## Answers compared with the expected numbers',
  ...answers.flatMap(({ q, got, ok }) => [
    '', `### ${q.id}. \`${q.ask}\` (${q.systems}): ${ok ? 'identical' : '**different**'}`, q.why, '',
    `| ${['', ...q.columns.map((c) => `${c}: expected`), ...q.columns.map((c) => `${c}: Meldra`)].join(' | ')} |`,
    `|${' --- |'.repeat(1 + q.columns.length * 2)}`,
    ...Object.entries(q.expected).map(([k, v]) => `| ${k} | ${v.map(gbp).join(' | ')} | ${(got[k] || []).map(gbp).join(' | ')} |`),
  ]),
  '',
].join('\n');
fs.writeFileSync(path.join(HERE, `RESULTS-${MODE}.md`), md);
console.log(`\n${passed}/${steps.length} checks passed → e2e/test-pack/RESULTS-${MODE}.md`);
process.exit(passed === steps.length ? 0 : 1);
