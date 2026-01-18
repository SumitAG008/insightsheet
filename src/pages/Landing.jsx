// pages/Landing.jsx - Main landing page with About Us and application information
import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Logo from '@/components/branding/Logo';
import {
  Shield, Zap, TrendingUp, Brain, Lock, FileText, 
  ArrowRight, Sparkles, BarChart3, Database, FileSpreadsheet, 
  Rocket, CheckCircle, Star, Layers, Workflow, 
  Eye, Globe, FileCheck, Target, Lightbulb, Mail
} from 'lucide-react';

export default function Landing() {
  return (
    <div className="min-h-screen flex flex-col bg-white">
      {/* Header — same as page (white, royal blue), part of one consistent layout */}
      <header className="w-full border-b border-slate-200 py-5 px-6 md:px-8 bg-white sticky top-0 z-40">
        <div className="container mx-auto flex items-center justify-between max-w-7xl">
          <Logo size="medium" showText={true} className="text-slate-900" lowercaseM />
          <div className="flex items-center gap-2 md:gap-4">
            <Link to="/developers">
              <Button variant="ghost" className="text-slate-700 hover:text-blue-600 hover:bg-blue-50 px-4 py-2 text-base font-medium transition-all rounded-lg">
                Developers
              </Button>
            </Link>
            <Link to="/pricing">
              <Button variant="ghost" className="text-slate-700 hover:text-blue-600 hover:bg-blue-50 px-4 py-2 text-base font-medium transition-all rounded-lg">
                Pricing
              </Button>
            </Link>
            <Link to="/login">
              <Button variant="ghost" className="text-slate-700 hover:text-blue-600 hover:bg-blue-50 px-4 py-2 text-base font-medium transition-all rounded-lg">
                Login
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <div className="container mx-auto px-4 py-20 flex-1">
        <div className="text-center mb-20">
          <Badge className="mb-8 text-base px-5 py-2.5 border border-blue-200 bg-blue-50 text-blue-700 tracking-wide font-semibold">
            <Sparkles className="w-4 h-4 mr-2" />
            Reports &amp; Slides From Your Data—No Formulas. We Don&apos;t Store Your Files.
          </Badge>
          <h1 className="text-5xl md:text-7xl lg:text-8xl text-slate-900 font-bold mb-6 tracking-tight" style={{ fontFamily: "'Space Grotesk', sans-serif", lineHeight: '1.1', letterSpacing: '-0.03em' }}>
            Data Made Simple
          </h1>
          <p className="text-xl md:text-2xl text-slate-600 max-w-4xl mx-auto mb-12 leading-relaxed font-light" style={{ letterSpacing: '-0.01em', lineHeight: '1.7' }}>
            Upload your data, ask questions in plain English, and get charts, P&Ls, and presentation-ready reports. 
            Your files never leave your control—we don&apos;t store them.
          </p>
          {/* Zero Storage Promise — royal blue accents */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-8 md:p-10 mb-16 max-w-4xl mx-auto">
            <div className="flex items-start gap-6">
              <Shield className="w-10 h-10 text-blue-600 flex-shrink-0 mt-1" />
              <div>
                <h3 className="text-2xl md:text-3xl font-bold text-slate-900 mb-4 tracking-tight" style={{ fontFamily: "'Space Grotesk', sans-serif", letterSpacing: '-0.02em' }}>
                  We Don&apos;t Store Your Data
                </h3>
                <p className="text-base md:text-lg text-slate-600 leading-relaxed mb-6 font-light" style={{ letterSpacing: '-0.01em', lineHeight: '1.8' }}>
                  <strong className="text-slate-900 font-semibold">Your files never touch our servers.</strong> Everything runs on your device. 
                  When you&apos;re done, your report or presentation downloads straight to you. Nothing is left on our side—so you stay in control and compliant.
                </p>
                <div className="flex flex-wrap gap-4 text-sm md:text-base text-slate-600">
                  <span className="flex items-center gap-2 font-medium"><CheckCircle className="w-5 h-5 text-blue-600" /> We don&apos;t keep your files</span>
                  <span className="flex items-center gap-2 font-medium"><CheckCircle className="w-5 h-5 text-blue-600" /> Download as soon as it&apos;s ready</span>
                  <span className="flex items-center gap-2 font-medium"><CheckCircle className="w-5 h-5 text-blue-600" /> Works on your device</span>
                  <span className="flex items-center gap-2 font-medium"><CheckCircle className="w-5 h-5 text-blue-600" /> Nothing left behind when you close</span>
                </div>
              </div>
            </div>
          </div>
          <div className="flex justify-center mt-12">
            <Link to="/register">
              <Button className="px-10 py-5 rounded-xl font-semibold text-xl md:text-2xl bg-blue-600 hover:bg-blue-700 text-white border-2 border-blue-700 transition-all shadow-lg flex items-center gap-3 hover:scale-105">
                Get Started Free
                <ArrowRight className="w-6 h-6" />
              </Button>
            </Link>
          </div>

          {/* Built for business teams — plain-English, no tech jargon */}
          <div className="mt-20 mb-16 max-w-4xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-bold text-slate-900 text-center mb-2 tracking-tight" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              Built for business teams
            </h2>
            <p className="text-slate-600 text-center mb-10 font-light">
              No formulas or IT needed. Describe what you need—get reports and slides.
            </p>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 text-center">
                <Target className="w-10 h-10 text-blue-600 mx-auto mb-4" />
                <h3 className="font-bold text-slate-900 mb-2">Finance</h3>
                <p className="text-slate-600 text-sm font-light">P&L from a sentence. Month-end reports and charts without formula hell.</p>
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 text-center">
                <TrendingUp className="w-10 h-10 text-blue-600 mx-auto mb-4" />
                <h3 className="font-bold text-slate-900 mb-2">Sales &amp; Ops</h3>
                <p className="text-slate-600 text-sm font-light">Clean data, spot trends, turn it into slides or PDFs—all in one place.</p>
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 text-center">
                <Eye className="w-10 h-10 text-blue-600 mx-auto mb-4" />
                <h3 className="font-bold text-slate-900 mb-2">Leaders</h3>
                <p className="text-slate-600 text-sm font-light">Ask questions about your data in plain English. Your files never leave your control.</p>
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
              { icon: BarChart3, icon2: Brain, title: 'Ask Your Data Questions', description: 'Upload Excel or CSV, ask things like “What’s our top product?” or “Show sales by region.” Get answers and charts. Export to PDF, Excel, or Word for your report or deck.' },
              { icon: Workflow, icon2: Target, title: 'AI That Does the Steps for You', description: 'Tell it what you need in plain English—e.g. “Clean this, add a chart, export to PowerPoint.” It does the work so you don’t have to click through every step.' },
              { icon: BarChart3, icon2: TrendingUp, title: 'Charts for P&L, Forecasts & More', description: '30+ chart types: P&L views, forecasts, and standard business charts. One click to put them in Excel, Word, or an image for your presentation.' },
              { icon: Database, icon2: Layers, title: 'Design How Your Tables Connect', description: 'Draw how your database tables link together. AI helps. Export the structure for your tech team—no need to write it from scratch.' },
              { icon: FileSpreadsheet, icon2: TrendingUp, title: 'P&L From a Sentence', description: 'Describe your P&L in words (e.g. “Revenue 100k, COGS 40%”). Get the numbers, charts, and a report. Use it for month-end or board packs.' },
              { icon: FileText, icon2: FileCheck, title: 'Excel to PowerPoint', description: 'Turn your Excel sheet into slides with charts and tables. No copy‑paste. One flow from data to client-ready or board-ready deck.' },
              { icon: FileCheck, icon2: Zap, title: 'Fix Messy Filenames in ZIPs', description: 'ZIP full of odd characters or broken names? Clean and rename in one go. Fewer errors when others open your files.' },
              { icon: BarChart3, icon2: Target, title: 'Clean & Filter Without Formulas', description: 'Remove duplicates, trim spaces, fix dates and numbers. Filter by several conditions at once. Undo anytime. Pre-made templates for Sales, Finance, HR.' },
              { icon: Shield, icon2: Eye, title: 'Your Data Never Sits on Our Servers', description: 'Everything runs on your device. Files download when ready. When you’re done, nothing is left on our side. You stay in control.' }
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

        {/* Key Benefits — royal blue */}
        <div className="rounded-2xl p-10 md:p-16 mb-5 border border-slate-200 bg-slate-50">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-4xl md:text-5xl font-bold text-slate-900 text-center mb-12 tracking-tight" style={{ fontFamily: "'Space Grotesk', sans-serif", letterSpacing: '-0.03em' }}>
              Why Choose Meldra?
            </h2>
            <div className="grid md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6 bg-blue-600">
                  <Lock className="w-10 h-10 text-white" />
                </div>
                <h3 className="text-xl md:text-2xl font-bold text-slate-900 mb-3 tracking-tight" style={{ fontFamily: "'Space Grotesk', sans-serif", letterSpacing: '-0.02em' }}>We Don&apos;t Keep Your Files</h3>
                <p className="text-slate-600 text-base md:text-lg font-light leading-relaxed" style={{ letterSpacing: '-0.01em', lineHeight: '1.7' }}>Your data stays on your device. We never store it. Strong for compliance and for anyone who wants to stay in control.</p>
              </div>
              <div className="text-center">
                <div className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6 bg-blue-600">
                  <Zap className="w-10 h-10 text-white" />
                </div>
                <h3 className="text-xl md:text-2xl font-bold text-slate-900 mb-3 tracking-tight" style={{ fontFamily: "'Space Grotesk', sans-serif", letterSpacing: '-0.02em' }}>No Formulas Required</h3>
                <p className="text-slate-600 text-base md:text-lg font-light leading-relaxed" style={{ letterSpacing: '-0.01em', lineHeight: '1.7' }}>Describe what you need in plain English. AI helps with analysis, charts, and exports—so you spend less time in the weeds.</p>
              </div>
              <div className="text-center">
                <div className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6 bg-blue-600">
                  <TrendingUp className="w-10 h-10 text-white" />
                </div>
                <h3 className="text-xl md:text-2xl font-bold text-slate-900 mb-3 tracking-tight" style={{ fontFamily: "'Space Grotesk', sans-serif", letterSpacing: '-0.02em' }}>Board- and Client-Ready</h3>
                <p className="text-slate-600 text-base md:text-lg font-light leading-relaxed" style={{ letterSpacing: '-0.01em', lineHeight: '1.7' }}>Get reports and slides you can hand to leadership or clients. Export to PDF, Excel, Word, or PowerPoint—whatever you need.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* About the Application Section */}
      <div className="container mx-auto px-4 pt-5 pb-8 border-t border-slate-200 bg-white">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-4xl font-bold text-slate-900 text-center mb-4">
            About Meldra
          </h2>
          <p className="text-xl text-slate-600 text-center mb-12">
            Turn data into reports and slides—without formulas or IT
          </p>

          {/* In plain English — business language */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-10 md:p-12 mb-10">
            <h3 className="text-3xl md:text-4xl font-bold text-slate-900 mb-8 flex items-center gap-3 tracking-tight" style={{ fontFamily: "'Space Grotesk', sans-serif", letterSpacing: '-0.02em' }}>
              <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-blue-600">
                <Rocket className="w-6 h-6 text-white" />
              </div>
              In Plain English
            </h3>
            <div className="space-y-6">
              <div>
                <h4 className="text-xl md:text-2xl font-bold text-slate-900 mb-4 flex items-center gap-3 tracking-tight" style={{ fontFamily: "'Space Grotesk', sans-serif", letterSpacing: '-0.02em' }}>
                  <BarChart3 className="w-6 h-6 text-blue-600" />
                  Ask Questions, Get Answers & Charts
                </h4>
                <ul className="list-disc list-inside space-y-3 text-slate-600 ml-4 text-base md:text-lg font-light leading-relaxed" style={{ letterSpacing: '-0.01em', lineHeight: '1.8' }}>
                  <li><strong className="text-slate-900 font-semibold">Ask in plain English:</strong> Upload Excel or CSV and ask things like “What’s our top product?” or “Show sales by region.” Get answers and charts fast.</li>
                  <li><strong className="text-slate-900 font-semibold">Clean data without formulas:</strong> Remove duplicates, fix dates and numbers, trim spaces. Filter by several conditions at once.</li>
                  <li><strong className="text-slate-900 font-semibold">Charts for P&L, forecasts, and more:</strong> 30+ chart types. One click to add them to Excel, Word, or an image for your deck.</li>
                  <li><strong className="text-slate-900 font-semibold">Export what you need:</strong> PDF, Excel, Word, CSV, or image—whatever your report or presentation requires.</li>
                </ul>
              </div>
              <div>
                <h4 className="text-xl md:text-2xl font-bold text-slate-900 mb-4 flex items-center gap-3 tracking-tight" style={{ fontFamily: "'Space Grotesk', sans-serif", letterSpacing: '-0.02em' }}>
                  <Brain className="w-6 h-6 text-blue-600" />
                  AI That Does the Work for You
                </h4>
                <ul className="list-disc list-inside space-y-3 text-slate-600 ml-4 text-base md:text-lg font-light leading-relaxed" style={{ letterSpacing: '-0.01em', lineHeight: '1.8' }}>
                  <li><strong className="text-slate-900 font-semibold">Tell it what you need:</strong> e.g. “Clean this, add a chart, export to PowerPoint.” It runs the steps so you don’t have to.</li>
                  <li><strong className="text-slate-900 font-semibold">Formula help:</strong> Not sure which formula to use? AI suggests options for your Excel-style calculations.</li>
                  <li><strong className="text-slate-900 font-semibold">Templates:</strong> Pre-built for Sales, Finance, HR, Marketing—start from something that fits your role.</li>
                </ul>
              </div>
              <div>
                <h4 className="text-xl md:text-2xl font-bold text-slate-900 mb-4 flex items-center gap-3 tracking-tight" style={{ fontFamily: "'Space Grotesk', sans-serif", letterSpacing: '-0.02em' }}>
                  <FileSpreadsheet className="w-6 h-6 text-blue-600" />
                  Reports & Slides Ready to Share
                </h4>
                <ul className="list-disc list-inside space-y-3 text-slate-600 ml-4 text-base md:text-lg font-light leading-relaxed" style={{ letterSpacing: '-0.01em', lineHeight: '1.8' }}>
                  <li><strong className="text-slate-900 font-semibold">P&L from a sentence:</strong> Describe it in words; get numbers and charts. Use for month-end or board packs.</li>
                  <li><strong className="text-slate-900 font-semibold">Excel to PowerPoint:</strong> Turn your sheet into slides with charts and tables. One flow from data to deck.</li>
                  <li><strong className="text-slate-900 font-semibold">PDF and more:</strong> Export tables and charts as PDF. Undo/redo and shortcuts (e.g. Ctrl+Z, Ctrl+S) when you’re editing.</li>
                </ul>
              </div>
              <div>
                <h4 className="text-xl md:text-2xl font-bold text-slate-900 mb-4 flex items-center gap-3 tracking-tight" style={{ fontFamily: "'Space Grotesk', sans-serif", letterSpacing: '-0.02em' }}>
                  <Database className="w-6 h-6 text-blue-600" />
                  Files & Databases
                </h4>
                <ul className="list-disc list-inside space-y-3 text-slate-600 ml-4 text-base md:text-lg font-light leading-relaxed" style={{ letterSpacing: '-0.01em', lineHeight: '1.8' }}>
                  <li><strong className="text-slate-900 font-semibold">Design how tables connect:</strong> Draw the links between your database tables. AI helps. Export the structure for your tech team.</li>
                  <li><strong className="text-slate-900 font-semibold">Fix messy ZIPs:</strong> Clean and rename files in ZIPs so they open correctly. Fewer “file not found” or encoding issues.</li>
                  <li><strong className="text-slate-900 font-semibold">Formats we support:</strong> Excel (.xlsx, .xls), CSV, ZIP, and PDF.</li>
                </ul>
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 md:p-8">
                <h4 className="text-xl md:text-2xl font-bold text-slate-900 mb-4 flex items-center gap-3 tracking-tight" style={{ fontFamily: "'Space Grotesk', sans-serif", letterSpacing: '-0.02em' }}>
                  <Shield className="w-6 h-6 text-blue-600" />
                  We Don&apos;t Store Your Data
                </h4>
                <p className="text-slate-600 text-base md:text-lg leading-relaxed font-light" style={{ letterSpacing: '-0.01em', lineHeight: '1.8' }}>
                  <strong className="text-slate-900 font-semibold">Your files never sit on our servers.</strong> Everything runs on your device. When you’re done, your file downloads to you. Nothing is left on our side—so you stay in control and compliant.
                </p>
              </div>
            </div>
          </div>
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-10 md:p-12 mb-10">
            <h3 className="text-3xl md:text-4xl font-bold text-slate-900 mb-6 flex items-center gap-3 tracking-tight" style={{ fontFamily: "'Space Grotesk', sans-serif", letterSpacing: '-0.02em' }}>
              <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-blue-600">
                <Rocket className="w-6 h-6 text-white" />
              </div>
              Our Mission
            </h3>
            <p className="text-slate-600 text-lg md:text-xl leading-relaxed mb-6 font-light" style={{ letterSpacing: '-0.01em', lineHeight: '1.8' }}>
              We believe everyone should be able to turn data into reports and slides—without formulas, without IT, and without handing over their files. 
              Meldra gives you strong analysis and clear output while keeping your data on your side.
            </p>
            <p className="text-slate-600 text-lg md:text-xl leading-relaxed font-light" style={{ letterSpacing: '-0.01em', lineHeight: '1.8' }}>
              We don’t store your data. It runs on your device and is gone when you’re done. You get the insights you need and keep full control.
            </p>
          </div>
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-8 mb-8">
            <h3 className="text-2xl font-bold text-slate-900 mb-4 flex items-center gap-2">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-blue-600">
                <Lightbulb className="w-5 h-5 text-white" />
              </div>
              What You Get
            </h3>
            <ul className="list-disc list-inside space-y-2 text-slate-600 ml-4">
              <li>Ask questions in plain English and get answers and charts</li>
              <li>Your data stays on your device—we never see or keep it</li>
              <li>Charts and reports you can share with leadership or clients</li>
              <li>AI that can run several steps for you (clean, chart, export) from one instruction</li>
              <li>Tools to design how your database tables connect, with AI help</li>
            </ul>
          </div>
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-8">
            <h3 className="text-2xl font-bold text-slate-900 mb-4 flex items-center gap-2">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-blue-600">
                <Star className="w-5 h-5 text-white" />
              </div>
              What Makes Us Different
            </h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-1" />
                <div>
                  <h4 className="font-semibold text-slate-900 mb-1">We Don&apos;t Keep Your Files</h4>
                  <p className="text-sm text-slate-600">Everything runs on your device. When you’re done, nothing is left on our side.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-1" />
                <div>
                  <h4 className="font-semibold text-slate-900 mb-1">No Formulas or Tech Jargon</h4>
                  <p className="text-sm text-slate-600">Say what you need in normal language. Meldra does the rest.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-1" />
                <div>
                  <h4 className="font-semibold text-slate-900 mb-1">Strong AI Without Big Budgets</h4>
                  <p className="text-sm text-slate-600">Get analysis and automation that works—without enterprise pricing.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-1" />
                <div>
                  <h4 className="font-semibold text-slate-900 mb-1">Ready for Your Board or Clients</h4>
                  <p className="text-sm text-slate-600">Reports and slides you can hand over. Export to PDF, Excel, Word, or PowerPoint.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Trust & Value Proposition Section */}
      <div className="container mx-auto px-4 py-16 border-t border-slate-200 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-slate-900 mb-4">
              Why Teams Use Meldra
            </h2>
            <p className="text-xl text-slate-600 max-w-2xl mx-auto">
              From finance to sales to leadership—one place to turn data into reports and slides
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-6 mb-12">
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-8 text-center">
              <div className="w-16 h-16 rounded-xl flex items-center justify-center mx-auto mb-6 bg-blue-600">
                <Globe className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl md:text-2xl font-bold text-slate-900 mb-3 tracking-tight" style={{ fontFamily: "'Space Grotesk', sans-serif", letterSpacing: '-0.02em' }}>Use It Anywhere</h3>
              <p className="text-slate-600 text-base md:text-lg font-light leading-relaxed" style={{ letterSpacing: '-0.01em', lineHeight: '1.7' }}>In the office, at home, or on the go. One login, same tools, no extra setup.</p>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-8 text-center">
              <div className="w-16 h-16 rounded-xl flex items-center justify-center mx-auto mb-6 bg-blue-600">
                <Zap className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl md:text-2xl font-bold text-slate-900 mb-3 tracking-tight" style={{ fontFamily: "'Space Grotesk', sans-serif", letterSpacing: '-0.02em' }}>Minutes, Not Hours</h3>
              <p className="text-slate-600 text-base md:text-lg font-light leading-relaxed" style={{ letterSpacing: '-0.01em', lineHeight: '1.7' }}>From raw data to a first draft of your report or deck in minutes. Less waiting, more doing.</p>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-8 text-center">
              <div className="w-16 h-16 rounded-xl flex items-center justify-center mx-auto mb-6 bg-blue-600">
                <Lightbulb className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl md:text-2xl font-bold text-slate-900 mb-3 tracking-tight" style={{ fontFamily: "'Space Grotesk', sans-serif", letterSpacing: '-0.02em' }}>See What You Might Miss</h3>
              <p className="text-slate-600 text-base md:text-lg font-light leading-relaxed" style={{ letterSpacing: '-0.01em', lineHeight: '1.7' }}>AI spots trends and answers questions so you can make better decisions, faster.</p>
            </div>
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
              We&apos;re here to help. Questions, a quick demo, or feedback—get in touch.
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
            <span className="text-slate-500">© {new Date().getFullYear()} Meldra. All rights reserved.</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
