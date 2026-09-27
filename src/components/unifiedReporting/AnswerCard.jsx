import { useState } from 'react';
import PropTypes from 'prop-types';
import { Button } from '@/components/ui/button';
import { Pin, Download, Code2, HelpCircle, BarChart3, LineChart, Table2, PieChart, ScatterChart, Hash, AlertCircle } from 'lucide-react';
import ReportChart from './ReportChart';
import { chartOptions, columnsOf, compute, fmt, toSQL } from '@/lib/unifiedReporting/engine';

const OP_WORD = { eq: 'is', neq: 'is not', gte: '≥', lte: '≤' };
const CHART_ICON = { bar: BarChart3, line: LineChart, table: Table2, pie: PieChart, scatter: ScatterChart, number: Hash };
const CHART_NAME = { bar: 'Bar', line: 'Line', table: 'Table', pie: 'Pie', scatter: 'Bubble', number: 'Total' };

export function KpiRow({ res, currency }) {
  return (
    <div className="mt-4 grid grid-cols-[repeat(auto-fit,minmax(160px,1fr))] gap-3">
      {columnsOf(res).map((c) => (
        <div key={c.label} className="rounded-xl bg-slate-100 p-4 dark:bg-slate-800">
          <div className="text-sm text-slate-500 dark:text-slate-400">{c.label}</div>
          <div className="mt-0.5 text-2xl font-semibold tracking-tight">{fmt(c.data[0], c.unit, currency)}</div>
        </div>
      ))}
    </div>
  );
}
KpiRow.propTypes = { res: PropTypes.object.isRequired, currency: PropTypes.string };

