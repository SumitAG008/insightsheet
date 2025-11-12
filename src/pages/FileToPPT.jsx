
// pages/FileToPPT.jsx - Advanced Excel to PowerPoint converter (browser-based) with file size limits
import React, { useState, useEffect } from 'react';
import { backendApi } from '@/api/meldraClient';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  FileSpreadsheet, FileText, Download, Upload,
  Loader2, CheckCircle, AlertCircle, Sparkles,
  Image as ImageIcon, BarChart3, Table, Zap, PieChart, TrendingUp, Lock
} from 'lucide-react';

export default function FileToPPT() {
  const [file, setFile] = useState(null);
  const [converting, setConverting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [fileType, setFileType] = useState('');
  const [progressMessage, setProgressMessage] = useState('');
  const [user, setUser] = useState(null);
  const [subscription, setSubscription] = useState(null);

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
    const maxSize = (subscription && subscription.plan === 'premium') ? 500 : 10;

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
    const maxSize = (subscription && subscription.plan === 'premium') ? 500 : 10;

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

  // HIGH-QUALITY Excel to PPT conversion using backend API
  // Uses Windows COM for 95% accuracy when available!
  const convertExcelToPPT = async (file) => {
    try {
      setProgress(20);
      setProgressMessage('Uploading Excel file to server...');

      setProgress(40);
      setProgressMessage('Converting with high-quality chart extraction...');

      // Call backend API for conversion (Windows COM on Windows, openpyxl elsewhere)
      const pptBlob = await backendApi.files.excelToPpt(file);

      setProgress(80);
      setProgressMessage('Conversion complete! Preparing download...');

      // Create download link
      const url = URL.createObjectURL(pptBlob);
      const link = document.createElement('a');
      link.href = url;
      const fileName = file.name.replace(/\.(xlsx|xls|csv)$/i, '_presentation.pptx');
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setProgress(100);
      setProgressMessage('Download started!');
      setResult({
        success: true,
        fileName: fileName,
        message: 'PowerPoint created successfully with high-quality charts!'
      });
    } catch (err) {
      console.error('Conversion error:', err);
      throw new Error(err.message || 'Excel conversion failed. Please try again.');
    }
  };

  // PDF to PPT Conversion
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

          const fileName = file.name.replace(/\.[^/.]+$/, '') + '.pptx';
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

  const maxSize = (subscription && subscription.plan === 'premium') ? 500 : 10;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-blue-100 py-12">
      <div className="container mx-auto px-4 max-w-4xl">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center shadow-2xl shadow-blue-500/50">
              <FileText className="w-10 h-10 text-white" />
            </div>
          </div>

          <h1 className="text-5xl font-bold text-blue-900 mb-4">
            Advanced Excel to PowerPoint
          </h1>
          <p className="text-xl text-blue-700 mb-4">
            Professional presentations with charts, tables & statistics
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Badge className="bg-blue-100 text-blue-700 border-blue-200">
              <BarChart3 className="w-4 h-4 mr-1" />
              Multiple Charts
            </Badge>
            <Badge className="bg-indigo-100 text-indigo-700 border-indigo-200">
              <Table className="w-4 h-4 mr-1" />
              Data Tables
            </Badge>
            <Badge className="bg-green-500/20 text-green-300 border-green-500/30">
              <TrendingUp className="w-4 h-4 mr-1" />
              Statistics
            </Badge>
            <Badge className="bg-blue-100 text-blue-700 border-blue-200">
              <PieChart className="w-4 h-4 mr-1" />
              Bar/Line/Pie
            </Badge>
          </div>
        </div>

        {/* FILE SIZE LIMIT WARNING */}
        <Alert className={`mb-6 ${subscription?.plan === 'premium' ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-amber-500/10 border-amber-500/30'}`}>
          <Lock className={`h-5 w-5 ${subscription?.plan === 'premium' ? 'text-emerald-400' : 'text-amber-400'}`} />
          <AlertDescription className="text-slate-300">
            <strong className={subscription?.plan === 'premium' ? 'text-emerald-300' : 'text-amber-300'}>
              {subscription?.plan === 'premium' ? '✨ Premium: Up to 500MB files' : `⚠️ File Size Limit: ${maxSize}MB (Free Plan)`}
            </strong>
            <br />
            <span className="text-sm">
              {subscription?.plan === 'premium'
                ? 'You can convert files up to 500MB with your Premium plan.'
                : 'Free plan limited to 10MB files. Upgrade to Premium for larger file conversions!'}
            </span>
          </AlertDescription>
        </Alert>

        {/* Features */}
        <Alert className="mb-6 bg-emerald-500/10 border-emerald-500/30">
          <Sparkles className="h-5 w-5 text-emerald-400" />
          <AlertDescription className="text-slate-300">
            <strong className="text-emerald-300">✨ Advanced Conversion Features:</strong>
            <ul className="list-disc ml-5 mt-2 space-y-1 text-sm">
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
                <div className="w-20 h-20 bg-gradient-to-br from-purple-600 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Upload className="w-10 h-10 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-2">
                  Upload Excel or PDF File
                </h3>
                <p className="text-slate-400 mb-2">
                  Click to select file or drag & drop
                </p>
                <p className="text-slate-500 text-sm mb-4">
                  Max {maxSize}MB {subscription?.plan !== 'premium' && '(Free Plan)'}
                </p>
                <div className="flex flex-wrap justify-center gap-2">
                  <Badge variant="outline" className="border-purple-500/50 text-purple-300">
                    .XLSX
                  </Badge>
                  <Badge variant="outline" className="border-purple-500/50 text-purple-300">
                    .XLS
                  </Badge>
                  <Badge variant="outline" className="border-purple-500/50 text-purple-300">
                    .CSV
                  </Badge>
                  <Badge variant="outline" className="border-purple-500/50 text-purple-300">
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
                <FileSpreadsheet className="w-8 h-8 text-purple-400" />
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

            {progress > 0 && (
              <div className="mb-4">
                <div className="flex justify-between text-sm text-slate-400 mb-2">
                  <span>{progressMessage}</span>
                  <span>{progress}%</span>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-3">
                  <div
                    className="bg-gradient-to-r from-purple-600 to-pink-600 h-3 rounded-full transition-all duration-300"
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
              className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold py-3"
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
                    <p className="text-slate-400 text-sm">Charts Created</p>
                    <p className="text-purple-400 font-semibold text-2xl">{result.chartsCreated}</p>
                  </div>
                  <div className="bg-slate-800/50 rounded-lg p-4">
                    <p className="text-slate-400 text-sm">Chart Types</p>
                    <p className="text-purple-400 font-semibold text-sm">Bar, Line, Pie</p>
                  </div>
                </>
              )}
            </div>
            <div className="flex gap-3">
              <Button
                onClick={handleReset}
                className="flex-1 bg-gradient-to-r from-purple-600 to-indigo-600"
              >
                Convert Another File
              </Button>
            </div>
            <p className="text-xs text-slate-500 mt-4">
              PowerPoint file downloaded to your computer
            </p>
          </div>
        )}

        {/* How it Works */}
        <div className="mt-12 bg-slate-900/50 rounded-xl p-6 border border-slate-700/30">
          <h3 className="text-lg font-bold text-white mb-4">📊 What Gets Created</h3>
          <div className="space-y-3 text-sm text-slate-300">
            <div className="flex gap-3">
              <span className="font-bold text-purple-400">1️⃣</span>
              <div>
                <strong className="text-white">Title Slide:</strong>
                <p>Professional cover page with file name and timestamp</p>
              </div>
            </div>

            <div className="flex gap-3">
              <span className="font-bold text-purple-400">2️⃣</span>
              <div>
                <strong className="text-white">Section Slide (per worksheet):</strong>
                <p>Overview showing chart count, row count, and column count</p>
              </div>
            </div>

            <div className="flex gap-3">
              <span className="font-bold text-purple-400">3️⃣</span>
              <div>
                <strong className="text-white">Data Table Slide:</strong>
                <p>Full data display (up to 20 rows × 10 columns)</p>
              </div>
            </div>

            <div className="flex gap-3">
              <span className="font-bold text-purple-400">4️⃣</span>
              <div>
                <strong className="text-white">Chart Slides (up to 3 per sheet):</strong>
                <p>Bar, Line, and Pie charts with data tables below</p>
              </div>
            </div>

            <div className="flex gap-3">
              <span className="font-bold text-purple-400">5️⃣</span>
              <div>
                <strong className="text-white">Statistics Slide:</strong>
                <p>Average, Min, Max, Standard Deviation for numeric columns</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
