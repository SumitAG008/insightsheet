
// pages/Dashboard.js - Enhanced dashboard with upload functionality integrated
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Shield, Zap, TrendingUp, Brain, Lock, Gauge, FileText, Download, Trash2, AlertCircle, Sparkles, FileDown, Undo2, Redo2, Save } from 'lucide-react';
// Dynamic import for jspdf to avoid build issues
// import { jsPDF } from 'jspdf';
// import 'jspdf-autotable';
import DataGrid from '../components/dashboard/DataGrid';
import CleaningTools from '../components/dashboard/CleaningTools';
import AIInsights from '../components/dashboard/AIInsights';
import ChartPanel from '../components/dashboard/ChartPanel';
import AIAssistant from '../components/dashboard/AIAssistant';
import DataTransform from '../components/dashboard/DataTransform';
import SmartFormula from '../components/dashboard/SmartFormula';
import DataValidator from '../components/dashboard/DataValidator';
import AdvancedFilter from '../components/dashboard/AdvancedFilter';
import FileUploadZone from '../components/upload/FileUploadZone';
import TemplateSelector from '../components/dashboard/TemplateSelector';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [filename, setFilename] = useState('');
  const [cleanedRowCount, setCleanedRowCount] = useState(0);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [displayData, setDisplayData] = useState(null);
  
  // Undo/Redo functionality
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const historyRef = useRef({ history: [], index: -1 });

  useEffect(() => {
    const storedData = sessionStorage.getItem('insightsheet_data');
    const storedFilename = sessionStorage.getItem('insightsheet_filename');
    
    if (storedData) {
      const parsedData = JSON.parse(storedData);
      setData(parsedData);
      setDisplayData(parsedData);
      setFilename(storedFilename || 'spreadsheet.csv');
      // Initialize history with initial data
      historyRef.current.history = [parsedData];
      historyRef.current.index = 0;
      setHistory([parsedData]);
      setHistoryIndex(0);
    }
  }, []);

  useEffect(() => {
    if (data) {
      setDisplayData(data);
    }
  }, [data]);

  // Add to history when data changes
  const addToHistory = useCallback((newData) => {
    const currentHistory = historyRef.current.history;
    const currentIndex = historyRef.current.index;
    
    // Remove any history after current index (if user did undo and then made a change)
    const newHistory = currentHistory.slice(0, currentIndex + 1);
    newHistory.push(JSON.parse(JSON.stringify(newData))); // Deep copy
    
    // Limit history to 50 states
    if (newHistory.length > 50) {
      newHistory.shift();
      historyRef.current.index = newHistory.length - 1;
    } else {
      historyRef.current.index = newHistory.length - 1;
    }
    
    historyRef.current.history = newHistory;
    setHistory(newHistory);
    setHistoryIndex(historyRef.current.index);
  }, []);

  const undo = useCallback(() => {
    if (historyRef.current.index > 0) {
      historyRef.current.index -= 1;
      const previousData = historyRef.current.history[historyRef.current.index];
      setData(previousData);
      setHistoryIndex(historyRef.current.index);
      sessionStorage.setItem('insightsheet_data', JSON.stringify(previousData));
    }
  }, []);

  const redo = useCallback(() => {
    if (historyRef.current.index < historyRef.current.history.length - 1) {
      historyRef.current.index += 1;
      const nextData = historyRef.current.history[historyRef.current.index];
      setData(nextData);
      setHistoryIndex(historyRef.current.index);
      sessionStorage.setItem('insightsheet_data', JSON.stringify(nextData));
    }
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ctrl+Z or Cmd+Z for undo
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
      }
      // Ctrl+Shift+Z or Ctrl+Y for redo
      if (((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'z') || 
          ((e.ctrlKey || e.metaKey) && e.key === 'y')) {
        e.preventDefault();
        redo();
      }
      // Ctrl+S for save
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
      // Ctrl+E for export
      if ((e.ctrlKey || e.metaKey) && e.key === 'e') {
        e.preventDefault();
        handleExport();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo]);

  const handleFileUpload = useCallback((file, uploadedData) => {
    setUploadedFile({ file, data: uploadedData });
    setIsProcessing(true);
    
    sessionStorage.setItem('insightsheet_data', JSON.stringify(uploadedData));
    sessionStorage.setItem('insightsheet_filename', file.name);
    
    setTimeout(() => {
      setIsProcessing(false);
      setData(uploadedData);
      setFilename(file.name);
      addToHistory(uploadedData);
    }, 1000);
  }, [addToHistory]);

  const handleTemplateLoad = useCallback((templateData) => {
    setIsProcessing(true);
    const templateFilename = 'template_data.csv';
    
    sessionStorage.setItem('insightsheet_data', JSON.stringify(templateData));
    sessionStorage.setItem('insightsheet_filename', templateFilename);
    
    setTimeout(() => {
      setIsProcessing(false);
      setData(templateData);
      setFilename(templateFilename);
      addToHistory(templateData);
    }, 500);
  }, [addToHistory]);

  const handleDataUpdate = (newData) => {
    setData(newData);
    sessionStorage.setItem('insightsheet_data', JSON.stringify(newData));
    addToHistory(newData);
  };

  const handleSave = () => {
    if (!data) return;
    sessionStorage.setItem('insightsheet_data', JSON.stringify(data));
    sessionStorage.setItem('insightsheet_filename', filename);
    // Show brief success message
    const button = document.querySelector('[data-save-button]');
    if (button) {
      const originalText = button.textContent;
      button.textContent = 'Saved!';
      button.classList.add('bg-green-600');
      setTimeout(() => {
        button.textContent = originalText;
        button.classList.remove('bg-green-600');
      }, 2000);
    }
  };

  const exportAsPDF = async () => {
    if (!data) return;
    
    try {
      // Dynamic import to avoid build issues
      const { jsPDF } = await import('jspdf');
      await import('jspdf-autotable');
      
      const doc = new jsPDF();
      
      // Add title
      doc.setFontSize(18);
      doc.text('Data Report', 14, 22);
      
      // Add filename and metadata
      doc.setFontSize(10);
      doc.text(`File: ${filename}`, 14, 30);
      doc.text(`Rows: ${data.rows.length} | Columns: ${data.headers.length}`, 14, 36);
      doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 42);
      
      // Add table
      const tableData = data.rows.map(row => 
        data.headers.map(header => {
          const value = row[header];
          return value !== null && value !== undefined ? String(value) : '';
        })
      );
      
      doc.autoTable({
        head: [data.headers],
        body: tableData,
        startY: 48,
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: [10, 31, 68], textColor: 255, fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [245, 247, 250] },
        margin: { top: 48 },
      });
      
      // Save PDF
      doc.save(`${filename.replace(/\.[^/.]+$/, '')}_report.pdf`);
    } catch (error) {
      console.error('Error exporting PDF:', error);
      alert('Failed to export PDF. Please try again.');
    }
  };

  const exportAsCSV = () => {
    if (!data) return;
    
    const headers = data.headers.join(',');
    const rows = data.rows.map(row => {
      return data.headers.map(header => {
        const value = row[header];
        if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value ?? '';
      }).join(',');
    }).join('\n');
    
    const csvContent = `${headers}\n${rows}`;
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `cleaned_${filename.replace(/\.[^/.]+$/, '')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportAsExcel = () => {
    if (!data) return;

    if (!window.XLSX) {
      alert('Excel library not loaded. Exporting as CSV instead.');
      exportAsCSV();
      return;
    }

    // Create worksheet
    const ws_data = [data.headers];
    data.rows.forEach(row => {
      ws_data.push(data.headers.map(h => row[h] ?? ''));
    });

    const ws = window.XLSX.utils.aoa_to_sheet(ws_data);
    
    // Auto-size columns
    const colWidths = data.headers.map((h, i) => {
      const maxLength = Math.max(
        h.length,
        ...data.rows.map(row => String(row[h] || '').length)
      );
      return { wch: Math.min(maxLength + 2, 50) };
    });
    ws['!cols'] = colWidths;

    // Create workbook
    const wb = window.XLSX.utils.book_new();
    window.XLSX.utils.book_append_sheet(wb, ws, 'Data');

    // Export
    window.XLSX.writeFile(wb, `cleaned_${filename.replace(/\.[^/.]+$/, '')}.xlsx`);
  };

  const handleExport = async (format) => {
    if (!data) return;
    
    if (format === 'pdf') {
      await exportAsPDF();
    } else if (format === 'excel') {
      exportAsExcel();
    } else if (format === 'csv') {
      exportAsCSV();
    } else {
      // Default: show menu (handled by dropdown)
      exportAsExcel();
    }
  };

  const handleClearData = () => {
    if (confirm('Clear all data and start over?')) {
      sessionStorage.removeItem('insightsheet_data');
      sessionStorage.removeItem('insightsheet_filename');
      setData(null);
      setFilename('');
      setCleanedRowCount(0);
    }
  };

  // Show upload interface when no data
  if (!data) {
    return (
      <div className="min-h-screen bg-white dark:bg-slate-950">
        <div className="container mx-auto px-4 py-12">
          {/* Header */}
          <div className="text-center mb-16 animate-fade-in">
            <div className="flex justify-center mb-6">
              <div className="w-20 h-20 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg">
                <Zap className="w-10 h-10 text-white" />
              </div>
            </div>
            
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-full mb-6">
              <Shield className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span className="text-sm text-slate-700 dark:text-slate-300 font-semibold">100% Private • Zero Storage • Excel & CSV Support</span>
            </div>
            
            <h1 className="text-4xl md:text-6xl font-bold mb-6 text-slate-900 dark:text-white leading-tight">
              Transform Your Data
            </h1>
            
            <p className="text-xl md:text-2xl text-slate-700 dark:text-slate-300 max-w-3xl mx-auto mb-4 font-medium">
              AI-powered analysis, instant cleanup, and beautiful visualizations
            </p>
            
            <p className="text-lg text-slate-600 dark:text-slate-400 font-semibold">
              Meldra
            </p>

            {/* Features */}
            <div className="flex flex-wrap justify-center gap-4 mt-8">
              {[
                { icon: Gauge, text: 'Instant Processing', bg: 'bg-blue-100 dark:bg-blue-900/30', textColor: 'text-blue-700 dark:text-blue-300' },
                { icon: Brain, text: 'AI-Powered', bg: 'bg-purple-100 dark:bg-purple-900/30', textColor: 'text-purple-700 dark:text-purple-300' },
                { icon: Lock, text: 'Privacy First', bg: 'bg-emerald-100 dark:bg-emerald-900/30', textColor: 'text-emerald-700 dark:text-emerald-300' },
                { icon: TrendingUp, text: 'Smart Charts', bg: 'bg-orange-100 dark:bg-orange-900/30', textColor: 'text-orange-700 dark:text-orange-300' }
              ].map((feature, idx) => (
                <div key={idx} className={`flex items-center gap-2 px-4 py-2 ${feature.bg} ${feature.textColor} rounded-lg border border-current/20`}>
                  <feature.icon className="w-5 h-5" />
                  <span className="font-semibold">{feature.text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Template Selector */}
          <div className="max-w-4xl mx-auto mb-8">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  Quick Start with Templates
                </h3>
                <TemplateSelector onTemplateLoad={handleTemplateLoad} />
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Choose from pre-built templates for Sales, Finance, HR, and more to get started instantly.
              </p>
            </div>
          </div>

          {/* Upload Zone */}
          <div className="max-w-4xl mx-auto">
            <FileUploadZone onFileUpload={handleFileUpload} isProcessing={isProcessing} />
          </div>

          {/* Privacy notice */}
          <div className="mt-12 max-w-3xl mx-auto">
            <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl p-6">
              <div className="flex items-start gap-4">
                <Shield className="w-6 h-6 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-emerald-300 mb-2">Privacy-First Architecture</h3>
                  <p className="text-slate-700 dark:text-slate-300 text-sm leading-relaxed">
                    All data processing happens in your browser. CSV files are parsed using native JavaScript - 
                    no external libraries, no uploads, no tracking. AI analysis uses anonymous, encrypted requests 
                    with zero data retention. Your data stays yours, always.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Excel + CSV Instructions */}
          <div className="mt-12 max-w-4xl mx-auto">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-8 shadow-sm">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-3">
                <FileText className="w-7 h-7 text-blue-600 dark:text-blue-400" />
                ✨ Now Supports Excel Files!
              </h2>
              
              <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-lg p-4 mb-6">
                <p className="text-emerald-700 dark:text-emerald-300 font-semibold mb-2">🎉 Direct Upload Support:</p>
                <ul className="text-slate-700 dark:text-slate-300 text-sm space-y-1 ml-4">
                  <li>✅ <strong>Excel:</strong> .XLSX, .XLS files (any size)</li>
                  <li>✅ <strong>CSV:</strong> .CSV files</li>
                  <li>✅ <strong>Export:</strong> Download as Excel or CSV format</li>
                </ul>
              </div>

              <div className="space-y-6">
                <div className="flex gap-4 items-start">
                  <div className="flex-shrink-0 w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-md">
                    1
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">Upload Excel Directly</h3>
                    <p className="text-slate-600 dark:text-slate-400">Just drag & drop your .XLSX or .XLS file - no conversion needed!</p>
                  </div>
                </div>
                
                <div className="flex gap-4 items-start">
                  <div className="flex-shrink-0 w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-md">
                    2
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">Analyze & Transform</h3>
                    <p className="text-slate-600 dark:text-slate-400">Use AI-powered tools to clean, analyze, and visualize your data</p>
                  </div>
                </div>
                
                <div className="flex gap-4 items-start">
                  <div className="flex-shrink-0 w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-md">
                    3
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">Export Your Results</h3>
                    <p className="text-slate-600 dark:text-slate-400">Download as Excel (.xlsx) or CSV - your choice!</p>
                  </div>
                </div>
              </div>

              <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg">
                <p className="text-slate-700 dark:text-slate-300 text-sm">
                  <strong>✨ No File Size Limits:</strong> Process files of any size!<br />
                  <strong className="text-emerald-600 dark:text-emerald-400">🔒 Privacy First:</strong> Your files are never stored
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">Analysis Dashboard</h1>
            <p className="text-slate-600 dark:text-slate-400 flex items-center gap-2 flex-wrap">
              <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
              {filename} • {(displayData || data).rows.length} rows • {(displayData || data).headers.length} columns
              {displayData && displayData.rows.length !== data.rows.length && (
                <span className="ml-2 px-2 py-1 bg-blue-500/20 text-blue-400 text-xs rounded-full">
                  Filtered: {data.rows.length - displayData.rows.length} hidden
                </span>
              )}
              {cleanedRowCount > 0 && (
                <span className="ml-2 px-2 py-1 bg-amber-500/20 text-amber-400 text-xs rounded-full">
                  {cleanedRowCount} cleaned
                </span>
              )}
            </p>
          </div>
          
          <div className="flex gap-3 flex-wrap">
            {/* Template Selector */}
            <TemplateSelector onTemplateLoad={handleTemplateLoad} />
            
            {/* Undo/Redo Buttons */}
            <div className="flex gap-1 border border-slate-300 dark:border-slate-700 rounded-lg overflow-hidden">
              <Button
                onClick={undo}
                disabled={historyIndex <= 0}
                variant="outline"
                size="sm"
                className="rounded-none border-0 border-r border-slate-300 dark:border-slate-700"
                title="Undo (Ctrl+Z)"
              >
                <Undo2 className="w-4 h-4" />
              </Button>
              <Button
                onClick={redo}
                disabled={historyIndex >= history.length - 1}
                variant="outline"
                size="sm"
                className="rounded-none border-0"
                title="Redo (Ctrl+Y)"
              >
                <Redo2 className="w-4 h-4" />
              </Button>
            </div>

            {/* Save Button */}
            <Button
              onClick={handleSave}
              variant="outline"
              className="border-slate-300 dark:border-slate-700"
              data-save-button
              title="Save (Ctrl+S)"
            >
              <Save className="w-4 h-4 mr-2" />
              Save
            </Button>

            {/* Export Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                  title="Export (Ctrl+E)"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleExport('pdf')}>
                  <FileDown className="w-4 h-4 mr-2" />
                  Export as PDF
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport('excel')}>
                  <FileText className="w-4 h-4 mr-2" />
                  Export as Excel (.xlsx)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport('csv')}>
                  <FileText className="w-4 h-4 mr-2" />
                  Export as CSV
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button
              onClick={handleClearData}
              variant="outline"
              className="border-slate-300 dark:border-slate-700"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Clear All
            </Button>
          </div>
        </div>

        {/* Privacy Notice */}
        <div className="mb-6 bg-blue-50 dark:bg-slate-900/50 border border-blue-200 dark:border-slate-800 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-slate-700 dark:text-slate-300">
              <strong className="text-blue-600 dark:text-blue-400">Privacy Mode Active:</strong> All data is processed locally in your browser.
              Nothing is stored on servers. Close this tab to permanently delete all data.
            </div>
          </div>
        </div>

        {/* AI Assistant Banner */}
        <div className="mb-6 bg-blue-50 dark:bg-slate-900/50 border border-blue-200 dark:border-slate-800 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <Sparkles className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">New: AI-Powered Operations</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400">Describe any operation in plain English - AI will execute it for you!</p>
            </div>
          </div>
        </div>

        {/* Tabs for Different Sections */}
        <Tabs defaultValue="analysis" className="space-y-6">
          <TabsList className="bg-slate-100 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 p-1">
            <TabsTrigger value="analysis" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">
              Analysis & Cleaning
            </TabsTrigger>
            <TabsTrigger value="transform" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">
              Transform Data
            </TabsTrigger>
            <TabsTrigger value="ai" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">
              AI Tools
            </TabsTrigger>
          </TabsList>

          <TabsContent value="analysis" className="space-y-6">
            <div className="grid lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                <AdvancedFilter data={data} onFilteredData={setDisplayData} />
                <CleaningTools 
                  data={displayData || data} 
                  onDataUpdate={handleDataUpdate}
                  onCleanedCount={setCleanedRowCount}
                />
                <DataValidator data={displayData || data} onDataUpdate={handleDataUpdate} />
                <DataGrid data={displayData || data} />
              </div>

              <div className="space-y-6">
                <AIInsights data={displayData || data} />
                <ChartPanel data={displayData || data} />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="transform" className="space-y-6">
            <div className="grid lg:grid-cols-2 gap-6">
              <DataTransform data={displayData || data} onDataUpdate={handleDataUpdate} />
              <SmartFormula data={displayData || data} onDataUpdate={handleDataUpdate} />
            </div>
            <DataGrid data={displayData || data} />
          </TabsContent>

          <TabsContent value="ai" className="space-y-6">
            <AIAssistant data={displayData || data} onDataUpdate={handleDataUpdate} />
            <DataGrid data={displayData || data} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
