import React, { useEffect, useState } from 'react';
import { User, Globe, KeyRound } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { backendApi } from '@/api/backendClient';

const LANG_KEY = 'app:language';

export default function Settings() {
  const [user, setUser] = useState(null);
  const [profileName, setProfileName] = useState('');
  const [profileStatus, setProfileStatus] = useState('');

  const [language, setLanguage] = useState(() => {
    try {
      return localStorage.getItem(LANG_KEY) || 'en';
    } catch {
      return 'en';
    }
  });
  const [languageStatus, setLanguageStatus] = useState('');

  const [passwordEmail, setPasswordEmail] = useState('');
  const [passwordStatus, setPasswordStatus] = useState('');

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const me = await backendApi.auth.me();
        if (!mounted) return;
        setUser(me);
        setPasswordEmail(me?.email || '');
        setProfileName(me?.full_name || '');
      } catch {
        // ProtectedRoute should handle auth redirects
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const saveLanguage = () => {
    setLanguageStatus('');
    try {
      localStorage.setItem(LANG_KEY, language);
      setLanguageStatus('Saved.');
    } catch {
      setLanguageStatus('Failed to save language preference.');
    }
  };

  const sendPasswordReset = async () => {
    setPasswordStatus('');
    const email = (passwordEmail || '').trim();
    if (!email) {
      setPasswordStatus('Email is required.');
      return;
    }
    try {
      await backendApi.auth.forgotPassword(email);
      setPasswordStatus('Password reset email sent.');
    } catch (e) {
      setPasswordStatus(e?.message || 'Failed to send reset email.');
    }
  };

  const saveProfile = async () => {
    setProfileStatus('');
    setProfileStatus('Profile update is coming soon.');
  };

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 py-12">
      <div className="container mx-auto px-4 max-w-5xl space-y-8">
        <div>
          <h1 className="text-4xl font-bold text-slate-900 dark:text-white">Settings</h1>
          <p className="text-slate-600 dark:text-slate-400 mt-2">Manage your profile, language, and password.</p>
        </div>

        <Card className="bg-white dark:bg-slate-900/80 backdrop-blur-xl border-slate-200 dark:border-slate-700/50 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-slate-900 dark:text-white">
              <User className="w-5 h-5" /> Profile
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Email</label>
                <Input value={user?.email || ''} readOnly className="bg-slate-50 dark:bg-slate-950" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Full name</label>
                <Input value={profileName} onChange={(e) => setProfileName(e.target.value)} placeholder="Your name" />
              </div>
            </div>

            <div className="flex gap-3">
              <Button onClick={saveProfile} className="bg-blue-600 hover:bg-blue-700">Save Profile</Button>
            </div>

            {profileStatus ? (
              <p className="text-sm text-slate-600 dark:text-slate-400">{profileStatus}</p>
            ) : null}
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-slate-900/80 backdrop-blur-xl border-slate-200 dark:border-slate-700/50 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-slate-900 dark:text-white">
              <Globe className="w-5 h-5" /> Language
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="max-w-sm">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">App language</label>
              <Select value={language} onValueChange={setLanguage}>
                <SelectTrigger>
                  <SelectValue placeholder="Select language" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="hi">Hindi</SelectItem>
                  <SelectItem value="es">Spanish</SelectItem>
                  <SelectItem value="fr">French</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-3">
              <Button onClick={saveLanguage} className="bg-blue-600 hover:bg-blue-700">Save Language</Button>
            </div>

            {languageStatus ? (
              <p className="text-sm text-slate-600 dark:text-slate-400">{languageStatus}</p>
            ) : null}

            <Alert className="bg-amber-50 border-amber-200">
              <AlertDescription className="text-amber-700">
                Language preference is saved now. Full UI translation will be applied in the next step.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-slate-900/80 backdrop-blur-xl border-slate-200 dark:border-slate-700/50 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-slate-900 dark:text-white">
              <KeyRound className="w-5 h-5" /> Change Password
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="max-w-md">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Email</label>
              <Input value={passwordEmail} onChange={(e) => setPasswordEmail(e.target.value)} placeholder="you@company.com" />
            </div>

            <div className="flex gap-3">
              <Button onClick={sendPasswordReset} className="bg-blue-600 hover:bg-blue-700">Send Reset Email</Button>
            </div>

            {passwordStatus ? (
              <p className="text-sm text-slate-600 dark:text-slate-400">{passwordStatus}</p>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
