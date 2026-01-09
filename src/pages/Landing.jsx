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
    <div className="min-h-screen flex flex-col" style={{ background: 'linear-gradient(to bottom right, #0A1F44, #0F2A5A, #0A1F44)' }}>
      {/* Header with Logo on Left */}
      <header className="w-full border-b border-slate-800 py-4 px-4">
        <div className="container mx-auto flex items-center justify-between">
          <Logo size="medium" showText={true} style={{ color: '#FFFFFF' }} />
          <div className="flex gap-4">
            <Link to="/pricing">
              <Button variant="ghost" className="text-white hover:text-slate-300">
                Pricing
              </Button>
            </Link>
            <Link to="/login">
              <Button variant="ghost" className="text-white hover:text-slate-300">
                Login
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <div className="container mx-auto px-4 py-20 flex-1">
        <div className="text-center mb-20">
          
          <Badge className="mb-6 text-base px-4 py-2 border" style={{ background: 'rgba(0, 191, 166, 0.2)', color: '#4FC3F7', borderColor: 'rgba(0, 191, 166, 0.3)' }}>
            <Sparkles className="w-4 h-4 mr-2" />
            Privacy-First Data Analysis Platform
          </Badge>
          <p className="text-2xl md:text-3xl text-slate-300 font-semibold mb-4">
            Data Made Simple
          </p>
          <p className="text-xl text-slate-400 max-w-3xl mx-auto mb-8 leading-relaxed">
            Transform your data into actionable insights with AI-powered analysis, automated workflows, and professional reporting. 
            All while keeping your data completely private and secure.
          </p>
          
          {/* Zero Storage Promise - Prominent */}
          <div className="bg-emerald-900/20 border border-emerald-500/30 rounded-xl p-6 mb-12 max-w-3xl mx-auto">
            <div className="flex items-start gap-4">
              <Shield className="w-8 h-8 text-emerald-400 flex-shrink-0 mt-1" />
              <div>
                <h3 className="text-lg font-bold text-emerald-300 mb-2">Zero Data Storage Guarantee</h3>
                <p className="text-slate-300 text-sm leading-relaxed mb-3">
                  <strong className="text-white">Your data is NEVER stored on our servers.</strong> All processing happens in your browser. 
                  After processing, files are immediately downloaded to your device with the original filename plus timestamp. 
                  No input or output files remain on our servers - complete privacy guaranteed.
                </p>
                <div className="flex flex-wrap gap-3 text-xs text-slate-400">
                  <span className="flex items-center gap-1">
                    <CheckCircle className="w-4 h-4 text-emerald-400" />
                    No file storage
                  </span>
                  <span className="flex items-center gap-1">
                    <CheckCircle className="w-4 h-4 text-emerald-400" />
                    Immediate download
                  </span>
                  <span className="flex items-center gap-1">
                    <CheckCircle className="w-4 h-4 text-emerald-400" />
                    Browser-only processing
                  </span>
                  <span className="flex items-center gap-1">
                    <CheckCircle className="w-4 h-4 text-emerald-400" />
                    Auto-delete after processing
                  </span>
                </div>
              </div>
            </div>
          </div>
          
          {/* Single Strategic CTA - Only in Hero */}
          <div className="flex justify-center mt-8">
            <Link to="/register">
              <Button className="px-8 py-4 rounded-lg font-semibold text-lg transition-all shadow-lg flex items-center gap-2 hover:opacity-90" style={{ background: '#000000', color: '#FFFFFF', border: '2px solid #00E5FF' }}>
                Get Started Free
                <ArrowRight className="w-5 h-5" />
              </Button>
            </Link>
          </div>
        </div>

        {/* Comprehensive Features Section */}
        <div className="mb-20">
          <h2 className="text-4xl font-bold text-white text-center mb-4">
            Complete Feature Suite
          </h2>
          <p className="text-xl text-slate-400 text-center mb-12 max-w-2xl mx-auto">
            Everything you need to analyze, transform, and visualize your data - all in one powerful platform
          </p>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {[
              {
                icon: BarChart3,
                icon2: Brain,
                title: 'AI-Powered Data Analysis',
                description: 'Upload CSV/Excel files and get instant AI-powered insights, trends, and patterns. Smart data validation, type detection, and anomaly identification. Export to PDF, Excel, Word, or PNG.',
                gradient: 'from-blue-500 via-blue-400 to-emerald-500'
              },
              {
                icon: Workflow,
                icon2: Target,
                title: 'Agentic AI Assistant',
                description: 'Autonomous AI agent that plans, executes, and reports on complex data operations using natural language. Handles multi-step workflows automatically.',
                gradient: 'from-emerald-500 via-blue-500 to-emerald-600'
              },
              {
                icon: BarChart3,
                icon2: TrendingUp,
                title: 'Enhanced Chart System',
                description: '30+ professional chart types organized by category: Core P&L, Forecasting, and Analytics. Export charts to Excel (.xlsx), Word (.docx), or PNG with one click.',
                gradient: 'from-blue-600 via-emerald-500 to-blue-500'
              },
              {
                icon: Database,
                icon2: Layers,
                title: 'Database Schema Designer',
                description: 'Visual database schema creator with AI assistance. Design relationships, generate SQL schemas, and export database structures effortlessly.',
                gradient: 'from-emerald-600 via-blue-500 to-emerald-500'
              },
              {
                icon: FileSpreadsheet,
                icon2: TrendingUp,
                title: 'P&L Builder',
                description: 'Build Profit & Loss statements from natural language. Automated financial calculations, variance analysis, and professional reporting with charts.',
                gradient: 'from-blue-500 via-emerald-500 to-blue-600'
              },
              {
                icon: FileText,
                icon2: FileCheck,
                title: 'Excel to PowerPoint',
                description: 'Convert Excel data into professional PowerPoint presentations with charts, tables, and visualizations. Automatic formatting and styling.',
                gradient: 'from-emerald-500 via-blue-600 to-emerald-600'
              },
              {
                icon: FileCheck,
                icon2: Zap,
                title: 'ZIP File Cleaner',
                description: 'Clean and rename files in ZIP archives. Remove special characters, sanitize filenames, and organize files with batch processing.',
                gradient: 'from-blue-600 via-emerald-500 to-blue-500'
              },
              {
                icon: BarChart3,
                icon2: Target,
                title: 'Advanced Data Tools',
                description: 'Smart data cleaning (remove duplicates, trim spaces, fix types), advanced filtering with multi-column support, undo/redo, keyboard shortcuts, and data templates library.',
                gradient: 'from-emerald-500 via-blue-500 to-emerald-600'
              },
              {
                icon: Shield,
                icon2: Eye,
                title: 'Zero Storage Architecture',
                description: 'All processing happens in your browser. Files download immediately with original name + timestamp. No data stored on servers - complete privacy guaranteed.',
                gradient: 'from-emerald-500 via-blue-600 to-emerald-600'
              }
            ].map((feature, idx) => (
              <div
                key={idx}
                className="bg-slate-900/80 backdrop-blur-xl border border-slate-700/50 rounded-xl p-6 transition-all group relative overflow-hidden"
                style={{ borderColor: 'rgba(79, 195, 247, 0.3)' }}
                onMouseEnter={(e) => e.currentTarget.style.borderColor = 'rgba(0, 191, 166, 0.5)'}
                onMouseLeave={(e) => e.currentTarget.style.borderColor = 'rgba(79, 195, 247, 0.3)'}
              >
                {/* Animated Background Gradient */}
                <div className="absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity duration-500" style={{ background: 'linear-gradient(to bottom right, #00BFA6, #4FC3F7)' }} />
                
                {/* Creative Icon Combination */}
                <div className="relative mb-4">
                  <div className="w-16 h-16 rounded-xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform shadow-lg" style={{ background: 'linear-gradient(to bottom right, #00BFA6, #4FC3F7)' }}>
                    <feature.icon className="w-8 h-8 text-white" />
                  </div>
                  {/* Secondary Icon Overlay */}
                  <div className="absolute -top-1 -right-1 w-8 h-8 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-md" style={{ background: '#4FC3F7' }}>
                    <feature.icon2 className="w-4 h-4 text-white" />
                  </div>
                </div>
                
                <h3 className="text-xl font-bold text-white mb-2 relative z-10">{feature.title}</h3>
                <p className="text-slate-400 text-sm leading-relaxed relative z-10">{feature.description}</p>
                
                {/* Decorative Element */}
                <div className="absolute bottom-0 right-0 w-20 h-20 rounded-tl-full opacity-0 group-hover:opacity-100 transition-opacity" style={{ background: 'linear-gradient(to top left, rgba(0, 191, 166, 0.05), rgba(79, 195, 247, 0.05))' }} />
              </div>
            ))}
          </div>
        </div>

        {/* Key Benefits */}
        <div className="rounded-2xl p-8 md:p-12 mb-8 border" style={{ background: 'linear-gradient(to right, rgba(0, 191, 166, 0.15), rgba(79, 195, 247, 0.15))', borderColor: 'rgba(0, 191, 166, 0.3)' }}>
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold text-white text-center mb-8">
              Why Choose Meldra?
            </h2>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg" style={{ background: 'linear-gradient(to bottom right, #00BFA6, #4FC3F7)' }}>
                  <Lock className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">100% Private</h3>
                <p className="text-slate-400 text-sm">Your data never leaves your browser. Complete privacy and security guaranteed.</p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg" style={{ background: 'linear-gradient(to bottom right, #4FC3F7, #00BFA6)' }}>
                  <Zap className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">AI-Powered</h3>
                <p className="text-slate-400 text-sm">Advanced AI analyzes your data and provides actionable insights instantly.</p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg" style={{ background: 'linear-gradient(to bottom right, #00BFA6, #4FC3F7)' }}>
                  <TrendingUp className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">Professional Results</h3>
                <p className="text-slate-400 text-sm">Generate reports, presentations, and visualizations ready for stakeholders.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* About the Application Section */}
      <div className="container mx-auto px-4 py-8 border-t border-slate-800">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-4xl font-bold text-white text-center mb-4">
            About Meldra
          </h2>
          <p className="text-xl text-slate-400 text-center mb-12">
            Your trusted partner for data analysis and insights
          </p>

          {/* Comprehensive Features Documentation */}
          <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-8 mb-8">
            <h3 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(to bottom right, #00BFA6, #4FC3F7)' }}>
                <Rocket className="w-5 h-5 text-white" />
              </div>
              Complete Feature Suite
            </h3>
            
            <div className="space-y-6">
              <div>
                <h4 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-blue-400" />
                  Data Analysis & Visualization
                </h4>
                <ul className="list-disc list-inside space-y-2 text-slate-300 ml-4">
                  <li><strong className="text-white">AI-Powered Analysis:</strong> Upload CSV/Excel files for instant insights, trend detection, and pattern recognition</li>
                  <li><strong className="text-white">Smart Data Validation:</strong> Auto-detect data types (email, phone, date, number) and validate data quality</li>
                  <li><strong className="text-white">Enhanced Chart System:</strong> 30+ professional chart types organized by Core P&L, Forecasting, and Analytics categories</li>
                  <li><strong className="text-white">Advanced Filtering:</strong> Multi-column filters with AND/OR operators, global search across all columns</li>
                  <li><strong className="text-white">Data Cleaning Tools:</strong> Remove duplicates, trim spaces, fix data types, and clean all with one click</li>
                  <li><strong className="text-white">Export Options:</strong> Export to PDF, Excel (.xlsx), Word (.docx), CSV, or PNG with professional formatting</li>
                </ul>
              </div>

              <div>
                <h4 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                  <Brain className="w-5 h-5 text-purple-400" />
                  AI & Automation
                </h4>
                <ul className="list-disc list-inside space-y-2 text-slate-300 ml-4">
                  <li><strong className="text-white">Agentic AI Assistant:</strong> Autonomous AI agent that plans, executes, and reports on complex data operations</li>
                  <li><strong className="text-white">Natural Language Processing:</strong> Ask questions about your data in plain English, get instant answers</li>
                  <li><strong className="text-white">Formula Suggestions:</strong> AI-powered formula recommendations for Excel calculations</li>
                  <li><strong className="text-white">Data Templates Library:</strong> Pre-built templates for Sales, Finance, HR, Marketing, and more</li>
                </ul>
              </div>

              <div>
                <h4 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                  <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
                  Professional Reporting
                </h4>
                <ul className="list-disc list-inside space-y-2 text-slate-300 ml-4">
                  <li><strong className="text-white">P&L Builder:</strong> Generate Profit & Loss statements from natural language with automated calculations</li>
                  <li><strong className="text-white">Excel to PowerPoint:</strong> Convert Excel data into professional presentations with charts and visualizations</li>
                  <li><strong className="text-white">PDF Export:</strong> Export tables, charts, and reports as PDF with customizable formatting</li>
                  <li><strong className="text-white">Undo/Redo:</strong> Full action history with Ctrl+Z/Ctrl+Y support for data modifications</li>
                  <li><strong className="text-white">Keyboard Shortcuts:</strong> Ctrl+S (save), Ctrl+E (export), Ctrl+Z/Y (undo/redo) for faster workflow</li>
                </ul>
              </div>

              <div>
                <h4 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                  <Database className="w-5 h-5 text-cyan-400" />
                  Database & File Management
                </h4>
                <ul className="list-disc list-inside space-y-2 text-slate-300 ml-4">
                  <li><strong className="text-white">Database Schema Designer:</strong> Visual schema creator with AI assistance, generate SQL schemas</li>
                  <li><strong className="text-white">ZIP File Cleaner:</strong> Clean and rename files in ZIP archives with batch processing</li>
                  <li><strong className="text-white">File Processing:</strong> Support for Excel (.xlsx, .xls), CSV, ZIP, and PDF files</li>
                </ul>
              </div>

              <div className="bg-emerald-900/20 border border-emerald-500/30 rounded-lg p-4">
                <h4 className="text-lg font-semibold text-emerald-300 mb-2 flex items-center gap-2">
                  <Shield className="w-5 h-5" />
                  Zero Storage Architecture
                </h4>
                <p className="text-slate-300 text-sm leading-relaxed">
                  <strong className="text-white">Critical Privacy Feature:</strong> All files are processed in-memory and immediately downloaded to your device. 
                  Files are automatically deleted after processing - no input or output files remain on our servers. 
                  Download format: <code className="bg-slate-800 px-2 py-1 rounded text-emerald-300">originalname_YYYYMMDD_HHMMSS_mmm.extension</code>
                </p>
              </div>
            </div>
          </div>

          <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-8 mb-8">
            <h3 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(to bottom right, #00BFA6, #4FC3F7)' }}>
                <Rocket className="w-5 h-5 text-white" />
              </div>
              Our Mission
            </h3>
            <p className="text-slate-300 leading-relaxed mb-4">
              Meldra was born from a simple belief: data analysis should be powerful, accessible, and completely private. 
              We've built a platform that gives you enterprise-grade AI capabilities without compromising your data security.
            </p>
            <p className="text-slate-300 leading-relaxed">
              Every feature is designed with privacy-first principles. Your data is processed locally in your browser, 
              never stored on our servers, and never shared with third parties. You get the insights you need while 
              maintaining complete control over your information.
            </p>
          </div>

          <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-8 mb-8">
            <h3 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(to bottom right, #4FC3F7, #00BFA6)' }}>
                <Code className="w-5 h-5 text-white" />
              </div>
              Technology & Innovation
            </h3>
            <p className="text-slate-300 leading-relaxed mb-4">
              Meldra leverages cutting-edge AI and machine learning technologies to provide intelligent data analysis. 
              Our platform combines:
            </p>
            <ul className="list-disc list-inside space-y-2 text-slate-300 ml-4">
              <li>Advanced Large Language Models (LLMs) for natural language data operations</li>
              <li>Browser-native processing for zero data transmission</li>
              <li>Real-time visualization and reporting capabilities</li>
              <li>Automated workflow execution with our Agentic AI system</li>
              <li>Professional-grade database schema design tools</li>
            </ul>
          </div>

          <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-8">
            <h3 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(to bottom right, #00BFA6, #4FC3F7)' }}>
                <Star className="w-5 h-5 text-white" />
              </div>
              What Makes Us Different
            </h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-1" />
                <div>
                  <h4 className="font-semibold text-white mb-1">Zero Data Storage</h4>
                  <p className="text-sm text-slate-400">We don't store your data. Everything processes in your browser.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-1" />
                <div>
                  <h4 className="font-semibold text-white mb-1">No Technical Knowledge Required</h4>
                  <p className="text-sm text-slate-400">Use natural language to interact with your data.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-1" />
                <div>
                  <h4 className="font-semibold text-white mb-1">Enterprise-Grade AI</h4>
                  <p className="text-sm text-slate-400">Access powerful AI capabilities without enterprise costs.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-1" />
                <div>
                  <h4 className="font-semibold text-white mb-1">Professional Output</h4>
                  <p className="text-sm text-slate-400">Generate reports and presentations ready for stakeholders.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Trust & Value Proposition Section */}
      <div className="container mx-auto px-4 py-16 border-t border-slate-800">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-white mb-4">
              Trusted by Professionals
            </h2>
            <p className="text-xl text-slate-400 max-w-2xl mx-auto">
              Join thousands of users who trust Meldra for their data analysis needs
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 mb-12">
            <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-700/50 rounded-xl p-6 text-center">
              <div className="w-12 h-12 rounded-lg flex items-center justify-center mx-auto mb-4" style={{ background: 'linear-gradient(to bottom right, #00BFA6, #4FC3F7)' }}>
                <Globe className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Worldwide Access</h3>
              <p className="text-slate-400 text-sm">Available globally, accessible from anywhere</p>
            </div>
            <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-700/50 rounded-xl p-6 text-center">
              <div className="w-12 h-12 rounded-lg flex items-center justify-center mx-auto mb-4" style={{ background: 'linear-gradient(to bottom right, #4FC3F7, #00BFA6)' }}>
                <Cpu className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Lightning Fast</h3>
              <p className="text-slate-400 text-sm">Process data in seconds, not hours</p>
            </div>
            <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-700/50 rounded-xl p-6 text-center">
              <div className="w-12 h-12 rounded-lg flex items-center justify-center mx-auto mb-4" style={{ background: 'linear-gradient(to bottom right, #00BFA6, #4FC3F7)' }}>
                <Lightbulb className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Smart Insights</h3>
              <p className="text-slate-400 text-sm">AI discovers patterns you might miss</p>
            </div>
          </div>
        </div>
      </div>

      {/* Contact & Support Section */}
      <div className="container mx-auto px-4 py-16 border-t border-slate-800">
        <div className="max-w-4xl mx-auto">
          <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-8 md:p-12 text-center">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6" style={{ background: 'linear-gradient(to bottom right, #00BFA6, #4FC3F7)' }}>
              <Mail className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-3xl font-bold text-white mb-4">
              Have Questions?
            </h2>
            <p className="text-xl text-slate-300 mb-6 max-w-2xl mx-auto">
              We're here to help! Reach out to our support team for any enquiries, technical assistance, or feedback.
            </p>
            <div className="flex items-center justify-center gap-3">
              <Mail className="w-5 h-5" style={{ color: '#4FC3F7' }} />
              <a 
                href="mailto:support@meldra.ai" 
                className="text-xl font-semibold hover:opacity-80 transition-opacity"
                style={{ color: '#00E5FF' }}
              >
                support@meldra.ai
              </a>
            </div>
            <p className="text-sm text-slate-400 mt-4">
              We typically respond within 24 hours
            </p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="w-full border-t border-slate-800 py-6 px-4 mt-auto">
        <div className="container mx-auto flex flex-col md:flex-row items-center justify-center gap-4">
          <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-slate-400">
            <a href="mailto:support@meldra.ai" className="hover:text-slate-300 transition-colors">
              Support
            </a>
            <Link to="/pricing" className="hover:text-slate-300 transition-colors">
              Pricing
            </Link>
            <span className="text-slate-600">© {new Date().getFullYear()} Meldra. All rights reserved.</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
