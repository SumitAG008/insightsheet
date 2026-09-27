import { useState } from 'react';
import PropTypes from 'prop-types';
import { Button } from '@/components/ui/button';
import {
  Pin, Code2, HelpCircle, BarChart3, LineChart, Table2, PieChart, ScatterChart, Hash, AlertCircle, Grid3x3, ChartColumnStacked,
  ChartArea, ChartNoAxesCombined, LayoutGrid, Filter, Radar,
} from 'lucide-react';
import ReportChart, { Heatmap } from './ReportChart';
import { AnalyseBar, FilterBar } from './AnalysisControls';
import { chartOptions, columnsOf, fmt } from '@/lib/unifiedReporting/engine';
import QueryPanel from './QueryPanel';
import DownloadMenu from './DownloadMenu';
import { useResult } from '@/lib/unifiedReporting/remote';

const OP_WORD = { eq: 'is', neq: 'is not', gte: '≥', lte: '≤' };
const CHART_ICON = {
  bar: BarChart3, line: LineChart, area: ChartArea, combo: ChartNoAxesCombined, table: Table2, pie: PieChart, treemap: LayoutGrid,
  funnel: Filter, radar: Radar, scatter: ScatterChart, number: Hash, heatmap: Grid3x3, waterfall: ChartColumnStacked,
};
const CHART_NAME = {
  bar: 'Bar', line: 'Line', area: 'Area', combo: 'Bar + line', table: 'Table', pie: 'Pie', treemap: 'Treemap', funnel: 'Funnel',
  radar: 'Radar', scatter: 'Bubble', number: 'Total', heatmap: 'Heatmap', waterfall: 'Waterfall',
};

export function KpiRow({ res, currency }) {
  return (
    <div className="mt-4 grid grid-cols-[repeat(auto-fit,minmax(160px,1fr))] gap-3">
      {columnsOf(res).map((c, k) => (
        <div key={`${k}-${c.label}`} className="rounded-xl bg-slate-100 p-4 dark:bg-slate-800">
          <div className="text-sm text-slate-500 dark:text-slate-400">{c.label}</div>
          <div className="mt-0.5 text-2xl font-semibold tracking-tight">{fmt(c.data[0], c.unit, currency)}</div>
        </div>
      ))}
    </div>
  );
}
KpiRow.propTypes = { res: PropTypes.object.isRequired, currency: PropTypes.string };

