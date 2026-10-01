// pages/PDFEditor.js - PDF tools page (Form Filler, Merge, Split)
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { UploadFile } from '@/api/integrations';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FileText, Download, Upload as UploadIcon, AlertCircle, Shield, Scissors, Copy, Plus, PenLine } from 'lucide-react';
import PdfEditTab from '@/components/pdf/PdfEditTab';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { backendApi } from '@/api/meldraClient';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();

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
  const [activeTab, setActiveTab] = useState('edit'); // 'edit', 'merge', 'split'

  // --- Merge State ---
  const [mergeFiles, setMergeFiles] = useState([]);
  const [isMerging, setIsMerging] = useState(false);

  // --- Split State ---
  const [splitFile, setSplitFile] = useState(null);
  const [splitFileUrl, setSplitFileUrl] = useState(null);
  const [numPages, setNumPages] = useState(null);
  const [selectedPages, setSelectedPages] = useState(new Set());
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
    setSplitFileUrl(URL.createObjectURL(file));
    setSelectedPages(new Set());
    setNumPages(null);
  };

  const togglePageSelection = (pageNumber) => {
    const newSelected = new Set(selectedPages);
    if (newSelected.has(pageNumber)) {
      newSelected.delete(pageNumber);
    } else {
      newSelected.add(pageNumber);
    }
    setSelectedPages(newSelected);
  };
  
  const selectAllPages = () => {
    if (!numPages) return;
    const all = new Set(Array.from({ length: numPages }, (_, i) => i + 1));
    setSelectedPages(all);
  };
  
  const clearSelection = () => {
    setSelectedPages(new Set());
  };

  const executeSplit = async () => {
    if (!splitFile) {
      alert('Please select a PDF file first.');
      return;
    }
    if (selectedPages.size === 0) {
      alert('Please select at least one page to extract.');
      return;
    }
    
    // Sort array of selected pages
    const sortedPages = Array.from(selectedPages).sort((a, b) => a - b);
    const splitRanges = sortedPages.join(',');

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
            Fill and edit any PDF or photo of a form, merge PDFs, or split documents
          </p>
        </div>

        {/* Tabs */}
        <div className="flex justify-center mb-8 gap-4">
          <Button
            variant={activeTab === 'edit' ? 'default' : 'outline'}
            onClick={() => setActiveTab('edit')}
            className={activeTab === 'edit' ? 'bg-purple-600 hover:bg-purple-700' : ''}
          >
            <PenLine className="w-4 h-4 mr-2" /> Edit & Fill
          </Button>
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

        {activeTab === 'edit' && (
          <div className="max-w-6xl mx-auto mb-8">
            <PdfEditTab />
          </div>
        )}

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
                  <div className="flex flex-col items-center gap-4 w-full">
                    <div className="flex items-center gap-3 bg-slate-50 p-4 rounded-lg border border-slate-200 w-full max-w-md justify-center">
                      <FileText className="text-purple-600 w-6 h-6" />
                      <span className="font-medium text-slate-700 truncate max-w-[200px]">{splitFile.name}</span>
                      <Button variant="ghost" size="sm" onClick={() => { setSplitFile(null); setSplitFileUrl(null); }} className="text-red-500 hover:text-red-700 hover:bg-red-50 ml-auto">Change</Button>
                    </div>
                    
                    {splitFileUrl && (
                      <div className="w-full mt-2 bg-white p-4 rounded-xl border border-slate-200 shadow-inner">
                        <div className="flex justify-between items-center mb-4 border-b border-slate-100 pb-2">
                          <h3 className="font-semibold text-slate-800">Select Pages to Extract/Keep</h3>
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline" onClick={selectAllPages}>Select All</Button>
                            <Button size="sm" variant="outline" onClick={clearSelection}>Clear</Button>
                          </div>
                        </div>
                        
                        <div className="h-[400px] overflow-y-auto bg-slate-50 rounded-lg p-6 border border-slate-200">
                          <Document
                            file={splitFileUrl}
                            onLoadSuccess={({ numPages }) => {
                               setNumPages(numPages);
                               const all = new Set(Array.from({ length: numPages }, (_, i) => i + 1));
                               setSelectedPages(all);
                            }}
                            className="flex flex-wrap gap-6 justify-center"
                            loading={<div className="flex justify-center w-full py-10"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div></div>}
                          >
                            {Array.from(new Array(numPages), (el, index) => (
                              <div 
                                key={`page_${index + 1}`}
                                onClick={() => togglePageSelection(index + 1)}
                                className={`relative cursor-pointer transition-all duration-200 rounded-lg overflow-hidden border-4 ${
                                  selectedPages.has(index + 1) 
                                    ? 'border-purple-600 shadow-lg shadow-purple-200 scale-105' 
                                    : 'border-transparent opacity-50 hover:opacity-100 hover:border-purple-300'
                                }`}
                              >
                                <div className={`absolute top-2 left-2 z-10 px-2 py-1 rounded text-xs font-bold shadow transition-colors ${selectedPages.has(index + 1) ? 'bg-purple-600 text-white' : 'bg-white/90 text-slate-800'}`}>
                                  Page {index + 1}
                                </div>
                                {selectedPages.has(index + 1) && (
                                  <div className="absolute inset-0 bg-purple-600/10 z-0 pointer-events-none" />
                                )}
                                <div className="bg-white pointer-events-none">
                                  <Page 
                                    pageNumber={index + 1} 
                                    width={160} 
                                    renderTextLayer={false} 
                                    renderAnnotationLayer={false}
                                    className="shadow-sm"
                                  />
                                </div>
                              </div>
                            ))}
                          </Document>
                        </div>
                        <p className="text-sm font-medium text-slate-600 mt-4 text-center">
                          {selectedPages.size} of {numPages || 0} pages selected for extraction
                        </p>
                      </div>
                    )}

                    <Button 
                      onClick={executeSplit} 
                      disabled={selectedPages.size === 0 || isSplitting}
                      className="bg-purple-600 hover:bg-purple-700 text-white w-full max-w-md mt-4 text-lg py-6 shadow-xl shadow-purple-600/20"
                    >
                      <Scissors className="w-5 h-5 mr-2" /> {isSplitting ? 'Processing...' : 'Extract Selected Pages'}
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