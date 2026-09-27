import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Playwright is not a project dependency: install it, or point PLAYWRIGHT_MODULE at a global copy.
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');

const OUT = process.env.E2E_OUT || path.join(path.dirname(fileURLToPath(import.meta.url)), '.out');
const APP = process.env.E2E_APP || 'http://localhost:5173';
const K = `${OUT}/keys`;
const API = 'http://localhost:8001';
const errors = [];
const results = [];
// Credentials used in the test are generated per run (nothing secret-looking is written in the repo).
const rnd = () => Math.random().toString(36).slice(2, 12);
const QB_SECRET = `fake-${rnd()}`;
const RT_OLD = `rt-${rnd()}`;
const check = (name, ok, extra = '') => { results.push([ok ? 'PASS' : 'FAIL', name, extra]); console.log(ok ? '✓' : '✗', name, extra); };

const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
const page = await (await browser.newContext({ viewport: { width: 1440, height: 1100 } })).newPage();
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource|ERR_/.test(m.text())) errors.push(m.text()); });

// Everything except the connector goes to a stub; the connector hits the REAL backend on :8001.
await page.route(`${API}/**`, async (route) => {
  const p = new URL(route.request().url()).pathname;
  if (p.startsWith('/api/unified-reporting/connector/')) return route.continue();
  const json = (b, s = 200) => route.fulfill({ status: s, contentType: 'application/json', body: JSON.stringify(b), headers: { 'access-control-allow-origin': '*' } });
  if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 204, headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' } });
  if (p === '/api/auth/me') return json({ email: 'e2e@example.com', role: 'user' });
  if (p.startsWith('/api/unified-reporting/')) return json({ detail: 'off' }, 502);
  return json({});
});

const field = (label) => page.locator('label').filter({ has: page.locator('span', { hasText: new RegExp(`^${label}`) }) });
const inputOf = (label) => field(label).locator('input:not([type=file]), select, textarea').first();
const fileOf = (label) => field(label).locator('input[type=file]');
const openConnector = async () => {
  await page.getByRole('button', { name: 'Connect an API' }).click();
  await inputOf('System$').waitFor();
};
const fetchBtn = () => page.getByRole('button', { name: /Fetch and add|Fetch again/ });

await page.goto(`${APP}/`);
await page.evaluate(() => localStorage.setItem('auth_token', 't'));
await page.goto(`${APP}/unified-reporting`);
await page.getByRole('button', { name: 'Done', exact: true }).click({ timeout: 20000 }).catch(() => {});
await page.getByRole('button', { name: 'Reject all' }).click({ timeout: 3000 }).catch(() => {});
await page.locator('h1', { hasText: 'Unified Reporting' }).waitFor();

// ---------- 1. SuccessFactors: OAuth 2.0 SAML 2.0 bearer ----------
await openConnector();
await page.getByText(/no IP allowlisting is needed/).first().waitFor();
check('UI states token sign-in needs no IP allowlisting', true);
await inputOf('System$').selectOption('successfactors');
check('SuccessFactors preset defaults to SAML 2.0 bearer', (await inputOf('Authentication').inputValue()) === 'oauth2_saml_bearer');
await inputOf('Address').fill('https://api4.successfactors.com/odata/v2/EmpJob?$format=json');
await inputOf('Token URL').fill('https://api4.successfactors.com/oauth/token');
check('preset filled issuer/audience', (await inputOf('Issuer').inputValue()) === 'www.successfactors.com' && (await inputOf('Assertion audience').inputValue()) === 'www.successfactors.com');
await inputOf('Client ID').fill('SFAPIKEY');
await inputOf('Company ID').fill('WRONGCO');
await inputOf('Subject').fill('apiuser');
await fileOf('Private key').setInputFiles(`${K}/key.pem`);
await fileOf('Certificate').setInputFiles(`${K}/cert.pem`);
await page.screenshot({ path: `${OUT}/live-1-sf-form.png`, fullPage: false });
// Wrong company ID: the IdP rejects, the UI explains, nothing is added.
await fetchBtn().click();
const err1 = await page.getByRole('alert').first().textContent({ timeout: 30000 });
check('rejected grant is explained (OAuth error code shown)', /access token failed \(401\): invalid_grant/.test(err1), err1.trim());
await inputOf('Company ID').fill('ACME01');
await fetchBtn().click();
await page.getByText(/API · api4.successfactors.com/).waitFor({ timeout: 30000 });
const sfRows = await page.locator('div').filter({ has: page.getByText(/API · api4.successfactors.com/) }).getByText(/3 rows/).count();
check('SuccessFactors: signed SAML assertion accepted, 2 OData pages → 3 rows', sfRows > 0);

// ---------- 2. Microsoft Graph: client credentials with certificate (private_key_jwt) ----------
await openConnector();
await inputOf('System$').selectOption('msgraph');
check('Graph preset defaults to certificate (private_key_jwt)', (await inputOf('Client authentication').inputValue()) === 'private_key_jwt');
await inputOf('Token URL').fill('https://login.microsoftonline.com/contoso.onmicrosoft.com/oauth2/v2.0/token');
await inputOf('Client ID').fill('11111111-2222-3333-4444-555555555555');
await fileOf('Private key').setInputFiles(`${K}/key.pem`);
await fileOf('Certificate').setInputFiles(`${K}/cert.pem`);
await fetchBtn().click();
await page.getByText(/API · graph.microsoft.com/).waitFor({ timeout: 30000 });
check('Microsoft Graph: signed client assertion with x5t accepted', true);

