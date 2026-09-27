import PropTypes from 'prop-types';
import { Button } from '@/components/ui/button';
import { FileSpreadsheet, LayoutDashboard, Sparkles } from 'lucide-react';
import { ChartSwitcher, LakeLoading, ReportBody } from './AnswerCard';
import { useResult } from '@/lib/unifiedReporting/remote';

function ReportTile({ spec, m, onChart }) {
  const { res, loading, error } = useResult(spec, m);
  return (
    <div className="flex min-w-0 flex-col rounded-xl border border-slate-200 p-3 dark:border-slate-800">
      <div className="flex items-start justify-between gap-2">
        <h3 className="m-0 text-sm font-semibold leading-snug">{spec.title}</h3>
        <ChartSwitcher spec={spec} onChange={onChart} />
      </div>
      {loading && <LakeLoading />}
      {res && <ReportBody spec={spec} res={res} height={240} currency={m.currency} compact />}
      {!res && !loading && <p className="mt-3 text-sm text-slate-500">{error && error !== 'broken' ? error : 'This chart uses data that has been removed.'}</p>}
      {res && (
        <div className="mt-auto flex flex-wrap gap-1 pt-2">
          {[...new Set(res.series.map((s) => s.sys))].map((sys) => (
            <span key={sys} className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-600 dark:bg-slate-800 dark:text-slate-300">{sys}</span>
          ))}
        </div>
      )}
    </div>
  );
}
ReportTile.propTypes = { spec: PropTypes.object.isRequired, m: PropTypes.object.isRequired, onChart: PropTypes.func.isRequired };

const USED = { ai: 'Designed by Meldra AI from your column names.', rules: 'Built from your data with built-in rules (AI was not available).' };

/** A report built from one prompt: several live charts, addable to the dashboard or exportable as one workbook. */
export default function ReportCard({ item, m, onChart, onPinAll, onExcel }) {
  const r = item.report;
  return (
    <div className="mb-6 scroll-mt-32" id={`qa-${item.id}`}>
      <div className="mb-2.5 flex justify-end">
        <span className="max-w-[85%] rounded-2xl rounded-br-md bg-slate-900 px-4 py-2 text-[15px] text-white dark:bg-slate-100 dark:text-slate-900">
          <Sparkles className="mr-1.5 inline h-4 w-4" />{item.q}
        </span>
      </div>
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        {item.status === 'thinking' && (
          <div className="flex items-center gap-2.5 text-sm text-slate-500"><span className="h-2.5 w-2.5 animate-pulse rounded-full bg-blue-600" aria-hidden="true" />{item.stage}</div>
        )}
        {item.status !== 'thinking' && item.status !== 'done' && <p className="m-0">{item.err}</p>}
        {item.status === 'done' && (
          <>
            <h2 className="m-0 text-lg font-semibold tracking-tight">{r.title}</h2>
            {r.summary && <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{r.summary}</p>}
            <div className="mt-4 grid grid-cols-1 gap-3 xl:grid-cols-2">
              {r.specs.map((sp, i) => <ReportTile key={`${item.id}-${i}`} spec={sp} m={m} onChart={(c) => onChart(item.id, i, c)} />)}
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-1 border-t border-slate-200 pt-2.5 dark:border-slate-800">
              <Button variant="ghost" size="sm" onClick={() => onPinAll(item.id)}><LayoutDashboard className="mr-1.5 h-3.5 w-3.5" />Add all to dashboard</Button>
              <Button variant="ghost" size="sm" onClick={() => onExcel(item.id)}><FileSpreadsheet className="mr-1.5 h-3.5 w-3.5" />Excel</Button>
              <span className="ml-auto text-xs text-slate-400">{USED[item.used] || ''}</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
ReportCard.propTypes = {
  item: PropTypes.object.isRequired, m: PropTypes.object.isRequired, onChart: PropTypes.func.isRequired, onPinAll: PropTypes.func.isRequired, onExcel: PropTypes.func.isRequired,
};
