// pages/Pricing.jsx - Landing page with app overview and pricing
import React, { useState, useEffect } from 'react';
import { meldraAi } from '@/api/meldraClient';
import { Button } from '@/components/ui/button';
import { Check, Crown, Sparkles, Zap, Star, CreditCard, AlertCircle, BarChart3, Brain, Database, FileSpreadsheet, FileText, Shield, ArrowRight, TrendingUp, FileCheck, Lock } from 'lucide-react';
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
      const currentUser = await meldraAi.auth.me();
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

  // Show both tiers on landing page
  const plans = [
    {
      id: 'free',
      name: 'Free',
      price: 0,
      priceDisplay: '$0',
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
      color: 'from-purple-600 to-indigo-600',
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
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-16">
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
          <p className="text-xl text-slate-400 max-w-3xl mx-auto mb-8 leading-relaxed">
            Transform your data into actionable insights with AI-powered analysis, automated workflows, and professional reporting. 
            All while keeping your data completely private and secure.
          </p>
          
          {!user && (
            <div className="flex gap-4 justify-center mt-8">
              <a
                href="/register"
                className="px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-lg font-semibold text-lg transition-all shadow-lg flex items-center gap-2"
              >
                Get Started Free
                <ArrowRight className="w-5 h-5" />
              </a>
              <a
                href="/login"
                className="px-8 py-4 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-semibold text-lg transition-all border border-slate-700"
              >
                Login
              </a>
            </div>
          )}
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
            {features.map((feature, idx) => (
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

      {/* Pricing Section */}
      <div className="container mx-auto px-4 py-12 border-t border-slate-800">
        <div className="text-center mb-12">
          <Badge className="mb-4 bg-purple-500/20 text-purple-300 border-purple-500/30">
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

        {/* Admin Notice */}
        {user && user.email === 'sumit@meldra.ai' && (
          <Alert className="mb-8 max-w-4xl mx-auto bg-amber-500/10 border-amber-500/30">
            <AlertCircle className="h-5 w-5 text-amber-400" />
            <AlertDescription className="text-amber-200">
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
                  <Badge className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-4 py-1">
                    Most Popular
                  </Badge>
                </div>
              )}

              <div className="relative group h-full">
                <div className={`absolute inset-0 bg-gradient-to-r ${plan.color} rounded-2xl blur-xl opacity-30`} />
                
                <div className="relative bg-slate-900/90 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-8 h-full flex flex-col">
                  {/* Plan Header */}
                  <div className="text-center mb-6">
                    <plan.icon className="w-12 h-12 mx-auto mb-4 text-purple-400" />
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
                        className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold py-3 px-4 rounded-lg text-center transition-all flex items-center justify-center gap-2"
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
                      <a
                        href="/register"
                        className={`w-full bg-gradient-to-r ${plan.color} hover:opacity-90 text-white font-bold py-3 px-4 rounded-lg text-center transition-all flex items-center justify-center gap-2`}
                      >
                        <CreditCard className="w-4 h-4" />
                        Sign Up for Premium
                      </a>
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
              <Zap className="w-10 h-10 text-purple-400 mb-4" />
              <h3 className="text-lg font-bold text-white mb-2">Unlimited Everything</h3>
              <p className="text-slate-400 text-sm">
                No file size limits, unlimited transactions, unlimited AI queries
              </p>
            </div>
            <div className="bg-slate-900/80 border border-slate-700/50 rounded-xl p-6">
              <Crown className="w-10 h-10 text-purple-400 mb-4" />
              <h3 className="text-lg font-bold text-white mb-2">Excel Support</h3>
              <p className="text-slate-400 text-sm">
                Import .XLS, .XLSX files directly. Export to Excel format
              </p>
            </div>
            <div className="bg-slate-900/80 border border-slate-700/50 rounded-xl p-6">
              <Star className="w-10 h-10 text-purple-400 mb-4" />
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