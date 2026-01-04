
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

  // ADVANCED Excel to PPT conversion
  const convertExcelToPPT = async (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = async (e) => {
        try {
          setProgress(20);
          setProgressMessage('Reading Excel file...');

          const data = new Uint8Array(e.target.result);
          const workbook = window.XLSX.read(data, { type: 'array' });

          setProgress(30);
          setProgressMessage('Creating PowerPoint...');

          const pptx = new window.PptxGenJS();
          pptx.layout = 'LAYOUT_16x9';
          pptx.author = 'InsightSheet-lite';
          pptx.title = file.name.replace(/\.[^/.]+$/, '');
          pptx.subject = 'Generated from Excel';

          // Title Slide
          const titleSlide = pptx.addSlide();
          titleSlide.background = { color: '1E293B' };
          titleSlide.addText('Excel Charts & Data Presentation', {
            x: 0.5, y: 2, w: 9, h: 1,
            fontSize: 40, bold: true, color: 'FFFFFF', align: 'center'
          });
          titleSlide.addText(file.name.replace(/\.[^/.]+$/, ''), {
            x: 0.5, y: 3.2, w: 9, h: 0.6,
            fontSize: 24, color: 'A78BFA', align: 'center'
          });
          titleSlide.addText(`Generated by InsightSheet-lite\n${new Date().toLocaleString()}`, {
            x: 0.5, y: 4, w: 9, h: 0.8,
            fontSize: 14, color: '94A3B8', align: 'center'
          });

          setProgress(40);
          let totalSlides = 1;
          let totalCharts = 0;

          // Process each sheet
          for (let sheetIdx = 0; sheetIdx < workbook.SheetNames.length; sheetIdx++) {
            const sheetName = workbook.SheetNames[sheetIdx];
            setProgressMessage(`Processing sheet: ${sheetName}...`);

            const worksheet = workbook.Sheets[sheetName];
            const jsonData = window.XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

            if (jsonData.length === 0) continue;

            const headers = jsonData[0].filter(h => h !== '');
            const dataRows = jsonData.slice(1).filter(row => row.some(cell => cell !== ''));

            if (headers.length === 0 || dataRows.length === 0) continue;

            // Analyze columns
            const columnAnalysis = analyzeColumns(headers, dataRows);
            const numericColumns = columnAnalysis.filter(c => c.isNumeric);
            const categoricalColumns = columnAnalysis.filter(c => !c.isNumeric && c.uniqueCount > 1 && c.uniqueCount <= 20);

            const chartCount = (categoricalColumns.length > 0 && numericColumns.length > 0) ? Math.min(3, numericColumns.length) : 0;

            // SECTION SLIDE for this sheet
            const sectionSlide = pptx.addSlide();
            sectionSlide.background = { color: '334155' };
            sectionSlide.addText(sheetName, {
              x: 0.5, y: 2.5, w: 9, h: 1,
              fontSize: 48, bold: true, color: 'FFFFFF', align: 'center'
            });
            sectionSlide.addText(`${chartCount} chart(s) • ${dataRows.length} rows • ${headers.length} columns`, {
              x: 0.5, y: 3.8, w: 9, h: 0.5,
              fontSize: 20, color: 'A78BFA', align: 'center'
            });
            totalSlides++;

            // CREATE DATA TABLE SLIDE
            const dataSlide = pptx.addSlide();
            dataSlide.background = { color: 'FFFFFF' };
            dataSlide.addText(`${sheetName} - Data Overview`, {
              x: 0.5, y: 0.3, w: 9, h: 0.5,
              fontSize: 28, bold: true, color: '1E293B'
            });

            const maxCols = Math.min(headers.length, 10);
            const maxRows = Math.min(dataRows.length, 20);

            const tableData = [headers.slice(0, maxCols).map(h => String(h))];
            for (let i = 0; i < maxRows; i++) {
              tableData.push(dataRows[i].slice(0, maxCols).map(v => String(v || '')));
            }

            dataSlide.addTable(tableData, {
              x: 0.4, y: 1, w: 9.2, h: 5.5,
              fontSize: 9,
              border: { pt: 0.5, color: 'CCCCCC' },
              fill: { color: 'F8FAFC' },
              color: '1E293B',
              align: 'left',
              valign: 'middle',
              rowH: Array(tableData.length).fill(5.5 / tableData.length),
              colW: Array(maxCols).fill(9.2 / maxCols)
            });

            if (dataRows.length > maxRows) {
              dataSlide.addText(`Showing ${maxRows} of ${dataRows.length} rows`, {
                x: 0.4, y: 6.6, w: 9.2, h: 0.3,
                fontSize: 10, color: '64748B', italic: true
              });
            }

            totalSlides++;

            // CREATE CHART SLIDES (Multiple chart types)
            if (categoricalColumns.length > 0 && numericColumns.length > 0) {
              const labelCol = categoricalColumns[0].index;
              const chartTypes = [
                { type: pptx.ChartType.bar, name: 'Bar Chart' },
                { type: pptx.ChartType.line, name: 'Line Chart' },
                { type: pptx.ChartType.pie, name: 'Pie Chart' }
              ];

              for (let chartIdx = 0; chartIdx < Math.min(3, numericColumns.length); chartIdx++) {
                const valueCol = numericColumns[chartIdx].index;
                const chartType = chartTypes[chartIdx % chartTypes.length];

                // Create chart slide
                const chartSlide = pptx.addSlide();
                chartSlide.background = { color: 'FFFFFF' };
                chartSlide.addText(`${sheetName} - ${chartType.name} (${chartIdx + 1}/${Math.min(3, numericColumns.length)})`, {
                  x: 0.5, y: 0.3, w: 9, h: 0.5,
                  fontSize: 24, bold: true, color: '1E293B'
                });

                // Prepare chart data
                const chartDataMap = {};
                dataRows.slice(0, 50).forEach(row => {
                  const label = String(row[labelCol] || 'Unknown').substring(0, 30);
                  const value = parseFloat(row[valueCol]) || 0;

                  if (!chartDataMap[label]) {
                    chartDataMap[label] = { sum: 0, count: 0 };
                  }
                  chartDataMap[label].sum += value;
                  chartDataMap[label].count += 1;
                });

                const chartEntries = Object.entries(chartDataMap)
                  .map(([label, data]) => ({
                    label: label,
                    value: Math.round(data.sum / data.count * 100) / 100
                  }))
                  .sort((a, b) => b.value - a.value)
                  .slice(0, 15);

                if (chartEntries.length > 0) {
                  chartSlide.addChart(chartType.type, [
                    {
                      name: headers[valueCol] || 'Values',
                      labels: chartEntries.map(e => e.label),
                      values: chartEntries.map(e => e.value)
                    }
                  ], {
                    x: 0.5, y: 1.0, w: 9, h: 4.5,
                    showTitle: true,
                    title: `${headers[labelCol]} vs ${headers[valueCol]}`,
                    titleFontSize: 18,
                    chartColors: ['6366F1', '8B5CF6', 'EC4899', '10B981', 'F59E0B', '14B8A6'],
                    showValue: true,
                    showLegend: chartType.type === pptx.ChartType.pie,
                    valAxisMaxVal: chartType.type !== pptx.ChartType.pie ? Math.max(...chartEntries.map(e => e.value)) * 1.1 : undefined,
                    catAxisLabelFontSize: 10,
                    valAxisLabelFontSize: 10
                  });

                  // Add data table below chart
                  const chartTableData = [['Category', 'Value']];
                  chartEntries.slice(0, 8).forEach(entry => {
                    chartTableData.push([entry.label, entry.value.toString()]);
                  });

                  chartSlide.addTable(chartTableData, {
                    x: 0.5, y: 5.7, w: 4, h: 1.3,
                    fontSize: 9,
                    border: { pt: 0.5, color: 'CCCCCC' },
                    fill: { color: 'F8FAFC' },
                    color: '1E293B',
                    align: 'center',
                    valign: 'middle'
                  });

                  totalSlides++;
                  totalCharts++;
                }
              }
            }

            // CREATE STATISTICS SLIDE
            if (numericColumns.length > 0) {
              const statsSlide = pptx.addSlide();
              statsSlide.background = { color: 'FFFFFF' };
              statsSlide.addText(`${sheetName} - Statistical Summary`, {
                x: 0.5, y: 0.3, w: 9, h: 0.5,
                fontSize: 28, bold: true, color: '1E293B'
              });

              const statsTable = [['Column', 'Average', 'Min', 'Max', 'Std Dev', 'Count']];

              numericColumns.slice(0, 10).forEach(col => {
                const values = dataRows
                  .map(row => parseFloat(row[col.index]))
                  .filter(v => !isNaN(v));

                if (values.length > 0) {
                  const avg = (values.reduce((a, b) => a + b, 0) / values.length).toFixed(2);
                  const min = Math.min(...values).toFixed(2);
                  const max = Math.max(...values).toFixed(2);

                  // Calculate standard deviation
                  const mean = values.reduce((a, b) => a + b, 0) / values.length;
                  const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
                  const stdDev = Math.sqrt(variance).toFixed(2);

                  statsTable.push([
                    col.header.substring(0, 25),
                    avg,
                    min,
                    max,
                    stdDev,
                    values.length.toString()
                  ]);
                }
              });

              statsSlide.addTable(statsTable, {
                x: 1, y: 1.2, w: 8, h: 5,
                fontSize: 11,
                border: { pt: 1, color: 'CCCCCC' },
                fill: { color: 'F8FAFC' },
                color: '1E293B',
                align: 'center',
                valign: 'middle'
              });

              totalSlides++;
            }

            setProgress(40 + (50 * (sheetIdx + 1) / workbook.SheetNames.length));
          }

          setProgress(95);
          setProgressMessage('Saving PowerPoint file...');

          const fileName = file.name.replace(/\.[^/.]+$/, '') + '_presentation.pptx';
          await pptx.writeFile({ fileName });

          setProgress(100);
          setProgressMessage('Complete!');
          setResult({
            success: true,
            fileName: fileName,
            slidesCreated: totalSlides,
            chartsCreated: totalCharts,
            message: 'PowerPoint created successfully!'
          });

          resolve();
        } catch (err) {
          reject(new Error('Excel processing failed: ' + err.message));
        }
      };

      reader.onerror = () => reject(new Error('File reading failed'));
      reader.readAsArrayBuffer(file);
    });
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
    <div className="min-h-screen bg-white dark:bg-slate-950 py-12">
      <div className="container mx-auto px-4 max-w-4xl">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg">
              <FileText className="w-10 h-10 text-white" />
            </div>
          </div>

          <h1 className="text-5xl font-bold text-slate-900 dark:text-white mb-4">
            Advanced Excel to PowerPoint
          </h1>
          <p className="text-xl text-slate-600 dark:text-slate-400 mb-4">
            Professional presentations with charts, tables & statistics
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/30">
              <BarChart3 className="w-4 h-4 mr-1" />
              Multiple Charts
            </Badge>
            <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/30">
              <Table className="w-4 h-4 mr-1" />
              Data Tables
            </Badge>
            <Badge className="bg-green-500/20 text-green-300 border-green-500/30">
              <TrendingUp className="w-4 h-4 mr-1" />
              Statistics
            </Badge>
            <Badge className="bg-pink-500/20 text-pink-300 border-pink-500/30">
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
