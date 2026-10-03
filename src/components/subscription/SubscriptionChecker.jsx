// components/subscription/SubscriptionChecker.jsx - Enhanced with strict file size enforcement
import React, { useState, useEffect } from 'react';
import { meldraAi } from '@/api/meldraClient';
import { AlertCircle, Crown, Zap, Lock } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function SubscriptionChecker({ children }) {
  const [user, setUser] = useState(null);
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [daysLeft, setDaysLeft] = useState(null);

  useEffect(() => {
    checkSubscription();
  }, []);

  const checkSubscription = async () => {
    try {
      const currentUser = await meldraAi.auth.me();
      setUser(currentUser);

      const mySub = await meldraAi.subscriptions.getMy();
      setSubscription(mySub);

      if (mySub?.trial_end_date) {
        const endDate = new Date(mySub.trial_end_date);
        const now = new Date();
        const days = Math.ceil((endDate - now) / (1000 * 60 * 60 * 24));
        setDaysLeft(Math.max(0, days));
      }
    } catch (error) {
      // User not authenticated - this is expected for public pages
      // Only log if it's not an authentication error
      if (!error.message || !error.message.includes('Not authenticated') && !error.message.includes('Unauthorized')) {
        console.error('Error checking subscription:', error);
      }
      setUser(null);
      setSubscription(null);
    }
    setLoading(false);
  };

  const isUnlimited = (v) => v === -1 || v === 999999;
  const formatLimit = (v) => (isUnlimited(v) ? 'Unlimited' : v);

  const bytesToMb = (b) => {
    const n = Number(b || 0);
    return n / (1024 * 1024);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500" />
      </div>
    );
  }

  const plan = (subscription?.plan || 'free').toLowerCase();
  const planName = subscription?.plan_name || (plan === 'premium' ? 'Premium' : 'Free');
  const orgName = subscription?.limits_source === 'organization' ? subscription?.organization?.name : null;

  const tokensUsed = Number(subscription?.ai_queries_used || 0);
  const tokensLimit = subscription?.ai_queries_limit;
  const tokenUsage = isUnlimited(tokensLimit) ? 0 : ((tokensUsed / Number(tokensLimit || 1)) * 100);

  const uploadBytesUsed = Number(subscription?.workflow_runs_used || 0);
  const uploadBytesLimit = subscription?.workflow_runs_limit;
  const uploadUsage = isUnlimited(uploadBytesLimit) ? 0 : ((uploadBytesUsed / Number(uploadBytesLimit || 1)) * 100);

  const txUsed = Number(subscription?.conversions_used || 0);
  const txLimit = subscription?.conversions_limit;
  const txUsage = isUnlimited(txLimit) ? 0 : ((txUsed / Number(txLimit || 1)) * 100);

  return (
    <>
      {/* Trial Expiration Warning */}
      {subscription?.status === 'trial' && daysLeft !== null && daysLeft <= 7 && (
        <Alert className="mb-4 mx-4 bg-amber-500/10 border-amber-500/30">
          <AlertCircle className="h-5 w-5 text-amber-400" />
          <AlertDescription className="text-slate-300">
            <strong className="text-amber-300">Trial Ending Soon!</strong> Your free trial expires in {daysLeft} day{daysLeft !== 1 ? 's' : ''}.
            <Link to={createPageUrl('Pricing')}>
              <Button size="sm" className="ml-4 bg-amber-600 hover:bg-amber-700">
                Upgrade Now
              </Button>
            </Link>
          </AlertDescription>
        </Alert>
      )}

      {/* Subscription Info Bar */}
      <div className="sticky top-16 z-40 bg-white dark:bg-slate-900/95 backdrop-blur-xl border-b border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="container mx-auto px-4 py-3">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-6 text-sm">
              {/* Plan Badge */}
              <div className="flex items-center gap-2">
                {plan === 'premium' ? (
                  <Crown className="w-4 h-4 text-amber-400" />
                ) : (
                  <Zap className="w-4 h-4 text-purple-400" />
                )}
                <Link to={createPageUrl('Usage')} className="font-semibold text-slate-900 dark:text-slate-200 hover:underline">
                  {planName} Plan{orgName ? ` · ${orgName}` : ''}
                </Link>
              </div>

              {/* Upload Used */}
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                <span className="text-slate-600 dark:text-slate-400">
                  Uploads this month: <strong className="text-slate-900 dark:text-slate-200">
                    {bytesToMb(uploadBytesUsed).toFixed(1)}MB/{isUnlimited(uploadBytesLimit) ? 'Unlimited' : `${bytesToMb(uploadBytesLimit).toFixed(0)}MB`}
                  </strong>
                </span>
              </div>

              {/* Transaction Usage */}
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${
                  txUsage >= 90 ? 'bg-red-500' : 
                  txUsage >= 70 ? 'bg-amber-500' : 
                  'bg-emerald-500'
                } animate-pulse`} />
                <span className="text-slate-600 dark:text-slate-400">
                  Conversions: <strong className={`$${
                    txUsage >= 90 ? 'text-red-600 dark:text-red-400' : 
                    txUsage >= 70 ? 'text-amber-600 dark:text-amber-400' : 
                    'text-slate-900 dark:text-slate-200'
                  }`}>
                    {txUsed}/{formatLimit(txLimit)}
                  </strong>
                </span>
              </div>

              {/* AI questions this month */}
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${
                  tokenUsage >= 90 ? 'bg-red-500' : 
                  tokenUsage >= 70 ? 'bg-amber-500' : 
                  'bg-emerald-500'
                } animate-pulse`} />
                <span className="text-slate-600 dark:text-slate-400">
                  AI questions: <strong className={`$${
                    tokenUsage >= 90 ? 'text-red-600 dark:text-red-400' : 
                    tokenUsage >= 70 ? 'text-amber-600 dark:text-amber-400' : 
                    'text-slate-900 dark:text-slate-200'
                  }`}>
                    {tokensUsed}/{formatLimit(tokensLimit)}
                  </strong>
                </span>
              </div>
            </div>

            {/* Upgrade Button (only for free users) */}
            {plan !== 'premium' && (
              <Link to={createPageUrl('Pricing')}>
                <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white">
                  <Crown className="w-4 h-4 mr-2" />
                  Upgrade to Premium
                </Button>
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      {children}
    </>
  );
}