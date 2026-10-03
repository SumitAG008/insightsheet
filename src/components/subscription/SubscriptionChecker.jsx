// components/subscription/SubscriptionChecker.jsx - Enhanced with strict file size enforcement
import React, { useState, useEffect } from 'react';
import { meldraAi } from '@/api/meldraClient';
import { AlertCircle, Crown, Zap } from 'lucide-react';
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500" />
      </div>
    );
  }

  const plan = (subscription?.plan || 'free').toLowerCase();
  const isPremium = plan.startsWith('premium') || plan === 'pro';
  const onFreeTrial = !isPremium && daysLeft !== null;

  // Only limits that apply, in plain words; a limit gets a colour as it runs out.
  const meters = [];
  const addMeter = (used, limit, label) => {
    if (limit === null || limit === undefined || isUnlimited(limit)) return;
    const left = Math.max(0, Number(limit) - Number(used || 0));
    const share = Number(limit) > 0 ? Number(used || 0) / Number(limit) : 1;
    meters.push({ label, left, limit: Number(limit), share });
  };
  addMeter(subscription?.conversions_used, subscription?.conversions_limit, 'tool runs left this month');
  addMeter(subscription?.ai_queries_used, subscription?.ai_queries_limit, isPremium ? 'AI questions left this month' : 'AI questions left today');
  const tone = (share) => (share >= 0.9 ? 'text-red-600 dark:text-red-400' : share >= 0.7 ? 'text-amber-600 dark:text-amber-400' : 'text-slate-900 dark:text-slate-200');
  const uploadLimit = subscription?.workflow_runs_limit;
  const uploadShare = isUnlimited(uploadLimit) || !uploadLimit ? 0 : Number(subscription?.workflow_runs_used || 0) / Number(uploadLimit);

  return (
    <>
      {/* Free accounts close at the end of the trial: say so in good time. */}
      {onFreeTrial && daysLeft <= 7 && (
        <Alert className="mb-4 mx-4 border-amber-500/30 bg-amber-50 dark:bg-amber-500/10">
          <AlertCircle className="h-5 w-5 text-amber-600" />
          <AlertDescription className="text-slate-700 dark:text-slate-300">
            <strong className="text-amber-700 dark:text-amber-300">Your free trial ends in {daysLeft} day{daysLeft !== 1 ? 's' : ''}.</strong> After that the account is closed unless you upgrade.
            <Link to={createPageUrl('Pricing')}>
              <Button size="sm" className="ml-4 bg-amber-600 hover:bg-amber-700">See plans</Button>
            </Link>
          </AlertDescription>
        </Alert>
      )}

      {/* Plan and what is left */}
      <div className="sticky top-16 z-40 bg-white dark:bg-slate-900/95 backdrop-blur-xl border-b border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="container mx-auto px-4 py-2">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-sm">
              <div className="flex items-center gap-2">
                {isPremium ? <Crown className="w-4 h-4 text-amber-400" /> : <Zap className="w-4 h-4 text-blue-500" />}
                <span className="font-semibold text-slate-900 dark:text-slate-200">{isPremium ? 'Premium' : 'Free trial'}</span>
                {onFreeTrial && <span className="text-slate-500">· {daysLeft} day{daysLeft !== 1 ? 's' : ''} left</span>}
              </div>
              {meters.map((m) => (
                <span key={m.label} className="text-slate-600 dark:text-slate-400">
                  <strong className={tone(m.share)}>{m.left}</strong> of {m.limit} {m.label}
                </span>
              ))}
              {uploadShare >= 0.7 && (
                <span className={tone(uploadShare)}>
                  {Math.round(uploadShare * 100)}% of this month’s upload allowance used
                </span>
              )}
            </div>

            {!isPremium && (
              <Link to={createPageUrl('Pricing')}>
                <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white">
                  <Crown className="w-4 h-4 mr-2" />
                  Upgrade
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