// ---------- 3. QuickBooks: refresh token that rotates ----------
await openConnector();
await inputOf('System$').selectOption('quickbooks');
await inputOf('Address').fill('https://quickbooks.api.intuit.com/v3/company/9130/query?query=select%20*%20from%20Invoice');
await inputOf('Client ID').fill('qb-client');
await inputOf('Client secret').fill(QB_SECRET);
await inputOf('Refresh token').fill(RT_OLD);
await fetchBtn().click();
const rotated = await page.getByTestId('new-refresh-token').textContent({ timeout: 30000 });
check('rotated refresh token handed back to the user', rotated === `${RT_OLD}-rotated`);
const RT_NEW = rotated;
await page.getByRole('button', { name: 'I saved it, continue' }).click();
await page.getByText(/API · quickbooks.api.intuit.com/).waitFor();

// ---------- 4. Bad key is caught before anything is sent ----------
await openConnector();
await inputOf('System$').selectOption('salesforce');
await inputOf('Address').fill('https://acme.my.salesforce.com/services/data/v60.0/query?q=SELECT+Id+FROM+Account');
await inputOf('Client ID').fill('consumer');
await inputOf('Subject').fill('int@acme.com');
await inputOf('Private key').fill('-----BEGIN PRIVATE KEY-----\nNOTAREALKEY\n-----END PRIVATE KEY-----');
await fetchBtn().click();
const err2 = await page.getByRole('alert').first().textContent({ timeout: 30000 });
check('invalid private key: clear message, key not echoed', /private key could not be read/.test(err2) && !err2.includes('NOTAREALKEY'), err2.trim());
await page.getByRole('button', { name: 'Cancel' }).click();

// ---------- 5. Nothing secret persisted in the browser ----------
await page.waitForTimeout(1000);
const stored = await page.evaluate(() => new Promise((res) => {
  const r = indexedDB.open('meldra-unified-reporting', 1);
  r.onsuccess = () => { const q = r.result.transaction('kv').objectStore('kv').get('data'); q.onsuccess = () => { res(JSON.stringify(q.result)); r.result.close(); }; };
}));
const keyPem = fs.readFileSync(`${K}/key.pem`, 'utf8');
const leaks = ['PRIVATE KEY', keyPem.split('\n')[1], QB_SECRET, RT_OLD, RT_NEW, 'NOTAREALKEY'].filter((s) => stored.includes(s));
check('no key, secret or token in browser storage', leaks.length === 0, leaks.join(','));
check('non-secret settings kept for refresh', stored.includes('"company_id":"ACME01"') && stored.includes('"client_id":"SFAPIKEY"'));
const ls = await page.evaluate(() => JSON.stringify({ ...localStorage }) + JSON.stringify({ ...sessionStorage }));
check('nothing secret in local/session storage', !['PRIVATE KEY', QB_SECRET, RT_OLD, RT_NEW].some((s) => ls.includes(s)));

// ---------- 6. Refresh: settings prefilled, key must be supplied again ----------
await page.getByRole('button', { name: /Refresh SAP SuccessFactors/ }).click();
check('refresh prefills token URL, client, company, subject', (await inputOf('Token URL').inputValue()).includes('api4') && (await inputOf('Company ID').inputValue()) === 'ACME01' && (await inputOf('Subject').inputValue()) === 'apiuser');
check('refresh does not prefill the private key', (await inputOf('Private key').inputValue()) === '');
await fileOf('Private key').setInputFiles(`${K}/key.pem`);
await fetchBtn().click();
await page.getByText(/Refreshed: 3 rows/).waitFor({ timeout: 30000 });
check('refresh with the key re-fetches through SAML bearer', true);
await page.screenshot({ path: `${OUT}/live-2-sources.png` });

// ---------- 7. Server-side: IdP saw verified assertions; logs hold no secrets ----------
const idp = fs.readFileSync(`${K}/idp.log`, 'utf8');
check('mock IdP verified SAML signatures', (idp.match(/SAML signature VERIFIED/g) || []).length >= 2, idp.split('\n').filter(Boolean).join(' | '));
check('mock IdP verified private_key_jwt', /private_key_jwt VERIFIED/.test(idp));
const serverLog = fs.readFileSync(`${OUT}/backend.log`, 'utf8');
check('backend log holds no key, secret or token', !['PRIVATE KEY', QB_SECRET, RT_OLD, RT_NEW, 'sf-token', 'graph-token'].some((s) => serverLog.includes(s)));
check('no browser errors', errors.length === 0, errors.join(' | '));

await browser.close();
fs.writeFileSync(`${OUT}/live-results.json`, JSON.stringify(results, null, 1));
const passed = results.filter((r) => r[0] === 'PASS').length;
console.log(`\n${passed}/${results.length} checks passed`);
process.exit(passed === results.length ? 0 : 1);
