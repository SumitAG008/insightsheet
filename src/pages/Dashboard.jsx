
// pages/Dashboard.js - Enhanced dashboard with all new features
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Download, Trash2, AlertCircle, Sparkles } from 'lucide-react';
import DataGrid from '../components/dashboard/DataGrid';
import CleaningTools from '../components/dashboard/CleaningTools';
import AIInsights from '../components/dashboard/AIInsights';
import ChartPanel from '../components/dashboard/ChartPanel';
import AIAssistant from '../components/dashboard/AIAssistant';
import DataTransform from '../components/dashboard/DataTransform';
import SmartFormula from '../components/dashboard/SmartFormula';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function Dashboard() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [filename, setFilename] = useState('');
  const [cleanedRowCount, setCleanedRowCount] = useState(0);

  useEffect(() => {
    const storedData = sessionStorage.getItem('insightsheet_data');
    const storedFilename = sessionStorage.getItem('insightsheet_filename');
    
    if (!storedData) {
      navigate(createPageUrl('Upload'));
      return;
    }
    
    setData(JSON.parse(storedData));
    setFilename(storedFilename || 'spreadsheet.csv');
  }, [navigate]);

  const handleDataUpdate = (newData) => {
    setData(newData);
    sessionStorage.setItem('insightsheet_data', JSON.stringify(newData));
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

  const handleExport = () => {
    if (!data) return;
    
    // Ask user which format
    const format = confirm('Export as Excel?\n\nClick OK for Excel (.xlsx)\nClick Cancel for CSV (.csv)');
    
    if (format) {
      // Export as Excel
      exportAsExcel();
    } else {
      // Export as CSV
      exportAsCSV();
    }
  };

  const handleClearData = () => {
    if (confirm('Clear all data and start over?')) {
      sessionStorage.removeItem('insightsheet_data');
      sessionStorage.removeItem('insightsheet_filename');
      navigate(createPageUrl('Upload'));
    }
  };

  if (!data) {
    return (
      <div className="min-h-screen bg-white dark:bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
          <p className="text-slate-600 dark:text-slate-400">Loading your data...</p>
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
              {filename} • {data.rows.length} rows • {data.headers.length} columns
              {cleanedRowCount > 0 && (
                <span className="ml-2 px-2 py-1 bg-amber-500/20 text-amber-400 text-xs rounded-full">
                  {cleanedRowCount} cleaned
                </span>
              )}
            </p>
          </div>
          
          <div className="flex gap-3 flex-wrap">
            <Button
              onClick={handleExport}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Download className="w-4 h-4 mr-2" />
              Export (Excel/CSV)
            </Button>
            <Button
              onClick={handleClearData}
              variant="outline"
              className="border-slate-700 hover:bg-slate-800"
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
                <CleaningTools 
                  data={data} 
                  onDataUpdate={handleDataUpdate}
                  onCleanedCount={setCleanedRowCount}
                />
                <DataGrid data={data} />
              </div>

              <div className="space-y-6">
                <AIInsights data={data} />
                <ChartPanel data={data} />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="transform" className="space-y-6">
            <div className="grid lg:grid-cols-2 gap-6">
              <DataTransform data={data} onDataUpdate={handleDataUpdate} />
              <SmartFormula data={data} onDataUpdate={handleDataUpdate} />
            </div>
            <DataGrid data={data} />
          </TabsContent>

          <TabsContent value="ai" className="space-y-6">
            <AIAssistant data={data} onDataUpdate={handleDataUpdate} />
            <DataGrid data={data} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
