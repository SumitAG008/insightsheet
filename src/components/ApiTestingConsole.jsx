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
    id: 'ocr-to-doc',
    name: 'OCR → DOC',
    method: 'POST',
    path: '/v1/ocr/to-doc',
    icon: FileText,
    description: 'OCR a PDF/Image and export to DOCX (best for scanned forms)',
    acceptFile: '.pdf,.png,.jpg,.jpeg,.webp,.bmp,.tif,.tiff',
  },
  {
    id: 'ocr-to-pdf',
    name: 'OCR → PDF',
    method: 'POST',
    path: '/v1/ocr/to-pdf',
    icon: FileText,
    description: 'OCR a PDF/Image and export to a searchable PDF',
    acceptFile: '.pdf,.png,.jpg,.jpeg,.webp,.bmp,.tif,.tiff',
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
  {
    id: 'ai-invoke-with-file',
    name: 'AI: Invoke with File',
    method: 'POST',
    path: '/v1/ai/invoke-with-file',
    icon: FileText,
    description: 'Run AI analysis with uploaded file context (JSON response)',
    acceptFile: '.pdf,.docx,.pptx,.md,.xlsx,.xls',
    responseType: 'json',
  },
  {
    id: 'pl-generate-with-file',
    name: 'AI: Generate P&L with File',
    method: 'POST',
    path: '/v1/files/generate-pl-with-file',
    icon: FileText,
    description: 'Generate P&L XLSX with uploaded file context (binary)',
    acceptFile: '.pdf,.docx,.pptx,.md,.xlsx,.xls',
    responseType: 'blob',
  },
  {
    id: 'support-chat-with-file',
    name: 'Support: Chat with File',
    method: 'POST',
    path: '/v1/support/chat-with-file',
    icon: FileText,
    description: 'KB-grounded support assistant with uploaded file context (JSON response)',
    acceptFile: '.pdf,.docx,.pptx,.md,.xlsx,.xls',
    responseType: 'json',
  },
];

