import { useMemo, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronRight, Database, FileSpreadsheet, Link2, Loader2, Plug, RefreshCw, Trash2, Upload, X } from 'lucide-react';
import { suggestRelationships } from '@/lib/unifiedReporting/model';
import { ApiConnector, DatabaseSource } from './ConnectSources';

const ROLE_LABEL = { dimension: 'Break down by', measure: 'Number to add up', ignore: 'Ignore' };
const TYPE_LABEL = { number: '123', date: 'date', text: 'abc' };
const select = 'rounded-md border border-slate-200 bg-white px-2 py-1 text-sm dark:border-slate-700 dark:bg-slate-900';
const card = 'rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900';

export function UploadZone({ onFiles, busy, compact }) {
  const input = useRef(null);
  const [over, setOver] = useState(false);
  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setOver(true); }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => { e.preventDefault(); setOver(false); onFiles([...e.dataTransfer.files]); }}
      className={`rounded-2xl border-2 border-dashed text-center transition-colors ${over ? 'border-blue-500 bg-blue-50 dark:bg-blue-950' : 'border-slate-300 bg-white dark:border-slate-700 dark:bg-slate-900'} ${compact ? 'px-4 py-5' : 'px-6 py-10'}`}
    >
      <input ref={input} type="file" multiple accept=".csv,.tsv,.xlsx,.xls" className="hidden" onChange={(e) => { onFiles([...e.target.files]); e.target.value = ''; }} />
      {busy ? <Loader2 className="mx-auto h-7 w-7 animate-spin text-blue-600" /> : <Upload className="mx-auto h-7 w-7 text-blue-600" />}
      <p className="mt-2 font-medium">{busy ? 'Reading your files…' : 'Drop exports from any system here'}</p>
      <p className="mt-1 text-sm text-slate-500">CSV or Excel. One file (or sheet) per system, e.g. an HR export, an expenses export, a sales export. Files stay in this browser.</p>
      <Button className="mt-4" variant={compact ? 'outline' : 'default'} disabled={busy} onClick={() => input.current?.click()}>Choose files</Button>
    </div>
  );
}
UploadZone.propTypes = { onFiles: PropTypes.func.isRequired, busy: PropTypes.bool, compact: PropTypes.bool };

const KIND_ICON = { api: Plug, database: Database };
const hostOf = (url) => {
  try { return new URL(url).hostname; } catch { return ''; }
};

