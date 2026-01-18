// components/security/SecurityDashboard.jsx - Enhanced security dashboard component
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Shield, Lock, Eye, AlertTriangle, CheckCircle, Clock, Globe, Smartphone, Key, Activity, LogOut, XCircle, ExternalLink } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { meldraAi } from '@/api/meldraClient';
import { getApiKey } from '@/api/meldraDeveloperApi';

export default function SecurityDashboard() {
  const [user, setUser] = useState(null);
  const [loginHistory, setLoginHistory] = useState([]);
  const [sessionInfo, setSessionInfo] = useState(null);
  const [securityScore, setSecurityScore] = useState(0);
  const [meldraKeyInput, setMeldraKeyInput] = useState('');
  const [meldraKeySet, setMeldraKeySet] = useState(!!getApiKey());
  const [meldraKeySaved, setMeldraKeySaved] = useState(false);

  useEffect(() => {
    loadSecurityData();
    updateSessionInfo();
    const interval = setInterval(updateSessionInfo, 60000); // Update every minute
    return () => clearInterval(interval);
  }, []);

  const loadSecurityData = async () => {
    try {
      const currentUser = await meldraAi.auth.me();
      setUser(currentUser);
      
      // Calculate security score
      let score = 50; // Base score
      if (currentUser.mfa_enabled) score += 30;
      if (currentUser.is_verified) score += 10;
      if (currentUser.full_name) score += 10;
      setSecurityScore(Math.min(score, 100));

      // Load login history (if available)
      // This would require a backend endpoint
    } catch (error) {
      console.error('Error loading security data:', error);
    }
  };

  const updateSessionInfo = () => {
    const loginTime = sessionStorage.getItem('loginTime');
    if (loginTime) {
      const sessionDuration = Math.floor((Date.now() - parseInt(loginTime)) / 1000 / 60);
      setSessionInfo({
        duration: sessionDuration,
        loginTime: new Date(parseInt(loginTime)).toLocaleString()
      });
    }
  };

  const getSecurityScoreColor = (score) => {
    if (score >= 80) return 'text-emerald-400';
    if (score >= 60) return 'text-amber-400';
    return 'text-red-400';
  };

  const getSecurityScoreBadge = (score) => {
    if (score >= 80) return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
    if (score >= 60) return 'bg-amber-500/20 text-amber-300 border-amber-500/30';
    return 'bg-red-500/20 text-red-300 border-red-500/30';
  };

  const saveMeldraKey = () => {
    const v = meldraKeyInput.trim();
    if (v) {
      localStorage.setItem('meldra_api_key', v);
      setMeldraKeySet(true);
      setMeldraKeyInput('');
      setMeldraKeySaved(true);
      setTimeout(() => setMeldraKeySaved(false), 2500);
    }
  };

  const clearMeldraKey = () => {
    localStorage.removeItem('meldra_api_key');
    setMeldraKeySet(false);
    setMeldraKeyInput('');
  };

  return (
    <div className="space-y-6">
      {/* Security Score */}
      <Card className="bg-slate-900/80 backdrop-blur-xl border-slate-700/50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-white flex items-center gap-2">
              <Shield className="w-5 h-5 text-blue-400" />
              Security Score
            </CardTitle>
            <Badge className={getSecurityScoreBadge(securityScore)}>
              {securityScore}/100
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <div className="h-3 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-500 ${
                      securityScore >= 80 ? 'bg-emerald-500' :
                      securityScore >= 60 ? 'bg-amber-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${securityScore}%` }}
                  />
                </div>
              </div>
              <span className={`text-2xl font-bold ${getSecurityScoreColor(securityScore)}`}>
                {securityScore}%
              </span>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex items-center gap-2">
                {user?.mfa_enabled ? (
                  <CheckCircle className="w-4 h-4 text-emerald-400" />
                ) : (
                  <XCircle className="w-4 h-4 text-red-400" />
                )}
                <span className="text-slate-300">2FA Enabled</span>
              </div>
              <div className="flex items-center gap-2">
                {user?.is_verified ? (
                  <CheckCircle className="w-4 h-4 text-emerald-400" />
                ) : (
                  <XCircle className="w-4 h-4 text-red-400" />
                )}
                <span className="text-slate-300">Email Verified</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Current Session */}
      {sessionInfo && (
        <Card className="bg-slate-900/80 backdrop-blur-xl border-slate-700/50">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Clock className="w-5 h-5 text-blue-400" />
              Current Session
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Session Duration:</span>
              <span className="text-white font-semibold">{sessionInfo.duration} minutes</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Login Time:</span>
              <span className="text-white font-semibold">{sessionInfo.loginTime}</span>
            </div>
            <div className="pt-2 border-t border-slate-700">
              <Button
                variant="outline"
                className="w-full border-red-500/30 text-red-400 hover:bg-red-500/10"
                onClick={() => {
                  meldraAi.auth.logout();
                  window.location.href = '/Login';
                }}
              >
                <LogOut className="w-4 h-4 mr-2" />
                End Session
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Meldra API Key — only for external/API use (developer.meldra.ai). In-app never needs this. */}
      <Card className="bg-slate-900/80 backdrop-blur-xl border-slate-700/50">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Key className="w-5 h-5 text-blue-400" />
            Meldra API Key (for external API only)
          </CardTitle>
          <p className="text-sm text-slate-400">Only for calling Meldra from your own apps or developer.meldra.ai. In-app Document Converter and ZIP Cleaner use your Meldra login only; they do <strong>not</strong> use or require this key.</p>
        </CardHeader>
        <CardContent className="space-y-3">
          {meldraKeySet && !meldraKeyInput ? (
            <div className="flex items-center justify-between gap-2">
              <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30">Key is set</Badge>
              <Button variant="outline" size="sm" className="border-slate-600 text-slate-300" onClick={clearMeldraKey}>Remove</Button>
            </div>
          ) : (
            <>
              <Input
                type="password"
                placeholder="Meldra API key"
                value={meldraKeyInput}
                onChange={(e) => setMeldraKeyInput(e.target.value)}
                className="bg-slate-800 border-slate-600 text-slate-100 placeholder:text-slate-500"
              />
              <div className="flex gap-2">
                <Button size="sm" className="bg-blue-600 hover:bg-blue-700" onClick={saveMeldraKey} disabled={!meldraKeyInput.trim()}>
                  {meldraKeySaved ? 'Saved' : 'Save'}
                </Button>
                <Link to="/developers" className="inline-flex items-center gap-1 text-sm text-blue-400 hover:text-blue-300">
                  <ExternalLink className="w-4 h-4" /> developer.meldra.ai
                </Link>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Security Features */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card className="bg-slate-900/80 backdrop-blur-xl border-slate-700/50">
          <CardHeader>
            <CardTitle className="text-white text-lg flex items-center gap-2">
              <Lock className="w-5 h-5 text-purple-400" />
              Password Security
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-slate-300">
            <p>✅ Passwords are hashed with bcrypt</p>
            <p>✅ Minimum 8 characters required</p>
            <p>✅ Must include uppercase, lowercase, number, and special character</p>
            <Button variant="outline" className="w-full mt-4 border-slate-700 text-slate-300">
              Change Password
            </Button>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/80 backdrop-blur-xl border-slate-700/50">
          <CardHeader>
            <CardTitle className="text-white text-lg flex items-center gap-2">
              <Smartphone className="w-5 h-5 text-blue-400" />
              Two-Factor Authentication
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {user?.mfa_enabled ? (
              <>
                <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Enabled
                </Badge>
                <p className="text-sm text-slate-300">Your account is protected with 2FA</p>
                <Button variant="outline" className="w-full border-slate-700 text-slate-300">
                  Manage 2FA
                </Button>
              </>
            ) : (
              <>
                <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/30">
                  <AlertTriangle className="w-3 h-3 mr-1" />
                  Not Enabled
                </Badge>
                <p className="text-sm text-slate-300">Enable 2FA for additional security</p>
                <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white">
                  Enable 2FA
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Security Recommendations */}
      <Card className="bg-slate-900/80 backdrop-blur-xl border-slate-700/50">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Activity className="w-5 h-5 text-blue-400" />
            Security Recommendations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {!user?.mfa_enabled && (
              <Alert className="bg-amber-500/10 border-amber-500/30">
                <AlertTriangle className="h-4 w-4 text-amber-400" />
                <AlertDescription className="text-amber-300">
                  <strong>Enable Two-Factor Authentication</strong> to significantly improve your account security.
                </AlertDescription>
              </Alert>
            )}
            {!user?.is_verified && (
              <Alert className="bg-amber-500/10 border-amber-500/30">
                <AlertTriangle className="h-4 w-4 text-amber-400" />
                <AlertDescription className="text-amber-300">
                  <strong>Verify your email address</strong> to complete account setup.
                </AlertDescription>
              </Alert>
            )}
            <Alert className="bg-blue-500/10 border-blue-500/30">
              <CheckCircle className="h-4 w-4 text-blue-400" />
              <AlertDescription className="text-blue-300">
                <strong>Best Practices:</strong> Use a unique password, logout on shared devices, and review login history regularly.
              </AlertDescription>
            </Alert>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
