// components/subscription/PaymentIntegration.jsx - Fixed with setup detection
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { CreditCard, Loader2, CheckCircle, AlertCircle, ExternalLink } from 'lucide-react';
import { meldraAi } from '@/api/meldraClient';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function PaymentIntegration({ plan, amount, onSuccess }) {
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');

  // ⚠️ REPLACE THESE WITH YOUR REAL STRIPE PAYMENT LINKS
  // Get them from: https://dashboard.stripe.com/payment-links
  const STRIPE_PAYMENT_LINKS = {
    premium: 'https://buy.stripe.com/test_YOUR_PREMIUM_LINK', // ⬅️ REPLACE THIS
    business: 'https://buy.stripe.com/test_YOUR_BUSINESS_LINK' // ⬅️ REPLACE THIS
  };

  // Check if Stripe is configured
  const isStripeConfigured = () => {
    const link = STRIPE_PAYMENT_LINKS[plan];
    return link && !link.includes('YOUR_PREMIUM_LINK') && !link.includes('YOUR_BUSINESS_LINK');
  };

  const handlePayment = async () => {
    // Check if Stripe is configured
    if (!isStripeConfigured()) {
      alert('⚠️ Stripe not configured yet!\n\nAdmin: Please set up Stripe Payment Links first.\n\nSee the setup guide below or contact support.');
      return;
    }

    setProcessing(true);
    setError('');

    try {
      const currentUser = await meldraAi.auth.me();

      // Get Stripe payment link
      const paymentLink = STRIPE_PAYMENT_LINKS[plan];
      
      if (!paymentLink) {
        throw new Error('Invalid plan selected');
      }

      // Redirect to Stripe Checkout with user info pre-filled
      const checkoutUrl = `${paymentLink}?client_reference_id=${currentUser.email}&prefilled_email=${currentUser.email}`;
      
      // Save pending subscription
      await meldraAi.entities.Subscription.create({
        user_email: currentUser.email,
        plan: plan,
        status: 'pending',
        payment_status: 'pending',
        amount_paid: amount,
        trial_start_date: new Date().toISOString()
      });

      // Redirect to Stripe
      window.location.href = checkoutUrl;

    } catch (err) {
      console.error('Payment error:', err);
      setError('Payment initialization failed. Please try again.');
      setProcessing(false);
    }
  };

  return (
    <div>
      <Button
        onClick={handlePayment}
        disabled={processing}
        className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold py-3 text-lg"
      >
        {processing ? (
          <>
            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
            Redirecting to Stripe...
          </>
        ) : (
          <>
            <CreditCard className="w-5 h-5 mr-2" />
            Subscribe for ${amount}/month
          </>
        )}
      </Button>

      {error && (
        <p className="text-red-400 text-sm mt-2">{error}</p>
      )}

      {!isStripeConfigured() && (
        <Alert className="mt-4 bg-amber-500/10 border-amber-500/30">
          <AlertCircle className="h-4 w-4 text-amber-400" />
          <AlertDescription className="text-amber-200 text-xs">
            <strong>Admin Setup Required:</strong> Stripe payment links not configured yet.
            <br />
            <a href="#stripe-setup" className="underline">View setup guide below</a>
          </AlertDescription>
        </Alert>
      )}

      <div className="mt-4 text-xs text-slate-400 text-center">
        <CheckCircle className="w-3 h-3 inline mr-1" />
        Secure payment powered by Stripe
      </div>

      {/* Stripe Setup Instructions (Only shown if not configured) */}
      {!isStripeConfigured() && (
        <div id="stripe-setup" className="mt-6 p-4 bg-slate-800/50 rounded-lg border border-amber-500/30">
          <h3 className="text-sm font-bold text-amber-300 mb-3">🔧 Stripe Setup Guide (Admin Only)</h3>
          
          <div className="space-y-3 text-xs text-slate-300">
            <div className="flex gap-2">
              <span className="font-bold text-amber-400">1.</span>
              <div>
                <strong>Create Stripe Account:</strong>
                <br />
                <a 
                  href="https://dashboard.stripe.com/register" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-400 underline flex items-center gap-1 mt-1"
                >
                  Sign up at stripe.com <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>

            <div className="flex gap-2">
              <span className="font-bold text-amber-400">2.</span>
              <div>
                <strong>Create Payment Links:</strong>
                <br />
                Go to: <code className="text-purple-300">Stripe Dashboard → Products → Create Product</code>
                <ul className="list-disc list-inside ml-4 mt-1 space-y-1">
                  <li>Premium Plan: $9.99/month (recurring)</li>
                  <li>Business Plan: $29.99/month (recurring)</li>
                </ul>
              </div>
            </div>

            <div className="flex gap-2">
              <span className="font-bold text-amber-400">3.</span>
              <div>
                <strong>Create Payment Links:</strong>
                <br />
                For each product: <code className="text-purple-300">Product → Create payment link</code>
                <ul className="list-disc list-inside ml-4 mt-1 space-y-1">
                  <li>Enable: "Collect customer emails"</li>
                  <li>Success URL: <code className="text-green-300">{window.location.origin}/StripeSuccess?session_id={'{'}{'{'}CHECKOUT_SESSION_ID{'}'}{'}'}                  </code></li>
                </ul>
              </div>
            </div>

            <div className="flex gap-2">
              <span className="font-bold text-amber-400">4.</span>
              <div>
                <strong>Copy Payment Links:</strong>
                <br />
                You'll get URLs like: <code className="text-blue-300">https://buy.stripe.com/test_...</code>
                <br />
                <span className="text-amber-300 mt-1 block">⚠️ Contact developer to add these links to the code</span>
              </div>
            </div>

            <div className="flex gap-2">
              <span className="font-bold text-amber-400">5.</span>
              <div>
                <strong>Set up Webhook (Important!):</strong>
                <br />
                <code className="text-purple-300">Stripe Dashboard → Developers → Webhooks → Add endpoint</code>
                <br />
                <span className="text-xs text-slate-400">Webhook URL: (contact developer for setup)</span>
              </div>
            </div>
          </div>

          <Alert className="mt-4 bg-blue-500/10 border-blue-500/30">
            <AlertCircle className="h-4 w-4 text-blue-400" />
            <AlertDescription className="text-blue-200 text-xs">
              <strong>Need help?</strong> Send your Stripe payment links to: sumit@meldra.ai
            </AlertDescription>
          </Alert>
        </div>
      )}
    </div>
  );
}