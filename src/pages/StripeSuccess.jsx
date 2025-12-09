// pages/StripeSuccess.jsx - Stripe payment success handler (FIXED IMPORTS)
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/meldraClient';
import { CheckCircle, Loader2, Sparkles, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function StripeSuccess() {
  const navigate = useNavigate();
  const [processing, setProcessing] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    handlePaymentSuccess();
  }, []);

  const handlePaymentSuccess = async () => {
    try {
      // Get URL parameters
      const urlParams = new URLSearchParams(window.location.search);
      const sessionId = urlParams.get('session_id');
      
      const currentUser = await base44.auth.me();

      // Find pending subscription
      const subscriptions = await base44.entities.Subscription.filter({
        user_email: currentUser.email,
        payment_status: 'pending'
      });

      if (subscriptions.length > 0) {
        const subscription = subscriptions[0];
        
        // Update subscription to active
        await base44.entities.Subscription.update(subscription.id, {
          status: 'active',
          payment_status: 'paid',
          subscription_start_date: new Date().toISOString(),
          subscription_end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          payment_method: 'stripe',
          transaction_id: sessionId || 'manual',
          max_file_size_mb: subscription.plan === 'premium' ? 100 : 500,
          transactions_limit: subscription.plan === 'premium' ? 1000 : 999999,
          ai_queries_limit: subscription.plan === 'premium' ? 500 : 999999
        });

        // Send welcome email
        try {
          await base44.integrations.Core.SendEmail({
            to: currentUser.email,
            from_name: 'InsightSheet-lite',
            subject: '🎉 Welcome to InsightSheet Premium!',
            body: `Hi ${currentUser.full_name || 'there'},

Thank you for subscribing to InsightSheet-lite ${subscription.plan}!

Your benefits:
- Unlimited file size
- Unlimited transactions
- Unlimited AI queries
- Advanced features
- Priority support

Get started: ${window.location.origin}${createPageUrl('Dashboard')}

Questions? Reply to this email anytime.

Best,
InsightSheet-lite Team`
          });
        } catch (emailError) {
          console.error('Error sending welcome email:', emailError);
        }

        setProcessing(false);
        
        // Redirect to dashboard after 3 seconds
        setTimeout(() => {
          navigate(createPageUrl('Dashboard'));
        }, 3000);
      } else {
        throw new Error('No pending subscription found');
      }

    } catch (err) {
      console.error('Payment success handler error:', err);
      setError('Error activating subscription. Please contact support.');
      setProcessing(false);
    }
  };

  if (processing) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-16 h-16 text-purple-500 animate-spin mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">Activating Your Subscription...</h2>
          <p className="text-slate-400">Please wait while we set up your account</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 flex items-center justify-center p-4">
        <div className="bg-slate-900/80 backdrop-blur-xl border border-red-500/30 rounded-2xl p-8 max-w-md text-center">
          <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <XCircle className="w-8 h-8 text-red-400" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Activation Error</h2>
          <p className="text-slate-300 mb-6">{error}</p>
          <Button onClick={() => navigate(createPageUrl('Pricing'))}>
            Back to Pricing
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 flex items-center justify-center p-4">
      <div className="bg-slate-900/80 backdrop-blur-xl border border-emerald-500/30 rounded-2xl p-8 max-w-md text-center">
        <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="w-10 h-10 text-emerald-400" />
        </div>
        <h1 className="text-3xl font-bold text-white mb-2">🎉 Payment Successful!</h1>
        <p className="text-slate-300 mb-6">
          Your subscription is now active. Redirecting you to the dashboard...
        </p>
        <div className="flex items-center justify-center gap-2 text-purple-400">
          <Sparkles className="w-5 h-5" />
          <span className="font-semibold">All premium features unlocked</span>
        </div>
      </div>
    </div>
  );
}