// pages/OCRConverter.jsx - OCR to DOC & OCR to PDF: extract text from images, edit, save, then download
import React, { useState, useEffect } from 'react';
import { backendApi } from '@/api/meldraClient';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { generateDownloadFilename, downloadBlob } from '@/utils/fileNaming';
import {
  ScanLine, FileText, Upload, Loader2, CheckCircle, AlertCircle,
  Save, Image as ImageIcon, FileType, Lock,
} from 'lucide-react';

const IMAGE_ACCEPT = '.jpg,.jpeg,.png,.webp,.bmp,.tiff,.tif,.gif';
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
  const [exportMode, setExportMode] = useState('layout'); // 'form' | 'layout' — layout = match image positions
  const [exporting, setExporting] = useState(null); // 'doc' | 'pdf' | null
  const [error, setError] = useState('');
  const [user, setUser] = useState(null);
  const [subscription, setSubscription] = useState(null);
  const [saved, setSaved] = useState(false);

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

  const maxSizeMB = (subscription && subscription?.plan === 'premium') ? 500 : 10;

  const handleFileChange = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const ext = '.' + (f.name.split('.').pop() || '').toLowerCase();
    const allowed = new Set(['.jpg', '.jpeg', '.png', '.webp', '.bmp', '.tiff', '.tif', '.gif']);
    if (!allowed.has(ext)) {
      setError('Please select an image: JPG, PNG, WebP, BMP, TIFF, or GIF');
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
    setError('');
    setText('');
    setLayout(null);
    setImageWidth(null);
    setImageHeight(null);
    setTables(null);
    setOcrDone(false);
  };

  const handleRunOCR = async () => {
    if (!file) return;
    setExtracting(true);
    setError('');
    try {
      const res = await backendApi.files.ocrExtract(file);
      setText(res.text ?? '');
      setLayout(res.layout ?? null);
      setImageWidth(res.image_width ?? null);
      setImageHeight(res.image_height ?? null);
      setTables(res.tables ?? null);
      setOcrDone(true);
    } catch (err) {
      setError(err.message || 'OCR extraction failed. Ensure the backend has Tesseract installed.');
    } finally {
      setExtracting(false);
    }
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
      if (exportMode === 'layout' && layout && imageWidth && imageHeight) {
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
    setText('');
    setLayout(null);
    setImageWidth(null);
    setImageHeight(null);
    setTables(null);
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
            OCR to DOC & OCR to PDF
          </h1>
          <p className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-4">
            Extract text from any image, edit it, save, and download as editable Word or PDF
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
              {subscription?.plan === 'premium' ? 'Premium: Up to 500MB' : `File limit: ${maxSizeMB}MB`}
            </strong>
            <br />
            <span className="text-sm text-slate-900 dark:text-slate-200 font-bold">
              JPG, PNG, WebP, BMP, TIFF, GIF supported. Edit the extracted text, then export to DOC or PDF. <strong>Layout</strong>: places text at the same positions as the image (exactly editable). <strong>Form</strong>: sections, fill-in lines, tables, and checkboxes.
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
              <h3 className="text-2xl font-bold text-white mb-2">Upload Image</h3>
              <p className="text-slate-200 font-semibold mb-2">Scans, photos, forms, screenshots</p>
              <p className="text-slate-300 font-medium text-sm">Max {maxSizeMB}MB</p>
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
            {error && (
              <Alert className="mb-4 bg-red-500/10 border-red-500/30">
                <AlertCircle className="h-4 w-4 text-red-400" />
                <AlertDescription className="text-red-300">{error}</AlertDescription>
              </Alert>
            )}
            <Button
              onClick={handleRunOCR}
              disabled={extracting}
              className="w-full bg-gradient-to-r from-blue-600 to-emerald-600 hover:from-blue-700 hover:to-emerald-700 text-white font-bold py-3"
            >
              {extracting ? <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Extracting text…</> : <><ScanLine className="w-5 h-5 mr-2" /> Run OCR</>}
            </Button>
          </div>
        )}

        {file && ocrDone && (
          <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <p className="text-white font-semibold">Editable text — edit, then Save or Download</p>
              <Button onClick={handleReset} variant="outline" size="sm">New image</Button>
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
                {exportMode === 'layout' ? 'Positions match the original image.' : 'Flow structure: sections, labels, tables.'}
              </span>
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
          <div className="space-y-3 text-sm">
            <div className="flex gap-3">
              <span className="font-bold text-blue-400">1</span>
              <div className="text-slate-200 font-bold"><strong className="text-white">Upload</strong> — Any image: scan, photo, form, screenshot (JPG, PNG, WebP, BMP, TIFF, GIF).</div>
            </div>
            <div className="flex gap-3">
              <span className="font-bold text-blue-400">2</span>
              <div className="text-slate-200 font-bold"><strong className="text-white">Run OCR</strong> — Extract text. You can edit and fill in the content.</div>
            </div>
            <div className="flex gap-3">
              <span className="font-bold text-blue-400">3</span>
              <div className="text-slate-200 font-bold"><strong className="text-white">Save</strong> — Saves your edits in this browser session.</div>
            </div>
            <div className="flex gap-3">
              <span className="font-bold text-blue-400">4</span>
              <div className="text-slate-200 font-bold"><strong className="text-white">Download</strong> — Export as editable Word (.docx) or searchable PDF.</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