export default function ApiTestingConsole() {
  const [apiKey, setApiKey] = useState('');
  const [selectedEndpoint, setSelectedEndpoint] = useState(ENDPOINTS[0]);
  const [file, setFile] = useState(null);
  const [prompt, setPrompt] = useState('');
  const [jsonPayload, setJsonPayload] = useState('');
  const [message, setMessage] = useState('');
  const [pdfDocMode, setPdfDocMode] = useState('auto');
  const [ocrLang, setOcrLang] = useState('eng');
  const [ocrMaxPages, setOcrMaxPages] = useState('10');
  const [ocrTimeoutSeconds, setOcrTimeoutSeconds] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const getClientTimeoutMs = () => {
    const raw = String(ocrTimeoutSeconds || '').trim();
    const n = Number(raw);
    if (Number.isFinite(n) && n > 0) {
      return Math.max(10, n + 30) * 1000;
    }
    return 240 * 1000;
  };

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

    if (selectedEndpoint.id === 'ai-invoke-with-file' && !prompt.trim()) {
      setError('Prompt is required for AI Invoke');
      return;
    }

    if (selectedEndpoint.id === 'support-chat-with-file' && !message.trim()) {
      setError('Message is required for Support Chat');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('api_key', apiKey.trim());
      formData.append('file', file);

      let url = PROXY_URL;
      if (selectedEndpoint.id === 'ai-invoke-with-file') {
        url = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL)
          ? `${import.meta.env.VITE_API_URL}/api/developer/ai/invoke-with-file`
          : '/api/developer/ai/invoke-with-file';
        formData.append('prompt', prompt);
        if (jsonPayload.trim()) {
          // jsonPayload is expected to be a JSON schema string
          formData.append('response_json_schema', jsonPayload.trim());
        }
      } else if (selectedEndpoint.id === 'pl-generate-with-file') {
        url = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL)
          ? `${import.meta.env.VITE_API_URL}/api/developer/files/generate-pl-with-file`
          : '/api/developer/files/generate-pl-with-file';
        formData.append('prompt', prompt || 'Generate a P&L');
        if (jsonPayload.trim()) {
          // jsonPayload is expected to be a context JSON string
          formData.append('context_json', jsonPayload.trim());
        }
      } else if (selectedEndpoint.id === 'support-chat-with-file') {
        url = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL)
          ? `${import.meta.env.VITE_API_URL}/api/developer/support/chat-with-file`
          : '/api/developer/support/chat-with-file';
        formData.append('message', message);
        if (jsonPayload.trim()) {
          // jsonPayload is expected to be a page string or JSON; we pass as page if it's not JSON.
          formData.append('page', jsonPayload.trim());
        }
      } else {
        formData.append('endpoint', selectedEndpoint.id);
        if (selectedEndpoint.id === 'pdf-to-doc') {
          formData.append('mode', pdfDocMode);
        }
        if (selectedEndpoint.id === 'ocr-to-doc' || selectedEndpoint.id === 'ocr-to-pdf') {
          if ((ocrLang || '').trim()) {
            formData.append('ocr_lang', (ocrLang || '').trim());
          }
          const mp = String(ocrMaxPages || '').trim();
          if (mp) {
            formData.append('max_pages', mp);
          }
          const ts = String(ocrTimeoutSeconds || '').trim();
          if (ts) {
            formData.append('timeout_seconds', ts);
          }
        }
        url = PROXY_URL;
      }

      const controller = new AbortController();
      const timeoutMs = getClientTimeoutMs();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      let response;
      try {
        response = await fetch(url, {
          method: 'POST',
          body: formData,
          signal: controller.signal,
        });
      } finally {
        clearTimeout(timeoutId);
      }

      if (!response.ok) {
        const errJson = await response.json().catch(() => null);
        const errorText = errJson?.detail || (await response.text().catch(() => ''));
        throw new Error(`HTTP ${response.status}: ${errorText || response.statusText}`);
      }

      const contentType = response.headers.get('content-type') || '';

      if (selectedEndpoint.responseType === 'json') {
        const data = await response.json().catch(() => null);
        setResult({
          success: true,
          status: response.status,
          contentType,
          json: data,
        });
      } else {
        const blob = await response.blob();
        const blobUrl = window.URL.createObjectURL(blob);
        const headerFilename = getFilenameFromHeaders(response.headers);
        const ext = getExtension(contentType, selectedEndpoint.id);

        setResult({
          success: true,
          status: response.status,
          contentType,
          size: blob.size,
          downloadUrl: blobUrl,
          filename: headerFilename || `${selectedEndpoint.id}_result.${ext}`,
          requestUrl: url,
        });
      }
    } catch (err) {
      const aborted = err?.name === 'AbortError' || /aborted/i.test(String(err?.message || ''));
      const msg = aborted
        ? `Request timed out in the browser. Try increasing Timeout Seconds, or check Railway logs for the underlying OCR timeout.`
        : (err.message || 'Request failed');
      setError(msg);
      setResult({
        success: false,
        error: msg,
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

        {(selectedEndpoint.id === 'ai-invoke-with-file' || selectedEndpoint.id === 'pl-generate-with-file') && (
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium mb-2 block">Prompt</label>
              <Input
                type="text"
                placeholder={selectedEndpoint.id === 'pl-generate-with-file' ? 'Generate a P&L from this context...' : 'Ask the AI to analyze the uploaded file...'}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">
                {selectedEndpoint.id === 'ai-invoke-with-file' ? 'Response JSON Schema (optional)' : 'Context JSON (optional)'}
              </label>
              <Input
                type="text"
                placeholder={selectedEndpoint.id === 'ai-invoke-with-file' ? '{"type":"object",...}' : '{"company_name":"..."}'}
                value={jsonPayload}
                onChange={(e) => setJsonPayload(e.target.value)}
              />
            </div>
          </div>
        )}

        {selectedEndpoint.id === 'pdf-to-doc' && (
          <div>
            <label className="text-sm font-medium mb-2 block">Mode</label>
            <select
              value={pdfDocMode}
              onChange={(e) => setPdfDocMode(e.target.value)}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
            >
              <option value="auto">Auto</option>
              <option value="editable">Editable</option>
              <option value="exact">Exact</option>
            </select>
          </div>
        )}

        {(selectedEndpoint.id === 'ocr-to-doc' || selectedEndpoint.id === 'ocr-to-pdf') && (
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium mb-2 block">OCR Language (optional)</label>
              <Input
                type="text"
                placeholder="eng"
                value={ocrLang}
                onChange={(e) => setOcrLang(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <div>
                <label className="text-sm font-medium mb-2 block">Max Pages (PDF only)</label>
                <Input
                  type="number"
                  min="1"
                  placeholder="10"
                  value={ocrMaxPages}
                  onChange={(e) => setOcrMaxPages(e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Timeout Seconds (optional)</label>
                <Input
                  type="number"
                  min="10"
                  placeholder=""
                  value={ocrTimeoutSeconds}
                  onChange={(e) => setOcrTimeoutSeconds(e.target.value)}
                />
              </div>
            </div>
          </div>
        )}

        {selectedEndpoint.id === 'support-chat-with-file' && (
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium mb-2 block">Message</label>
              <Input
                type="text"
                placeholder="Ask about onboarding, API keys, limits, troubleshooting..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Page (optional)</label>
              <Input
                type="text"
                placeholder="/developers"
                value={jsonPayload}
                onChange={(e) => setJsonPayload(e.target.value)}
              />
            </div>
          </div>
        )}

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
                  {typeof result.size === 'number' && <p>Size: {(result.size / 1024).toFixed(2)} KB</p>}
                </div>
                {result.downloadUrl && (
                  <Button onClick={handleDownload} size="sm" className="mt-2">
                    Download Result
                  </Button>
                )}
                {result.json && (
                  <pre className="text-xs bg-white border border-green-200 rounded p-2 overflow-auto max-h-56 whitespace-pre-wrap">
                    {JSON.stringify(result.json, null, 2)}
                  </pre>
                )}
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Request Info */}
        {selectedEndpoint && (
          <div className="bg-slate-50 p-3 rounded-lg text-xs font-mono">
            <div className="text-slate-600 mb-1">Request:</div>
            <div className="text-blue-700">
              {selectedEndpoint.id === 'ai-invoke-with-file'
                ? `POST ${PROXY_URL.replace('/api/developer/proxy', '/api/developer/ai/invoke-with-file')}`
                : selectedEndpoint.id === 'pl-generate-with-file'
                ? `POST ${PROXY_URL.replace('/api/developer/proxy', '/api/developer/files/generate-pl-with-file')}`
                : selectedEndpoint.id === 'support-chat-with-file'
                ? `POST ${PROXY_URL.replace('/api/developer/proxy', '/api/developer/support/chat-with-file')}`
                : `POST ${PROXY_URL} (endpoint=${selectedEndpoint.id})`}
            </div>
            <div className="text-slate-600 mt-2">Headers:</div>
            <div className="text-blue-700">X-API-Key: (sent in form body)</div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
