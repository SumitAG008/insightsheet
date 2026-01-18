// pages/Disclaimer.js - Legal disclaimer and terms
import React from 'react';
import { AlertTriangle, FileText, Scale } from 'lucide-react';

export default function Disclaimer() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50 to-indigo-50 py-12">
      <div className="container mx-auto px-4 max-w-4xl">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="w-20 h-20 bg-gradient-to-br from-amber-500 to-red-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <AlertTriangle className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-slate-800 mb-4">
            Disclaimer & Terms of Use
          </h1>
          <p className="text-lg text-slate-600">
            Please read carefully before using Meldra
          </p>
          <p className="text-sm text-slate-500 mt-2">
            Last Updated: {new Date().toLocaleDateString()}
          </p>
        </div>

        {/* Main Content */}
        <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-8 space-y-8">
          {/* General Disclaimer */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-amber-600" />
              </div>
              <h2 className="text-2xl font-bold text-slate-800">General Disclaimer</h2>
            </div>
            <div className="space-y-3 text-slate-700 leading-relaxed">
              <p>
                Meldra ("the Service") is provided "AS IS" and "AS AVAILABLE" without warranties of any kind, 
                either express or implied, including but not limited to:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Merchantability</li>
                <li>Fitness for a particular purpose</li>
                <li>Non-infringement</li>
                <li>Accuracy or completeness of results</li>
                <li>Uninterrupted or error-free operation</li>
              </ul>
            </div>
          </section>

          {/* Data Accuracy */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                <FileText className="w-6 h-6 text-red-600" />
              </div>
              <h2 className="text-2xl font-bold text-slate-800">Data Accuracy & Responsibility</h2>
            </div>
            <div className="bg-red-50 border-2 border-red-200 rounded-lg p-6 space-y-3">
              <p className="font-bold text-red-900 text-lg">⚠️ IMPORTANT - READ CAREFULLY:</p>
              <ul className="list-disc list-inside space-y-2 text-red-800">
                <li>
                  <strong>You are solely responsible</strong> for verifying all data, calculations, and analysis results
                </li>
                <li>
                  AI-generated insights are <strong>suggestions only</strong> and may contain errors
                </li>
                <li>
                  <strong>Always double-check</strong> critical calculations before making business decisions
                </li>
                <li>
                  The Service is <strong>NOT a substitute</strong> for professional financial, legal, or medical advice
                </li>
                <li>
                  We are <strong>NOT liable</strong> for any losses resulting from incorrect data analysis
                </li>
              </ul>
            </div>
          </section>

          {/* PDF Disclaimer */}
          <section>
            <h2 className="text-2xl font-bold text-slate-800 mb-3">PDF Editing Limitations</h2>
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 space-y-2 text-amber-900">
              <p className="font-semibold">PDF Form Filler Tool:</p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>Does NOT directly edit or modify PDF files</li>
                <li>Provides form data extraction and organization only</li>
                <li>Users must manually transfer data to actual PDF documents</li>
                <li>No responsibility for compatibility with specific PDF formats</li>
                <li>For official documents, use certified PDF editors (Adobe Acrobat, etc.)</li>
              </ul>
            </div>
          </section>

          {/* Limitation of Liability */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <Scale className="w-6 h-6 text-purple-600" />
              </div>
              <h2 className="text-2xl font-bold text-slate-800">Limitation of Liability</h2>
            </div>
            <div className="space-y-3 text-slate-700">
              <p className="leading-relaxed">
                <strong>TO THE MAXIMUM EXTENT PERMITTED BY LAW:</strong>
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>
                  We shall NOT be liable for any <strong>indirect, incidental, special, consequential, or punitive damages</strong>
                </li>
                <li>
                  Including but not limited to: loss of profits, data, business, or goodwill
                </li>
                <li>
                  Even if we have been advised of the possibility of such damages
                </li>
                <li>
                  Our total liability shall not exceed the amount you paid for the Service in the past 12 months
                </li>
                <li>
                  For free users, liability is limited to $100 USD
                </li>
              </ul>
            </div>
          </section>

          {/* User Responsibilities */}
          <section>
            <h2 className="text-2xl font-bold text-slate-800 mb-3">Your Responsibilities</h2>
            <div className="space-y-3 text-slate-700">
              <p className="font-semibold text-slate-900">By using Meldra, you agree to:</p>
              <ol className="list-decimal list-inside space-y-2 ml-4">
                <li>Use the Service for lawful purposes only</li>
                <li>Not upload files containing illegal content</li>
                <li>Verify all results before taking action</li>
                <li>Keep your account credentials secure</li>
                <li>Not attempt to breach security measures</li>
                <li>Respect intellectual property rights</li>
                <li>Not use the Service to process others' data without authorization</li>
              </ol>
            </div>
          </section>

          {/* Third-Party Services */}
          <section>
            <h2 className="text-2xl font-bold text-slate-800 mb-3">Third-Party Services</h2>
            <div className="space-y-2 text-slate-700">
              <p>The Service integrates with:</p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li><strong>Google Login:</strong> Subject to Google's terms and privacy policy</li>
                <li><strong>AI Services:</strong> Subject to AI provider's terms</li>
                <li><strong>Payment Processors:</strong> Subject to Stripe/PayPal/Razorpay terms</li>
              </ul>
              <p className="text-sm text-slate-600 mt-3">
                We are not responsible for third-party services' availability, security, or policies.
              </p>
            </div>
          </section>

          {/* No Professional Advice */}
          <section>
            <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-6">
              <h2 className="text-xl font-bold text-blue-900 mb-3">Not Professional Advice</h2>
              <p className="text-blue-800 leading-relaxed">
                Meldra provides <strong>data analysis tools only</strong>. The Service does NOT provide:
              </p>
              <ul className="list-disc list-inside space-y-1 mt-2 ml-4 text-blue-800">
                <li>Financial advice or investment recommendations</li>
                <li>Legal advice or document preparation services</li>
                <li>Medical advice or healthcare recommendations</li>
                <li>Tax advice or accounting services</li>
                <li>Professional consulting in any field</li>
              </ul>
              <p className="text-blue-800 mt-3 font-semibold">
                Always consult qualified professionals for important decisions.
              </p>
            </div>
          </section>

          {/* API and Commercial Use */}
          <section>
            <h2 className="text-2xl font-bold text-slate-800 mb-3">API and Commercial Use</h2>
            <div className="text-slate-700 space-y-2">
              <p>
                Use of the <strong>Meldra API</strong> (developer.meldra.ai / insight.meldra.ai/developers) is governed by these terms. 
                By using an API key or integrating Meldra into your product, you agree to:
              </p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li><strong>Confidentiality:</strong> Your API key is confidential. You are responsible for any use or misuse.</li>
                <li><strong>No warranty on uptime:</strong> We do not guarantee availability or SLAs unless agreed in a separate enterprise agreement.</li>
                <li><strong>Acceptable use:</strong> No resale as a competing service, no abuse, no circumventing rate limits or security.</li>
                <li><strong>Suspension and revocation:</strong> We may suspend or revoke API access for abuse, non-payment, or breach of these terms.</li>
              </ul>
              <p className="text-sm text-slate-600 mt-2">
                For pricing and key issuance, contact <strong>support@meldra.ai</strong>. 
                The &quot;Commercial terms&quot; referred to on the Developers page are these Disclaimer &amp; Terms.
              </p>
            </div>
          </section>

          {/* Term and Termination */}
          <section>
            <h2 className="text-2xl font-bold text-slate-800 mb-3">Term and Termination</h2>
            <div className="text-slate-700 space-y-2">
              <p>
                We may suspend or terminate your account or API access at any time, with or without cause or notice, 
                including for breach of these terms, abuse, non-payment, or for any other reason we deem appropriate.
              </p>
              <p>
                You may stop using the Service at any time. On termination, your right to use the Service and any API key ceases immediately.
              </p>
            </div>
          </section>

          {/* Indemnification */}
          <section>
            <h2 className="text-2xl font-bold text-slate-800 mb-3">Indemnification</h2>
            <div className="text-slate-700 space-y-2">
              <p>
                You agree to indemnify and hold harmless Meldra, its officers, directors, employees, and agents from:
              </p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>Any claims arising from your use of the Service</li>
                <li>Your violation of these terms</li>
                <li>Your violation of any rights of third parties</li>
                <li>Any content you upload or process</li>
              </ul>
            </div>
          </section>

          {/* Governing Law */}
          <section>
            <h2 className="text-2xl font-bold text-slate-800 mb-3">Governing Law</h2>
            <div className="text-slate-700 space-y-2">
              <p>
                These terms shall be governed by and construed in accordance with the laws of <strong>England and Wales</strong>, 
                without regard to conflict of law principles.
              </p>
              <p>
                Any disputes shall be resolved exclusively in <strong>the courts of England and Wales</strong>.
              </p>
            </div>
          </section>

          {/* Changes to Terms */}
          <section>
            <h2 className="text-2xl font-bold text-slate-800 mb-3">Changes to These Terms</h2>
            <div className="text-slate-700">
              <p>
                We reserve the right to modify these terms at any time. Changes will be effective immediately upon posting. 
                Your continued use of the Service after changes constitutes acceptance of the new terms.
              </p>
              <p className="mt-2">
                <strong>Last modified:</strong> {new Date().toLocaleDateString()}
              </p>
            </div>
          </section>

          {/* Force Majeure */}
          <section>
            <h2 className="text-2xl font-bold text-slate-800 mb-3">Force Majeure</h2>
            <div className="text-slate-700">
              <p>
                We are not liable for any failure or delay in performing our obligations where such failure or delay 
                results from circumstances beyond our reasonable control, including but not limited to: acts of God, 
                natural disasters, war, terrorism, riots, embargoes, acts of civil or military authorities, fire, 
                floods, accidents, strikes, or shortages of transportation, facilities, fuel, energy, labour, or materials.
              </p>
            </div>
          </section>

          {/* Entire Agreement */}
          <section>
            <h2 className="text-2xl font-bold text-slate-800 mb-3">Entire Agreement</h2>
            <div className="text-slate-700">
              <p>
                These terms, together with our Privacy Policy and any other policies or guidelines we publish, 
                constitute the entire agreement between you and Meldra regarding the Service and supersede any 
                prior agreements, communications, or understandings.
              </p>
            </div>
          </section>

          {/* Severability */}
          <section>
            <h2 className="text-2xl font-bold text-slate-800 mb-3">Severability</h2>
            <div className="text-slate-700">
              <p>
                If any provision of these terms is held to be invalid, illegal, or unenforceable, the remaining 
                provisions will continue in full force and effect.
              </p>
            </div>
          </section>

          {/* No Waiver */}
          <section>
            <h2 className="text-2xl font-bold text-slate-800 mb-3">No Waiver</h2>
            <div className="text-slate-700">
              <p>
                Our failure to enforce any right or provision of these terms will not be deemed a waiver of such 
                right or provision. Any waiver must be in writing and signed by us.
              </p>
            </div>
          </section>

          {/* Assignment */}
          <section>
            <h2 className="text-2xl font-bold text-slate-800 mb-3">Assignment</h2>
            <div className="text-slate-700">
              <p>
                You may not assign or transfer these terms or your rights under them without our prior written consent. 
                We may assign our rights and obligations under these terms without restriction, including in connection 
                with a merger, acquisition, or sale of assets.
              </p>
            </div>
          </section>

          {/* Contact */}
          <section className="border-t border-slate-200 pt-6">
            <h2 className="text-2xl font-bold text-slate-800 mb-3">Questions?</h2>
            <div className="space-y-2 text-slate-700">
              <p><strong>Legal inquiries:</strong> legal@meldra.ai</p>
              <p><strong>Terms questions:</strong> support@meldra.ai</p>
            </div>
          </section>

          {/* Acceptance */}
          <section className="bg-purple-50 border-2 border-purple-200 rounded-lg p-6">
            <p className="text-purple-900 font-semibold text-center text-lg">
              By using Meldra, you acknowledge that you have read, understood, 
              and agree to be bound by these terms and our Privacy Policy.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}