// pages/Pricing.jsx - Meldra Premium Pricing with 14-day Trial
import React, { useState, useEffect } from 'react';
import { meldra } from '@/api/meldraClient';
import { Button } from '@/components/ui/button';
import { Check, Crown, Sparkles, Zap, Star, CreditCard, AlertCircle, Clock, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import PaymentIntegration from '../components/subscription/PaymentIntegration';

export default function Pricing() {
  const [user, setUser] = useState(null);
  const [subscription, setSubscription] = useState(null);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [billingCycle, setBillingCycle] = useState('yearly');
  const [trialExpired, setTrialExpired] = useState(false);
  const [daysLeft, setDaysLeft] = useState(null);

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const currentUser = await meldra.auth.me();
      setUser(currentUser);

      // Check subscription status
      const subs = await meldra.entities.Subscription.filter({ user_email: currentUser.email });
      if (subs.length > 0) {
        const sub = subs[0];
        setSubscription(sub);

        // Check if trial has expired
        if (sub.plan === 'free' && sub.trial_end_date) {
          const endDate = new Date(sub.trial_end_date);
          const now = new Date();
          const days = Math.ceil((endDate - now) / (1000 * 60 * 60 * 24));

          if (days <= 0) {
            setTrialExpired(true);
            setDaysLeft(0);
          } else {
            setDaysLeft(days);
          }
        } else if (sub.plan === 'free' && sub.trial_used) {
          // User has already used their trial
          setTrialExpired(true);
        }
      }
    } catch (error) {
      console.log('User not logged in');
    }
  };

  // Pricing tiers with different billing cycles
  const getPricing = (cycle) => {
    if (cycle === 'monthly') {
      return {
        monthly: 10,
        display: '$10',
        period: '/month',
        total: 'Billed monthly',
        savings: null
      };
    } else if (cycle === 'quarterly') {
      return {
        monthly: 9.5,
        display: '$9.50',
        period: '/month',
        total: '$28.50 billed quarterly',
        savings: '5% off'
      };
    } else {
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

  // Feature list for equal height cards
  const allFeatures = [
    { feature: 'File size limit', free: '10MB', premium: 'Unlimited (500MB)' },
    { feature: 'Transactions per month', free: '50', premium: 'Unlimited' },
    { feature: 'AI queries per day', free: '5', premium: 'Unlimited' },
    { feature: 'Chart types', free: '3 basic', premium: 'All 7 types' },
    { feature: 'Data cleaning tools', free: 'Basic', premium: 'Advanced' },
    { feature: 'Smart formula builder', free: false, premium: true },
    { feature: 'Export formats', free: 'CSV only', premium: 'Excel & CSV' },
    { feature: 'Import formats', free: '.CSV', premium: '.XLS, .XLSX, .CSV' },
    { feature: 'Priority support', free: false, premium: true },
  ];

  const handleSubscribe = (planId) => {
    if (planId === 'free') {
      if (trialExpired) {
        alert('Your 14-day free trial has expired. Please upgrade to Premium to continue.');
        return;
      }
      alert('You\'re already on the free trial!');
      return;
    }

    if (!user) {
      meldra.auth.redirectToLogin();
      return;
    }

    setSelectedPlan({ id: planId, ...pricing, billingCycle });
  };

  const handleStartTrial = async () => {
    if (!user) {
      meldra.auth.redirectToLogin();
      return;
    }

    if (trialExpired || (subscription && subscription.trial_used)) {
      alert('You have already used your 14-day free trial. Please upgrade to Premium to continue using Meldra.');
      return;
    }

    try {
      // Create or update subscription with trial
      const trialEndDate = new Date();
      trialEndDate.setDate(trialEndDate.getDate() + 14);

      await meldra.entities.Subscription.create({
        user_email: user.email,
        plan: 'free',
        status: 'trial',
        trial_end_date: trialEndDate.toISOString(),
        trial_used: true,
        ai_queries_used: 0,
        ai_queries_limit: 5,
        files_uploaded: 0
      });

      alert('Your 14-day free trial has started! Enjoy Meldra.');
      window.location.reload();
    } catch (error) {
      console.error('Error starting trial:', error);
      alert('Failed to start trial. Please try again.');
    }
  };

  return (
    <div className="min-h-screen py-12">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-12">
          <Badge className="mb-4 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-700/50">
            <Star className="w-4 h-4 mr-1" />
            Choose Your Plan
          </Badge>
          <h1 className="text-4xl md:text-5xl font-bold text-slate-900 dark:text-white mb-4">
            Simple, Transparent Pricing
          </h1>
          <p className="text-lg font-semibold meldra-text-gradient mb-2">
            Meldra
          </p>
          <p className="text-xl text-slate-600 dark:text-slate-300 max-w-2xl mx-auto mb-8">
            Start with a 14-day free trial, upgrade when you need more power
          </p>

          {/* Trial Expired Warning */}
          {trialExpired && (
            <Alert className="max-w-xl mx-auto mb-8 bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800/50">
              <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
              <AlertDescription className="text-red-700 dark:text-red-300">
                <strong>Trial Expired!</strong> Your 14-day free trial has ended. Please upgrade to Premium to continue using Meldra.
              </AlertDescription>
            </Alert>
          )}

          {/* Days Left Warning */}
          {daysLeft !== null && daysLeft > 0 && daysLeft <= 7 && (
            <Alert className="max-w-xl mx-auto mb-8 bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800/50">
              <Clock className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              <AlertDescription className="text-amber-700 dark:text-amber-300">
                <strong>Trial Ending Soon!</strong> You have {daysLeft} day{daysLeft !== 1 ? 's' : ''} left in your free trial.
              </AlertDescription>
            </Alert>
          )}

          {/* Billing Cycle Toggle */}
          <Tabs value={billingCycle} onValueChange={setBillingCycle} className="max-w-md mx-auto mb-8">
            <TabsList className="grid w-full grid-cols-3 bg-slate-100 dark:bg-slate-800">
              <TabsTrigger value="monthly" className="data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700">
                Monthly
              </TabsTrigger>
              <TabsTrigger value="quarterly" className="data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700">
                Quarterly
              </TabsTrigger>
              <TabsTrigger value="yearly" className="data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700">
                Yearly
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Pricing Cards - Equal Height */}
        <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
          {/* Free Trial Card */}
          <div className="relative h-full">
            <div className="meldra-card p-8 h-full flex flex-col">
              {/* Plan Header */}
              <div className="text-center mb-6">
                <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                  <Sparkles className="w-7 h-7 text-slate-600 dark:text-slate-400" />
                </div>
                <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Free Trial</h3>
                <div className="flex items-baseline justify-center gap-2">
                  <span className="text-4xl font-bold text-slate-900 dark:text-white">$0</span>
                </div>
                <p className="text-slate-500 dark:text-slate-400 mt-2">14 days, one-time only</p>
                <Badge className="mt-2 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-700/50">
                  <Clock className="w-3 h-3 mr-1" />
                  Limited Time
                </Badge>
              </div>

              {/* Features */}
              <ul className="space-y-3 mb-8 flex-grow">
                {allFeatures.map((item, idx) => (
                  <li key={idx} className="flex items-center justify-between gap-3 py-2 border-b border-slate-100 dark:border-slate-800 last:border-0">
                    <span className="text-slate-600 dark:text-slate-400 text-sm">{item.feature}</span>
                    <span className="text-slate-900 dark:text-white text-sm font-medium">
                      {item.free === true ? (
                        <Check className="w-5 h-5 text-emerald-500" />
                      ) : item.free === false ? (
                        <X className="w-5 h-5 text-slate-300 dark:text-slate-600" />
                      ) : (
                        item.free
                      )}
                    </span>
                  </li>
                ))}
              </ul>

              {/* CTA Button */}
              {trialExpired ? (
                <Button
                  disabled
                  className="w-full bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400 cursor-not-allowed"
                >
                  Trial Expired
                </Button>
              ) : subscription?.plan === 'free' ? (
                <Button
                  disabled
                  className="w-full bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400"
                >
                  {daysLeft ? `${daysLeft} Days Left` : 'Current Plan'}
                </Button>
              ) : (
                <Button
                  onClick={handleStartTrial}
                  className="w-full bg-slate-800 dark:bg-slate-700 hover:bg-slate-700 dark:hover:bg-slate-600 text-white"
                >
                  Start Free Trial
                </Button>
              )}

              <p className="text-xs text-center text-slate-500 dark:text-slate-400 mt-3">
                One-time trial per email address
              </p>
            </div>
          </div>

          {/* Premium Card */}
          <div className="relative h-full">
            {/* Popular Badge */}
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
              <Badge className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-4 py-1 shadow-lg">
                Most Popular
              </Badge>
            </div>

            <div className="meldra-card p-8 h-full flex flex-col border-purple-300 dark:border-purple-700 ring-2 ring-purple-500/20">
              {/* Plan Header */}
              <div className="text-center mb-6">
                <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center shadow-lg shadow-purple-500/30">
                  <Crown className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Premium</h3>
                <div className="flex items-baseline justify-center gap-2">
                  <span className="text-4xl font-bold meldra-text-gradient">{pricing.display}</span>
                  <span className="text-slate-500 dark:text-slate-400">{pricing.period}</span>
                </div>
                <p className="text-slate-500 dark:text-slate-400 mt-2">{pricing.total}</p>
                {pricing.savings && (
                  <Badge className="mt-2 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-700/50">
                    {pricing.savings}
                  </Badge>
                )}
              </div>

              {/* Features */}
              <ul className="space-y-3 mb-8 flex-grow">
                {allFeatures.map((item, idx) => (
                  <li key={idx} className="flex items-center justify-between gap-3 py-2 border-b border-slate-100 dark:border-slate-800 last:border-0">
                    <span className="text-slate-600 dark:text-slate-400 text-sm">{item.feature}</span>
                    <span className="text-slate-900 dark:text-white text-sm font-medium">
                      {item.premium === true ? (
                        <Check className="w-5 h-5 text-emerald-500" />
                      ) : item.premium === false ? (
                        <X className="w-5 h-5 text-slate-300 dark:text-slate-600" />
                      ) : (
                        item.premium
                      )}
                    </span>
                  </li>
                ))}
              </ul>

              {/* CTA Button */}
              <Button
                onClick={() => handleSubscribe('premium')}
                className="w-full meldra-button-primary"
              >
                <CreditCard className="w-4 h-4 mr-2" />
                {subscription?.plan === 'premium' ? 'Current Plan' : 'Upgrade to Premium'}
              </Button>

              <p className="text-xs text-center text-slate-500 dark:text-slate-400 mt-3">
                Cancel anytime • 30-day money-back guarantee
              </p>
            </div>
          </div>
        </div>

        {/* Payment Modal */}
        {selectedPlan && (
          <div className="fixed inset-0 bg-black/50 dark:bg-black/80 flex items-center justify-center z-50 p-4">
            <div className="meldra-card p-8 max-w-md w-full">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">
                Upgrade to Premium
              </h2>
              <p className="text-slate-700 dark:text-slate-300 mb-2">
                {selectedPlan.display}{selectedPlan.period}
              </p>
              <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">
                {selectedPlan.total}
                {selectedPlan.billingCycle === 'yearly' && (
                  <span className="block text-emerald-600 dark:text-emerald-400 mt-1">
                    ✓ Save 10% with annual billing
                  </span>
                )}
              </p>

              <PaymentIntegration
                plan="premium"
                amount={selectedPlan.monthly}
                billingCycle={selectedPlan.billingCycle}
                onSuccess={() => {
                  setSelectedPlan(null);
                  alert('Subscription successful! Welcome to Meldra Premium.');
                  window.location.reload();
                }}
              />

              <Button
                onClick={() => setSelectedPlan(null)}
                variant="outline"
                className="w-full mt-4 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300"
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Why Upgrade Section */}
        <div className="mt-16 max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white text-center mb-8">
            Why upgrade to Premium?
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="meldra-card p-6 text-center">
              <Zap className="w-10 h-10 text-purple-500 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Unlimited Everything</h3>
              <p className="text-slate-600 dark:text-slate-400 text-sm">
                No file size limits, unlimited transactions, unlimited AI queries
              </p>
            </div>
            <div className="meldra-card p-6 text-center">
              <Crown className="w-10 h-10 text-purple-500 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Excel Support</h3>
              <p className="text-slate-600 dark:text-slate-400 text-sm">
                Import .XLS, .XLSX files directly. Export to Excel format
              </p>
            </div>
            <div className="meldra-card p-6 text-center">
              <Star className="w-10 h-10 text-purple-500 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Save More</h3>
              <p className="text-slate-600 dark:text-slate-400 text-sm">
                Get 5% off quarterly, 10% off yearly billing
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
