// developer.meldra.ai — Amadeus-style positioning: Products, API reference, changelog, pricing.
// Meldra UI/UX only. On developer.meldra.ai: Pricing/Login/Register link to insight; only this page.
import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import Logo from '@/components/branding/Logo';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import CookieConsent from '@/components/CookieConsent';
import {
  Code, Key, FileText, FileArchive, Mail, ArrowRight, CheckCircle, Shield, Briefcase,
  ChevronDown, ChevronRight, BookOpen, Download, HelpCircle, Layers,
} from 'lucide-react';

const INSIGHT = 'https://insight.meldra.ai';

const SIDEBAR_LINKS = [
  { id: 'get-started', label: 'Get started' },
  { id: 'reference', label: 'API reference' },
  { id: 'endpoints', label: 'Endpoints' },
  { id: 'changelog', label: 'Changelog' },
  { id: 'commercial', label: 'Commercial use' },
  { id: 'pricing', label: 'Pricing' },
];

const ENDPOINTS = [
  { method: 'POST', path: '/v1/convert/pdf-to-doc', name: 'PDF → DOC', body: 'file: PDF', Icon: FileText, id: 'pdf-to-doc' },
  { method: 'POST', path: '/v1/convert/doc-to-pdf', name: 'DOC → PDF', body: 'file: .docx', Icon: FileText, id: 'doc-to-pdf' },
  { method: 'POST', path: '/v1/convert/ppt-to-pdf', name: 'PPT → PDF', body: 'file: .pptx', Icon: FileText, id: 'ppt-to-pdf' },
  { method: 'POST', path: '/v1/convert/pdf-to-ppt', name: 'PDF → PPT', body: 'file: PDF', Icon: FileText, id: 'pdf-to-ppt' },
  { method: 'POST', path: '/v1/zip/clean', name: 'ZIP Cleaner', body: 'file: ZIP, options (optional JSON)', Icon: FileArchive, id: 'zip-clean' },
];

function scrollTo(id) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
}

