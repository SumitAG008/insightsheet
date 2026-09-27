import PropTypes from 'prop-types';
import { Button } from '@/components/ui/button';
import { ReportBody } from './AnswerCard';
import { compute } from '@/lib/unifiedReporting/engine';

export default function BoardView({ board, decisions, onUnpin, onGoAsk }) {
  return (
    <div>
      <h1 className="mt-8 text-2xl font-semibold tracking-tight">Board</h1>
      <p className="mb-5 text-slate-500 dark:text-slate-400">Answers you pin stay live. They recalculate from the latest data every time you open this page.</p>
      {!board.length ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-10 text-center text-slate-500 dark:border-slate-700 dark:bg-slate-900">
          Pin any answer to keep it here.
          <div className="mt-4"><Button onClick={onGoAsk}>Ask a question</Button></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {board.map((b) => {
            const res = compute(b.spec, decisions);
            return (
              <div key={b.id} className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="m-0 text-[15px] font-semibold">{b.spec.title}</h3>
                  <Button variant="ghost" size="sm" onClick={() => onUnpin(b.id)}>Unpin</Button>
                </div>
                <ReportBody spec={b.spec} res={res} height={210} />
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {[...new Set(res.series.map((s) => s.sys))].map((sys) => (
                    <span key={sys} className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">{sys}</span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

BoardView.propTypes = {
  board: PropTypes.array.isRequired,
  decisions: PropTypes.object.isRequired,
  onUnpin: PropTypes.func.isRequired,
  onGoAsk: PropTypes.func.isRequired,
};
