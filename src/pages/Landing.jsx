// pages/Landing.jsx - Main landing page with About Us, Careers, and application information
import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Shield, Zap, TrendingUp, Brain, Lock, Gauge, FileText, Download, 
  ArrowRight, Sparkles, BarChart3, Database, FileSpreadsheet, 
  Users, Code, Rocket, CheckCircle, Star, Crown
} from 'lucide-react';

export default function Landing() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-20">
        <div className="text-center mb-20">
          <Badge className="mb-6 bg-purple-500/20 text-purple-300 border-purple-500/30 text-base px-4 py-2">
            <Sparkles className="w-4 h-4 mr-2" />
            Privacy-First Data Analysis Platform
          </Badge>
          <h1 className="text-6xl md:text-7xl font-bold text-white mb-6 bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
            Meldra
          </h1>
          <p className="text-2xl md:text-3xl text-slate-300 font-semibold mb-4">
            Data Made Simple
          </p>
          <p className="text-xl text-slate-400 max-w-3xl mx-auto mb-12 leading-relaxed">
            Transform your data into actionable insights with AI-powered analysis, automated workflows, and professional reporting. 
            All while keeping your data completely private and secure.
          </p>
          
          <div className="flex gap-4 justify-center mt-8">
            <Link to="/register">
              <Button className="px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-lg font-semibold text-lg transition-all shadow-lg flex items-center gap-2">
                Get Started Free
                <ArrowRight className="w-5 h-5" />
              </Button>
            </Link>
            <Link to="/pricing">
              <Button variant="outline" className="px-8 py-4 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-semibold text-lg transition-all border border-slate-700">
                View Pricing
              </Button>
            </Link>
          </div>
        </div>

        {/* Features Section */}
        <div className="mb-20">
          <h2 className="text-4xl font-bold text-white text-center mb-4">
            What Can Meldra Do?
          </h2>
          <p className="text-xl text-slate-400 text-center mb-12 max-w-2xl mx-auto">
            Everything you need to analyze, transform, and visualize your data - all in one powerful platform
          </p>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {[
              {
                icon: BarChart3,
                title: 'AI-Powered Data Analysis',
                description: 'Upload CSV/Excel files and get instant AI-powered insights, trends, and patterns from your data.'
              },
              {
                icon: Brain,
                title: 'Agentic AI Assistant',
                description: 'Autonomous AI agent that plans, executes, and reports on complex data operations using natural language.'
              },
              {
                icon: Database,
                title: 'Database Schema Designer',
                description: 'Visual database schema creator with AI assistance. Design relationships and generate SQL schemas.'
              },
              {
                icon: FileSpreadsheet,
                title: 'P&L Builder',
                description: 'Build Profit & Loss statements from natural language. Automated financial calculations and reporting.'
              },
              {
                icon: FileText,
                title: 'Excel to PowerPoint',
                description: 'Convert Excel data into professional PowerPoint presentations with charts and visualizations.'
              },
              {
                icon: Shield,
                title: 'Privacy-First Architecture',
                description: 'All data processing happens in your browser. Your data never leaves your device - complete privacy guaranteed.'
              }
            ].map((feature, idx) => (
              <div
                key={idx}
                className="bg-slate-900/80 backdrop-blur-xl border border-slate-700/50 rounded-xl p-6 hover:border-purple-500/50 transition-all group"
              >
                <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <feature.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">{feature.title}</h3>
                <p className="text-slate-400 text-sm leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Key Benefits */}
        <div className="bg-gradient-to-r from-purple-900/30 to-pink-900/30 rounded-2xl p-8 md:p-12 mb-20 border border-purple-500/20">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold text-white text-center mb-8">
              Why Choose Meldra?
            </h2>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="text-center">
                <Lock className="w-10 h-10 text-purple-400 mx-auto mb-3" />
                <h3 className="text-lg font-bold text-white mb-2">100% Private</h3>
                <p className="text-slate-400 text-sm">Your data never leaves your browser. Complete privacy and security.</p>
              </div>
              <div className="text-center">
                <Zap className="w-10 h-10 text-purple-400 mx-auto mb-3" />
                <h3 className="text-lg font-bold text-white mb-2">AI-Powered</h3>
                <p className="text-slate-400 text-sm">Advanced AI analyzes your data and provides actionable insights instantly.</p>
              </div>
              <div className="text-center">
                <TrendingUp className="w-10 h-10 text-purple-400 mx-auto mb-3" />
                <h3 className="text-lg font-bold text-white mb-2">Professional Results</h3>
                <p className="text-slate-400 text-sm">Generate reports, presentations, and visualizations ready for stakeholders.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* About the Application Section */}
      <div className="container mx-auto px-4 py-16 border-t border-slate-800">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-4xl font-bold text-white text-center mb-4">
            About Meldra
          </h2>
          <p className="text-xl text-slate-400 text-center mb-12">
            Your trusted partner for data analysis and insights
          </p>

          <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-8 mb-8">
            <h3 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
              <Rocket className="w-6 h-6 text-purple-400" />
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
              <Code className="w-6 h-6 text-purple-400" />
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

          <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-8 mb-8">
            <h3 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
              <Users className="w-6 h-6 text-purple-400" />
              About the Creator
            </h3>
            <p className="text-slate-300 leading-relaxed mb-4">
              Meldra is developed by a passionate team dedicated to making data analysis accessible to everyone. 
              We believe that powerful analytics tools shouldn't require sacrificing privacy or requiring extensive technical knowledge.
            </p>
            <p className="text-slate-300 leading-relaxed">
              Our vision is to democratize data insights, enabling businesses and individuals to make data-driven decisions 
              with confidence, security, and ease. Every feature we build is designed with user privacy and experience at the forefront.
            </p>
          </div>

          <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-8">
            <h3 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
              <Star className="w-6 h-6 text-purple-400" />
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

      {/* Careers Section */}
      <div className="container mx-auto px-4 py-16 border-t border-slate-800">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl font-bold text-white mb-4">
            Join Our Team
          </h2>
          <p className="text-xl text-slate-400 mb-8">
            We're always looking for talented individuals who share our passion for privacy-first technology
          </p>
          <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-8">
            <p className="text-slate-300 leading-relaxed mb-6">
              At Meldra, we're building the future of privacy-first data analytics. If you're passionate about 
              AI, data privacy, and creating tools that empower users, we'd love to hear from you.
            </p>
            <p className="text-slate-300 leading-relaxed mb-6">
              We're currently looking for talented individuals in:
            </p>
            <div className="grid md:grid-cols-3 gap-4 mb-6">
              <div className="bg-slate-800/50 rounded-lg p-4">
                <h4 className="font-semibold text-white mb-2">Frontend Development</h4>
                <p className="text-sm text-slate-400">React, TypeScript, UI/UX</p>
              </div>
              <div className="bg-slate-800/50 rounded-lg p-4">
                <h4 className="font-semibold text-white mb-2">Backend Development</h4>
                <p className="text-sm text-slate-400">Python, FastAPI, AI/ML</p>
              </div>
              <div className="bg-slate-800/50 rounded-lg p-4">
                <h4 className="font-semibold text-white mb-2">AI/ML Engineering</h4>
                <p className="text-sm text-slate-400">LLMs, Data Analysis, Automation</p>
              </div>
            </div>
            <Button variant="outline" className="border-purple-500 text-purple-400 hover:bg-purple-500/10">
              Contact Us for Opportunities
            </Button>
          </div>
        </div>
      </div>

      {/* Free Tier CTA Section */}
      <div className="container mx-auto px-4 py-16 border-t border-slate-800">
        <div className="max-w-4xl mx-auto text-center">
          <div className="bg-gradient-to-r from-purple-900/40 to-pink-900/40 rounded-2xl p-12 border border-purple-500/30">
            <Sparkles className="w-16 h-16 text-purple-400 mx-auto mb-6" />
            <h2 className="text-4xl font-bold text-white mb-4">
              Start Free Today
            </h2>
            <p className="text-xl text-slate-300 mb-8 max-w-2xl mx-auto">
              Get started with our free tier and experience the power of Meldra. No credit card required, 
              no data storage, complete privacy.
            </p>
            <div className="grid md:grid-cols-3 gap-6 mb-8 max-w-3xl mx-auto">
              <div className="bg-slate-900/80 rounded-lg p-6 border border-slate-700/50">
                <div className="text-3xl font-bold text-white mb-2">10MB</div>
                <div className="text-sm text-slate-400">File Size Limit</div>
              </div>
              <div className="bg-slate-900/80 rounded-lg p-6 border border-slate-700/50">
                <div className="text-3xl font-bold text-white mb-2">50</div>
                <div className="text-sm text-slate-400">Transactions/Month</div>
              </div>
              <div className="bg-slate-900/80 rounded-lg p-6 border border-slate-700/50">
                <div className="text-3xl font-bold text-white mb-2">5</div>
                <div className="text-sm text-slate-400">AI Queries/Day</div>
              </div>
            </div>
            <div className="flex gap-4 justify-center">
              <Link to="/register">
                <Button className="px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-lg font-semibold text-lg transition-all shadow-lg">
                  Get Started Free
                </Button>
              </Link>
              <Link to="/pricing">
                <Button variant="outline" className="px-8 py-4 border-purple-500 text-purple-400 hover:bg-purple-500/10 rounded-lg font-semibold text-lg">
                  View Premium Plans
                </Button>
              </Link>
            </div>
            <p className="text-sm text-slate-400 mt-6">
              Premium plans starting at £20/month - Coming soon with Stripe integration
            </p>
          </div>
        </div>
      </div>

      {/* Footer CTA */}
      <div className="container mx-auto px-4 py-12 border-t border-slate-800">
        <div className="text-center">
          <p className="text-slate-400 mb-4">
            Ready to transform your data into insights?
          </p>
          <Link to="/register">
            <Button className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-lg font-semibold">
              Create Your Free Account
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
