import { useEffect, useMemo, useState } from 'react';
import { backendApi } from '@/api/meldraClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Loader2, GitCompareArrows, Download, Info } from 'lucide-react';
import { toast } from 'sonner';

function splitCsvLine(line) {
  // minimal CSV splitting (handles quoted commas)
  const out = [];
  let cur = '';
  let inQ = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === '"') {
      inQ = !inQ;
      continue;
    }
    if (ch === ',' && !inQ) {
      out.push(cur);
      cur = '';
      continue;
    }
    cur += ch;
  }
  out.push(cur);
  return out.map((s) => String(s || '').trim());
}

async function tryExtractHeaders(file) {
  const name = String(file?.name || '').toLowerCase();
  if (name.endsWith('.csv') || name.endsWith('.tsv')) {
    const text = await file.text();
    const firstLine = String(text.split(/\r?\n/)[0] || '');
    const delim = name.endsWith('.tsv') ? '\t' : ',';
    if (delim === '\t') {
      return firstLine.split('\t').map((s) => String(s || '').trim()).filter(Boolean);
    }
    return splitCsvLine(firstLine).filter(Boolean);
  }
  // For xlsx/xls, keep it simple for MVP: user types/selects column names manually.
  return [];
}

export default function Reconciliation() {
  const [leftFile, setLeftFile] = useState(null);
  const [rightFile, setRightFile] = useState(null);

  const [leftHeaders, setLeftHeaders] = useState([]);
  const [rightHeaders, setRightHeaders] = useState([]);

  const [leftKeyCol, setLeftKeyCol] = useState('');
  const [rightKeyCol, setRightKeyCol] = useState('');
  const [leftAmountCol, setLeftAmountCol] = useState('');
  const [rightAmountCol, setRightAmountCol] = useState('');
  const [tolerance, setTolerance] = useState('0');

  const [previewLoading, setPreviewLoading] = useState(false);
  const [downloadLoading, setDownloadLoading] = useState(false);
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState('');

  const canRun = useMemo(() => {
    return (
      !!leftFile &&
      !!rightFile &&
      !!leftKeyCol &&
      !!rightKeyCol &&
      !!leftAmountCol &&
      !!rightAmountCol &&
      !previewLoading &&
      !downloadLoading
    );
  }, [leftFile, rightFile, leftKeyCol, rightKeyCol, leftAmountCol, rightAmountCol, previewLoading, downloadLoading]);

  useEffect(() => {
    setPreview(null);
    setError('');
  }, [leftFile, rightFile, leftKeyCol, rightKeyCol, leftAmountCol, rightAmountCol, tolerance]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!leftFile) {
        setLeftHeaders([]);
        return;
      }
      try {
        const hdrs = await tryExtractHeaders(leftFile);
        if (!cancelled) setLeftHeaders(hdrs);
      } catch {
        if (!cancelled) setLeftHeaders([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [leftFile]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!rightFile) {
        setRightHeaders([]);
        return;
      }
      try {
        const hdrs = await tryExtractHeaders(rightFile);
        if (!cancelled) setRightHeaders(hdrs);
      } catch {
        if (!cancelled) setRightHeaders([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [rightFile]);

  const runPreview = async () => {
    if (!canRun) return;
    setPreviewLoading(true);
    setError('');
    try {
      const res = await backendApi.files.reconcilePreview(
        leftFile,
        rightFile,
        {
          leftKeyCol,
          rightKeyCol,
          leftAmountCol,
          rightAmountCol,
          tolerance: Number(tolerance || 0),
        },
        { timeoutMs: 60000 }
      );
      setPreview(res);
    } catch (e) {
      const msg = e?.message ? String(e.message) : 'Preview failed';
      setError(msg);
      toast.error(msg);
    } finally {
      setPreviewLoading(false);
    }
  };

  const download = async () => {
    if (!canRun) return;
    setDownloadLoading(true);
    setError('');
    try {
      const blob = await backendApi.files.reconcile(
        leftFile,
        rightFile,
        {
          leftKeyCol,
          rightKeyCol,
          leftAmountCol,
          rightAmountCol,
          tolerance: Number(tolerance || 0),
        },
        { timeoutMs: 120000 }
      );

      if (!blob || typeof blob.size !== 'number' || blob.size <= 0) {
        throw new Error('Reconcile returned an empty file');
      }

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'reconciliation_report.xlsx';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast.success('Reconciliation report downloaded');
    } catch (e) {
      const msg = e?.message ? String(e.message) : 'Reconcile failed';
      setError(msg);
      toast.error(msg);
    } finally {
      setDownloadLoading(false);
    }
  };

  const HeaderPicker = ({ title, headers, value, onChange, placeholder }) => {
    const has = Array.isArray(headers) && headers.length > 0;
    return (
      <div className="space-y-2">
        <Label>{title}</Label>
        {has ? (
          <div className="flex flex-wrap gap-2">
            {headers.slice(0, 24).map((h) => (
              <button
                key={h}
                type="button"
                onClick={() => onChange(h)}
                className={`px-3 py-1.5 rounded-md border text-sm transition-colors ${
                  value === h
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white/60 dark:bg-slate-900/30 text-slate-800 dark:text-slate-100 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                {h}
              </button>
            ))}
          </div>
        ) : (
          <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
        )}
        {!has ? (
          <div className="text-xs text-muted-foreground">For Excel files, type column names exactly as they appear.</div>
        ) : null}
      </div>
    );
  };

  return (
    <div className="container mx-auto p-6 max-w-5xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Reconciliation</h1>
        <p className="text-muted-foreground">
          Reconcile two datasets by key and amount. Output includes matched keys, mismatches, missing rows, and totals.
        </p>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GitCompareArrows className="h-5 w-5" />
            Upload 2 files
          </CardTitle>
          <CardDescription>Supported: .xlsx, .xls, .csv, .tsv</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Left file</Label>
              <input
                type="file"
                accept=".xlsx,.xls,.csv,.tsv"
                onChange={(e) => setLeftFile(e.target.files?.[0] || null)}
                className="w-full text-foreground file:text-foreground file:bg-transparent file:border-0"
                disabled={previewLoading || downloadLoading}
              />
            </div>
            <div className="space-y-2">
              <Label>Right file</Label>
              <input
                type="file"
                accept=".xlsx,.xls,.csv,.tsv"
                onChange={(e) => setRightFile(e.target.files?.[0] || null)}
                className="w-full text-foreground file:text-foreground file:bg-transparent file:border-0"
                disabled={previewLoading || downloadLoading}
              />
            </div>
          </div>

          <TooltipProvider>
            <div className="rounded-xl border p-4 bg-white/60 dark:bg-slate-900/30 space-y-4">
              <div className="flex items-center justify-between gap-4">
                <div className="text-sm font-semibold">Mapping</div>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button type="button" className="inline-flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white">
                      <Info className="h-4 w-4" />
                      How this works
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>
                    Exact key match. Amounts are summed per key on each side, then variance is computed.
                  </TooltipContent>
                </Tooltip>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <HeaderPicker
                  title="Left key column"
                  headers={leftHeaders}
                  value={leftKeyCol}
                  onChange={setLeftKeyCol}
                  placeholder="e.g. Invoice Number"
                />
                <HeaderPicker
                  title="Right key column"
                  headers={rightHeaders}
                  value={rightKeyCol}
                  onChange={setRightKeyCol}
                  placeholder="e.g. Invoice No"
                />
                <HeaderPicker
                  title="Left amount column"
                  headers={leftHeaders}
                  value={leftAmountCol}
                  onChange={setLeftAmountCol}
                  placeholder="e.g. Total"
                />
                <HeaderPicker
                  title="Right amount column"
                  headers={rightHeaders}
                  value={rightAmountCol}
                  onChange={setRightAmountCol}
                  placeholder="e.g. Amount"
                />
              </div>

              <div className="space-y-2 max-w-xs">
                <Label>Tolerance</Label>
                <Input
                  value={tolerance}
                  onChange={(e) => setTolerance(e.target.value)}
                  placeholder="0"
                  inputMode="decimal"
                />
                <div className="text-xs text-muted-foreground">Variance within tolerance is treated as matched.</div>
              </div>
            </div>
          </TooltipProvider>

          <div className="flex flex-wrap gap-3">
            <Button type="button" onClick={runPreview} disabled={!canRun} variant="outline">
              {previewLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Previewing…
                </>
              ) : (
                'Preview'
              )}
            </Button>

            <Button type="button" onClick={download} disabled={!canRun}>
              {downloadLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Reconciling…
                </>
              ) : (
                <>
                  <Download className="mr-2 h-4 w-4" />
                  Reconcile & Download
                </>
              )}
            </Button>
          </div>

          {error ? (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}

          {preview ? (
            <div className="rounded-xl border p-4 bg-white/60 dark:bg-slate-900/30">
              <div className="text-sm font-semibold">Preview</div>
              <div className="mt-2 grid grid-cols-1 md:grid-cols-5 gap-3 text-sm">
                <div className="rounded-lg border p-3">
                  <div className="text-xs text-muted-foreground">Matched</div>
                  <div className="font-semibold">{preview?.counts?.matched ?? '-'}</div>
                </div>
                <div className="rounded-lg border p-3">
                  <div className="text-xs text-muted-foreground">Mismatch</div>
                  <div className="font-semibold">{preview?.counts?.mismatch ?? '-'}</div>
                </div>
                <div className="rounded-lg border p-3">
                  <div className="text-xs text-muted-foreground">Missing left</div>
                  <div className="font-semibold">{preview?.counts?.missing_on_left ?? '-'}</div>
                </div>
                <div className="rounded-lg border p-3">
                  <div className="text-xs text-muted-foreground">Missing right</div>
                  <div className="font-semibold">{preview?.counts?.missing_on_right ?? '-'}</div>
                </div>
                <div className="rounded-lg border p-3">
                  <div className="text-xs text-muted-foreground">Total keys</div>
                  <div className="font-semibold">{preview?.counts?.total_keys ?? '-'}</div>
                </div>
              </div>

              <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                <div className="rounded-lg border p-3">
                  <div className="text-xs text-muted-foreground">Left total</div>
                  <div className="font-semibold">{preview?.totals?.left_total ?? '-'}</div>
                </div>
                <div className="rounded-lg border p-3">
                  <div className="text-xs text-muted-foreground">Right total</div>
                  <div className="font-semibold">{preview?.totals?.right_total ?? '-'}</div>
                </div>
                <div className="rounded-lg border p-3">
                  <div className="text-xs text-muted-foreground">Variance total</div>
                  <div className="font-semibold">{preview?.totals?.variance_total ?? '-'}</div>
                </div>
              </div>

              {preview.note ? (
                <div className="mt-3 text-xs text-muted-foreground">{preview.note}</div>
              ) : null}
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card className="bg-blue-50 dark:bg-blue-950">
        <CardContent className="pt-6">
          <div className="text-sm text-slate-700 dark:text-slate-200">
            <div className="font-semibold mb-1">Privacy</div>
            <div className="text-xs text-slate-600 dark:text-slate-300">
              Files are processed in-memory and not stored. Reconciliation is deterministic (exact key match). For fuzzy matching/AI-assisted mapping, we can add an optional toggle next.
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
