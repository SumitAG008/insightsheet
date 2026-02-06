import { useEffect, useMemo, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { BarChart as RechartsBarChart, Bar, LineChart as RechartsLineChart, Line, PieChart as RechartsPieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Activity, AlertCircle, BarChart3, Download, FileDown, LineChart, PieChart, Sparkles } from 'lucide-react';
import { bestColumnsForOverview, buildArrowTable, computeArrowKPIs, computePnLFromTable, detectFinanceColumns, groupSumTopN, inferColumns, numericHistogram } from '@/lib/arrowAnalytics';

const CHART_COLORS = ['#3B82F6', '#8B5CF6', '#10B981', '#F59E0B', '#EC4899', '#06B6D4', '#EF4444', '#F472B6'];

function safePct(n, d) {
  if (!d) return 0;
  return Math.round((n / d) * 1000) / 10;
}

function formatNumber(n) {
  if (n === null || n === undefined || Number.isNaN(n)) return '—';
  const v = Number(n);
  if (!Number.isFinite(v)) return '—';
  if (Math.abs(v) >= 1e9) return `${(v / 1e9).toFixed(2)}B`;
  if (Math.abs(v) >= 1e6) return `${(v / 1e6).toFixed(2)}M`;
  if (Math.abs(v) >= 1e3) return `${(v / 1e3).toFixed(2)}K`;
  return `${Math.round(v * 100) / 100}`;
}

function buildTimeSeries(rows, dateColumn, valueColumn, { maxPoints = 24 } = {}) {
  if (!dateColumn || !valueColumn) return [];
  const m = new Map();

  for (const r of rows || []) {
    const rawDate = r?.[dateColumn];
    const rawVal = r?.[valueColumn];
    const d = new Date(rawDate);
    const v = Number(rawVal);
    if (Number.isNaN(d.getTime())) continue;
    if (!Number.isFinite(v)) continue;

    const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
    m.set(key, (m.get(key) || 0) + v);
  }

  const arr = Array.from(m.entries())
    .map(([name, value]) => ({ name, value: Math.round(value * 100) / 100 }))
    .sort((a, b) => a.name.localeCompare(b.name));

  if (arr.length <= maxPoints) return arr;
  return arr.slice(arr.length - maxPoints);
}

export default function OverviewDashboard({ data, filename, activity }) {
  const rootRef = useRef(null);
  const [exporting, setExporting] = useState(false);

  const inferred = useMemo(() => inferColumns(data), [data]);

  const arrowTable = useMemo(() => {
    try {
      return buildArrowTable(data, { maxRows: 200000 });
    } catch {
      return null;
    }
  }, [data]);

  const kpis = useMemo(() => {
    if (!arrowTable) return null;
    try {
      return computeArrowKPIs(arrowTable);
    } catch {
      return null;
    }
  }, [arrowTable]);

  const financeCols = useMemo(() => {
    return detectFinanceColumns(inferred.headers);
  }, [inferred.headers]);

  const pnl = useMemo(() => {
    if (!arrowTable) return null;
    if (!financeCols?.isFinanceLike) return null;
    try {
      return computePnLFromTable(arrowTable, financeCols);
    } catch {
      return null;
    }
  }, [arrowTable, financeCols]);

  const chosen = useMemo(() => {
    return bestColumnsForOverview({ inferred, kpis: kpis || {} });
  }, [inferred, kpis]);

  const categoryData = useMemo(() => {
    if (!arrowTable) return [];
    return groupSumTopN(arrowTable, chosen.categoryColumn, chosen.valueColumn, { topN: 8 });
  }, [arrowTable, chosen.categoryColumn, chosen.valueColumn]);

  const histogramData = useMemo(() => {
    if (!arrowTable) return [];
    return numericHistogram(arrowTable, chosen.valueColumn, { bins: 12 });
  }, [arrowTable, chosen.valueColumn]);

  const trendData = useMemo(() => {
    const rows = Array.isArray(data?.rows) ? data.rows : [];
    return buildTimeSeries(rows, chosen.dateColumn, chosen.valueColumn, { maxPoints: 24 });
  }, [data, chosen.dateColumn, chosen.valueColumn]);

  const missingPct = useMemo(() => {
    if (!kpis) return 0;
    const totalCells = (kpis.numRows || 0) * (kpis.numCols || 0);
    return safePct(kpis.missingCells || 0, totalCells);
  }, [kpis]);

  const exportOverviewPng = async () => {
    if (!rootRef.current) return;
    setExporting(true);
    try {
      const html2canvas = (await import('html2canvas')).default;
      const saveAs = (await import('file-saver')).default;
      const canvas = await html2canvas(rootRef.current, { backgroundColor: '#ffffff', scale: 2 });
      canvas.toBlob((blob) => {
        if (blob) saveAs(blob, `${(filename || 'overview').replace(/\.[^/.]+$/, '')}_overview.png`);
      });
    } finally {
      setExporting(false);
    }
  };

  const exportOverviewPdf = async () => {
    if (!rootRef.current) return;
    setExporting(true);
    try {
      const html2canvas = (await import('html2canvas')).default;
      const { jsPDF } = await import('jspdf');
      const canvas = await html2canvas(rootRef.current, { backgroundColor: '#ffffff', scale: 2 });
      const imgData = canvas.toDataURL('image/png');

      const pdf = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();

      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      const scale = Math.min(pageWidth / imgWidth, pageHeight / imgHeight);
      const w = imgWidth * scale;
      const h = imgHeight * scale;

      pdf.addImage(imgData, 'PNG', (pageWidth - w) / 2, (pageHeight - h) / 2, w, h);
      pdf.save(`${(filename || 'overview').replace(/\.[^/.]+$/, '')}_overview.pdf`);
    } finally {
      setExporting(false);
    }
  };

  useEffect(() => {
    if (rootRef.current) rootRef.current.scrollTop = 0;
  }, [data]);

  if (!data) return null;

  return (
    <div ref={rootRef} id="overview-root" className="space-y-6">
      {pnl && (
        <div className="grid lg:grid-cols-5 gap-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
            <div className="text-xs text-slate-500 dark:text-slate-400">Revenue</div>
            <div className="text-2xl font-bold text-slate-900 dark:text-white">{formatNumber(pnl.revenue)}</div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 truncate">{pnl.columns?.revenue || ''}</div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
            <div className="text-xs text-slate-500 dark:text-slate-400">COGS</div>
            <div className="text-2xl font-bold text-slate-900 dark:text-white">{pnl.cogs != null ? formatNumber(pnl.cogs) : '—'}</div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 truncate">{pnl.columns?.cogs || ''}</div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
            <div className="text-xs text-slate-500 dark:text-slate-400">Expenses</div>
            <div className="text-2xl font-bold text-slate-900 dark:text-white">{pnl.expense != null ? formatNumber(pnl.expense) : '—'}</div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 truncate">{pnl.columns?.expense || ''}</div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
            <div className="text-xs text-slate-500 dark:text-slate-400">Net Profit</div>
            <div className={`text-2xl font-bold ${pnl.netProfit != null && pnl.netProfit < 0 ? 'text-red-600 dark:text-red-400' : 'text-slate-900 dark:text-white'}`}>
              {pnl.netProfit != null ? formatNumber(pnl.netProfit) : '—'}
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 truncate">{pnl.columns?.profit || ''}</div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
            <div className="text-xs text-slate-500 dark:text-slate-400">Margins</div>
            <div className="text-lg font-bold text-slate-900 dark:text-white">
              {pnl.grossMarginPct != null ? `${(Math.round(pnl.grossMarginPct * 10) / 10).toFixed(1)}%` : '—'}
              <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold"> GM</span>
            </div>
            <div className="text-lg font-bold text-slate-900 dark:text-white">
              {pnl.netMarginPct != null ? `${(Math.round(pnl.netMarginPct * 10) / 10).toFixed(1)}%` : '—'}
              <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold"> NM</span>
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Auto-detected P&L</div>
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
          <div className="text-xs text-slate-500 dark:text-slate-400">Rows</div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white">{kpis ? kpis.numRows : (data.rows || []).length}</div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">Columns: {kpis ? kpis.numCols : (data.headers || []).length}</div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
          <div className="text-xs text-slate-500 dark:text-slate-400">Missing cells</div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white">{kpis ? formatNumber(kpis.missingCells) : '—'}</div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">{missingPct}% of all cells</div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
          <div className="text-xs text-slate-500 dark:text-slate-400">Detected columns</div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white">{(inferred.numeric || []).length}</div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">Numeric • {(inferred.text || []).length} Text • {(inferred.date || []).length} Date</div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex flex-col justify-between">
          <div>
            <div className="text-xs text-slate-500 dark:text-slate-400">Export overview</div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">Download KPI snapshot + charts</div>
          </div>
          <div className="flex gap-2 mt-3">
            <Button type="button" variant="outline" className="flex-1" onClick={exportOverviewPng} disabled={exporting}>
              <Download className="w-4 h-4 mr-2" />
              PNG
            </Button>
            <Button type="button" className="flex-1 bg-[#4169E1] hover:bg-[#3659c7] text-white" onClick={exportOverviewPdf} disabled={exporting}>
              <FileDown className="w-4 h-4 mr-2" />
              PDF
            </Button>
          </div>
        </div>
      </div>

      {!arrowTable && (
        <Alert className="bg-amber-500/10 border-amber-500/30">
          <AlertCircle className="h-5 w-5 text-amber-500" />
          <AlertDescription className="text-slate-700 dark:text-slate-200">
            Arrow analytics is not available for this dataset yet. Showing basic metrics only.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <LineChart className="w-4 h-4 text-[#4169E1]" />
                <h3 className="font-bold text-slate-900 dark:text-white">Trend</h3>
              </div>
              <Badge className="bg-[#4169E1]/10 text-[#4169E1] border-[#4169E1]/20">
                {chosen.dateColumn ? `By ${chosen.dateColumn}` : 'No date column detected'}
              </Badge>
            </div>

            {trendData.length > 1 ? (
              <div className="h-[320px]">
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsLineChart data={trendData} margin={{ top: 10, right: 20, left: 10, bottom: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="value" name={chosen.valueColumn || 'Value'} stroke="#4169E1" strokeWidth={2} dot={false} />
                  </RechartsLineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-[320px] flex items-center justify-center text-sm text-slate-500 dark:text-slate-400">
                Add a date-like column (or select a sheet with dates) to see a time trend.
              </div>
            )}
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-slate-700 dark:text-slate-200" />
                  <h3 className="font-bold text-slate-900 dark:text-white">Top categories</h3>
                </div>
                <Badge className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700">
                  {chosen.categoryColumn && chosen.valueColumn ? `${chosen.categoryColumn} vs ${chosen.valueColumn}` : 'Auto pick'}
                </Badge>
              </div>

              {categoryData.length ? (
                <div className="h-[280px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsBarChart data={categoryData} margin={{ top: 10, right: 10, left: 10, bottom: 40 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="name" angle={-25} textAnchor="end" interval={0} height={60} />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="value" name={chosen.valueColumn || 'Value'} fill="#8B5CF6" radius={[6, 6, 0, 0]} />
                    </RechartsBarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-[280px] flex items-center justify-center text-sm text-slate-500 dark:text-slate-400">
                  Need at least one text/category column and one numeric column.
                </div>
              )}
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <PieChart className="w-4 h-4 text-slate-700 dark:text-slate-200" />
                  <h3 className="font-bold text-slate-900 dark:text-white">Mix</h3>
                </div>
                <Badge className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700">
                  Share
                </Badge>
              </div>

              {categoryData.length ? (
                <div className="h-[280px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPieChart>
                      <Pie data={categoryData} dataKey="value" nameKey="name" innerRadius={60} outerRadius={100} paddingAngle={2}>
                        {categoryData.map((_, idx) => (
                          <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-[280px] flex items-center justify-center text-sm text-slate-500 dark:text-slate-400">
                  Not enough data for a mix chart.
                </div>
              )}
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-slate-700 dark:text-slate-200" />
                <h3 className="font-bold text-slate-900 dark:text-white">Distribution</h3>
              </div>
              <Badge className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700">
                {chosen.valueColumn || 'Numeric column'}
              </Badge>
            </div>

            {histogramData.length ? (
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsBarChart data={histogramData} margin={{ top: 10, right: 10, left: 10, bottom: 40 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="name" angle={-25} textAnchor="end" interval={0} height={60} />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" name="Count" fill="#10B981" radius={[6, 6, 0, 0]} />
                  </RechartsBarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-[280px] flex items-center justify-center text-sm text-slate-500 dark:text-slate-400">
                No numeric column found for distribution.
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-slate-700 dark:text-slate-200" />
                <h3 className="font-bold text-slate-900 dark:text-white">Activity</h3>
              </div>
              <Badge className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700">
                {(activity || []).length}
              </Badge>
            </div>

            {(activity || []).length ? (
              <div className="space-y-2 max-h-[520px] overflow-y-auto">
                {activity.slice(0, 30).map((evt) => (
                  <div key={evt.id} className="border border-slate-200 dark:border-slate-800 rounded-lg p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-slate-900 dark:text-white truncate">{evt.title}</div>
                        {evt.detail ? (
                          <div className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">{evt.detail}</div>
                        ) : null}
                      </div>
                      <div className="flex-shrink-0">
                        {evt.badge ? (
                          <Badge className="bg-[#4169E1]/10 text-[#4169E1] border-[#4169E1]/20">{evt.badge}</Badge>
                        ) : null}
                      </div>
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-500 mt-2">{new Date(evt.at).toLocaleString()}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm text-slate-500 dark:text-slate-400">
                Your cleaning, transforms, and AI actions will show up here.
              </div>
            )}
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-4 h-4 text-purple-600" />
              <h3 className="font-bold text-slate-900 dark:text-white">Auto summary</h3>
            </div>
            <div className="text-sm text-slate-700 dark:text-slate-300 space-y-2">
              <div>
                <span className="font-semibold">Active sheet columns:</span> {(data.headers || []).filter(Boolean).length}
              </div>
              <div>
                <span className="font-semibold">Best value column:</span> {chosen.valueColumn || '—'}
              </div>
              <div>
                <span className="font-semibold">Best category column:</span> {chosen.categoryColumn || '—'}
              </div>
              <div>
                <span className="font-semibold">Best date column:</span> {chosen.dateColumn || '—'}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

OverviewDashboard.propTypes = {
  data: PropTypes.shape({
    headers: PropTypes.arrayOf(PropTypes.string),
    rows: PropTypes.arrayOf(PropTypes.object),
  }).isRequired,
  filename: PropTypes.string,
  activity: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      at: PropTypes.string.isRequired,
      title: PropTypes.string.isRequired,
      detail: PropTypes.string,
      badge: PropTypes.string,
    })
  ),
};
