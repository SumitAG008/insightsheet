import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Mail, Loader2 } from 'lucide-react';
import { backendApi } from '@/api/backendClient';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [resetUrl, setResetUrl] = useState(''); // For development only

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');
    setResetUrl('');

    try {
      const result = await backendApi.auth.forgotPassword(email);
      setMessage(result.message);

      // For development only - backend returns reset URL
      if (result.reset_url) {
        setResetUrl(result.reset_url);
      }
    } catch (err) {
      setError(err.message || 'Failed to send reset email');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-900 to-gray-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Back to Login */}
        <Link
          to="/login"
          className="inline-flex items-center gap-2 text-slate-800 hover:text-slate-800 mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Login
        </Link>

        {/* Card */}
        <div className="bg-slate-900/90 backdrop-blur-xl rounded-2xl shadow-2xl border border-slate-300/30 p-8">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-br from-slate-800 to-slate-700 rounded-full flex items-center justify-center mx-auto mb-4">
              <Mail className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-800 to-slate-700 bg-clip-text text-transparent">
              Forgot Password
            </h1>
            <p className="text-gray-400 mt-2">
              Enter your email to receive a password reset link
            </p>
          </div>

          {/* Success Message */}
          {message && (
            <div className="mb-6 p-4 bg-green-900/30 border border-green-500/50 rounded-lg">
              <p className="text-green-400 text-sm">{message}</p>

              {/* Development Only - Show Reset URL */}
              {resetUrl && (
                <div className="mt-4 p-3 bg-yellow-900/30 border border-yellow-500/50 rounded">
                  <p className="text-yellow-400 text-xs font-semibold mb-2">
                    DEV MODE: Use this link to reset password
                  </p>
                  <a
                    href={resetUrl}
                    className="text-yellow-300 text-xs break-all hover:underline"
                  >
                    {resetUrl}
                  </a>
                </div>
              )}
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-900/30 border border-red-500/50 rounded-lg">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="you@example.com"
                className="w-full px-4 py-3 bg-slate-800/50 border border-slate-300/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500 text-white placeholder-gray-500"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-gradient-to-r from-slate-800 to-slate-700 text-white rounded-lg hover:from-slate-800 hover:to-slate-700 transition-all shadow-lg shadow-slate-500/50 font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Sending...
                </>
              ) : (
                'Send Reset Link'
              )}
            </button>
          </form>

          {/* Remember Password */}
          <div className="mt-6 text-center">
            <p className="text-gray-400 text-sm">
              Remember your password?{' '}
              <Link to="/login" className="text-slate-800 hover:text-slate-800 font-medium">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
