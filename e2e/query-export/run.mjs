// End-to-end: the Query panel (tables, columns, joins and editable SQL behind every chart) and report
// downloads as PDF, PowerPoint, Word and Excel, in the real UI against the real backend.
// Mode follows the backend: lakehouse on → sources stored as Iceberg tables and SQL runs in DuckDB;
// lakehouse off → data stays in the browser and SQL runs in SQLite (sql.js). See README.md.
import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';
import { fileURLToPath } from 'url';

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');

const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUT = process.env.E2E_OUT || path.join(HERE, '.out');
const APP = process.env.E2E_APP || 'http://localhost:5173';
const API = 'http://localhost:8001';
fs.mkdirSync(OUT, { recursive: true });

const steps = [];
const errors = [];
const check = (name, ok, detail = '') => { steps.push({ name, ok, detail }); console.log(ok ? '✓' : '✗', name, detail); };

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
  if (p === '/api/auth/me') return json({ email: 'e2e@example.com', role: 'user' });
  return json({});
});

const status = await (await fetch(`${API}/api/lakehouse/status`)).json().catch(() => ({ enabled: false }));
const MODE = status.enabled ? 'lakehouse' : 'browser';
console.log(`mode: ${MODE}`);
if (status.enabled) await fetch(`${API}/api/lakehouse/sources`, { method: 'DELETE' }).catch(() => {});

const nav = () => page.getByRole('navigation', { name: 'Unified Reporting sections' });
await page.goto(`${APP}/`);
await page.evaluate(() => localStorage.setItem('auth_token', 't'));
await page.goto(`${APP}/unified-reporting`);
await page.getByRole('button', { name: 'Done', exact: true }).click({ timeout: 20000 }).catch(() => {});
await page.getByRole('button', { name: 'Reject all' }).click({ timeout: 3000 }).catch(() => {});
await page.locator('h1', { hasText: 'Unified Reporting' }).waitFor();
await nav().getByRole('button', { name: /Data sources/ }).click();
if (await page.getByRole('button', { name: 'Remove all data' }).count()) {
  await page.getByRole('button', { name: 'Remove all data' }).click();
  await page.waitForTimeout(1500);
}
await page.getByRole('button', { name: 'Load a sample company' }).click();
await page.getByText('Supplier spend').first().waitFor({ timeout: 120000 });
await page.waitForTimeout(1500);

const ask = async (q, mode = 'Ask a question') => {
  await nav().getByRole('button', { name: /^Ask/ }).click();
  await page.getByRole('tab', { name: mode }).click();
  await page.locator('#ur-q').fill(q);
  await page.locator('#ur-q').press('Enter');
};
/** Pick a format from a "Download" menu and return the saved file path. */
const download = async (scope, menu, format) => {
  await scope.getByRole('button', { name: menu }).click();
  const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 120000 }), page.getByRole('menuitem', { name: format }).click()]);
  const file = path.join(OUT, `${MODE}-${dl.suggestedFilename()}`);
  await dl.saveAs(file);
  return file;
};

