
// pages/Upload.jsx - Fixed imports
import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Shield, Zap, TrendingUp, Brain, Lock, Gauge, FileText } from 'lucide-react';
import FileUploadZone from '../components/upload/FileUploadZone';

export default function Upload() {
  const navigate = useNavigate();
  const [uploadedFile, setUploadedFile] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleFileUpload = useCallback((file, data) => {
    setUploadedFile({ file, data });
    setIsProcessing(true);
    
    sessionStorage.setItem('insightsheet_data', JSON.stringify(data));
    sessionStorage.setItem('insightsheet_filename', file.name);
    
    setTimeout(() => {
      setIsProcessing(false);
      navigate(createPageUrl('Dashboard'));
    }, 1000);
  }, [navigate]);

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

        {/* UPDATED: Excel + CSV Instructions */}
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
