import { useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import { Filter, Plus, X } from 'lucide-react';
import { distinctValues } from '@/lib/unifiedReporting/engine';

const select = 'rounded-md border border-slate-200 bg-white px-2 py-1 text-sm dark:border-slate-700 dark:bg-slate-900';
const pretty = (k) => String(k).replace(/_/g, ' ');
const OP_WORD = { eq: 'is', neq: 'is not', gte: 'from', lte: 'up to' };

/** Values a filter can pick from: distinct values across every source that has the column. */
function valuesFor(m, viewKeys, dim) {
  const set = new Set();
  for (const k of viewKeys) {
    if (!m.views[k]?.dims.includes(dim)) continue;
    distinctValues(m, k, dim, 400).forEach((v) => set.add(v));
  }
  return [...set].sort((a, b) => a.localeCompare(b, undefined, { numeric: true })).slice(0, 300);
}

/**
 * Chips for the active filters and a small form to add one. Month filters
 * are ranges (from / up to); other columns are is / is not.
 */
export function FilterBar({ m, viewKeys, filters, onChange, dims: onlyDims, note }) {
  const dims = useMemo(() => {
    const all = [...new Set(viewKeys.flatMap((k) => m.views[k]?.dims || []))];
    return (onlyDims ? all.filter((d) => onlyDims.includes(d)) : all).sort((a, b) => (a === 'month' ? -1 : b === 'month' ? 1 : a.localeCompare(b)));
  }, [m, viewKeys, onlyDims]);
  const [adding, setAdding] = useState(false);
  const [dim, setDim] = useState('');
  const [op, setOp] = useState('eq');
  const [value, setValue] = useState('');
  const values = useMemo(() => (dim ? valuesFor(m, viewKeys, dim) : []), [m, viewKeys, dim]);

  const reset = () => {
    setAdding(false);
    setDim('');
    setOp('eq');
    setValue('');
  };
  const add = () => {
    if (!dim || value === '') return;
    onChange([...filters, { dim, op, value }]);
    reset();
  };

  return (
    <div className="flex flex-wrap items-center gap-1.5 text-sm">
      <Filter className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
      {filters.map((f, i) => (
        <span key={`${f.dim}-${f.op}-${f.value}`} className="inline-flex items-center gap-1 rounded-full bg-blue-50 py-0.5 pl-2.5 pr-1 text-xs text-blue-800 dark:bg-blue-950 dark:text-blue-200">
          {pretty(f.dim)} {OP_WORD[f.op]} <strong className="font-semibold">{f.value}</strong>
          <button type="button" aria-label={`Remove filter ${pretty(f.dim)} ${OP_WORD[f.op]} ${f.value}`} onClick={() => onChange(filters.filter((_, j) => j !== i))} className="rounded-full p-0.5 hover:bg-blue-100 dark:hover:bg-blue-900">
            <X className="h-3 w-3" />
          </button>
        </span>
      ))}
      {!adding && (
        <button type="button" onClick={() => setAdding(true)} disabled={!dims.length} className="inline-flex items-center gap-1 rounded-full border border-dashed border-slate-300 px-2.5 py-0.5 text-xs text-slate-600 hover:border-blue-500 disabled:opacity-50 dark:border-slate-600 dark:text-slate-300">
          <Plus className="h-3 w-3" />{filters.length ? 'Filter' : 'Add filter'}
        </button>
      )}
      {adding && (
        <span className="inline-flex flex-wrap items-center gap-1.5">
          <select className={select} value={dim} aria-label="Filter column" onChange={(e) => { setDim(e.target.value); setValue(''); setOp(e.target.value === 'month' ? 'gte' : 'eq'); }}>
            <option value="">Column…</option>
            {dims.map((d) => <option key={d} value={d}>{pretty(d)}</option>)}
          </select>
          {dim && (
            <select className={select} value={op} aria-label="Filter condition" onChange={(e) => setOp(e.target.value)}>
              {(dim === 'month' ? ['gte', 'lte', 'eq'] : ['eq', 'neq']).map((o) => <option key={o} value={o}>{OP_WORD[o]}</option>)}
            </select>
          )}
          {dim && (values.length ? (
            <select className={`${select} max-w-[200px]`} value={value} aria-label="Filter value" onChange={(e) => setValue(e.target.value)}>
              <option value="">Value…</option>
              {values.map((v) => <option key={v} value={v}>{v}</option>)}
            </select>
          ) : (
            <input className={`${select} w-32`} value={value} aria-label="Filter value" onChange={(e) => setValue(e.target.value)} />
          ))}
          <button type="button" onClick={add} disabled={!dim || value === ''} className="rounded-md bg-blue-600 px-2.5 py-1 text-xs font-medium text-white disabled:opacity-40">Apply</button>
          <button type="button" onClick={reset} className="rounded-md px-2 py-1 text-xs text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800">Cancel</button>
        </span>
      )}
      {note && <span className="text-xs text-slate-500">{note}</span>}
    </div>
  );
}
FilterBar.propTypes = {
  m: PropTypes.object.isRequired,
  viewKeys: PropTypes.arrayOf(PropTypes.string).isRequired,
  filters: PropTypes.array.isRequired,
  onChange: PropTypes.func.isRequired,
  dims: PropTypes.arrayOf(PropTypes.string),
  note: PropTypes.node,
};

/** Second breakdown, period comparison, rolling window and share of total for one answer. */
export function AnalyseBar({ m, spec, onChange }) {
  if (!spec.groupBy) return null;
  const monthly = spec.groupBy === 'month';
  const canSplit = spec.series.length === 1 && !spec.derived.length;
  const splitDims = canSplit ? (m.views[spec.series[0].view]?.dims || []).filter((d) => d !== spec.groupBy) : [];
  const label = 'flex items-center gap-1.5 text-xs text-slate-500';
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
      {canSplit && splitDims.length > 0 && (
        <label className={label}>
          Split by
          <select className={select} value={spec.splitBy || ''} onChange={(e) => onChange({ splitBy: e.target.value || null, chart: e.target.value ? (monthly ? 'line' : 'bar') : spec.chart })}>
            <option value="">—</option>
            {splitDims.map((d) => <option key={d} value={d}>{pretty(d)}</option>)}
          </select>
        </label>
      )}
      {monthly && !spec.splitBy && (
        <label className={label}>
          Compare with
          <select className={select} value={spec.compare || ''} onChange={(e) => onChange({ compare: e.target.value || null })}>
            <option value="">—</option>
            <option value="prior_year">Same month last year</option>
            <option value="prior_period">Previous month</option>
          </select>
        </label>
      )}
      {monthly && (
        <label className={label}>
          Rolling
          <select className={select} value={spec.window || ''} onChange={(e) => onChange({ window: e.target.value ? Number(e.target.value) : null })}>
            <option value="">—</option>
            {[3, 6, 12].map((n) => <option key={n} value={n}>{n} months</option>)}
          </select>
        </label>
      )}
      {!spec.splitBy && (
        <label className={`${label} cursor-pointer`}>
          <input type="checkbox" className="h-3.5 w-3.5 accent-blue-600" checked={Boolean(spec.share)} onChange={(e) => onChange({ share: e.target.checked })} />
          % of total
        </label>
      )}
    </div>
  );
}
AnalyseBar.propTypes = { m: PropTypes.object.isRequired, spec: PropTypes.object.isRequired, onChange: PropTypes.func.isRequired };
