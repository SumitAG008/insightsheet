import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { backendApi } from '@/api/backendClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Lock, ArrowLeft, Sparkles, CheckCircle2 } from 'lucide-react';

export default function ResetPassword() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  
  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!token) {
      setError('Invalid reset link. Please request a new password reset.');
    }
  }, [token]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validation
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (formData.password.length < 10) {
      setError('Password must be at least 10 characters');
      return;
    }
    
    // Check byte length (bcrypt has 72-byte limit, not character limit)
    // Some characters (emojis, special Unicode) can be multiple bytes
    const passwordBytes = new TextEncoder().encode(formData.password);
    const passwordByteLength = passwordBytes.length;
    const passwordCharLength = formData.password.length;
    
    // Debug logging
    console.log('Password validation:', {
      characters: passwordCharLength,
      bytes: passwordByteLength,
      password: formData.password.replace(/./g, '*') // Mask password for logging
    });
    
    if (passwordByteLength > 72) {
      setError(`Password is too long. Maximum 72 bytes allowed (your password is ${passwordByteLength} bytes). Please use a shorter password or remove special characters.`);
      return;
    }

    if (!token) {
      setError('Invalid reset token');
      return;
    }

    setLoading(true);

    try {
      await backendApi.auth.resetPassword(token, formData.password);
      setSuccess(true);
      
      // Redirect to login after 3 seconds
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    } catch (err) {
      // Log the actual error for debugging
      console.error('Password reset error:', err);
      console.error('Error details:', {
        message: err.message,
        response: err.response,
        status: err.status
      });
      
      // Extract error message from response if available
      let errorMessage = 'Password reset failed. Please try again.';
      if (err.response?.data?.detail) {
        errorMessage = err.response.data.detail;
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-slate-900/80 backdrop-blur-xl border-slate-700/50">
          <CardContent className="pt-6">
            <Alert className="bg-red-500/10 border-red-500/30">
              <AlertDescription className="text-red-300">
                Invalid reset link. Please request a new password reset.
              </AlertDescription>
            </Alert>
            <div className="mt-4">
              <Link 
                to="/forgot-password" 
                className="text-purple-400 hover:text-purple-300 flex items-center gap-1"
              >
                <ArrowLeft className="w-4 h-4" />
                Request New Reset Link
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-slate-900/80 backdrop-blur-xl border-slate-700/50">
        <CardHeader className="space-y-1">
          <div className="flex items-center justify-center mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
          </div>
          <CardTitle className="text-2xl text-center text-white">Reset Password</CardTitle>
          <CardDescription className="text-center text-slate-400">
            Enter your new password below
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
                <AlertDescription className="text-green-300 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  Password reset successfully! Redirecting to login...
                </AlertDescription>
              </Alert>
            )}
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300">New Password</label>
              <Input
                name="password"
                type="password"
                placeholder="••••••••"
                value={formData.password}
                onChange={handleChange}
                autoComplete="new-password"
                required
                minLength={10}
                className="bg-slate-800/50 border-slate-700 text-slate-200"
              />
              <p className="text-xs text-slate-400">
                Minimum 10 characters. Maximum 72 bytes (some special characters count as multiple bytes).
              </p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300">Confirm Password</label>
              <Input
                name="confirmPassword"
                type="password"
                placeholder="••••••••"
                value={formData.confirmPassword}
                onChange={handleChange}
                autoComplete="new-password"
                required
                minLength={10}
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
                  Resetting password...
                </>
              ) : success ? (
                <>
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Password Reset!
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4 mr-2" />
                  Reset Password
                </>
              )}
            </Button>
            <Link 
              to="/login" 
              className="text-purple-400 hover:text-purple-300 flex items-center gap-1 text-sm"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Login
            </Link>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
