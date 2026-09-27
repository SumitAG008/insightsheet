import { useState } from 'react';
import PropTypes from 'prop-types';
import { Button } from '@/components/ui/button';
import { Pin, Table2, Download, Code2, HelpCircle } from 'lucide-react';
import ReportChart from './ReportChart';
import { columnsOf, compute, fmt, toSQL, usesCustomer } from '@/lib/unifiedReporting/engine';

const OP_WORD = { eq: 'is', neq: 'is not', gte: '≥', lte: '≤' };

export function KpiRow({ res }) {
  return (
    <div className="mt-4 grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-3">
      {columnsOf(res).map((c) => (
        <div key={c.label} className="rounded-xl bg-slate-100 p-4 dark:bg-slate-800">
          <div className="text-sm text-slate-500 dark:text-slate-400">{c.label}</div>
          <div className="mt-0.5 text-2xl font-semibold tracking-tight">{fmt(c.data[0], c.unit)}</div>
        </div>
      ))}
    </div>
  );
}
KpiRow.propTypes = { res: PropTypes.object.isRequired };

export function ResultTable({ spec, res }) {
  if (!spec.groupBy) return null;
  const cols = columnsOf(res);
  return (
    <div className="mt-3 overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-slate-200 text-slate-500 dark:border-slate-700 dark:text-slate-400">
            <th className="px-3 py-2 text-left font-medium capitalize">{spec.groupBy.replace('_', ' ')}</th>
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
                <td key={c.label} className={`whitespace-nowrap px-3 py-2 text-right tabular-nums ${c.derived ? 'font-semibold' : ''}`}>{fmt(c.data[i], c.unit)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
ResultTable.propTypes = { spec: PropTypes.object.isRequired, res: PropTypes.object.isRequired };

export function ReportBody({ spec, res, height }) {
  if (spec.chart === 'number') return <KpiRow res={res} />;
  if (spec.chart === 'table') return <ResultTable spec={spec} res={res} />;
  return (
    <div className="mt-4">
      <ReportChart spec={spec} res={res} height={height} />
    </div>
  );
}
ReportBody.propTypes = { spec: PropTypes.object.isRequired, res: PropTypes.object.isRequired, height: PropTypes.number };

function describe(res) {
  const parts = res.series.map((s) => {
    const what = s.agg === 'count' ? 'count of rows' : `${s.agg} of ${s.measure}`;
    const where = s.filters.length ? ` where ${s.filters.map((f) => `${f.dim} ${OP_WORD[f.op]} ${f.value}`).join(' and ')}` : '';
    return `${s.label}: ${what} in ${s.sys}${where}`;
  });
  res.derived.forEach((d) => {
    const num = d.numerator.map((i) => res.series[i].label).join(' + ');
    parts.push(`${d.label}: ${d.denominator === null ? num : `(${num}) ÷ ${res.series[d.denominator].label}`}, calculated after each system is totalled`);
  });
  return parts.join('. ');
}

const USED_LABEL = { ai: 'Built by Meldra AI.', rules: 'Built with built-in rules.', edited: 'Built from your edited spec.' };

export default function AnswerCard({ item, decisions, builder, pinned, onAsk, onPin, onShowTable, onDownload, onRunSpec }) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(null);
  const [specErr, setSpecErr] = useState('');

  const bubble = (
    <div className="mb-2.5 flex justify-end">
      <span className="max-w-[85%] rounded-2xl rounded-br-md bg-slate-900 px-4 py-2 text-[15px] text-white dark:bg-slate-100 dark:text-slate-900">{item.q}</span>
    </div>
  );
  const shell = (children) => (
    <div className="mb-6" id={`qa-${item.id}`}>
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
      <>
        <p className="m-0">{item.err}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {['Invoices by customer', 'Headcount by department'].map((q) => (
            <button key={q} type="button" onClick={() => onAsk(q)} className="rounded-full border border-slate-200 px-3 py-1.5 text-sm hover:border-blue-500 dark:border-slate-700">{q}</button>
          ))}
        </div>
      </>,
    );
  }

  const sp = item.spec;
  const res = compute(sp, decisions);
  const showHow = builder || open;
  const specText = draft ?? JSON.stringify({ title: sp.title, chart: sp.chart, groupBy: sp.groupBy, series: sp.series, derived: sp.derived, sort: sp.sort, limit: sp.limit }, null, 2);

  const run = async () => {
    setSpecErr('');
    try {
      await onRunSpec(item.id, JSON.parse(specText));
      setDraft(null);
    } catch {
      setSpecErr('That spec could not be run. Check the JSON and use view, dimension and measure names from the Data tab.');
    }
  };

  return shell(
    <>
      <h2 className="m-0 text-lg font-semibold tracking-tight">{sp.title}</h2>
      <ReportBody spec={sp} res={res} />
      {sp.chart !== 'table' && sp.chart !== 'number' && res.derived.length > 0 && <ResultTable spec={sp} res={res} />}
      <p className="mt-4 leading-relaxed">{item.insight || 'Writing the answer…'}</p>

      <div className="mt-4 flex flex-wrap gap-1.5">
        {res.series.map((s) => (
          <span key={s.label} className="whitespace-nowrap rounded-full bg-slate-100 px-2.5 py-0.5 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">
            From {s.sys} · {s.rows.toLocaleString()} rows
          </span>
        ))}
        {usesCustomer(sp) && <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs text-blue-700 dark:bg-blue-950 dark:text-blue-300">Customers matched across systems</span>}
        {res.derived.length > 0 && <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs text-blue-700 dark:bg-blue-950 dark:text-blue-300">Ratios calculated after totals</span>}
      </div>

      <div className="mt-4 flex flex-wrap gap-1 border-t border-slate-200 pt-2.5 dark:border-slate-800">
        <Button variant="ghost" size="sm" onClick={() => onPin(item.id)} disabled={pinned}><Pin className="mr-1.5 h-3.5 w-3.5" />{pinned ? 'Pinned' : 'Pin to board'}</Button>
        {sp.chart !== 'table' && sp.groupBy && <Button variant="ghost" size="sm" onClick={() => onShowTable(item.id)}><Table2 className="mr-1.5 h-3.5 w-3.5" />Show as table</Button>}
        <Button variant="ghost" size="sm" onClick={() => onDownload(item.id)}><Download className="mr-1.5 h-3.5 w-3.5" />Download CSV</Button>
        {!builder && <Button variant="ghost" size="sm" onClick={() => setOpen(!open)} aria-expanded={showHow}><Code2 className="mr-1.5 h-3.5 w-3.5" />{showHow ? 'Hide how' : 'Show how'}</Button>}
      </div>

      {sp.followups?.length > 0 && (
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {sp.followups.map((f) => (
            <button key={f} type="button" onClick={() => onAsk(f)} className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-left text-sm hover:border-blue-500 dark:border-slate-700 dark:bg-slate-950">{f}</button>
          ))}
        </div>
      )}

      {showHow && (
        <div className="mt-3 space-y-2 border-t border-dashed border-slate-200 pt-3 dark:border-slate-700">
          <h4 className="text-xs font-medium uppercase tracking-wider text-slate-400">Where the numbers come from</h4>
          <p className="m-0 text-sm text-slate-500 dark:text-slate-400">
            {describe(res)}.{usesCustomer(sp) ? ' Customer names come from Meldra IDs, so the same company counts once across systems.' : ''} {USED_LABEL[item.used] || ''}
          </p>
          <h4 className="pt-2 text-xs font-medium uppercase tracking-wider text-slate-400">SQL on the unified model</h4>
          <pre className="overflow-auto rounded-lg bg-slate-100 p-3 font-mono text-xs leading-relaxed dark:bg-slate-800">{toSQL(sp)}</pre>
          <h4 className="pt-2 text-xs font-medium uppercase tracking-wider text-slate-400">Query spec (edit and run)</h4>
          <textarea
            className="min-h-[200px] w-full resize-y rounded-lg border-0 bg-slate-100 p-3 font-mono text-xs leading-relaxed dark:bg-slate-800"
            spellCheck={false}
            value={specText}
            onChange={(e) => setDraft(e.target.value)}
          />
          <Button variant="outline" size="sm" onClick={run}>Run edited spec</Button>
          {specErr && <p className="text-sm text-red-600">{specErr}</p>}
        </div>
      )}
    </>,
  );
}

AnswerCard.propTypes = {
  item: PropTypes.object.isRequired,
  decisions: PropTypes.object.isRequired,
  builder: PropTypes.bool,
  pinned: PropTypes.bool,
  onAsk: PropTypes.func.isRequired,
  onPin: PropTypes.func.isRequired,
  onShowTable: PropTypes.func.isRequired,
  onDownload: PropTypes.func.isRequired,
  onRunSpec: PropTypes.func.isRequired,
};
