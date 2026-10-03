// pages/Pricing.jsx - Landing page with app overview and pricing
import React, { useState, useEffect } from 'react';
import { meldraAi } from '@/api/meldraClient';
import { Button } from '@/components/ui/button';
import Logo from '@/components/branding/Logo';
import { ArrowRight, Mail, Send, Star } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const PLANS = [
  {
    name: 'Free',
    price: '60-day trial',
    blurb: 'Everything you need to try Meldra on real work.',
    items: ['Every tool, including Ask Meldra', '20 tool runs a month', '2 AI questions a day', 'Files up to 10 MB', 'Exports carry a small meldra.ai watermark'],
    note: 'After 60 days a free account is closed unless you upgrade. We email you 5 days before.',
  },
  {
    name: 'Premium',
    price: 'Price on request',
    blurb: 'For people who use Meldra every week.',
    items: ['Everything in Free', '200 tool runs a month (400 on yearly)', '300 AI questions a month (400 on yearly)', 'Files up to 500 MB', 'No watermark on exports'],
    highlight: true,
  },
];

export default function Pricing() {
  const [user, setUser] = useState(null);
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    company: '',
    useType: 'individual',
    users: '',
    dataSources: '',
    requirements: '',
    timeline: 'this_week',
  });

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const currentUser = await meldraAi.auth.me();
      setUser(currentUser);
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  const openPricingEmail = () => {
    const to = 'pricing@meldra.ai';
    const subject = encodeURIComponent('Meldra pricing request');
    const lines = [
      'Hello Meldra Team,',
      '',
      'Please share pricing for the following:',
      '',
      `Name: ${form.firstName} ${form.lastName}`.trim(),
      `Email: ${form.email}`.trim(),
      `Company/Organization: ${form.company || '(not provided)'}`,
      `Use type: ${form.useType}`,
      `Estimated users: ${form.users || '(not provided)'}`,
      `Data sources/files: ${form.dataSources || '(not provided)'}`,
      `Requirements: ${form.requirements || '(not provided)'}`,
      `Timeline: ${form.timeline}`,
      '',
      'Thank you,',
      `${form.firstName} ${form.lastName}`.trim(),
    ];
    const body = encodeURIComponent(lines.join('\n'));
    window.location.href = `mailto:${to}?subject=${subject}&body=${body}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Pricing Section — same theme as Landing, Developers */}
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <a href="/">
            <Button variant="outline" className="border-slate-300 text-slate-700 hover:bg-white">
              <ArrowRight className="w-4 h-4 mr-2 rotate-180" />
              Back to Home
            </Button>
          </a>
          <Logo size="small" showText />
        </div>

        <div className="text-center mb-6">
          <Badge className="mb-4 border border-blue-200 bg-blue-50 text-blue-700">
            <Star className="w-4 h-4 mr-1" />
            Pricing
          </Badge>
          <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mb-4">
            Start free. Upgrade when it saves you time.
          </h2>
          <p className="text-xl text-slate-600 max-w-2xl mx-auto mb-6">
            Try every tool free for 60 days. Premium removes the limits that matter for day-to-day work; teams and companies get a quote within 24 hours.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <a
              href={user ? '/' : '/register'}
              className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-5 rounded-lg text-center transition-all"
            >
              Get Started Free
            </a>
            <Button
              variant="outline"
              className="w-full sm:w-auto border-slate-300 text-slate-700 hover:bg-white"
              onClick={() => document.getElementById('pricing-request')?.scrollIntoView({ behavior: 'smooth' })}
            >
              Request Pricing
            </Button>
          </div>
        </div>

        {/* What each plan includes (figures from the plan limits on the server) */}
        <section aria-labelledby="plans-title" className="mx-auto mb-12 max-w-4xl">
          <h3 id="plans-title" className="sr-only">What each plan includes</h3>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {PLANS.map((plan) => (
              <div key={plan.name} className={`rounded-2xl border bg-white p-6 shadow-sm ${plan.highlight ? 'border-blue-500 ring-1 ring-blue-500' : 'border-slate-200'}`}>
                <div className="flex items-baseline justify-between">
                  <h4 className="text-xl font-bold text-slate-900">{plan.name}</h4>
                  <span className="text-sm font-medium text-slate-500">{plan.price}</span>
                </div>
                <p className="mt-1 text-sm text-slate-600">{plan.blurb}</p>
                <ul className="mt-4 space-y-2 text-sm text-slate-700">
                  {plan.items.map((item) => (
                    <li key={item} className="flex gap-2"><span aria-hidden="true" className="text-blue-600">✓</span>{item}</li>
                  ))}
                </ul>
                {plan.note && <p className="mt-4 text-xs text-slate-500">{plan.note}</p>}
              </div>
            ))}
          </div>
          <p className="mt-4 text-center text-sm text-slate-500">Every plan: your files are never stored, all tools included, delete your account any time in Settings.</p>
        </section>

        {/* Pricing request */}
        <section id="pricing-request" className="mt-10 max-w-4xl mx-auto">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 md:p-8 shadow-sm">
            <h3 className="text-2xl font-bold text-slate-900">Request pricing</h3>
            <p className="text-slate-600 mt-2">
              For individuals, small teams, and enterprise. Tell us what you need and we will respond by email within 24 hours with pricing guidance and a simple ROI estimate.
            </p>

            <div className="mt-4 bg-slate-50 border border-slate-200 rounded-xl p-4">
              <p className="text-slate-700 text-sm">
                Prefer email? Send a request to{' '}
                <a className="text-blue-700 underline" href="mailto:pricing@meldra.ai">pricing@meldra.ai</a>{' '}
                with your name, email, estimated users, and what you are trying to automate.
              </p>
            </div>

            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-slate-700">First name</label>
                <input
                  value={form.firstName}
                  onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">Last name</label>
                <input
                  value={form.lastName}
                  onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">Email</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">Company / Organization (optional)</label>
                <input
                  value={form.company}
                  onChange={(e) => setForm((f) => ({ ...f, company: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700">Use type</label>
                <select
                  value={form.useType}
                  onChange={(e) => setForm((f) => ({ ...f, useType: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 bg-white"
                >
                  <option value="individual">Individual</option>
                  <option value="small_team">Small team</option>
                  <option value="company">Company</option>
                  <option value="enterprise">Enterprise</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">Estimated users (optional)</label>
                <input
                  value={form.users}
                  onChange={(e) => setForm((f) => ({ ...f, users: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                  placeholder="e.g. 1, 5, 25, 200"
                />
              </div>

              <div className="md:col-span-2">
                <label className="text-sm font-medium text-slate-700">Data sources / file types (optional)</label>
                <input
                  value={form.dataSources}
                  onChange={(e) => setForm((f) => ({ ...f, dataSources: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                  placeholder="e.g. Excel, CSV, PDFs, ZIPs, monthly reports"
                />
              </div>

              <div className="md:col-span-2">
                <label className="text-sm font-medium text-slate-700">What do you want to automate?</label>
                <textarea
                  value={form.requirements}
                  onChange={(e) => setForm((f) => ({ ...f, requirements: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 min-h-[120px]"
                  placeholder="Describe your workflow (cleaning, transformations, exports, conversions, volume, frequency)."
                />
              </div>

              <div className="md:col-span-2">
                <label className="text-sm font-medium text-slate-700">Timeline</label>
                <select
                  value={form.timeline}
                  onChange={(e) => setForm((f) => ({ ...f, timeline: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 bg-white"
                >
                  <option value="this_week">This week</option>
                  <option value="this_month">This month</option>
                  <option value="this_quarter">This quarter</option>
                  <option value="exploring">Just exploring</option>
                </select>
              </div>
            </div>

            <div className="mt-6 flex flex-col sm:flex-row gap-3">
              <Button
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold"
                onClick={() => openPricingEmail()}
                disabled={!String(form.email || '').trim()}
              >
                <Send className="w-4 h-4 mr-2" />
                Send pricing request
              </Button>
              <a
                href="mailto:pricing@meldra.ai"
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-slate-700 hover:bg-white"
              >
                <Mail className="w-4 h-4" />
                Email pricing@meldra.ai
              </a>
            </div>

            <p className="text-xs text-slate-500 mt-3">
              If you want, we can include a short ROI estimate and offer a quick onboarding call to help you evaluate Meldra.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}