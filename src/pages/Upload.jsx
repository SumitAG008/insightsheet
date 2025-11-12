
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-slate-100 relative overflow-hidden">
      {/* Animated background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 -left-20 w-96 h-96 bg-slate-400/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-gray-400/20 rounded-full blur-3xl animate-pulse delay-1000" />
      </div>

      <div className="relative z-10 container mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-16 animate-fade-in">
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 bg-gradient-to-br from-slate-800 to-slate-700 rounded-2xl flex items-center justify-center shadow-2xl shadow-slate-500/50">
              <Zap className="w-10 h-10 text-white" />
            </div>
          </div>

          <div className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 border border-slate-300 rounded-full mb-6 backdrop-blur-sm">
            <Shield className="w-4 h-4 text-slate-700" />
            <span className="text-sm text-slate-800 font-bold">100% Private • Zero Storage • Excel & CSV Support</span>
          </div>

          <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-slate-800 via-slate-700 to-slate-800 bg-clip-text text-transparent leading-tight">
            Transform Your Data
          </h1>

          <p className="text-xl md:text-2xl text-slate-800 max-w-3xl mx-auto mb-4 font-bold">
            AI-powered analysis, instant cleanup, and beautiful visualizations
          </p>

          <p className="text-lg text-slate-700 font-bold">
            InsightSheet-lite
          </p>

          {/* Features */}
          <div className="flex flex-wrap justify-center gap-4 mt-8">
            {[
              { icon: Gauge, text: 'Instant Processing', color: 'from-slate-800 to-slate-700' },
              { icon: Brain, text: 'AI-Powered', color: 'from-slate-800 to-slate-700' },
              { icon: Lock, text: 'Privacy First', color: 'from-emerald-700 to-emerald-600' },
              { icon: TrendingUp, text: 'Smart Charts', color: 'from-slate-800 to-slate-700' }
            ].map((feature, idx) => (
              <div key={idx} className={`flex items-center gap-2 px-4 py-2 bg-gradient-to-r ${feature.color} rounded-lg shadow-lg`}>
                <feature.icon className="w-5 h-5 text-white" />
                <span className="text-white font-bold">{feature.text}</span>
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
          <div className="bg-emerald-50 border border-emerald-300 rounded-2xl p-6 shadow-md">
            <div className="flex items-start gap-4">
              <Shield className="w-6 h-6 text-emerald-600 flex-shrink-0 mt-1" />
              <div>
                <h3 className="text-lg font-bold text-emerald-800 mb-2">Privacy-First Architecture</h3>
                <p className="text-emerald-700 text-sm leading-relaxed">
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
          <div className="bg-white border border-slate-300 rounded-2xl p-8 shadow-lg">
            <h2 className="text-2xl font-bold text-slate-800 mb-6 flex items-center gap-3">
              <FileText className="w-7 h-7 text-slate-700" />
              ✨ Now Supports Excel Files!
            </h2>

            <div className="bg-emerald-50 border border-emerald-300 rounded-lg p-4 mb-6">
              <p className="text-emerald-800 font-bold mb-2">🎉 Direct Upload Support:</p>
              <ul className="text-emerald-700 font-bold text-sm space-y-1 ml-4">
                <li>✅ <strong>Excel:</strong> .XLSX, .XLS files (up to {`{subscription?.plan === "premium" ? "500MB" : "10MB"}`})</li>
                <li>✅ <strong>CSV:</strong> .CSV files</li>
                <li>✅ <strong>Export:</strong> Download as Excel or CSV format</li>
              </ul>
            </div>

            <div className="space-y-6">
              <div className="flex gap-4 items-start">
                <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-slate-800 to-slate-700 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-lg">
                  1
                </div>
                <div>
                  <h3 className="text-lg font-bold text-blue-900 mb-1">Upload Excel Directly</h3>
                  <p className="text-blue-700">Just drag & drop your .XLSX or .XLS file - no conversion needed!</p>
                </div>
              </div>

              <div className="flex gap-4 items-start">
                <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-slate-800 to-slate-700 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-lg">
                  2
                </div>
                <div>
                  <h3 className="text-lg font-bold text-blue-900 mb-1">Analyze & Transform</h3>
                  <p className="text-blue-700">Use AI-powered tools to clean, analyze, and visualize your data</p>
                </div>
              </div>

              <div className="flex gap-4 items-start">
                <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-slate-800 to-slate-700 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-lg">
                  3
                </div>
                <div>
                  <h3 className="text-lg font-bold text-blue-900 mb-1">Export Your Results</h3>
                  <p className="text-blue-700">Download as Excel (.xlsx) or CSV - your choice!</p>
                </div>
              </div>
            </div>

            <div className="mt-6 p-4 bg-amber-50 border border-amber-300 rounded-lg">
              <p className="text-amber-800 text-sm">
                <strong>💡 Free Plan Limit:</strong> 10MB file size<br />
                <strong className="text-emerald-700">✨ Premium Plan:</strong> Unlimited file size (up to 500MB)
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
