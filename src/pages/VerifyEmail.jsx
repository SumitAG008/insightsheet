// pages/VerifyEmail.jsx - Email verification page
import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, XCircle, Loader2, Mail } from 'lucide-react';
import { backendApi } from '@/api/backendClient';

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('verifying'); // verifying, success, error, expired
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');

  useEffect(() => {
    const token = searchParams.get('token');
    
    if (!token) {
      setStatus('error');
      setMessage('No verification token provided. Please check your email for the verification link.');
      return;
    }

    // Verify email
    verifyEmail(token);
  }, [searchParams]);

  const verifyEmail = async (token) => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8001'}/api/auth/verify-email?token=${token}`);
      const data = await response.json();

      if (response.ok) {
        setStatus('success');
        setMessage(data.message || 'Email verified successfully!');
        setEmail(data.email || '');
        
        // Redirect to login after 3 seconds
        setTimeout(() => {
          navigate('/login');
        }, 3000);
      } else {
        setStatus('error');
        setMessage(data.detail || 'Verification failed. The link may be invalid or expired.');
        
        if (data.detail && data.detail.includes('expired')) {
          setStatus('expired');
        }
      }
    } catch (error) {
      console.error('Verification error:', error);
      setStatus('error');
      setMessage('Failed to verify email. Please try again or contact support.');
    }
  };

  const resendVerification = async () => {
    if (!email) {
      setMessage('Please enter your email address to resend the verification link.');
      return;
    }

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8001'}/api/auth/resend-verification`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (response.ok) {
        setStatus('success');
        setMessage(data.message || 'Verification email sent! Please check your inbox.');
      } else {
        setMessage(data.detail || 'Failed to resend verification email.');
      }
    } catch (error) {
      console.error('Resend verification error:', error);
      setMessage('Failed to resend verification email. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-slate-900/80 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-8 shadow-xl">
        <div className="text-center mb-6">
          <div className="flex justify-center mb-4">
            {status === 'verifying' && (
              <Loader2 className="w-16 h-16 text-purple-400 animate-spin" />
            )}
            {status === 'success' && (
              <CheckCircle className="w-16 h-16 text-emerald-400" />
            )}
            {(status === 'error' || status === 'expired') && (
              <XCircle className="w-16 h-16 text-red-400" />
            )}
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">
            {status === 'verifying' && 'Verifying Email...'}
            {status === 'success' && 'Email Verified!'}
            {(status === 'error' || status === 'expired') && 'Verification Failed'}
          </h1>
        </div>

        <Alert
          className={`mb-6 ${
            status === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30'
              : status === 'error' || status === 'expired'
              ? 'bg-red-500/10 border-red-500/30'
              : 'bg-blue-500/10 border-blue-500/30'
          }`}
        >
          <AlertDescription className="text-slate-300">
            {status === 'verifying' && 'Please wait while we verify your email address...'}
            {status === 'success' && message}
            {(status === 'error' || status === 'expired') && message}
          </AlertDescription>
        </Alert>

        {status === 'success' && (
          <div className="text-center">
            <p className="text-slate-400 mb-4">
              Redirecting to login page in 3 seconds...
            </p>
            <Link to="/login">
              <Button className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700">
                Go to Login
              </Button>
            </Link>
          </div>
        )}

        {(status === 'error' || status === 'expired') && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                className="w-full px-4 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <Button
              onClick={resendVerification}
              className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
            >
              <Mail className="w-4 h-4 mr-2" />
              Resend Verification Email
            </Button>
            <Link to="/login" className="block text-center">
              <Button variant="outline" className="w-full border-slate-700 text-slate-300">
                Back to Login
              </Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
