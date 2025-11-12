// pages/Privacy.js - Comprehensive privacy policy and data breach notification
import React from 'react';
import { Shield, Lock, Eye, Server, AlertTriangle, FileText } from 'lucide-react';

export default function Privacy() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-slate-100 py-12">
      <div className="container mx-auto px-4 max-w-4xl">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="w-20 h-20 bg-gradient-to-br from-slate-800 to-slate-700 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Shield className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-slate-800 mb-4">
            Privacy Policy & Data Protection
          </h1>
          <p className="text-lg text-slate-600">
            Your privacy is our top priority
          </p>
          <p className="text-sm text-slate-500 mt-2">
            Last Updated: {new Date().toLocaleDateString()}
          </p>
        </div>

        {/* Main Content */}
        <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-8 space-y-8">
          {/* Privacy-First Architecture */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center">
                <Lock className="w-6 h-6 text-slate-800" />
              </div>
              <h2 className="text-2xl font-bold text-slate-800">Privacy-First Architecture</h2>
            </div>
            <div className="space-y-3 text-slate-700">
              <p className="leading-relaxed">
                <strong className="text-slate-900">InsightSheet</strong> is designed with privacy as the foundation. 
                Unlike traditional web applications, we process ALL your data locally in your browser.
              </p>
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 space-y-2">
                <p className="font-semibold text-emerald-900">✓ What this means for you:</p>
                <ul className="list-disc list-inside space-y-1 text-emerald-800">
                  <li>Your CSV files NEVER leave your device</li>
                  <li>We cannot see, access, or store your data</li>
                  <li>Data exists only in your browser's memory</li>
                  <li>Close the tab = data is permanently deleted</li>
                </ul>
              </div>
            </div>
          </section>

          {/* Data We Collect */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Server className="w-6 h-6 text-slate-700" />
              </div>
              <h2 className="text-2xl font-bold text-slate-800">Data We Collect</h2>
            </div>
            <div className="space-y-4 text-slate-700">
              <div>
                <h3 className="font-semibold text-slate-900 mb-2">Account Information (Stored):</h3>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li>Email address (from Google login)</li>
                  <li>Full name (from Google profile)</li>
                  <li>Subscription status and plan details</li>
                  <li>AI query usage statistics</li>
                  <li>Payment transaction records</li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold text-slate-900 mb-2">Data We DO NOT Collect:</h3>
                <ul className="list-disc list-inside space-y-1 ml-4 text-red-700">
                  <li>❌ Your uploaded CSV files</li>
                  <li>❌ Content of your spreadsheets</li>
                  <li>❌ Any sensitive business data</li>
                  <li>❌ Personal information from your files</li>
                  <li>❌ IP addresses or tracking data</li>
                </ul>
              </div>
            </div>
          </section>

          {/* AI Processing */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center">
                <Eye className="w-6 h-6 text-slate-700" />
              </div>
              <h2 className="text-2xl font-bold text-slate-800">AI Data Processing</h2>
            </div>
            <div className="space-y-3 text-slate-700">
              <p className="leading-relaxed">
                When you use AI features (AI Assistant, Smart Formulas), we send minimal, anonymized data to our AI service:
              </p>
              <div className="bg-blue-50 border border-slate-300 rounded-lg p-4 space-y-2">
                <p className="font-semibold text-slate-800">What gets sent:</p>
                <ul className="list-disc list-inside space-y-1 text-slate-700">
                  <li>Column names (headers only)</li>
                  <li>Sample rows (first 5-10 rows, no sensitive data)</li>
                  <li>Your query/question</li>
                  <li>Statistical summaries (averages, counts)</li>
                </ul>
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 space-y-2">
                <p className="font-semibold text-amber-900">Important:</p>
                <ul className="list-disc list-inside space-y-1 text-amber-800">
                  <li>No personally identifiable information (PII) is sent</li>
                  <li>Data is encrypted in transit</li>
                  <li>AI provider does NOT store your data</li>
                  <li>Requests are rate-limited for security</li>
                </ul>
              </div>
            </div>
          </section>

          {/* Data Breach Notification */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <h2 className="text-2xl font-bold text-slate-800">Data Breach Notification Policy</h2>
            </div>
            <div className="space-y-4 text-slate-700">
              <p className="leading-relaxed">
                While we don't store your spreadsheet data, we take security of your account information seriously.
              </p>
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 space-y-3">
                <p className="font-semibold text-red-900">In the event of a data breach:</p>
                <ol className="list-decimal list-inside space-y-2 text-red-800">
                  <li>
                    <strong>Immediate Action (Within 24 hours):</strong>
                    <ul className="list-disc list-inside ml-6 mt-1">
                      <li>We will identify the scope of the breach</li>
                      <li>Contain and eliminate the threat</li>
                      <li>Begin investigation</li>
                    </ul>
                  </li>
                  <li>
                    <strong>User Notification (Within 72 hours):</strong>
                    <ul className="list-disc list-inside ml-6 mt-1">
                      <li>Email notification to all affected users</li>
                      <li>Clear explanation of what data was compromised</li>
                      <li>Actions we're taking</li>
                      <li>Steps you should take</li>
                    </ul>
                  </li>
                  <li>
                    <strong>Regulatory Compliance:</strong>
                    <ul className="list-disc list-inside ml-6 mt-1">
                      <li>Report to relevant authorities as required by law</li>
                      <li>Full transparency report published</li>
                      <li>Independent security audit</li>
                    </ul>
                  </li>
                </ol>
              </div>
              <div className="bg-slate-100 border border-slate-300 rounded-lg p-4">
                <p className="text-sm text-slate-700">
                  <strong>Contact for security concerns:</strong> security@insightsheet.com
                </p>
                <p className="text-sm text-slate-700 mt-1">
                  <strong>Report vulnerabilities:</strong> We have a responsible disclosure policy. 
                  Security researchers who find vulnerabilities will be acknowledged and rewarded.
                </p>
              </div>
            </div>
          </section>

          {/* Your Rights */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <FileText className="w-6 h-6 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold text-slate-800">Your Rights</h2>
            </div>
            <div className="space-y-2 text-slate-700">
              <p className="leading-relaxed mb-3">
                Under GDPR, CCPA, and Indian IT Act, you have the following rights:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li><strong>Right to Access:</strong> Request a copy of your account data</li>
                <li><strong>Right to Rectification:</strong> Correct inaccurate information</li>
                <li><strong>Right to Erasure:</strong> Delete your account and all associated data</li>
                <li><strong>Right to Data Portability:</strong> Export your data in machine-readable format</li>
                <li><strong>Right to Object:</strong> Opt-out of certain data processing</li>
              </ul>
              <div className="mt-4 p-4 bg-slate-100 border border-slate-300 rounded-lg">
                <p className="text-sm font-semibold text-slate-800 mb-2">To exercise your rights:</p>
                <p className="text-sm text-slate-800">
                  Email: privacy@insightsheet.com<br />
                  Response time: Within 30 days
                </p>
              </div>
            </div>
          </section>

          {/* Cookies */}
          <section>
            <h2 className="text-2xl font-bold text-slate-800 mb-3">Cookies & Tracking</h2>
            <div className="space-y-2 text-slate-700">
              <p className="leading-relaxed">
                We use minimal cookies:
              </p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li><strong>Authentication cookie:</strong> To keep you logged in</li>
                <li><strong>Session storage:</strong> To remember your current file (cleared on tab close)</li>
              </ul>
              <p className="text-sm text-slate-600 mt-3">
                We do NOT use advertising cookies, tracking pixels, or third-party analytics.
              </p>
            </div>
          </section>

          {/* Contact */}
          <section className="border-t border-slate-200 pt-6">
            <h2 className="text-2xl font-bold text-slate-800 mb-3">Contact Us</h2>
            <div className="space-y-2 text-slate-700">
              <p><strong>Data Protection Officer:</strong> dpo@insightsheet.com</p>
              <p><strong>General Privacy Questions:</strong> privacy@insightsheet.com</p>
              <p><strong>Security Concerns:</strong> security@insightsheet.com</p>
              <p className="text-sm text-slate-600 mt-4">
                InsightSheet<br />
                Privacy Department<br />
                [Your Address]<br />
                [Your Country]
              </p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}