function SourceCard({ s, onUpdate, onRemove, onRenameColumn, onRefresh }) {
  const [open, setOpen] = useState(false);
  const Icon = KIND_ICON[s.kind] || FileSpreadsheet;
  const measures = s.columns.filter((c) => c.role === 'measure').length;
  const dims = s.columns.filter((c) => c.role === 'dimension').length;
  return (
    <div className={card}>
      <div className="flex items-start gap-3">
        <Icon className="mt-1 h-5 w-5 flex-none text-blue-600" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="m-0 truncate text-[15px] font-semibold">{s.name}</h3>
            {s.kind === 'sample' && <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs text-amber-700 dark:bg-amber-950 dark:text-amber-300">Sample</span>}
            {s.origin && (
              <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                {s.origin.type === 'api' ? `API · ${hostOf(s.origin.url)}` : `Database · ${s.origin.conn?.database || ''}`}
              </span>
            )}
          </div>
          <label className="mt-1.5 flex items-center gap-2 text-sm text-slate-500">
            System
            <input
              className="w-44 rounded-md border border-slate-200 bg-transparent px-2 py-0.5 text-sm text-slate-900 dark:border-slate-700 dark:text-slate-100"
              value={s.system}
              onChange={(e) => onUpdate({ system: e.target.value })}
              aria-label={`System name for ${s.name}`}
            />
          </label>
          <p className="mt-1.5 text-xs text-slate-500">
            {s.rows.length.toLocaleString()} rows{s.truncated ? ` (row limit reached${s.origin ? '' : ': first 200,000 kept'})` : ''} · {dims} breakdowns · {measures} numbers
            {s.refreshedAt && ` · fetched ${new Date(s.refreshedAt).toLocaleString()}`}
          </p>
        </div>
        {s.origin && <Button variant="ghost" size="icon" aria-label={`Refresh ${s.name}`} title="Fetch again" onClick={onRefresh}><RefreshCw className="h-4 w-4" /></Button>}
        <Button variant="ghost" size="icon" aria-label={`Remove ${s.name}`} onClick={onRemove}><Trash2 className="h-4 w-4" /></Button>
      </div>
      <button type="button" onClick={() => setOpen(!open)} className="mt-3 flex items-center gap-1 text-sm font-medium text-blue-700 dark:text-blue-400" aria-expanded={open}>
        {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />} Columns
      </button>
      {open && (
        <div className="mt-2 overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs text-slate-500 dark:border-slate-700">
                <th className="py-1.5 pr-2 font-medium">Column in file</th>
                <th className="py-1.5 pr-2 font-medium">Name used for joining</th>
                <th className="py-1.5 pr-2 font-medium">Use as</th>
              </tr>
            </thead>
            <tbody>
              {s.columns.map((c) => (
                <tr key={c.key} className="border-b border-slate-100 dark:border-slate-800">
                  <td className="py-1.5 pr-2">
                    <span className="mr-1.5 rounded bg-slate-100 px-1 font-mono text-[10px] text-slate-500 dark:bg-slate-800">{TYPE_LABEL[c.type]}</span>
                    {c.name}
                  </td>
                  <td className="py-1.5 pr-2">
                    <input
                      className="w-40 rounded-md border border-slate-200 bg-transparent px-2 py-0.5 font-mono text-xs dark:border-slate-700"
                      defaultValue={c.key}
                      aria-label={`Join name for ${c.name}`}
                      onBlur={(e) => { if (e.target.value !== c.key) e.target.value = onRenameColumn(c.key, e.target.value) || c.key; }}
                    />
                  </td>
                  <td className="py-1.5 pr-2">
                    {c.type === 'date' ? (
                      <span className="text-xs text-slate-500">Gives <code>month</code></span>
                    ) : (
                      <select
                        className={select}
                        value={c.role}
                        aria-label={`Use of ${c.name}`}
                        onChange={(e) => onUpdate({ columns: s.columns.map((x) => (x.key === c.key ? { ...x, role: e.target.value, unit: e.target.value === 'measure' ? x.unit || 'number' : x.unit } : x)) })}
                      >
                        <option value="dimension">{ROLE_LABEL.dimension}</option>
                        {c.type === 'number' && <option value="measure">{ROLE_LABEL.measure}</option>}
                        <option value="ignore">{ROLE_LABEL.ignore}</option>
                      </select>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-2 text-xs text-slate-500">Give columns that mean the same thing the same join name (e.g. <code>Dept</code> and <code>Department</code> → <code>department</code>) so sources can be combined on them.</p>
        </div>
      )}
    </div>
  );
}
SourceCard.propTypes = { s: PropTypes.object.isRequired, onUpdate: PropTypes.func.isRequired, onRemove: PropTypes.func.isRequired, onRenameColumn: PropTypes.func.isRequired, onRefresh: PropTypes.func };

function RelationshipForm({ sources, onAdd }) {
  const [from, setFrom] = useState({ source: '', col: '' });
  const [to, setTo] = useState({ source: '', col: '' });
  const cols = (id) => (sources.find((s) => s.id === id)?.columns || []).filter((c) => c.role !== 'ignore');
  const ok = from.source && from.col && to.source && to.col && from.source !== to.source;
  return (
    <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
      <select className={select} value={from.source} onChange={(e) => setFrom({ source: e.target.value, col: '' })} aria-label="Source to enrich">
        <option value="">Source…</option>
        {sources.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
      </select>
      <select className={select} value={from.col} onChange={(e) => setFrom({ ...from, col: e.target.value })} aria-label="Key column" disabled={!from.source}>
        <option value="">column…</option>
        {cols(from.source).map((c) => <option key={c.key} value={c.key}>{c.key}</option>)}
      </select>
      <span className="text-slate-500">looks up</span>
      <select className={select} value={to.source} onChange={(e) => setTo({ source: e.target.value, col: '' })} aria-label="Lookup source">
        <option value="">Source…</option>
        {sources.filter((s) => s.id !== from.source).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
      </select>
      <select className={select} value={to.col} onChange={(e) => setTo({ ...to, col: e.target.value })} aria-label="Lookup column" disabled={!to.source}>
        <option value="">column…</option>
        {cols(to.source).map((c) => <option key={c.key} value={c.key}>{c.key}</option>)}
      </select>
      <Button size="sm" variant="outline" disabled={!ok} onClick={() => { onAdd({ id: `rel_${Date.now()}`, from, to }); setFrom({ source: '', col: '' }); setTo({ source: '', col: '' }); }}>Add link</Button>
    </div>
  );
}
RelationshipForm.propTypes = { sources: PropTypes.array.isRequired, onAdd: PropTypes.func.isRequired };

export default function SourcesView({ m, busy, onFiles, onLoadSample, onAddSource, onRefreshSource, onUpdateSource, onRemoveSource, onRenameColumn, onAddRelationship, onRemoveRelationship, onClearAll }) {
  const name = (id) => m.sources.find((s) => s.id === id)?.name || '?';
  // Which connector form is open: { kind: 'api' | 'database', refresh?: source }.
  const [connect, setConnect] = useState(null);
  const done = (src, msg) => {
    if (connect?.refresh) onRefreshSource(connect.refresh.id, src, msg);
    else onAddSource(src, msg);
    setConnect(null);
  };
  const suggestions = useMemo(() => suggestRelationships(m.sources, m.relationships), [m.sources, m.relationships]);
  const hasSample = m.sources.some((s) => s.kind === 'sample');

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_380px]">
      <div className="space-y-4">
        <UploadZone onFiles={onFiles} busy={busy} compact={!m.empty} />
        {!connect && (
          <div className="flex flex-wrap items-center justify-center gap-2 text-sm">
            <span className="text-slate-500">Or pull live data:</span>
            <Button variant="outline" size="sm" onClick={() => setConnect({ kind: 'api' })}><Plug className="mr-1.5 h-4 w-4" />Connect an API</Button>
            <Button variant="outline" size="sm" onClick={() => setConnect({ kind: 'database' })}><Database className="mr-1.5 h-4 w-4" />Query a database</Button>
          </div>
        )}
        {connect?.kind === 'api' && <ApiConnector key={connect.refresh?.id || 'new'} initial={connect.refresh?.origin} onAdd={done} onCancel={() => setConnect(null)} />}
        {connect?.kind === 'database' && <DatabaseSource key={connect.refresh?.id || 'new'} initial={connect.refresh?.origin} onAdd={done} onCancel={() => setConnect(null)} />}
        {!hasSample && (
          <p className="text-center text-sm text-slate-500">
            No exports to hand?{' '}
            <button type="button" onClick={onLoadSample} className="font-medium text-blue-700 underline dark:text-blue-400">Load a sample company</button>{' '}
            (six systems: SAP S/4, Billing, Salesforce, SuccessFactors, Concur, Ariba).
          </p>
        )}
        {m.sources.map((s) => (
          <SourceCard
            key={s.id}
            s={s}
            onUpdate={(patch) => onUpdateSource(s.id, patch)}
            onRemove={() => onRemoveSource(s.id)}
            onRenameColumn={(oldKey, newKey) => onRenameColumn(s.id, oldKey, newKey)}
            onRefresh={() => { setConnect({ kind: s.origin?.type, refresh: s }); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
          />
        ))}
        {!m.empty && (
          <div className="text-right">
            <Button variant="ghost" size="sm" className="text-red-600" onClick={onClearAll}><Trash2 className="mr-1.5 h-3.5 w-3.5" />Remove all data</Button>
          </div>
        )}
      </div>

      <aside className="space-y-4">
        <div className={card}>
          <h3 className="m-0 flex items-center gap-2 text-[15px] font-semibold"><Database className="h-4 w-4 text-blue-600" />Shared dimensions</h3>
          <p className="mt-1 text-sm text-slate-500">Columns found in two or more sources. Any numbers can be compared across sources on these.</p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {m.shared.length ? m.shared.map((d) => (
              <span key={d} className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                {d} · {Object.values(m.views).filter((v) => v.dims.includes(d)).map((v) => v.sys).join(', ')}
              </span>
            )) : <span className="text-sm text-slate-400">None yet. Add a second source, or align column names.</span>}
          </div>
        </div>

        <div className={card}>
          <h3 className="m-0 flex items-center gap-2 text-[15px] font-semibold"><Link2 className="h-4 w-4 text-blue-600" />Links between sources</h3>
          <p className="mt-1 text-sm text-slate-500">A link lets one source use another&rsquo;s columns, e.g. expenses (by employee ID) can be broken down by the employee&rsquo;s department.</p>
          {m.relationships.map((r) => (
            <div key={r.id} className="mt-2 flex items-center justify-between gap-2 rounded-lg bg-slate-50 px-3 py-2 text-sm dark:bg-slate-800">
              <span><strong>{name(r.from.source)}</strong>.{r.from.col} → <strong>{name(r.to.source)}</strong>.{r.to.col}</span>
              <Button variant="ghost" size="icon" className="h-7 w-7" aria-label="Remove link" onClick={() => onRemoveRelationship(r.id)}><X className="h-3.5 w-3.5" /></Button>
            </div>
          ))}
          {suggestions.length > 0 && (
            <>
              <div className="mt-4 text-xs font-medium uppercase tracking-wider text-slate-400">Suggested from your data</div>
              {suggestions.slice(0, 5).map((r) => (
                <div key={r.id} className="mt-2 flex items-center justify-between gap-2 rounded-lg border border-dashed border-blue-300 px-3 py-2 text-sm dark:border-blue-800">
                  <span><strong>{name(r.from.source)}</strong>.{r.from.col} → <strong>{name(r.to.source)}</strong>.{r.to.col} <span className="text-xs text-slate-500">({Math.round(r.overlap * 100)}% of values match)</span></span>
                  <Button size="sm" variant="outline" onClick={() => onAddRelationship({ id: r.id, from: r.from, to: r.to })}>Link</Button>
                </div>
              ))}
            </>
          )}
          {m.sources.length > 1 && <RelationshipForm sources={m.sources} onAdd={onAddRelationship} />}
        </div>
      </aside>
    </div>
  );
}

SourcesView.propTypes = {
  m: PropTypes.object.isRequired,
  busy: PropTypes.bool,
  onFiles: PropTypes.func.isRequired,
  onLoadSample: PropTypes.func.isRequired,
  onAddSource: PropTypes.func.isRequired,
  onRefreshSource: PropTypes.func.isRequired,
  onUpdateSource: PropTypes.func.isRequired,
  onRemoveSource: PropTypes.func.isRequired,
  onRenameColumn: PropTypes.func.isRequired,
  onAddRelationship: PropTypes.func.isRequired,
  onRemoveRelationship: PropTypes.func.isRequired,
  onClearAll: PropTypes.func.isRequired,
};
