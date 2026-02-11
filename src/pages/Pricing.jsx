// pages/Pricing.jsx - Landing page with app overview and pricing
import React, { useState, useEffect } from 'react';
import { meldraAi } from '@/api/meldraClient';
import { Button } from '@/components/ui/button';
import { Check, Crown, Sparkles, Zap, Star, CreditCard, AlertCircle, BarChart3, Brain, Database, FileSpreadsheet, FileText, Shield, ArrowRight, TrendingUp, FileCheck, Lock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function Pricing() {
  const [user, setUser] = useState(null);
  const [selectedPlan, setSelectedPlan] = useState(null);

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

  // Show both tiers on landing page
  const plans = [
    {
      id: 'free',
      name: 'Free',
      price: 0,
      priceDisplay: '£0',
      period: 'forever',
      icon: Sparkles,
      color: 'from-gray-600 to-gray-700',
      features: [
        '20 jobs per month',
        '2 questions per day',
        'Basic chart types',
        'Basic clean & filter',
        'Export to CSV',
        'Files up to 10MB',
      ]
    },
    {
      id: 'premium_quarterly',
      name: 'Premium',
      price: 19,
      priceDisplay: '£19',
      period: '/month',
      totalDisplay: '£57 billed quarterly',
      savings: '5% off',
      icon: Crown,
      color: 'from-teal-600 to-sky-600',
      popular: true,
      features: [
        '200MB file size limit',
        '200 jobs',
        '300 questions per month',
        '400 chart types per month',
        'Clean & reshape data without formulas',
        'AI suggests formulas when you need them',
        'Priority support',
        'Export to Excel, Word, PDF, and more',
        'Import Excel and CSV directly'
      ]
    },
    {
      id: 'premium_yearly',
      name: 'Premium',
      price: 18,
      priceDisplay: '£18',
      period: '/month',
      totalDisplay: '£216 billed annually',
      savings: '10% off',
      icon: Crown,
      color: 'from-teal-600 to-sky-600',
      features: [
        '500MB file size limit',
        '400 jobs',
        '400 questions per month',
        '500 chart types per month',
        'Clean & reshape data without formulas',
        'AI suggests formulas when you need them',
        'Priority support',
        'Export to Excel, Word, PDF, and more',
        'Import Excel and CSV directly'
      ]
    },
  ];

  const handleSubscribe = (plan) => {
    if (plan.id === 'free') {
      alert('You\'re already on the free plan!');
      return;
    }

    if (!user) {
      alert('Please login first');
      return;
    }

    setSelectedPlan({ ...plan });
  };

  const features = [
    { icon: BarChart3, title: 'Ask Your Data Questions', description: 'Upload Excel or CSV and ask in plain English. Get answers and charts. Export to PDF, Excel, or Word for your report or deck.' },
    { icon: Brain, title: 'AI That Does the Steps for You', description: 'Tell it what you need—e.g. clean, chart, export to PowerPoint. It runs the steps so you don’t have to.' },
    { icon: Database, title: 'Design How Your Tables Connect', description: 'Draw how your database tables link. AI helps. Export the structure for your tech team.' },
    { icon: FileSpreadsheet, title: 'P&L From a Sentence', description: 'Describe your P&L in words. Get numbers and charts. Use it for month-end or board packs.' },
    { icon: FileText, title: 'Excel to PowerPoint', description: 'Turn your Excel sheet into slides with charts and tables. One flow from data to deck.' },
    { icon: Shield, title: 'We Don’t Store Your Data', description: 'Everything runs on your device. Your files never sit on our servers. You stay in control.' }
  ];

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
          <div />
        </div>

        <div className="text-center mb-6">
          <Badge className="mb-4 border border-blue-200 bg-blue-50 text-blue-700">
            <Star className="w-4 h-4 mr-1" />
            Choose Your Plan
          </Badge>
          <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mb-4">
            Simple, Transparent Pricing
          </h2>
          <p className="text-xl text-slate-600 max-w-2xl mx-auto mb-6">
            Start free. Upgrade when you need bigger files and more reports.
          </p>
        </div>

        <Alert className="mb-4 max-w-4xl mx-auto bg-blue-50 border-blue-200">
          <AlertCircle className="h-5 w-5 text-blue-600" />
          <AlertDescription className="text-blue-800">
            <strong>Coming Soon:</strong> Stripe payment integration is being set up. Premium subscriptions will be available soon. 
            For now, you can enjoy all features with the free tier.
          </AlertDescription>
        </Alert>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto mt-0 pt-4">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`relative ${plan.popular ? 'md:scale-105 z-10' : ''}`}
            >
              {plan.popular && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20">
                  <Badge className="text-white px-4 py-1 bg-blue-600 shadow">
                    Most Popular
                  </Badge>
                </div>
              )}

              <div className="relative group h-full">
                <div
                  className={`relative bg-white/80 backdrop-blur border rounded-2xl p-8 h-full flex flex-col shadow-sm transition-shadow group-hover:shadow-md ${
                    plan.popular ? 'border-blue-200 ring-2 ring-blue-200' : 'border-slate-200'
                  }`}
                >
                  <div className="text-center mb-6">
                    <plan.icon className="w-12 h-12 mx-auto mb-4 text-blue-600" />
                    <h3 className="text-2xl font-bold text-slate-900 mb-2">{plan.name}</h3>
                    <div className="flex items-baseline justify-center gap-2">
                      <span className="text-4xl font-bold text-slate-900">{plan.priceDisplay}</span>
                      <span className="text-slate-600">{plan.period}</span>
                    </div>
                    {plan.totalDisplay && (
                      <p className="text-sm text-slate-600 mt-2">{plan.totalDisplay}</p>
                    )}
                    {plan.savings && (
                      <Badge className="mt-2 bg-blue-100 text-blue-600">
                        {plan.savings}
                      </Badge>
                    )}
                  </div>

                  <ul className="space-y-3 mb-8 flex-grow">
                    {plan.features.map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-3">
                        <Check className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                        <span className="text-slate-600 text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  {plan.id === 'free' ? (
                    !user ? (
                      <a
                        href="/register"
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg text-center transition-all flex items-center justify-center gap-2"
                      >
                        <Sparkles className="w-4 h-4" />
                        Get Started Free
                      </a>
                    ) : (
                      <Button className="w-full bg-slate-200 hover:bg-slate-300 text-slate-700">
                        Current Plan
                      </Button>
                    )
                  ) : (
                    !user ? (
                      <div className="space-y-2">
                        <a
                          href="/register"
                          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg text-center transition-all flex items-center justify-center gap-2 block"
                        >
                          <CreditCard className="w-4 h-4" />
                          Sign Up for Premium
                        </a>
                        <p className="text-xs text-slate-500 text-center">
                          Stripe integration coming soon
                        </p>
                      </div>
                    ) : (
                      <Button
                        onClick={() => handleSubscribe(plan)}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold"
                      >
                        <CreditCard className="w-4 h-4 mr-2" />
                        Subscribe Now
                      </Button>
                    )
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {selectedPlan && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-8 max-w-md w-full border border-slate-200 shadow-xl">
              <h2 className="text-2xl font-bold text-slate-900 mb-4">
                Subscribe to {selectedPlan.name}
              </h2>
              <p className="text-slate-600 mb-2">
                {selectedPlan.priceDisplay}{selectedPlan.period}
              </p>
              <p className="text-slate-500 text-sm mb-6">
                {selectedPlan.totalDisplay}
                {selectedPlan.id === 'premium_yearly' && (
                  <span className="block text-blue-600 mt-1">
                    ✓ Auto-renews annually after first year
                  </span>
                )}
              </p>
              <Alert className="mb-6 bg-blue-50 border-blue-200">
                <AlertCircle className="h-5 w-5 text-blue-600" />
                <AlertDescription className="text-blue-800 text-sm">
                  Stripe payment integration is currently being set up. Premium subscriptions will be available soon. 
                  In the meantime, enjoy all features with the free tier!
                </AlertDescription>
              </Alert>
              <Button
                onClick={() => setSelectedPlan(null)}
                variant="outline"
                className="w-full mt-4 border-slate-300 text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        <div className="mt-16 max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-slate-900 text-center mb-8">
            Why upgrade to Premium?
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-6">
              <Zap className="w-10 h-10 mb-4 text-blue-600" />
              <h3 className="text-lg font-bold text-slate-900 mb-2">No Limits on What You Can Do</h3>
              <p className="text-slate-600 text-sm">
                Bigger files, more jobs, unlimited questions to your data. No need to hold back.
              </p>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-6">
              <Crown className="w-10 h-10 mb-4 text-blue-600" />
              <h3 className="text-lg font-bold text-slate-900 mb-2">Full Excel In &amp; Out</h3>
              <p className="text-slate-600 text-sm">
                Import Excel directly. Export to Excel, Word, and PDF for your reports and decks.
              </p>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-6">
              <Star className="w-10 h-10 mb-4 text-blue-600" />
              <h3 className="text-lg font-bold text-slate-900 mb-2">Save When You Pay Ahead</h3>
              <p className="text-slate-600 text-sm">
                5% off quarterly, 10% off yearly. Fewer renewals, more value.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}