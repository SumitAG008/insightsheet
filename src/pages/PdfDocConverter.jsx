// pages/PdfDocConverter.jsx - Document Converter: PDF, DOC, PPT (in-app, no API key)
import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { FileText, FileType, Upload, Loader2, AlertCircle, Shield } from 'lucide-react';
import { generateDownloadFilename, downloadBlob } from '@/utils/fileNaming';

const API = import.meta.env.VITE_API_URL || (typeof window !== 'undefined' && window.location.hostname === 'localhost' ? 'http://localhost:8001' : '');
const getToken = () => (typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null) || '';

const MODES = [
  { id: 'pdf2doc', label: 'PDF to DOC', accept: '.pdf', outExt: '.docx', slug: 'pdf-to-doc', Icon: FileType },
  { id: 'doc2pdf', label: 'DOC to PDF', accept: '.docx', outExt: '.pdf', slug: 'doc-to-pdf', Icon: FileText },
  { id: 'ppt2pdf', label: 'PPT to PDF', accept: '.pptx', outExt: '.pdf', slug: 'ppt-to-pdf', Icon: FileText },
  { id: 'pdf2ppt', label: 'PDF to PPT', accept: '.pdf', outExt: '.pptx', slug: 'pdf-to-ppt', Icon: FileType },
];

async function convertViaBackend(file, slug) {
  const form = new FormData();
  form.append('file', file);
  const res = await fetch(`${API}/api/convert/${slug}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${getToken()}` },
    body: form,
  });
  if (!res.ok) {
    const t = await res.text();
    let msg = t;
    try { const j = JSON.parse(t); msg = j.detail || t; } catch (_) {}
    throw new Error(msg || `HTTP ${res.status}`);
  }
  return res.blob();
}

export default function PdfDocConverter() {
  const [searchParams] = useSearchParams();
  const modeParam = searchParams.get('mode');
  const [mode, setMode] = useState(() => {
    const m = MODES.find((x) => x.id === modeParam);
    return m ? m.id : 'pdf2doc';
  });
  const [file, setFile] = useState(null);
  const [converting, setConverting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const m = MODES.find((x) => x.id === modeParam);
    setMode(m ? m.id : 'pdf2doc');
  }, [modeParam]);

  const current = MODES.find((m) => m.id === mode) || MODES[0];
  const accept = current.accept;
  const outExt = current.outExt;

  const handleFileChange = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setError('');
  };

  const handleConvert = async () => {
    if (!file) return;
    if (!API) {
      setError('Backend not configured. Set VITE_API_URL.');
      return;
    }
    setConverting(true);
    setError('');
    try {
      const blob = await convertViaBackend(file, current.slug);
      const name = generateDownloadFilename(file.name, outExt);
      downloadBlob(blob, name);
    } catch (err) {
      setError(err.message || 'Conversion failed.');
    } finally {
      setConverting(false);
    }
  };

  const uploadLabel = current.id.startsWith('pdf')
    ? 'Upload PDF'
    : current.id.startsWith('doc')
      ? 'Upload Word (.docx)'
      : 'Upload PowerPoint (.pptx)';

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 py-12">
      <div className="container mx-auto px-4 max-w-2xl">
        <div className="text-center mb-10">
          <div className="w-20 h-20 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <FileType className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-slate-900 dark:text-white mb-2">
            Document Converter
          </h1>
          <p className="text-slate-600 dark:text-slate-300 font-medium">
            Convert PDF, Word, and PowerPoint. Your file is not stored.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2 rounded-lg border border-slate-200 dark:border-slate-700 p-2 mb-6">
          {MODES.map((m) => {
            const Icon = m.Icon;
            const active = mode === m.id;
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => setMode(m.id)}
                className={`flex items-center justify-center gap-2 py-2.5 rounded-md text-sm font-semibold transition-all ${
                  active ? 'bg-blue-600 text-white' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <Icon className="w-4 h-4" /> {m.label}
              </button>
            );
          })}
        </div>

        <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-8 mb-6">
          <label className="flex flex-col items-center justify-center cursor-pointer">
            <input type="file" accept={accept} onChange={handleFileChange} className="hidden" disabled={converting} />
            <div className="w-16 h-16 bg-blue-600 rounded-xl flex items-center justify-center mx-auto mb-4">
              <Upload className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-lg font-bold text-white mb-1">{uploadLabel}</h3>
            <p className="text-slate-300 text-sm">Output: {outExt}</p>
            {file && <p className="text-blue-300 text-sm mt-2 font-medium">{file.name}</p>}
          </label>

          {file && (
            <Button
              onClick={handleConvert}
              disabled={converting}
              className="w-full mt-6 bg-blue-600 hover:bg-blue-700 text-white font-bold"
            >
              {converting ? <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Converting…</> : <>Convert & Download</>}
            </Button>
          )}

          {error && (
            <Alert className="mt-4 bg-red-500/10 border-red-500/30">
              <AlertCircle className="h-4 w-4 text-red-400" />
              <AlertDescription className="text-red-300">{error}</AlertDescription>
            </Alert>
          )}
        </div>

        <Alert className="bg-blue-500/10 border-blue-500/30">
          <Shield className="h-5 w-5 text-blue-500" />
          <AlertDescription className="text-slate-700 dark:text-slate-300">
            Conversions run on our servers. Your file is not stored.
          </AlertDescription>
        </Alert>
      </div>
    </div>
  );
}
