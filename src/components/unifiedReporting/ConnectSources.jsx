import { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronRight, Copy, Database, KeyRound, Loader2, Plug, ShieldCheck } from 'lucide-react';
import { backendApi } from '@/api/backendClient';
import { MAX_ROWS, sourceFromTable } from '@/lib/unifiedReporting/model';
import TokenAuthFields from './TokenAuthFields';
import { AUTH_LABEL, TOKEN_TYPES, publicAuth, withClientAuth } from '@/lib/unifiedReporting/authConfig';

const input = 'w-full rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-900';
const label = 'block text-xs font-medium text-slate-600 dark:text-slate-300';
const card = 'rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900';

// Used when the presets endpoint can't be reached (the backend returns the full list).
const FALLBACK_PRESETS = [{ id: 'rest', name: 'Any REST / JSON API', method: 'GET', url: '', auth: 'bearer', paging: 'auto', records_path: '' }];
const PAGING_LABEL = {
  auto: 'Detect automatically', odata: 'OData next link', next_url: 'Next URL in response', link_header: 'Link header',
  offset: 'Offset + limit', page: 'Page number', cursor: 'Cursor', last_id: 'After last ID (Stripe)', none: 'Single page',
};

const hostOf = (url) => {
  try { return new URL(url).hostname; } catch { return ''; }
};

function Field({ name, children, className = '' }) {
  return <label className={`${label} ${className}`}><span className="mb-1 block">{name}</span>{children}</label>;
}
Field.propTypes = { name: PropTypes.string.isRequired, children: PropTypes.node, className: PropTypes.string };

/**
 * Pull records from a business API through the backend connector. Settings
 * (without secrets) are kept on the source so it can be refreshed later;
 * credentials must be typed again each time.
 */