export function ResultTable({ spec, res, currency, compact }) {
  if (!spec.groupBy && !res.labelName) return null;
  const cols = columnsOf(res);
  return (
    <div className={`mt-3 overflow-auto ${compact ? 'max-h-60' : 'max-h-[420px]'}`}>
      <table className="w-full border-collapse text-sm">
        <thead className="sticky top-0 bg-white dark:bg-slate-900">
          <tr className="border-b border-slate-200 text-slate-500 dark:border-slate-700 dark:text-slate-400">
            <th className="px-3 py-2 text-left font-medium capitalize">{(res.labelName || spec.groupBy).replace(/_/g, ' ')}</th>
            {cols.map((c, k) => (
              <th key={`${k}-${c.label}`} className={`px-3 py-2 text-right font-medium ${c.derived ? 'text-blue-600 dark:text-blue-400' : ''}`}>{c.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {res.labels.map((l, i) => (
            <tr key={l} className="border-b border-slate-100 dark:border-slate-800">
              <td className="whitespace-nowrap px-3 py-2">{l}</td>
              {cols.map((c, k) => (
                <td key={`${k}-${c.label}`} className={`whitespace-nowrap px-3 py-2 text-right tabular-nums ${c.derived ? 'font-semibold' : ''}`}>{fmt(c.data[i], c.unit, currency)}</td>
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
  if (spec.chart === 'heatmap' && spec.splitBy) return <div className="mt-4" data-export-chart><Heatmap spec={spec} res={res} currency={currency} compact={compact} /></div>;
  return (
    <div className="mt-4" data-export-chart>
      <ReportChart spec={spec} res={res} height={height} currency={currency} />
    </div>
  );
}
ReportBody.propTypes = { spec: PropTypes.object.isRequired, res: PropTypes.object.isRequired, height: PropTypes.number, currency: PropTypes.string, compact: PropTypes.bool };

/** Shown while the lakehouse calculates an answer. */
export function LakeLoading() {
  return (
    <div className="flex items-center gap-2.5 py-6 text-sm text-slate-500">
      <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-emerald-600" aria-hidden="true" />
      Calculating in the Meldra lakehouse…
    </div>
  );
}

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

function describe(res, m, sp) {
  const seriesList = sp.splitBy ? [{ ...res.series[0], label: `${sp.series[0].label} (one per ${sp.splitBy.replace(/_/g, ' ')})` }] : res.series;
  const parts = seriesList.map((s) => {
    const what = s.agg === 'count' ? 'number of rows' : `${s.agg} of ${s.measure}`;
    const v = m.views[s.view];
    const filters = [...s.filters, ...(sp.filters || []).filter((f) => v?.dims.includes(f.dim))];
    const where = filters.length ? ` where ${filters.map((f) => `${f.dim} ${OP_WORD[f.op]} ${f.value}`).join(' and ')}` : '';
    const lookup = v?.borrowed.find((b) => b.key === res.groupBy);
    return `${s.label}: ${what} in ${s.source} (${s.sys})${where}${lookup ? `, with ${lookup.key} looked up from ${lookup.from} through ${lookup.via.from.col}` : ''}`;
  });
  res.derived.forEach((d) => {
    const num = d.numerator.map((i) => res.series[i].label).join(' + ');
    parts.push(`${d.label}: ${d.denominator === null ? num : `(${num}) ÷ ${res.series[d.denominator].label}`}, calculated after each source is totalled`);
  });
  const skipped = (sp.filters || []).filter((f) => sp.series.some((s) => !m.views[s.view]?.dims.includes(f.dim)));
  if (skipped.length) parts.push(`Filter on ${[...new Set(skipped.map((f) => f.dim))].join(', ')} applies only to the sources that have that column.`);
  if (sp.splitBy) parts.push(`Split by ${sp.splitBy}: the 8 largest values are shown and the rest are added up as Other, so totals are unchanged.`);
  if (sp.window) parts.push(`Rolling ${sp.window} months: each month adds up the raw totals of that month and the ${sp.window - 1} before it (missing months count as zero); averages are recalculated on the combined rows.`);
  if (sp.compare) parts.push(`Compared with the ${sp.compare === 'prior_year' ? 'same month a year earlier' : 'previous month'}, using data outside any date filter.`);
  if (sp.share) parts.push('Share of total is each group divided by the total of all groups, including groups beyond the top list.');
  return parts;
}

const USED_LABEL = { ai: 'Planned by Meldra AI from your column names.', rules: 'Read with built-in rules (AI was not needed or not available).', edited: 'Run from your edited definition.', suggested: 'Suggested from your data.' };

export default function AnswerCard({ item, m, pinned, onAsk, onPin, onChart, onDownload, onRunSpec, onRefine, onUseSql, onResetSql }) {
  const [open, setOpen] = useState(false);
  const { res, loading, error: resError } = useResult(item.status === 'done' ? item.spec : null, m);
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

  if (loading) return shell(<LakeLoading />);
  if (!res) {
    return shell(<p className="m-0 text-sm text-slate-500">{resError && resError !== 'broken' ? resError : 'This answer used data that has since been removed.'}</p>);
  }
  const sp = item.spec;
  const specText = draft ?? JSON.stringify({
    title: sp.title, chart: sp.chart, groupBy: sp.groupBy, splitBy: sp.splitBy, series: sp.series, derived: sp.derived,
    filters: sp.filters, compare: sp.compare, window: sp.window, share: sp.share, sort: sp.sort, limit: sp.limit,
  }, null, 2);
  const tableAlso = !['table', 'number', 'heatmap'].includes(sp.chart) && (res.derived.length > 0 || res.extra?.length > 0);

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
      {sp.sql ? (
        <p className="mt-2 text-xs text-slate-500">From your own SQL. Open <strong>Query</strong> below to change it, or go back to Meldra&apos;s query.</p>
      ) : (
        <div className="mt-3 space-y-2 rounded-xl bg-slate-50 px-3 py-2.5 dark:bg-slate-950">
          <FilterBar m={m} viewKeys={[...new Set(sp.series.map((s) => s.view))]} filters={sp.filters || []} onChange={(filters) => onRefine(item.id, { filters })} />
          <AnalyseBar m={m} spec={sp} onChange={(patch) => onRefine(item.id, patch)} />
        </div>
      )}
      <ReportBody spec={sp} res={res} currency={m.currency} />
      {tableAlso && <ResultTable spec={sp} res={res} currency={m.currency} compact />}
      <p className="mt-4 leading-relaxed">{item.insight || 'Writing the answer…'}</p>

      <div className="mt-4 flex flex-wrap gap-1.5">
        {res.series.filter((s, i, all) => all.findIndex((x) => x.sys === s.sys && x.rows === s.rows) === i).map((s) => (
          <span key={`${s.sys}-${s.label}`} className="whitespace-nowrap rounded-full bg-slate-100 px-2.5 py-0.5 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">
            {s.sys}{s.rows !== null && s.rows !== undefined ? ` · ${s.rows.toLocaleString()} rows` : ''}
          </span>
        ))}
        {sp.sql && <span className="rounded-full bg-violet-50 px-2.5 py-0.5 text-xs text-violet-700 dark:bg-violet-950 dark:text-violet-300">Custom SQL</span>}
        {!sp.sql && new Set(res.series.map((s) => s.sys)).size > 1 && <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs text-blue-700 dark:bg-blue-950 dark:text-blue-300">Joined on {sp.groupBy ? sp.groupBy.replace(/_/g, ' ') : 'totals'}</span>}
        {res.derived.length > 0 && <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs text-blue-700 dark:bg-blue-950 dark:text-blue-300">Ratios calculated after totals</span>}
      </div>

      <div className="mt-4 flex flex-wrap gap-1 border-t border-slate-200 pt-2.5 dark:border-slate-800">
        <Button variant="ghost" size="sm" onClick={() => onPin(item.id)} disabled={pinned}><Pin className="mr-1.5 h-3.5 w-3.5" />{pinned ? 'On dashboard' : 'Add to dashboard'}</Button>
        <DownloadMenu formats={['pdf', 'pptx', 'docx', 'xlsx', 'csv']} onPick={(f) => onDownload(item.id, f)} />
        <Button variant="ghost" size="sm" onClick={() => setOpen(!open)} aria-expanded={open}><Code2 className="mr-1.5 h-3.5 w-3.5" />{open ? 'Hide query' : 'Query: SQL, columns, joins'}</Button>
      </div>

      {sp.followups?.length > 0 && (
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {sp.followups.map((f) => (
            <button key={f} type="button" onClick={() => onAsk(f)} className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-left text-sm hover:border-blue-500 dark:border-slate-700 dark:bg-slate-950">{f}</button>
          ))}
        </div>
      )}

      {open && (
        <div className="mt-3 space-y-3 border-t border-dashed border-slate-200 pt-3 dark:border-slate-700">
          {!sp.sql && (
            <>
              <h4 className="text-xs font-medium uppercase tracking-wider text-slate-400">Where the numbers come from</h4>
              <ul className="m-0 list-disc space-y-1 pl-5 text-sm text-slate-600 dark:text-slate-300">
                {describe({ ...res, groupBy: sp.groupBy }, m, sp).map((p) => <li key={p}>{p}</li>)}
              </ul>
              <p className="m-0 text-xs text-slate-400">{USED_LABEL[item.used] || ''}</p>
            </>
          )}
          <QueryPanel spec={sp} m={m} onUseSql={(sql, meta) => onUseSql(item.id, sql, meta)} onReset={sp.origin ? () => onResetSql(item.id) : undefined} />
          {!sp.sql && (
            <details className="text-sm">
              <summary className="cursor-pointer text-xs font-medium uppercase tracking-wider text-slate-400">Report definition (JSON)</summary>
              <textarea
                className="mt-2 min-h-[200px] w-full resize-y rounded-lg border-0 bg-slate-100 p-3 font-mono text-xs leading-relaxed dark:bg-slate-800"
                spellCheck={false}
                value={specText}
                onChange={(e) => setDraft(e.target.value)}
              />
              <Button variant="outline" size="sm" onClick={run}>Run edited definition</Button>
              {specErr && <p className="text-sm text-red-600">{specErr}</p>}
            </details>
          )}
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
  onRefine: PropTypes.func.isRequired,
  onUseSql: PropTypes.func.isRequired,
  onResetSql: PropTypes.func.isRequired,
};
