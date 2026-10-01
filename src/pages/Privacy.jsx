// pages/Privacy.js - Comprehensive privacy policy and data breach notification
import React from 'react';
import { Shield, Lock, Eye, Server, AlertTriangle, FileText } from 'lucide-react';

export default function Privacy() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50 to-indigo-50 py-12">
      <div className="container mx-auto px-4 max-w-4xl">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="w-20 h-20 bg-gradient-to-br from-purple-600 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
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
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <Lock className="w-6 h-6 text-purple-600" />
              </div>
              <h2 className="text-2xl font-bold text-slate-800">Privacy-First Architecture</h2>
            </div>
            <div className="space-y-3 text-slate-700">
              <p className="leading-relaxed">
                <strong className="text-slate-900">Meldra</strong> is designed with privacy as the foundation.
                Spreadsheet analysis runs in your browser. Tools that need our server (such as conversions, OCR and PowerPoint) process your file in memory and discard it when the result is ready.
              </p>
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 space-y-2">
                <p className="font-semibold text-emerald-900">✓ What this means for you:</p>
                <ul className="list-disc list-inside space-y-1 text-emerald-800">
                  <li>The contents of your files are never kept on our servers</li>
                  <li>Data is saved only if you choose to store it in the Meldra lakehouse, and you can delete it at any time</li>
                  <li>No advertising, and no third-party or cross-site tracking</li>
                  <li>The account and usage data we do keep, and for how long, is listed below</li>
                </ul>
              </div>
            </div>
          </section>

          {/* Data We Collect */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Server className="w-6 h-6 text-blue-600" />
              </div>
              <h2 className="text-2xl font-bold text-slate-800">Data We Collect</h2>
            </div>
            <div className="space-y-4 text-slate-700">
              <div>
                <h3 className="font-semibold text-slate-900 mb-2">Account Information (Stored):</h3>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li>Email address and name</li>
                  <li>Subscription status and plan details</li>
                  <li>AI query usage statistics</li>
                  <li>Payment transaction records</li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold text-slate-900 mb-2">Security and Usage Data (Stored, then Deleted):</h3>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li>Signed-in devices: browser and device type, IP address and approximate location (city, country), used to keep your account secure and to limit a subscription to 2 devices at once. Deleted 30 days after the device signs out.</li>
                  <li>Sign-in history (the same details): deleted after 90 days.</li>
                  <li>Which pages and tools you use and the words you search for in Meldra (never file contents), used to improve your suggestions: deleted after 90 days.</li>
                  <li>Cookie consent choices: kept for 2 years as proof of consent.</li>
                  <li>Results of document extraction jobs: deleted when the job expires, within hours.</li>
                  <li>Processing history: the type and size of each file you process (never its name or contents), deleted when you sign out or within 7 days.</li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold text-slate-900 mb-2">Data We DO NOT Collect:</h3>
                <ul className="list-disc list-inside space-y-1 ml-4 text-red-700">
                  <li>❌ Your uploaded files (processed in memory and discarded), unless you choose to store data in the Meldra lakehouse, where it stays until you delete it</li>
                  <li>❌ Content of your spreadsheets</li>
                  <li>❌ Any sensitive business data</li>
                  <li>❌ Personal information from your files</li>
                  <li>❌ Advertising or cross-site tracking data</li>
                </ul>
              </div>
            </div>
          </section>

          {/* AI Processing */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center">
                <Eye className="w-6 h-6 text-indigo-600" />
              </div>
              <h2 className="text-2xl font-bold text-slate-800">AI Data Processing</h2>
            </div>
            <div className="space-y-3 text-slate-700">
              <p className="leading-relaxed">
                AI features (AI Assistant, Smart Formulas, Unified Reporting, Migration mapping, invoice extraction) send
                the text needed to answer to our AI provider, OpenAI: your question and, for features that read a file,
                the relevant part of it (for example column names and sample rows).
              </p>
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 space-y-2">
                <p className="font-semibold text-amber-900">Important:</p>
                <ul className="list-disc list-inside space-y-1 text-amber-800">
                  <li>Only AI features send data to OpenAI; file conversions and the filename cleaner do not</li>
                  <li>OpenAI does not use data sent through its API to train its models</li>
                  <li>OpenAI may keep requests for up to 30 days to detect abuse, then deletes them</li>
                  <li>Avoid AI features for data you must not share with a service provider</li>
                  <li>Data is encrypted in transit</li>
                </ul>
              </div>
            </div>
          </section>

          {/* Service providers and backups */}
          <section>
            <h2 className="text-2xl font-bold text-slate-800 mb-3">Service Providers and Backups</h2>
            <div className="space-y-3 text-slate-700">
              <p className="leading-relaxed">We use these providers to run Meldra. Each processes data only to provide its service to us:</p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li><strong>Railway:</strong> runs our server (files are processed in memory there and discarded)</li>
                <li><strong>Neon:</strong> our database (account, billing and the records listed above)</li>
                <li><strong>Vercel:</strong> serves the website</li>
                <li><strong>Resend:</strong> sends sign-in codes and account e-mails</li>
                <li><strong>OpenAI:</strong> AI features only, as described above</li>
                <li><strong>OCR.space:</strong> only if enabled, to read text from an image our own OCR could not read</li>
              </ul>
              <p className="leading-relaxed">
                <strong>Backups:</strong> account, billing, sign-in and consent records are backed up weekly in encrypted
                form, and each backup is deleted after 90 days. Our database provider also keeps a short restore history.
                Your files are never in a backup, because they are never stored.
              </p>
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
                  <strong>Contact for security concerns:</strong> security@meldra.ai
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
                <li><strong>Right to Erasure:</strong> Delete your account and all associated data yourself in Settings → Delete my account (payment records are kept only as long as tax law requires)</li>
                <li><strong>Right to Data Portability:</strong> Export your data in machine-readable format</li>
                <li><strong>Right to Object:</strong> Opt-out of certain data processing</li>
              </ul>
              <div className="mt-4 p-4 bg-purple-50 border border-purple-200 rounded-lg">
                <p className="text-sm font-semibold text-purple-900 mb-2">To exercise your rights:</p>
                <p className="text-sm text-purple-800">
                  Email: privacy@meldra.ai<br />
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
              <p><strong>Data Protection Officer:</strong> dpo@meldra.ai</p>
              <p><strong>General Privacy Questions:</strong> privacy@meldra.ai</p>
              <p><strong>Security Concerns:</strong> security@meldra.ai</p>
              <p className="text-sm text-slate-600 mt-4">
                Meldra<br />
                Privacy Department
              </p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}