// ---------- 1. The query behind an answer ----------
// The showcase question: headcount and salaries (SuccessFactors), expenses (Concur, department looked up through
// the employee) and supplier spend (Ariba), joined on department, with cost per head on the totals.
await nav().getByRole('button', { name: /^Ask/ }).click();
await page.getByRole('button', { name: /Cost per employee by department/ }).click();
const card = page.locator('[id^="qa-"]').last();
await card.getByRole('button', { name: /Query: SQL, columns, joins/ }).waitFor({ timeout: 120000 });
await card.getByRole('button', { name: /Query: SQL, columns, joins/ }).click();
const panel = card.getByTestId('query-panel');
const sql = await panel.getByRole('textbox', { name: 'SQL query' }).inputValue();
const tableText = await panel.locator('table').first().innerText();
check('Query panel lists each series with its table, system, column and calculation', /employees/.test(tableText) && /expenses/.test(tableText) && /SUM of amount|COUNT rows/.test(tableText), tableText.split('\n').slice(1, 3).join(' / '));
check('Query panel explains the joins (lookup through a link and the join on the breakdown)', await panel.getByText(/Lookup: expenses\.employee_id → employees\.employee_id/).count() === 1 && await panel.getByText(/joined on/).count() > 0);
check('SQL shows the LEFT JOIN lookup and the join on department', /LEFT JOIN \( -- one row per employee_id/.test(sql) && /ON x2\.department = l\.department|ON x1\.department = l\.department/.test(sql));
await panel.getByRole('button', { name: 'Tables you can query' }).click();
check('Tables you can query lists every source with its columns', await panel.locator('.font-mono.font-semibold').count() === 6);
await panel.getByRole('button', { name: 'Tables you can query' }).click();
await panel.getByRole('button', { name: 'Run SQL' }).click();
await panel.getByText(/ran in (this browser|the meldra lakehouse)/).waitFor({ timeout: 60000 });
const ranText = await panel.getByText(/ran in (this browser|the meldra lakehouse)/).textContent();
const answerRows = await card.locator('table').first().locator('tbody tr').count().catch(() => 0);
check(`the SQL runs ${MODE === 'lakehouse' ? 'in the lakehouse (DuckDB over Iceberg)' : 'in the browser (SQLite)'}`, MODE === 'lakehouse' ? /lakehouse/.test(ranText) : /browser/.test(ranText), ranText.trim());
await card.screenshot({ path: `${OUT}/${MODE}-1-query-panel.png` });
void answerRows;

// Same numbers: the SQL result equals the answer's table.
await card.getByRole('button', { name: 'Table', exact: true }).click();
const answerTable = await card.locator('table').first().innerText();
const sqlTable = await panel.locator('table').last().innerText();
const firstNums = (t) => t.split('\n').slice(1, 4).map((l) => l.split('\t').slice(0, 3).join('|'));
check('running the SQL gives the numbers shown in the answer', JSON.stringify(firstNums(answerTable)) === JSON.stringify(firstNums(sqlTable)), firstNums(sqlTable).join(' ; '));

// ---------- 2. Edit the SQL and use it in the chart ----------
const custom = "SELECT level, COUNT(*) AS headcount, AVG(salary) AS avg_salary\nFROM employees\nWHERE status = 'Active'\nGROUP BY level\nORDER BY headcount DESC";
await panel.getByRole('textbox', { name: 'SQL query' }).fill(custom);
await panel.getByRole('button', { name: 'Run SQL' }).click();
await panel.getByText(/^\d+ rows?/).waitFor({ timeout: 60000 });
const edited = await panel.locator('table').last().innerText();
check('edited SQL runs and shows its rows', /level\s+headcount\s+avg_salary/.test(edited), edited.split('\n').slice(0, 2).join(' / '));
await panel.getByRole('button', { name: 'Use this result in the chart' }).click();
await card.getByText('Custom SQL').waitFor({ timeout: 60000 });
await page.waitForTimeout(800);
check('the chart now shows the custom SQL result', await card.getByText('Custom SQL').count() > 0 && await card.locator('.recharts-bar-rectangle, table').count() > 0);
await card.screenshot({ path: `${OUT}/${MODE}-2-custom-sql-chart.png` });
const csv = fs.readFileSync(await download(card, /^Download/, 'CSV'), 'utf8');
check('the custom SQL answer downloads with its own columns', /^level,headcount,avg salary|^level,headcount,avg_salary/.test(csv), csv.split('\n')[0]);

// Errors are explained; nothing can be changed.
const p2 = card.getByTestId('query-panel');
await p2.getByRole('textbox', { name: 'SQL query' }).fill('DELETE FROM employees');
await p2.getByRole('button', { name: 'Run SQL' }).click();
check('a non-SELECT statement is refused with a clear message', await p2.getByRole('alert').filter({ hasText: /Only SELECT/ }).count() === 1);
await p2.getByRole('textbox', { name: 'SQL query' }).fill('SELECT nope FROM employees');
await p2.getByRole('button', { name: 'Run SQL' }).click();
await p2.getByRole('alert').waitFor();
check('a wrong column gives the database error', /nope/i.test(await p2.getByRole('alert').textContent()), (await p2.getByRole('alert').textContent()).slice(0, 80));
await p2.getByRole('button', { name: /Back to meldra/ }).click();
await page.waitForTimeout(800);
check('"Back to meldra\'s query" restores the original answer', await card.getByText('Custom SQL').count() === 0);

// ---------- 3. A report from one prompt, then its downloads ----------
await ask('Board pack on workforce cost and revenue', 'Build a report');
const rep = page.locator('[id^="qa-"]').last();
await rep.getByRole('button', { name: 'Add all to dashboard' }).waitFor({ timeout: 120000 });
await page.waitForTimeout(3000);
const tiles = await rep.locator('h3').allTextContents();
check('report built from one prompt', tiles.length >= 4, `${tiles.length} charts`);
await rep.getByRole('button', { name: 'Query', exact: true }).first().click();
const tileSql = await rep.getByTestId('query-panel').getByRole('textbox', { name: 'SQL query' }).inputValue();
check('each report chart has its Query panel with SQL', /SELECT/.test(tileSql));
await rep.getByRole('button', { name: 'Hide query' }).first().click();
await rep.screenshot({ path: `${OUT}/${MODE}-3-report.png` });

const files = {};
for (const [fmt, name] of [['pdf', 'PDF'], ['pptx', 'PowerPoint'], ['docx', 'Word'], ['xlsx', 'Excel']]) {
  const t0 = Date.now();
  files[fmt] = await download(rep, 'Download report', name);
  check(`report downloads as ${name}`, fs.statSync(files[fmt]).size > 2000, `${path.basename(files[fmt])}, ${Math.round(fs.statSync(files[fmt]).size / 1024)} KB, ${((Date.now() - t0) / 1000).toFixed(1)}s`);
}
const inspect = JSON.parse(execFileSync('python3', [path.join(HERE, 'check_files.py'), JSON.stringify({ files, charts: tiles.length, titles: tiles, out: OUT, mode: MODE })], { encoding: 'utf8' }));
for (const c of inspect.checks) check(c.name, c.ok, c.detail);

// ---------- 4. Dashboard download ----------
await rep.getByRole('button', { name: 'Add all to dashboard' }).click();
await nav().getByRole('button', { name: /Dashboard/ }).click();
await page.waitForTimeout(3000);
const dash = await download(page, 'Download dashboard', 'PowerPoint');
check('dashboard downloads as PowerPoint', fs.statSync(dash).size > 2000, path.basename(dash));

check('no browser errors', errors.length === 0, errors.slice(0, 3).join(' | '));
await browser.close();

const passed = steps.filter((s) => s.ok).length;
const md = [
  `# Query panel and report downloads: results (${MODE} mode)`,
  '',
  `Run ${new Date().toISOString().slice(0, 16).replace('T', ' ')} UTC against ${APP}; ${MODE === 'lakehouse' ? 'sources stored in the meldra lakehouse, SQL run by DuckDB' : 'data kept in the browser, SQL run by SQLite (sql.js)'}.`,
  `**${passed} of ${steps.length} checks passed.**`,
  '',
  '| # | Check | Result | Detail |', '|---|---|---|---|',
  ...steps.map((s, i) => `| ${i + 1} | ${s.name} | ${s.ok ? 'PASS' : '**FAIL**'} | ${String(s.detail).replace(/\|/g, '/').replace(/\n/g, ' ')} |`),
  '',
].join('\n');
fs.writeFileSync(path.join(HERE, `RESULTS-${MODE}.md`), md);
console.log(`\n${passed}/${steps.length} checks passed → e2e/query-export/RESULTS-${MODE}.md`);
process.exit(passed === steps.length ? 0 : 1);
