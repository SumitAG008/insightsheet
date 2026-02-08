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

function excelSerialToDate(serial) {
  const n = Number(serial);
  if (!Number.isFinite(n)) return null;
  // Excel incorrectly treats 1900 as leap year; using 1899-12-30 is the common fix.
  const ms = (n - 25569) * 86400 * 1000;
  const d = new Date(ms);
  return Number.isNaN(d.getTime()) ? null : d;
}

function parsePeriodString(v) {
  const s = String(v || '').trim();
  if (!s) return null;

  // 2024-01 or 2024/01
  let m = s.match(/^\s*(\d{4})[-/](\d{1,2})\s*$/);
  if (m) {
    const y = Number(m[1]);
    const mo = Number(m[2]);
    if (y >= 1900 && y <= 2100 && mo >= 1 && mo <= 12) return new Date(Date.UTC(y, mo - 1, 1));
  }

  // Jan-24, Jan 24, January-2024
  m = s.match(/^\s*([A-Za-z]{3,9})[\s-]*(\d{2,4})\s*$/);
  if (m) {
    const monStr = m[1].slice(0, 3).toLowerCase();
    const months = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11 };
    const mo = months[monStr];
    if (mo !== undefined) {
      let y = Number(m[2]);
      if (y < 100) y += 2000;
      if (y >= 1900 && y <= 2100) return new Date(Date.UTC(y, mo, 1));
    }
  }

  // FY2024
  m = s.match(/^\s*fy\s*(\d{4})\s*$/i);
  if (m) {
    const y = Number(m[1]);
    if (y >= 1900 && y <= 2100) return new Date(Date.UTC(y, 0, 1));
  }

  // Q1 2024 or 2024 Q1
  m = s.match(/^\s*q([1-4])\s*(\d{4})\s*$/i) || s.match(/^\s*(\d{4})\s*q([1-4])\s*$/i);
  if (m) {
    const q = Number(m[1].toLowerCase?.().startsWith?.('q') ? m[1].slice(1) : m[1]);
    const y = Number(m[2]);
    if (y >= 1900 && y <= 2100 && q >= 1 && q <= 4) return new Date(Date.UTC(y, (q - 1) * 3, 1));
  }

  return null;
}

