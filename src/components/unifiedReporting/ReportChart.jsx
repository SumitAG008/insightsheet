import PropTypes from 'prop-types';
import {
  Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart,
  ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis, ZAxis,
} from 'recharts';
import { chartColumns, fmt } from '@/lib/unifiedReporting/engine';

export const PALETTE = ['#2563eb', '#0d9488', '#d97706', '#db2777', '#7c3aed', '#64748b'];

const axisTick = { fill: 'currentColor', fontSize: 12 };
const tooltipStyle = {
  contentStyle: { borderRadius: 10, border: '1px solid rgb(203 213 225)', fontSize: 13 },
  labelStyle: { fontWeight: 600 },
};
const short = (s, n = 16) => (typeof s === 'string' && s.length > n ? `${s.slice(0, n - 1)}…` : s);

function ScatterView({ res, height }) {
  const [x, y, z] = res.series;
  const points = res.labels.map((label, i) => ({ label, x: x.data[i], y: y.data[i], z: z ? z.data[i] : 1 }));
  return (
    <ResponsiveContainer width="100%" height={height}>
      <ScatterChart margin={{ top: 10, right: 20, bottom: 24, left: 10 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200 dark:stroke-slate-700" />
        <XAxis type="number" dataKey="x" name={x.label} tick={axisTick} tickFormatter={(v) => fmt(v, x.unit)}
          label={{ value: x.label, position: 'insideBottom', offset: -12, fill: 'currentColor', fontSize: 12 }} />
        <YAxis type="number" dataKey="y" name={y.label} tick={axisTick} tickFormatter={(v) => fmt(v, y.unit)} width={70} />
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
                <div>{x.label}: {fmt(p.x, x.unit)}</div>
                <div>{y.label}: {fmt(p.y, y.unit)}</div>
                {z && <div>{z.label}: {fmt(p.z, z.unit)}</div>}
              </div>
            );
          }}
        />
        <Scatter data={points} fill={PALETTE[0]} fillOpacity={0.65} stroke={PALETTE[0]} />
      </ScatterChart>
    </ResponsiveContainer>
  );
}
ScatterView.propTypes = { res: PropTypes.object.isRequired, height: PropTypes.number.isRequired };

export default function ReportChart({ spec, res, height = 280 }) {
  if (spec.chart === 'scatter') return <ScatterView res={res} height={height} />;

  const cols = chartColumns(res);
  const unit = cols[0].unit;
  const rows = res.labels.map((label, i) => {
    const row = { label };
    cols.forEach((c, k) => { row[`c${k}`] = c.data[i] === null ? null : Math.round(c.data[i] * 100) / 100; });
    return row;
  });
  const tip = (v, name, item) => {
    const k = Number(String(item.dataKey).slice(1));
    return [fmt(v, cols[k]?.unit ?? unit), name];
  };
  const multi = cols.length > 1;
  // A second unit (e.g. headcount next to £) gets its own right-hand axis.
  const rightUnit = cols.find((c) => c.unit !== unit)?.unit;
  const axisOf = (c) => (rightUnit && c.unit === rightUnit ? 'right' : 'left');
  const rightAxis = rightUnit ? <YAxis yAxisId="right" orientation="right" tick={axisTick} tickFormatter={(v) => fmt(v, rightUnit)} width={70} /> : null;

  if (spec.chart === 'pie') {
    return (
      <ResponsiveContainer width="100%" height={height}>
        <PieChart>
          <Pie data={rows} dataKey="c0" nameKey="label" innerRadius="45%" outerRadius="80%" paddingAngle={1} stroke="none">
            {rows.map((r, i) => <Cell key={r.label} fill={PALETTE[i % PALETTE.length]} />)}
          </Pie>
          <Tooltip {...tooltipStyle} formatter={(v, name) => [fmt(v, unit), name]} />
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
          <YAxis yAxisId="left" tick={axisTick} tickFormatter={(v) => fmt(v, unit)} width={70} />
          {rightAxis}
          <Tooltip {...tooltipStyle} formatter={tip} />
          {multi && <Legend wrapperStyle={{ fontSize: 12 }} />}
          {cols.map((c, k) => (
            <Line key={c.label} yAxisId={axisOf(c)} type="monotone" dataKey={`c${k}`} name={c.label} stroke={PALETTE[k]} strokeWidth={2.5} dot={{ r: 2.5 }} />
          ))}
        </LineChart>
      </ResponsiveContainer>
    );
  }

  // Bars: horizontal when many categories so labels stay readable.
  const horizontal = !multi && rows.length > 6;
  return (
    <ResponsiveContainer width="100%" height={horizontal ? Math.max(height, rows.length * 30) : height}>
      <BarChart data={rows} layout={horizontal ? 'vertical' : 'horizontal'} margin={{ top: 10, right: 16, bottom: 0, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={horizontal} horizontal={!horizontal} className="stroke-slate-200 dark:stroke-slate-700" />
        {horizontal ? (
          <>
            <XAxis type="number" tick={axisTick} tickFormatter={(v) => fmt(v, unit)} />
            <YAxis type="category" dataKey="label" tick={axisTick} width={140} tickFormatter={(v) => short(v, 20)} />
          </>
        ) : (
          <>
            <XAxis dataKey="label" tick={axisTick} tickFormatter={(v) => short(v)} interval={0} />
            <YAxis yAxisId="left" tick={axisTick} tickFormatter={(v) => fmt(v, unit)} width={70} />
            {rightAxis}
          </>
        )}
        <Tooltip {...tooltipStyle} formatter={tip} cursor={{ fillOpacity: 0.08 }} />
        {multi && <Legend wrapperStyle={{ fontSize: 12 }} />}
        {cols.map((c, k) => (
          <Bar key={c.label} yAxisId={horizontal ? undefined : axisOf(c)} dataKey={`c${k}`} name={c.label} fill={PALETTE[k]} radius={horizontal ? [0, 5, 5, 0] : [5, 5, 0, 0]} maxBarSize={38} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}

ReportChart.propTypes = {
  spec: PropTypes.object.isRequired,
  res: PropTypes.object.isRequired,
  height: PropTypes.number,
};
