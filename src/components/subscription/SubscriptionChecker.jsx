// components/subscription/SubscriptionChecker.jsx - Meldra - Works without mandatory login
import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/meldraClient';
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
      const currentUser = await base44.auth.me();
      setUser(currentUser);

      let userSub = await base44.entities.Subscription.filter({
        user_email: currentUser.email
      });

      if (userSub.length === 0) {
        // Create free plan subscription for new users
        const newSub = await base44.entities.Subscription.create({
          user_email: currentUser.email,
          plan: 'free',
          status: 'active',
          ai_queries_used: 0,
          ai_queries_limit: 5,
          files_uploaded: 0
        });
        setSubscription(newSub);
      } else {
        setSubscription(userSub[0]);

        // Calculate days left for trial users
        if (userSub[0].trial_end_date) {
          const endDate = new Date(userSub[0].trial_end_date);
          const now = new Date();
          const days = Math.ceil((endDate - now) / (1000 * 60 * 60 * 24));
          setDaysLeft(Math.max(0, days));
        }
      }
    } catch (error) {
      // User not logged in - that's okay for testing
      console.log('User not logged in - showing free plan UI');
      setSubscription({ plan: 'free', status: 'active', ai_queries_used: 0, files_uploaded: 0 });
    }
    setLoading(false);
  };

  const getFileSizeLimit = () => {
    return subscription?.plan === 'premium' ? 500 : 10;
  };

  const getTransactionLimit = () => {
    return subscription?.plan === 'premium' ? 999999 : 50;
  };

  const getAIQueryLimit = () => {
    return subscription?.plan === 'premium' ? 999999 : 5;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-purple-50/30 to-slate-50 dark:from-slate-950 dark:via-purple-950/20 dark:to-slate-950">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500" />
          <p className="text-slate-600 dark:text-slate-400">Loading Meldra...</p>
        </div>
      </div>
    );
  }

  const transactionUsage = ((subscription?.files_uploaded || 0) / getTransactionLimit()) * 100;
  const aiQueryUsage = ((subscription?.ai_queries_used || 0) / getAIQueryLimit()) * 100;

  return (
    <>
      {/* Trial Expiration Warning */}
      {subscription?.status === 'trial' && daysLeft !== null && daysLeft <= 7 && (
        <Alert className="mb-4 mx-4 bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/30">
          <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
          <AlertDescription className="text-slate-700 dark:text-slate-300">
            <strong className="text-amber-700 dark:text-amber-300">Trial Ending Soon!</strong> Your free trial expires in {daysLeft} day{daysLeft !== 1 ? 's' : ''}.
            <Link to={createPageUrl('Pricing')}>
              <Button size="sm" className="ml-4 bg-amber-600 hover:bg-amber-700 text-white">
                Upgrade Now
              </Button>
            </Link>
          </AlertDescription>
        </Alert>
      )}

      {/* Subscription Info Bar - Meldra Styled */}
      <div className="sticky top-16 z-40 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-purple-200/50 dark:border-purple-800/30 shadow-sm">
        <div className="container mx-auto px-4 py-3">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-6 text-sm">
              {/* Plan Badge */}
              <div className="flex items-center gap-2">
                {subscription?.plan === 'premium' ? (
                  <Crown className="w-4 h-4 text-amber-500" />
                ) : (
                  <Zap className="w-4 h-4 text-purple-500" />
                )}
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {subscription?.plan === 'premium' ? 'Premium Plan' : 'Free Plan'}
                </span>
              </div>

              {/* File Size Limit */}
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-slate-400" />
                <span className="text-slate-600 dark:text-slate-400">
                  File Size: <strong className="text-slate-800 dark:text-slate-200">{getFileSizeLimit()}MB</strong>
                </span>
              </div>

              {/* Transaction Usage */}
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${
                  transactionUsage >= 90 ? 'bg-red-500' :
                  transactionUsage >= 70 ? 'bg-amber-500' :
                  'bg-emerald-500'
                } animate-pulse`} />
                <span className="text-slate-600 dark:text-slate-400">
                  Transactions: <strong className={`${
                    transactionUsage >= 90 ? 'text-red-500' :
                    transactionUsage >= 70 ? 'text-amber-500' :
                    'text-slate-800 dark:text-slate-200'
                  }`}>
                    {subscription?.files_uploaded || 0}/{getTransactionLimit()}
                  </strong>
                </span>
              </div>

              {/* AI Query Usage */}
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${
                  aiQueryUsage >= 90 ? 'bg-red-500' :
                  aiQueryUsage >= 70 ? 'bg-amber-500' :
                  'bg-emerald-500'
                } animate-pulse`} />
                <span className="text-slate-600 dark:text-slate-400">
                  AI Queries: <strong className={`${
                    aiQueryUsage >= 90 ? 'text-red-500' :
                    aiQueryUsage >= 70 ? 'text-amber-500' :
                    'text-slate-800 dark:text-slate-200'
                  }`}>
                    {subscription?.ai_queries_used || 0}/{getAIQueryLimit()}
                  </strong>
                </span>
              </div>
            </div>

            {/* Upgrade Button (only for free users) */}
            {subscription?.plan !== 'premium' && (
              <Link to={createPageUrl('Pricing')}>
                <Button size="sm" className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white shadow-lg shadow-purple-500/30">
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
