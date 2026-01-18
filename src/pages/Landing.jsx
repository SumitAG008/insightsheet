// pages/Landing.jsx - Main landing page with About Us and application information
import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Logo from '@/components/branding/Logo';
import {
  Shield, Zap, TrendingUp, Brain, Lock, FileText, 
  ArrowRight, Sparkles, BarChart3, Database, FileSpreadsheet, 
  Code, Rocket, CheckCircle, Star, Layers, Cpu, Workflow, 
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
            Privacy-First Data Analysis Platform
          </Badge>
          <h1 className="text-5xl md:text-7xl lg:text-8xl text-slate-900 font-bold mb-6 tracking-tight" style={{ fontFamily: "'Space Grotesk', sans-serif", lineHeight: '1.1', letterSpacing: '-0.03em' }}>
            Data Made Simple
          </h1>
          <p className="text-xl md:text-2xl text-slate-600 max-w-4xl mx-auto mb-12 leading-relaxed font-light" style={{ letterSpacing: '-0.01em', lineHeight: '1.7' }}>
            Transform complex data into clear, actionable insights through intelligent AI analysis, seamless automation, and enterprise-grade reporting capabilities. 
            Experience the power of advanced analytics while maintaining absolute control over your data privacy and security.
          </p>
          {/* Zero Storage Promise — royal blue accents */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-8 md:p-10 mb-16 max-w-4xl mx-auto">
            <div className="flex items-start gap-6">
              <Shield className="w-10 h-10 text-blue-600 flex-shrink-0 mt-1" />
              <div>
                <h3 className="text-2xl md:text-3xl font-bold text-slate-900 mb-4 tracking-tight" style={{ fontFamily: "'Space Grotesk', sans-serif", letterSpacing: '-0.02em' }}>
                  Zero Data Storage Guarantee
                </h3>
                <p className="text-base md:text-lg text-slate-600 leading-relaxed mb-6 font-light" style={{ letterSpacing: '-0.01em', lineHeight: '1.8' }}>
                  <strong className="text-slate-900 font-semibold">Your data never touches our servers.</strong> Every operation executes entirely within your browser environment. 
                  Upon completion, processed files download automatically to your device using the original filename with an appended timestamp. 
                  Zero data persistence. Complete privacy assurance. Absolute control.
                </p>
                <div className="flex flex-wrap gap-4 text-sm md:text-base text-slate-600">
                  <span className="flex items-center gap-2 font-medium"><CheckCircle className="w-5 h-5 text-blue-600" /> No file storage</span>
                  <span className="flex items-center gap-2 font-medium"><CheckCircle className="w-5 h-5 text-blue-600" /> Immediate download</span>
                  <span className="flex items-center gap-2 font-medium"><CheckCircle className="w-5 h-5 text-blue-600" /> Browser-only processing</span>
                  <span className="flex items-center gap-2 font-medium"><CheckCircle className="w-5 h-5 text-blue-600" /> Auto-delete after processing</span>
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
        </div>

        {/* Comprehensive Features Section — white/royal blue, consistent with header */}
        <div className="mb-24">
          <h2 className="text-5xl md:text-6xl font-bold text-slate-900 text-center mb-6 tracking-tight" style={{ fontFamily: "'Space Grotesk', sans-serif", letterSpacing: '-0.03em', lineHeight: '1.2' }}>
            Complete Feature Suite
          </h2>
          <p className="text-xl md:text-2xl text-slate-600 text-center mb-16 max-w-3xl mx-auto font-light leading-relaxed" style={{ letterSpacing: '-0.01em', lineHeight: '1.7' }}>
            Comprehensive tools for analysis, transformation, and visualization—unified in a single, powerful platform designed for professionals who demand excellence
          </p>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {[
              { icon: BarChart3, icon2: Brain, title: 'AI-Powered Data Analysis', description: 'Upload CSV/Excel files and get instant AI-powered insights, trends, and patterns. Smart data validation, type detection, and anomaly identification. Export to PDF, Excel, Word, or PNG.' },
              { icon: Workflow, icon2: Target, title: 'Agentic AI Assistant', description: 'Autonomous AI agent that plans, executes, and reports on complex data operations using natural language. Handles multi-step workflows automatically.' },
              { icon: BarChart3, icon2: TrendingUp, title: 'Enhanced Chart System', description: '30+ professional chart types organized by category: Core P&L, Forecasting, and Analytics. Export charts to Excel (.xlsx), Word (.docx), or PNG with one click.' },
              { icon: Database, icon2: Layers, title: 'Database Schema Designer', description: 'Visual database schema creator with AI assistance. Design relationships, generate SQL schemas, and export database structures effortlessly.' },
              { icon: FileSpreadsheet, icon2: TrendingUp, title: 'P&L Builder', description: 'Build Profit & Loss statements from natural language. Automated financial calculations, variance analysis, and professional reporting with charts.' },
              { icon: FileText, icon2: FileCheck, title: 'Excel to PowerPoint', description: 'Convert Excel data into professional PowerPoint presentations with charts, tables, and visualizations. Automatic formatting and styling.' },
              { icon: FileCheck, icon2: Zap, title: 'ZIP File Cleaner', description: 'Clean and rename files in ZIP archives. Remove special characters, sanitize filenames, and organize files with batch processing.' },
              { icon: BarChart3, icon2: Target, title: 'Advanced Data Tools', description: 'Smart data cleaning (remove duplicates, trim spaces, fix types), advanced filtering with multi-column support, undo/redo, keyboard shortcuts, and data templates library.' },
              { icon: Shield, icon2: Eye, title: 'Zero Storage Architecture', description: 'All processing happens in your browser. Files download immediately with original name + timestamp. No data stored on servers - complete privacy guaranteed.' }
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
        <div className="rounded-2xl p-10 md:p-16 mb-12 border border-slate-200 bg-slate-50">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-4xl md:text-5xl font-bold text-slate-900 text-center mb-12 tracking-tight" style={{ fontFamily: "'Space Grotesk', sans-serif", letterSpacing: '-0.03em' }}>
              Why Choose Meldra?
            </h2>
            <div className="grid md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6 bg-blue-600">
                  <Lock className="w-10 h-10 text-white" />
                </div>
                <h3 className="text-xl md:text-2xl font-bold text-slate-900 mb-3 tracking-tight" style={{ fontFamily: "'Space Grotesk', sans-serif", letterSpacing: '-0.02em' }}>100% Private</h3>
                <p className="text-slate-600 text-base md:text-lg font-light leading-relaxed" style={{ letterSpacing: '-0.01em', lineHeight: '1.7' }}>Your data never leaves your browser. Complete privacy and security guaranteed with zero server-side storage.</p>
              </div>
              <div className="text-center">
                <div className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6 bg-blue-600">
                  <Zap className="w-10 h-10 text-white" />
                </div>
                <h3 className="text-xl md:text-2xl font-bold text-slate-900 mb-3 tracking-tight" style={{ fontFamily: "'Space Grotesk', sans-serif", letterSpacing: '-0.02em' }}>AI-Powered</h3>
                <p className="text-slate-600 text-base md:text-lg font-light leading-relaxed" style={{ letterSpacing: '-0.01em', lineHeight: '1.7' }}>Advanced artificial intelligence analyzes your data and delivers actionable insights with enterprise-grade precision.</p>
              </div>
              <div className="text-center">
                <div className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6 bg-blue-600">
                  <TrendingUp className="w-10 h-10 text-white" />
                </div>
                <h3 className="text-xl md:text-2xl font-bold text-slate-900 mb-3 tracking-tight" style={{ fontFamily: "'Space Grotesk', sans-serif", letterSpacing: '-0.02em' }}>Professional Results</h3>
                <p className="text-slate-600 text-base md:text-lg font-light leading-relaxed" style={{ letterSpacing: '-0.01em', lineHeight: '1.7' }}>Generate publication-ready reports, presentations, and visualizations that meet the highest professional standards.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* About the Application Section */}
      <div className="container mx-auto px-4 py-8 border-t border-slate-200 bg-white">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-4xl font-bold text-slate-900 text-center mb-4">
            About Meldra
          </h2>
          <p className="text-xl text-slate-600 text-center mb-12">
            Your trusted partner for data analysis and insights
          </p>

          {/* Comprehensive Features Documentation — light cards, royal blue */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-10 md:p-12 mb-10">
            <h3 className="text-3xl md:text-4xl font-bold text-slate-900 mb-8 flex items-center gap-3 tracking-tight" style={{ fontFamily: "'Space Grotesk', sans-serif", letterSpacing: '-0.02em' }}>
              <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-blue-600">
                <Rocket className="w-6 h-6 text-white" />
              </div>
              Complete Feature Suite
            </h3>
            <div className="space-y-6">
              <div>
                <h4 className="text-xl md:text-2xl font-bold text-slate-900 mb-4 flex items-center gap-3 tracking-tight" style={{ fontFamily: "'Space Grotesk', sans-serif", letterSpacing: '-0.02em' }}>
                  <BarChart3 className="w-6 h-6 text-blue-600" />
                  Data Analysis & Visualization
                </h4>
                <ul className="list-disc list-inside space-y-3 text-slate-600 ml-4 text-base md:text-lg font-light leading-relaxed" style={{ letterSpacing: '-0.01em', lineHeight: '1.8' }}>
                  <li><strong className="text-slate-900 font-semibold">AI-Powered Analysis:</strong> Upload CSV or Excel files to receive instant, intelligent insights with automated trend detection and comprehensive pattern recognition capabilities</li>
                  <li><strong className="text-slate-900 font-semibold">Smart Data Validation:</strong> Automatically detect and validate data types including email addresses, phone numbers, dates, and numerical values with precision</li>
                  <li><strong className="text-slate-900 font-semibold">Enhanced Chart System:</strong> Access over 30 professional chart types systematically organized across Core P&L, Forecasting, and Analytics categories</li>
                  <li><strong className="text-slate-900 font-semibold">Advanced Filtering:</strong> Implement sophisticated multi-column filtering with AND/OR logical operators and comprehensive global search functionality</li>
                  <li><strong className="text-slate-900 font-semibold">Data Cleaning Tools:</strong> Efficiently remove duplicates, trim whitespace, correct data types, and execute comprehensive data cleaning operations with a single action</li>
                  <li><strong className="text-slate-900 font-semibold">Export Options:</strong> Export your work to PDF, Excel (.xlsx), Word (.docx), CSV, or PNG formats with enterprise-grade professional formatting</li>
                </ul>
              </div>
              <div>
                <h4 className="text-xl md:text-2xl font-bold text-slate-900 mb-4 flex items-center gap-3 tracking-tight" style={{ fontFamily: "'Space Grotesk', sans-serif", letterSpacing: '-0.02em' }}>
                  <Brain className="w-6 h-6 text-blue-600" />
                  AI & Automation
                </h4>
                <ul className="list-disc list-inside space-y-3 text-slate-600 ml-4 text-base md:text-lg font-light leading-relaxed" style={{ letterSpacing: '-0.01em', lineHeight: '1.8' }}>
                  <li><strong className="text-slate-900 font-semibold">Agentic AI Assistant:</strong> Deploy autonomous AI agents that strategically plan, execute, and comprehensively report on complex multi-step data operations</li>
                  <li><strong className="text-slate-900 font-semibold">Natural Language Processing:</strong> Interact with your data using conversational language—ask questions in plain English and receive instant, accurate responses</li>
                  <li><strong className="text-slate-900 font-semibold">Formula Suggestions:</strong> Leverage AI-powered intelligent formula recommendations optimized for Excel calculations and data manipulation</li>
                  <li><strong className="text-slate-900 font-semibold">Data Templates Library:</strong> Access an extensive collection of pre-built templates spanning Sales, Finance, HR, Marketing, and numerous other professional domains</li>
                </ul>
              </div>
              <div>
                <h4 className="text-xl md:text-2xl font-bold text-slate-900 mb-4 flex items-center gap-3 tracking-tight" style={{ fontFamily: "'Space Grotesk', sans-serif", letterSpacing: '-0.02em' }}>
                  <FileSpreadsheet className="w-6 h-6 text-blue-600" />
                  Professional Reporting
                </h4>
                <ul className="list-disc list-inside space-y-3 text-slate-600 ml-4 text-base md:text-lg font-light leading-relaxed" style={{ letterSpacing: '-0.01em', lineHeight: '1.8' }}>
                  <li><strong className="text-slate-900 font-semibold">P&L Builder:</strong> Generate comprehensive Profit & Loss statements directly from natural language descriptions with fully automated financial calculations</li>
                  <li><strong className="text-slate-900 font-semibold">Excel to PowerPoint:</strong> Seamlessly convert Excel datasets into presentation-ready PowerPoint slides complete with charts, tables, and professional visualizations</li>
                  <li><strong className="text-slate-900 font-semibold">PDF Export:</strong> Export tables, charts, and complete reports as high-quality PDF documents with fully customizable formatting options</li>
                  <li><strong className="text-slate-900 font-semibold">Undo/Redo:</strong> Maintain complete action history with standard Ctrl+Z and Ctrl+Y keyboard shortcuts for comprehensive data modification control</li>
                  <li><strong className="text-slate-900 font-semibold">Keyboard Shortcuts:</strong> Accelerate your workflow with intuitive shortcuts: Ctrl+S (save), Ctrl+E (export), Ctrl+Z/Y (undo/redo) for maximum efficiency</li>
                </ul>
              </div>
              <div>
                <h4 className="text-xl md:text-2xl font-bold text-slate-900 mb-4 flex items-center gap-3 tracking-tight" style={{ fontFamily: "'Space Grotesk', sans-serif", letterSpacing: '-0.02em' }}>
                  <Database className="w-6 h-6 text-blue-600" />
                  Database & File Management
                </h4>
                <ul className="list-disc list-inside space-y-3 text-slate-600 ml-4 text-base md:text-lg font-light leading-relaxed" style={{ letterSpacing: '-0.01em', lineHeight: '1.8' }}>
                  <li><strong className="text-slate-900 font-semibold">Database Schema Designer:</strong> Create visual database schemas with intelligent AI assistance and automatically generate production-ready SQL schema definitions</li>
                  <li><strong className="text-slate-900 font-semibold">ZIP File Cleaner:</strong> Systematically clean and rename files within ZIP archives using advanced batch processing capabilities</li>
                  <li><strong className="text-slate-900 font-semibold">File Processing:</strong> Comprehensive support for Excel formats (.xlsx, .xls), CSV files, ZIP archives, and PDF documents</li>
                </ul>
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 md:p-8">
                <h4 className="text-xl md:text-2xl font-bold text-slate-900 mb-4 flex items-center gap-3 tracking-tight" style={{ fontFamily: "'Space Grotesk', sans-serif", letterSpacing: '-0.02em' }}>
                  <Shield className="w-6 h-6 text-blue-600" />
                  Zero Storage Architecture
                </h4>
                <p className="text-slate-600 text-base md:text-lg leading-relaxed font-light" style={{ letterSpacing: '-0.01em', lineHeight: '1.8' }}>
                  <strong className="text-slate-900 font-semibold">Critical Privacy Feature:</strong> All file processing occurs entirely in-memory with immediate download to your local device. 
                  Files are automatically and permanently deleted upon completion—zero input or output files persist on our infrastructure. 
                  Download format: <code className="bg-slate-100 px-3 py-1.5 rounded-md text-blue-700 font-mono text-sm md:text-base">originalname_YYYYMMDD_HHMMSS_mmm.extension</code>
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
              Meldra was founded on a fundamental principle: data analysis must be powerful, universally accessible, and absolutely private. 
              We've engineered a platform that delivers enterprise-grade artificial intelligence capabilities while maintaining uncompromising data security standards.
            </p>
            <p className="text-slate-600 text-lg md:text-xl leading-relaxed font-light" style={{ letterSpacing: '-0.01em', lineHeight: '1.8' }}>
              Every feature is architected with privacy-first design principles. Your data processes exclusively within your browser environment, 
              remains permanently absent from our servers, and is never shared with external parties. You receive the insights you require while 
              retaining absolute sovereignty over your information.
            </p>
          </div>
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-8 mb-8">
            <h3 className="text-2xl font-bold text-slate-900 mb-4 flex items-center gap-2">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-blue-600">
                <Code className="w-5 h-5 text-white" />
              </div>
              Technology & Innovation
            </h3>
            <p className="text-slate-600 leading-relaxed mb-4">
              Meldra leverages cutting-edge AI and machine learning technologies to provide intelligent data analysis. 
              Our platform combines:
            </p>
            <ul className="list-disc list-inside space-y-2 text-slate-600 ml-4">
              <li>Advanced Large Language Models (LLMs) for natural language data operations</li>
              <li>Browser-native processing for zero data transmission</li>
              <li>Real-time visualization and reporting capabilities</li>
              <li>Automated workflow execution with our Agentic AI system</li>
              <li>Professional-grade database schema design tools</li>
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
                  <h4 className="font-semibold text-slate-900 mb-1">Zero Data Storage</h4>
                  <p className="text-sm text-slate-600">We don't store your data. Everything processes in your browser.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-1" />
                <div>
                  <h4 className="font-semibold text-slate-900 mb-1">No Technical Knowledge Required</h4>
                  <p className="text-sm text-slate-600">Use natural language to interact with your data.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-1" />
                <div>
                  <h4 className="font-semibold text-slate-900 mb-1">Enterprise-Grade AI</h4>
                  <p className="text-sm text-slate-600">Access powerful AI capabilities without enterprise costs.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-1" />
                <div>
                  <h4 className="font-semibold text-slate-900 mb-1">Professional Output</h4>
                  <p className="text-sm text-slate-600">Generate reports and presentations ready for stakeholders.</p>
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
              Trusted by Professionals
            </h2>
            <p className="text-xl text-slate-600 max-w-2xl mx-auto">
              Join thousands of users who trust Meldra for their data analysis needs
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-6 mb-12">
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-8 text-center">
              <div className="w-16 h-16 rounded-xl flex items-center justify-center mx-auto mb-6 bg-blue-600">
                <Globe className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl md:text-2xl font-bold text-slate-900 mb-3 tracking-tight" style={{ fontFamily: "'Space Grotesk', sans-serif", letterSpacing: '-0.02em' }}>Worldwide Access</h3>
              <p className="text-slate-600 text-base md:text-lg font-light leading-relaxed" style={{ letterSpacing: '-0.01em', lineHeight: '1.7' }}>Available globally, accessible from anywhere with enterprise-grade reliability</p>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-8 text-center">
              <div className="w-16 h-16 rounded-xl flex items-center justify-center mx-auto mb-6 bg-blue-600">
                <Cpu className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl md:text-2xl font-bold text-slate-900 mb-3 tracking-tight" style={{ fontFamily: "'Space Grotesk', sans-serif", letterSpacing: '-0.02em' }}>Lightning Fast</h3>
              <p className="text-slate-600 text-base md:text-lg font-light leading-relaxed" style={{ letterSpacing: '-0.01em', lineHeight: '1.7' }}>Process complex datasets in seconds, not hours, with optimized performance</p>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-8 text-center">
              <div className="w-16 h-16 rounded-xl flex items-center justify-center mx-auto mb-6 bg-blue-600">
                <Lightbulb className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl md:text-2xl font-bold text-slate-900 mb-3 tracking-tight" style={{ fontFamily: "'Space Grotesk', sans-serif", letterSpacing: '-0.02em' }}>Smart Insights</h3>
              <p className="text-slate-600 text-base md:text-lg font-light leading-relaxed" style={{ letterSpacing: '-0.01em', lineHeight: '1.7' }}>Advanced AI algorithms discover patterns and correlations you might otherwise miss</p>
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
              We're here to help. Reach out to our dedicated support team for any enquiries, technical assistance, or feedback.
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
