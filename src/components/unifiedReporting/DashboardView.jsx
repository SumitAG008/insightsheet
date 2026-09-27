import PropTypes from 'prop-types';
import { Button } from '@/components/ui/button';
import { FileSpreadsheet, LayoutDashboard, X } from 'lucide-react';
import { ChartSwitcher, ReportBody } from './AnswerCard';
import { FilterBar } from './AnalysisControls';
import { compute, sanitize } from '@/lib/unifiedReporting/engine';

/** A tile's spec with the dashboard filters added (each applies only where the tile's sources have the column). */
function tileSpec(spec, filters, m) {
  if (!filters.length) return spec;
  return sanitize({ ...spec, filters: [...(spec.filters || []), ...filters] }, m);
}

export default function DashboardView({ board, m, filters, onFilters, onRemove, onChart, onGoAsk, onExport }) {
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
  const viewKeys = [...new Set(board.flatMap((b) => b.spec.series.map((s) => s.view)))].filter((k) => m.views[k]);
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <FilterBar
          m={m}
          viewKeys={viewKeys}
          filters={filters}
          onChange={onFilters}
          note={filters.length ? 'Applies to every tile whose sources have the column.' : 'Filter every tile at once, e.g. one department or a date range.'}
        />
        <Button variant="outline" size="sm" onClick={onExport}><FileSpreadsheet className="mr-1.5 h-4 w-4" />Export to Excel</Button>
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 2xl:grid-cols-3">
        {board.map((b) => {
          let res = null;
          let spec = b.spec;
          try {
            spec = tileSpec(b.spec, filters, m);
            res = compute(spec, m);
          } catch {
            res = null;
          }
          // Sources without the filtered column are shown unfiltered; say so on the tile.
          const missing = [...new Set(filters.filter((f) => b.spec.series.some((s) => !m.views[s.view]?.dims.includes(f.dim))).map((f) => f.dim))];
          return (
            <div key={b.id} className="flex flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-start justify-between gap-2">
                <h3 className="m-0 text-[15px] font-semibold leading-snug">{b.spec.title}</h3>
                <div className="flex flex-none items-center gap-1">
                  <ChartSwitcher spec={spec} onChange={(c) => onChart(b.id, c)} />
                  <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Remove from dashboard" onClick={() => onRemove(b.id)}><X className="h-4 w-4" /></Button>
                </div>
              </div>
              {res ? (
                <>
                  <ReportBody spec={spec} res={res} height={260} currency={m.currency} compact />
                  <div className="mt-auto flex flex-wrap gap-1.5 pt-3">
                    {[...new Set(res.series.map((s) => s.sys))].map((sys) => (
                      <span key={sys} className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">{sys}</span>
                    ))}
                    {missing.length > 0 && (
                      <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-xs text-amber-700 dark:bg-amber-950 dark:text-amber-300" title="At least one source of this tile has no such column">
                        Not filtered by {missing.join(', ')}
                      </span>
                    )}
                  </div>
                </>
              ) : (
                <p className="mt-4 text-sm text-slate-500">This tile uses data that has been removed.</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

DashboardView.propTypes = {
  board: PropTypes.array.isRequired,
  m: PropTypes.object.isRequired,
  filters: PropTypes.array.isRequired,
  onFilters: PropTypes.func.isRequired,
  onRemove: PropTypes.func.isRequired,
  onChart: PropTypes.func.isRequired,
  onGoAsk: PropTypes.func.isRequired,
  onExport: PropTypes.func.isRequired,
};
