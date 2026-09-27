import PropTypes from 'prop-types';
import { Button } from '@/components/ui/button';
import { LayoutDashboard, X } from 'lucide-react';
import { ChartSwitcher, ReportBody } from './AnswerCard';
import { compute } from '@/lib/unifiedReporting/engine';

export default function DashboardView({ board, m, onRemove, onChart, onGoAsk }) {
  if (!board.length) {
    return (
      <div className="mx-auto mt-10 max-w-lg rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center dark:border-slate-700 dark:bg-slate-900">
        <LayoutDashboard className="mx-auto h-8 w-8 text-slate-400" />
        <h2 className="mt-3 text-lg font-semibold">Your dashboard is empty</h2>
        <p className="mt-1 text-sm text-slate-500">Ask a question, then choose <strong>Add to dashboard</strong> on the answer. Tiles recalculate whenever your data changes.</p>
        <Button className="mt-5" onClick={onGoAsk}>Ask a question</Button>
      </div>
    );
  }
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 2xl:grid-cols-3">
      {board.map((b) => {
        let res = null;
        try {
          res = compute(b.spec, m);
        } catch {
          res = null;
        }
        return (
          <div key={b.id} className="flex flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-start justify-between gap-2">
              <h3 className="m-0 text-[15px] font-semibold leading-snug">{b.spec.title}</h3>
              <div className="flex flex-none items-center gap-1">
                <ChartSwitcher spec={b.spec} onChange={(c) => onChart(b.id, c)} />
                <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Remove from dashboard" onClick={() => onRemove(b.id)}><X className="h-4 w-4" /></Button>
              </div>
            </div>
            {res ? (
              <>
                <ReportBody spec={b.spec} res={res} height={260} currency={m.currency} compact />
                <div className="mt-auto flex flex-wrap gap-1.5 pt-3">
                  {[...new Set(res.series.map((s) => s.sys))].map((sys) => (
                    <span key={sys} className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">{sys}</span>
                  ))}
                </div>
              </>
            ) : (
              <p className="mt-4 text-sm text-slate-500">This tile uses data that has been removed.</p>
            )}
          </div>
        );
      })}
    </div>
  );
}

DashboardView.propTypes = {
  board: PropTypes.array.isRequired,
  m: PropTypes.object.isRequired,
  onRemove: PropTypes.func.isRequired,
  onChart: PropTypes.func.isRequired,
  onGoAsk: PropTypes.func.isRequired,
};
