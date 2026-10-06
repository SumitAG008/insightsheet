// Charts for every tab of the uploaded workbook, with a PowerPoint download of all of them as
// native, editable charts. Tabs that cannot be charted say why, so nothing is silently skipped.
import { useState } from 'react';
import PropTypes from 'prop-types';
import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Download, Loader2, Table2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { chartsToPptx } from '@/lib/workbookCharts';

// Series colours come from CSS variables so dark mode gets its own validated steps.
const VARS =
  '[--s1:#2a78d6] [--s2:#eb6834] [--s3:#1baf7a] [--s4:#eda100] [--s5:#e87ba4] [--s6:#008300] [--s7:#4a3aa7] [--s8:#e34948] ' +
  'dark:[--s1:#3987e5] dark:[--s2:#d95926] dark:[--s3:#199e70] dark:[--s4:#c98500] dark:[--s5:#d55181] dark:[--s6:#008300] dark:[--s7:#9085e9] dark:[--s8:#e66767]';
const color = (i) => `var(--s${i + 1})`;
const fmt = (v) => (v == null ? '' : typeof v === 'number' ? v.toLocaleString(undefined, { maximumFractionDigits: 2 }) : String(v));
const tick = { fill: '#64748b', fontSize: 12 };

function ChartCard({ chart }) {
  const [showData, setShowData] = useState(false);
  const data = chart.x.map((label, i) => Object.fromEntries([['label', label], ...chart.series.map((s) => [s.name, s.values[i]])]));
  const many = chart.series.length > 1;
  const common = (
    <>
      <CartesianGrid vertical={false} stroke="rgba(148,163,184,0.35)" />
      <XAxis dataKey="label" tick={tick} tickLine={false} axisLine={{ stroke: 'rgba(148,163,184,0.6)' }} interval="preserveStartEnd" />
      <YAxis tick={tick} tickLine={false} axisLine={false} width={70} tickFormatter={(v) => fmt(v)} />
      <Tooltip formatter={(v) => fmt(v)} contentStyle={{ borderRadius: 8, fontSize: 12 }} />
      {many && <Legend wrapperStyle={{ fontSize: 12 }} />}
    </>
  );
  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
      <div className="flex items-start justify-between gap-3 mb-3">
        <h4 className="font-semibold text-slate-900 dark:text-slate-100">{chart.title}</h4>
        <button
          type="button"
          onClick={() => setShowData((v) => !v)}
          className="shrink-0 inline-flex items-center gap-1 text-xs font-medium text-blue-700 dark:text-blue-400 hover:underline"
          aria-expanded={showData}
        >
          <Table2 className="h-3.5 w-3.5" /> {showData ? 'Hide data' : 'Show data'}
        </button>
      </div>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          {chart.kind === 'line' ? (
            <LineChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
              {common}
              {chart.series.map((s, i) => (
                <Line key={s.name} type="linear" dataKey={s.name} stroke={color(i)} strokeWidth={2} dot={{ r: 4, strokeWidth: 0, fill: color(i) }} activeDot={{ r: 5 }} connectNulls />
              ))}
            </LineChart>
          ) : (
            <BarChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }} barCategoryGap="25%" barGap={2}>
              {common}
              {chart.series.map((s, i) => (
                <Bar key={s.name} dataKey={s.name} fill={color(i)} radius={[4, 4, 0, 0]} maxBarSize={48} />
              ))}
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>
      {chart.note && <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">{chart.note}</p>}
      {showData && (
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/60">
                <th className="px-2 py-1.5 text-left font-semibold" />
                {chart.series.map((s) => (
                  <th key={s.name} className="px-2 py-1.5 text-right font-semibold whitespace-nowrap">{s.name}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {chart.x.map((label, i) => (
                <tr key={`${label}-${i}`} className="border-b border-slate-100 dark:border-slate-800/60">
                  <td className="px-2 py-1 whitespace-nowrap text-slate-700 dark:text-slate-300">{label}</td>
                  {chart.series.map((s) => (
                    <td key={s.name} className="px-2 py-1 text-right tabular-nums text-slate-700 dark:text-slate-300">{fmt(s.values[i])}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
ChartCard.propTypes = {
  chart: PropTypes.shape({
    title: PropTypes.string.isRequired,
    kind: PropTypes.oneOf(['line', 'bar']).isRequired,
    x: PropTypes.array.isRequired,
    series: PropTypes.arrayOf(PropTypes.shape({ name: PropTypes.string, values: PropTypes.array })).isRequired,
    note: PropTypes.string,
  }).isRequired,
};

export default function ChartGallery({ results, fileName }) {
  const [busy, setBusy] = useState(false);
  const total = results.reduce((n, r) => n + r.charts.length, 0);
  const charted = results.filter((r) => r.charts.length).length;
  const skipped = results.filter((r) => !r.charts.length);

  const downloadDeck = async () => {
    setBusy(true);
    try {
      const blob = await chartsToPptx(results, fileName);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${fileName.replace(/\.(csv|xlsx|xls)$/i, '')}_charts.pptx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success('PowerPoint with all charts downloaded');
    } catch (e) {
      toast.error(e?.message || 'The PowerPoint could not be made.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={`space-y-6 ${VARS}`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-700 dark:text-slate-300">
          <strong>{total} chart{total === 1 ? '' : 's'}</strong> from {charted} of {results.length} tab{results.length === 1 ? '' : 's'}.
          {skipped.length > 0 && ` ${skipped.length} tab${skipped.length === 1 ? ' has' : 's have'} nothing to chart; the reason is shown below.`}
        </p>
        {total > 0 && (
          <Button onClick={downloadDeck} disabled={busy}>
            {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
            Download all charts (PowerPoint)
          </Button>
        )}
      </div>
      {results.map((r) => (
        <section key={r.sheet} aria-label={`Charts for tab ${r.sheet}`}>
          <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-3">
            Tab: {r.sheet}
            <span className="ml-2 text-sm font-normal text-slate-500 dark:text-slate-400">
              {r.charts.length ? `${r.charts.length} chart${r.charts.length === 1 ? '' : 's'}` : r.reason}
            </span>
          </h3>
          {r.charts.length > 0 && (
            <div className="grid gap-4 lg:grid-cols-2">
              {r.charts.map((c) => (
                <ChartCard key={c.id} chart={c} />
              ))}
            </div>
          )}
        </section>
      ))}
    </div>
  );
}

ChartGallery.propTypes = {
  results: PropTypes.arrayOf(
    PropTypes.shape({ sheet: PropTypes.string.isRequired, charts: PropTypes.array.isRequired, reason: PropTypes.string }),
  ).isRequired,
  fileName: PropTypes.string.isRequired,
};
