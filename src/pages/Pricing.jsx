// pages/Pricing.jsx - Landing page with app overview and pricing
import React, { useState, useEffect } from 'react';
import { meldraAi } from '@/api/meldraClient';
import { Button } from '@/components/ui/button';
import { Check, Crown, Sparkles, Zap, Star, CreditCard, AlertCircle, BarChart3, Brain, Database, FileSpreadsheet, FileText, Shield, ArrowRight, TrendingUp, FileCheck, Lock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function Pricing() {
  const [user, setUser] = useState(null);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [billingCycle, setBillingCycle] = useState('monthly'); // monthly, quarterly, yearly

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

  // Pricing tiers with different billing cycles (in GBP)
  const getPricing = (cycle) => {
    if (cycle === 'monthly') {
      return {
        monthly: 20,
        display: '£20',
        period: '/month',
        total: '£20/month',
        savings: null
      };
    } else if (cycle === 'quarterly') {
      return {
        monthly: 19,
        display: '£19',
        period: '/month',
        total: '£57 billed quarterly',
        savings: '5% off'
      };
    } else { // yearly
      return {
        monthly: 18,
        display: '£18',
        period: '/month',
        total: '£216 billed annually',
        savings: '10% off'
      };
    }
  };

  const pricing = getPricing(billingCycle);

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
        'Files up to 10MB',
        '50 jobs per month',
        '5 questions to your data per day',
        '3 chart types',
        'Basic clean & filter',
        'Export to CSV'
      ]
    },
    {
      id: 'premium',
      name: 'Premium',
      price: pricing.monthly,
      priceDisplay: pricing.display,
      period: pricing.period,
      totalDisplay: pricing.total,
      savings: pricing.savings,
      icon: Crown,
      color: 'from-teal-600 to-sky-600',
      popular: true,
      features: [
        'No file size limit',
        'Unlimited jobs',
        'Unlimited questions to your data',
        'All chart types (P&L, forecasts, and more)',
        'Clean & reshape data without formulas',
        'AI suggests formulas when you need them',
        'Priority support',
        'Export to Excel, Word, PDF, and more',
        'Import Excel and CSV directly'
      ]
    }
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

    setSelectedPlan({ ...plan, billingCycle });
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
    <div className="min-h-screen bg-white">
      {/* Pricing Section — same theme as Landing, Developers */}
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <Badge className="mb-4 border border-blue-200 bg-blue-50 text-blue-700">
            <Star className="w-4 h-4 mr-1" />
            Choose Your Plan
          </Badge>
          <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mb-4">
            Simple, Transparent Pricing
          </h2>
          <p className="text-xl text-slate-600 max-w-2xl mx-auto mb-8">
            Start free. Upgrade when you need bigger files and more reports.
          </p>

          {user && (
            <Tabs value={billingCycle} onValueChange={setBillingCycle} className="max-w-md mx-auto mb-8">
              <TabsList className="grid w-full grid-cols-3 bg-slate-100 border border-slate-200">
                <TabsTrigger value="monthly">Monthly</TabsTrigger>
                <TabsTrigger value="quarterly">
                  Quarterly
                  <Badge className="ml-2 bg-blue-100 text-blue-600 text-xs">Save 5%</Badge>
                </TabsTrigger>
                <TabsTrigger value="yearly">
                  Yearly
                  <Badge className="ml-2 bg-blue-100 text-blue-600 text-xs">Save 10%</Badge>
                </TabsTrigger>
              </TabsList>
            </Tabs>
          )}
        </div>

        <Alert className="mb-8 max-w-4xl mx-auto bg-blue-50 border-blue-200">
          <AlertCircle className="h-5 w-5 text-blue-600" />
          <AlertDescription className="text-blue-800">
            <strong>Coming Soon:</strong> Stripe payment integration is being set up. Premium subscriptions will be available soon. 
            For now, you can enjoy all features with the free tier.
          </AlertDescription>
        </Alert>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`relative ${plan.popular ? 'md:scale-105 z-10' : ''}`}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <Badge className="text-white px-4 py-1 bg-blue-600">
                    Most Popular
                  </Badge>
                </div>
              )}

              <div className="relative group h-full">
                <div className="relative bg-slate-50 border border-slate-200 rounded-2xl p-8 h-full flex flex-col">
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
                {billingCycle === 'yearly' && (
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