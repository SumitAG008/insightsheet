// developer.meldra.ai — Amadeus-style positioning: Products, API reference, changelog, pricing.
// Meldra UI/UX only. On developer.meldra.ai: Pricing/Login/Register link to insight; only this page.
import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import CookieConsent from '@/components/CookieConsent';
import Logo from '@/components/branding/Logo';
import {
  Key, FileText, FileArchive, Mail, ArrowRight, CheckCircle, Shield, Briefcase,
  ChevronDown, ChevronRight, BookOpen, Download, HelpCircle, Layers, Terminal,
} from 'lucide-react';
import ApiTestingConsole from '@/components/ApiTestingConsole';

const INSIGHT = 'https://insight.meldra.ai';

const getSidebarLinks = (isApiDev) => {
  const base = [
    { id: 'get-started', label: 'Get started' },
    { id: 'authentication', label: 'Authentication' },
    { id: 'reference', label: 'API reference' },
    { id: 'endpoints', label: 'Endpoints' },
  ];
  
  if (isApiDev) {
    return [
      ...base,
      { id: 'test-api', label: 'Test API' },
      { id: 'changelog', label: 'Changelog' },
    ];
  }
  
  return [
    ...base,
    { id: 'usage-tracking', label: 'Usage & Billing' },
    { id: 'changelog', label: 'Changelog' },
    { id: 'commercial', label: 'Commercial use' },
    { id: 'pricing', label: 'Pricing' },
  ];
};

const ENDPOINTS = [
  { 
    method: 'POST', 
    path: '/v1/convert/pdf-to-doc', 
    name: 'PDF → DOC', 
    body: 'file: PDF (multipart/form-data)', 
    Icon: FileText, 
    id: 'pdf-to-doc',
    description: 'Convert PDF files to Microsoft Word (.docx) format',
    requestExample: `curl -X POST "https://api.developer.meldra.ai/v1/convert/pdf-to-doc" \\
  -H "X-API-Key: your_api_key_here" \\
  -F "file=@document.pdf"`,
    responseExample: 'Binary .docx file (Content-Type: application/vnd.openxmlformats-officedocument.wordprocessingml.document)',
    statusCodes: [
      { code: 200, description: 'Success - Returns .docx binary' },
      { code: 400, description: 'Bad request - Invalid file format or missing file' },
      { code: 401, description: 'Unauthorized - Invalid or missing API key' },
      { code: 429, description: 'Rate limit exceeded' },
      { code: 500, description: 'Server error' },
    ],
  },
  { 
    method: 'POST', 
    path: '/v1/convert/doc-to-pdf', 
    name: 'DOC → PDF', 
    body: 'file: .doc or .docx (multipart/form-data)', 
    Icon: FileText, 
    id: 'doc-to-pdf',
    description: 'Convert Microsoft Word documents to PDF format',
    requestExample: `curl -X POST "https://api.developer.meldra.ai/v1/convert/doc-to-pdf" \\
  -H "X-API-Key: your_api_key_here" \\
  -F "file=@document.docx"`,
    responseExample: 'Binary .pdf file (Content-Type: application/pdf)',
    statusCodes: [
      { code: 200, description: 'Success - Returns .pdf binary' },
      { code: 400, description: 'Bad request - Invalid file format' },
      { code: 401, description: 'Unauthorized - Invalid API key' },
      { code: 429, description: 'Rate limit exceeded' },
      { code: 500, description: 'Server error' },
    ],
  },
  { 
    method: 'POST', 
    path: '/v1/convert/ppt-to-pdf', 
    name: 'PPT → PDF', 
    body: 'file: .ppt or .pptx (multipart/form-data)', 
    Icon: FileText, 
    id: 'ppt-to-pdf',
    description: 'Convert PowerPoint presentations to PDF format',
    requestExample: `curl -X POST "https://api.developer.meldra.ai/v1/convert/ppt-to-pdf" \\
  -H "X-API-Key: your_api_key_here" \\
  -F "file=@presentation.pptx"`,
    responseExample: 'Binary .pdf file (Content-Type: application/pdf)',
    statusCodes: [
      { code: 200, description: 'Success - Returns .pdf binary' },
      { code: 400, description: 'Bad request - Invalid file format' },
      { code: 401, description: 'Unauthorized - Invalid API key' },
      { code: 429, description: 'Rate limit exceeded' },
      { code: 500, description: 'Server error' },
    ],
  },
  { 
    method: 'POST', 
    path: '/v1/convert/pdf-to-ppt', 
    name: 'PDF → PPT', 
    body: 'file: PDF (multipart/form-data)', 
    Icon: FileText, 
    id: 'pdf-to-ppt',
    description: 'Convert PDF files to PowerPoint (.pptx) format (one slide per page)',
    requestExample: `curl -X POST "https://api.developer.meldra.ai/v1/convert/pdf-to-ppt" \\
  -H "X-API-Key: your_api_key_here" \\
  -F "file=@document.pdf"`,
    responseExample: 'Binary .pptx file (Content-Type: application/vnd.openxmlformats-officedocument.presentationml.presentation)',
    statusCodes: [
      { code: 200, description: 'Success - Returns .pptx binary' },
      { code: 400, description: 'Bad request - Invalid file format' },
      { code: 401, description: 'Unauthorized - Invalid API key' },
      { code: 429, description: 'Rate limit exceeded' },
      { code: 500, description: 'Server error' },
    ],
  },
  { 
    method: 'POST', 
    path: '/v1/zip/clean', 
    name: 'ZIP Cleaner', 
    body: 'file: ZIP (multipart/form-data), options: JSON (optional)', 
    Icon: FileArchive, 
    id: 'zip-clean',
    description: 'Clean ZIP file names (sanitize characters, remove spaces, enforce length limits)',
    requestExample: `curl -X POST "https://api.developer.meldra.ai/v1/zip/clean" \\
  -H "X-API-Key: your_api_key_here" \\
  -F "file=@archive.zip" \\
  -F 'options={"allowedChars":"a-z0-9-_","replaceChar":"_","removeSpaces":true,"maxLength":255}'`,
    responseExample: 'Binary cleaned ZIP file (Content-Type: application/zip)',
    statusCodes: [
      { code: 200, description: 'Success - Returns cleaned ZIP binary' },
      { code: 400, description: 'Bad request - Invalid ZIP or options JSON' },
      { code: 401, description: 'Unauthorized - Invalid API key' },
      { code: 429, description: 'Rate limit exceeded' },
      { code: 500, description: 'Server error' },
    ],
  },
];

