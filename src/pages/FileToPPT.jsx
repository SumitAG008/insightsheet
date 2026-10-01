// pages/FileToPPT.jsx - Advanced Excel to PowerPoint converter (browser-based) with file size limits
import React, { useState, useEffect } from 'react';
import { maxUploadMb, uploadLimitLabel } from '@/lib/uploadLimits';
import { backendApi } from '@/api/meldraClient';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { generateDownloadFilename } from '@/utils/fileNaming';
import {
  FileSpreadsheet, FileText, Download, Upload,
  Loader2, CheckCircle, AlertCircle, Sparkles,
  Image as ImageIcon, BarChart3, Table, Zap, PieChart, TrendingUp, Lock
} from 'lucide-react';

const DESIGN_KEY = 'meldra.pptDesign';
const THEMES = [
  { id: 'light', label: 'Light', bg: '#FFFFFF', accent: '#2563EB' },
  { id: 'dark', label: 'Dark', bg: '#0F172A', accent: '#38BDF8' },
  { id: 'corporate', label: 'Corporate', bg: '#FFFFFF', accent: '#0B3D91' },
  { id: 'warm', label: 'Warm', bg: '#FFFBF5', accent: '#C2410C' },
  { id: 'green', label: 'Green', bg: '#F8FBF8', accent: '#15803D' },
];
const FONTS = ['Calibri', 'Arial', 'Segoe UI', 'Verdana', 'Tahoma', 'Trebuchet MS', 'Georgia', 'Times New Roman', 'Garamond', 'Aptos'];

// The design choice is remembered in this browser only; the logo is sent with each conversion and never stored.
const loadDesign = () => {
  try {
    return { theme: 'light', brandColor: '', font: 'Calibri', company: '', ...JSON.parse(localStorage.getItem(DESIGN_KEY) || '{}') };
  } catch {
    return { theme: 'light', brandColor: '', font: 'Calibri', company: '' };
  }
};