function parseDateSmart(v) {
  if (v instanceof Date) return Number.isNaN(v.getTime()) ? null : v;
  if (typeof v === 'number') {
    // Likely Excel serial
    if (v >= 30000 && v <= 60000) return excelSerialToDate(v);
  }
  if (typeof v === 'string') {
    const n = Number(v);
    if (Number.isFinite(n) && n >= 30000 && n <= 60000) return excelSerialToDate(n);
    const p = parsePeriodString(v);
    if (p) return p;
  }
  if (typeof v === 'string') {
    const p2 = parsePeriodString(v);
    if (p2) return p2;
  }
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

function formatCompactTick(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return String(v ?? '');
  if (Math.abs(n) >= 1e9) return `${(n / 1e9).toFixed(1)}B`;
  if (Math.abs(n) >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (Math.abs(n) >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
  return `${Math.round(n * 100) / 100}`;
}

function truncateLabel(v, max = 12) {
  const s = String(v ?? '');
  if (s.length <= max) return s;
  return s.slice(0, max - 1) + '…';
}

function buildTimeSeries(rows, dateColumn, valueColumn, { maxPoints = 24 } = {}) {
  if (!dateColumn || !valueColumn) return [];
  const m = new Map();

  for (const r of rows || []) {
    const rawDate = r?.[dateColumn];
    const rawVal = r?.[valueColumn];
    const d = parseDateSmart(rawDate);
    const v = Number(rawVal);
    if (!d) continue;
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

function buildIndexSeries(rows, valueColumn, { maxPoints = 40 } = {}) {
  if (!valueColumn) return [];
  const pts = [];
  const n = Math.min((rows || []).length, maxPoints);
  const start = Math.max(0, (rows || []).length - n);
  for (let i = start; i < (rows || []).length; i++) {
    const v = Number(rows[i]?.[valueColumn]);
    if (!Number.isFinite(v)) continue;
    pts.push({ name: String(i + 1), value: Math.round(v * 100) / 100 });
  }
  return pts;
}

function buildWidePeriodSeries(rows, headers, categoryColumn, { maxPoints = 24 } = {}) {
  const hs = (headers || []).filter(Boolean);
  if (hs.length === 0) return [];

  const periodCols = [];
  for (const h of hs) {
    const d = parsePeriodString(h);
    if (!d) continue;
    periodCols.push({ header: h, d });
  }

  // Not a wide time matrix if we don't have enough period-like columns.
  if (periodCols.length < 4) return [];

  // Use the Total row if present, else sum all rows per period column.
  const rowsArr = Array.isArray(rows) ? rows : [];
  const totalRow = categoryColumn
    ? rowsArr.find((r) => String(r?.[categoryColumn] || '').trim().toLowerCase() === 'total')
    : undefined;

  const series = periodCols
    .map(({ header, d }) => {
      let v = 0;
      let ok = false;
      if (totalRow) {
        const n = Number(totalRow?.[header]);
        if (Number.isFinite(n)) {
          v = n;
          ok = true;
        }
      } else {
        for (const r of rowsArr) {
          const n = Number(r?.[header]);
          if (!Number.isFinite(n)) continue;
          v += n;
          ok = true;
        }
      }
      return ok ? { d, header, value: Math.round(v * 100) / 100 } : null;
    })
    .filter(Boolean)
    .sort((a, b) => a.d.getTime() - b.d.getTime());

  const trimmed = series.length <= maxPoints ? series : series.slice(series.length - maxPoints);
  return trimmed.map((p) => {
    const m = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][p.d.getUTCMonth()];
    const y = String(p.d.getUTCFullYear()).slice(-2);
    return { name: `${m}-${y}`, value: p.value };
  });
}

function toTrustedSeries(chart) {
  const labels = chart?.data?.labels;
  const values = chart?.data?.values;
  if (!Array.isArray(labels) || !Array.isArray(values) || labels.length !== values.length) return [];
  const out = [];
  for (let i = 0; i < labels.length; i++) {
    const v = Number(values[i]);
    if (!Number.isFinite(v)) continue;
    out.push({ name: String(labels[i] ?? ''), value: v });
  }
  return out;
}

export default function OverviewDashboard({ data, filename, activity, universalAnalysis, universalError }) {
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
    if (chosen.dateColumn) return buildTimeSeries(rows, chosen.dateColumn, chosen.valueColumn, { maxPoints: 24 });

    // If this is a wide matrix with period headers (e.g. Jan-25..Dec-25), build a proper month series.
    const wide = buildWidePeriodSeries(rows, inferred?.headers || [], chosen.categoryColumn, { maxPoints: 24 });
    if (wide.length > 0) return wide;

    return buildIndexSeries(rows, chosen.valueColumn, { maxPoints: 40 });
  }, [data, chosen.dateColumn, chosen.valueColumn, chosen.categoryColumn, inferred?.headers]);

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

  const trustedSheets = (universalAnalysis?.diagnostics?.sheets || []).filter(Boolean);
  const blockedSheets = trustedSheets.filter((s) => s?.risk_level === 'blocked');
  const warningSheets = trustedSheets.filter((s) => s?.risk_level === 'warning');
  const trustedCharts = Array.isArray(universalAnalysis?.charts) ? universalAnalysis.charts : [];

  return (
    <div ref={rootRef} id="overview-root" className="space-y-6">
      {(universalError || universalAnalysis) ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between gap-3 mb-2">
            <div className="text-sm font-bold text-slate-900 dark:text-white">Trusted from Excel (Strict Correctness)</div>
            {universalAnalysis?.status ? (
              <Badge className={
                universalAnalysis.status === 'blocked'
                  ? 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30'
                  : universalAnalysis.status === 'partial'
                    ? 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30'
                    : 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
              }>
                {universalAnalysis.status}
              </Badge>
            ) : null}
          </div>

          {universalError ? (
            <Alert className="bg-amber-500/10 border-amber-500/30">
              <AlertCircle className="h-5 w-5 text-amber-500" />
              <AlertDescription className="text-slate-700 dark:text-slate-200">
                {universalError}
              </AlertDescription>
            </Alert>
          ) : null}

          {universalAnalysis ? (
            <div className="space-y-3">
              {(blockedSheets.length > 0 || warningSheets.length > 0) ? (
                <div className="text-sm text-slate-700 dark:text-slate-300">
                  {blockedSheets.length > 0 ? (
                    <div>
                      <span className="font-semibold">Blocked sheets:</span> {blockedSheets.length}
                    </div>
                  ) : null}
                  {warningSheets.length > 0 ? (
                    <div>
                      <span className="font-semibold">Warning sheets:</span> {warningSheets.length}
                    </div>
                  ) : null}
                </div>
              ) : (
                <div className="text-sm text-slate-600 dark:text-slate-400">
                  No formula-cache issues detected.
                </div>
              )}

              {universalAnalysis?.status === 'blocked' && universalAnalysis?.action_required?.message ? (
                <Alert className="bg-red-500/10 border-red-500/30">
                  <AlertCircle className="h-5 w-5 text-red-500" />
                  <AlertDescription className="text-slate-700 dark:text-slate-200">
                    <div className="font-semibold">{universalAnalysis.action_required.message}</div>
                    {Array.isArray(universalAnalysis?.action_required?.steps) ? (
                      <div className="mt-2 space-y-1">
                        {universalAnalysis.action_required.steps.slice(0, 4).map((s, idx) => (
                          <div key={idx} className="text-sm">{String(s)}</div>
                        ))}
                      </div>
                    ) : null}
                  </AlertDescription>
                </Alert>
              ) : null}

              {trustedCharts.length ? (
                <div className="grid lg:grid-cols-2 gap-4">
                  {trustedCharts.slice(0, 4).map((ch, idx) => {
                    const series = toTrustedSeries(ch);
                    const title = String(ch?.title || `Trusted Chart ${idx + 1}`);
                    const prov = ch?.provenance || {};
                    return (
                      <div key={idx} className="border border-slate-200 dark:border-slate-800 rounded-lg p-3">
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <div className="min-w-0">
                            <div className="text-sm font-semibold text-slate-900 dark:text-white truncate">{title}</div>
                            <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                              {prov?.sheet ? `Sheet: ${prov.sheet}` : ''}{prov?.region ? ` • ${prov.region}` : ''}{prov?.method ? ` • ${prov.method}` : ''}
                            </div>
                          </div>
                          <Badge className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700">
                            {String(ch?.type || '').toUpperCase()}
                          </Badge>
                        </div>

                        {series.length ? (
                          <div className="h-[220px]">
                            <ResponsiveContainer width="100%" height="100%">
                              {ch?.type === 'line' ? (
                                <RechartsLineChart data={series} margin={{ top: 10, right: 12, left: 44, bottom: 60 }}>
                                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                  <XAxis dataKey="name" interval="preserveStartEnd" height={60} tickMargin={10} tickFormatter={(v) => truncateLabel(v, 14)} />
                                  <YAxis width={88} tickFormatter={formatCompactTick} tickMargin={6} />
                                  <Tooltip />
                                  <Line type="monotone" dataKey="value" name="Value" stroke="#4169E1" strokeWidth={3} dot={false} />
                                </RechartsLineChart>
                              ) : (
                                <RechartsBarChart data={series} margin={{ top: 10, right: 12, left: 44, bottom: 60 }}>
                                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                  <XAxis dataKey="name" interval="preserveStartEnd" height={60} tickMargin={10} tickFormatter={(v) => truncateLabel(v, 14)} />
                                  <YAxis width={88} tickFormatter={formatCompactTick} tickMargin={6} />
                                  <Tooltip />
                                  <Bar dataKey="value" name="Value" fill="#8B5CF6" radius={[6, 6, 0, 0]} />
                                </RechartsBarChart>
                              )}
                            </ResponsiveContainer>
                          </div>
                        ) : (
                          <div className="h-[220px] flex items-center justify-center text-sm text-slate-500 dark:text-slate-400">
                            Trusted chart has no numeric series.
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-sm text-slate-600 dark:text-slate-400">
                  No trusted charts were generated.
                </div>
              )}
            </div>
          ) : null}
        </div>
      ) : null}

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
                {chosen.dateColumn ? `By ${chosen.dateColumn}` : (chosen.valueColumn ? 'By row' : 'No trend available')}
              </Badge>
            </div>

            {trendData.length > 1 ? (
              <div className="h-[320px]">
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsLineChart data={trendData} margin={{ top: 10, right: 16, left: 44, bottom: 12 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="name" tickMargin={8} />
                    <YAxis width={88} tickFormatter={formatCompactTick} tickMargin={6} />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="value" name={chosen.valueColumn || 'Value'} stroke="#4169E1" strokeWidth={3} dot={false} />
                  </RechartsLineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-[320px] flex items-center justify-center text-sm text-slate-500 dark:text-slate-400">
                {chosen.valueColumn ? 'Not enough numeric values to plot a trend.' : 'No numeric column detected to plot a trend.'}
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
                    <RechartsBarChart data={categoryData} margin={{ top: 10, right: 12, left: 44, bottom: 60 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="name" angle={0} textAnchor="middle" interval="preserveStartEnd" minTickGap={12} height={60} tickMargin={10} tickFormatter={(v) => truncateLabel(v, 14)} />
                      <YAxis width={88} tickFormatter={formatCompactTick} tickMargin={6} />
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
                  <RechartsBarChart data={histogramData} margin={{ top: 10, right: 12, left: 44, bottom: 60 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="name" angle={0} textAnchor="middle" interval="preserveStartEnd" minTickGap={12} height={60} tickMargin={10} tickFormatter={(v) => truncateLabel(v, 14)} />
                    <YAxis width={88} tickFormatter={formatCompactTick} tickMargin={6} />
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
  universalAnalysis: PropTypes.any,
  universalError: PropTypes.string,
};