export default function Developers() {
  const isDev = typeof window !== 'undefined' && window.location.hostname === 'developer.meldra.ai';
  const reg = isDev ? `${INSIGHT}/register` : '/register';
  const signIn = isDev ? `${INSIGHT}/login` : '/login';
  const privacy = `${INSIGHT}/privacy`;

  useEffect(() => {
    document.title = 'developer.meldra.ai – Meldra API';
    return () => { document.title = 'Meldra'; };
  }, []);

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'linear-gradient(to bottom right, #0A1F44, #0F2A5A, #0A1F44)' }}>
      {/* Header — Amadeus-style: branding, Products, Support, Register, Sign In */}
      <header className="w-full border-b border-slate-800/50 py-4 px-4 md:px-6 lg:px-8 backdrop-blur-sm bg-slate-950/50 sticky top-0 z-40">
        <div className="container mx-auto flex items-center justify-between max-w-7xl">
          <div className="flex items-center gap-3">
            <Logo size="small" showText={true} style={{ color: '#FFFFFF' }} lowercaseM />
            <span className="text-slate-400 text-sm font-medium border-l border-slate-600 pl-3 hidden sm:inline" style={{ fontFamily: "'Inter', sans-serif" }}>
              for Developers
            </span>
          </div>
          <nav className="flex items-center gap-1 md:gap-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="text-white hover:bg-slate-800/60 hover:text-white flex items-center gap-1">
                  <Layers className="w-4 h-4" /> Products <ChevronDown className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="bg-slate-900 border-slate-700 min-w-[200px]">
                <DropdownMenuItem className="text-slate-200 focus:bg-slate-800 focus:text-white cursor-pointer" onSelect={(e) => { e.preventDefault(); scrollTo('convert'); }}>
                  <FileText className="w-4 h-4" /> Document Conversion
                </DropdownMenuItem>
                <DropdownMenuItem className="text-slate-200 focus:bg-slate-800 focus:text-white cursor-pointer" onSelect={(e) => { e.preventDefault(); scrollTo('zip-clean'); }}>
                  <FileArchive className="w-4 h-4" /> ZIP Cleaner
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <a href="mailto:support@meldra.ai" className="text-white/90 hover:text-white px-3 py-2 text-sm font-medium flex items-center gap-1.5">
              <HelpCircle className="w-4 h-4" /> Support
            </a>
            {isDev ? (
              <>
                <a href={reg}><Button className="bg-blue-600 hover:bg-blue-700 text-white font-medium">Register</Button></a>
                <a href={signIn}><Button variant="outline" className="border-slate-500 text-white hover:bg-slate-800/60">Sign In</Button></a>
              </>
            ) : (
              <>
                <Link to="/register"><Button className="bg-blue-600 hover:bg-blue-700 text-white font-medium">Register</Button></Link>
                <Link to="/login"><Button variant="outline" className="border-slate-500 text-white hover:bg-slate-800/60">Sign In</Button></Link>
              </>
            )}
          </nav>
        </div>
      </header>

      {/* Hero — value prop + two CTAs */}
      <section className="container mx-auto px-4 py-14 md:py-20 max-w-4xl text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 mb-6">
          <Code className="w-5 h-5" /> developer.meldra.ai
        </div>
        <h1 className="text-4xl md:text-5xl font-bold text-white mb-4" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
          Build with Meldra APIs
        </h1>
        <p className="text-lg md:text-xl text-slate-300 max-w-2xl mx-auto mb-6">
          Document conversion (PDF, DOC, PPT) and ZIP Cleaner. Use in your apps with a paid Meldra API key. Self-service and enterprise options.
        </p>
        <p className="text-slate-400 text-sm max-w-xl mx-auto mb-10">
          Whether you are a developer, a startup, or an established product, Meldra APIs let you add conversion and file-cleaning to your stack quickly.
        </p>
        <div className="flex flex-wrap justify-center gap-4">
          <a href="#get-started">
            <Button className="bg-slate-700/80 hover:bg-slate-600 text-cyan-300 font-semibold px-6">
              Get started
            </Button>
          </a>
          <a href="#reference">
            <Button className="bg-slate-800/80 hover:bg-slate-700 text-white font-semibold px-6 border border-slate-600">
              View API reference
            </Button>
          </a>
        </div>
        <p className="text-slate-500 text-xs mt-6">
          Not sure which offer fits? <a href="#pricing" className="text-cyan-500 hover:text-cyan-400">See pricing and commercial use</a>.
        </p>
      </section>

      {/* Layout: sidebar + main */}
      <div className="container mx-auto px-4 pb-24 flex gap-10 max-w-6xl">
        {/* Sidebar — sticky on desktop */}
        <aside className="hidden lg:block w-52 flex-shrink-0">
          <nav className="sticky top-28 space-y-1">
            {SIDEBAR_LINKS.map(({ id, label }) => (
              <a
                key={id}
                href={`#${id}`}
                className="block py-2 px-3 rounded-lg text-slate-400 hover:text-cyan-300 hover:bg-slate-800/50 text-sm font-medium transition-colors"
              >
                {label}
              </a>
            ))}
          </nav>
        </aside>

        {/* Main content */}
        <main className="flex-1 min-w-0 max-w-3xl space-y-14">
          {/* Get started */}
          <section id="get-started" className="scroll-mt-28">
            <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
              <Key className="w-6 h-6 text-cyan-400" /> Get an API key
            </h2>
            <div className="bg-slate-900/80 border border-slate-700/50 rounded-xl p-6">
              <p className="text-slate-300 mb-4">
                Meldra API keys are paid. Contact us for a key and base URL. If you don&apos;t have a key yet, get one by emailing support. It usually takes a short time.
              </p>
              <a href="mailto:support@meldra.ai?subject=Meldra%20API%20key%20request" className="inline-flex items-center gap-2 text-cyan-400 hover:text-cyan-300 font-medium">
                <Mail className="w-5 h-5" /> support@meldra.ai
              </a>
              <div className="mt-6 pt-6 border-t border-slate-700/50">
                <h3 className="font-semibold text-emerald-300 mb-2 flex items-center gap-2"><Shield className="w-4 h-4" /> In-app vs API</h3>
                <div className="grid sm:grid-cols-2 gap-4 text-slate-300 text-sm">
                  <div>
                    <p className="font-medium text-emerald-200/90">In the Meldra app</p>
                    <p>Document Converter and ZIP Cleaner work with your <strong>Meldra login</strong>. No API key.</p>
                    <span className="flex items-center gap-1 text-emerald-400 mt-1"><CheckCircle className="w-4 h-4" /> No API key required</span>
                  </div>
                  <div>
                    <p className="font-medium text-cyan-200/90">Via API</p>
                    <p>Call Meldra from your apps. Requires a <strong>paid API key</strong>.</p>
                    <span className="flex items-center gap-1 text-cyan-400 mt-1"><Key className="w-4 h-4" /> X-API-Key header</span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* API reference and examples */}
          <section id="reference" className="scroll-mt-28">
            <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
              <BookOpen className="w-6 h-6 text-cyan-400" /> API reference and examples
            </h2>
            <p className="text-slate-300 mb-6">
              Explore the APIs with your API key. Use the test environment for non‑production calls. Base URL and <code className="bg-slate-800 px-1.5 py-0.5 rounded text-cyan-300">X-API-Key</code> are provided with your key.
            </p>
            <div className="flex flex-wrap gap-3">
              <a href="#endpoints">
                <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                  <BookOpen className="w-4 h-4 mr-2" /> Go to API reference
                </Button>
              </a>
              <a href="/openapi.json" target="_blank" rel="noopener noreferrer">
                <Button variant="outline" className="border-slate-600 text-cyan-300 hover:bg-slate-800/60">
                  <Download className="w-4 h-4 mr-2" /> Download OpenAPI spec
                </Button>
              </a>
            </div>
          </section>

          {/* Endpoints */}
          <section id="endpoints" className="scroll-mt-28">
            <h2 className="text-2xl font-bold text-white mb-2">Endpoints</h2>
            <p className="text-slate-400 text-sm mb-6">
              Base: <code className="bg-slate-800 px-1.5 py-0.5 rounded text-cyan-300">https://api.developer.meldra.ai</code> (or as provided). All: <code className="bg-slate-800 px-1.5 py-0.5 rounded text-cyan-300">X-API-Key: &lt;key&gt;</code>.
            </p>
            <div className="space-y-6">
              {ENDPOINTS.map((e) => {
                const Icon = e.Icon;
                const isZip = e.id === 'zip-clean';
                const sectionId = e.id === 'pdf-to-doc' ? 'convert' : isZip ? 'zip-clean' : undefined;
                return (
                  <div key={e.path} id={sectionId} className="scroll-mt-28 bg-slate-900/80 border border-slate-700/50 rounded-xl p-6">
                    <div className="flex flex-wrap items-start gap-4">
                      <div className="w-10 h-10 rounded-lg bg-cyan-500/20 flex items-center justify-center flex-shrink-0">
                        <Icon className="w-5 h-5 text-cyan-400" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <span className="text-emerald-400 font-mono text-sm">{e.method}</span>
                          <code className="text-cyan-300 font-mono text-sm break-all">{e.path}</code>
                        </div>
                        <p className="font-semibold text-white">{e.name}</p>
                        <p className="text-slate-400 text-sm">Body: {e.body}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Changelog — collapsible */}
          <section id="changelog" className="scroll-mt-28">
            <Collapsible defaultOpen={false} className="group">
              <CollapsibleTrigger className="flex w-full items-center justify-between rounded-xl border border-slate-700/50 bg-slate-900/80 px-6 py-4 text-left hover:bg-slate-800/50 transition-colors">
                <h2 className="text-lg font-bold text-white">API changelog</h2>
                <ChevronRight className="w-5 h-5 text-slate-400 transition-transform group-data-[state=open]:rotate-90" />
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="mt-2 rounded-xl border border-slate-700/50 border-t-0 rounded-t-none bg-slate-900/60 px-6 py-4">
                  <p className="font-semibold text-cyan-300 mb-2">v1.0</p>
                  <ul className="text-slate-300 text-sm space-y-1 list-disc list-inside">
                    <li>PDF → DOC, DOC → PDF, PPT → PDF, PDF → PPT</li>
                    <li>ZIP Cleaner with optional options JSON</li>
                    <li>X-API-Key authentication</li>
                  </ul>
                </div>
              </CollapsibleContent>
            </Collapsible>
          </section>

          {/* Commercial use */}
          <section id="commercial" className="scroll-mt-28">
            <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
              <Briefcase className="w-6 h-6 text-cyan-400" /> Using the Meldra API commercially
            </h2>
            <div className="bg-slate-900/80 border border-slate-700/50 rounded-xl p-6">
              <ul className="list-disc list-inside space-y-2 text-slate-300 mb-4">
                <li><strong>Paid API key</strong> — <a href="mailto:support@meldra.ai" className="text-cyan-400 hover:text-cyan-300">support@meldra.ai</a> for pricing and a key.</li>
                <li><strong>Commercial terms</strong> — <a href={`${INSIGHT}/disclaimer`} className="text-cyan-400 hover:text-cyan-300" target="_blank" rel="noopener noreferrer">Disclaimer &amp; Terms</a> on insight.meldra.ai.</li>
                <li><strong>Base URL and X-API-Key</strong> — Use the values we provide with your key.</li>
              </ul>
              <p className="text-slate-400 text-sm">For the full Meldra app (data analysis, file tools), go to <a href={INSIGHT} className="text-cyan-400 hover:text-cyan-300">insight.meldra.ai</a>.</p>
            </div>
          </section>

          {/* Pricing */}
          <section id="pricing" className="scroll-mt-28">
            <h2 className="text-2xl font-bold text-white mb-4">Pricing</h2>
            <div className="bg-slate-900/80 border border-slate-700/50 rounded-xl p-6">
              <p className="text-slate-300 mb-4">
                To learn more about the fares of these APIs, see our <a href={`${INSIGHT}/pricing`} className="text-cyan-400 hover:text-cyan-300 underline">pricing</a> on insight.meldra.ai.
              </p>
              <a href="mailto:support@meldra.ai?subject=Meldra%20Enterprise%20API">
                <Button variant="outline" className="border-slate-600 text-cyan-300 hover:bg-slate-800/60">
                  Can&apos;t find the right API? Check out Enterprise
                </Button>
              </a>
            </div>
          </section>

          {/* CTA */}
          <div className="text-center pt-6">
            {isDev ? (
              <a href={INSIGHT}>
                <Button className="px-6 py-3 rounded-xl font-semibold inline-flex items-center gap-2" style={{ background: '#000', color: '#FFF', border: '2px solid #00E5FF' }}>
                  Go to insight.meldra.ai (full app) <ArrowRight className="w-4 h-4" />
                </Button>
              </a>
            ) : (
              <Link to="/">
                <Button className="px-6 py-3 rounded-xl font-semibold inline-flex items-center gap-2" style={{ background: '#000', color: '#FFF', border: '2px solid #00E5FF' }}>
                  Back to Home <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
            )}
          </div>
        </main>
      </div>

      {/* Footer — Legal, Privacy, Support, Meldra, © */}
      <footer className="w-full border-t border-slate-800 py-8 px-4 mt-auto">
        <div className="container mx-auto max-w-6xl">
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-slate-400 mb-4">
            <a href={`${INSIGHT}/disclaimer`} target="_blank" rel="noopener noreferrer" className="hover:text-cyan-400">Legal / Disclaimer</a>
            <a href={privacy} target="_blank" rel="noopener noreferrer" className="hover:text-cyan-400">Privacy</a>
            <a href="mailto:support@meldra.ai" className="hover:text-cyan-400">Support</a>
            <a href={INSIGHT} className="hover:text-cyan-400">meldra</a>
          </div>
          <p className="text-center text-slate-500 text-sm">© {new Date().getFullYear()} Meldra. All rights reserved.</p>
        </div>
      </footer>

      <CookieConsent privacyUrl={privacy} />
    </div>
  );
}
