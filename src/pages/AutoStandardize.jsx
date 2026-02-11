import { useEffect, useMemo, useState } from 'react';
import { backendApi } from '@/api/meldraClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Loader2, FileSpreadsheet, Download, Info } from 'lucide-react';
import { toast } from 'sonner';

export default function AutoStandardize() {
  const [file, setFile] = useState(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [loadingDownload, setLoadingDownload] = useState(false);
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState('');

  const [dedupeRows, setDedupeRows] = useState(true);
  const [normalizeHeaders, setNormalizeHeaders] = useState(true);
  const [parseNumbers, setParseNumbers] = useState(true);
  const [parseDates, setParseDates] = useState(true);

  const canRun = useMemo(() => !!file && !loadingPreview && !loadingDownload, [file, loadingPreview, loadingDownload]);

  useEffect(() => {
    setPreview(null);
    setError('');
  }, [file, dedupeRows, normalizeHeaders, parseNumbers, parseDates]);

  const runPreview = async () => {
    if (!file) return;
    setLoadingPreview(true);
    setError('');
    try {
      const res = await backendApi.files.standardizePreview(file, {
        dedupeRows,
        normalizeHeaders,
        parseNumbers,
        parseDates,
        timeoutMs: 60000,
      });
      setPreview(res);
    } catch (e) {
      const msg = e?.message ? String(e.message) : 'Preview failed';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoadingPreview(false);
    }
  };

  const download = async () => {
    if (!file) return;
    setLoadingDownload(true);
    setError('');
    try {
      const blob = await backendApi.files.standardize(file, {
        dedupeRows,
        normalizeHeaders,
        parseNumbers,
        parseDates,
        timeoutMs: 120000,
      });

      if (!blob || typeof blob.size !== 'number' || blob.size <= 0) {
        throw new Error('Standardize returned an empty file');
      }

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `standardized_${file.name || 'file'}`.replace(/\.(csv|tsv|xlsx|xls)$/i, '') + '.xlsx';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast.success('Standardized workbook downloaded');
    } catch (e) {
      const msg = e?.message ? String(e.message) : 'Standardize failed';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoadingDownload(false);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Auto-Standardize</h1>
        <p className="text-muted-foreground">
          Clean and standardize spreadsheets deterministically (no storage). You get a downloadable Excel output.
        </p>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Upload
          </CardTitle>
          <CardDescription>
            Supported: .xlsx, .xls, .csv, .tsv
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <input
            type="file"
            accept=".xlsx,.xls,.csv,.tsv"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            className="w-full text-foreground file:text-foreground file:bg-transparent file:border-0"
            disabled={loadingPreview || loadingDownload}
          />

          <TooltipProvider>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="flex items-start gap-2 rounded-lg border p-3">
                <Checkbox id="dedupe" checked={dedupeRows} onCheckedChange={(v) => setDedupeRows(Boolean(v))} />
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Label htmlFor="dedupe">Remove duplicate rows</Label>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button type="button" className="text-slate-500 hover:text-slate-700 dark:hover:text-slate-300">
                          <Info className="h-4 w-4" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent>
                        Duplicates are removed using exact row matches after normalization.
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <div className="text-xs text-muted-foreground">Helps remove repeated entries.</div>
                </div>
              </div>

              <div className="flex items-start gap-2 rounded-lg border p-3">
                <Checkbox id="headers" checked={normalizeHeaders} onCheckedChange={(v) => setNormalizeHeaders(Boolean(v))} />
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Label htmlFor="headers">Normalize headers</Label>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button type="button" className="text-slate-500 hover:text-slate-700 dark:hover:text-slate-300">
                          <Info className="h-4 w-4" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent>
                        Headers become lowercase snake_case and are made unique.
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <div className="text-xs text-muted-foreground">Example: "Invoice Date" → "invoice_date"</div>
                </div>
              </div>

              <div className="flex items-start gap-2 rounded-lg border p-3">
                <Checkbox id="numbers" checked={parseNumbers} onCheckedChange={(v) => setParseNumbers(Boolean(v))} />
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Label htmlFor="numbers">Parse numbers</Label>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button type="button" className="text-slate-500 hover:text-slate-700 dark:hover:text-slate-300">
                          <Info className="h-4 w-4" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent>
                        Converts currency/commas/parentheses to numeric values where safe.
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <div className="text-xs text-muted-foreground">Example: "(1,234.50)" → -1234.5</div>
                </div>
              </div>

              <div className="flex items-start gap-2 rounded-lg border p-3">
                <Checkbox id="dates" checked={parseDates} onCheckedChange={(v) => setParseDates(Boolean(v))} />
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Label htmlFor="dates">Parse dates</Label>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button type="button" className="text-slate-500 hover:text-slate-700 dark:hover:text-slate-300">
                          <Info className="h-4 w-4" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent>
                        Attempts to parse common date formats into proper date types.
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <div className="text-xs text-muted-foreground">Leaves values unchanged if parsing is unsafe.</div>
                </div>
              </div>
            </div>
          </TooltipProvider>

          <div className="flex flex-wrap gap-3">
            <Button type="button" onClick={runPreview} disabled={!canRun} variant="outline">
              {loadingPreview ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Previewing…
                </>
              ) : (
                'Preview changes'
              )}
            </Button>

            <Button type="button" onClick={download} disabled={!canRun}>
              {loadingDownload ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Standardizing…
                </>
              ) : (
                <>
                  <Download className="mr-2 h-4 w-4" />
                  Standardize & Download
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
              <div className="mt-2 grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                <div className="rounded-lg border p-3">
                  <div className="text-xs text-muted-foreground">Rows</div>
                  <div className="font-semibold">{preview.rows_before} → {preview.rows_after}</div>
                </div>
                <div className="rounded-lg border p-3">
                  <div className="text-xs text-muted-foreground">Columns</div>
                  <div className="font-semibold">{preview.cols_before} → {preview.cols_after}</div>
                </div>
                <div className="rounded-lg border p-3">
                  <div className="text-xs text-muted-foreground">Duplicates removed</div>
                  <div className="font-semibold">{preview.duplicate_rows_removed}</div>
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
              Files are processed in-memory and not stored. We may store minimal operational metadata (account/usage logs).
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
