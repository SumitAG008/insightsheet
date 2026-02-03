/**
 * Interactive API Testing Console
 * Allows users to test API endpoints with their API key
 */
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Play, CheckCircle2, XCircle, FileText, FileArchive } from 'lucide-react';

const PROXY_URL = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL)
  ? `${import.meta.env.VITE_API_URL}/api/developer/proxy`
  : '/api/developer/proxy';

const ENDPOINTS = [
  {
    id: 'pdf-to-doc',
    name: 'PDF → DOC',
    method: 'POST',
    path: '/v1/convert/pdf-to-doc',
    icon: FileText,
    description: 'Convert PDF to DOCX',
    acceptFile: '.pdf',
  },
  {
    id: 'doc-to-pdf',
    name: 'DOC → PDF',
    method: 'POST',
    path: '/v1/convert/doc-to-pdf',
    icon: FileText,
    description: 'Convert DOC/DOCX to PDF',
    acceptFile: '.doc,.docx',
  },
  {
    id: 'ppt-to-pdf',
    name: 'PPT → PDF',
    method: 'POST',
    path: '/v1/convert/ppt-to-pdf',
    icon: FileText,
    description: 'Convert PPT/PPTX to PDF',
    acceptFile: '.ppt,.pptx',
  },
  {
    id: 'pdf-to-ppt',
    name: 'PDF → PPT',
    method: 'POST',
    path: '/v1/convert/pdf-to-ppt',
    icon: FileText,
    description: 'Convert PDF to PPTX',
    acceptFile: '.pdf',
  },
  {
    id: 'zip-clean',
    name: 'ZIP Cleaner',
    method: 'POST',
    path: '/v1/zip/clean',
    icon: FileArchive,
    description: 'Clean ZIP file names',
    acceptFile: '.zip',
  },
];

export default function ApiTestingConsole() {
  const [apiKey, setApiKey] = useState('');
  const [selectedEndpoint, setSelectedEndpoint] = useState(ENDPOINTS[0]);
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const getFilenameFromHeaders = (headers) => {
    const cd = headers?.get?.('content-disposition') || '';
    const match = cd.match(/filename\*=UTF-8''([^;]+)|filename="?([^";]+)"?/i);
    const raw = decodeURIComponent((match?.[1] || match?.[2] || '').trim());
    return raw || null;
  };

  const getExtension = (contentType, endpointId) => {
    const ct = (contentType || '').toLowerCase();
    if (ct.includes('application/pdf')) return 'pdf';
    if (ct.includes('application/zip')) return 'zip';
    if (ct.includes('wordprocessingml.document')) return 'docx';
    if (ct.includes('presentationml.presentation')) return 'pptx';
    // Fallback by endpoint (more reliable than blob.type)
    if (endpointId === 'pdf-to-doc') return 'docx';
    if (endpointId === 'pdf-to-ppt') return 'pptx';
    if (endpointId === 'doc-to-pdf' || endpointId === 'ppt-to-pdf') return 'pdf';
    if (endpointId === 'zip-clean') return 'zip';
    return 'bin';
  };

  const handleTest = async () => {
    if (!apiKey.trim()) {
      setError('API key is required');
      return;
    }
    if (!file) {
      setError('Please select a file');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('endpoint', selectedEndpoint.id);
      formData.append('api_key', apiKey.trim());
      formData.append('file', file);

      const response = await fetch(PROXY_URL, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => null);
        const errorText = errJson?.detail || (await response.text().catch(() => ''));
        throw new Error(`HTTP ${response.status}: ${errorText || response.statusText}`);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const contentType = response.headers.get('content-type') || '';
      const headerFilename = getFilenameFromHeaders(response.headers);
      const ext = getExtension(contentType, selectedEndpoint.id);
      
      setResult({
        success: true,
        status: response.status,
        contentType,
        size: blob.size,
        downloadUrl: url,
        filename: headerFilename || `${selectedEndpoint.id}_result.${ext}`,
      });
    } catch (err) {
      setError(err.message || 'Request failed');
      setResult({
        success: false,
        error: err.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (result?.downloadUrl) {
      const a = document.createElement('a');
      a.href = result.downloadUrl;
      a.download = result.filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Test API Endpoints</CardTitle>
        <CardDescription>
          Enter your API key and test any endpoint. Your API key is required and will be sent securely.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* API Key Input */}
        <div>
          <label className="text-sm font-medium mb-2 block">API Key (Required)</label>
          <Input
            type="password"
            placeholder="meldra_xxxxxxxxxxxxx"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            className="font-mono"
          />
          <p className="text-xs text-muted-foreground mt-1">
            Get your API key from <a href="mailto:support@meldra.ai" className="text-blue-600 hover:underline">support@meldra.ai</a>
          </p>
        </div>

        {/* Endpoint Selection */}
        <div>
          <label className="text-sm font-medium mb-2 block">Select Endpoint</label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {ENDPOINTS.map((ep) => {
              const Icon = ep.icon;
              return (
                <button
                  key={ep.id}
                  onClick={() => setSelectedEndpoint(ep)}
                  className={`p-3 border rounded-lg text-left transition-colors ${
                    selectedEndpoint.id === ep.id
                      ? 'border-blue-600 bg-blue-50'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Icon className="w-4 h-4 text-blue-600" />
                    <div>
                      <div className="font-medium text-sm">{ep.name}</div>
                      <div className="text-xs text-muted-foreground">{ep.description}</div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* File Input */}
        <div>
          <label className="text-sm font-medium mb-2 block">File</label>
          <Input
            type="file"
            accept={selectedEndpoint.acceptFile}
            onChange={(e) => setFile(e.target.files?.[0] || null)}
          />
          {file && (
            <p className="text-xs text-muted-foreground mt-1">
              Selected: {file.name} ({(file.size / 1024).toFixed(2)} KB)
            </p>
          )}
        </div>

        {/* Test Button */}
        <Button
          onClick={handleTest}
          disabled={loading || !apiKey || !file}
          className="w-full"
          size="lg"
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Testing...
            </>
          ) : (
            <>
              <Play className="mr-2 h-4 w-4" />
              Test API
            </>
          )}
        </Button>

        {/* Error Display */}
        {error && (
          <Alert variant="destructive">
            <XCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Success Result */}
        {result?.success && (
          <Alert className="bg-green-50 border-green-200">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              <div className="space-y-2">
                <p><strong>Success!</strong> Request completed.</p>
                <div className="text-sm space-y-1">
                  <p>Status: {result.status}</p>
                  <p>Content-Type: {result.contentType}</p>
                  <p>Size: {(result.size / 1024).toFixed(2)} KB</p>
                </div>
                <Button onClick={handleDownload} size="sm" className="mt-2">
                  Download Result
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Request Info */}
        {selectedEndpoint && (
          <div className="bg-slate-50 p-3 rounded-lg text-xs font-mono">
            <div className="text-slate-600 mb-1">Request:</div>
            <div className="text-blue-700">
              POST {PROXY_URL} (endpoint={selectedEndpoint.id})
            </div>
            <div className="text-slate-600 mt-2">Headers:</div>
            <div className="text-blue-700">X-API-Key: (sent in form body)</div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
