// pages/PdfDocConverter.jsx - PDF to DOC & DOC to PDF via developer.meldra.ai (Meldra API key required, paid)
import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { FileText, FileType, Upload, Loader2, AlertCircle, Lock, Key } from 'lucide-react';
import { convertPdfToDoc, convertDocToPdf, getApiKey } from '@/api/meldraDeveloperApi';
import { generateDownloadFilename, downloadBlob } from '@/utils/fileNaming';
import { createPageUrl } from '@/utils';

export default function PdfDocConverter() {
  const [searchParams] = useSearchParams();
  const modeParam = searchParams.get('mode'); // pdf2doc | doc2pdf
  const [mode, setMode] = useState(modeParam === 'doc2pdf' ? 'doc2pdf' : 'pdf2doc');
  const [file, setFile] = useState(null);
  const [converting, setConverting] = useState(false);
  const [error, setError] = useState('');
  const [hasKey, setHasKey] = useState(!!getApiKey());

  useEffect(() => {
    setMode(modeParam === 'doc2pdf' ? 'doc2pdf' : 'pdf2doc');
  }, [modeParam]);

  useEffect(() => {
    setHasKey(!!getApiKey());
  }, []);

  const isPdfToDoc = mode === 'pdf2doc';
  const accept = isPdfToDoc ? '.pdf' : '.doc,.docx';
  const outExt = isPdfToDoc ? '.docx' : '.pdf';

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
      const blob = isPdfToDoc
        ? await convertPdfToDoc(file)
        : await convertDocToPdf(file);
      const name = generateDownloadFilename(file.name, outExt);
      downloadBlob(blob, name);
    } catch (err) {
      setError(err.message || 'Conversion failed.');
    } finally {
      setConverting(false);
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 py-12">
      <div className="container mx-auto px-4 max-w-2xl">
        <div className="text-center mb-10">
          <div className="w-20 h-20 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <FileType className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-slate-900 dark:text-white mb-2">
            PDF ↔ DOC
          </h1>
          <p className="text-slate-600 dark:text-slate-300 font-medium">
            Convert between PDF and Word via developer.meldra.ai. Requires a paid Meldra API key.
          </p>
        </div>

        {/* Mode toggle */}
        <div className="flex rounded-lg border border-slate-200 dark:border-slate-700 p-1 mb-6">
          <button
            type="button"
            onClick={() => setMode('pdf2doc')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-md text-sm font-semibold transition-all ${isPdfToDoc ? 'bg-blue-600 text-white' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
          >
            <FileText className="w-4 h-4" /> PDF to DOC
          </button>
          <button
            type="button"
            onClick={() => setMode('doc2pdf')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-md text-sm font-semibold transition-all ${!isPdfToDoc ? 'bg-blue-600 text-white' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
          >
            <FileType className="w-4 h-4" /> DOC to PDF
          </button>
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
            <h3 className="text-lg font-bold text-white mb-1">
              {isPdfToDoc ? 'Upload PDF' : 'Upload Word (.doc, .docx)'}
            </h3>
            <p className="text-slate-300 text-sm">{isPdfToDoc ? 'Output: .docx' : 'Output: .pdf'}</p>
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
            <strong className="text-blue-700 dark:text-blue-300">developer.meldra.ai</strong> — File conversion and ZIP Cleaner APIs require a paid Meldra API key. Keys and usage at <a href="https://developer.meldra.ai" target="_blank" rel="noopener noreferrer" className="underline">developer.meldra.ai</a>.
          </AlertDescription>
        </Alert>
      </div>
    </div>
  );
}