function scrollTo(id) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
}

export default function Developers({ isApiDeveloperDomain = false }) {
  const hostname = typeof window !== 'undefined' ? window.location.hostname : '';
  const isDev = hostname === 'developer.meldra.ai' || hostname === 'api.developer.meldra.ai';
  const isApiDev = isApiDeveloperDomain || hostname === 'api.developer.meldra.ai';
  const reg = isDev ? `${INSIGHT}/register` : '/register';
  const signIn = isDev ? `${INSIGHT}/login` : '/login';
  const privacy = `${INSIGHT}/privacy`;

  useEffect(() => {
    if (isApiDev) {
      document.title = 'api.developer.meldra.ai – Meldra API Documentation';
    } else {
      document.title = 'developer.meldra.ai – Meldra API';
    }
    return () => { document.title = 'Meldra'; };
  }, [isApiDev]);

  return (
    <div className="min-h-screen flex flex-col bg-white">
      {/* Header — white bg, royal blue accents */}
      <header className="w-full border-b border-slate-200 py-4 px-4 md:px-6 lg:px-8 bg-white sticky top-0 z-40">
        <div className="container mx-auto flex items-center justify-between max-w-7xl">
          <Logo size="medium" showText={true} className="text-slate-900" lowercaseM tagline="for Developers" />
          <nav className="flex items-center gap-1 md:gap-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="text-slate-700 hover:bg-blue-50 hover:text-blue-600 flex items-center gap-1">
                  <Layers className="w-4 h-4" /> Products <ChevronDown className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="bg-white border-slate-200 min-w-[200px]">
                <DropdownMenuItem className="text-slate-700 focus:bg-blue-50 focus:text-blue-600 cursor-pointer" onSelect={(e) => { e.preventDefault(); scrollTo('convert'); }}>
                  <FileText className="w-4 h-4" /> Document Conversion
                </DropdownMenuItem>
                <DropdownMenuItem className="text-slate-700 focus:bg-blue-50 focus:text-blue-600 cursor-pointer" onSelect={(e) => { e.preventDefault(); scrollTo('zip-clean'); }}>
                  <FileArchive className="w-4 h-4" /> ZIP Cleaner
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <a href="mailto:support@meldra.ai" className="text-slate-700 hover:text-blue-600 px-3 py-2 text-sm font-medium flex items-center gap-1.5">
              <HelpCircle className="w-4 h-4" /> Support
            </a>
            {isDev ? (
              <>
                <a href={reg}><Button className="bg-blue-600 hover:bg-blue-700 text-white font-medium">Register</Button></a>
                <a href={signIn}><Button variant="outline" className="border-slate-300 text-slate-700 hover:bg-blue-50 hover:border-blue-600 hover:text-blue-600">Sign In</Button></a>
              </>
            ) : (
              <>
                <Link to="/register"><Button className="bg-blue-600 hover:bg-blue-700 text-white font-medium">Register</Button></Link>
                <Link to="/login"><Button variant="outline" className="border-slate-300 text-slate-700 hover:bg-blue-50 hover:border-blue-600 hover:text-blue-600">Sign In</Button></Link>
              </>
            )}
          </nav>
        </div>
      </header>

      {/* Hero — title and intro only; rest of content shifted up */}
      <section className="container mx-auto px-4 py-8 md:py-10 max-w-4xl text-center">
        <h1 className="text-4xl md:text-5xl font-bold text-slate-900 mb-4" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
          Build with Meldra APIs
        </h1>
        <p className="text-lg md:text-xl text-slate-600 max-w-2xl mx-auto mb-4">
          Document conversion (PDF, DOC, PPT) and ZIP Cleaner. Use in your apps with a paid Meldra API key. Self-service and enterprise options.
        </p>
        <p className="text-slate-500 text-sm max-w-xl mx-auto">
          Whether you are a developer, a startup, or an established product, Meldra APIs let you add conversion and file-cleaning to your stack quickly.
        </p>
      </section>

      {/* Layout: sidebar + main */}
      <div className="container mx-auto px-4 pb-24 flex gap-10 max-w-6xl">
        {/* Sidebar — sticky on desktop */}
        <aside className="hidden lg:block w-52 flex-shrink-0">
          <nav className="sticky top-28 space-y-1">
            {getSidebarLinks(isApiDev).map(({ id, label }) => (
              <a
                key={id}
                href={`#${id}`}
                className="block py-2 px-3 rounded-lg text-slate-600 hover:text-blue-600 hover:bg-blue-50/70 text-sm font-medium transition-colors"
              >
                {label}
              </a>
            ))}
          </nav>
        </aside>

        {/* Main content */}
        <main className="flex-1 min-w-0 max-w-3xl space-y-14">
          {/* Get started — royal blue only, no green */}
          <section id="get-started" className="scroll-mt-28">
            <h2 className="text-2xl font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Key className="w-6 h-6 text-blue-600" /> Get an API key
            </h2>
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-6">
              <p className="text-slate-600 mb-4">
                {isApiDev ? (
                  <>API keys are required for all requests. Contact support to obtain your API key and base URL.</>
                ) : (
                  <>Meldra API keys are paid. Contact us for a key and base URL. If you don&apos;t have a key yet, get one by emailing support. It usually takes a short time.</>
                )}
              </p>
              <a href="mailto:support@meldra.ai?subject=Meldra%20API%20key%20request" className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium">
                <Mail className="w-5 h-5" /> support@meldra.ai
              </a>
              {!isApiDev && (
              <div className="mt-6 pt-6 border-t border-slate-200">
                <h3 className="font-semibold text-blue-600 mb-2 flex items-center gap-2"><Shield className="w-4 h-4" /> In-app vs API</h3>
                <div className="grid sm:grid-cols-2 gap-4 text-slate-600 text-sm">
                  <div>
                    <p className="font-medium text-slate-800">In the Meldra app</p>
                    <p>Document Converter and ZIP Cleaner work with your <strong>Meldra login</strong>. No API key.</p>
                    <span className="flex items-center gap-1 text-blue-600 mt-1"><CheckCircle className="w-4 h-4" /> No API key required</span>
                  </div>
                  <div>
                    <p className="font-medium text-slate-800">Via API</p>
                    <p>Call Meldra from your apps. Requires a <strong>paid API key</strong>.</p>
                    <span className="flex items-center gap-1 text-blue-600 mt-1"><Key className="w-4 h-4" /> X-API-Key header</span>
                  </div>
                </div>
              </div>
              )}
            </div>
          </section>

          {/* Interactive API Testing Console - Only on api.developer.meldra.ai */}
          {isApiDev && (
            <section id="test-api" className="scroll-mt-28">
              <h2 className="text-2xl font-bold text-slate-900 mb-4 flex items-center gap-2">
                <Terminal className="w-6 h-6 text-blue-600" /> Test API Endpoints
              </h2>
              <p className="text-slate-600 mb-6">
                Test API endpoints directly from this page. Enter your API key and select a file to test any endpoint.
              </p>
              <ApiTestingConsole />
            </section>
          )}

          {/* API reference and examples */}
          <section id="reference" className="scroll-mt-28">
            <h2 className="text-2xl font-bold text-slate-900 mb-4 flex items-center gap-2">
              <BookOpen className="w-6 h-6 text-blue-600" /> API reference and examples
            </h2>
            <p className="text-slate-600 mb-6">
              Explore the APIs with your API key. Use the test environment for non‑production calls. Base URL and <code className="bg-slate-100 px-1.5 py-0.5 rounded text-blue-700">X-API-Key</code> are provided with your key.
            </p>
            <div className="flex flex-wrap gap-3">
              <a href="#endpoints">
                <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                  <BookOpen className="w-4 h-4 mr-2" /> Go to API reference
                </Button>
              </a>
              <a href="/openapi.json" target="_blank" rel="noopener noreferrer">
                <Button variant="outline" className="border-blue-600 text-blue-600 hover:bg-blue-50">
                  <Download className="w-4 h-4 mr-2" /> Download OpenAPI spec
                </Button>
              </a>
            </div>
          </section>

          {/* Authentication */}
          <section id="authentication" className="scroll-mt-28">
            <h2 className="text-2xl font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Key className="w-6 h-6 text-blue-600" /> Authentication
            </h2>
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 space-y-4">
              <div>
                <h3 className="font-semibold text-slate-900 mb-2">API Key Header</h3>
                <p className="text-slate-600 text-sm mb-3">
                  All requests require an <code className="bg-slate-100 px-1.5 py-0.5 rounded text-blue-700">X-API-Key</code> header with your Meldra API key.
                </p>
                <div className="bg-slate-900 text-green-400 p-4 rounded-lg font-mono text-sm overflow-x-auto">
                  <div>X-API-Key: your_api_key_here</div>
                </div>
                <p className="text-slate-500 text-xs mt-2 italic">
                  Replace <code className="bg-slate-100 px-1 py-0.5 rounded text-xs">your_api_key_here</code> with your actual API key from support@meldra.ai
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-slate-900 mb-2">Base URL</h3>
                <p className="text-slate-600 text-sm mb-2">
                  Production: <code className="bg-slate-100 px-1.5 py-0.5 rounded text-blue-700">https://api.developer.meldra.ai</code>
                </p>
                <p className="text-slate-500 text-xs">
                  Your API key email will include the exact base URL to use. Some enterprise plans may have custom URLs.
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-slate-900 mb-2">Rate Limits</h3>
                <ul className="text-slate-600 text-sm space-y-1 list-disc list-inside">
                  <li><strong>Standard:</strong> 60 requests/minute, 10,000 requests/day</li>
                  <li><strong>Premium:</strong> 120 requests/minute, 50,000 requests/day</li>
                  <li><strong>Enterprise:</strong> Custom limits (contact support)</li>
                </ul>
                <p className="text-slate-500 text-xs mt-2">
                  Rate limit headers: <code className="bg-slate-100 px-1 py-0.5 rounded text-xs">X-RateLimit-Remaining</code>, <code className="bg-slate-100 px-1 py-0.5 rounded text-xs">X-RateLimit-Reset</code>
                </p>
              </div>
            </div>
          </section>

          {/* Endpoints — royal blue, no green */}
          <section id="endpoints" className="scroll-mt-28">
            <h2 className="text-2xl font-bold text-slate-900 mb-2">API Endpoints</h2>
            <p className="text-slate-600 text-sm mb-6">
              Base: <code className="bg-slate-100 px-1.5 py-0.5 rounded text-blue-700">https://api.developer.meldra.ai</code> (or as provided). All: <code className="bg-slate-100 px-1.5 py-0.5 rounded text-blue-700">X-API-Key: &lt;key&gt;</code>.
            </p>
            <div className="space-y-6">
              {ENDPOINTS.map((e) => {
                const Icon = e.Icon;
                const isZip = e.id === 'zip-clean';
                const sectionId = e.id === 'pdf-to-doc' ? 'convert' : isZip ? 'zip-clean' : undefined;
                return (
                  <div key={e.path} id={sectionId} className="scroll-mt-28 bg-slate-50 border border-slate-200 rounded-xl p-6 space-y-4">
                    <div className="flex flex-wrap items-start gap-4">
                      <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                        <Icon className="w-5 h-5 text-blue-600" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <span className="text-blue-600 font-mono text-sm font-semibold bg-blue-50 px-2 py-0.5 rounded">{e.method}</span>
                          <code className="text-blue-700 font-mono text-sm break-all">{e.path}</code>
                        </div>
                        <p className="font-semibold text-slate-900 mb-1">{e.name}</p>
                        {e.description && <p className="text-slate-600 text-sm mb-3">{e.description}</p>}
                        <div className="mb-3">
                          <p className="text-slate-700 text-sm font-medium mb-1">Request Body:</p>
                          <p className="text-slate-600 text-sm">{e.body}</p>
                        </div>
                      </div>
                    </div>
                    
                    {e.requestExample && (
                      <div>
                        <p className="text-slate-700 text-sm font-medium mb-2">Example (cURL):</p>
                        <div className="bg-slate-900 text-green-400 p-4 rounded-lg font-mono text-xs overflow-x-auto">
                          <pre className="whitespace-pre-wrap">{e.requestExample}</pre>
                        </div>
                      </div>
                    )}
                    
                    {e.responseExample && (
                      <div>
                        <p className="text-slate-700 text-sm font-medium mb-2">Response:</p>
                        <div className="bg-slate-100 p-3 rounded-lg">
                          <p className="text-slate-600 text-sm font-mono">{e.responseExample}</p>
                        </div>
                      </div>
                    )}
                    
                    {e.statusCodes && e.statusCodes.length > 0 && (
                      <div>
                        <p className="text-slate-700 text-sm font-medium mb-2">Status Codes:</p>
                        <div className="space-y-1">
                          {e.statusCodes.map((sc, idx) => (
                            <div key={idx} className="flex gap-3 text-sm">
                              <code className="bg-slate-200 px-2 py-0.5 rounded font-mono text-blue-700 min-w-[60px] text-center">{sc.code}</code>
                              <span className="text-slate-600">{sc.description}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>

          {/* Usage Tracking & Billing - Hidden on api.developer.meldra.ai */}
          {!isApiDev && (
          <section id="usage-tracking" className="scroll-mt-28">
            <h2 className="text-2xl font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Layers className="w-6 h-6 text-blue-600" /> Usage Tracking & Billing
            </h2>
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 space-y-6">
              <div>
                <h3 className="font-semibold text-slate-900 mb-3">Usage Tracking</h3>
                <p className="text-slate-600 text-sm mb-4">
                  All API requests are automatically tracked. You can view usage statistics, costs, and billing information through the API or your dashboard.
                </p>
                <div className="space-y-3">
                  <div className="bg-white p-4 rounded-lg border border-slate-200">
                    <p className="font-medium text-slate-900 mb-2">Tracked Metrics:</p>
                    <ul className="text-slate-600 text-sm space-y-1 list-disc list-inside">
                      <li>Request count per endpoint</li>
                      <li>Response status codes</li>
                      <li>Processing time (milliseconds)</li>
                      <li>Request/response sizes (bytes)</li>
                      <li>Token usage (for AI endpoints, if applicable)</li>
                      <li>Cost per request (USD)</li>
                    </ul>
                  </div>
                  <div className="bg-white p-4 rounded-lg border border-slate-200">
                    <p className="font-medium text-slate-900 mb-2">View Usage:</p>
                    <div className="bg-slate-900 text-green-400 p-3 rounded-lg font-mono text-xs overflow-x-auto">
                      <div>GET /api/developer/keys/&#123;key_id&#125;/usage</div>
                      <div className="text-slate-400 mt-1">Returns: total requests, cost, tokens, by endpoint, by status</div>
                    </div>
                  </div>
                </div>
              </div>
              
              <div>
                <h3 className="font-semibold text-slate-900 mb-3">Billing & Costs</h3>
                <div className="space-y-3">
                  <div className="bg-white p-4 rounded-lg border border-slate-200">
                    <p className="font-medium text-slate-900 mb-2">Pricing Model:</p>
                    <ul className="text-slate-600 text-sm space-y-1 list-disc list-inside">
                      <li><strong>Base cost:</strong> $0.001 per request</li>
                      <li><strong>Token cost:</strong> $0.00001 per token (AI endpoints only)</li>
                      <li><strong>Hardware cost:</strong> ~30% of revenue (infrastructure)</li>
                      <li><strong>Margin:</strong> Revenue - Hardware costs</li>
                    </ul>
                  </div>
                  <div className="bg-white p-4 rounded-lg border border-slate-200">
                    <p className="font-medium text-slate-900 mb-2">Monthly Billing:</p>
                    <p className="text-slate-600 text-sm mb-2">
                      Billing summaries are generated monthly. Each API key has a billing record per month with:
                    </p>
                    <ul className="text-slate-600 text-sm space-y-1 list-disc list-inside">
                      <li>Total requests</li>
                      <li>Total tokens used</li>
                      <li>Total cost (USD)</li>
                      <li>Hardware cost (USD)</li>
                      <li>Margin (USD)</li>
                      <li>Payment status</li>
                    </ul>
                  </div>
                  <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg">
                    <p className="text-amber-800 text-sm">
                      <strong>Note:</strong> Actual pricing may vary by plan. Contact <a href="mailto:support@meldra.ai" className="underline">support@meldra.ai</a> for enterprise pricing and custom agreements.
                    </p>
                  </div>
                </div>
              </div>
              
              <div>
                <h3 className="font-semibold text-slate-900 mb-3">API Endpoints for Usage</h3>
                <div className="space-y-2">
                  <div className="bg-slate-900 text-green-400 p-3 rounded-lg font-mono text-xs">
                    <div className="text-blue-400">GET</div>
                    <div>/api/developer/keys</div>
                    <div className="text-slate-400 text-xs mt-1">List all your API keys</div>
                  </div>
                  <div className="bg-slate-900 text-green-400 p-3 rounded-lg font-mono text-xs">
                    <div className="text-blue-400">GET</div>
                    <div>/api/developer/keys/&#123;key_id&#125;/usage</div>
                    <div className="text-slate-400 text-xs mt-1">Get usage stats for a specific key</div>
                  </div>
                  <div className="bg-slate-900 text-green-400 p-3 rounded-lg font-mono text-xs">
                    <div className="text-blue-400">GET</div>
                    <div>/api/developer/usage</div>
                    <div className="text-slate-400 text-xs mt-1">Get overall usage across all keys</div>
                  </div>
                </div>
              </div>
            </div>
          </section>
          )}

          {/* Changelog — collapsible, royal blue */}
          <section id="changelog" className="scroll-mt-28">
            <Collapsible defaultOpen={false} className="group">
              <CollapsibleTrigger className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-6 py-4 text-left hover:bg-slate-100 transition-colors">
                <h2 className="text-lg font-bold text-slate-900">API changelog</h2>
                <ChevronRight className="w-5 h-5 text-slate-500 transition-transform group-data-[state=open]:rotate-90" />
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="mt-2 rounded-xl rounded-t-none border border-t-0 border-slate-200 bg-white px-6 py-4">
                  <p className="font-semibold text-blue-600 mb-2">v1.0</p>
                  <ul className="text-slate-600 text-sm space-y-1 list-disc list-inside">
                    <li>PDF → DOC, DOC → PDF, PPT → PDF, PDF → PPT</li>
                    <li>ZIP Cleaner with optional options JSON</li>
                    <li>X-API-Key authentication</li>
                  </ul>
                </div>
              </CollapsibleContent>
            </Collapsible>
          </section>

          {/* Commercial use — Hidden on api.developer.meldra.ai */}
          {!isApiDev && (
          <section id="commercial" className="scroll-mt-28">
            <h2 className="text-2xl font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Briefcase className="w-6 h-6 text-blue-600" /> Using the Meldra API commercially
            </h2>
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-6">
              <ul className="list-disc list-inside space-y-2 text-slate-600 mb-4">
                <li><strong className="text-slate-800">Paid API key</strong> — <a href="mailto:support@meldra.ai" className="text-blue-600 hover:text-blue-700">support@meldra.ai</a> for pricing and a key.</li>
                <li><strong className="text-slate-800">Commercial terms</strong> — <a href={`${INSIGHT}/disclaimer`} className="text-blue-600 hover:text-blue-700" target="_blank" rel="noopener noreferrer">Disclaimer &amp; Terms</a> on insight.meldra.ai.</li>
                <li><strong className="text-slate-800">Base URL and X-API-Key</strong> — Use the values we provide with your key.</li>
              </ul>
              <p className="text-slate-500 text-sm">For the full Meldra app (data analysis, file tools), go to <a href={INSIGHT} className="text-blue-600 hover:text-blue-700">insight.meldra.ai</a>.</p>
            </div>
          </section>
          )}

          {/* Pricing - Hidden on api.developer.meldra.ai */}
          {!isApiDev && (
          <section id="pricing" className="scroll-mt-28">
            <h2 className="text-2xl font-bold text-slate-900 mb-4">Pricing</h2>
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-6">
              <p className="text-slate-600 mb-4">
                To learn more about the fares of these APIs, see our <a href={`${INSIGHT}/pricing`} className="text-blue-600 hover:text-blue-700 underline">pricing</a> on insight.meldra.ai.
              </p>
              <a href="mailto:support@meldra.ai?subject=Meldra%20Enterprise%20API">
                <Button variant="outline" className="border-blue-600 text-blue-600 hover:bg-blue-50">
                  Can&apos;t find the right API? Check out Enterprise
                </Button>
              </a>
            </div>
          </section>
          )}

          {/* CTA — royal blue */}
          <div className="text-center pt-6">
            {isDev ? (
              <a href={INSIGHT}>
                <Button className="px-6 py-3 rounded-xl font-semibold inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white border-2 border-blue-700">
                  Go to insight.meldra.ai (full app) <ArrowRight className="w-4 h-4" />
                </Button>
              </a>
            ) : (
              <Link to="/">
                <Button className="px-6 py-3 rounded-xl font-semibold inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white border-2 border-blue-700">
                  Back to Home <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
            )}
          </div>
        </main>
      </div>

      {/* Footer — white bg, royal blue links */}
      <footer className="w-full border-t border-slate-200 py-8 px-4 mt-auto bg-white">
        <div className="container mx-auto max-w-6xl">
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-slate-600 mb-4">
            <a href={`${INSIGHT}/disclaimer`} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-700">Legal / Disclaimer</a>
            <a href={privacy} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-700">Privacy</a>
            <a href="mailto:support@meldra.ai" className="text-blue-600 hover:text-blue-700">Support</a>
            <a href={INSIGHT} className="text-blue-600 hover:text-blue-700">meldra</a>
          </div>
          <p className="text-center text-slate-500 text-sm">© {new Date().getFullYear()} Meldra. All rights reserved.</p>
        </div>
      </footer>

      <CookieConsent privacyUrl={privacy} />
    </div>
  );
}
