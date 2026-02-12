
// pages/Dashboard.js - Enhanced dashboard with upload functionality integrated
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import { Shield, Zap, TrendingUp, Brain, Lock, Gauge, FileText, Download, Trash2, AlertCircle, Sparkles, FileDown, Undo2, Redo2, Save, Info } from 'lucide-react';
// Dynamic import for jspdf to avoid build issues
// import { jsPDF } from 'jspdf';
// import 'jspdf-autotable';
import DataGrid from '../components/dashboard/DataGrid';
import CleaningTools from '../components/dashboard/CleaningTools';
import AIInsights from '../components/dashboard/AIInsights';
import ChartPanel from '../components/dashboard/ChartPanel';
import EnhancedChartPanel from '../components/dashboard/EnhancedChartPanel';
import SuggestionsPanel from '@/components/SuggestionsPanel';
import AIAssistant from '../components/dashboard/AIAssistant';
import TemplateSelector from '../components/dashboard/TemplateSelector';
import DataTransform from '../components/dashboard/DataTransform';
import SmartFormula from '../components/dashboard/SmartFormula';
import DataValidator from '../components/dashboard/DataValidator';
import AdvancedFilter from '../components/dashboard/AdvancedFilter';
import OverviewDashboard from '../components/dashboard/OverviewDashboard';
import FileUploadZone from '../components/upload/FileUploadZone';
import { meldraAi, backendApi } from '@/api/meldraClient';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useI18n } from '@/lib/i18n';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';

class DashboardErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, errorMessage: '' };
  }

  static getDerivedStateFromError(error) {
    const msg = error?.message ? String(error.message) : 'Unexpected UI error';
    return { hasError: true, errorMessage: msg };
  }

  componentDidCatch(error, info) {
    // Keep the console error for debugging without taking down the whole page.
    // eslint-disable-next-line no-console
    console.error('Dashboard UI crash:', error, info);
  }

  render() {
    const t = typeof this.props?.t === 'function' ? this.props.t : (k) => k;
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-white dark:bg-slate-950">
          <div className="container mx-auto px-4 py-10">
            <div className="max-w-2xl mx-auto border border-red-200 dark:border-red-900/40 bg-red-50 dark:bg-red-950/20 rounded-xl p-6">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-6 h-6 text-red-700 dark:text-red-400 mt-0.5" />
                <div className="flex-1">
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white">{t('dashboard_err_boundary_title')}</h2>
                  <p className="mt-2 text-sm text-slate-700 dark:text-slate-300">
                    {this.state.errorMessage}
                  </p>
                  <div className="mt-4 flex flex-wrap gap-3">
                    <Button onClick={() => window.location.reload()} variant="default">{t('common_reload')}</Button>
                    <Button onClick={() => this.setState({ hasError: false, errorMessage: '' })} variant="outline">{t('common_try_again')}</Button>
                  </div>
                  <p className="mt-3 text-xs text-slate-600 dark:text-slate-400">
                    {t('dashboard_err_boundary_hint')}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default function Dashboard() {
  const { t } = useI18n();
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const [data, setData] = useState(null);
  const [filename, setFilename] = useState('');
  const [cleanedRowCount, setCleanedRowCount] = useState(0);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [displayData, setDisplayData] = useState(null);
  const [activeSheet, setActiveSheet] = useState('');
  const [activity, setActivity] = useState([]);
  const [universalAnalysis, setUniversalAnalysis] = useState(null);
  const [universalError, setUniversalError] = useState('');
  const [universalRecalcLoading, setUniversalRecalcLoading] = useState(false);
  const [activeTab, setActiveTab] = useState(() => {
    const t = (searchParams.get('tab') || '').trim();
    return t === 'overview' || t === 'transform' || t === 'ai' || t === 'analysis' ? t : 'overview';
  });
  
  // Undo/Redo functionality
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const historyRef = useRef({ history: [], index: -1 });

  useEffect(() => {
    const storedData = sessionStorage.getItem('insightsheet_data');
    const storedFilename = sessionStorage.getItem('insightsheet_filename');
    const storedUniversal = sessionStorage.getItem('insightsheet_universal_analysis');
    
    if (storedData) {
      const parsedData = JSON.parse(storedData);
      setData(parsedData);
      setDisplayData(parsedData);
      setFilename(storedFilename || 'spreadsheet.csv');
      setActiveSheet(parsedData?.workbook?.activeSheet || (parsedData?.workbook?.sheetNames || [])[0] || '');
      // Initialize history with initial data
      historyRef.current.history = [parsedData];
      historyRef.current.index = 0;
      setHistory([parsedData]);
      setHistoryIndex(0);
    }

    if (storedUniversal) {
      try {
        setUniversalAnalysis(JSON.parse(storedUniversal));
      } catch (_) {
        setUniversalAnalysis(null);
      }
    }
  }, []);

  useEffect(() => {
    const t = (searchParams.get('tab') || '').trim();
    const next = t === 'overview' || t === 'transform' || t === 'ai' || t === 'analysis' ? t : 'overview';
    setActiveTab(next);
  }, [searchParams]);

  useEffect(() => {
    const hash = (location.hash || '').replace('#', '').trim();
    if (!hash) return;
    const el = document.getElementById(hash);
    if (!el) return;
    setTimeout(() => {
      try {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } catch (_) {}
    }, 50);
  }, [location.hash, activeTab]);

  const handleTabChange = (v) => {
    setActiveTab(v);
    const next = new URLSearchParams(searchParams);
    next.set('tab', v);
    setSearchParams(next, { replace: true });
  };

  useEffect(() => {
    if (data) {
      setDisplayData(data);
      setActiveSheet(data?.workbook?.activeSheet || (data?.workbook?.sheetNames || [])[0] || '');
    }
  }, [data]);

  const sheetNames = data?.workbook?.sheetNames || [];
  const workbookSheets = data?.workbook?.sheets || {};
  const hasWorkbook = sheetNames.length > 0 && Object.keys(workbookSheets).length > 0;

  const handleSheetSelect = (sheet) => {
    if (!sheet) return;
    if (!hasWorkbook) return;
    const tbl = workbookSheets?.[sheet];
    if (!tbl) return;

    const next = {
      ...data,
      headers: tbl.headers,
      rows: tbl.rows,
      raw: tbl.raw,
      workbook: {
        ...(data.workbook || {}),
        activeSheet: sheet,
      },
    };

    setActiveSheet(sheet);
    setData(next);
    sessionStorage.setItem('insightsheet_data', JSON.stringify(next));
    setActivity((prev) => [
      {
        id: crypto.randomUUID(),
        at: new Date().toISOString(),
        title: 'Switched sheet',
        detail: sheet,
        badge: 'Overview',
      },
      ...(prev || []),
    ]);
    addToHistory(next);
  };

  const pushActivity = useCallback((evt) => {
    if (!evt) return;
    const nextEvt = {
      id: crypto.randomUUID(),
      at: new Date().toISOString(),
      title: evt.title || 'Update',
      detail: evt.detail || '',
      badge: evt.badge || '',
    };
    setActivity((prev) => [nextEvt, ...(prev || [])].slice(0, 200));
  }, []);

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

    setUniversalError('');
    setUniversalAnalysis(null);
    sessionStorage.removeItem('insightsheet_universal_analysis');
    
    sessionStorage.setItem('insightsheet_data', JSON.stringify(uploadedData));
    sessionStorage.setItem('insightsheet_filename', file.name);

    const ext = String(file?.name || '').split('.').pop().toLowerCase();
    const isExcel = ext === 'xlsx' || ext === 'xls';

    const universalAnalyze = meldraAi?.files?.universalAnalyze || backendApi?.files?.universalAnalyze;

    if (isExcel) {
      (async () => {
        try {
          if (typeof universalAnalyze !== 'function') {
            throw new Error(t('dashboard_universal_analyze_not_available'));
          }
          const res = await universalAnalyze(file);
          setUniversalAnalysis(res);
          sessionStorage.setItem('insightsheet_universal_analysis', JSON.stringify(res));
          pushActivity({
            title: t('dashboard_universal_excel_diagnostics'),
            detail: t('dashboard_universal_status_charts', { status: res?.status || t('common_success'), charts: res?.total_charts ?? 0 }),
            badge: 'Overview',
          });
        } catch (e) {
          const msg = e?.message || t('dashboard_universal_analyze_failed');
          setUniversalError(msg);
          pushActivity({
            title: t('dashboard_universal_excel_diagnostics_failed'),
            detail: msg,
            badge: 'Overview',
          });
        }
      })();
    }
    
    setTimeout(() => {
      setIsProcessing(false);
      setData(uploadedData);
      setDisplayData(uploadedData);
      setFilename(file.name);
      setActiveSheet(uploadedData?.workbook?.activeSheet || (uploadedData?.workbook?.sheetNames || [])[0] || '');
      pushActivity({
        title: t('dashboard_uploaded_file'),
        detail: t('dashboard_file_rows', { file: file.name, rows: uploadedData?.rows?.length ?? 0 }),
        badge: 'Overview',
      });
      addToHistory(uploadedData);
    }, 1000);
  }, [addToHistory, pushActivity]);

  const handleUniversalRecalc = useCallback(async () => {
    const f = uploadedFile?.file;
    if (!f) return;
    const universalAnalyze = meldraAi?.files?.universalAnalyze || backendApi?.files?.universalAnalyze;
    setUniversalRecalcLoading(true);
    setUniversalError('');
    try {
      if (typeof universalAnalyze !== 'function') {
        throw new Error(t('dashboard_universal_analyze_not_available'));
      }
      const res = await universalAnalyze(f, { recalculate: true, timeoutMs: 180000 });
      setUniversalAnalysis(res);
      sessionStorage.setItem('insightsheet_universal_analysis', JSON.stringify(res));
      pushActivity({
        title: t('dashboard_universal_excel_recalculation'),
        detail: t('dashboard_universal_status_charts', { status: res?.status || t('common_success'), charts: res?.total_charts ?? 0 }),
        badge: 'Overview',
      });
    } catch (e) {
      const msg = e?.message || t('dashboard_universal_recalculation_failed');
      setUniversalError(msg);
      pushActivity({
        title: t('dashboard_universal_excel_recalculation_failed'),
        detail: msg,
        badge: 'Overview',
      });
    } finally {
      setUniversalRecalcLoading(false);
    }
  }, [uploadedFile, pushActivity]);

  const handleUniversalClarify = useCallback(async (overrides) => {
    const f = uploadedFile?.file;
    if (!f) return;
    const universalAnalyze = meldraAi?.files?.universalAnalyze || backendApi?.files?.universalAnalyze;
    setUniversalRecalcLoading(true);
    setUniversalError('');
    try {
      if (typeof universalAnalyze !== 'function') {
        throw new Error(t('dashboard_universal_analyze_not_available'));
      }
      const res = await universalAnalyze(f, { overrides, timeoutMs: 180000 });
      setUniversalAnalysis(res);
      sessionStorage.setItem('insightsheet_universal_analysis', JSON.stringify(res));
      pushActivity({ title: t('dashboard_universal_excel_clarification'), detail: t('dashboard_applied_user_selections'), badge: 'Overview' });
    } catch (e) {
      const msg = e?.message || t('dashboard_universal_clarification_failed');
      setUniversalError(msg);
      pushActivity({ title: t('dashboard_universal_excel_clarification_failed'), detail: msg, badge: 'Overview' });
    } finally {
      setUniversalRecalcLoading(false);
    }
  }, [uploadedFile, pushActivity]);

  const handleTemplateLoad = useCallback((templateData) => {
    setIsProcessing(true);
    const templateFilename = 'template_data.csv';
    
    sessionStorage.setItem('insightsheet_data', JSON.stringify(templateData));
    sessionStorage.setItem('insightsheet_filename', templateFilename);
    
    setTimeout(() => {
      setIsProcessing(false);
      setData(templateData);
      setFilename(templateFilename);
      setActiveSheet(templateData?.workbook?.activeSheet || (templateData?.workbook?.sheetNames || [])[0] || '');
      pushActivity({
        title: t('dashboard_loaded_template'),
        detail: t('dashboard_file_rows', { file: templateFilename, rows: templateData?.rows?.length ?? 0 }),
        badge: 'Overview',
      });
      addToHistory(templateData);
    }, 500);
  }, [addToHistory, pushActivity]);

  const handleDataUpdate = (newData, meta) => {
    const prevRows = data?.rows?.length ?? 0;
    const prevCols = data?.headers?.length ?? 0;
    setData(newData);
    sessionStorage.setItem('insightsheet_data', JSON.stringify(newData));
    addToHistory(newData);

    const nextRows = newData?.rows?.length ?? 0;
    const nextCols = newData?.headers?.length ?? 0;
    const deltaRows = nextRows - prevRows;
    const deltaCols = nextCols - prevCols;

    if (meta?.title) {
      pushActivity({
        title: meta.title,
        detail: meta.detail || '',
        badge: meta.badge || (activeTab === 'transform' ? 'Transform' : activeTab === 'ai' ? 'AI' : 'Cleaning'),
      });
      return;
    }

    if (deltaRows !== 0 || deltaCols !== 0) {
      pushActivity({
        title: t('dashboard_dataset_updated'),
        detail: t('dashboard_dataset_delta_rows_cols', {
          deltaRows: `${deltaRows >= 0 ? '+' : ''}${deltaRows}`,
          deltaCols: `${deltaCols >= 0 ? '+' : ''}${deltaCols}`,
        }),
        badge: activeTab === 'transform' ? 'Transform' : activeTab === 'ai' ? 'AI' : 'Cleaning',
      });
    } else {
      pushActivity({
        title: t('dashboard_dataset_updated'),
        detail: t('dashboard_values_changed'),
        badge: activeTab === 'transform' ? 'Transform' : activeTab === 'ai' ? 'AI' : 'Cleaning',
      });
    }
  };

  const handleSave = () => {
    if (!data) return;
    sessionStorage.setItem('insightsheet_data', JSON.stringify(data));
    sessionStorage.setItem('insightsheet_filename', filename);
    // Show brief success message
    const button = document.querySelector('[data-save-button]');
    if (button) {
      const originalText = button.textContent;
      button.textContent = t('dashboard_saved');
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
      doc.text(t('dashboard_data_report_title'), 14, 22);
      
      // Add filename and metadata
      doc.setFontSize(10);
      doc.text(t('dashboard_pdf_file', { filename }), 14, 30);
      doc.text(t('dashboard_pdf_rows_columns', { rows: data.rows.length, cols: data.headers.length }), 14, 36);
      doc.text(t('dashboard_pdf_generated', { timestamp: new Date().toLocaleString() }), 14, 42);
      
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
      alert(t('dashboard_err_export_pdf_failed'));
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
    if (confirm(t('dashboard_confirm_clear_all'))) {
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
              <div className="w-20 h-20 bg-[#4169E1] rounded-2xl flex items-center justify-center shadow-lg">
                <Zap className="w-10 h-10 text-white" />
              </div>
            </div>
            
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#4169E1]/10 border border-[#4169E1]/40 rounded-full mb-6">
              <Shield className="w-4 h-4 text-[#4169E1]" />
              <span className="text-sm text-slate-900 dark:text-slate-200 font-semibold">{t('landing_badge')}</span>
            </div>
            
            <h1 className="text-4xl md:text-6xl font-bold mb-6 text-slate-900 dark:text-white leading-tight">
              {t('landing_title')}
            </h1>
            
            <p className="text-xl md:text-2xl text-slate-700 dark:text-slate-300 max-w-3xl mx-auto mb-4 font-medium">
              {t('landing_subtitle')}
            </p>
            
            <p className="text-lg text-slate-600 dark:text-slate-400 font-semibold">
              {t('landing_brand')}
            </p>

            {/* Features */}
            <div className="flex flex-wrap justify-center gap-4 mt-8">
              {[
                { icon: Gauge, text: t('landing_feature_instant_processing'), bg: 'bg-[#4169E1]/20', textColor: 'text-[#4169E1]' },
                { icon: Brain, text: t('landing_feature_ai_powered'), bg: 'bg-purple-100 dark:bg-purple-900/30', textColor: 'text-purple-700 dark:text-purple-300' },
                { icon: Lock, text: t('landing_feature_privacy_first'), bg: 'bg-emerald-100 dark:bg-emerald-900/30', textColor: 'text-emerald-700 dark:text-emerald-300' },
                { icon: TrendingUp, text: t('landing_feature_smart_charts'), bg: 'bg-orange-100 dark:bg-orange-900/30', textColor: 'text-orange-700 dark:text-orange-300' }
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
                  {t('landing_templates_title')}
                </h3>
                <TemplateSelector onTemplateLoad={handleTemplateLoad} />
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                {t('landing_templates_desc')}
              </p>
            </div>
          </div>

          <div className="max-w-4xl mx-auto mb-8">
            <SuggestionsPanel page="dashboard" />
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
                  <h3 className="text-lg font-bold text-slate-900 dark:text-emerald-300 mb-2">{t('landing_privacy_arch_title')}</h3>
                  <p className="text-slate-700 dark:text-slate-300 text-sm leading-relaxed">
                    {t('landing_privacy_arch_body')}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Excel + CSV Instructions */}
          <div className="mt-12 max-w-4xl mx-auto">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-8 shadow-sm">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-3">
                <FileText className="w-7 h-7 text-[#4169E1]" />
                {t('landing_excel_support_title')}
              </h2>
              
              <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-lg p-4 mb-6">
                <p className="text-emerald-700 dark:text-emerald-300 font-semibold mb-2">{t('landing_direct_upload_support_title')}</p>
                <ul className="text-slate-700 dark:text-slate-300 text-sm space-y-1 ml-4">
                  <li>{t('landing_direct_upload_item_excel')}</li>
                  <li>{t('landing_direct_upload_item_csv')}</li>
                  <li>{t('landing_direct_upload_item_export')}</li>
                </ul>
              </div>

              <div className="space-y-6">
                <div className="flex gap-4 items-start">
                  <div className="flex-shrink-0 w-10 h-10 bg-[#4169E1] rounded-full flex items-center justify-center text-white font-bold text-lg shadow-md">
                    1
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">{t('landing_step_1_title')}</h3>
                    <p className="text-slate-600 dark:text-slate-400">{t('landing_step_1_desc')}</p>
                  </div>
                </div>
                
                <div className="flex gap-4 items-start">
                  <div className="flex-shrink-0 w-10 h-10 bg-[#4169E1] rounded-full flex items-center justify-center text-white font-bold text-lg shadow-md">
                    2
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">{t('landing_step_2_title')}</h3>
                    <p className="text-slate-600 dark:text-slate-400">{t('landing_step_2_desc')}</p>
                  </div>
                </div>
                
                <div className="flex gap-4 items-start">
                  <div className="flex-shrink-0 w-10 h-10 bg-[#4169E1] rounded-full flex items-center justify-center text-white font-bold text-lg shadow-md">
                    3
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">{t('landing_step_3_title')}</h3>
                    <p className="text-slate-600 dark:text-slate-400">{t('landing_step_3_desc')}</p>
                  </div>
                </div>
              </div>

              <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg">
                <p className="text-slate-700 dark:text-slate-300 text-sm">
                  <strong>{t('landing_no_file_size_limits_title')}</strong> {t('landing_no_file_size_limits_desc')}<br />
                  <strong className="text-emerald-600 dark:text-emerald-400">{t('landing_privacy_first_title')}</strong> {t('landing_privacy_first_desc')}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <DashboardErrorBoundary t={t}>
      <div className="min-h-screen bg-white dark:bg-slate-950">
        <div className="container mx-auto px-4 py-6">
          {/* Header */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">{filename || t('dashboard_analysis_dashboard_title')}</h1>
              <p className="text-slate-600 dark:text-slate-400 flex items-center gap-2 flex-wrap">
                <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                {t('dashboard_subtitle_rows_cols', { rows: (displayData || data).rows.length, cols: (displayData || data).headers.length })}
                {displayData && displayData.rows.length !== data.rows.length && (
                  <span className="ml-2 px-2 py-1 bg-[#4169E1]/20 text-[#4169E1] text-sm rounded-full">
                    {t('dashboard_filtered_hidden', { hidden: data.rows.length - displayData.rows.length })}
                  </span>
                )}
                {cleanedRowCount > 0 && (
                  <span className="ml-2 px-2 py-1 bg-amber-500/20 text-amber-400 text-xs rounded-full">
                    {t('dashboard_cleaned_count', { count: cleanedRowCount })}
                  </span>
                )}
              </p>


            {hasWorkbook && sheetNames.length > 1 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {sheetNames.map((sn) => {
                  const isActive = (activeSheet || data?.workbook?.activeSheet || sheetNames[0]) === sn;
                  return (
                    <Button
                      key={sn}
                      type="button"
                      size="sm"
                      variant={isActive ? 'default' : 'outline'}
                      className={isActive ? 'bg-[#4169E1] hover:bg-[#3659c7] text-white' : 'border-slate-300 dark:border-slate-700'}
                      onClick={() => handleSheetSelect(sn)}
                      title={sn}
                    >
                      {sn}
                    </Button>
                  );
                })}
              </div>
            )}
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
                title={t('dashboard_undo_shortcut')}
              >
                <Undo2 className="w-4 h-4" />
              </Button>
              <Button
                onClick={redo}
                disabled={historyIndex >= history.length - 1}
                variant="outline"
                size="sm"
                className="rounded-none border-0"
                title={t('dashboard_redo_shortcut')}
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
              title={t('dashboard_save_shortcut')}
            >
              <Save className="w-4 h-4 mr-2" />
              {t('common_save')}
            </Button>

            {/* Export Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  className="bg-[#4169E1] hover:bg-[#3659c7] text-white"
                  title={t('dashboard_export_shortcut')}
                >
                  <Download className="w-4 h-4 mr-2" />
                  {t('common_export')}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleExport('pdf')}>
                  <FileDown className="w-4 h-4 mr-2" />
                  {t('dashboard_export_as_pdf')}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport('excel')}>
                  <FileText className="w-4 h-4 mr-2" />
                  {t('dashboard_export_as_excel')}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport('csv')}>
                  <FileText className="w-4 h-4 mr-2" />
                  {t('dashboard_export_as_csv')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button
              onClick={handleClearData}
              variant="outline"
              className="border-slate-300 dark:border-slate-700"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              {t('common_clear_all')}
            </Button>
          </div>
        </div>

        <TooltipProvider>
          <div className="mb-6 flex flex-wrap items-center gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="inline-flex items-center gap-2 rounded-full border border-[#4169E1]/30 bg-[#4169E1]/10 px-3 py-1 text-sm text-slate-900 dark:text-slate-100 cursor-help">
                  <AlertCircle className="w-4 h-4 text-[#4169E1]" />
                  <span className="font-semibold">{t('dashboard_privacy_mode')}</span>
                  <Info className="w-3.5 h-3.5 text-slate-500" />
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-sm">
                {t('dashboard_privacy_mode_tooltip')}
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <div className="inline-flex items-center gap-2 rounded-full border border-[#4169E1]/30 bg-[#4169E1]/10 px-3 py-1 text-sm text-slate-900 dark:text-slate-100 cursor-help">
                  <Sparkles className="w-4 h-4 text-[#4169E1]" />
                  <span className="font-semibold">{t('dashboard_ai_ops')}</span>
                  <Info className="w-3.5 h-3.5 text-slate-500" />
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-sm">
                {t('dashboard_ai_ops_tooltip')}
              </TooltipContent>
            </Tooltip>
          </div>
        </TooltipProvider>

        {/* Tabs for Different Sections */}
        <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
          <TabsList className="bg-slate-100 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 p-1">
            <TabsTrigger value="overview" className="data-[state=active]:bg-[#4169E1] data-[state=active]:text-white">
              {t('dashboard_tab_overview')}
            </TabsTrigger>
            <TabsTrigger value="analysis" className="data-[state=active]:bg-[#4169E1] data-[state=active]:text-white">
              {t('dashboard_tab_analysis_cleaning')}
            </TabsTrigger>
            <TabsTrigger value="transform" className="data-[state=active]:bg-[#4169E1] data-[state=active]:text-white">
              {t('dashboard_tab_transform')}
            </TabsTrigger>
            <TabsTrigger value="ai" className="data-[state=active]:bg-[#4169E1] data-[state=active]:text-white">
              {t('dashboard_tab_ai_tools')}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <OverviewDashboard
              data={displayData}
              filename={filename}
              activity={activity}
              universalAnalysis={universalAnalysis}
              universalError={universalError}
              onUniversalRecalc={handleUniversalRecalc}
              onUniversalClarify={handleUniversalClarify}
              universalRecalcLoading={universalRecalcLoading}
            />
          </TabsContent>

          <TabsContent value="analysis" className="space-y-6">
            <div className="grid lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                <AdvancedFilter data={data} onFilteredData={setDisplayData} />
                <div id="cleaning">
                  <CleaningTools 
                    data={displayData || data} 
                    onDataUpdate={handleDataUpdate}
                    onCleanedCount={setCleanedRowCount}
                  />
                </div>
                <DataValidator data={displayData || data} onDataUpdate={handleDataUpdate} />
                <DataGrid data={displayData || data} onDataUpdate={handleDataUpdate} />
              </div>

              <div className="space-y-6">
                <SuggestionsPanel page="dashboard" hasData={Boolean(data)} activeTab={activeTab} />
                <AIInsights data={displayData || data} />
                <div id="charts">
                  <EnhancedChartPanel data={displayData || data} />
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="transform" className="space-y-6">
            <div className="grid lg:grid-cols-2 gap-6">
              <DataTransform data={displayData || data} onDataUpdate={handleDataUpdate} />
              <SmartFormula data={displayData || data} onDataUpdate={handleDataUpdate} />
            </div>
            <DataGrid data={displayData || data} onDataUpdate={handleDataUpdate} />
          </TabsContent>

          <TabsContent value="ai" className="space-y-6">
            <div id="ai">
              <AIAssistant data={displayData || data} onDataUpdate={handleDataUpdate} />
            </div>
            <DataGrid data={displayData || data} onDataUpdate={handleDataUpdate} />
          </TabsContent>
          </Tabs>
        </div>
      </div>
    </DashboardErrorBoundary>
  );
}
