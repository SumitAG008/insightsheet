import React from 'react';
import { Shield, Lock, Eye, FileCheck, Database, Globe, AlertTriangle, CheckCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function Security() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 py-12">
      <div className="container mx-auto px-4 max-w-6xl">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-pink-600 rounded-2xl flex items-center justify-center shadow-2xl shadow-purple-500/50">
              <Shield className="w-10 h-10 text-white" />
            </div>
          </div>
          <h1 className="text-5xl font-bold text-white mb-4">
            Security & Compliance
          </h1>
          <p className="text-xl text-purple-200">
            Your privacy is our priority. Here's how we protect your data.
          </p>
        </div>

        {/* Trust Badges */}
        <div className="flex flex-wrap justify-center gap-3 mb-12">
          <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-sm py-2 px-4">
            <CheckCircle className="w-4 h-4 mr-2" />
            GDPR Compliant
          </Badge>
          <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/30 text-sm py-2 px-4">
            <CheckCircle className="w-4 h-4 mr-2" />
            CCPA Compliant
          </Badge>
          <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/30 text-sm py-2 px-4">
            <CheckCircle className="w-4 h-4 mr-2" />
            Zero Data Storage
          </Badge>
          <Badge className="bg-pink-500/20 text-pink-300 border-pink-500/30 text-sm py-2 px-4">
            <Lock className="w-4 h-4 mr-2" />
            Encrypted
          </Badge>
        </div>

        {/* Key Features */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          <Card className="bg-slate-900/80 backdrop-blur-xl border-slate-700/50">
            <CardHeader>
              <div className="w-12 h-12 bg-purple-500/20 rounded-lg flex items-center justify-center mb-4">
                <FileCheck className="w-6 h-6 text-purple-400" />
              </div>
              <CardTitle className="text-white">ZERO File Storage</CardTitle>
            </CardHeader>
            <CardContent className="text-slate-300">
              <p>Your Excel, CSV, ZIP, and PDF files are <strong>NEVER stored</strong> on our servers. All processing happens in-memory and files are deleted immediately after.</p>
            </CardContent>
          </Card>

          <Card className="bg-slate-900/80 backdrop-blur-xl border-slate-700/50">
            <CardHeader>
              <div className="w-12 h-12 bg-purple-500/20 rounded-lg flex items-center justify-center mb-4">
                <Eye className="w-6 h-6 text-purple-400" />
              </div>
              <CardTitle className="text-white">ZERO AI Data Storage</CardTitle>
            </CardHeader>
            <CardContent className="text-slate-300">
              <p>Your questions and AI responses are <strong>NOT logged</strong>. They're completely ephemeral and exist only during your session.</p>
            </CardContent>
          </Card>

          <Card className="bg-slate-900/80 backdrop-blur-xl border-slate-700/50">
            <CardHeader>
              <div className="w-12 h-12 bg-purple-500/20 rounded-lg flex items-center justify-center mb-4">
                <Lock className="w-6 h-6 text-purple-400" />
              </div>
              <CardTitle className="text-white">Password Security</CardTitle>
            </CardHeader>
            <CardContent className="text-slate-300">
              <p>Passwords are <strong>hashed with bcrypt</strong>. We cannot see your actual password - it's irreversible and secure.</p>
            </CardContent>
          </Card>

          <Card className="bg-slate-900/80 backdrop-blur-xl border-slate-700/50">
            <CardHeader>
              <div className="w-12 h-12 bg-purple-500/20 rounded-lg flex items-center justify-center mb-4">
                <Database className="w-6 h-6 text-purple-400" />
              </div>
              <CardTitle className="text-white">Encrypted Database</CardTitle>
            </CardHeader>
            <CardContent className="text-slate-300">
              <p>All data encrypted at rest and in transit. PostgreSQL with SSL/TLS. Only essential information stored.</p>
            </CardContent>
          </Card>

          <Card className="bg-slate-900/80 backdrop-blur-xl border-slate-700/50">
            <CardHeader>
              <div className="w-12 h-12 bg-purple-500/20 rounded-lg flex items-center justify-center mb-4">
                <Globe className="w-6 h-6 text-purple-400" />
              </div>
              <CardTitle className="text-white">GDPR & CCPA</CardTitle>
            </CardHeader>
            <CardContent className="text-slate-300">
              <p>Compliant with EU and California privacy laws. Your rights protected. Delete your data anytime.</p>
            </CardContent>
          </Card>

          <Card className="bg-slate-900/80 backdrop-blur-xl border-slate-700/50">
            <CardHeader>
              <div className="w-12 h-12 bg-purple-500/20 rounded-lg flex items-center justify-center mb-4">
                <Shield className="w-6 h-6 text-purple-400" />
              </div>
              <CardTitle className="text-white">Admin-Only Logs</CardTitle>
            </CardHeader>
            <CardContent className="text-slate-300">
              <p>Security logs (login times, IPs) only accessible to admin for fraud prevention. Regular users cannot access.</p>
            </CardContent>
          </Card>
        </div>

        {/* What We Store */}
        <div className="grid md:grid-cols-2 gap-6 mb-12">
          <Card className="bg-emerald-900/20 backdrop-blur-xl border-emerald-500/30">
            <CardHeader>
              <CardTitle className="text-emerald-300 flex items-center">
                <CheckCircle className="w-5 h-5 mr-2" />
                What We DO Store
              </CardTitle>
            </CardHeader>
            <CardContent className="text-slate-300 space-y-2">
              <p>✅ <strong>Account Info:</strong> Email, hashed password, name</p>
              <p>✅ <strong>Subscription:</strong> Plan type, payment status, usage counts</p>
              <p>✅ <strong>Login History:</strong> Timestamps, IPs (admin only - security)</p>
              <p>✅ <strong>Activity Metadata:</strong> Action types, no content (admin only)</p>
              <p className="text-sm text-slate-400 mt-4">
                All stored securely with encryption. Used only for service provision and security.
              </p>
            </CardContent>
          </Card>

          <Card className="bg-red-900/20 backdrop-blur-xl border-red-500/30">
            <CardHeader>
              <CardTitle className="text-red-300 flex items-center">
                <AlertTriangle className="w-5 h-5 mr-2" />
                What We NEVER Store
              </CardTitle>
            </CardHeader>
            <CardContent className="text-slate-300 space-y-2">
              <p>❌ <strong>File Contents:</strong> Excel, CSV, ZIP, PDF data</p>
              <p>❌ <strong>AI Prompts/Responses:</strong> Your questions and answers</p>
              <p>❌ <strong>Chart Data:</strong> Visualizations or graphs</p>
              <p>❌ <strong>Spreadsheet Values:</strong> Cells, formulas, or data</p>
              <p className="text-sm text-red-300 mt-4 font-semibold">
                Your business data NEVER leaves your browser during processing!
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Security Notice */}
        <Alert className="mb-12 bg-purple-500/10 border-purple-500/30">
          <Shield className="h-5 w-5 text-purple-400" />
          <AlertDescription className="text-slate-300 ml-2">
            <strong className="text-purple-300">Privacy-First Architecture:</strong> We built InsightSheet-lite so that your sensitive data never touches our servers. Files are processed in-memory and immediately discarded. We only store what's essential for authentication and billing.
          </AlertDescription>
        </Alert>

        {/* Compliance Standards */}
        <Card className="bg-slate-900/80 backdrop-blur-xl border-slate-700/50 mb-12">
          <CardHeader>
            <CardTitle className="text-white text-2xl">Compliance Standards</CardTitle>
          </CardHeader>
          <CardContent className="text-slate-300 space-y-4">
            <div>
              <h3 className="text-xl font-semibold text-white mb-2 flex items-center">
                <CheckCircle className="w-5 h-5 mr-2 text-emerald-400" />
                GDPR (EU Data Protection)
              </h3>
              <ul className="list-disc ml-6 space-y-1">
                <li>Right to access your data</li>
                <li>Right to be forgotten (delete account)</li>
                <li>Right to data portability (export)</li>
                <li>Data minimization (collect only what's needed)</li>
                <li>Breach notification within 72 hours</li>
              </ul>
            </div>

            <div>
              <h3 className="text-xl font-semibold text-white mb-2 flex items-center">
                <CheckCircle className="w-5 h-5 mr-2 text-blue-400" />
                CCPA (California Privacy)
              </h3>
              <ul className="list-disc ml-6 space-y-1">
                <li>Right to know what data we collect</li>
                <li>Right to delete your data</li>
                <li>Right to opt-out (we don't sell data)</li>
                <li>No discrimination for exercising rights</li>
              </ul>
            </div>

            <div>
              <h3 className="text-xl font-semibold text-white mb-2 flex items-center">
                <CheckCircle className="w-5 h-5 mr-2 text-purple-400" />
                PCI-DSS (Payment Security)
              </h3>
              <ul className="list-disc ml-6 space-y-1">
                <li>Payments processed by Stripe (PCI Level 1)</li>
                <li>We NEVER handle your credit card details</li>
                <li>Secure payment forms</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Your Rights */}
        <Card className="bg-slate-900/80 backdrop-blur-xl border-slate-700/50 mb-12">
          <CardHeader>
            <CardTitle className="text-white text-2xl">Your Rights & Controls</CardTitle>
          </CardHeader>
          <CardContent className="text-slate-300 space-y-3">
            <p><strong className="text-white">Access Your Data:</strong> View and download your subscription info and activity history</p>
            <p><strong className="text-white">Delete Your Data:</strong> Delete your account and all associated data (within 30 days)</p>
            <p><strong className="text-white">Correct Your Data:</strong> Update your email, name, and preferences</p>
            <p><strong className="text-white">Export Your Data:</strong> Download your data in JSON format</p>
            <p><strong className="text-white">Contact Admin:</strong> Questions? Email sumitagaria@gmail.com</p>
          </CardContent>
        </Card>

        {/* Best Practices */}
        <Card className="bg-slate-900/80 backdrop-blur-xl border-slate-700/50 mb-12">
          <CardHeader>
            <CardTitle className="text-white text-2xl">Best Practices for Users</CardTitle>
          </CardHeader>
          <CardContent className="text-slate-300 space-y-3">
            <p>✅ <strong className="text-white">Use a strong password:</strong> At least 12 characters, mix of letters/numbers/symbols</p>
            <p>✅ <strong className="text-white">Logout on shared computers:</strong> Always logout after use</p>
            <p>⚠️ <strong className="text-amber-300">Don't upload sensitive data:</strong> No SSNs, medical records, or credit cards</p>
            <p>✅ <strong className="text-white">Monitor your account:</strong> Check activity dashboard regularly</p>
            <p>✅ <strong className="text-white">Report suspicious activity:</strong> Contact us immediately if something seems wrong</p>
          </CardContent>
        </Card>

        {/* Contact */}
        <Card className="bg-gradient-to-br from-purple-900/20 to-pink-900/20 backdrop-blur-xl border-purple-500/30">
          <CardHeader>
            <CardTitle className="text-white text-2xl">Security Contact</CardTitle>
          </CardHeader>
          <CardContent className="text-slate-300 space-y-3">
            <p><strong className="text-white">Report Security Issues:</strong> security@meldra.ai</p>
            <p><strong className="text-white">General Questions:</strong> sumitagaria@gmail.com</p>
            <p><strong className="text-white">Privacy Policy:</strong> <a href="/privacy" className="text-purple-400 hover:text-purple-300 underline">/privacy</a></p>
            <p className="text-sm text-slate-400 mt-4">
              We take security seriously. If you find a vulnerability, please report it responsibly and we'll respond within 24 hours.
            </p>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center mt-12 text-slate-400 text-sm">
          <p>Last Updated: January 15, 2025 • Version 1.0</p>
          <p className="mt-2">
            <a href="/privacy" className="text-purple-400 hover:text-purple-300">Privacy Policy</a>
            {' • '}
            <a href="/disclaimer" className="text-purple-400 hover:text-purple-300">Terms of Service</a>
          </p>
        </div>
      </div>
    </div>
  );
}
