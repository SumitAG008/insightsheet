import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { backendApi } from '@/api/backendClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Mail, ArrowLeft, Sparkles } from 'lucide-react';

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [resetLink, setResetLink] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    setSuccess(false);

    try {
      const result = await backendApi.auth.forgotPassword(email);
      
      setSuccess(true);
      
      // In development, show reset link (remove in production)
      if (result.reset_link) {
        setResetLink(result.reset_link);
      }
      
    } catch (err) {
      setError(err.message || 'Failed to send reset email. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-slate-900/80 backdrop-blur-xl border-slate-700/50">
        <CardHeader className="space-y-1">
          <div className="flex items-center justify-center mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
          </div>
          <CardTitle className="text-2xl text-center text-white">Forgot Password?</CardTitle>
          <CardDescription className="text-center text-slate-400">
            Enter your email address and we'll send you a link to reset your password
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {error && (
              <Alert className="bg-red-500/10 border-red-500/30">
                <AlertDescription className="text-red-300">{error}</AlertDescription>
              </Alert>
            )}
            {success && (
              <Alert className="bg-green-500/10 border-green-500/30">
                <AlertDescription className="text-green-300">
                  {resetLink && import.meta.env.MODE === 'development' ? (
                    <div>
                      <p className="mb-2">Password reset link generated!</p>
                      <p className="text-xs mb-2">Development mode - Reset link:</p>
                      <a 
                        href={resetLink} 
                        className="text-blue-400 underline break-all text-xs"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {resetLink}
                      </a>
                      <p className="text-xs mt-2 text-slate-400">
                        In production, this link would be sent to your email.
                      </p>
                    </div>
                  ) : (
                    "If an account with that email exists, a password reset link has been sent to your email. Please check your inbox (and spam folder)."
                  )}
                </AlertDescription>
              </Alert>
            )}
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300">Email</label>
              <Input
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
                className="bg-slate-800/50 border-slate-700 text-slate-200"
              />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col space-y-4">
            <Button
              type="submit"
              disabled={loading || success}
              className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Sending reset link...
                </>
              ) : success ? (
                <>
                  <Mail className="w-4 h-4 mr-2" />
                  Reset link sent!
                </>
              ) : (
                <>
                  <Mail className="w-4 h-4 mr-2" />
                  Send Reset Link
                </>
              )}
            </Button>
            <div className="flex items-center justify-between w-full text-sm">
              <Link 
                to="/login" 
                className="text-purple-400 hover:text-purple-300 flex items-center gap-1"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Login
              </Link>
              <Link 
                to="/register" 
                className="text-slate-400 hover:text-slate-300"
              >
                Create Account
              </Link>
            </div>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
