// pages/Landing.jsx - Main landing page: Ask Meldra pitch, jobs, privacy promise, features, contact
import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Logo from '@/components/branding/Logo';
import {
  Shield, Zap, TrendingUp, Brain, FileText,
  ArrowRight, Sparkles, BarChart3, Database, FileSpreadsheet,
  CheckCircle, Layers, Workflow,
  Eye, FileCheck, Target, Mail
} from 'lucide-react';
import CookieConsent from '@/components/CookieConsent';

const JOBS = [
  { title: 'Spreadsheet to board deck', text: 'Turn an Excel or CSV file into a PowerPoint with charts, tables and key numbers.' },
  { title: 'Bank and ledger reconciliation', text: 'Match two files and see every difference, ready to export.' },
  { title: 'Reports across your systems', text: 'Combine exports from HR, finance and sales and ask questions in plain English.' },
  { title: 'Invoices into Excel', text: 'Pull header fields and line items out of PDF or photographed invoices.' },
  { title: 'PDFs and scans', text: 'Fill and edit PDFs, convert between PDF, Word and Excel, read text from scans.' },
  { title: 'HR data migration', text: 'Map, clean and check an HR system extract and get load-ready SuccessFactors files.' },
];

export default function Landing() {
  return (
    <div className="min-h-screen flex flex-col bg-white">
      {/* Header — same as page (white, royal blue), part of one consistent layout */}
      <header className="w-full border-b border-slate-200 py-4 px-4 md:px-8 bg-white sticky top-0 z-40">
        <div className="container mx-auto flex items-center justify-between max-w-7xl">
          <Logo size="medium" showText={true} className="text-slate-900" lowercaseM />
          <div className="flex items-center gap-2 md:gap-4">
            <Link to="/developers" className="hidden sm:block">
              <Button variant="ghost" className="text-slate-700 hover:text-blue-600 hover:bg-blue-50 px-3 md:px-4 py-2 text-base font-medium transition-all rounded-lg">
                Developers
              </Button>
            </Link>
            <Link to="/pricing">
              <Button variant="ghost" className="text-slate-700 hover:text-blue-600 hover:bg-blue-50 px-3 md:px-4 py-2 text-base font-medium transition-all rounded-lg">
                Pricing
              </Button>
            </Link>
            <Link to="/login">
              <Button variant="ghost" className="text-slate-700 hover:text-blue-600 hover:bg-blue-50 px-3 md:px-4 py-2 text-base font-medium transition-all rounded-lg">
                Login
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <div className="container mx-auto px-4 py-20 flex-1">
        <div className="text-center mb-20">
          <Badge className="mb-6 text-sm px-4 py-2 border border-blue-200 bg-blue-50 text-blue-700 tracking-wide font-semibold">
            <Sparkles className="w-4 h-4 mr-2" />
            meldra · Data Made Simple
          </Badge>
          <h1 className="text-4xl md:text-6xl text-slate-900 font-bold mb-6 tracking-tight max-w-5xl mx-auto" style={{ fontFamily: "'Space Grotesk', sans-serif", lineHeight: '1.1', letterSpacing: '-0.03em' }}>
            Tell Meldra what you need. Get the report, the slides or the clean file.
          </h1>
          <p className="text-lg md:text-xl text-slate-600 max-w-3xl mx-auto mb-8 leading-relaxed" style={{ letterSpacing: '-0.01em', lineHeight: '1.7' }}>
            Describe the job in your own words and attach your files. Meldra picks the right tool, sets it up and you check the result. No formulas, no IT ticket, and your files are never stored.
          </p>
          <div className="flex flex-wrap justify-center gap-3 mb-14">
            <Link to="/register">
              <Button className="px-8 py-4 h-auto rounded-xl font-semibold text-lg bg-blue-600 hover:bg-blue-700 text-white shadow-lg flex items-center gap-2">
                Start free for 60 days
                <ArrowRight className="w-5 h-5" />
              </Button>
            </Link>
            <Link to="/pricing">
              <Button variant="outline" className="px-8 py-4 h-auto rounded-xl font-semibold text-lg border-slate-300">See plans</Button>
            </Link>
          </div>

          {/* How a request looks in the product (illustration of the real Ask Meldra panel) */}
          <div className="mx-auto mb-16 max-w-3xl rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-xl" aria-label="Example of Ask Meldra">
            <div className="rounded-xl border border-slate-300 px-4 py-3 text-slate-800">
              Compare my bank statement with the ledger and show what doesn’t match
              <div className="mt-2 flex flex-wrap gap-2 text-xs">
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-slate-600">bank_march.csv</span>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-slate-600">ledger_march.xlsx</span>
              </div>
            </div>
            <div className="mt-4 flex items-center gap-2 text-sm font-medium text-slate-900"><Sparkles className="w-4 h-4 text-blue-600" /> Here’s how Meldra will do it</div>
            <div className="mt-2 flex items-center justify-between gap-3 rounded-xl border border-slate-200 p-3">
              <div>
                <div className="text-sm font-semibold text-slate-900">1. Reconciliation</div>
                <div className="text-sm text-slate-500">Matches the two files and lists every difference</div>
              </div>
              <span className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white">Open →</span>
            </div>
          </div>

          {/* Jobs people come to Meldra for */}
          <h2 className="text-2xl md:text-3xl font-bold text-slate-900 mb-6 tracking-tight" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Jobs Meldra does for you</h2>
          <div className="mx-auto mb-16 grid max-w-5xl grid-cols-1 gap-4 text-left sm:grid-cols-2 lg:grid-cols-3">
            {JOBS.map((job) => (
              <div key={job.title} className="rounded-2xl border border-slate-200 bg-white p-5">
                <div className="text-base font-semibold text-slate-900">{job.title}</div>
                <p className="mt-1 text-sm text-slate-600">{job.text}</p>
              </div>
            ))}
          </div>

          {/* Privacy: the same promise as the Privacy page and docs/DATA_PROTECTION.md */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-8 md:p-10 max-w-4xl mx-auto text-left">
            <div className="flex items-start gap-6">
              <Shield className="w-10 h-10 text-blue-600 flex-shrink-0 mt-1" />
              <div>
                <h3 className="text-2xl md:text-3xl font-bold text-slate-900 mb-4 tracking-tight" style={{ fontFamily: "'Space Grotesk', sans-serif", letterSpacing: '-0.02em' }}>
                  Your files are never stored
                </h3>
                <p className="text-base md:text-lg text-slate-600 leading-relaxed mb-6" style={{ letterSpacing: '-0.01em', lineHeight: '1.8' }}>
                  Spreadsheet analysis runs in your browser. Tools that need our server process your file in memory and discard it. We never keep your files, their names or their contents, only your account, sign-in and billing records.
                </p>
                <div className="flex flex-wrap gap-4 text-sm md:text-base text-slate-600">
                  <span className="flex items-center gap-2 font-medium"><CheckCircle className="w-5 h-5 text-blue-600" /> No files or file names kept</span>
                  <span className="flex items-center gap-2 font-medium"><CheckCircle className="w-5 h-5 text-blue-600" /> AI gets only what the task needs, and doesn’t train on it</span>
                  <span className="flex items-center gap-2 font-medium"><CheckCircle className="w-5 h-5 text-blue-600" /> Delete your account any time</span>
                </div>
                <Link to="/privacy" className="mt-4 inline-block text-sm font-medium text-blue-700 hover:underline">Exactly what we keep and for how long →</Link>
              </div>
            </div>
          </div>

        </div>

        {/* What you can do — business language, outcome-focused */}
        <div className="mb-24">
          <h2 className="text-5xl md:text-6xl font-bold text-slate-900 text-center mb-6 tracking-tight" style={{ fontFamily: "'Space Grotesk', sans-serif", letterSpacing: '-0.03em', lineHeight: '1.2' }}>
            What You Can Do
          </h2>
          <p className="text-xl md:text-2xl text-slate-600 text-center mb-16 max-w-3xl mx-auto font-light leading-relaxed" style={{ letterSpacing: '-0.01em', lineHeight: '1.7' }}>
            Ask in plain English. Get charts, P&Ls, and board-ready slides. All in one place—no formulas, no IT tickets.
          </p>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {[
              { icon: BarChart3, icon2: Brain, title: 'Ask Your Data Questions', description: 'Upload Excel or CSV, ask things like "What\'s our top product?" or "Show sales by region." Get answers and charts. Export to PDF, Excel, or Word for your report or deck.' },
              { icon: Workflow, icon2: Target, title: 'Ask Meldra', description: 'Say what you need in your own words and attach your files. Meldra picks the right tool, sets it up and you check the result.' },
              { icon: BarChart3, icon2: TrendingUp, title: 'Charts for P&L, Forecasts & More', description: '30+ chart types: P&L views, forecasts, and standard business charts. One click to put them in Excel, Word, or an image for your presentation.' },
              { icon: Database, icon2: Layers, title: 'Design How Your Tables Connect', description: 'Draw how your database tables link together. AI helps. Export the structure for your tech team—no need to write it from scratch.' },
              { icon: FileSpreadsheet, icon2: TrendingUp, title: 'P&L From a Sentence', description: 'Describe your P&L in words (e.g. "Revenue 100k, COGS 40%"). Get the numbers, charts, and a report. Use it for month-end or board packs.' },
              { icon: FileText, icon2: FileCheck, title: 'Excel to PowerPoint', description: 'Turn your Excel sheet into slides with charts and tables. No copy-paste. One flow from data to client-ready or board-ready deck.' },
              { icon: FileCheck, icon2: Zap, title: 'Fix Messy Filenames in ZIPs', description: 'ZIP full of odd characters or broken names? Clean and rename in one go. Fewer errors when others open your files.' },
              { icon: BarChart3, icon2: Target, title: 'Clean & Filter Without Formulas', description: 'Remove duplicates, trim spaces, fix dates and numbers. Filter by several conditions at once. Undo anytime. Pre-made templates for Sales, Finance, HR.' },
              { icon: Shield, icon2: Eye, title: 'Reconcile Two Files', description: 'Bank statement vs ledger, this month vs last: match the rows and see every difference, ready to export.' }
            ].map((feature, idx) => (
              <div key={idx} className="bg-slate-50 border border-slate-200 rounded-xl p-6 transition-all group hover:border-blue-200 hover:bg-white">
                <div className="w-16 h-16 rounded-xl flex items-center justify-center mb-4 bg-blue-100 group-hover:bg-blue-200 transition-colors">
                  <feature.icon className="w-8 h-8 text-blue-600" />
                </div>
                <h3 className="text-xl md:text-2xl font-bold text-slate-900 mb-3 tracking-tight" style={{ fontFamily: "'Space Grotesk', sans-serif", letterSpacing: '-0.02em' }}>{feature.title}</h3>
                <p className="text-slate-600 text-base md:text-lg leading-relaxed font-light" style={{ letterSpacing: '-0.01em', lineHeight: '1.7' }}>{feature.description}</p>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Contact & Support Section */}
      <div className="container mx-auto px-4 py-16 border-t border-slate-200 bg-white">
        <div className="max-w-4xl mx-auto">
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-8 md:p-12 text-center">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 bg-blue-600">
              <Mail className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mb-6 tracking-tight" style={{ fontFamily: "'Space Grotesk', sans-serif", letterSpacing: '-0.03em' }}>
              Have Questions?
            </h2>
            <p className="text-xl md:text-2xl text-slate-600 mb-8 max-w-3xl mx-auto font-light leading-relaxed" style={{ letterSpacing: '-0.01em', lineHeight: '1.7' }}>
              We&apos;re here to help. Questions, a quick demo, or feedback: get in touch.
            </p>
            <div className="flex items-center justify-center gap-3">
              <Mail className="w-5 h-5 text-blue-600" />
              <a href="mailto:support@meldra.ai" className="text-xl font-semibold text-blue-600 hover:text-blue-700 transition-colors">
                support@meldra.ai
              </a>
            </div>
            <p className="text-sm text-slate-500 mt-4">
              We typically respond within 24 hours
            </p>
          </div>
        </div>
      </div>

      {/* Footer — same as Developers, consistent */}
      <footer className="w-full border-t border-slate-200 py-6 px-4 mt-auto bg-white">
        <div className="container mx-auto flex flex-col md:flex-row items-center justify-center gap-4">
          <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-slate-600">
            <Link to="/developers" className="text-blue-600 hover:text-blue-700">
              Developers
            </Link>
            <a href="mailto:support@meldra.ai" className="text-blue-600 hover:text-blue-700">
              Support
            </a>
            <Link to="/pricing" className="text-blue-600 hover:text-blue-700">
              Pricing
            </Link>
            <span className="text-slate-500">© {new Date().getFullYear()} meldra. All rights reserved.</span>
          </div>
        </div>
      </footer>

      <CookieConsent privacyUrl="/Privacy" />
    </div>
  );
}
