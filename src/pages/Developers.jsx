// pages/Developers.jsx — developer.meldra.ai: API usage and commercial use only
// On insight.meldra.ai: /developers shows this; Pricing/Login stay on insight.
// On developer.meldra.ai: only this page; Pricing/Login link to insight.meldra.ai.
import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import Logo from '@/components/branding/Logo';
import { Code, Key, FileText, FileArchive, Mail, ArrowRight, CheckCircle, Shield, Briefcase } from 'lucide-react';

const INSIGHT = 'https://insight.meldra.ai';

export default function Developers() {
  const isDev = typeof window !== 'undefined' && window.location.hostname === 'developer.meldra.ai';
  useEffect(() => { document.title = 'developer.meldra.ai – Meldra API'; return () => { document.title = 'Meldra'; }; }, []);

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'linear-gradient(to bottom right, #0A1F44, #0F2A5A, #0A1F44)' }}>
      <header className="w-full border-b border-slate-800/50 py-5 px-6 md:px-8 backdrop-blur-sm bg-slate-950/30">
        <div className="container mx-auto flex items-center justify-between max-w-7xl">
          <div className="flex items-center gap-4">
            <Logo size="medium" showText={true} style={{ color: '#FFFFFF' }} lowercaseM />
            <span className="text-cyan-400/90 font-semibold text-sm border-l border-slate-600 pl-4 hidden sm:inline">developer.meldra.ai</span>
          </div>
          <div className="flex items-center gap-2 md:gap-4">
            <span className="text-cyan-300 px-4 py-2 text-base font-medium bg-slate-800/50 rounded-lg">Developers</span>
            {isDev ? (
              <>
                <a href={`${INSIGHT}/pricing`} className="text-white hover:text-slate-200 px-4 py-2 text-base font-medium transition-all hover:bg-slate-800/50 rounded-lg">Pricing</a>
                <a href={`${INSIGHT}/login`} className="text-white hover:text-slate-200 px-4 py-2 text-base font-medium transition-all hover:bg-slate-800/50 rounded-lg">Login</a>
              ) : (
                <>
                  <Link to="/pricing" className="text-white hover:text-slate-200 px-4 py-2 text-base font-medium transition-all hover:bg-slate-800/50 rounded-lg">Pricing</Link>
                  <Link to="/login" className="text-white hover:text-slate-200 px-4 py-2 text-base font-medium transition-all hover:bg-slate-800/50 rounded-lg">Login</Link>
                </>
              )}
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-16 flex-1 max-w-4xl">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 mb-6">
            <Code className="w-5 h-5" />
            <span className="font-semibold">developer.meldra.ai</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            API for Developers
          </h1>
          <p className="text-xl text-slate-300 max-w-2xl mx-auto">
            Use document conversion and ZIP Cleaner from your own apps. Requires a paid Meldra API key.
          </p>
        </div>

        {/* In-app vs API */}
        <div className="bg-slate-900/80 border border-slate-700/50 rounded-2xl p-8 mb-10">
          <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <Shield className="w-5 h-5 text-emerald-400" />
            In-app vs API
          </h2>
          <div className="grid md:grid-cols-2 gap-6 text-slate-300">
            <div>
              <h3 className="font-semibold text-emerald-300 mb-2">In the Meldra app</h3>
              <p className="text-sm mb-2">Document Converter and ZIP Cleaner work with your <strong>Meldra login only</strong>. No API key needed.</p>
              <span className="flex items-center gap-2 text-emerald-400 text-sm"><CheckCircle className="w-4 h-4" /> No API key required</span>
            </div>
            <div>
              <h3 className="font-semibold text-cyan-300 mb-2">Via API (this page)</h3>
              <p className="text-sm mb-2">Call Meldra from your scripts, services, or products. Requires a <strong>paid Meldra API key</strong>.</p>
              <span className="flex items-center gap-2 text-cyan-400 text-sm"><Key className="w-4 h-4" /> X-API-Key header</span>
            </div>
          </div>
        </div>

        {/* Get an API key */}
        <div className="bg-slate-900/80 border border-slate-700/50 rounded-2xl p-8 mb-10">
          <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <Key className="w-5 h-5 text-cyan-400" />
            Get an API key
          </h2>
          <p className="text-slate-300 mb-4">
            Meldra API keys are paid. Contact us to get a key and base URL.
          </p>
          <a
            href="mailto:support@meldra.ai?subject=Meldra%20API%20key%20request"
            className="inline-flex items-center gap-2 text-cyan-400 hover:text-cyan-300 font-medium"
          >
            <Mail className="w-5 h-5" />
            support@meldra.ai
          </a>
        </div>

        {/* Using the Meldra API commercially */}
        <div className="bg-slate-900/80 border border-slate-700/50 rounded-2xl p-8 mb-10">
          <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-cyan-400" />
            Using the Meldra API commercially
          </h2>
          <p className="text-slate-300 mb-4">To use the Meldra API in your own products or services:</p>
          <ul className="list-disc list-inside space-y-2 text-slate-300 mb-4">
            <li><strong>Paid API key</strong> — Contact <a href="mailto:support@meldra.ai" className="text-cyan-400 hover:text-cyan-300">support@meldra.ai</a> for pricing and a key.</li>
            <li><strong>Commercial terms</strong> — Review the <a href={`${INSIGHT}/disclaimer`} className="text-cyan-400 hover:text-cyan-300" target="_blank" rel="noopener noreferrer">Disclaimer & Terms</a> on insight.meldra.ai.</li>
            <li><strong>Base URL and X-API-Key</strong> — Use the values we provide with your key for all requests.</li>
          </ul>
          <p className="text-slate-400 text-sm">For the full Meldra app (data analysis, file tools, dashboard), go to <a href={INSIGHT} className="text-cyan-400 hover:text-cyan-300">insight.meldra.ai</a>.</p>
        </div>

        {/* Endpoints */}
        <div className="bg-slate-900/80 border border-slate-700/50 rounded-2xl p-8 mb-10">
          <h2 className="text-xl font-bold text-white mb-6">Endpoints</h2>
          <p className="text-slate-400 text-sm mb-6">
            Base URL: <code className="bg-slate-800 px-2 py-1 rounded text-cyan-300">https://api.developer.meldra.ai</code> (or as provided with your key). All requests: <code className="bg-slate-800 px-2 py-1 rounded text-cyan-300">X-API-Key: &lt;your_key&gt;</code>.
          </p>
          <div className="space-y-6">
            {[
              { method: 'POST', path: '/v1/convert/pdf-to-doc', name: 'PDF → DOC', body: 'file: PDF', Icon: FileText },
              { method: 'POST', path: '/v1/convert/doc-to-pdf', name: 'DOC → PDF', body: 'file: .docx', Icon: FileText },
              { method: 'POST', path: '/v1/convert/ppt-to-pdf', name: 'PPT → PDF', body: 'file: .pptx', Icon: FileText },
              { method: 'POST', path: '/v1/convert/pdf-to-ppt', name: 'PDF → PPT', body: 'file: PDF', Icon: FileText },
              { method: 'POST', path: '/v1/zip/clean', name: 'ZIP Cleaner', body: 'file: ZIP, options (optional JSON)', Icon: FileArchive },
            ].map((e) => {
              const Icon = e.Icon;
              return (
                <div key={e.path} className="flex flex-wrap items-start gap-4 py-4 border-b border-slate-700/50 last:border-0">
                  <div className="w-10 h-10 rounded-lg bg-cyan-500/20 flex items-center justify-center flex-shrink-0">
                    <Icon className="w-5 h-5 text-cyan-400" />
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className="text-emerald-400 font-mono text-sm">{e.method}</span>
                      <code className="text-cyan-300 font-mono text-sm">{e.path}</code>
                    </div>
                    <p className="font-semibold text-white">{e.name}</p>
                    <p className="text-slate-400 text-sm">Body: {e.body}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* CTA */}
        <div className="text-center">
          {isDev ? (
            <a href={INSIGHT}>
              <Button className="px-6 py-3 rounded-xl font-semibold inline-flex items-center gap-2" style={{ background: '#000', color: '#FFF', border: '2px solid #00E5FF' }}>
                Go to insight.meldra.ai (full app)
                <ArrowRight className="w-4 h-4" />
              </Button>
            </a>
          ) : (
            <Link to="/">
              <Button className="px-6 py-3 rounded-xl font-semibold inline-flex items-center gap-2" style={{ background: '#000', color: '#FFF', border: '2px solid #00E5FF' }}>
                Back to Home
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          )}
        </div>
      </div>

      <footer className="w-full border-t border-slate-800 py-6 px-4 mt-auto">
        <div className="container mx-auto flex flex-col md:flex-row items-center justify-center gap-4">
          <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-slate-400">
            {isDev ? <a href={INSIGHT} className="text-cyan-400 hover:text-cyan-300">insight.meldra.ai</a> : <Link to="/developers" className="text-cyan-400 hover:text-cyan-300">Developers</Link>}
            <a href="mailto:support@meldra.ai" className="hover:text-slate-300">Support</a>
            {isDev ? <a href={`${INSIGHT}/pricing`} className="hover:text-slate-300">Pricing</a> : <Link to="/pricing" className="hover:text-slate-300">Pricing</Link>}
            <span className="text-slate-600">© {new Date().getFullYear()} Meldra. All rights reserved.</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