export default function FileToPPT() {
  const [design, setDesign] = useState(loadDesign);
  const [logoFile, setLogoFile] = useState(null);
  const [file, setFile] = useState(null);
  const [converting, setConverting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [fileType, setFileType] = useState('');
  const [progressMessage, setProgressMessage] = useState('');
  const [user, setUser] = useState(null);
  const [subscription, setSubscription] = useState(null);

  useEffect(() => {
    try { localStorage.setItem(DESIGN_KEY, JSON.stringify(design)); } catch { /* storage unavailable */ }
  }, [design]);

  const updateDesign = (patch) => setDesign((d) => ({ ...d, ...patch }));

  const handleLogo = (e) => {
    const f = e.target.files?.[0];
    if (!f) { setLogoFile(null); return; }
    if (!/^image\/(png|jpeg|gif|bmp|webp)$/.test(f.type) || f.size > 2 * 1024 * 1024) {
      setError('Logo must be a PNG, JPG, GIF, BMP or WebP image of 2 MB or less.');
      e.target.value = '';
      return;
    }
    setError('');
    setLogoFile(f);
  };

  // Load required libraries and user data
  useEffect(() => {
    loadUserAndSubscription();

    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/pptxgenjs@3.12.0/dist/pptxgen.bundle.js';
    script.async = true;
    document.body.appendChild(script);

    const xlsxScript = document.createElement('script');
    xlsxScript.src = 'https://cdn.sheetjs.com/xlsx-0.20.1/package/dist/xlsx.full.min.js';
    xlsxScript.async = true;
    document.body.appendChild(xlsxScript);

    const pdfScript = document.createElement('script');
    pdfScript.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
    pdfScript.async = true;
    document.body.appendChild(pdfScript);

    return () => {
      document.body.removeChild(script);
      document.body.removeChild(xlsxScript);
      document.body.removeChild(pdfScript);
    };
  }, []);

  const loadUserAndSubscription = async () => {
    try {
      const currentUser = await backendApi.auth.me();
      setUser(currentUser);

      const subscription = await backendApi.subscriptions.getMy();
      if (subscription) {
        setSubscription(subscription);
      }
    } catch (error) {
      console.error('Error loading user or subscription:', error);
      // Handle cases where user is not logged in or subscription not found gracefully
      setUser(null);
      setSubscription(null);
    }
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;

    const ext = selectedFile.name.split('.').pop().toLowerCase();

    const validExts = ['xlsx', 'xls', 'csv', 'pdf'];
    if (!validExts.includes(ext)) {
      setError('Please select Excel (.xlsx, .xls, .csv) or PDF file');
      e.target.value = ''; // Clear file input
      return;
    }

    // ENFORCE FILE SIZE LIMIT
    const fileSizeMB = selectedFile.size / (1024 * 1024);
    const maxSize = maxUploadMb(subscription);

    if (fileSizeMB > maxSize) {
      setError(`File size (${fileSizeMB.toFixed(1)}MB) exceeds your ${maxSize}MB limit. ${maxSize === 10 ? 'Upgrade to Premium for files up to 500MB!' : ''}`);
      e.target.value = ''; // Clear file input
      return;
    }

    setFile(selectedFile);
    setFileType(ext);
    setError('');
    setResult(null);
  };

  const handleConvert = async () => {
    if (!file) return;

    // DOUBLE CHECK FILE SIZE BEFORE CONVERSION
    const fileSizeMB = file.size / (1024 * 1024);
    const maxSize = maxUploadMb(subscription);

    if (fileSizeMB > maxSize) {
      setError(`File size (${fileSizeMB.toFixed(1)}MB) exceeds your ${maxSize}MB limit. Please upgrade to Premium.`);
      return;
    }

    setConverting(true);
    setProgress(10);
    setError('');
    setProgressMessage('Starting conversion...');

    try {
      if (fileType === 'pdf') {
        await convertPDFtoPPT(file);
      } else {
        await convertExcelToPPT(file);
      }
    } catch (err) {
      console.error('Conversion error:', err);
      setError(err.message || 'Conversion failed. Please try again.');
    } finally {
      setConverting(false);
      setProgress(0);
      setProgressMessage('');
    }
  };

  // ADVANCED Excel to PPT conversion
  const convertExcelToPPT = async (file) => {
    try {
      setProgress(20);
      setProgressMessage('Uploading spreadsheet...');

      setProgress(40);
      setProgressMessage('Converting spreadsheet (server-side)...');

      const blob = await backendApi.files.excelToPpt(file, { design: { ...design, logo: logoFile } });

      setProgress(85);
      setProgressMessage('Downloading PowerPoint...');

      const fileName = generateDownloadFilename(file.name || 'presentation.xlsx', '.pptx');

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);

      setProgress(100);
      setProgressMessage('Complete!');
      setResult({
        success: true,
        fileName: fileName,
        slidesCreated: null,
        chartsCreated: null,
        message: 'PowerPoint created successfully!'
      });
    } catch (err) {
      throw new Error('Excel processing failed: ' + (err?.message || String(err)));
    }
  };

  // Helper function to analyze columns
  const analyzeColumns = (headers, dataRows) => {
    return headers.map((header, idx) => {
      const values = dataRows.map(row => row[idx]).filter(v => v !== '' && v !== null && v !== undefined);
      const numericValues = values.filter(v => !isNaN(parseFloat(v)));
      const isNumeric = numericValues.length > values.length * 0.7;

      let avgValue = 0;
      if (isNumeric && numericValues.length > 0) {
        avgValue = numericValues.reduce((sum, v) => sum + parseFloat(v), 0) / numericValues.length;
      }

      // Detect if column looks like an ID (avoid using for charts)
      const looksLikeID = /id|key|index|position/i.test(header) || (isNumeric && avgValue > 10000);

      return {
        index: idx,
        header: header,
        isNumeric: isNumeric && !looksLikeID,
        uniqueCount: new Set(values).size,
        avgValue: avgValue,
        sampleValue: values[0],
        looksLikeID: looksLikeID
      };
    });
  };

  // PDF to PPT Conversion (unchanged)
  const convertPDFtoPPT = async (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = async (e) => {
        try {
          setProgress(30);
          setProgressMessage('Loading PDF...');

          const typedarray = new Uint8Array(e.target.result);
          const pdf = await window.pdfjsLib.getDocument(typedarray).promise;

          setProgress(40);

          const pptx = new window.PptxGenJS();
          pptx.layout = 'LAYOUT_16x9';
          pptx.author = 'InsightSheet-lite';
          pptx.title = file.name.replace(/\.[^/.]+$/, '');

          const totalPages = pdf.numPages;

          for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
            setProgressMessage(`Converting page ${pageNum}/${totalPages}...`);

            const page = await pdf.getPage(pageNum);
            const viewport = page.getViewport({ scale: 2.0 });

            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            canvas.width = viewport.width;
            canvas.height = viewport.height;

            await page.render({
              canvasContext: context,
              viewport: viewport
            }).promise;

            const imageData = canvas.toDataURL('image/png');

            const slide = pptx.addSlide();
            slide.background = { color: 'FFFFFF' };
            slide.addImage({
              data: imageData,
              x: 0.5, y: 0.5, w: 9, h: 6,
              sizing: { type: 'contain', w: 9, h: 6 }
            });

            setProgress(40 + (50 * pageNum / totalPages));
          }

          setProgress(95);
          setProgressMessage('Saving PowerPoint...');

          const fileName = generateDownloadFilename(file.name || 'presentation.pdf', '.pptx');
          await pptx.writeFile({ fileName });

          setProgress(100);
          setResult({
            success: true,
            fileName: fileName,
            slidesCreated: totalPages,
            chartsCreated: 0,
            message: 'PowerPoint created successfully!'
          });

          resolve();
        } catch (err) {
          reject(new Error('PDF processing failed: ' + err.message));
        }
      };

      reader.onerror = () => reject(new Error('File reading failed'));
      reader.readAsArrayBuffer(file);
    });
  };

  const handleReset = () => {
    setFile(null);
    setResult(null);
    setError('');
    setProgress(0);
    setProgressMessage('');
    const fileInput = document.getElementById('fileInput');
    if (fileInput) fileInput.value = '';
  };

  const maxSize = maxUploadMb(subscription);

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 py-12">
      <div className="container mx-auto px-4 max-w-4xl">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 bg-[#4169E1] rounded-2xl flex items-center justify-center shadow-lg">
              <FileText className="w-10 h-10 text-white" />
            </div>
          </div>

          <h1 className="text-5xl font-bold text-slate-900 dark:text-white mb-4">
            Advanced Excel to PowerPoint
          </h1>
          <p className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-4">
            Professional presentations with charts, tables & statistics
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Badge className="bg-[#065f46] text-white border border-[#065f46] font-bold">
              <BarChart3 className="w-4 h-4 mr-1" />
              Multiple Charts
            </Badge>
            <Badge className="bg-[#9d174d] text-white border border-[#9d174d] font-bold">
              <Table className="w-4 h-4 mr-1" />
              Data Tables
            </Badge>
            <Badge className="bg-emerald-100 dark:bg-emerald-900/40 border-2 border-[#065f46] text-[#0d0d0f] dark:text-white font-bold">
              <TrendingUp className="w-4 h-4 mr-1" />
              Statistics
            </Badge>
            <Badge className="bg-pink-100 dark:bg-pink-900/30 border-2 border-[#9d174d] text-[#0d0d0f] dark:text-white font-bold">
              <PieChart className="w-4 h-4 mr-1" />
              Bar/Line/Pie
            </Badge>
          </div>
        </div>

        {/* FILE SIZE LIMIT WARNING */}
        <Alert className={`mb-6 ${subscription?.plan === 'premium' ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-amber-500/10 border-amber-500/30'}`}>
          <Lock className={`h-5 w-5 ${subscription?.plan === 'premium' ? 'text-emerald-400' : 'text-amber-400'}`} />
          <AlertDescription className="text-slate-900 dark:text-slate-100">
            <strong className="text-slate-900 dark:text-white font-bold">
              {!Number.isFinite(maxSize) ? '✨ No file size limit' : subscription?.plan === 'premium' ? `✨ Premium: Up to ${maxSize}MB files` : `⚠️ File Size Limit: ${maxSize}MB (Free Plan)`}
            </strong>
            <br />
            <span className="text-sm text-slate-900 dark:text-slate-200 font-bold">
              {subscription?.plan === 'premium'
                ? 'You can convert files up to 500MB with your Premium plan.'
                : 'Free plan limited to 10MB files. Upgrade to Premium for larger file conversions!'}
            </span>
          </AlertDescription>
        </Alert>

        {/* Features */}
        <Alert className="mb-6 bg-emerald-500/10 border-emerald-500/30">
          <Sparkles className="h-5 w-5 text-emerald-400" />
          <AlertDescription className="text-slate-900 dark:text-slate-100">
            <strong className="text-slate-900 dark:text-white font-bold">✨ Advanced Conversion Features:</strong>
            <ul className="list-disc ml-5 mt-2 space-y-1 text-base text-slate-900 dark:text-slate-200 font-bold">
              <li><strong>Section Slides:</strong> Overview for each worksheet</li>
              <li><strong>Data Tables:</strong> Full data display (up to 20 rows)</li>
              <li><strong>Multiple Charts:</strong> Bar, Line, and Pie charts for your data</li>
              <li><strong>Statistics:</strong> Average, Min, Max, Standard Deviation</li>
              <li><strong>Smart Column Selection:</strong> Automatically picks best data (no IDs)</li>
              <li><strong>Professional Layout:</strong> Clean design, color-coded</li>
            </ul>
          </AlertDescription>
        </Alert>

        {/* Upload Area */}
        {!file && (
          <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-12 mb-6">
            <label className="flex flex-col items-center justify-center cursor-pointer">
              <input
                type="file"
                id="fileInput"
                accept=".xlsx,.xls,.csv,.pdf"
                onChange={handleFileChange}
                className="hidden"
                disabled={converting}
              />
              <div className="text-center">
                <div className="w-20 h-20 bg-[#4169E1] rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                  <Upload className="w-10 h-10 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-2">
                  Upload Excel or PDF File
                </h3>
                <p className="text-slate-200 font-semibold mb-2 text-base">
                  Click to select file or drag & drop
                </p>
                <p className="text-slate-300 font-medium text-base mb-4">
                  Max {uploadLimitLabel(maxSize)} {subscription?.plan !== 'premium' && '(Free Plan)'}
                </p>
                <div className="flex flex-wrap justify-center gap-2">
                  <Badge variant="outline" className="border-blue-400 text-blue-300 font-semibold">
                    .XLSX
                  </Badge>
                  <Badge variant="outline" className="border-blue-400 text-blue-300 font-semibold">
                    .XLS
                  </Badge>
                  <Badge variant="outline" className="border-blue-400 text-blue-300 font-semibold">
                    .CSV
                  </Badge>
                  <Badge variant="outline" className="border-blue-400 text-blue-300 font-semibold">
                    .PDF
                  </Badge>
                </div>
              </div>
            </label>
          </div>
        )}

        {/* File Info & Convert */}
        {file && !result && (
          <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <FileSpreadsheet className="w-8 h-8 text-[#4169E1]" />
                <div>
                  <p className="text-white font-semibold">{file.name}</p>
                  <p className="text-slate-400 text-sm">
                    {(file.size / 1024 / 1024).toFixed(2)} MB • {fileType.toUpperCase()}
                    {subscription?.plan !== 'premium' && (file.size / (1024 * 1024)) > 5 && (
                      <span className="ml-2 text-amber-400">⚠️ Large file for free plan</span>
                    )}
                  </p>
                </div>
              </div>
              {!converting && (
                <Button onClick={handleReset} variant="outline" size="sm">
                  Remove
                </Button>
              )}
            </div>

            {fileType !== 'pdf' && (
              <div className="mb-4 rounded-xl border border-slate-700/60 bg-slate-800/40 p-4">
                <p className="text-white font-semibold mb-3">Presentation design</p>
                <div className="flex flex-wrap gap-2 mb-4" role="radiogroup" aria-label="Theme">
                  {THEMES.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      role="radio"
                      aria-checked={design.theme === t.id}
                      onClick={() => updateDesign({ theme: t.id })}
                      className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm ${design.theme === t.id ? 'border-[#4169E1] ring-2 ring-[#4169E1]/40 text-white' : 'border-slate-600 text-slate-300'}`}
                    >
                      <span className="inline-block h-4 w-6 rounded border border-slate-500" style={{ background: `linear-gradient(90deg, ${t.bg} 60%, ${design.brandColor || t.accent} 60%)` }} />
                      {t.label}
                    </button>
                  ))}
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="text-sm text-slate-300">
                    Brand colour
                    <div className="mt-1 flex items-center gap-2">
                      <input
                        type="color"
                        value={design.brandColor || THEMES.find((t) => t.id === design.theme)?.accent || '#2563EB'}
                        onChange={(e) => updateDesign({ brandColor: e.target.value })}
                        className="h-9 w-12 rounded border border-slate-600 bg-transparent"
                        aria-label="Brand colour"
                      />
                      {design.brandColor && (
                        <button type="button" className="text-xs text-slate-400 underline" onClick={() => updateDesign({ brandColor: '' })}>
                          Use theme colour
                        </button>
                      )}
                    </div>
                  </label>
                  <label className="text-sm text-slate-300">
                    Font
                    <select
                      value={design.font}
                      onChange={(e) => updateDesign({ font: e.target.value })}
                      className="mt-1 block w-full rounded border border-slate-600 bg-slate-900 px-2 py-2 text-white"
                    >
                      {FONTS.map((f) => <option key={f} value={f}>{f}</option>)}
                    </select>
                  </label>
                  <label className="text-sm text-slate-300">
                    Company name (footer)
                    <input
                      type="text"
                      maxLength={120}
                      value={design.company}
                      onChange={(e) => updateDesign({ company: e.target.value })}
                      placeholder="e.g. Acme Ltd"
                      className="mt-1 block w-full rounded border border-slate-600 bg-slate-900 px-2 py-2 text-white"
                    />
                  </label>
                  <label className="text-sm text-slate-300">
                    Logo (PNG or JPG, up to 2 MB)
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/gif,image/bmp,image/webp"
                      onChange={handleLogo}
                      className="mt-1 block w-full text-slate-300 file:mr-3 file:rounded file:border-0 file:bg-slate-700 file:px-3 file:py-2 file:text-white"
                    />
                  </label>
                </div>
                <p className="mt-3 text-xs text-slate-400">Charts keep their exact Excel look. The design applies to backgrounds, headings, tables and cover slides.</p>
              </div>
            )}

            {progress > 0 && (
              <div className="mb-4">
                <div className="flex justify-between text-sm text-slate-400 mb-2">
                  <span>{progressMessage}</span>
                  <span>{progress}%</span>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-3">
                  <div
                    className="bg-gradient-to-r from-[#4169E1] to-emerald-600 h-3 rounded-full transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            )}

            {error && (
              <Alert className="mb-4 bg-red-500/10 border-red-500/30">
                <AlertCircle className="h-4 w-4 text-red-400" />
                <AlertDescription className="text-red-300">
                  {error}
                </AlertDescription>
              </Alert>
            )}

            <Button
              onClick={handleConvert}
              disabled={converting || !!error}
              className="w-full bg-gradient-to-r from-[#4169E1] to-emerald-600 hover:from-[#3659c7] hover:to-emerald-500 text-white font-bold py-3"
            >
              {converting ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Converting to PowerPoint...
                </>
              ) : (
                <>
                  <Zap className="w-5 h-5 mr-2" />
                  Convert to PowerPoint
                </>
              )}
            </Button>
          </div>
        )}

        {/* Success Result */}
        {result && (
          <div className="bg-slate-900/80 backdrop-blur-xl border border-emerald-500/30 rounded-2xl p-8 text-center">
            <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-10 h-10 text-emerald-400" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">
              ✅ Conversion Successful!
            </h2>
            <p className="text-slate-300 mb-6">
              {result.message}
            </p>
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-slate-800/50 rounded-lg p-4">
                <p className="text-slate-400 text-sm">File Created</p>
                <p className="text-white font-semibold text-sm">{result.fileName}</p>
              </div>
              <div className="bg-slate-800/50 rounded-lg p-4">
                <p className="text-slate-400 text-sm">Slides Created</p>
                <p className="text-white font-semibold text-2xl">{result.slidesCreated}</p>
              </div>
              {result.chartsCreated > 0 && (
                <>
                  <div className="bg-slate-800/50 rounded-lg p-4">
                    <p className="text-slate-400 text-base">Charts Created</p>
                    <p className="text-[#4169E1] font-semibold text-2xl">{result.chartsCreated}</p>
                  </div>
                  <div className="bg-slate-800/50 rounded-lg p-4">
                    <p className="text-slate-400 text-base">Chart Types</p>
                    <p className="text-[#4169E1] font-semibold">Bar, Line, Pie</p>
                  </div>
                </>
              )}
            </div>
            <div className="flex gap-3">
              <Button
                onClick={handleReset}
                className="flex-1 bg-gradient-to-r from-[#4169E1] to-emerald-600 font-semibold"
              >
                Convert Another File
              </Button>
            </div>
            <p className="text-sm text-slate-500 mt-4">
              PowerPoint file downloaded to your computer
            </p>
          </div>
        )}

        {/* How it Works */}
        <div className="mt-12 bg-slate-900/80 backdrop-blur-xl rounded-xl p-6 border border-slate-700/50">
          <h3 className="text-lg font-bold text-white mb-4">📊 What Gets Created</h3>
          <div className="space-y-3 text-base">
            <div className="flex gap-3">
              <span className="font-bold text-[#4169E1]">1️⃣</span>
              <div>
                <strong className="text-white">Title Slide:</strong>
                <p className="text-slate-200 font-medium">Professional cover page with file name and timestamp</p>
              </div>
            </div>

            <div className="flex gap-3">
              <span className="font-bold text-[#4169E1]">2️⃣</span>
              <div>
                <strong className="text-white">Section Slide (per worksheet):</strong>
                <p className="text-slate-200 font-medium">Overview showing chart count, row count, and column count</p>
              </div>
            </div>

            <div className="flex gap-3">
              <span className="font-bold text-[#4169E1]">3️⃣</span>
              <div>
                <strong className="text-white">Data Table Slide:</strong>
                <p className="text-slate-200 font-medium">Full data display (up to 20 rows × 10 columns)</p>
              </div>
            </div>

            <div className="flex gap-3">
              <span className="font-bold text-blue-400">4️⃣</span>
              <div>
                <strong className="text-white">Chart Slides (up to 3 per sheet):</strong>
                <p className="text-slate-200 font-medium">Bar, Line, and Pie charts with data tables below</p>
              </div>
            </div>

            <div className="flex gap-3">
              <span className="font-bold text-[#4169E1]">5️⃣</span>
              <div>
                <strong className="text-white">Statistics Slide:</strong>
                <p className="text-slate-200 font-medium">Average, Min, Max, Standard Deviation for numeric columns</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