export function ResultTable({ spec, res, currency, compact }) {
  if (!spec.groupBy) return null;
  const cols = columnsOf(res);
  return (
    <div className={`mt-3 overflow-auto ${compact ? 'max-h-60' : 'max-h-[420px]'}`}>
      <table className="w-full border-collapse text-sm">
        <thead className="sticky top-0 bg-white dark:bg-slate-900">
          <tr className="border-b border-slate-200 text-slate-500 dark:border-slate-700 dark:text-slate-400">
            <th className="px-3 py-2 text-left font-medium capitalize">{spec.groupBy.replace(/_/g, ' ')}</th>
            {cols.map((c) => (
              <th key={c.label} className={`px-3 py-2 text-right font-medium ${c.derived ? 'text-blue-600 dark:text-blue-400' : ''}`}>{c.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {res.labels.map((l, i) => (
            <tr key={l} className="border-b border-slate-100 dark:border-slate-800">
              <td className="whitespace-nowrap px-3 py-2">{l}</td>
              {cols.map((c) => (
                <td key={c.label} className={`whitespace-nowrap px-3 py-2 text-right tabular-nums ${c.derived ? 'font-semibold' : ''}`}>{fmt(c.data[i], c.unit, currency)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
ResultTable.propTypes = { spec: PropTypes.object.isRequired, res: PropTypes.object.isRequired, currency: PropTypes.string, compact: PropTypes.bool };

export function ReportBody({ spec, res, height, currency, compact }) {
  if (!res.labels.length) return <p className="mt-4 text-sm text-slate-500">No rows matched.</p>;
  if (spec.chart === 'number') return <KpiRow res={res} currency={currency} />;
  if (spec.chart === 'table') return <ResultTable spec={spec} res={res} currency={currency} compact={compact} />;
  return (
    <div className="mt-4">
      <ReportChart spec={spec} res={res} height={height} currency={currency} />
    </div>
  );
}
ReportBody.propTypes = { spec: PropTypes.object.isRequired, res: PropTypes.object.isRequired, height: PropTypes.number, currency: PropTypes.string, compact: PropTypes.bool };

export function ChartSwitcher({ spec, onChange }) {
  const opts = chartOptions(spec);
  if (opts.length < 2) return null;
  return (
    <div className="inline-flex rounded-lg border border-slate-200 p-0.5 dark:border-slate-700" role="group" aria-label="Chart type">
      {opts.map((c) => {
        const Icon = CHART_ICON[c];
        return (
          <button
            key={c}
            type="button"
            title={CHART_NAME[c]}
            aria-label={CHART_NAME[c]}
            aria-pressed={spec.chart === c}
            onClick={() => onChange(c)}
            className={`rounded-md p-1.5 ${spec.chart === c ? 'bg-blue-600 text-white' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
          >
            <Icon className="h-4 w-4" />
          </button>
        );
      })}
    </div>
  );
}
ChartSwitcher.propTypes = { spec: PropTypes.object.isRequired, onChange: PropTypes.func.isRequired };

function describe(res, m) {
  const parts = res.series.map((s) => {
    const what = s.agg === 'count' ? 'number of rows' : `${s.agg} of ${s.measure}`;
    const where = s.filters.length ? ` where ${s.filters.map((f) => `${f.dim} ${OP_WORD[f.op]} ${f.value}`).join(' and ')}` : '';
    const v = m.views[s.view];
    const lookup = v?.borrowed.find((b) => b.key === res.groupBy);
    return `${s.label}: ${what} in ${s.source} (${s.sys})${where}${lookup ? `, with ${lookup.key} looked up from ${lookup.from} through ${lookup.via.from.col}` : ''}`;
  });
  res.derived.forEach((d) => {
    const num = d.numerator.map((i) => res.series[i].label).join(' + ');
    parts.push(`${d.label}: ${d.denominator === null ? num : `(${num}) ÷ ${res.series[d.denominator].label}`}, calculated after each source is totalled`);
  });
  return parts;
}

const USED_LABEL = { ai: 'Planned by Meldra AI from your column names.', rules: 'Read with built-in rules (AI was not needed or not available).', edited: 'Run from your edited definition.', suggested: 'Suggested from your data.' };

export default function AnswerCard({ item, m, pinned, onAsk, onPin, onChart, onDownload, onRunSpec }) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(null);
  const [specErr, setSpecErr] = useState('');

  const bubble = (
    <div className="mb-2.5 flex justify-end">
      <span className="max-w-[85%] rounded-2xl rounded-br-md bg-slate-900 px-4 py-2 text-[15px] text-white dark:bg-slate-100 dark:text-slate-900">{item.q}</span>
    </div>
  );
  const shell = (children) => (
    <div className="mb-6 scroll-mt-32" id={`qa-${item.id}`}>
      {bubble}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">{children}</div>
    </div>
  );

  if (item.status === 'thinking') {
    return shell(
      <div className="flex items-center gap-2.5 text-sm text-slate-500">
        <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-blue-600" aria-hidden="true" />
        {item.stage}
      </div>,
    );
  }

  if (item.status === 'clarify') {
    return shell(
      <>
        <div className="flex items-start gap-2">
          <HelpCircle className="mt-0.5 h-4 w-4 flex-none text-blue-600" />
          <p className="m-0 font-medium">{item.clarify}</p>
        </div>
        <p className="mb-3 mt-1 text-sm text-slate-500">One quick answer so the numbers are right.</p>
        <div className="flex flex-wrap gap-2">
          {item.options.map((o) => (
            <Button key={o} variant="outline" size="sm" onClick={() => onAsk(`${item.q} (${o})`)}>{o}</Button>
          ))}
        </div>
      </>,
    );
  }

  if (item.status !== 'done') {
    return shell(
      <div className="flex items-start gap-2">
        <AlertCircle className="mt-0.5 h-4 w-4 flex-none text-amber-600" />
        <p className="m-0">{item.err}</p>
      </div>,
    );
  }

  let res;
  try {
    res = compute(item.spec, m);
  } catch {
    return shell(<p className="m-0 text-sm text-slate-500">This answer used data that has since been removed.</p>);
  }
  const sp = item.spec;
  const specText = draft ?? JSON.stringify({ title: sp.title, chart: sp.chart, groupBy: sp.groupBy, series: sp.series, derived: sp.derived, sort: sp.sort, limit: sp.limit }, null, 2);

  const run = async () => {
    setSpecErr('');
    try {
      await onRunSpec(item.id, JSON.parse(specText));
      setDraft(null);
    } catch {
      setSpecErr('That definition could not be run. Check the JSON and use source, column and measure names from the Data sources tab.');
    }
  };

  return shell(
    <>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h2 className="m-0 text-lg font-semibold tracking-tight">{sp.title}</h2>
        <ChartSwitcher spec={sp} onChange={(c) => onChart(item.id, c)} />
      </div>
      <ReportBody spec={sp} res={res} currency={m.currency} />
      {sp.chart !== 'table' && sp.chart !== 'number' && res.derived.length > 0 && <ResultTable spec={sp} res={res} currency={m.currency} compact />}
      <p className="mt-4 leading-relaxed">{item.insight || 'Writing the answer…'}</p>

      <div className="mt-4 flex flex-wrap gap-1.5">
        {res.series.map((s) => (
          <span key={s.label} className="whitespace-nowrap rounded-full bg-slate-100 px-2.5 py-0.5 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">
            {s.sys} · {s.rows.toLocaleString()} rows
          </span>
        ))}
        {new Set(res.series.map((s) => s.sys)).size > 1 && <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs text-blue-700 dark:bg-blue-950 dark:text-blue-300">Joined on {sp.groupBy ? sp.groupBy.replace(/_/g, ' ') : 'totals'}</span>}
        {res.derived.length > 0 && <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs text-blue-700 dark:bg-blue-950 dark:text-blue-300">Ratios calculated after totals</span>}
      </div>

      <div className="mt-4 flex flex-wrap gap-1 border-t border-slate-200 pt-2.5 dark:border-slate-800">
        <Button variant="ghost" size="sm" onClick={() => onPin(item.id)} disabled={pinned}><Pin className="mr-1.5 h-3.5 w-3.5" />{pinned ? 'On dashboard' : 'Add to dashboard'}</Button>
        <Button variant="ghost" size="sm" onClick={() => onDownload(item.id)}><Download className="mr-1.5 h-3.5 w-3.5" />Download CSV</Button>
        <Button variant="ghost" size="sm" onClick={() => setOpen(!open)} aria-expanded={open}><Code2 className="mr-1.5 h-3.5 w-3.5" />{open ? 'Hide calculation' : 'How it’s calculated'}</Button>
      </div>

      {sp.followups?.length > 0 && (
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {sp.followups.map((f) => (
            <button key={f} type="button" onClick={() => onAsk(f)} className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-left text-sm hover:border-blue-500 dark:border-slate-700 dark:bg-slate-950">{f}</button>
          ))}
        </div>
      )}

      {open && (
        <div className="mt-3 space-y-2 border-t border-dashed border-slate-200 pt-3 dark:border-slate-700">
          <h4 className="text-xs font-medium uppercase tracking-wider text-slate-400">Where the numbers come from</h4>
          <ul className="m-0 list-disc space-y-1 pl-5 text-sm text-slate-600 dark:text-slate-300">
            {describe({ ...res, groupBy: sp.groupBy }, m).map((p) => <li key={p}>{p}</li>)}
          </ul>
          <p className="m-0 text-xs text-slate-400">{USED_LABEL[item.used] || ''}</p>
          <h4 className="pt-2 text-xs font-medium uppercase tracking-wider text-slate-400">Equivalent SQL</h4>
          <pre className="overflow-auto rounded-lg bg-slate-100 p-3 font-mono text-xs leading-relaxed dark:bg-slate-800">{toSQL(sp, m)}</pre>
          <h4 className="pt-2 text-xs font-medium uppercase tracking-wider text-slate-400">Report definition (edit and run)</h4>
          <textarea
            className="min-h-[200px] w-full resize-y rounded-lg border-0 bg-slate-100 p-3 font-mono text-xs leading-relaxed dark:bg-slate-800"
            spellCheck={false}
            value={specText}
            onChange={(e) => setDraft(e.target.value)}
          />
          <Button variant="outline" size="sm" onClick={run}>Run edited definition</Button>
          {specErr && <p className="text-sm text-red-600">{specErr}</p>}
        </div>
      )}
    </>,
  );
}

AnswerCard.propTypes = {
  item: PropTypes.object.isRequired,
  m: PropTypes.object.isRequired,
  pinned: PropTypes.bool,
  onAsk: PropTypes.func.isRequired,
  onPin: PropTypes.func.isRequired,
  onChart: PropTypes.func.isRequired,
  onDownload: PropTypes.func.isRequired,
  onRunSpec: PropTypes.func.isRequired,
};
