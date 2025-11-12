// pages/Pricing.jsx - Updated with quarterly/yearly pricing, removed Business plan
import React, { useState, useEffect } from 'react';
import { meldra } from '@/api/meldraClient';
import { Button } from '@/components/ui/button';
import { Check, Crown, Sparkles, Zap, Star, CreditCard, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import PaymentIntegration from '../components/subscription/PaymentIntegration';

export default function Pricing() {
  const [user, setUser] = useState(null);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [billingCycle, setBillingCycle] = useState('monthly'); // monthly, quarterly, yearly

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const currentUser = await meldra.auth.me();
      setUser(currentUser);
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  // Pricing tiers with different billing cycles
  const getPricing = (cycle) => {
    if (cycle === 'monthly') {
      return {
        monthly: 10,
        display: '$10',
        period: '/month',
        total: '$10/month',
        savings: null
      };
    } else if (cycle === 'quarterly') {
      return {
        monthly: 9.5,
        display: '$9.50',
        period: '/month',
        total: '$38 billed quarterly',
        savings: '5% off'
      };
    } else { // yearly
      return {
        monthly: 9,
        display: '$9',
        period: '/month',
        total: '$108 billed annually',
        savings: '10% off'
      };
    }
  };

  const pricing = getPricing(billingCycle);

  const plans = [
    {
      id: 'free',
      name: 'Free',
      price: 0,
      priceDisplay: '$0',
      period: 'forever',
      icon: Sparkles,
      color: 'from-gray-600 to-gray-700',
      processing: {
        method: 'Browser Only',
        badge: '🔒 100% Private',
        description: 'All processing in your browser'
      },
      limits: {
        fileSize: '5 MB',
        rows: '5,000 rows',
        storage: 'Zero data storage'
      },
      features: [
        '🔒 Browser-only processing (100% private)',
        '📁 Files up to 5 MB',
        '📊 Datasets up to 5,000 rows',
        '5 AI queries per day',
        'Basic charts (3 types)',
        'Basic cleaning tools',
        'Export to CSV',
        '✓ Sheet Manager',
        '✓ Reconciliation Tool',
        '✓ Accounting Toolkit',
        '✓ Project Tracker'
      ]
    },
    {
      id: 'premium',
      name: 'Pro',
      price: pricing.monthly,
      priceDisplay: pricing.display,
      period: pricing.period,
      totalDisplay: pricing.total,
      savings: pricing.savings,
      icon: Crown,
      color: 'from-slate-800 to-indigo-600',
      popular: true,
      processing: {
        method: 'Browser + Backend',
        badge: '⚡ Faster Processing',
        description: 'Python backend for large files'
      },
      limits: {
        fileSize: '50 MB',
        rows: '100,000 rows',
        storage: 'Zero data storage'
      },
      features: [
        '⚡ Backend processing for files >5MB',
        '📁 Files up to 50 MB',
        '📊 Datasets up to 100,000 rows',
        'Unlimited AI queries',
        'All 7 chart types',
        'Advanced transformations',
        'Smart formula builder',
        'Priority support',
        'Export to Excel & CSV',
        'Import .XLS, .XLSX, .CSV',
        '✓ All Free features',
        '✓ 10x faster for large files'
      ]
    },
    {
      id: 'enterprise',
      name: 'Enterprise',
      price: null,
      priceDisplay: 'Custom',
      period: '',
      icon: Zap,
      color: 'from-amber-600 to-orange-600',
      processing: {
        method: 'Dedicated Backend',
        badge: '🚀 Maximum Performance',
        description: 'Dedicated resources'
      },
      limits: {
        fileSize: '500 MB',
        rows: 'Unlimited',
        storage: 'Optional cloud storage'
      },
      features: [
        '🚀 Dedicated backend processing',
        '📁 Files up to 500 MB',
        '📊 Unlimited rows',
        'Unlimited AI queries',
        'All features',
        'Custom integrations',
        'Dedicated support',
        'SLA guarantee',
        'Optional cloud storage',
        'Team collaboration',
        'Advanced security',
        'Priority processing queue'
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-blue-100 py-12">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-12">
          <Badge className="mb-4 bg-blue-500/20 text-slate-700 border-blue-500/30">
            <Star className="w-4 h-4 mr-1" />
            Choose Your Plan
          </Badge>
          <h1 className="text-5xl font-bold text-blue-900 mb-2">
            Simple, Transparent Pricing
          </h1>
          <p className="text-lg text-slate-700 font-semibold mb-4">
            InsightSheet-lite
          </p>
          <p className="text-xl text-slate-800 max-w-2xl mx-auto mb-8">
            Start free, upgrade when you need more power
          </p>

          {/* Billing Cycle Toggle */}
          <Tabs value={billingCycle} onValueChange={setBillingCycle} className="max-w-md mx-auto mb-8">
            <TabsList className="grid w-full grid-cols-3 bg-white border border-blue-200">
              <TabsTrigger value="monthly">Monthly</TabsTrigger>
              <TabsTrigger value="quarterly">
                Quarterly
                <Badge className="ml-2 bg-emerald-500/20 text-emerald-700 text-xs">Save 5%</Badge>
              </TabsTrigger>
              <TabsTrigger value="yearly">
                Yearly
                <Badge className="ml-2 bg-emerald-500/20 text-emerald-700 text-xs">Save 10%</Badge>
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Admin Notice */}
        {user && user.email === 'sumit@meldra.ai' && (
          <Alert className="mb-8 max-w-4xl mx-auto bg-amber-50 border-amber-300">
            <AlertCircle className="h-5 w-5 text-amber-600" />
            <AlertDescription className="text-amber-800">
              <strong>Admin Notice:</strong> Stripe payment links need to be configured for monthly, quarterly, and yearly billing.
              Click "Subscribe Now" to see the setup guide.
            </AlertDescription>
          </Alert>
        )}

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`relative ${plan.popular ? 'md:scale-105 z-10' : ''}`}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <Badge className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-4 py-1">
                    Most Popular
                  </Badge>
                </div>
              )}

              <div className="relative group h-full">
                <div className={`absolute inset-0 bg-gradient-to-r ${plan.color} rounded-2xl blur-xl opacity-20`} />

                <div className="relative bg-white backdrop-blur-xl border border-blue-200 rounded-2xl p-8 h-full flex flex-col shadow-lg">
                  {/* Plan Header */}
                  <div className="text-center mb-6">
                    <plan.icon className="w-12 h-12 mx-auto mb-4 text-slate-800" />
                    <h3 className="text-2xl font-bold text-blue-900 mb-2">{plan.name}</h3>
                    <div className="flex items-baseline justify-center gap-2">
                      <span className="text-4xl font-bold text-blue-900">{plan.priceDisplay}</span>
                      <span className="text-slate-800">{plan.period}</span>
                    </div>
                    {plan.totalDisplay && (
                      <p className="text-sm text-slate-800 mt-2">{plan.totalDisplay}</p>
                    )}
                    {plan.savings && (
                      <Badge className="mt-2 bg-emerald-500/20 text-emerald-700">
                        {plan.savings}
                      </Badge>
                    )}
                  </div>

                  {/* Processing Method - NEW */}
                  {plan.processing && (
                    <div className="mb-6 bg-blue-50 rounded-xl p-4 border border-blue-200">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-semibold text-slate-700">Processing Method</span>
                        <Badge className={`${
                          plan.id === 'free' ? 'bg-blue-600/20 text-slate-700' :
                          plan.id === 'premium' ? 'bg-indigo-600/20 text-indigo-700' :
                          'bg-amber-600/20 text-amber-700'
                        }`}>
                          {plan.processing.badge}
                        </Badge>
                      </div>
                      <p className="text-blue-900 font-bold mb-1">{plan.processing.method}</p>
                      <p className="text-xs text-slate-800">{plan.processing.description}</p>
                    </div>
                  )}

                  {/* Limits - NEW */}
                  {plan.limits && (
                    <div className="mb-6 space-y-2">
                      <div className="flex items-center justify-between py-2 border-b border-blue-200">
                        <span className="text-sm text-slate-700">Max File Size</span>
                        <span className="text-sm font-bold text-blue-900">{plan.limits.fileSize}</span>
                      </div>
                      <div className="flex items-center justify-between py-2 border-b border-blue-200">
                        <span className="text-sm text-slate-700">Max Rows</span>
                        <span className="text-sm font-bold text-blue-900">{plan.limits.rows}</span>
                      </div>
                      <div className="flex items-center justify-between py-2">
                        <span className="text-sm text-slate-700">Data Storage</span>
                        <span className="text-sm font-bold text-emerald-600">{plan.limits.storage}</span>
                      </div>
                    </div>
                  )}

                  {/* Features */}
                  <ul className="space-y-3 mb-8 flex-grow">
                    {plan.features.map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-3">
                        <Check className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                        <span className="text-blue-800 text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  {/* CTA Button */}
                  {plan.id === 'free' ? (
                    <Button
                      className="w-full bg-blue-200 hover:bg-blue-300 text-blue-900 font-semibold"
                    >
                      Current Plan
                    </Button>
                  ) : (
                    <Button
                      onClick={() => handleSubscribe(plan)}
                      className={`w-full bg-gradient-to-r ${plan.color} hover:opacity-90 text-white font-bold shadow-lg`}
                    >
                      <CreditCard className="w-4 h-4 mr-2" />
                      Subscribe Now
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Payment Modal */}
        {selectedPlan && (
          <div className="fixed inset-0 bg-blue-900/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-8 max-w-md w-full border border-blue-200 shadow-2xl">
              <h2 className="text-2xl font-bold text-blue-900 mb-4">
                Subscribe to {selectedPlan.name}
              </h2>
              <p className="text-slate-700 mb-2 font-semibold">
                {selectedPlan.priceDisplay}{selectedPlan.period}
              </p>
              <p className="text-slate-800 text-sm mb-6">
                {selectedPlan.totalDisplay}
                {billingCycle === 'yearly' && (
                  <span className="block text-emerald-600 mt-1">
                    ✓ Auto-renews annually after first year
                  </span>
                )}
              </p>
              
              <PaymentIntegration
                plan={selectedPlan.id}
                amount={selectedPlan.price}
                billingCycle={billingCycle}
                onSuccess={() => {
                  setSelectedPlan(null);
                  alert('Subscription successful!');
                  window.location.reload();
                }}
              />

              <Button
                onClick={() => setSelectedPlan(null)}
                variant="outline"
                className="w-full mt-4 border-blue-300 text-slate-700 hover:bg-blue-50"
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Feature Comparison */}
        <div className="mt-16 max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-blue-900 text-center mb-8">
            Why upgrade to Premium?
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-white border border-blue-200 rounded-xl p-6 shadow-md">
              <Zap className="w-10 h-10 text-slate-800 mb-4" />
              <h3 className="text-lg font-bold text-blue-900 mb-2">Unlimited Everything</h3>
              <p className="text-slate-700 text-sm">
                No file size limits, unlimited transactions, unlimited AI queries
              </p>
            </div>
            <div className="bg-white border border-blue-200 rounded-xl p-6 shadow-md">
              <Crown className="w-10 h-10 text-slate-800 mb-4" />
              <h3 className="text-lg font-bold text-blue-900 mb-2">Excel Support</h3>
              <p className="text-slate-700 text-sm">
                Import .XLS, .XLSX files directly. Export to Excel format
              </p>
            </div>
            <div className="bg-white border border-blue-200 rounded-xl p-6 shadow-md">
              <Star className="w-10 h-10 text-slate-800 mb-4" />
              <h3 className="text-lg font-bold text-blue-900 mb-2">Save More</h3>
              <p className="text-slate-700 text-sm">
                Get 5% off with quarterly billing, 10% off with yearly billing
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}