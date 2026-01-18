import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { backendApi } from '@/api/backendClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, UserPlus, Sparkles, Eye, EyeOff } from 'lucide-react';

export default function Register() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    fullName: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Validation
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    if (formData.password.length < 10) {
      setError('Password must be at least 10 characters');
      setLoading(false);
      return;
    }
    
    // Check byte length (bcrypt has 72-byte limit, not character limit)
    // Some characters (emojis, special Unicode) can be multiple bytes
    const passwordBytes = new TextEncoder().encode(formData.password);
    if (passwordBytes.length > 72) {
      setError(`Password is too long. Maximum 72 bytes allowed (your password is ${passwordBytes.length} bytes). Please use a shorter password or remove special characters.`);
      setLoading(false);
      return;
    }

    try {
      await backendApi.auth.register(
        formData.email,
        formData.password,
        formData.fullName
      );

      setSuccess(true);
      setError(''); // Clear any previous errors

      // Show success message and redirect to login after 5 seconds
      // User needs to verify email before they can login
      setTimeout(() => {
        navigate('/login');
      }, 5000);

    } catch (err) {
      // Show specific error message
      const errorMessage = err.message || 'Registration failed. Please try again.';
      setError(errorMessage);
      
      // If email already exists, suggest login
      if (errorMessage.includes('already registered') || errorMessage.includes('Email already')) {
        setTimeout(() => {
          navigate('/login');
        }, 3000);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-white">
      <Card className="w-full max-w-md bg-white border-slate-200 shadow-lg">
        <CardHeader className="space-y-1">
          <div className="flex items-center justify-center mb-4">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-blue-600">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
          </div>
          <CardTitle className="text-2xl text-center text-slate-900">Create your account</CardTitle>
          <CardDescription className="text-center text-slate-600">
            Join InsightSheet-lite for privacy-first data analysis
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {error && (
              <Alert className="bg-red-50 border-red-200">
                <AlertDescription className="text-red-700">{error}</AlertDescription>
              </Alert>
            )}
            {success && (
              <Alert className="bg-blue-50 border-blue-200">
                <AlertDescription className="text-blue-800">
                  <strong>Registration successful!</strong> A verification email has been sent to <strong>{formData.email}</strong>. 
                  Please check your inbox (and spam folder) and click the verification link to activate your account. 
                  You'll need to verify your email before you can login. Redirecting to login page...
                </AlertDescription>
              </Alert>
            )}
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Full Name</label>
              <Input
                name="fullName"
                type="text"
                placeholder="John Doe"
                value={formData.fullName}
                onChange={handleChange}
                autoComplete="name"
                className="border-slate-300 text-slate-900"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Email</label>
              <Input
                name="email"
                type="email"
                placeholder="your@email.com (any email provider)"
                value={formData.email}
                onChange={handleChange}
                autoComplete="email"
                required
                className="border-slate-300 text-slate-900"
              />
              <p className="text-xs text-slate-500">
                ✓ All email providers accepted (Gmail, Outlook, Yahoo, custom domains, etc.)
              </p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Password</label>
              <div className="relative">
                <Input
                  name="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={handleChange}
                  autoComplete="new-password"
                  required
                  minLength={10}
                  className="border-slate-300 text-slate-900 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700 transition-colors"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-xs text-slate-500">
                Minimum 10 characters. Maximum 72 bytes (some special characters count as multiple bytes).
              </p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Confirm Password</label>
              <div className="relative">
                <Input
                  name="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  autoComplete="new-password"
                  required
                  className="border-slate-300 text-slate-900 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700 transition-colors"
                  aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col space-y-4">
            <Button
              type="submit"
              disabled={loading || success}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating account...
                </>
              ) : success ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Logging in...
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4 mr-2" />
                  Create Account
                </>
              )}
            </Button>
            <p className="text-sm text-center text-slate-600">
              Already have an account? <Link to="/login" className="text-blue-600 hover:text-blue-700 underline">Sign in</Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
