// Workbench step 2: real work on the uploaded spreadsheet in one click. Totals, monthly totals,
// top rows and one-sheet-per-group run instantly in the browser; a PowerPoint and plain-English
// questions use the server. Every result can be downloaded.
import { useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import {
  BarChart3, CalendarDays, Download, Layers, Loader2, MessageSquareText, Presentation, Sigma, Trophy,
} from 'lucide-react';
import { toast } from 'sonner';
import { backendApi } from '@/api/meldraClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { resultWorkbook, runAction, suggestActions } from '@/lib/workbenchActions';

const ICONS = { total: Sigma, monthly: CalendarDays, top: Trophy, split: Layers };
const SHOW_ROWS = 50;
const SHOW_BARS = 12;

function saveBlob(blob, name) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

const fmt = (v) => {
  if (v == null) return '';
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  if (typeof v === 'number') return v.toLocaleString(undefined, { maximumFractionDigits: 2 });
  return String(v);
};

function Bars({ data }) {
  const shown = data.slice(0, SHOW_BARS);
  const max = Math.max(...shown.map((d) => Math.abs(d.value)), 1);
  return (
    <div className="space-y-1.5" role="img" aria-label="Bar chart of the result">
      {shown.map((d) => (
        <div key={d.label} className="grid grid-cols-[minmax(80px,180px)_1fr_auto] items-center gap-3 text-sm">
          <span className="truncate text-slate-700 dark:text-slate-300" title={d.label}>{d.label}</span>
          <span className="h-5 rounded bg-slate-100 dark:bg-slate-800 overflow-hidden">
            <span className="block h-full rounded bg-blue-600" style={{ width: `${(Math.abs(d.value) / max) * 100}%` }} />
          </span>
          <span className="tabular-nums font-medium text-slate-900 dark:text-slate-100">{fmt(d.value)}</span>
        </div>
      ))}
      {data.length > SHOW_BARS && (
        <p className="text-xs text-slate-500 dark:text-slate-400">Showing the largest {SHOW_BARS} of {data.length}.</p>
      )}
    </div>
  );
}
Bars.propTypes = { data: PropTypes.arrayOf(PropTypes.shape({ label: PropTypes.string, value: PropTypes.number })).isRequired };

export default function QuickWork({ file, rows, columns, duplicateRows = 0 }) {
  const suggestions = useMemo(() => suggestActions(columns), [columns]);
  const numbers = columns.filter((c) => c.kind === 'number');
  // Real groupings first (Department, Region); then other text columns, but never one where every
  // row is different (an ID or a name), since grouping by it gives one row per row.
  const groups = [
    ...columns.filter((c) => c.kind === 'category'),
    ...columns.filter((c) => c.kind === 'text' && c.distinct < rows.length),
  ];
  const [result, setResult] = useState(null);
  const [activeId, setActiveId] = useState(null);
  const [byCol, setByCol] = useState(groups[0]?.key || '');
  const [valueCol, setValueCol] = useState(numbers[0]?.key || '');
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [asking, setAsking] = useState(false);
  const [deck, setDeck] = useState(false);
  const [error, setError] = useState('');

  const run = (action) => {
    setError('');
    try {
      setResult(runAction(rows, action));
      setActiveId(action.id);
    } catch (e) {
      setError(e?.message || 'That task could not run on this file.');
    }
  };

  const runCustom = () => {
    if (!byCol) return;
    const col = (k) => columns.find((c) => c.key === k)?.name || k;
    run({
      id: `custom:${byCol}:${valueCol}`,
      type: 'total',
      label: valueCol ? `Total ${col(valueCol)} by ${col(byCol)}` : `Count rows by ${col(byCol)}`,
      params: { by: byCol, value: valueCol || null },
    });
  };

  const download = () => {
    const base = file.name.replace(/\.(csv|xlsx|xls)$/i, '');
    const slug = result.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    saveBlob(resultWorkbook(result), `${base}_${slug}.xlsx`);
  };

  const makeDeck = async () => {
    setDeck(true);
    setError('');
    try {
      const blob = await backendApi.files.excelToPpt(file);
      saveBlob(blob, `${file.name.replace(/\.(csv|xlsx|xls)$/i, '')}.pptx`);
      toast.success('PowerPoint downloaded');
    } catch (e) {
      setError(e?.message || 'The PowerPoint could not be made.');
    } finally {
      setDeck(false);
    }
  };

  const ask = async (e) => {
    e.preventDefault();
    if (!question.trim()) return;
    setAsking(true);
    setAnswer('');
    setError('');
    try {
      const prompt = `Answer this question about the attached spreadsheet in plain English, briefly, with the numbers you used: ${question.trim()}`;
      const res = await backendApi.llm.invokeWithFile(prompt, file);
      const text = typeof res?.response === 'string' ? res.response : JSON.stringify(res?.response ?? res);
      setAnswer(text);
    } catch (err) {
      setError(err?.message || 'The question could not be answered.');
    } finally {
      setAsking(false);
    }
  };

  const select = 'rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm';

  return (
    <Card>
      <CardContent className="py-5 space-y-6">
        {suggestions.length > 0 ? (
          <div>
            <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-3">Suggested for this file</h3>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {suggestions.map((a) => {
                const Icon = ICONS[a.type] || BarChart3;
                return (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => run(a)}
                    className={`flex items-center gap-3 rounded-xl border p-4 text-left transition-colors ${
                      activeId === a.id
                        ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/40'
                        : 'border-slate-200 dark:border-slate-800 hover:border-blue-400 hover:bg-blue-50/50 dark:hover:bg-blue-950/20'
                    }`}
                  >
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-blue-100 dark:bg-blue-900/50">
                      <Icon className="h-5 w-5 text-blue-700 dark:text-blue-300" />
                    </span>
                    <span className="font-medium text-slate-900 dark:text-slate-100">{a.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          <p className="text-sm text-slate-600 dark:text-slate-400">
            No obvious totals for this file. Build your own below, or ask a question.
          </p>
        )}

        {groups.length > 0 && (
          <div>
            <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-2">Build your own</h3>
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <select aria-label="What to total" className={select} value={valueCol} onChange={(e) => setValueCol(e.target.value)}>
                {numbers.map((c) => (
                  <option key={c.key} value={c.key}>Total {c.name}</option>
                ))}
                <option value="">Count rows</option>
              </select>
              <span className="text-slate-600 dark:text-slate-400">by</span>
              <select aria-label="Group by" className={select} value={byCol} onChange={(e) => setByCol(e.target.value)}>
                {groups.map((c) => (
                  <option key={c.key} value={c.key}>{c.name}</option>
                ))}
              </select>
              <Button onClick={runCustom}>Run</Button>
            </div>
          </div>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {result && (
          <div className="rounded-xl border border-blue-200 dark:border-blue-900 bg-white dark:bg-slate-900 p-4 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">{result.title}</h3>
              <Button onClick={download}>
                <Download className="mr-2 h-4 w-4" />
                {result.sheets ? `Download Excel (${Object.keys(result.sheets).length} sheets)` : 'Download Excel'}
              </Button>
            </div>
            {result.chart?.length > 1 && <Bars data={result.chart} />}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/60">
                    {result.columns.map((c) => (
                      <th key={c} className="px-3 py-2 text-left font-semibold whitespace-nowrap">{c}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {result.rows.slice(0, SHOW_ROWS).map((r, i) => (
                    <tr key={i} className={`border-b border-slate-100 dark:border-slate-800/60 ${r[0] === 'Total' ? 'font-semibold' : ''}`}>
                      {r.map((v, j) => (
                        <td key={j} className="px-3 py-1.5 whitespace-nowrap text-slate-700 dark:text-slate-300 tabular-nums">{fmt(v)}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {result.rows.length > SHOW_ROWS && (
              <p className="text-xs text-slate-500 dark:text-slate-400">Showing {SHOW_ROWS} of {result.rows.length} rows; the download has all of them.</p>
            )}
            {result.note && <p className="text-xs text-slate-500 dark:text-slate-400">{result.note}</p>}
            {duplicateRows > 0 && (
              <p className="text-xs text-amber-700 dark:text-amber-400">
                This file has {duplicateRows} duplicate row{duplicateRows === 1 ? '' : 's'}, counted in these figures. If they are
                mistakes, remove them in step 4 and run this again on the clean file.
              </p>
            )}
          </div>
        )}

        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 space-y-3">
            <h3 className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <MessageSquareText className="h-5 w-5 text-blue-600" /> Ask about this data
            </h3>
            <form onSubmit={ask} className="flex gap-2">
              <Input
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="e.g. Which department costs the most per person?"
                maxLength={500}
              />
              <Button type="submit" disabled={asking || !question.trim()}>
                {asking ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Ask'}
              </Button>
            </form>
            {answer && <p className="text-sm whitespace-pre-wrap text-slate-800 dark:text-slate-200">{answer}</p>}
            <p className="text-xs text-slate-500 dark:text-slate-400">Uses one AI question. The file is sent to the AI to answer; check important figures.</p>
          </div>
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 space-y-3">
            <h3 className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Presentation className="h-5 w-5 text-blue-600" /> Make a PowerPoint
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400">Slides with the key figures, charts and tables from this file.</p>
            <Button variant="outline" onClick={makeDeck} disabled={deck}>
              {deck ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
              Download PowerPoint
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

QuickWork.propTypes = {
  file: PropTypes.instanceOf(File).isRequired,
  rows: PropTypes.arrayOf(PropTypes.object).isRequired,
  duplicateRows: PropTypes.number,
  columns: PropTypes.arrayOf(
    PropTypes.shape({ key: PropTypes.string.isRequired, name: PropTypes.string.isRequired, kind: PropTypes.string.isRequired }),
  ).isRequired,
};
