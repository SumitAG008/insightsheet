import React, { useEffect, useMemo, useState } from 'react';
import { User, Globe, KeyRound, Paintbrush, MonitorSmartphone, Upload, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { backendApi } from '@/api/backendClient';
import { applyPreferences, applyPrimaryColor, applyTheme, getUserPreferences, setUserPreferences } from '@/lib/userPreferences';
import { useI18n } from '@/lib/i18n';

const LANG_KEY = 'app:language';

export default function Settings() {
  const { language, setLanguage, t } = useI18n();
  const [user, setUser] = useState(null);
  const userEmail = useMemo(() => user?.email || 'anon', [user?.email]);
  const [profileName, setProfileName] = useState('');
  const [profileStatus, setProfileStatus] = useState('');
  const [languageStatus, setLanguageStatus] = useState('');

  const [passwordEmail, setPasswordEmail] = useState('');
  const [passwordStatus, setPasswordStatus] = useState('');

  const [brandName, setBrandName] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [logoError, setLogoError] = useState('');

  // A logo picked from the computer is stored as an image in this browser (no upload to our servers).
  const onLogoFile = (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (file.size > 300 * 1024) {
      setLogoError('That image is larger than 300 KB. Please choose a smaller file.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setLogoError('');
      setLogoUrl(String(reader.result || ''));
    };
    reader.onerror = () => setLogoError('This image could not be read.');
    reader.readAsDataURL(file);
  };
  const [primaryColor, setPrimaryColor] = useState('');
  const [theme, setTheme] = useState('system');
  const [brandingStatus, setBrandingStatus] = useState('');

  const [devices, setDevices] = useState(null); // { limit, devices } signed-in devices
  const [devicesStatus, setDevicesStatus] = useState('');
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteWord, setDeleteWord] = useState('');
  const [deleteStatus, setDeleteStatus] = useState('');
  const [deleting, setDeleting] = useState(false);

  const deleteAccount = async () => {
    setDeleting(true);
    setDeleteStatus('');
    try {
      await backendApi.auth.deleteAccount(deletePassword);
      window.location.href = '/';
    } catch (e) {
      setDeleteStatus(e?.message || 'Your account could not be deleted.');
      setDeleting(false);
    }
  };

  const loadDevices = async () => {
    try {
      setDevices(await backendApi.auth.devices());
    } catch (e) {
      setDevicesStatus(e?.message || 'Could not load your devices.');
    }
  };

  useEffect(() => {
    loadDevices();
  }, []);

  const signOutDevice = async (id) => {
    setDevicesStatus('');
    try {
      await backendApi.auth.signOutDevice(id);
      setDevicesStatus('Device signed out.');
      loadDevices();
    } catch (e) {
      setDevicesStatus(e?.message || 'Could not sign that device out.');
    }
  };

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const me = await backendApi.auth.me();
        if (!mounted) return;
        setUser(me);
        setPasswordEmail(me?.email || '');
        setProfileName(me?.full_name || '');

        const prefs = getUserPreferences(me?.email);
        setLanguage(prefs.language || 'en');
        setTheme(prefs.theme || 'system');
        setBrandName(prefs.brandName || '');
        setLogoUrl(prefs.logoUrl || '');
        setPrimaryColor(prefs.primaryColor || '');
        try {
          applyPreferences(me?.email);
        } catch {
          // ignore
        }
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
      setUserPreferences(userEmail, { language });
      setLanguageStatus(t('language_saved'));
    } catch {
      setLanguageStatus(t('language_failed'));
    }
  };

  const saveBrandingTheme = () => {
    setBrandingStatus('');
    const next = setUserPreferences(userEmail, {
      brandName: brandName || null,
      logoUrl: logoUrl || null,
      primaryColor: primaryColor || null,
      theme: theme || 'system',
    });

    try {
      applyTheme(next.theme);
      if (next.primaryColor) applyPrimaryColor(next.primaryColor);
    } catch {
      // ignore
    }
    setBrandingStatus('Saved.');
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
          <h1 className="text-4xl font-bold text-slate-900 dark:text-white">{t('settings_title')}</h1>
          <p className="text-slate-600 dark:text-slate-400 mt-2">{t('settings_subtitle')}</p>
        </div>

        <Card className="bg-white dark:bg-slate-900/80 backdrop-blur-xl border-slate-200 dark:border-slate-700/50 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-slate-900 dark:text-white">
              <User className="w-5 h-5" /> {t('profile_title')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t('profile_email')}</label>
                <Input value={user?.email || ''} readOnly className="bg-slate-50 dark:bg-slate-950" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t('profile_full_name')}</label>
                <Input value={profileName} onChange={(e) => setProfileName(e.target.value)} placeholder={t('settings_placeholder_your_name')} />
              </div>
            </div>

            <div className="flex gap-3">
              <Button onClick={saveProfile} className="bg-blue-600 hover:bg-blue-700">{t('profile_save')}</Button>
            </div>

            {profileStatus ? (
              <p className="text-sm text-slate-600 dark:text-slate-400">{profileStatus}</p>
            ) : null}
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-slate-900/80 backdrop-blur-xl border-slate-200 dark:border-slate-700/50 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-slate-900 dark:text-white">
              <MonitorSmartphone className="w-5 h-5" /> Signed-in devices
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Your subscription can be used on {devices?.limit || 2} devices at the same time.
            </p>
            <ul className="space-y-2">
              {(devices?.devices || []).map((d) => (
                <li key={d.id} className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 dark:border-slate-700 p-3">
                  <div>
                    <div className="font-medium text-slate-900 dark:text-white">
                      {d.device}{d.current ? ' (this device)' : ''}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      {[d.location, d.ip, d.last_active_at && `last active ${new Date(d.last_active_at).toLocaleString()}`].filter(Boolean).join(' · ')}
                    </div>
                  </div>
                  {!d.current && (
                    <Button variant="outline" size="sm" onClick={() => signOutDevice(d.id)}>Sign out</Button>
                  )}
                </li>
              ))}
            </ul>
            {devicesStatus ? <p className="text-sm text-slate-600 dark:text-slate-400">{devicesStatus}</p> : null}
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-slate-900/80 backdrop-blur-xl border-slate-200 dark:border-slate-700/50 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-slate-900 dark:text-white">
              <Globe className="w-5 h-5" /> {t('language_title')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="max-w-sm">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t('language_app_language')}</label>
              <Select
                value={language}
                onValueChange={(v) => {
                  setLanguage(v);
                  setLanguageStatus('');
                  try {
                    setUserPreferences(userEmail, { language: v });
                  } catch {
                    // ignore
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('settings_select_language_placeholder')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">{t('settings_language_option_en')}</SelectItem>
                  <SelectItem value="de">{t('settings_language_option_de')}</SelectItem>
                  <SelectItem value="fr">{t('settings_language_option_fr')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-3">
              <Button onClick={saveLanguage} className="bg-blue-600 hover:bg-blue-700">{t('language_save')}</Button>
            </div>

            {languageStatus ? (
              <p className="text-sm text-slate-600 dark:text-slate-400">{languageStatus}</p>
            ) : null}

            <Alert className="bg-amber-50 border-amber-200">
              <AlertDescription className="text-amber-700">
                {t('language_note')}
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-slate-900/80 backdrop-blur-xl border-slate-200 dark:border-slate-700/50 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-slate-900 dark:text-white">
              <Paintbrush className="w-5 h-5" /> {t('branding_title')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t('branding_brand_name')}</label>
                <Input value={brandName} onChange={(e) => setBrandName(e.target.value)} placeholder={t('settings_placeholder_your_brand')} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t('branding_logo_url')}</label>
                <div className="flex items-center gap-2">
                  <Input
                    value={logoUrl.startsWith('data:') ? 'Uploaded image' : logoUrl}
                    readOnly={logoUrl.startsWith('data:')}
                    onChange={(e) => setLogoUrl(e.target.value)}
                    placeholder={t('settings_placeholder_logo_url')}
                  />
                  <label className="inline-flex h-9 shrink-0 cursor-pointer items-center rounded-md border border-input px-3 text-sm font-medium hover:bg-accent">
                    <Upload className="mr-1.5 h-4 w-4" /> Upload logo
                    <input type="file" accept="image/png,image/jpeg,image/svg+xml,image/webp" className="hidden" onChange={onLogoFile} />
                  </label>
                  {logoUrl && (
                    <img src={logoUrl} alt="" className="h-9 w-9 shrink-0 rounded border border-input bg-[#fff] object-contain p-0.5" />
                  )}
                </div>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">PNG, JPG, SVG or WebP up to 300 KB. Kept in this browser only.</p>
                {logoError && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{logoError}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t('branding_primary_color')}</label>
                <div className="flex items-center gap-3">
                  <Input type="color" value={primaryColor || '#0ea5e9'} onChange={(e) => setPrimaryColor(e.target.value)} className="w-16 h-10 p-1" />
                  <Input value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} placeholder={t('settings_placeholder_primary_color')} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t('branding_theme')}</label>
                <Select value={theme} onValueChange={setTheme}>
                  <SelectTrigger>
                    <SelectValue placeholder={t('settings_select_theme_placeholder')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="system">{t('settings_theme_system')}</SelectItem>
                    <SelectItem value="light">{t('settings_theme_light')}</SelectItem>
                    <SelectItem value="dark">{t('settings_theme_dark')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex gap-3">
              <Button onClick={saveBrandingTheme} className="bg-blue-600 hover:bg-blue-700">{t('branding_save')}</Button>
              <Button
                variant="outline"
                onClick={() => {
                  setBrandName('');
                  setLogoUrl('');
                  setPrimaryColor('');
                  setTheme('system');
                  setUserPreferences(userEmail, { brandName: null, logoUrl: null, primaryColor: null, theme: 'system' });
                  try {
                    applyTheme('system');
                  } catch {
                    // ignore
                  }
                  setBrandingStatus('Reset to defaults.');
                }}
              >
                {t('branding_reset')}
              </Button>
            </div>

            {brandingStatus ? (
              <p className="text-sm text-slate-600 dark:text-slate-400">{brandingStatus}</p>
            ) : null}

            <Alert className="bg-blue-50 border-blue-200">
              <AlertDescription className="text-slate-700">
                {t('branding_note')}
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-slate-900/80 backdrop-blur-xl border-slate-200 dark:border-slate-700/50 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-slate-900 dark:text-white">
              <KeyRound className="w-5 h-5" /> {t('password_title')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="max-w-md">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t('password_email')}</label>
              <Input value={passwordEmail} onChange={(e) => setPasswordEmail(e.target.value)} placeholder={t('settings_placeholder_email')} />
            </div>

            <div className="flex gap-3">
              <Button onClick={sendPasswordReset} className="bg-blue-600 hover:bg-blue-700">{t('password_send_reset')}</Button>
            </div>

            {passwordStatus ? (
              <p className="text-sm text-slate-600 dark:text-slate-400">{passwordStatus}</p>
            ) : null}
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-slate-900/80 backdrop-blur-xl border-red-200 dark:border-red-900/60 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-700 dark:text-red-400">
              <Trash2 className="w-5 h-5" /> Delete my account
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-slate-700 dark:text-slate-300">
              This permanently deletes your account, sign-in and device history, usage history, API keys and any data you
              stored in meldra. It cannot be undone. Payment records are kept for as long as tax law requires, without your
              IP address or browser details.
            </p>
            <div className="grid md:grid-cols-2 gap-4 max-w-2xl">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Your password</label>
                <Input type="password" autoComplete="current-password" value={deletePassword} onChange={(e) => setDeletePassword(e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Type DELETE to confirm</label>
                <Input value={deleteWord} onChange={(e) => setDeleteWord(e.target.value)} placeholder="DELETE" />
              </div>
            </div>
            <Button
              onClick={deleteAccount}
              disabled={deleting || !deletePassword || deleteWord.trim().toUpperCase() !== 'DELETE'}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {deleting ? 'Deleting…' : 'Delete my account permanently'}
            </Button>
            {deleteStatus ? <p className="text-sm text-red-700 dark:text-red-400">{deleteStatus}</p> : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
