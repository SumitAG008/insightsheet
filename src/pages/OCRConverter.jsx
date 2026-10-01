// pages/OCRConverter.jsx - Fillable PDF from any form (PDF, scan or photo), form data extraction, and OCR to DOC/PDF
import React, { useState, useEffect } from 'react';
import { maxUploadMb, uploadLimitLabel } from '@/lib/uploadLimits';
import { backendApi } from '@/api/meldraClient';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { generateDownloadFilename, downloadBlob } from '@/utils/fileNaming';
import {
  ScanLine, FileText, Upload, Loader2, CheckCircle, AlertCircle,
  Save, Image as ImageIcon, FileType, Lock, PenLine, Table2, Download, FileCheck2,
} from 'lucide-react';

const IMAGE_ACCEPT = '.jpg,.jpeg,.png,.webp,.bmp,.tiff,.tif,.gif,.pdf';
const SAVE_KEY = 'meldra_ocr_draft';

export default function OCRConverter() {
  const [file, setFile] = useState(null);
  const [extracting, setExtracting] = useState(false);
  const [ocrDone, setOcrDone] = useState(false);
  const [text, setText] = useState('');
  const [layout, setLayout] = useState(null);
  const [imageWidth, setImageWidth] = useState(null);
  const [imageHeight, setImageHeight] = useState(null);
  const [tables, setTables] = useState(null);
  const [pages, setPages] = useState(null);
  const [ocrLang, setOcrLang] = useState('eng');
  const [exportMode, setExportMode] = useState('layout'); // 'form' | 'layout' — layout = match image positions
  const [preserveImage, setPreserveImage] = useState(false); // PDF: use original image (exact copy)
  const [exporting, setExporting] = useState(null); // 'doc' | 'pdf' | null
  const [error, setError] = useState('');
  const [user, setUser] = useState(null);
  const [subscription, setSubscription] = useState(null);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(null); // 'fill' | 'data' | null
  const [fillResult, setFillResult] = useState(null); // { fields, checkboxes, pages, scannedPages }
  const [formData, setFormData] = useState(null); // { fields, text, page_count }

  useEffect(() => {
    loadUserAndSubscription();
    const raw = sessionStorage.getItem(SAVE_KEY);
    if (raw) {
      try {
        const { t } = JSON.parse(raw);
        if (t && typeof t === 'string') setText(t);
      } catch (_) {}
    }
  }, []);

  const loadUserAndSubscription = async () => {
    try {
      const u = await backendApi.auth.me();
      setUser(u);
      const sub = await backendApi.subscriptions.getMy();
      if (sub) setSubscription(sub);
    } catch {
      setUser(null);
      setSubscription(null);
    }
  };

  const maxSizeMB = maxUploadMb(subscription);

  const handleFileChange = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const ext = '.' + (f.name.split('.').pop() || '').toLowerCase();
    const allowed = new Set(['.jpg', '.jpeg', '.png', '.webp', '.bmp', '.tiff', '.tif', '.gif', '.pdf']);
    if (!allowed.has(ext)) {
      setError('Please select an image or PDF: JPG, PNG, WebP, BMP, TIFF, GIF, or PDF');
      e.target.value = '';
      return;
    }
    const sizeMB = f.size / (1024 * 1024);
    if (sizeMB > maxSizeMB) {
      setError(`File size (${sizeMB.toFixed(1)}MB) exceeds your ${maxSizeMB}MB limit.`);
      e.target.value = '';
      return;
    }
    setFile(f);
    setFillResult(null);
    setFormData(null);
    setError('');
    setText('');
    setLayout(null);
    setImageWidth(null);
    setImageHeight(null);
    setTables(null);
    setPages(null);
    setOcrDone(false);
  };

  const handleRunOCR = async () => {
    if (!file) return;
    setExtracting(true);
    setError('');
    try {
      const res = await backendApi.files.ocrExtract(file, ocrLang);
      setText(res.text ?? '');
      setLayout(res.layout ?? null);
      setImageWidth(res.image_width ?? null);
      setImageHeight(res.image_height ?? null);
      setTables(res.tables ?? null);
      setPages(res.pages ?? null);
      setOcrDone(true);
    } catch (err) {
      setError(err.message || 'OCR extraction failed. Ensure the backend has Tesseract installed.');
    } finally {
      setExtracting(false);
    }
  };

  const baseName = () => (file?.name || 'form').replace(/\.[^/.]+$/, '') || 'form';

  const handleMakeFillable = async () => {
    if (!file) return;
    setBusy('fill');
    setError('');
    setFillResult(null);
    try {
      const res = await backendApi.files.makeFillable(file, ocrLang);
      downloadBlob(res.blob, `${baseName()}_fillable.pdf`);
      setFillResult(res);
    } catch (err) {
      setError(err.message || 'Could not make this form fillable.');
    } finally {
      setBusy(null);
    }
  };

  const handleReadData = async () => {
    if (!file) return;
    setBusy('data');
    setError('');
    setFormData(null);
    try {
      setFormData(await backendApi.files.extractFormData(file, ocrLang));
    } catch (err) {
      setError(err.message || 'Could not read this document.');
    } finally {
      setBusy(null);
    }
  };

  const downloadFormData = (kind) => {
    if (!formData) return;
    if (kind === 'json') {
      downloadBlob(new Blob([JSON.stringify(formData, null, 2)], { type: 'application/json' }), `${baseName()}_data.json`);
      return;
    }
    const q = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const rows = [['Page', 'Label', 'Value'], ...formData.fields.map((f) => [f.page, f.label, f.value])];
    downloadBlob(new Blob([rows.map((r) => r.map(q).join(',')).join('\n')], { type: 'text/csv' }), `${baseName()}_data.csv`);
  };

  const handleSave = () => {
    sessionStorage.setItem(SAVE_KEY, JSON.stringify({ t: text }));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleExport = async (format) => {
    setExporting(format);
    setError('');
    try {
      const payload = {
        text,
        format,
        title: (file?.name || 'OCR').replace(/\.[^/.]+$/, '') || 'OCR Document',
      };
      if (exportMode === 'layout' && pages && Array.isArray(pages) && pages.length > 0) {
        payload.pages = pages;
        payload.mode = 'layout';
      }
      if (format === 'pdf' && preserveImage && file) {
        const base64 = await new Promise((res, rej) => {
          const r = new FileReader();
          r.onload = () => {
            const s = r.result;
            res(typeof s === 'string' && s.includes(',') ? s.split(',')[1] : (s || ''));
          };
          r.onerror = rej;
          r.readAsDataURL(file);
        });
        payload.preserve_image = true;
        payload.image_base64 = base64;
      } else if (exportMode === 'layout' && layout && imageWidth && imageHeight) {
        payload.layout = layout;
        payload.image_width = imageWidth;
        payload.image_height = imageHeight;
        if (tables) payload.tables = tables;
        payload.mode = 'layout';
      }
      const blob = await backendApi.files.ocrExport(payload);
      const ext = format === 'doc' ? '.docx' : '.pdf';
      const name = generateDownloadFilename(file?.name || 'image', ext);
      downloadBlob(blob, name);
    } catch (err) {
      setError(err.message || `Export to ${format.toUpperCase()} failed.`);
    } finally {
      setExporting(null);
    }
  };

  const handleReset = () => {
    setFile(null);
    setFillResult(null);
    setFormData(null);
    setText('');
    setLayout(null);
    setImageWidth(null);
    setImageHeight(null);
    setTables(null);
    setPages(null);
    setOcrDone(false);
    setError('');
    sessionStorage.removeItem(SAVE_KEY);
    const input = document.getElementById('ocrFileInput');
    if (input) input.value = '';
  };

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 py-12">
      <div className="container mx-auto px-4 max-w-4xl">
        <div className="text-center mb-12">
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 bg-[#065f46] rounded-2xl flex items-center justify-center shadow-lg">
              <ScanLine className="w-10 h-10 text-white" />
            </div>
          </div>
          <h1 className="text-5xl font-bold text-slate-900 dark:text-white mb-4">
            Fillable PDF & Form Reader
          </h1>
          <p className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-4">
            Turn any locked PDF, scan or photo of a form into a PDF you can type into, print once and sign, or read the data out of it
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Badge className="bg-[#065f46] text-white border border-[#065f46] font-bold">
              <ImageIcon className="w-4 h-4 mr-1" />
              Any Image
            </Badge>
            <Badge className="bg-[#9d174d] text-white border border-[#9d174d] font-bold">
              <FileText className="w-4 h-4 mr-1" />
              Editable DOC
            </Badge>
            <Badge className="bg-[#065f46] text-white border border-[#065f46] font-bold">
              <FileType className="w-4 h-4 mr-1" />
              Editable PDF
            </Badge>
          </div>
        </div>

        <Alert className={`mb-6 ${subscription?.plan === 'premium' ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-amber-500/10 border-amber-500/30'}`}>
          <Lock className={`h-5 w-5 ${subscription?.plan === 'premium' ? 'text-emerald-400' : 'text-amber-400'}`} />
          <AlertDescription className="text-slate-900 dark:text-slate-100">
            <strong className="text-slate-900 dark:text-white font-bold">
              {!Number.isFinite(maxSizeMB) ? 'No file size limit' : subscription?.plan === 'premium' ? `Premium: Up to ${maxSizeMB}MB` : `File limit: ${maxSizeMB}MB`}
            </strong>
            <br />
            <span className="text-sm text-slate-900 dark:text-slate-200 font-bold">
              Upload a PDF (also locked or scanned) or an image: JPG, JPEG, PNG, WebP, BMP, TIFF, GIF. Up to 25 pages.
              For photos: flat page, good light, whole form in view.
            </span>
          </AlertDescription>
        </Alert>

        {!file && (
          <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-12 mb-6">
            <label className="flex flex-col items-center justify-center cursor-pointer">
              <input
                type="file"
                id="ocrFileInput"
                accept={IMAGE_ACCEPT}
                onChange={handleFileChange}
                className="hidden"
                disabled={extracting}
              />
              <div className="w-20 h-20 bg-[#065f46] rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                <Upload className="w-10 h-10 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-2">Upload Image / PDF</h3>
              <p className="text-slate-200 font-semibold mb-2">Scans, photos, forms, screenshots</p>
              <p className="text-slate-300 font-medium text-sm">Max {uploadLimitLabel(maxSizeMB)}</p>
            </label>
          </div>
        )}

        {file && !ocrDone && (
          <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <ImageIcon className="w-8 h-8 text-blue-400" />
                <div>
                  <p className="text-white font-semibold">{file.name}</p>
                  <p className="text-slate-400 text-sm">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                </div>
              </div>
              {!extracting && <Button onClick={handleReset} variant="outline" size="sm">Remove</Button>}
            </div>
            <div className="flex flex-wrap items-center gap-3 mb-4">
              <Label htmlFor="ocr-lang" className="text-slate-200 text-sm font-medium shrink-0">OCR language</Label>
              <Select value={ocrLang} onValueChange={setOcrLang}>
                <SelectTrigger id="ocr-lang" className="w-[240px] bg-slate-800/50 border-slate-600 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="eng">English</SelectItem>
                  <SelectItem value="hin+eng">Hindi + English</SelectItem>
                </SelectContent>
              </Select>
              <span className="text-slate-400 text-sm">
                Choose Hindi + English for bilingual PDFs to avoid garbled text.
              </span>
            </div>
            {error && (
              <Alert className="mb-4 bg-red-500/10 border-red-500/30">
                <AlertCircle className="h-4 w-4 text-red-400" />
                <AlertDescription className="text-red-300">{error}</AlertDescription>
              </Alert>
            )}
            <div className="grid gap-3 md:grid-cols-3">
              <button
                type="button"
                onClick={handleMakeFillable}
                disabled={!!busy || extracting}
                className="text-left rounded-xl border-2 border-emerald-500 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 p-4 text-white"
              >
                <div className="flex items-center gap-2 font-bold text-base mb-1">
                  {busy === 'fill' ? <Loader2 className="w-5 h-5 animate-spin" /> : <PenLine className="w-5 h-5" />}
                  Make fillable PDF
                </div>
                <p className="text-sm text-emerald-50">Same look as the original, with boxes to type into and tick. Fill on screen, print once, sign.</p>
              </button>
              <button
                type="button"
                onClick={handleReadData}
                disabled={!!busy || extracting}
                className="text-left rounded-xl border border-slate-600 bg-slate-800 hover:bg-slate-700 disabled:opacity-60 p-4 text-white"
              >
                <div className="flex items-center gap-2 font-bold text-base mb-1">
                  {busy === 'data' ? <Loader2 className="w-5 h-5 animate-spin" /> : <Table2 className="w-5 h-5" />}
                  Read form data
                </div>
                <p className="text-sm text-slate-300">Pull the filled-in values (name, policy number, ticks...) as a table, CSV or JSON.</p>
              </button>
              <button
                type="button"
                onClick={handleRunOCR}
                disabled={!!busy || extracting}
                className="text-left rounded-xl border border-slate-600 bg-slate-800 hover:bg-slate-700 disabled:opacity-60 p-4 text-white"
              >
                <div className="flex items-center gap-2 font-bold text-base mb-1">
                  {extracting ? <Loader2 className="w-5 h-5 animate-spin" /> : <ScanLine className="w-5 h-5" />}
                  Extract & edit text
                </div>
                <p className="text-sm text-slate-300">Get the text, correct it, and download as Word or PDF.</p>
              </button>
            </div>
            {busy && (
              <p className="mt-3 text-sm text-slate-300">Reading the document… scans and photos take a few seconds per page.</p>
            )}
            {fillResult && (
              <Alert className="mt-4 bg-emerald-500/10 border-emerald-500/30">
                <FileCheck2 className="h-4 w-4 text-emerald-400" />
                <AlertDescription className="text-slate-100">
                  <strong>Downloaded {baseName()}_fillable.pdf</strong>: {fillResult.fields} text boxes and {fillResult.checkboxes} tick boxes
                  on {fillResult.pages} page{fillResult.pages === 1 ? '' : 's'}
                  {fillResult.scannedPages ? ` (${fillResult.scannedPages} scanned, now also searchable)` : ''}.
                  Open it in Edge, Chrome or Adobe Reader, click a blank and type. Need text somewhere else? Use your reader&apos;s &quot;Add text&quot; tool.
                  {fillResult.fields + fillResult.checkboxes === 0 && ' No blanks were found: use “Add text” in your PDF reader to type anywhere on the page.'}
                </AlertDescription>
              </Alert>
            )}
            {formData && (
              <div className="mt-4 rounded-xl border border-slate-700 bg-slate-950/60 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                  <p className="text-white font-semibold">{formData.fields.length} values found on {formData.page_count} page{formData.page_count === 1 ? '' : 's'}</p>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => downloadFormData('csv')}><Download className="w-4 h-4 mr-1" /> CSV</Button>
                    <Button size="sm" variant="outline" onClick={() => downloadFormData('json')}><Download className="w-4 h-4 mr-1" /> JSON</Button>
                  </div>
                </div>
                {formData.fields.length ? (
                  <div className="max-h-80 overflow-auto">
                    <table className="w-full text-sm">
                      <thead><tr className="text-left text-slate-300"><th className="py-1 pr-3">Label</th><th className="py-1 pr-3">Value</th><th className="py-1">Page</th></tr></thead>
                      <tbody>
                        {formData.fields.map((f, i) => (
                          <tr key={i} className="border-t border-slate-800 text-slate-100 align-top">
                            <td className="py-1 pr-3 font-medium">{f.label}</td>
                            <td className="py-1 pr-3 whitespace-pre-wrap">{f.value}</td>
                            <td className="py-1 text-slate-400">{f.page}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-slate-300 text-sm">No label/value pairs were recognised. The full text is in the JSON download.</p>
                )}
              </div>
            )}
          </div>
        )}

        {file && ocrDone && (
          <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <p className="text-white font-semibold">Editable text — edit, then Save or Download</p>
              <Button onClick={handleReset} variant="outline" size="sm">New file</Button>
            </div>
            {error && (
              <Alert className="mb-4 bg-red-500/10 border-red-500/30">
                <AlertCircle className="h-4 w-4 text-red-400" />
                <AlertDescription className="text-red-300">{error}</AlertDescription>
              </Alert>
            )}
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Extracted text will appear here. You can edit and fill in any corrections."
              className="min-h-[220px] mb-4 bg-slate-800/50 border-slate-600 text-white placeholder:text-slate-500"
            />
            <div className="flex flex-wrap items-center gap-4 mb-4">
              <div className="flex items-center gap-2">
                <Label htmlFor="export-mode" className="text-slate-200 text-sm font-medium shrink-0">Export as</Label>
                <Select value={exportMode} onValueChange={setExportMode}>
                  <SelectTrigger id="export-mode" className="w-[220px] bg-slate-800/50 border-slate-600 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="layout">Layout (match image)</SelectItem>
                    <SelectItem value="form">Form (sections, tables, fields)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <span className="text-slate-400 text-sm">
                {exportMode === 'layout' ? 'Same format as the original so filled & signed forms stay acceptable.' : 'Flow structure: sections, labels, tables.'}
              </span>
              <div className="flex items-center gap-2 ml-4">
                <Checkbox
                  id="preserve-image"
                  checked={preserveImage}
                  onCheckedChange={(v) => setPreserveImage(!!v)}
                  className="border-slate-500 data-[state=checked]:bg-emerald-600"
                />
                <Label htmlFor="preserve-image" className="text-slate-300 text-sm cursor-pointer">
                  Exact copy (PDF looks like the original image)
                </Label>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                onClick={handleSave}
                variant="outline"
                className="border-slate-500 text-slate-300 hover:bg-slate-700"
              >
                {saved ? <><CheckCircle className="w-4 h-4 mr-2 text-emerald-400" /> Saved</> : <><Save className="w-4 h-4 mr-2" /> Save</>}
              </Button>
              <Button
                onClick={() => handleExport('doc')}
                disabled={!!exporting}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {exporting === 'doc' ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <FileText className="w-4 h-4 mr-2" />}
                Download as DOC
              </Button>
              <Button
                onClick={() => handleExport('pdf')}
                disabled={!!exporting}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
              >
                {exporting === 'pdf' ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <FileType className="w-4 h-4 mr-2" />}
                Download as PDF
              </Button>
            </div>
          </div>
        )}


        <div className="mt-12 bg-slate-900/80 backdrop-blur-xl rounded-xl p-6 border border-slate-700/50">
          <h3 className="text-lg font-bold text-white mb-4">How it works</h3>
          <div className="space-y-3 text-sm text-slate-200">
            <p><strong className="text-white">1. Upload</strong> the form: a PDF you can&apos;t type into (locked or scanned), or a photo or scan (JPG, JPEG, PNG, WebP, BMP, TIFF, GIF).</p>
            <p><strong className="text-white">2. Make fillable PDF</strong>: Meldra finds the blanks (lines, empty boxes and table cells, &quot;Label:&quot; gaps, tick boxes) and adds boxes you can type into. The page keeps its original look, so hospitals, insurers and banks accept it.</p>
            <p><strong className="text-white">3. Fill, print once, sign.</strong> Any PDF reader works (Edge, Chrome, Adobe Reader, Preview). Your typed answers can be saved and edited again later.</p>
            <p><strong className="text-white">Read form data</strong> pulls the values out of a filled form, statement or letter, for spreadsheets or other systems. Developers: the same tools are in the Meldra API.</p>
            <p className="text-slate-400">Your file is processed in memory and never stored.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
