import PropTypes from 'prop-types';
import {
  Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart,
  ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis, ZAxis,
} from 'recharts';
import { chartColumns, fmt } from '@/lib/unifiedReporting/engine';

export const PALETTE = ['#2563eb', '#0d9488', '#d97706', '#db2777', '#7c3aed', '#64748b', '#0891b2', '#65a30d', '#ea580c'];

const axisTick = { fill: 'currentColor', fontSize: 12 };
const tooltipStyle = {
  contentStyle: { borderRadius: 10, border: '1px solid rgb(203 213 225)', fontSize: 13 },
  labelStyle: { fontWeight: 600 },
};
const short = (s, n = 16) => (typeof s === 'string' && s.length > n ? `${s.slice(0, n - 1)}…` : s);

function ScatterView({ res, height, currency }) {
  const f = (v, u) => fmt(v, u, currency);
  const [x, y, z] = res.series;
  const points = res.labels
    .map((label, i) => ({ label, x: x.data[i], y: y.data[i] ?? 0, z: z ? z.data[i] ?? 0 : 1 }))
    .filter((p) => p.x !== null);
  return (
    <ResponsiveContainer width="100%" height={height}>
      <ScatterChart margin={{ top: 10, right: 20, bottom: 24, left: 10 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200 dark:stroke-slate-700" />
        <XAxis type="number" dataKey="x" name={x.label} tick={axisTick} tickFormatter={(v) => f(v, x.unit)}
          label={{ value: x.label, position: 'insideBottom', offset: -12, fill: 'currentColor', fontSize: 12 }} />
        <YAxis type="number" dataKey="y" name={y.label} tick={axisTick} tickFormatter={(v) => f(v, y.unit)} width={70} />
        {z && <ZAxis type="number" dataKey="z" range={[60, 900]} name={z.label} />}
        <Tooltip
          {...tooltipStyle}
          cursor={{ strokeDasharray: '3 3' }}
          content={({ active, payload }) => {
            if (!active || !payload?.length) return null;
            const p = payload[0].payload;
            return (
              <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow dark:border-slate-700 dark:bg-slate-800">
                <div className="font-semibold">{p.label}</div>
                <div>{x.label}: {f(p.x, x.unit)}</div>
                <div>{y.label}: {f(p.y, y.unit)}</div>
                {z && <div>{z.label}: {f(p.z, z.unit)}</div>}
              </div>
            );
          }}
        />
        <Scatter data={points} fill={PALETTE[0]} fillOpacity={0.65} stroke={PALETTE[0]} />
      </ScatterChart>
    </ResponsiveContainer>
  );
}
ScatterView.propTypes = { res: PropTypes.object.isRequired, height: PropTypes.number.isRequired, currency: PropTypes.string };

/** Grid of groupBy × split values, shaded by size. Works for any number of rows. */
export function Heatmap({ spec, res, currency, compact }) {
  const cols = res.series;
  const all = cols.flatMap((c) => c.data).filter((v) => typeof v === 'number');
  const max = Math.max(...all.map(Math.abs), 0) || 1;
  const unit = cols[0]?.unit;
  return (
    <div className={`overflow-auto ${compact ? 'max-h-64' : 'max-h-[460px]'}`}>
      <table className="w-full border-separate border-spacing-0.5 text-xs">
        <thead className="sticky top-0 z-[1] bg-white dark:bg-slate-900">
          <tr>
            <th className="px-2 py-1.5 text-left font-medium capitalize text-slate-500">{spec.groupBy.replace(/_/g, ' ')} × {spec.splitBy.replace(/_/g, ' ')}</th>
            {cols.map((c) => <th key={c.label} className="max-w-[110px] truncate px-2 py-1.5 text-right font-medium text-slate-500" title={c.label}>{c.label}</th>)}
          </tr>
        </thead>
        <tbody>
          {res.labels.map((l, i) => (
            <tr key={l}>
              <th scope="row" className="whitespace-nowrap px-2 py-1.5 text-left font-medium">{l}</th>
              {cols.map((c) => {
                const v = c.data[i];
                const t = typeof v === 'number' ? Math.abs(v) / max : 0;
                const strong = t > 0.55;
                return (
                  <td
                    key={c.label}
                    title={`${l} · ${c.label}: ${fmt(v, unit, currency)}`}
                    className={`whitespace-nowrap rounded px-2 py-1.5 text-right tabular-nums ${strong ? 'text-white' : ''}`}
                    style={{ backgroundColor: typeof v === 'number' ? `rgba(${v < 0 ? '219, 39, 119' : '37, 99, 235'}, ${0.08 + t * 0.82})` : 'transparent' }}
                  >
                    {fmt(v, unit, currency)}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
Heatmap.propTypes = { spec: PropTypes.object.isRequired, res: PropTypes.object.isRequired, currency: PropTypes.string, compact: PropTypes.bool };

/** Each group's contribution stacked on the running total, ending in a Total bar. */
function Waterfall({ res, height, currency }) {
  const s = res.series[0];
  let run = 0;
  const rows = res.labels.map((label, i) => {
    const v = s.data[i] || 0;
    const start = run;
    run += v;
    return { label, base: Math.min(start, run), size: Math.abs(v), value: v, kind: v < 0 ? 'down' : 'up' };
  });
  rows.push({ label: 'Total', base: Math.min(0, run), size: Math.abs(run), value: run, kind: 'total' });
  const color = { up: PALETTE[0], down: PALETTE[3], total: PALETTE[5] };
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={rows} margin={{ top: 10, right: 16, bottom: 0, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-slate-200 dark:stroke-slate-700" />
        <XAxis dataKey="label" tick={axisTick} tickFormatter={(v) => short(v, 12)} interval={0} />
        <YAxis tick={axisTick} tickFormatter={(v) => fmt(v, s.unit, currency)} width={70} />
        <Tooltip
          {...tooltipStyle}
          cursor={{ fillOpacity: 0.08 }}
          content={({ active, payload }) => {
            if (!active || !payload?.length) return null;
            const p = payload[0].payload;
            return (
              <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow dark:border-slate-700 dark:bg-slate-800">
                <div className="font-semibold">{p.label}</div>
                <div>{p.kind === 'total' ? 'Total' : s.label}: {fmt(p.value, s.unit, currency)}</div>
              </div>
            );
          }}
        />
        <Bar dataKey="base" stackId="w" fill="transparent" isAnimationActive={false} />
        <Bar dataKey="size" stackId="w" name={s.label} radius={[4, 4, 0, 0]} maxBarSize={48}>
          {rows.map((r) => <Cell key={r.label} fill={color[r.kind]} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
Waterfall.propTypes = { res: PropTypes.object.isRequired, height: PropTypes.number.isRequired, currency: PropTypes.string };

export default function ReportChart({ spec, res, height = 300, currency = '' }) {
  if (spec.chart === 'scatter') return <ScatterView res={res} height={height} currency={currency} />;
  if (spec.chart === 'heatmap' && spec.splitBy) return <Heatmap spec={spec} res={res} currency={currency} />;
  if (spec.chart === 'waterfall') return <Waterfall res={res} height={height} currency={currency} />;
  const fmtU = (v, u) => fmt(v, u, currency);

  const cols = chartColumns(res);
  const unit = cols[0].unit;
  const rows = res.labels.map((label, i) => {
    const row = { label };
    cols.forEach((c, k) => { row[`c${k}`] = c.data[i] === null ? null : Math.round(c.data[i] * 100) / 100; });
    return row;
  });
  const tip = (v, name, item) => {
    const k = Number(String(item.dataKey).slice(1));
    return [fmtU(v, cols[k]?.unit ?? unit), name];
  };
  const multi = cols.length > 1;
  // A second unit (e.g. headcount next to £) gets its own right-hand axis.
  const rightUnit = cols.find((c) => c.unit !== unit)?.unit;
  const axisOf = (c) => (rightUnit && c.unit === rightUnit ? 'right' : 'left');
  const rightAxis = rightUnit ? <YAxis yAxisId="right" orientation="right" tick={axisTick} tickFormatter={(v) => fmtU(v, rightUnit)} width={70} /> : null;

  if (spec.chart === 'pie') {
    return (
      <ResponsiveContainer width="100%" height={height}>
        <PieChart>
          <Pie data={rows} dataKey="c0" nameKey="label" innerRadius="45%" outerRadius="80%" paddingAngle={1} stroke="none">
            {rows.map((r, i) => <Cell key={r.label} fill={PALETTE[i % PALETTE.length]} />)}
          </Pie>
          <Tooltip {...tooltipStyle} formatter={(v, name) => [fmtU(v, unit), name]} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
        </PieChart>
      </ResponsiveContainer>
    );
  }

  if (spec.chart === 'line') {
    return (
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={rows} margin={{ top: 10, right: 16, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-slate-200 dark:stroke-slate-700" />
          <XAxis dataKey="label" tick={axisTick} />
          <YAxis yAxisId="left" tick={axisTick} tickFormatter={(v) => fmtU(v, unit)} width={70} />
          {rightAxis}
          <Tooltip {...tooltipStyle} formatter={tip} />
          {multi && <Legend wrapperStyle={{ fontSize: 12 }} />}
          {cols.map((c, k) => (
            <Line key={c.label} yAxisId={axisOf(c)} type="monotone" dataKey={`c${k}`} name={c.label} stroke={c.kind === 'prior' ? PALETTE[5] : PALETTE[k % PALETTE.length]} strokeDasharray={c.kind === 'prior' ? '5 4' : undefined} strokeWidth={c.kind === 'prior' ? 2 : 2.5} dot={{ r: 2.5 }} connectNulls />
          ))}
        </LineChart>
      </ResponsiveContainer>
    );
  }

  // Bars: horizontal when many categories so labels stay readable.
  const horizontal = !multi && rows.length > 6;
  // A second breakdown stacks, so the bar height is still the group's total.
  const stacked = Boolean(spec.splitBy) && ['sum', 'count'].includes(res.series[0]?.agg);
  return (
    <ResponsiveContainer width="100%" height={horizontal ? Math.max(height, rows.length * 30) : height}>
      <BarChart data={rows} layout={horizontal ? 'vertical' : 'horizontal'} margin={{ top: 10, right: 16, bottom: 0, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={horizontal} horizontal={!horizontal} className="stroke-slate-200 dark:stroke-slate-700" />
        {horizontal ? (
          <>
            <XAxis type="number" tick={axisTick} tickFormatter={(v) => fmtU(v, unit)} />
            <YAxis type="category" dataKey="label" tick={axisTick} width={140} tickFormatter={(v) => short(v, 20)} />
          </>
        ) : (
          <>
            <XAxis dataKey="label" tick={axisTick} tickFormatter={(v) => short(v)} interval={0} />
            <YAxis yAxisId="left" tick={axisTick} tickFormatter={(v) => fmtU(v, unit)} width={70} />
            {rightAxis}
          </>
        )}
        <Tooltip {...tooltipStyle} formatter={tip} cursor={{ fillOpacity: 0.08 }} />
        {multi && <Legend wrapperStyle={{ fontSize: 12 }} />}
        {cols.map((c, k) => (
          <Bar
            key={c.label}
            yAxisId={horizontal ? undefined : axisOf(c)}
            dataKey={`c${k}`}
            name={c.label}
            stackId={stacked ? 'split' : undefined}
            fill={c.kind === 'prior' ? PALETTE[5] : PALETTE[k % PALETTE.length]}
            fillOpacity={c.kind === 'prior' ? 0.55 : 1}
            radius={stacked ? undefined : horizontal ? [0, 5, 5, 0] : [5, 5, 0, 0]}
            maxBarSize={38}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}

ReportChart.propTypes = {
  spec: PropTypes.object.isRequired,
  res: PropTypes.object.isRequired,
  height: PropTypes.number,
  currency: PropTypes.string,
};
