// components/subscription/SubscriptionChecker.jsx - Meldra - 14-day Trial Enforcement
import React, { useState, useEffect } from 'react';
import { backendApi } from '@/api/backendClient';
import { AlertCircle, Crown, Zap, Lock, Clock } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function SubscriptionChecker({ children }) {
  const [user, setUser] = useState(null);
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [daysLeft, setDaysLeft] = useState(null);
  const [trialExpired, setTrialExpired] = useState(false);

  useEffect(() => {
    checkSubscription();
  }, []);

  const checkSubscription = async () => {
    try {
      // Check if user is authenticated first
      if (!backendApi.auth.isAuthenticated()) {
        // User not logged in - show guest UI
        setSubscription({ plan: 'guest', status: 'guest' });
        setLoading(false);
        return;
      }

      const currentUser = await backendApi.auth.me();
      setUser(currentUser);

      // Get subscription from backend
      const sub = await backendApi.subscriptions.getMy();
      setSubscription(sub);

      // Check trial status
      if (sub.plan === 'free' || sub.status === 'trial') {
        if (sub.trial_end_date) {
          const endDate = new Date(sub.trial_end_date);
          const now = new Date();
          const days = Math.ceil((endDate - now) / (1000 * 60 * 60 * 24));

          if (days <= 0) {
            setTrialExpired(true);
            setDaysLeft(0);
          } else {
            setDaysLeft(days);
          }
        } else if (sub.trial_used) {
          // Trial was used but no end date - treat as expired
          setTrialExpired(true);
        }
      }
    } catch (error) {
      // User not logged in or error - show guest UI
      console.log('User not logged in - showing guest UI');
      setSubscription({ plan: 'guest', status: 'guest' });
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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-blue-950/20 to-slate-950">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500" />
          <p className="text-slate-400">Loading...</p>
        </div>
      </div>
    );
  }

  // Trial Expired - Block access and show upgrade prompt
  if (trialExpired && subscription?.plan !== 'premium') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-blue-950/20 to-slate-950 p-4">
        <div className="bg-slate-900/80 backdrop-blur-xl border border-blue-500/30 rounded-2xl p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-red-900/30 flex items-center justify-center">
            <Clock className="w-8 h-8 text-red-500" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-4">
            Free Trial Expired
          </h2>
          <p className="text-slate-400 mb-6">
            Your 14-day free trial has ended. Upgrade to Premium to continue using InsightSheet's powerful data intelligence features.
          </p>
          <Link to={createPageUrl('Pricing')}>
            <Button className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white mb-4">
              <Crown className="w-4 h-4 mr-2" />
              Upgrade to Premium
            </Button>
          </Link>
          <p className="text-xs text-slate-500">
            Only one free trial per email address is allowed.
          </p>
        </div>
      </div>
    );
  }

  // Guest mode - don't show subscription bar
  if (subscription?.plan === 'guest') {
    return <>{children}</>;
  }

  const transactionUsage = ((subscription?.files_uploaded || 0) / getTransactionLimit()) * 100;
  const aiQueryUsage = ((subscription?.ai_queries_used || 0) / getAIQueryLimit()) * 100;

  return (
    <>
      {/* Trial Expiration Warning */}
      {daysLeft !== null && daysLeft > 0 && daysLeft <= 7 && subscription?.plan !== 'premium' && (
        <Alert className="mx-4 mt-4 bg-amber-900/20 border-amber-500/30">
          <Clock className="h-5 w-5 text-amber-400" />
          <AlertDescription className="text-amber-300">
            <strong>Trial Ending Soon!</strong> Your free trial expires in {daysLeft} day{daysLeft !== 1 ? 's' : ''}.
            <Link to={createPageUrl('Pricing')}>
              <Button size="sm" className="ml-4 bg-amber-600 hover:bg-amber-700 text-white">
                Upgrade Now
              </Button>
            </Link>
          </AlertDescription>
        </Alert>
      )}

      {/* Subscription Info Bar */}
      <div className="sticky top-16 z-40 bg-slate-900/80 backdrop-blur-xl border-b border-blue-800/30 shadow-sm">
        <div className="container mx-auto px-4 py-3">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-6 text-sm">
              {/* Plan Badge */}
              <div className="flex items-center gap-2">
                {subscription?.plan === 'premium' ? (
                  <Crown className="w-4 h-4 text-amber-500" />
                ) : (
                  <Zap className="w-4 h-4 text-blue-500" />
                )}
                <span className="font-semibold text-slate-200">
                  {subscription?.plan === 'premium' ? 'Premium Plan' :
                   daysLeft ? `Free Trial (${daysLeft} days left)` : 'Free Plan'}
                </span>
              </div>

              {/* File Size Limit */}
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-slate-400" />
                <span className="text-slate-400">
                  File Size: <strong className="text-slate-200">{getFileSizeLimit()}MB</strong>
                </span>
              </div>

              {/* Transaction Usage */}
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${
                  transactionUsage >= 90 ? 'bg-red-500' :
                  transactionUsage >= 70 ? 'bg-amber-500' :
                  'bg-emerald-500'
                } animate-pulse`} />
                <span className="text-slate-400">
                  Transactions: <strong className={`${
                    transactionUsage >= 90 ? 'text-red-500' :
                    transactionUsage >= 70 ? 'text-amber-500' :
                    'text-slate-200'
                  }`}>
                    {subscription?.files_uploaded || 0}/{getTransactionLimit() === 999999 ? '∞' : getTransactionLimit()}
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
                <span className="text-slate-400">
                  AI Queries: <strong className={`${
                    aiQueryUsage >= 90 ? 'text-red-500' :
                    aiQueryUsage >= 70 ? 'text-amber-500' :
                    'text-slate-200'
                  }`}>
                    {subscription?.ai_queries_used || 0}/{getAIQueryLimit() === 999999 ? '∞' : getAIQueryLimit()}
                  </strong>
                </span>
              </div>
            </div>

            {/* Upgrade Button (only for non-premium users) */}
            {subscription?.plan !== 'premium' && (
              <Link to={createPageUrl('Pricing')}>
                <Button size="sm" className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg shadow-blue-500/30">
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
