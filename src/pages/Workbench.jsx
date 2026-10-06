// Workbench: one spreadsheet, three steps on one page.
// 1 Upload · 2 Get work done (one-click totals, monthly totals, top rows, a sheet per group,
// questions, a PowerPoint) · 3 Check quality (runs as soon as a file is chosen) · 4 Fix and download.
// Replaces the separate File Analyzer and Auto-Standardize pages; their old addresses redirect here.
import { useEffect, useMemo, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import {
  AlertTriangle, BarChart3, CheckCircle2, ChevronDown, Download, Eye, FileSpreadsheet, Loader2, RefreshCw, Table2, Upload, Wrench, X,
} from 'lucide-react';
import { toast } from 'sonner';
import { backendApi } from '@/api/meldraClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import QuickWork from '@/components/workbench/QuickWork';
import ChartGallery from '@/components/workbench/ChartGallery';
import { chartsForWorkbook, readWorkbook } from '@/lib/workbookCharts';
import {
  ACCEPT, ACCEPT_RE, FIXES, FIX_KEYS, aiSummary, formatBytes, missingShare, qualityLabel, recommendedFixes, sheetFindings,
} from '@/lib/workbench';

const TONES = {
  good: 'text-emerald-700 bg-emerald-50 border-emerald-200 dark:text-emerald-300 dark:bg-emerald-950/40 dark:border-emerald-900',
  warn: 'text-amber-800 bg-amber-50 border-amber-200 dark:text-amber-300 dark:bg-amber-950/40 dark:border-amber-900',
  bad: 'text-red-700 bg-red-50 border-red-200 dark:text-red-300 dark:bg-red-950/40 dark:border-red-900',
};
const SEVERITY = {
  high: { label: 'High', cls: 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200' },
  medium: { label: 'Medium', cls: 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200' },
  low: { label: 'Low', cls: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300' },
};

function Step({ n, title, active, done }) {
  return (
    <div className={`flex items-center gap-2 ${active || done ? 'text-slate-900 dark:text-slate-100' : 'text-slate-400 dark:text-slate-500'}`}>
      <span
        className={`grid h-7 w-7 place-items-center rounded-full text-sm font-semibold ${
          done ? 'bg-emerald-600 text-white' : active ? 'bg-blue-600 text-white' : 'bg-slate-200 dark:bg-slate-800'
        }`}
      >
        {done ? <CheckCircle2 className="h-4 w-4" /> : n}
      </span>
      <span className="text-sm font-semibold">{title}</span>
    </div>
  );
}
Step.propTypes = { n: PropTypes.number.isRequired, title: PropTypes.string.isRequired, active: PropTypes.bool, done: PropTypes.bool };

function SectionTitle({ n, title, subtitle }) {
  return (
    <div className="mb-4">
      <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
        <span className="text-blue-600 mr-2">{n}.</span>
        {title}
      </h2>
      {subtitle && <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">{subtitle}</p>}
    </div>
  );
}
SectionTitle.propTypes = { n: PropTypes.number.isRequired, title: PropTypes.string.isRequired, subtitle: PropTypes.string };

function Stat({ label, value, hint }) {
  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
      <div className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</div>
      <div className="mt-1 text-2xl font-bold text-slate-900 dark:text-slate-100">{value}</div>
      {hint && <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{hint}</div>}
    </div>
  );
}
Stat.propTypes = { label: PropTypes.string.isRequired, value: PropTypes.node.isRequired, hint: PropTypes.string };

function downloadBlob(blob, name) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export default function Workbench() {
  const inputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [checking, setChecking] = useState(false);
  const [checkError, setCheckError] = useState('');
  const [sheetIdx, setSheetIdx] = useState(0);
  const [fixes, setFixes] = useState(() => recommendedFixes([]));
  const [preview, setPreview] = useState(null);
  const [previewing, setPreviewing] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [fixError, setFixError] = useState('');
  const [showColumns, setShowColumns] = useState(false);
  const [book, setBook] = useState(null); // every tab, read in the browser for step 2
  const [tabIdx, setTabIdx] = useState(0);
  const [showCharts, setShowCharts] = useState(false);
  const [readError, setReadError] = useState('');

  const sheet = analysis?.sheets?.[sheetIdx] || null;
  const findings = sheetFindings(sheet);
  const score = sheet?.data_quality_score ?? analysis?.overall_summary?.overall_data_quality_score ?? null;
  const quality = qualityLabel(score);
  const ai = aiSummary(sheet);
  const tab = book?.[tabIdx] || null;
  const chartResults = useMemo(() => (showCharts && book ? chartsForWorkbook(book) : null), [showCharts, book]);

  const choose = (f) => {
    if (!f) return;
    if (!ACCEPT_RE.test(f.name)) {
      toast.error('Choose an Excel (.xlsx, .xls) or CSV file.');
      return;
    }
    setFile(f);
  };

  // Every new file is checked straight away; no extra button.
  useEffect(() => {
    if (!file) return undefined;
    let cancelled = false;
    setAnalysis(null);
    setPreview(null);
    setCheckError('');
    setFixError('');
    setSheetIdx(0);
    setChecking(true);
    setBook(null);
    setShowCharts(false);
    setReadError('');
    readWorkbook(file)
      .then((sheets) => {
        if (cancelled) return;
        setBook(sheets);
        setTabIdx(Math.max(0, sheets.findIndex((t) => t.rows.length > 0)));
      })
      .catch(() => !cancelled && setReadError('This file could not be opened in the browser for quick work.'));
    backendApi.files
      .analyzeFile(file)
      .then((res) => {
        if (cancelled) return;
        setAnalysis(res);
        // Start on the first tab that has data, not a cover or chart-only tab.
        const firstData = Math.max(0, (res?.sheets || []).findIndex((t) => !t.empty));
        setSheetIdx(firstData);
        setFixes(recommendedFixes(sheetFindings(res?.sheets?.[firstData])));
      })
      .catch((e) => !cancelled && setCheckError(e?.message || 'The file could not be checked.'))
      .finally(() => !cancelled && setChecking(false));
    return () => {
      cancelled = true;
    };
  }, [file]);

  useEffect(() => {
    setPreview(null);
  }, [fixes]);

  const reset = () => {
    setFile(null);
    setAnalysis(null);
    setPreview(null);
    setCheckError('');
    setBook(null);
    setShowCharts(false);
    if (inputRef.current) inputRef.current.value = '';
  };

  const options = (timeoutMs) => ({ ...fixes, timeoutMs });
  const anyFix = FIX_KEYS.some((k) => fixes[k]);

  const runPreview = async () => {
    setPreviewing(true);
    setFixError('');
    try {
      setPreview(await backendApi.files.standardizePreview(file, options(60000)));
    } catch (e) {
      setFixError(e?.message || 'Preview failed.');
    } finally {
      setPreviewing(false);
    }
  };

  const runDownload = async () => {
    setDownloading(true);
    setFixError('');
    try {
      const blob = await backendApi.files.standardize(file, options(120000));
      if (!blob || !blob.size) throw new Error('The clean file came back empty.');
      downloadBlob(blob, `${file.name.replace(/\.(csv|xlsx|xls)$/i, '')}_clean.xlsx`);
      toast.success('Clean file downloaded');
    } catch (e) {
      setFixError(e?.message || 'The clean file could not be made.');
    } finally {
      setDownloading(false);
    }
  };

  const previewRows = sheet?.data_preview || [];
  const previewCols = previewRows.length ? Object.keys(previewRows[0]) : [];

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <header className="space-y-3">
        <div className="flex items-center gap-3">
          <Table2 className="w-8 h-8 text-blue-600" />
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">Workbench</h1>
        </div>
        <p className="text-slate-600 dark:text-slate-400 max-w-3xl">
          Drop in a spreadsheet and get the work done here: totals by any column, monthly figures, top rows, one sheet
          per team or region, answers to questions and a PowerPoint, plus a quality check and a clean copy. No other
          tools needed.
        </p>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 pt-1">
          <Step n={1} title="Upload" active={!file} done={!!file} />
          <span className="hidden sm:block h-px w-8 bg-slate-300 dark:bg-slate-700" />
          <Step n={2} title="Get work done" active={!!book} />
          <span className="hidden sm:block h-px w-8 bg-slate-300 dark:bg-slate-700" />
          <Step n={3} title="Check quality" active={!!file && !analysis} done={!!analysis} />
          <span className="hidden sm:block h-px w-8 bg-slate-300 dark:bg-slate-700" />
          <Step n={4} title="Fix and download" active={!!analysis} />
        </div>
      </header>

      {/* 1. Upload */}
      <section>
        <SectionTitle n={1} title="Upload a spreadsheet" />
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT}
          className="hidden"
          onChange={(e) => choose(e.target.files?.[0])}
          aria-label="Choose a spreadsheet"
        />
        {!file ? (
          <div
            role="button"
            tabIndex={0}
            onClick={() => inputRef.current?.click()}
            onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && inputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              choose(e.dataTransfer.files?.[0]);
            }}
            className={`flex flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed px-6 py-14 text-center cursor-pointer transition-colors ${
              dragging
                ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/40'
                : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-blue-500 hover:bg-blue-50/50 dark:hover:bg-blue-950/20'
            }`}
          >
            <div className="grid h-16 w-16 place-items-center rounded-full bg-blue-100 dark:bg-blue-900/50">
              <Upload className="h-8 w-8 text-blue-700 dark:text-blue-300" />
            </div>
            <div>
              <p className="text-lg font-semibold text-slate-900 dark:text-slate-100">Drag your spreadsheet here</p>
              <p className="text-sm text-slate-600 dark:text-slate-400">or</p>
            </div>
            <Button size="lg" type="button" className="pointer-events-none">
              <FileSpreadsheet className="mr-2 h-5 w-5" />
              Choose a spreadsheet
            </Button>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Excel (.xlsx, .xls) or CSV. Your file is processed in memory and not stored.
            </p>
          </div>
        ) : (
          <Card>
            <CardContent className="flex flex-wrap items-center gap-4 py-4">
              <FileSpreadsheet className="h-9 w-9 text-emerald-600 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-slate-900 dark:text-slate-100 truncate">{file.name}</p>
                <p className="text-sm text-slate-500 dark:text-slate-400">{formatBytes(file.size)}</p>
              </div>
              <Button variant="outline" onClick={() => inputRef.current?.click()}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Use another file
              </Button>
              <Button variant="ghost" onClick={reset} aria-label="Remove file">
                <X className="h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        )}
      </section>

      {/* 2. Get work done */}
      {file && (book || readError) && (
        <section>
          <SectionTitle
            n={2}
            title="Get work done"
            subtitle="One click, done in seconds. Totals, charts, monthly figures and splits are worked out in your browser and download as Excel or PowerPoint."
          />
          {readError ? (
            <Alert variant="destructive">
              <AlertDescription>{readError}</AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-5">
              {book.some((t) => t.rows.length > 0) && (
                <Card>
                  <CardContent className="py-5 space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <h3 className="font-semibold text-slate-900 dark:text-slate-100">{book.length > 1 ? 'Charts for every tab' : 'Charts'}</h3>
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                          {book.length > 1 ? `This workbook has ${book.length} tabs. Make the right chart for each one in one click` : 'Make the right charts for this data in one click'}, then download them as a PowerPoint with editable charts.
                        </p>
                      </div>
                      {!showCharts && (
                        <Button onClick={() => setShowCharts(true)}>
                          <BarChart3 className="mr-2 h-4 w-4" />
                          {book.length > 1 ? 'Make charts for every tab' : 'Make charts'}
                        </Button>
                      )}
                    </div>
                    {chartResults && <ChartGallery results={chartResults} fileName={file.name} />}
                  </CardContent>
                </Card>
              )}

              {book.length > 1 && (
                <div className="flex flex-wrap items-center gap-2" role="tablist" aria-label="Tab to work on">
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300 mr-1">Work on tab:</span>
                  {book.map((t, i) => (
                    <button
                      key={t.name}
                      type="button"
                      role="tab"
                      aria-selected={i === tabIdx}
                      onClick={() => setTabIdx(i)}
                      className={`px-3 py-1.5 rounded-full text-sm font-medium border ${
                        i === tabIdx
                          ? 'bg-blue-600 border-blue-600 text-white'
                          : 'border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {t.name}
                      <span className="ml-1 opacity-70">({t.rows.length.toLocaleString()} rows)</span>
                    </button>
                  ))}
                </div>
              )}

              {!tab || tab.rows.length === 0 ? (
                <Alert>
                  <AlertDescription>{tab?.note || 'The file has no rows to work with.'}</AlertDescription>
                </Alert>
              ) : (
                <QuickWork
                  key={`${file.name}-${file.size}-${file.lastModified}-${tab.name}`}
                  file={file}
                  rows={tab.rows}
                  columns={tab.columns}
                  duplicateRows={Number((analysis?.sheets || []).find((t) => t.name === tab.name)?.duplicate_rows || 0)}
                />
              )}
            </div>
          )}
        </section>
      )}

      {/* 3. Check quality */}
      {file && (
        <section>
          <SectionTitle
            n={3}
            title="Check quality"
            subtitle="What is in the file, what is wrong with it, and how much it matters."
          />

          {checking && (
            <Card>
              <CardContent className="flex items-center gap-3 py-8 justify-center text-slate-600 dark:text-slate-400">
                <Loader2 className="h-5 w-5 animate-spin" />
                Checking every row and column…
              </CardContent>
            </Card>
          )}

          {checkError && (
            <Alert variant="destructive">
              <AlertDescription>{checkError}</AlertDescription>
            </Alert>
          )}

          {sheet && (
            <div className="space-y-5">
              {analysis.sheets.length > 1 && (
                <div className="flex flex-wrap gap-2" role="tablist" aria-label="Sheets">
                  {analysis.sheets.map((s, i) => (
                    <button
                      key={s.name || i}
                      type="button"
                      role="tab"
                      aria-selected={i === sheetIdx}
                      onClick={() => {
                        setSheetIdx(i);
                        setFixes(recommendedFixes(sheetFindings(s)));
                      }}
                      className={`px-3 py-1.5 rounded-full text-sm font-medium border ${
                        i === sheetIdx
                          ? 'bg-blue-600 border-blue-600 text-white'
                          : 'border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {s.name || `Sheet ${i + 1}`}
                    </button>
                  ))}
                </div>
              )}

              {sheet.empty ? (
                <Alert>
                  <AlertDescription>{sheet.note}</AlertDescription>
                </Alert>
              ) : (
              <>
              <div className="grid gap-4 md:grid-cols-[minmax(0,260px)_1fr]">
                <div className={`rounded-2xl border p-5 flex flex-col justify-center ${quality ? TONES[quality.tone] : TONES.warn}`}>
                  <div className="text-xs font-semibold uppercase tracking-wide opacity-80">Quality score</div>
                  <div className="text-5xl font-bold mt-1">{score != null ? Math.round(score) : '—'}<span className="text-xl font-semibold opacity-70">/100</span></div>
                  <div className="font-semibold mt-1">{quality?.label || 'Not scored'}</div>
                  <div className="text-xs mt-2 opacity-80">Based on empty cells, duplicate rows and unusual values.</div>
                </div>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  <Stat label="Rows" value={Number(sheet.row_count || 0).toLocaleString()} />
                  <Stat label="Columns" value={Number(sheet.column_count || 0).toLocaleString()} />
                  <Stat label="Empty cells" value={`${missingShare(sheet)}%`} />
                  <Stat label="Duplicate rows" value={Number(sheet.duplicate_rows || 0).toLocaleString()} />
                </div>
              </div>

              <Card>
                <CardContent className="py-5">
                  <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-3">
                    {findings.length ? `${findings.length} problem${findings.length === 1 ? '' : 's'} found` : 'No problems found'}
                  </h3>
                  {findings.length === 0 ? (
                    <p className="text-sm text-slate-600 dark:text-slate-400 flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      No duplicates, large gaps, text-stored numbers or dates, or unusual values were found.
                    </p>
                  ) : (
                    <ul className="divide-y divide-slate-200 dark:divide-slate-800">
                      {findings.map((f) => (
                        <li key={f.id} className="py-3 flex flex-col sm:flex-row sm:items-start gap-2 sm:gap-4">
                          <span className={`shrink-0 self-start rounded-full px-2 py-0.5 text-xs font-semibold ${SEVERITY[f.severity].cls}`}>
                            {SEVERITY[f.severity].label}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-slate-900 dark:text-slate-100 break-words">{f.title}</p>
                            <p className="text-sm text-slate-600 dark:text-slate-400">{f.detail}</p>
                          </div>
                          <div className="shrink-0 text-sm sm:text-right sm:max-w-[240px]">
                            {f.fix ? (
                              <span className="inline-flex items-center gap-1 text-blue-700 dark:text-blue-400 font-medium">
                                <Wrench className="h-4 w-4" /> Fix in step 4: {FIXES[f.fix].label}
                              </span>
                            ) : (
                              <span className="inline-flex items-start gap-1 text-slate-600 dark:text-slate-400">
                                <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" /> {f.review}
                              </span>
                            )}
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>

              {ai && (
                <Card>
                  <CardContent className="py-5 space-y-2">
                    <h3 className="font-semibold text-slate-900 dark:text-slate-100">
                      What this file contains{ai.data_type && ai.data_type !== 'Unknown' ? `: ${ai.data_type}` : ''}
                    </h3>
                    <p className="text-sm text-slate-700 dark:text-slate-300">{ai.summary}</p>
                    {ai.key_insights?.length > 0 && (
                      <ul className="list-disc pl-5 text-sm text-slate-700 dark:text-slate-300 space-y-1">
                        {ai.key_insights.slice(0, 5).map((k, i) => (
                          <li key={i}>{k}</li>
                        ))}
                      </ul>
                    )}
                    <p className="text-xs text-slate-500 dark:text-slate-400">Written by AI from a sample of the data. Check it before relying on it.</p>
                  </CardContent>
                </Card>
              )}

              <Card>
                <CardContent className="py-4">
                  <button
                    type="button"
                    onClick={() => setShowColumns((v) => !v)}
                    className="w-full flex items-center justify-between font-semibold text-slate-900 dark:text-slate-100"
                    aria-expanded={showColumns}
                  >
                    <span>Columns and first rows</span>
                    <ChevronDown className={`h-5 w-5 transition-transform ${showColumns ? 'rotate-180' : ''}`} />
                  </button>
                  {showColumns && (
                    <div className="mt-4 space-y-5">
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="text-left text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                              <th className="py-2 pr-4 font-medium">Column</th>
                              <th className="py-2 pr-4 font-medium">Type</th>
                              <th className="py-2 pr-4 font-medium">Empty</th>
                              <th className="py-2 pr-4 font-medium">Distinct values</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(sheet.columns || []).map((c) => (
                              <tr key={c.name} className="border-b border-slate-100 dark:border-slate-800/60">
                                <td className="py-2 pr-4 font-medium text-slate-900 dark:text-slate-100">{c.name}</td>
                                <td className="py-2 pr-4 capitalize text-slate-600 dark:text-slate-400">{c.type}</td>
                                <td className="py-2 pr-4 text-slate-600 dark:text-slate-400">{Number(c.null_percentage || 0).toFixed(1)}%</td>
                                <td className="py-2 pr-4 text-slate-600 dark:text-slate-400">{Number(c.unique_count || 0).toLocaleString()}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      {previewCols.length > 0 && (
                        <div className="overflow-x-auto">
                          <table className="w-full text-xs">
                            <thead>
                              <tr className="bg-slate-50 dark:bg-slate-800/60">
                                {previewCols.map((c) => (
                                  <th key={c} className="px-3 py-2 text-left font-semibold whitespace-nowrap">{c}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {previewRows.map((r, i) => (
                                <tr key={i} className="border-b border-slate-100 dark:border-slate-800/60">
                                  {previewCols.map((c) => (
                                    <td key={c} className="px-3 py-1.5 whitespace-nowrap text-slate-700 dark:text-slate-300">{r[c] == null ? '' : String(r[c])}</td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
              </>
              )}
            </div>
          )}
        </section>
      )}

      {/* 4. Fix and download */}
      {sheet && !sheet.empty && (
        <section>
          <SectionTitle
            n={4}
            title="Fix and download"
            subtitle="The fixes for the problems above are already ticked. Preview the effect, then download a clean Excel copy. Your original file is not changed."
          />
          {analysis.sheets.length > 1 && (
            <Alert className="mb-4">
              <AlertDescription>
                The clean copy is made from the first tab, &ldquo;{analysis.sheets[0].name}&rdquo;. The other tabs are not included yet.
              </AlertDescription>
            </Alert>
          )}
          <Card>
            <CardContent className="py-5 space-y-5">
              <div className="grid gap-3 md:grid-cols-2">
                {FIX_KEYS.map((k) => {
                  const recommended = findings.some((f) => f.fix === k);
                  return (
                    <label
                      key={k}
                      htmlFor={`fix-${k}`}
                      className={`flex items-start gap-3 rounded-xl border p-4 cursor-pointer ${
                        fixes[k] ? 'border-blue-500 bg-blue-50/60 dark:bg-blue-950/30' : 'border-slate-200 dark:border-slate-800'
                      }`}
                    >
                      <Checkbox id={`fix-${k}`} checked={fixes[k]} onCheckedChange={(v) => setFixes((p) => ({ ...p, [k]: Boolean(v) }))} />
                      <span className="space-y-0.5">
                        <span className="flex items-center gap-2 font-medium text-slate-900 dark:text-slate-100">
                          {FIXES[k].label}
                          {recommended && <span className="rounded-full bg-blue-100 dark:bg-blue-900/60 px-2 py-0.5 text-[11px] font-semibold text-blue-800 dark:text-blue-200">Recommended</span>}
                        </span>
                        <span className="block text-sm text-slate-600 dark:text-slate-400">{FIXES[k].example}</span>
                      </span>
                    </label>
                  );
                })}
              </div>

              <div className="flex flex-wrap gap-3">
                <Button variant="outline" onClick={runPreview} disabled={!anyFix || previewing || downloading}>
                  {previewing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Eye className="mr-2 h-4 w-4" />}
                  Preview changes
                </Button>
                <Button onClick={runDownload} disabled={!anyFix || previewing || downloading}>
                  {downloading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                  Download clean file
                </Button>
              </div>
              {!anyFix && <p className="text-sm text-slate-500 dark:text-slate-400">Tick at least one fix to make a clean copy.</p>}

              {fixError && (
                <Alert variant="destructive">
                  <AlertDescription>{fixError}</AlertDescription>
                </Alert>
              )}

              {preview && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <Stat label="Rows" value={`${Number(preview.rows_before).toLocaleString()} → ${Number(preview.rows_after).toLocaleString()}`} />
                  <Stat label="Columns" value={`${preview.cols_before} → ${preview.cols_after}`} />
                  <Stat label="Duplicates removed" value={Number(preview.duplicate_rows_removed || 0).toLocaleString()} />
                </div>
              )}
            </CardContent>
          </Card>
        </section>
      )}
    </div>
  );
}
