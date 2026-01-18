// pages/PdfDocConverter.jsx - Document Converter: PDF↔DOC, DOC↔PDF, PPT↔PDF, PDF↔PPT via developer.meldra.ai (API key required)
import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { FileText, FileType, Upload, Loader2, AlertCircle, Lock, Key } from 'lucide-react';
import {
  convertPdfToDoc,
  convertDocToPdf,
  convertPptToPdf,
  convertPdfToPpt,
  getApiKey,
} from '@/api/meldraDeveloperApi';
import { generateDownloadFilename, downloadBlob } from '@/utils/fileNaming';
import { createPageUrl } from '@/utils';

const MODES = [
  { id: 'pdf2doc', label: 'PDF to DOC', accept: '.pdf', outExt: '.docx', fn: convertPdfToDoc, Icon: FileType },
  { id: 'doc2pdf', label: 'DOC to PDF', accept: '.doc,.docx', outExt: '.pdf', fn: convertDocToPdf, Icon: FileText },
  { id: 'ppt2pdf', label: 'PPT to PDF', accept: '.ppt,.pptx', outExt: '.pdf', fn: convertPptToPdf, Icon: FileText },
  { id: 'pdf2ppt', label: 'PDF to PPT', accept: '.pdf', outExt: '.pptx', fn: convertPdfToPpt, Icon: FileType },
];

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
  const [hasKey, setHasKey] = useState(!!getApiKey());

  useEffect(() => {
    const m = MODES.find((x) => x.id === modeParam);
    setMode(m ? m.id : 'pdf2doc');
  }, [modeParam]);

  useEffect(() => {
    setHasKey(!!getApiKey());
  }, []);

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
    if (!file || !hasKey) return;
    setConverting(true);
    setError('');
    try {
      const blob = await current.fn(file);
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
      ? 'Upload Word (.doc, .docx)'
      : 'Upload PowerPoint (.ppt, .pptx)';

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
            PDF, DOC, and PPT — in-app with your Meldra API key. For API use and testing: developer.meldra.ai.
          </p>
        </div>

        {/* Mode: 4 options */}
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

        {/* API key required */}
        {!hasKey && (
          <Alert className="mb-6 bg-amber-500/10 border-amber-500/40">
            <Key className="h-5 w-5 text-amber-500" />
            <AlertDescription>
              <strong className="text-amber-700 dark:text-amber-300">Meldra API key required.</strong>
              <br />
              Add your key in <Link to={createPageUrl('Security')} className="underline font-semibold text-blue-600 dark:text-blue-400">Security → Meldra API Key</Link>.
              Get a paid key at <a href="https://developer.meldra.ai" target="_blank" rel="noopener noreferrer" className="underline font-semibold">developer.meldra.ai</a>.
            </AlertDescription>
          </Alert>
        )}

        {/* Upload */}
        <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-8 mb-6">
          <label className="flex flex-col items-center justify-center cursor-pointer">
            <input type="file" accept={accept} onChange={handleFileChange} className="hidden" disabled={converting || !hasKey} />
            <div className="w-16 h-16 bg-blue-600 rounded-xl flex items-center justify-center mx-auto mb-4">
              <Upload className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-lg font-bold text-white mb-1">{uploadLabel}</h3>
            <p className="text-slate-300 text-sm">Output: {outExt}</p>
            {file && <p className="text-blue-300 text-sm mt-2 font-medium">{file.name}</p>}
          </label>

          {file && hasKey && (
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
          <Lock className="h-5 w-5 text-blue-500" />
          <AlertDescription className="text-slate-700 dark:text-slate-300">
            <strong className="text-blue-700 dark:text-blue-300">developer.meldra.ai</strong> — PDF↔DOC, DOC↔PDF, PPT↔PDF, PDF↔PPT, and ZIP Cleaner. In-app: use your API key. For programmatic use: get an API key, read the docs, and test on the developer portal.
          </AlertDescription>
        </Alert>
      </div>
    </div>
  );
}
