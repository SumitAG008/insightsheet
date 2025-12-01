// pages/Upload.jsx - Meldra Premium Landing Experience
import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import {
  Shield, Zap, TrendingUp, Brain, Lock, Gauge, FileText,
  Upload as UploadIcon, Sparkles, CheckCircle2, ArrowRight,
  BarChart3, Table2, Wand2, Globe, Clock, Users
} from 'lucide-react';
import FileUploadZone from '../components/upload/FileUploadZone';
import { MeldraOrb } from '../components/branding/Logo';

export default function Upload() {
  const navigate = useNavigate();
  const [uploadedFile, setUploadedFile] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleFileUpload = useCallback((file, data) => {
    setUploadedFile({ file, data });
    setIsProcessing(true);

    sessionStorage.setItem('insightsheet_data', JSON.stringify(data));
    sessionStorage.setItem('insightsheet_filename', file.name);

    setTimeout(() => {
      setIsProcessing(false);
      navigate(createPageUrl('Dashboard'));
    }, 1000);
  }, [navigate]);

  const features = [
    { icon: Gauge, text: 'Instant Processing', color: 'from-blue-500 to-cyan-500' },
    { icon: Brain, text: 'AI-Powered', color: 'from-purple-500 to-pink-500' },
    { icon: Lock, text: 'Privacy First', color: 'from-emerald-500 to-teal-500' },
    { icon: TrendingUp, text: 'Smart Charts', color: 'from-orange-500 to-amber-500' }
  ];

  const capabilities = [
    { icon: Table2, title: 'Data Cleaning', desc: 'Remove duplicates, fix formats, handle missing values' },
    { icon: BarChart3, title: 'Visualizations', desc: 'Create beautiful charts and graphs instantly' },
    { icon: Wand2, title: 'AI Analysis', desc: 'Get intelligent insights from your data' },
    { icon: FileText, title: 'Export Anywhere', desc: 'Download as Excel, CSV, or PDF' }
  ];

  const stats = [
    { value: '100%', label: 'Browser Based' },
    { value: '0', label: 'Data Stored' },
    { value: '500MB', label: 'Max File Size' },
    { value: '24/7', label: 'Available' }
  ];

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Subtle Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-400/10 dark:bg-purple-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-pink-400/10 dark:bg-pink-500/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-to-r from-purple-400/5 to-pink-400/5 dark:from-purple-500/5 dark:to-pink-500/5 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10">
        {/* Hero Section */}
        <section className="container mx-auto px-4 pt-12 pb-8">
          <div className="text-center max-w-4xl mx-auto">
            {/* Animated Orb */}
            <div className="flex justify-center mb-8">
              <MeldraOrb size="xl" animated={true} />
            </div>

            {/* Trust Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-purple-100 dark:bg-purple-900/30 border border-purple-200 dark:border-purple-700/50 rounded-full mb-6">
              <Shield className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              <span className="text-sm text-purple-700 dark:text-purple-300 font-medium">
                100% Private • Zero Storage • Enterprise Ready
              </span>
            </div>

            {/* Headline */}
            <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight">
              <span className="text-slate-900 dark:text-white">Transform Data Into</span>
              <br />
              <span className="meldra-text-gradient">Intelligent Insights</span>
            </h1>

            {/* Subheadline */}
            <p className="text-xl md:text-2xl text-slate-600 dark:text-slate-300 max-w-2xl mx-auto mb-4">
              AI-powered data analysis, instant cleanup, and beautiful visualizations — all in your browser.
            </p>

            <p className="text-lg font-semibold meldra-text-gradient mb-8">
              Welcome to Meldra
            </p>

            {/* Feature Pills */}
            <div className="flex flex-wrap justify-center gap-3 mb-12">
              {features.map((feature, idx) => (
                <div
                  key={idx}
                  className={`flex items-center gap-2 px-4 py-2 bg-gradient-to-r ${feature.color} rounded-full shadow-lg`}
                >
                  <feature.icon className="w-4 h-4 text-white" />
                  <span className="text-white font-medium text-sm">{feature.text}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Upload Zone Section */}
        <section className="container mx-auto px-4 pb-16">
          <div className="max-w-4xl mx-auto">
            <FileUploadZone onFileUpload={handleFileUpload} isProcessing={isProcessing} />
          </div>
        </section>

        {/* Stats Bar */}
        <section className="border-y border-purple-200/50 dark:border-purple-800/30 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm">
          <div className="container mx-auto px-4 py-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              {stats.map((stat, idx) => (
                <div key={idx} className="text-center">
                  <div className="text-3xl md:text-4xl font-bold meldra-text-gradient">{stat.value}</div>
                  <div className="text-sm text-slate-600 dark:text-slate-400 font-medium">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section className="container mx-auto px-4 py-16">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white mb-4">
              How Meldra Works
            </h2>
            <p className="text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
              Three simple steps to transform your data into actionable insights
            </p>
          </div>

          <div className="max-w-4xl mx-auto">
            <div className="grid md:grid-cols-3 gap-8">
              {[
                { step: '1', title: 'Upload Your Data', desc: 'Drag & drop Excel or CSV files — supports files up to 500MB', icon: UploadIcon },
                { step: '2', title: 'Analyze & Transform', desc: 'Use AI-powered tools to clean, analyze, and visualize', icon: Wand2 },
                { step: '3', title: 'Export Results', desc: 'Download as Excel, CSV, or share beautiful reports', icon: FileText }
              ].map((item, idx) => (
                <div key={idx} className="relative">
                  <div className="meldra-card p-6 text-center h-full">
                    <div className="w-12 h-12 mx-auto mb-4 rounded-xl bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-purple-500/30">
                      {item.step}
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">{item.title}</h3>
                    <p className="text-sm text-slate-600 dark:text-slate-400">{item.desc}</p>
                  </div>
                  {idx < 2 && (
                    <div className="hidden md:block absolute top-1/2 -right-4 transform -translate-y-1/2">
                      <ArrowRight className="w-8 h-8 text-purple-300 dark:text-purple-700" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Capabilities Grid */}
        <section className="container mx-auto px-4 py-16">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white mb-4">
              Powerful Capabilities
            </h2>
            <p className="text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
              Everything you need to work with data, powered by AI
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
            {capabilities.map((cap, idx) => (
              <div key={idx} className="meldra-card p-6 hover:shadow-xl hover:shadow-purple-500/10 transition-all duration-300 group">
                <div className="w-12 h-12 rounded-xl bg-purple-100 dark:bg-purple-900/50 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <cap.icon className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">{cap.title}</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">{cap.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Privacy Section */}
        <section className="container mx-auto px-4 py-16">
          <div className="max-w-4xl mx-auto">
            <div className="meldra-card p-8 md:p-12 bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30 border-emerald-200 dark:border-emerald-800/50">
              <div className="flex flex-col md:flex-row items-start gap-6">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center flex-shrink-0 shadow-lg shadow-emerald-500/30">
                  <Shield className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-3">
                    Privacy-First Architecture
                  </h3>
                  <p className="text-slate-700 dark:text-slate-300 mb-4">
                    All data processing happens entirely in your browser. Your files never leave your device —
                    no uploads, no tracking, no data retention. AI analysis uses encrypted, anonymous requests
                    that are immediately discarded.
                  </p>
                  <div className="flex flex-wrap gap-3">
                    {['Browser Processing', 'Zero Upload', 'No Tracking', 'GDPR Compliant'].map((item, idx) => (
                      <div key={idx} className="flex items-center gap-2 px-3 py-1 bg-emerald-100 dark:bg-emerald-900/50 rounded-full">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                        <span className="text-sm font-medium text-emerald-700 dark:text-emerald-300">{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* File Support Info */}
        <section className="container mx-auto px-4 py-16">
          <div className="max-w-4xl mx-auto">
            <div className="meldra-card p-8">
              <div className="flex items-center gap-3 mb-6">
                <FileText className="w-7 h-7 text-purple-600 dark:text-purple-400" />
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                  Supported File Formats
                </h2>
              </div>

              <div className="grid md:grid-cols-2 gap-6 mb-6">
                <div className="p-4 rounded-xl bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800/50">
                  <h4 className="font-bold text-purple-700 dark:text-purple-300 mb-2">Excel Files</h4>
                  <p className="text-sm text-purple-600 dark:text-purple-400">.XLSX, .XLS — Full support for multi-sheet workbooks</p>
                </div>
                <div className="p-4 rounded-xl bg-teal-50 dark:bg-teal-900/20 border border-teal-200 dark:border-teal-800/50">
                  <h4 className="font-bold text-teal-700 dark:text-teal-300 mb-2">CSV Files</h4>
                  <p className="text-sm text-teal-600 dark:text-teal-400">.CSV — Native parsing with automatic delimiter detection</p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 p-4 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50">
                <div className="flex-1">
                  <p className="text-sm text-amber-700 dark:text-amber-300">
                    <strong>Free Plan:</strong> Up to 10MB file size
                  </p>
                </div>
                <div className="flex-1">
                  <p className="text-sm text-emerald-700 dark:text-emerald-300">
                    <strong>Premium:</strong> Up to 500MB file size + priority processing
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="container mx-auto px-4 py-16">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white mb-4">
              Ready to Transform Your Data?
            </h2>
            <p className="text-lg text-slate-600 dark:text-slate-400 mb-8">
              Join thousands of analysts who trust Meldra for their data intelligence needs.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                className="meldra-button-primary inline-flex items-center gap-2"
              >
                <UploadIcon className="w-5 h-5" />
                Start Analyzing Now
              </button>
              <a
                href={createPageUrl('Pricing')}
                className="meldra-button-secondary inline-flex items-center gap-2"
              >
                View Pricing
                <ArrowRight className="w-5 h-5" />
              </a>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
