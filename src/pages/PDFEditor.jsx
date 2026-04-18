// pages/PDFEditor.js - PDF tools page (Form Filler, Merge, Split)
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { UploadFile } from '@/api/integrations';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FileText, Download, Upload as UploadIcon, AlertCircle, Shield, Scissors, Copy, Plus } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { backendApi } from '@/api/meldraClient';

// Helper to make authenticated fetch request directly
const authFetch = async (endpoint, options = {}) => {
  const API_URL = import.meta.env.VITE_API_URL || (window.location.hostname === 'localhost' ? 'http://localhost:8001' : '');
  const token = localStorage.getItem('auth_token');
  const headers = { ...options.headers };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  
  const res = await fetch(`${API_URL}${endpoint}`, { ...options, headers });
  if (!res.ok) throw new Error(await res.text());
  return res;
};

export default function PDFEditor() {
  const [activeTab, setActiveTab] = useState('merge'); // 'merge', 'split'

  // --- Merge State ---
  const [mergeFiles, setMergeFiles] = useState([]);
  const [isMerging, setIsMerging] = useState(false);

  // --- Split State ---
  const [splitFile, setSplitFile] = useState(null);
  const [splitRanges, setSplitRanges] = useState('');
  const [isSplitting, setIsSplitting] = useState(false);

  const navigate = useNavigate();

  // --- Merge Handlers ---
  const handleMergeUpload = (e) => {
    const files = Array.from(e.target.files).filter(f => f.name.toLowerCase().endsWith('.pdf'));
    if (files.length === 0) return;
    setMergeFiles(prev => [...prev, ...files]);
  };

  const removeMergeFile = (index) => {
    setMergeFiles(prev => prev.filter((_, i) => i !== index));
  };

  const executeMerge = async () => {
    if (mergeFiles.length < 2) {
      alert('Please select at least 2 PDFs to merge.');
      return;
    }
    setIsMerging(true);
    try {
      const formData = new FormData();
      mergeFiles.forEach(f => formData.append('files', f));
      
      const res = await authFetch('/api/pdf/merge', {
        method: 'POST',
        body: formData,
      });
      
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `merged_${Date.now()}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      alert('Error merging PDFs: ' + error.message);
    }
    setIsMerging(false);
  };

  // --- Split Handlers ---
  const handleSplitUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      alert('Please upload a PDF file only');
      return;
    }
    setSplitFile(file);
  };

  const executeSplit = async () => {
    if (!splitFile) {
      alert('Please select a PDF file first.');
      return;
    }
    if (!splitRanges.trim()) {
      alert('Please enter page ranges (e.g., 1-3,5).');
      return;
    }
    setIsSplitting(true);
    try {
      const formData = new FormData();
      formData.append('file', splitFile);
      formData.append('page_ranges', splitRanges);
      
      const res = await authFetch('/api/pdf/split', {
        method: 'POST',
        body: formData,
      });
      
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `split_${Date.now()}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      alert('Error splitting PDF: ' + error.message);
    }
    setIsSplitting(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50 to-indigo-50 p-6">
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-30">
        <div className="absolute top-1/4 -left-20 w-96 h-96 bg-purple-300 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-indigo-300 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 container mx-auto max-w-7xl">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-slate-800 mb-3">
            PDF Tools & Editor
          </h1>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            Fill forms, merge multiple PDFs, or split documents
          </p>
        </div>

        {/* Tabs */}
        <div className="flex justify-center mb-8 gap-4">
          <Button 
            variant={activeTab === 'merge' ? 'default' : 'outline'}
            onClick={() => setActiveTab('merge')}
            className={activeTab === 'merge' ? 'bg-purple-600 hover:bg-purple-700' : ''}
          >
            <Copy className="w-4 h-4 mr-2" /> Merge PDFs
          </Button>
          <Button 
            variant={activeTab === 'split' ? 'default' : 'outline'}
            onClick={() => setActiveTab('split')}
            className={activeTab === 'split' ? 'bg-purple-600 hover:bg-purple-700' : ''}
          >
            <Scissors className="w-4 h-4 mr-2" /> Split PDF
          </Button>
        </div>

        {/* Privacy Notice */}
        <Alert className="mb-6 bg-blue-50 border-blue-200 max-w-4xl mx-auto">
          <Shield className="h-5 w-5 text-blue-600" />
          <AlertDescription className="text-slate-700">
            <strong className="text-blue-700">Privacy First:</strong> Your PDFs are processed securely. 
            We never store your files on our servers.
          </AlertDescription>
        </Alert>

        {/* Tab Contents */}
        <div className="max-w-4xl mx-auto">

          {/* MERGE TAB */}
          {activeTab === 'merge' && (
            <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-8">
              <h2 className="text-2xl font-bold text-slate-800 mb-6 text-center">Merge Multiple PDFs</h2>
              
              <div className="space-y-4 mb-6">
                {mergeFiles.map((f, i) => (
                  <div key={i} className="flex justify-between items-center bg-slate-50 p-4 rounded-lg border border-slate-200">
                    <div className="flex items-center gap-3">
                      <FileText className="text-purple-600 w-6 h-6" />
                      <span className="font-medium text-slate-700 truncate max-w-[200px] sm:max-w-md">{f.name}</span>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => removeMergeFile(i)} className="text-red-500 hover:text-red-700 hover:bg-red-50">Remove</Button>
                  </div>
                ))}
              </div>

              <div className="flex flex-col sm:flex-row justify-center gap-4">
                <label className="cursor-pointer inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ring-offset-background border border-slate-300 text-slate-700 hover:bg-slate-100 h-10 py-2 px-4">
                  <input type="file" multiple accept=".pdf" onChange={handleMergeUpload} className="hidden" />
                  <Plus className="w-4 h-4 mr-2" /> Add PDFs
                </label>
                
                <Button 
                  onClick={executeMerge} 
                  disabled={mergeFiles.length < 2 || isMerging}
                  className="bg-purple-600 hover:bg-purple-700 text-white"
                >
                  <Copy className="w-4 h-4 mr-2" /> {isMerging ? 'Merging...' : 'Merge PDFs'}
                </Button>
              </div>
            </div>
          )}

          {/* SPLIT TAB */}
          {activeTab === 'split' && (
            <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-8">
              <h2 className="text-2xl font-bold text-slate-800 mb-6 text-center">Split or Extract PDF Pages</h2>
              
              <div className="mb-6 text-center">
                {!splitFile ? (
                   <label className="cursor-pointer inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ring-offset-background border border-slate-300 text-slate-700 hover:bg-slate-100 h-10 py-2 px-4">
                     <input type="file" accept=".pdf" onChange={handleSplitUpload} className="hidden" />
                     <UploadIcon className="w-4 h-4 mr-2" /> Select PDF to Split
                   </label>
                ) : (
                  <div className="flex flex-col items-center gap-4">
                    <div className="flex items-center gap-3 bg-slate-50 p-4 rounded-lg border border-slate-200 w-full max-w-md justify-center">
                      <FileText className="text-purple-600 w-6 h-6" />
                      <span className="font-medium text-slate-700 truncate max-w-[200px]">{splitFile.name}</span>
                      <Button variant="ghost" size="sm" onClick={() => setSplitFile(null)} className="text-red-500 hover:text-red-700 hover:bg-red-50 ml-auto">Change</Button>
                    </div>
                    
                    <div className="w-full max-w-md space-y-2 text-left">
                      <label className="text-sm font-medium text-slate-700">Pages to Extract (e.g., 1-3,5,7-10)</label>
                      <Input 
                        placeholder="1-3,5,7" 
                        value={splitRanges} 
                        onChange={(e) => setSplitRanges(e.target.value)} 
                        className="border-slate-300"
                      />
                    </div>

                    <Button 
                      onClick={executeSplit} 
                      disabled={!splitRanges.trim() || isSplitting}
                      className="bg-purple-600 hover:bg-purple-700 text-white w-full max-w-md mt-4"
                    >
                      <Scissors className="w-4 h-4 mr-2" /> {isSplitting ? 'Splitting...' : 'Extract Pages'}
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}