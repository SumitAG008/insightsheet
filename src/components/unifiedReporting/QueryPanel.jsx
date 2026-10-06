import { useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import { Button } from '@/components/ui/button';
import { Copy, Play, RotateCcw, Table2, Check, Database } from 'lucide-react';
import { runSql, specToSql, sqlToResult, tableColumns } from '@/lib/unifiedReporting/sqlQuery';
import { fmt, tablesIn } from '@/lib/unifiedReporting/engine';

const OP = { eq: '=', neq: '≠', gte: '≥', lte: '≤' };
const pretty = (k) => String(k).replace(/_/g, ' ');

/** What a chart uses: per series its source, column, calculation and filters; then how they join. */
function UsedColumns({ spec, m }) {
  if (spec.sql) {
    const views = (spec.tables || []).map((k) => m.views[k]).filter(Boolean);
    return <p className="m-0 text-sm text-slate-600 dark:text-slate-300">Your own SQL over {views.map((v) => `${v.key} (${v.sys})`).join(', ') || 'your sources'}.</p>;
  }
  const lookups = [];
  const rows = spec.series.map((s) => {
    const V = m.views[s.view];
    const filters = [...s.filters, ...(spec.filters || []).filter((f) => V?.dims.includes(f.dim))];
    [spec.groupBy, spec.splitBy, ...filters.map((f) => f.dim)].forEach((d) => {
      const b = V?.borrowed.find((x) => x.key === d);
      if (b) {
        const t = Object.values(m.views).find((x) => x.id === b.via.to.source);
        const text = `${V.key}.${b.via.from.col} → ${t?.key}.${b.via.to.col} gives ${V.label} its ${pretty(d)} (from ${b.from})`;
        if (!lookups.includes(text)) lookups.push(text);
      }
    });
    return { s, V, filters };
  });
  return (
    <div className="space-y-2">
      <div className="overflow-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-xs text-slate-500 dark:border-slate-700">
              <th className="py-1.5 pr-3 font-medium">Series</th>
              <th className="py-1.5 pr-3 font-medium">Table (system)</th>
              <th className="py-1.5 pr-3 font-medium">Column</th>
              <th className="py-1.5 pr-3 font-medium">Calculation</th>
              <th className="py-1.5 font-medium">Rows kept</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ s, V, filters }, i) => (
              <tr key={`${i}-${s.label}`} className="border-b border-slate-100 align-top dark:border-slate-800">
                <td className="py-1.5 pr-3">{s.label}</td>
                <td className="py-1.5 pr-3 font-mono text-xs">{s.view}<span className="font-sans text-slate-500"> ({V?.sys})</span></td>
                <td className="py-1.5 pr-3 font-mono text-xs">{s.measure || '*'}</td>
                <td className="py-1.5 pr-3">{s.agg === 'count' ? 'COUNT rows' : `${s.agg.toUpperCase()} of ${pretty(s.measure)}`}</td>
                <td className="py-1.5 text-xs">{filters.length ? filters.map((f) => `${f.dim} ${OP[f.op]} ${f.value}`).join(' and ') : 'all rows'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ul className="m-0 list-disc space-y-0.5 pl-5 text-sm text-slate-600 dark:text-slate-300">
        {spec.groupBy && <li>Broken down by <strong>{pretty(spec.groupBy)}</strong>{spec.splitBy ? <> and split by <strong>{pretty(spec.splitBy)}</strong></> : null}.</li>}
        {spec.series.length > 1 && <li>Each table is totalled on its own, then the totals are joined on {spec.groupBy ? <strong>{pretty(spec.groupBy)}</strong> : 'one row'} (every value from either side is kept).</li>}
        {lookups.map((l) => <li key={l}>Lookup: <span className="font-mono text-xs">{l}</span></li>)}
        {(spec.derived || []).map((d) => (
          <li key={d.label}><strong>{d.label}</strong> = {d.numerator.map((k) => spec.series[k]?.label).join(' + ')}{d.denominator !== null ? ` ÷ ${spec.series[d.denominator]?.label}` : ''}, on the totals</li>
        ))}
      </ul>
    </div>
  );
}
UsedColumns.propTypes = { spec: PropTypes.object.isRequired, m: PropTypes.object.isRequired };

/** Every source table the customer can write SQL against, with its columns. */
function TablesList({ m, highlight }) {
  return (
    <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
      {Object.values(m.views).map((v) => (
        <div key={v.key} className={`rounded-lg border p-2 text-xs ${highlight.includes(v.key) ? 'border-blue-300 bg-blue-50/50 dark:border-blue-800 dark:bg-blue-950/30' : 'border-slate-200 dark:border-slate-700'}`}>
          <div className="font-mono font-semibold">{v.key}</div>
          <div className="text-slate-500">{v.sys} · {v.rowCount.toLocaleString()} rows{v.remote ? ' · in the meldra lakehouse' : ' · in this browser'}</div>
          <div className="mt-1 flex flex-wrap gap-1">
            {tableColumns(m, v.key).map((c) => (
              <span key={c.key} title={c.name} className="rounded bg-slate-100 px-1.5 py-0.5 font-mono dark:bg-slate-800">
                {c.key}<span className="text-slate-400"> {c.type === 'number' ? 'num' : 'text'}</span>
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
TablesList.propTypes = { m: PropTypes.object.isRequired, highlight: PropTypes.array.isRequired };

/**
 * The query behind a chart: which tables, columns and joins it uses, the SQL
 * that gives its numbers, and an editor to change that SQL, run it and use
 * the result in the chart.
 */
export default function QueryPanel({ spec, m, onUseSql, onReset }) {
  const generated = useMemo(() => {
    try {
      return specToSql(spec, m);
    } catch {
      return { sql: '', meta: null };
    }
  }, [spec, m]);
  const [text, setText] = useState(null);
  const [run, setRun] = useState(null); // { res, out, ms } | { error }
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showTables, setShowTables] = useState(false);
  const sql = text ?? generated.sql;
  const edited = text !== null && text !== generated.sql;

  const go = async () => {
    setBusy(true);
    setRun(null);
    const t0 = performance.now();
    try {
      const out = await runSql(sql, m);
      setRun({ out, res: sqlToResult(out, generated.meta, m.currency), ms: Math.round(performance.now() - t0) });
    } catch (e) {
      setRun({ error: e.message || 'The query could not be run.' });
    } finally {
      setBusy(false);
    }
  };
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(sql);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch { /* clipboard blocked */ }
  };
  // Units and column roles carry over while the edited query keeps the generated query's label columns.
  const metaFits = Boolean(generated.meta && run?.out && [generated.meta.label, generated.meta.split].filter(Boolean).every((c) => run.out.columns.includes(c)));
  const canUse = run?.res && (run.res.series.length || run.res.derived.length) && (edited || spec.sql);

  return (
    <div className="space-y-3" data-testid="query-panel">
      <div>
        <h4 className="mb-1.5 text-xs font-medium uppercase tracking-wider text-slate-400">Tables, columns and joins</h4>
        <UsedColumns spec={spec} m={m} />
      </div>
      <div>
        <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
          <h4 className="text-xs font-medium uppercase tracking-wider text-slate-400">SQL {edited ? '(edited)' : spec.sql ? '(yours)' : '(gives the numbers above)'}</h4>
          <div className="flex flex-wrap gap-1">
            <Button variant="ghost" size="sm" onClick={copy}>{copied ? <Check className="mr-1.5 h-3.5 w-3.5" /> : <Copy className="mr-1.5 h-3.5 w-3.5" />}Copy</Button>
            <Button variant="ghost" size="sm" onClick={() => setShowTables(!showTables)} aria-expanded={showTables}><Database className="mr-1.5 h-3.5 w-3.5" />Tables you can query</Button>
            {edited && <Button variant="ghost" size="sm" onClick={() => { setText(null); setRun(null); }}><RotateCcw className="mr-1.5 h-3.5 w-3.5" />Undo edits</Button>}
          </div>
        </div>
        {showTables && <div className="mb-2"><TablesList m={m} highlight={tablesIn(sql, m)} /></div>}
        <textarea
          aria-label="SQL query"
          className="min-h-[220px] w-full resize-y rounded-lg border border-slate-200 bg-slate-50 p-3 font-mono text-xs leading-relaxed dark:border-slate-700 dark:bg-slate-950"
          spellCheck={false}
          value={sql}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') { e.preventDefault(); go(); } }}
        />
        <div className="mt-1.5 flex flex-wrap items-center gap-2">
          <Button size="sm" onClick={go} disabled={busy}><Play className="mr-1.5 h-3.5 w-3.5" />{busy ? 'Running…' : 'Run SQL'}</Button>
          {canUse && <Button size="sm" variant="outline" onClick={() => onUseSql(sql, metaFits ? generated.meta : null)}><Table2 className="mr-1.5 h-3.5 w-3.5" />Use this result in the chart</Button>}
          {spec.sql && onReset && <Button size="sm" variant="ghost" onClick={onReset}><RotateCcw className="mr-1.5 h-3.5 w-3.5" />Back to meldra&apos;s query</Button>}
          <span className="text-xs text-slate-400">Read-only: SELECT queries only. Ctrl+Enter runs.</span>
        </div>
      </div>
      {run?.error && <p className="m-0 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300" role="alert">{run.error}</p>}
      {run?.out && (
        <div>
          <p className="mb-1 text-xs text-slate-500">
            {run.out.rows.length.toLocaleString()} row{run.out.rows.length === 1 ? '' : 's'}{run.out.truncated ? ' (first 5,000)' : ''} · {run.out.where === 'lakehouse' ? 'ran in the meldra lakehouse' : 'ran in this browser'} · {run.ms} ms
          </p>
          <div className="max-h-72 overflow-auto rounded-lg border border-slate-200 dark:border-slate-700">
            <table className="w-full border-collapse text-xs">
              <thead className="sticky top-0 bg-slate-100 dark:bg-slate-800">
                <tr>{run.out.columns.map((c, i) => <th key={`${i}-${c}`} className="px-2 py-1.5 text-left font-medium">{c}</th>)}</tr>
              </thead>
              <tbody>
                {run.out.rows.slice(0, 200).map((r, i) => (
                  <tr key={i} className="border-t border-slate-100 dark:border-slate-800">
                    {r.map((v, j) => {
                      const col = generated.meta?.columns?.[run.out.columns[j]];
                      return <td key={j} className={`whitespace-nowrap px-2 py-1 ${typeof v === 'number' ? 'text-right tabular-nums' : ''}`}>{typeof v === 'number' && col ? fmt(v, col.unit, m.currency) : v === null ? '—' : String(v)}</td>;
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

QueryPanel.propTypes = {
  spec: PropTypes.object.isRequired,
  m: PropTypes.object.isRequired,
  onUseSql: PropTypes.func.isRequired,
  onReset: PropTypes.func,
};
