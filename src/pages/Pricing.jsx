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
        '10MB file size limit',
        '50 transactions per month',
        '5 AI queries per day',
        'Basic charts (3 types)',
        'Basic cleaning tools',
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
        'Unlimited file size',
        'Unlimited transactions',
        'Unlimited AI queries',
        'All 7 chart types',
        'Advanced transformations',
        'Smart formula builder',
        'Priority support',
        'Export to Excel & CSV',
        'Import .XLS, .XLSX, .CSV'
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
  ];

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(to bottom right, #0A1F44, #0F2A5A, #0A1F44)' }}>
      {/* Pricing Section */}
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <Badge className="mb-4 border" style={{ background: 'rgba(0, 191, 166, 0.2)', color: '#4FC3F7', borderColor: 'rgba(0, 191, 166, 0.3)' }}>
            <Star className="w-4 h-4 mr-1" />
            Choose Your Plan
          </Badge>
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Simple, Transparent Pricing
          </h2>
          <p className="text-xl text-slate-300 max-w-2xl mx-auto mb-8">
            Start free, upgrade when you need more power
          </p>

          {/* Billing Cycle Toggle - Show when logged in */}
          {user && (
            <Tabs value={billingCycle} onValueChange={setBillingCycle} className="max-w-md mx-auto mb-8">
              <TabsList className="grid w-full grid-cols-3 bg-slate-900/80">
                <TabsTrigger value="monthly">Monthly</TabsTrigger>
                <TabsTrigger value="quarterly">
                  Quarterly
                  <Badge className="ml-2 bg-emerald-500/20 text-emerald-300 text-xs">Save 5%</Badge>
                </TabsTrigger>
                <TabsTrigger value="yearly">
                  Yearly
                  <Badge className="ml-2 bg-emerald-500/20 text-emerald-300 text-xs">Save 10%</Badge>
                </TabsTrigger>
              </TabsList>
            </Tabs>
          )}
        </div>

        {/* Stripe Integration Notice */}
        <Alert className="mb-8 max-w-4xl mx-auto bg-blue-500/10 border-blue-500/30">
          <AlertCircle className="h-5 w-5 text-blue-400" />
          <AlertDescription className="text-blue-200">
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
                  <Badge className="text-white px-4 py-1" style={{ background: 'linear-gradient(to right, #00BFA6, #4FC3F7)' }}>
                    Most Popular
                  </Badge>
                </div>
              )}

              <div className="relative group h-full">
                <div className={`absolute inset-0 bg-gradient-to-r ${plan.color} rounded-2xl blur-xl opacity-30`} />
                
                <div className="relative bg-slate-900/90 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-8 h-full flex flex-col">
                  {/* Plan Header */}
                  <div className="text-center mb-6">
                    <plan.icon className="w-12 h-12 mx-auto mb-4" style={{ color: '#4FC3F7' }} />
                    <h3 className="text-2xl font-bold text-white mb-2">{plan.name}</h3>
                    <div className="flex items-baseline justify-center gap-2">
                      <span className="text-4xl font-bold text-white">{plan.priceDisplay}</span>
                      <span className="text-slate-400">{plan.period}</span>
                    </div>
                    {plan.totalDisplay && (
                      <p className="text-sm text-slate-400 mt-2">{plan.totalDisplay}</p>
                    )}
                    {plan.savings && (
                      <Badge className="mt-2 bg-emerald-500/20 text-emerald-300">
                        {plan.savings}
                      </Badge>
                    )}
                  </div>

                  {/* Features */}
                  <ul className="space-y-3 mb-8 flex-grow">
                    {plan.features.map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-3">
                        <Check className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                        <span className="text-slate-300 text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  {/* CTA Button */}
                  {plan.id === 'free' ? (
                    !user ? (
                      <a
                        href="/register"
                        className="w-full text-white font-bold py-3 px-4 rounded-lg text-center transition-all flex items-center justify-center gap-2 hover:opacity-90"
                        style={{ background: '#00E5FF' }}
                      >
                        <Sparkles className="w-4 h-4" />
                        Get Started Free
                      </a>
                    ) : (
                      <Button
                        className="w-full bg-slate-700 hover:bg-slate-600 text-white"
                      >
                        Current Plan
                      </Button>
                    )
                  ) : (
                    !user ? (
                      <div className="space-y-2">
                        <a
                          href="/register"
                          className={`w-full bg-gradient-to-r ${plan.color} hover:opacity-90 text-white font-bold py-3 px-4 rounded-lg text-center transition-all flex items-center justify-center gap-2 block`}
                        >
                          <CreditCard className="w-4 h-4" />
                          Sign Up for Premium
                        </a>
                        <p className="text-xs text-slate-400 text-center">
                          Stripe integration coming soon
                        </p>
                      </div>
                    ) : (
                      <Button
                        onClick={() => handleSubscribe(plan)}
                        className={`w-full bg-gradient-to-r ${plan.color} hover:opacity-90 text-white font-bold`}
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

        {/* Payment Modal */}
        {selectedPlan && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
            <div className="bg-slate-900 rounded-2xl p-8 max-w-md w-full border border-slate-700">
              <h2 className="text-2xl font-bold text-white mb-4">
                Subscribe to {selectedPlan.name}
              </h2>
              <p className="text-slate-300 mb-2">
                {selectedPlan.priceDisplay}{selectedPlan.period}
              </p>
              <p className="text-slate-400 text-sm mb-6">
                {selectedPlan.totalDisplay}
                {billingCycle === 'yearly' && (
                  <span className="block text-emerald-400 mt-1">
                    ✓ Auto-renews annually after first year
                  </span>
                )}
              </p>
              
              <Alert className="mb-6 bg-blue-500/10 border-blue-500/30">
                <AlertCircle className="h-5 w-5 text-blue-400" />
                <AlertDescription className="text-blue-200 text-sm">
                  Stripe payment integration is currently being set up. Premium subscriptions will be available soon. 
                  In the meantime, enjoy all features with the free tier!
                </AlertDescription>
              </Alert>

              <Button
                onClick={() => setSelectedPlan(null)}
                variant="outline"
                className="w-full mt-4 border-slate-700 text-slate-300"
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Feature Comparison */}
        <div className="mt-16 max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-white text-center mb-8">
            Why upgrade to Premium?
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-slate-900/80 border border-slate-700/50 rounded-xl p-6">
              <Zap className="w-10 h-10 mb-4" style={{ color: '#4FC3F7' }} />
              <h3 className="text-lg font-bold text-white mb-2">Unlimited Everything</h3>
              <p className="text-slate-400 text-sm">
                No file size limits, unlimited transactions, unlimited AI queries
              </p>
            </div>
            <div className="bg-slate-900/80 border border-slate-700/50 rounded-xl p-6">
              <Crown className="w-10 h-10 mb-4" style={{ color: '#4FC3F7' }} />
              <h3 className="text-lg font-bold text-white mb-2">Excel Support</h3>
              <p className="text-slate-400 text-sm">
                Import .XLS, .XLSX files directly. Export to Excel format
              </p>
            </div>
            <div className="bg-slate-900/80 border border-slate-700/50 rounded-xl p-6">
              <Star className="w-10 h-10 mb-4" style={{ color: '#4FC3F7' }} />
              <h3 className="text-lg font-bold text-white mb-2">Save More</h3>
              <p className="text-slate-400 text-sm">
                Get 5% off with quarterly billing, 10% off with yearly billing
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}