import { useEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { Database, Loader2, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { backendApi } from '@/api/backendClient';
import { relationshipsFromForeignKeys, selectAll, sourceFromTable } from '@/lib/unifiedReporting/model';

const DB_TYPES = [
  { id: 'postgresql', label: 'PostgreSQL', port: 5432 },
  { id: 'mysql', label: 'MySQL / MariaDB', port: 3306 },
  { id: 'mssql', label: 'SQL Server / Azure SQL', port: 1433 },
];
const DEFAULT_LIMIT = 50000;

/**
 * Connect to a database, pick tables or write a query, and add the results
 * as Unified Reporting sources. The password is sent once to open the
 * connection and never stored; the connection is closed when the dialog
 * closes. In refresh mode the connection details and query come from the
 * source being refreshed.
 */
export default function DatabaseSourceDialog({ open, onOpenChange, onAdd, refreshOf, onRefresh }) {
  const origin = refreshOf?.origin;
  const [form, setForm] = useState({ dbType: 'postgresql', host: '', port: '5432', database: '', username: '', password: '', sslMode: 'prefer' });
  const [conn, setConn] = useState(null); // { id, dbType }
  const [tables, setTables] = useState([]);
  const [foreignKeys, setForeignKeys] = useState([]);
  const [picked, setPicked] = useState({});
  const [mode, setMode] = useState('tables');
  const [sql, setSql] = useState('');
  const [queryName, setQueryName] = useState('Query');
  const [system, setSystem] = useState('');
  const [limit, setLimit] = useState(DEFAULT_LIMIT);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const connRef = useRef(null);
  connRef.current = conn;

  useEffect(() => {
    if (!open) return;
    setError('');
    setTables([]);
    setPicked({});
    setConn(null);
    if (origin) {
      setForm((f) => ({ ...f, dbType: origin.dbType, host: origin.host || '', port: String(origin.port || ''), database: origin.database || '', username: origin.username || '', password: '' }));
    }
  }, [open, origin]);

  // Always close the server-side connection when the dialog goes away.
  const disconnect = async () => {
    const c = connRef.current;
    if (!c) return;
    setConn(null);
    try { await backendApi.db.disconnect(c.id, c.dbType); } catch { /* already gone */ }
  };
  useEffect(() => () => { disconnect(); }, []);
  const close = async () => {
    await disconnect();
    onOpenChange(false);
  };

  const set = (patch) => setForm((f) => ({ ...f, ...patch }));

  const connect = async () => {
    setBusy('connect');
    setError('');
    try {
      const data = form.dbType === 'mssql'
        ? { server: form.host, port: form.port, database: form.database, username: form.username, password: form.password, encrypt: 'true', trustServerCertificate: 'false' }
        : { host: form.host, port: form.port, database: form.database, username: form.username, password: form.password, sslMode: form.sslMode };
      const res = await backendApi.db.testConnection(form.dbType, data);
      if (!res?.success) throw new Error(res?.error || 'Connection failed');
      const c = { id: res.connectionId, dbType: form.dbType };
      setConn(c);
      set({ password: '' }); // not kept in the browser either
      if (origin) {
        await runRefresh(c);
        return;
      }
      const schema = await backendApi.db.getSchema(c.id, c.dbType);
      setTables(schema.tables || []);
      setForeignKeys(schema.relationships || []);
      setSystem((s) => s || form.database);
    } catch (e) {
      setError(e.message || 'Connection failed');
    }
    setBusy('');
  };

  const fetchRows = async (c, query) => {
    const res = await backendApi.db.query(c.id, c.dbType, query, Number(limit) || DEFAULT_LIMIT);
    if (!res?.success) throw new Error(res?.error || 'Query failed');
    return res;
  };

  const runRefresh = async (c) => {
    setBusy('add');
    try {
      const res = await fetchRows(c, origin.query);
      onRefresh(refreshOf.id, res.columns, res.data, !!res.truncated);
      await close();
    } catch (e) {
      setError(e.message);
    }
    setBusy('');
  };

  const add = async () => {
    setBusy('add');
    setError('');
    try {
      const base = { type: 'database', dbType: conn.dbType, host: form.host, port: form.port, database: form.database, username: form.username };
      const label = system.trim() || form.database;
      const created = [];
      if (mode === 'tables') {
        for (const t of tables.filter((x) => picked[x.name])) {
          const query = selectAll(conn.dbType, t.name);
          const res = await fetchRows(conn, query);
          const s = sourceFromTable(t.name, res.columns, res.data, label, { ...base, table: t.name, query });
          s.truncated = !!res.truncated;
          created.push(s);
        }
      } else {
        const res = await fetchRows(conn, sql);
        const s = sourceFromTable(queryName.trim() || 'Query', res.columns, res.data, label, { ...base, query: sql });
        s.truncated = !!res.truncated;
        created.push(s);
      }
      if (!created.length) throw new Error('Choose at least one table.');
      onAdd(created, relationshipsFromForeignKeys(foreignKeys, created));
      await close();
    } catch (e) {
      setError(e.message);
    }
    setBusy('');
  };

  const nPicked = Object.values(picked).filter(Boolean).length;
  const field = 'mt-1';

  return (
    <Dialog open={open} onOpenChange={(v) => (v ? onOpenChange(true) : close())}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Database className="h-5 w-5 text-blue-600" />{origin ? `Refresh “${refreshOf.name}”` : 'Connect a database'}</DialogTitle>
          <DialogDescription>
            {origin
              ? 'Enter the password again to re-run this source’s query. Your column choices are kept.'
              : 'Read-only: only single SELECT queries run, in a read-only transaction. The password is used once to connect and is never stored.'}
          </DialogDescription>
        </DialogHeader>

        {!conn && (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label htmlFor="db-type">Database</Label>
              <select id="db-type" disabled={!!origin} className="mt-1 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900" value={form.dbType} onChange={(e) => set({ dbType: e.target.value, port: String(DB_TYPES.find((d) => d.id === e.target.value).port) })}>
                {DB_TYPES.map((d) => <option key={d.id} value={d.id}>{d.label}</option>)}
              </select>
            </div>
            <div><Label htmlFor="db-host">{form.dbType === 'mssql' ? 'Server' : 'Host'}</Label><Input id="db-host" className={field} value={form.host} disabled={!!origin} onChange={(e) => set({ host: e.target.value })} placeholder="db.company.com" /></div>
            <div><Label htmlFor="db-port">Port</Label><Input id="db-port" className={field} value={form.port} disabled={!!origin} onChange={(e) => set({ port: e.target.value })} /></div>
            <div><Label htmlFor="db-name">Database name</Label><Input id="db-name" className={field} value={form.database} disabled={!!origin} onChange={(e) => set({ database: e.target.value })} /></div>
            <div><Label htmlFor="db-user">Username (read-only user recommended)</Label><Input id="db-user" className={field} value={form.username} disabled={!!origin} onChange={(e) => set({ username: e.target.value })} autoComplete="off" /></div>
            <div><Label htmlFor="db-pass">Password</Label><Input id="db-pass" type="password" className={field} value={form.password} onChange={(e) => set({ password: e.target.value })} autoComplete="new-password" /></div>
            {form.dbType === 'postgresql' && (
              <div>
                <Label htmlFor="db-ssl">SSL</Label>
                <select id="db-ssl" disabled={!!origin} className="mt-1 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900" value={form.sslMode} onChange={(e) => set({ sslMode: e.target.value })}>
                  <option value="prefer">Prefer</option><option value="require">Require</option><option value="disable">Disable</option>
                </select>
              </div>
            )}
            <p className="flex items-center gap-1.5 text-xs text-slate-500 sm:col-span-2"><Lock className="h-3.5 w-3.5" />The server must be reachable from Meldra’s backend. Use a read-only database user.</p>
            <div className="sm:col-span-2">
              <Button onClick={connect} disabled={busy === 'connect' || !form.host || !form.database || !form.username}>
                {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}{origin ? 'Connect and refresh' : 'Connect'}
              </Button>
            </div>
          </div>
        )}

        {conn && !origin && (
          <div className="space-y-4">
            <div className="flex gap-1 rounded-lg bg-slate-100 p-1 text-sm dark:bg-slate-800" role="tablist">
              {[['tables', `Tables (${tables.length})`], ['query', 'Custom query']].map(([k, l]) => (
                <button key={k} type="button" role="tab" aria-selected={mode === k} onClick={() => setMode(k)} className={`flex-1 rounded-md px-3 py-1.5 ${mode === k ? 'bg-white shadow-sm dark:bg-slate-900' : 'text-slate-600 dark:text-slate-300'}`}>{l}</button>
              ))}
            </div>

            {mode === 'tables' ? (
              <div className="max-h-64 overflow-y-auto rounded-lg border border-slate-200 dark:border-slate-700">
                {tables.length ? tables.map((t) => (
                  <label key={t.name} className="flex cursor-pointer items-center gap-3 border-b border-slate-100 px-3 py-2 text-sm last:border-0 dark:border-slate-800">
                    <input type="checkbox" checked={!!picked[t.name]} onChange={(e) => setPicked((p) => ({ ...p, [t.name]: e.target.checked }))} aria-label={`Use table ${t.name}`} />
                    <span className="font-mono">{t.name}</span>
                    <span className="ml-auto text-xs text-slate-500">{[t.columns?.length ? `${t.columns.length} columns` : '', t.rowCount !== undefined ? `${Number(t.rowCount).toLocaleString()} rows` : ''].filter(Boolean).join(' · ')}</span>
                  </label>
                )) : <p className="p-3 text-sm text-slate-500">No tables found in the default schema. Use a custom query instead.</p>}
              </div>
            ) : (
              <div className="space-y-2">
                <div><Label htmlFor="db-qname">Source name</Label><Input id="db-qname" className={field} value={queryName} onChange={(e) => setQueryName(e.target.value)} /></div>
                <div>
                  <Label htmlFor="db-sql">SELECT query</Label>
                  <textarea id="db-sql" className="mt-1 min-h-[140px] w-full rounded-md border border-slate-200 bg-white p-2 font-mono text-xs dark:border-slate-700 dark:bg-slate-900" value={sql} onChange={(e) => setSql(e.target.value)} placeholder="SELECT department, SUM(amount) AS amount FROM expenses GROUP BY department" spellCheck={false} />
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div><Label htmlFor="db-system">System name (shown on answers)</Label><Input id="db-system" className={field} value={system} onChange={(e) => setSystem(e.target.value)} placeholder="e.g. Finance DB" /></div>
              <div><Label htmlFor="db-limit">Row limit per source</Label><Input id="db-limit" type="number" min="1" max="200000" className={field} value={limit} onChange={(e) => setLimit(e.target.value)} /></div>
            </div>
            {mode === 'tables' && foreignKeys.length > 0 && <p className="text-xs text-slate-500">{foreignKeys.length} foreign key{foreignKeys.length > 1 ? 's' : ''} found: links between the tables you pick are added automatically.</p>}
            <div className="flex gap-2">
              <Button onClick={add} disabled={busy === 'add' || (mode === 'tables' ? !nPicked : !sql.trim())}>
                {busy === 'add' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {mode === 'tables' ? `Add ${nPicked || ''} table${nPicked === 1 ? '' : 's'}` : 'Run and add'}
              </Button>
              <Button variant="ghost" onClick={close}>Cancel</Button>
            </div>
          </div>
        )}

        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800 dark:bg-red-950 dark:text-red-200" role="alert">{error}</p>}
      </DialogContent>
    </Dialog>
  );
}

DatabaseSourceDialog.propTypes = {
  open: PropTypes.bool.isRequired,
  onOpenChange: PropTypes.func.isRequired,
  onAdd: PropTypes.func,
  refreshOf: PropTypes.object,
  onRefresh: PropTypes.func,
};