export function ApiConnector({ initial, onAdd, onCancel }) {
  const [presets, setPresets] = useState(FALLBACK_PRESETS);
  const [preset, setPreset] = useState(initial?.preset || 'rest');
  const [cfg, setCfg] = useState(() => ({
    system: '', name: '', url: '', method: 'GET', body_type: 'json', body: '', records_path: '', paging: 'auto',
    next_path: '', page_size: '', max_rows: '', headers: '', cursor_param: '', ...(initial || {}),
  }));
  // Refresh starts from the saved non-secret settings (token URL, client ID, subject…); secrets are typed again.
  const [auth, setAuth] = useState(() => ({ type: initial?.authType || 'bearer', ...(initial?.auth || {}) }));
  const [egress, setEgress] = useState(null);
  const [rotated, setRotated] = useState(null); // { token, src, msg } when the provider issued a new refresh token
  const [adv, setAdv] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [help, setHelp] = useState('');

  useEffect(() => {
    let live = true;
    backendApi.unifiedReporting.connectorPresets().then((r) => {
      if (!live) return;
      if (r?.presets?.length) setPresets(r.presets);
      if (r?.egress) setEgress(r.egress);
    }).catch(() => {});
    return () => { live = false; };
  }, []);

  const set = (patch) => setCfg((c) => ({ ...c, ...patch }));
  const choose = (id) => {
    setPreset(id);
    const p = presets.find((x) => x.id === id);
    if (!p) return;
    set({
      url: p.url || '', method: p.method || 'GET', body_type: p.body_type || 'json', body: p.body || '', records_path: p.records_path || '',
      paging: p.paging || 'auto', next_path: p.next_path || '', headers: p.headers ? JSON.stringify(p.headers) : '',
      system: cfg.system || (id === 'rest' || id === 'graphql' || id === 'soap' ? '' : p.name.replace(/\s*\(.*\)$/, '')),
    });
    setAuth({ type: p.auth || 'none', ...(p.auth_defaults || {}) });
    set({ cursor_param: p.cursor_param || '' });
    setHelp(p.help || '');
  };

  const fetchNow = async () => {
    setErr('');
    let headers = {};
    if (cfg.headers.trim()) {
      try {
        headers = JSON.parse(cfg.headers);
        if (typeof headers !== 'object' || Array.isArray(headers)) throw new Error();
      } catch {
        setErr('Extra headers must be a JSON object, e.g. {"Accept": "application/json"}.');
        return;
      }
    }
    let body = cfg.body;
    if (cfg.method === 'POST' && cfg.body_type === 'json' && body.trim()) {
      try { body = JSON.parse(body); } catch { setErr('The request body is not valid JSON.'); return; }
    }
    const request = {
      url: cfg.url.trim(), method: cfg.method, headers, body: cfg.method === 'POST' ? body : null, body_type: cfg.body_type,
      auth: withClientAuth(auth),
      records_path: cfg.records_path.trim() || null, paging: cfg.paging, next_path: cfg.next_path || null, cursor_param: cfg.cursor_param || null,
      page_size: cfg.page_size ? Number(cfg.page_size) : null, max_rows: cfg.max_rows ? Math.min(MAX_ROWS, Number(cfg.max_rows)) : null,
    };
    setBusy(true);
    try {
      const out = await backendApi.unifiedReporting.connectorFetch(request);
      const system = cfg.system.trim() || hostOf(request.url) || 'API';
      const name = cfg.name.trim() || `${system} API`;
      // Keep the settings, never the credentials.
      const origin = {
        type: 'api', preset, url: request.url, method: request.method, body_type: request.body_type, body: cfg.body, headers: cfg.headers,
        records_path: out.records_path || request.records_path || '', paging: out.paging || request.paging, next_path: cfg.next_path,
        page_size: cfg.page_size, max_rows: cfg.max_rows, cursor_param: cfg.cursor_param, authType: auth.type, auth: publicAuth(auth), system, name,
      };
      const src = sourceFromTable(name, out.columns, out.rows, system, 'api', origin);
      src.truncated = Boolean(out.truncated);
      const msg = `${out.row_count.toLocaleString()} rows from ${out.pages} page${out.pages === 1 ? '' : 's'}${out.truncated ? ' (row limit reached)' : ''}`;
      // Drop secrets from memory as soon as they have been used.
      setAuth((x) => publicAuth(x));
      if (out.new_refresh_token) setRotated({ token: out.new_refresh_token, src, msg });
      else onAdd(src, msg);
    } catch (e) {
      setErr(e.message || 'The API could not be read.');
    } finally {
      setBusy(false);
    }
  };

  const a = (patch) => setAuth((x) => ({ ...x, ...patch }));
  return (
    <div className={card}>
      <h3 className="m-0 flex items-center gap-2 text-[15px] font-semibold"><Plug className="h-4 w-4 text-blue-600" />{initial ? `Refresh ${initial.name || 'API source'}` : 'Connect an API'}</h3>
      <p className="mt-1 flex items-start gap-1.5 text-xs text-slate-500"><ShieldCheck className="mt-0.5 h-3.5 w-3.5 flex-none text-emerald-600" />Meldra fetches over HTTPS from public addresses only. Credentials are used for this request and never stored; the records stay in this browser.</p>
      <p className="mt-1 flex items-start gap-1.5 text-xs text-slate-500">
        <KeyRound className="mt-0.5 h-3.5 w-3.5 flex-none text-emerald-600" />
        {egress?.static_ip
          ? `Prefer OAuth or SAML sign-in, so no IP allowlisting is needed. If your system still requires it, Meldra calls from: ${egress.ips.join(', ')}.`
          : 'Use OAuth 2.0 or SAML 2.0 bearer sign-in (certificate or client secret): access is granted by token, so no IP allowlisting is needed.'}
      </p>
      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field name="System">
          <select className={input} value={preset} onChange={(e) => choose(e.target.value)} disabled={Boolean(initial)}>
            {presets.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </Field>
        <Field name="System name (shown on answers)"><input className={input} value={cfg.system} onChange={(e) => set({ system: e.target.value })} placeholder="e.g. SuccessFactors" /></Field>
        <Field name="Address (HTTPS)" className="sm:col-span-2">
          <input className={`${input} font-mono text-xs`} value={cfg.url} onChange={(e) => set({ url: e.target.value })} placeholder="https://…" spellCheck={false} />
        </Field>
        {help && <p className="-mt-1 text-xs text-slate-500 sm:col-span-2">{help} Replace anything in {'{braces}'} with your own values.</p>}
        <Field name="Method">
          <select className={input} value={cfg.method} onChange={(e) => set({ method: e.target.value })}>
            <option>GET</option><option>POST</option>
          </select>
        </Field>
        {cfg.method === 'POST' ? (
          <Field name="Body type">
            <select className={input} value={cfg.body_type} onChange={(e) => set({ body_type: e.target.value })}>
              <option value="json">JSON</option><option value="graphql">GraphQL query</option><option value="xml">SOAP / XML</option>
            </select>
          </Field>
        ) : <div />}
        {cfg.method === 'POST' && (
          <Field name="Body" className="sm:col-span-2">
            <textarea className={`${input} min-h-[90px] font-mono text-xs`} value={cfg.body} onChange={(e) => set({ body: e.target.value })} spellCheck={false} />
          </Field>
        )}
        <Field name="Authentication">
          <select className={input} value={auth.type} onChange={(e) => a({ type: e.target.value })}>
            {Object.entries(AUTH_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </Field>
        <div />
        {auth.type === 'basic' && (
          <>
            <Field name="User name"><input className={input} autoComplete="off" value={auth.username || ''} onChange={(e) => a({ username: e.target.value })} /></Field>
            <Field name="Password"><input className={input} type="password" autoComplete="new-password" value={auth.password || ''} onChange={(e) => a({ password: e.target.value })} /></Field>
          </>
        )}
        {auth.type === 'bearer' && (
          <Field name="Access token" className="sm:col-span-2"><input className={input} type="password" autoComplete="off" value={auth.token || ''} onChange={(e) => a({ token: e.target.value })} /></Field>
        )}
        {auth.type === 'api_key' && (
          <>
            <Field name="Key name"><input className={input} value={auth.key_name || ''} placeholder="x-api-key" onChange={(e) => a({ key_name: e.target.value })} /></Field>
            <Field name="Send in">
              <select className={input} value={auth.key_in || 'header'} onChange={(e) => a({ key_in: e.target.value })}><option value="header">Header</option><option value="query">Query string</option></select>
            </Field>
            <Field name="Key value" className="sm:col-span-2"><input className={input} type="password" autoComplete="off" value={auth.key_value || ''} onChange={(e) => a({ key_value: e.target.value })} /></Field>
          </>
        )}
        {TOKEN_TYPES.includes(auth.type) && <TokenAuthFields auth={auth} a={a} />}
      </div>

      <button type="button" onClick={() => setAdv(!adv)} className="mt-3 flex items-center gap-1 text-sm font-medium text-blue-700 dark:text-blue-400" aria-expanded={adv}>
        {adv ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />} Records, paging and headers
      </button>
      {adv && (
        <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field name="Records at (path to the list)"><input className={`${input} font-mono text-xs`} value={cfg.records_path} placeholder="found automatically" onChange={(e) => set({ records_path: e.target.value })} /></Field>
          <Field name="Paging">
            <select className={input} value={cfg.paging} onChange={(e) => set({ paging: e.target.value })}>
              {Object.entries(PAGING_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </Field>
          {cfg.paging === 'next_url' && <Field name="Next URL field"><input className={`${input} font-mono text-xs`} value={cfg.next_path} onChange={(e) => set({ next_path: e.target.value })} /></Field>}
          {['offset', 'page'].includes(cfg.paging) && <Field name="Rows per page"><input className={input} type="number" min="1" max="10000" value={cfg.page_size} onChange={(e) => set({ page_size: e.target.value })} /></Field>}
          <Field name="Maximum rows"><input className={input} type="number" min="1" max={MAX_ROWS} placeholder={MAX_ROWS.toLocaleString()} value={cfg.max_rows} onChange={(e) => set({ max_rows: e.target.value })} /></Field>
          <Field name="Source name"><input className={input} value={cfg.name} placeholder="e.g. Employees" onChange={(e) => set({ name: e.target.value })} /></Field>
          <Field name="Extra headers (JSON)" className="sm:col-span-2"><input className={`${input} font-mono text-xs`} value={cfg.headers} placeholder='{"Accept": "application/json"}' onChange={(e) => set({ headers: e.target.value })} /></Field>
        </div>
      )}
      {rotated && (
        <div className="mt-3 rounded-md border border-amber-300 bg-amber-50 px-3 py-2.5 text-sm dark:border-amber-800 dark:bg-amber-950" role="alert">
          <p className="m-0 font-medium">The system issued a new refresh token. Save it now: the old one no longer works and Meldra does not keep it.</p>
          <div className="mt-2 flex items-center gap-2">
            <code className="min-w-0 flex-1 truncate rounded bg-white px-2 py-1 text-xs dark:bg-slate-900" data-testid="new-refresh-token">{rotated.token}</code>
            <Button size="sm" variant="outline" onClick={() => navigator.clipboard?.writeText(rotated.token).catch(() => {})}><Copy className="mr-1 h-3.5 w-3.5" />Copy</Button>
            <Button size="sm" onClick={() => { const r = rotated; setRotated(null); onAdd(r.src, r.msg); }}>I saved it, continue</Button>
          </div>
        </div>
      )}
      {err && <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300" role="alert">{err}</p>}
      <div className="mt-4 flex gap-2">
        <Button onClick={fetchNow} disabled={busy || Boolean(rotated) || !cfg.url.trim()}>{busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{busy ? 'Fetching…' : initial ? 'Fetch again' : 'Fetch and add'}</Button>
        <Button variant="ghost" onClick={onCancel} disabled={busy}>Cancel</Button>
      </div>
    </div>
  );
}
ApiConnector.propTypes = { initial: PropTypes.object, onAdd: PropTypes.func.isRequired, onCancel: PropTypes.func.isRequired };

const DB_TYPES = {
  postgresql: { name: 'PostgreSQL', port: 5432, host: 'host' },
  mysql: { name: 'MySQL / MariaDB', port: 3306, host: 'host' },
  mssql: { name: 'SQL Server / Azure SQL', port: 1433, host: 'server' },
};

/** Run one read-only query against a database and add the result as a source. */
export function DatabaseSource({ initial, onAdd, onCancel }) {
  const [type, setType] = useState(initial?.dbType || 'postgresql');
  const [conn, setConn] = useState(() => ({ host: '', port: '', database: '', username: '', password: '', ...(initial?.conn || {}) }));
  const [sql, setSql] = useState(initial?.query || 'SELECT * FROM ');
  const [system, setSystem] = useState(initial?.system || '');
  const [name, setName] = useState(initial?.name || '');
  const [limit, setLimit] = useState(initial?.limit || '50000');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const c = (patch) => setConn((x) => ({ ...x, ...patch }));

  const run = async () => {
    setErr('');
    if (!/^\s*select\b/i.test(sql)) {
      setErr('Only SELECT queries can be used.');
      return;
    }
    const d = DB_TYPES[type];
    const data = { [d.host]: conn.host.trim(), port: conn.port || d.port, database: conn.database.trim(), username: conn.username, password: conn.password };
    if (type === 'postgresql') data.sslMode = 'require';
    if (type === 'mssql') data.encrypt = 'true';
    setBusy(true);
    let id = null;
    try {
      const t = await backendApi.db.testConnection(type, data);
      if (!t?.success) throw new Error(t?.error || 'Could not connect to the database.');
      id = t.connectionId;
      const maxRows = Math.max(1, Math.min(MAX_ROWS, Number(limit) || MAX_ROWS));
      const out = await backendApi.db.query(id, type, sql.trim().replace(/;\s*$/, ''), maxRows);
      const sys = system.trim() || `${d.name.split(' ')[0]} ${conn.database}`.trim();
      const src = sourceFromTable(name.trim() || conn.database || 'Query', out.columns, out.data, sys, 'database', {
        type: 'database', dbType: type, conn: { host: conn.host, port: conn.port, database: conn.database, username: conn.username },
        query: sql, system: sys, name: name.trim(), limit,
      });
      src.truncated = Boolean(out.truncated);
      onAdd(src, `${out.rowCount.toLocaleString()} rows${out.truncated ? ' (row limit reached)' : ''}`);
    } catch (e) {
      setErr(e.message || 'The query failed.');
    } finally {
      if (id) backendApi.db.disconnect(id, type).catch(() => {});
      setBusy(false);
    }
  };

  return (
    <div className={card}>
      <h3 className="m-0 flex items-center gap-2 text-[15px] font-semibold"><Database className="h-4 w-4 text-blue-600" />{initial ? `Refresh ${initial.name || 'query'}` : 'Query a database'}</h3>
      <p className="mt-1 text-xs text-slate-500">Runs one read-only SELECT. Use a read-only database user; the password is not stored.</p>
      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field name="Database">
          <select className={input} value={type} onChange={(e) => setType(e.target.value)} disabled={Boolean(initial)}>
            {Object.entries(DB_TYPES).map(([k, v]) => <option key={k} value={k}>{v.name}</option>)}
          </select>
        </Field>
        <Field name="System name (shown on answers)"><input className={input} value={system} onChange={(e) => setSystem(e.target.value)} placeholder="e.g. Data warehouse" /></Field>
        <Field name="Host"><input className={input} value={conn.host} onChange={(e) => c({ host: e.target.value })} /></Field>
        <Field name="Port"><input className={input} type="number" value={conn.port} placeholder={String(DB_TYPES[type].port)} onChange={(e) => c({ port: e.target.value })} /></Field>
        <Field name="Database name"><input className={input} value={conn.database} onChange={(e) => c({ database: e.target.value })} /></Field>
        <Field name="Source name"><input className={input} value={name} placeholder="e.g. Invoices" onChange={(e) => setName(e.target.value)} /></Field>
        <Field name="User name"><input className={input} autoComplete="off" value={conn.username} onChange={(e) => c({ username: e.target.value })} /></Field>
        <Field name="Password"><input className={input} type="password" autoComplete="new-password" value={conn.password} onChange={(e) => c({ password: e.target.value })} /></Field>
        <Field name="Query (SELECT only)" className="sm:col-span-2">
          <textarea className={`${input} min-h-[90px] font-mono text-xs`} value={sql} onChange={(e) => setSql(e.target.value)} spellCheck={false} />
        </Field>
        <Field name="Maximum rows"><input className={input} type="number" min="1" max={MAX_ROWS} value={limit} onChange={(e) => setLimit(e.target.value)} /></Field>
      </div>
      {err && <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300" role="alert">{err}</p>}
      <div className="mt-4 flex gap-2">
        <Button onClick={run} disabled={busy || !conn.host.trim() || !conn.database.trim()}>{busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{busy ? 'Running…' : initial ? 'Run again' : 'Run and add'}</Button>
        <Button variant="ghost" onClick={onCancel} disabled={busy}>Cancel</Button>
      </div>
    </div>
  );
}
DatabaseSource.propTypes = { initial: PropTypes.object, onAdd: PropTypes.func.isRequired, onCancel: PropTypes.func.isRequired };
