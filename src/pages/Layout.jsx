
// Layout.jsx - Remove Workflow, Excel-to-PPT, add Agentic AI
import React, { useCallback } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Upload, LayoutDashboard, DollarSign, FileText, Shield, AlertTriangle, Sparkles, FileArchive, Users, Download, Brain, FileSpreadsheet, GitCompare, Calculator, Calendar, BookOpen, Play } from 'lucide-react';
import SubscriptionChecker from '@/components/subscription/SubscriptionChecker';
import Logo from '@/components/branding/Logo';
import { backendApi } from '@/api/backendClient';
import { getIPAndLocation, getBrowserInfo } from '@/components/tracking/ActivityLogger';
import ActivityLogger from '@/components/tracking/ActivityLogger';

export default function Layout({ children }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [user, setUser] = React.useState(null);
  const [loginTime, setLoginTime] = React.useState(null);

  const loadUser = useCallback(async () => {
    try {
      // Check if we have a token first
      if (!backendApi.auth.isAuthenticated()) {
        setUser(null);
        return;
      }

      const currentUser = await backendApi.auth.me();
      setUser(currentUser);

      const loginTimestamp = Date.now();
      setLoginTime(loginTimestamp);
      sessionStorage.setItem('loginTime', loginTimestamp.toString());

      const sessionLogged = sessionStorage.getItem('sessionLogged');
      if (!sessionLogged) {
        // Try to log login, but don't fail if it doesn't work
        try {
          await logLogin(currentUser.email);
          sessionStorage.setItem('sessionLogged', 'true');
        } catch (logError) {
          console.error('Failed to log login:', logError);
        }
      }
    } catch (error) {
      // User not logged in or token invalid
      console.error('Failed to load user:', error);
      setUser(null);
      // Clear any invalid tokens
      backendApi.auth.logout();
    }
  }, []);

  React.useEffect(() => {
    loadUser();
  }, [loadUser]);

  const logLogin = async (email) => {
    try {
      const ipData = await getIPAndLocation();
      const browser = getBrowserInfo();

      // Try to log via backend API if available
      // Note: This endpoint might not exist yet, so we catch errors
      try {
        await backendApi.activity.log('login', 'Login', {
          ip_address: ipData.ip,
          location: ipData.location,
          browser: browser,
        });
      } catch (apiError) {
        console.log('Activity logging not available:', apiError.message);
      }
    } catch (error) {
      console.error('Error logging login:', error);
    }
  };

  const handleLogout = async () => {
    // Try to log the logout event, but don't let it block the actual logout
    if (user) {
      try {
        const loginTimestamp = parseInt(sessionStorage.getItem('loginTime') || '0');
        const sessionDuration = loginTimestamp ? Math.round((Date.now() - loginTimestamp) / 60000) : 0;

        const ipData = await getIPAndLocation();
        const browser = getBrowserInfo();

        // Try to log via backend API
        try {
          await backendApi.activity.log('logout', 'Logout', {
            ip_address: ipData.ip,
            location: ipData.location,
            browser: browser,
            session_duration: sessionDuration
          });
        } catch (apiError) {
          console.log('Activity logging not available:', apiError.message);
        }

        sessionStorage.removeItem('loginTime');
        sessionStorage.removeItem('sessionLogged');
      } catch (error) {
        console.error('Error logging logout:', error);
      }
    }

    // Clear authentication and redirect
    backendApi.auth.logout();

    // Clear user state
    setUser(null);

    // Redirect to login page
    navigate('/login');
  };

  const isActive = (path) => location.pathname === path;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-blue-100">
      {/* Navigation */}
      <nav className="border-b border-blue-200 backdrop-blur-xl bg-white/95 sticky top-0 z-50 shadow-lg shadow-blue-200/50">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <Link to={createPageUrl('Upload')} className="group">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg shadow-blue-500/50">
                  <Sparkles className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold bg-gradient-to-r from-blue-700 via-indigo-600 to-blue-700 bg-clip-text text-transparent">
                    InsightSheet<span className="text-blue-600">-lite</span>
                  </h1>
                  <p className="text-xs text-blue-600 font-medium tracking-wider">DATA MADE SIMPLE</p>
                </div>
              </div>
            </Link>

            <div className="hidden md:flex items-center gap-2">
              <Link
                to={createPageUrl('Upload')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all font-medium ${
                  isActive(createPageUrl('Upload'))
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/50'
                    : 'text-blue-700 hover:bg-blue-100 hover:text-blue-900'
                }`}
              >
                <Upload className="w-4 h-4" />
                <span>CSV Upload</span>
              </Link>

              <Link
                to={createPageUrl('Dashboard')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all font-medium ${
                  isActive(createPageUrl('Dashboard'))
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/50'
                    : 'text-blue-700 hover:bg-blue-100 hover:text-blue-900'
                }`}
              >
                <LayoutDashboard className="w-4 h-4" />
                <span>Dashboard</span>
              </Link>

              <Link
                to={createPageUrl('AgenticAI')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all font-medium ${
                  isActive(createPageUrl('AgenticAI'))
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/50'
                    : 'text-blue-700 hover:bg-blue-100 hover:text-blue-900'
                }`}
              >
                <Brain className="w-4 h-4" />
                <span>Agentic AI</span>
              </Link>

              <Link
                to={createPageUrl('FileToPPT')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all font-medium ${
                  isActive(createPageUrl('FileToPPT'))
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/50'
                    : 'text-blue-700 hover:bg-blue-100 hover:text-blue-900'
                }`}
              >
                <FileText className="w-4 h-4" />
                <span>File to PPT</span>
              </Link>

              <Link
                to={createPageUrl('FilenameCleaner')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all font-medium ${
                  isActive(createPageUrl('FilenameCleaner'))
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/50'
                    : 'text-blue-700 hover:bg-blue-100 hover:text-blue-900'
                }`}
              >
                <FileArchive className="w-4 h-4" />
                <span>ZIP Cleaner</span>
              </Link>

              <Link
                to={createPageUrl('SheetManager')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all font-medium ${
                  isActive(createPageUrl('SheetManager'))
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/50'
                    : 'text-blue-700 hover:bg-blue-100 hover:text-blue-900'
                }`}
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>Sheets</span>
              </Link>

              <Link
                to={createPageUrl('Reconciliation')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all font-medium ${
                  isActive(createPageUrl('Reconciliation'))
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/50'
                    : 'text-blue-700 hover:bg-blue-100 hover:text-blue-900'
                }`}
              >
                <GitCompare className="w-4 h-4" />
                <span>Reconcile</span>
              </Link>

              <Link
                to={createPageUrl('AccountingToolkit')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all font-medium ${
                  isActive(createPageUrl('AccountingToolkit'))
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/50'
                    : 'text-blue-700 hover:bg-blue-100 hover:text-blue-900'
                }`}
              >
                <Calculator className="w-4 h-4" />
                <span>Accounting</span>
              </Link>

              <Link
                to={createPageUrl('ProjectTracker')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all font-medium ${
                  isActive(createPageUrl('ProjectTracker'))
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/50'
                    : 'text-blue-700 hover:bg-blue-100 hover:text-blue-900'
                }`}
              >
                <Calendar className="w-4 h-4" />
                <span>Projects</span>
              </Link>

              <Link
                to={createPageUrl('UserGuide')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all font-medium ${
                  isActive(createPageUrl('UserGuide'))
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/50'
                    : 'text-blue-700 hover:bg-blue-100 hover:text-blue-900'
                }`}
              >
                <BookOpen className="w-4 h-4" />
                <span>Guide</span>
              </Link>

              <Link
                to={createPageUrl('Demo')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all font-medium ${
                  isActive(createPageUrl('Demo'))
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/50'
                    : 'text-blue-700 hover:bg-blue-100 hover:text-blue-900'
                }`}
              >
                <Play className="w-4 h-4" />
                <span>Demo</span>
              </Link>

              <Link
                to={createPageUrl('Pricing')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all font-medium ${
                  isActive(createPageUrl('Pricing'))
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/50'
                    : 'text-blue-700 hover:bg-blue-100 hover:text-blue-900'
                }`}
              >
                <DollarSign className="w-4 h-4" />
                <span>Pricing</span>
              </Link>

              {user && user.email === 'sumit@meldra.ai' && (
                <>
                  <Link
                    to={createPageUrl('AdminDashboard')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all font-medium ${
                      isActive(createPageUrl('AdminDashboard'))
                        ? 'bg-gradient-to-r from-amber-600 to-orange-600 text-white shadow-lg shadow-amber-500/50'
                        : 'text-amber-700 hover:bg-amber-100 hover:text-amber-900'
                    }`}
                  >
                    <DollarSign className="w-4 h-4" />
                    <span>Admin</span>
                  </Link>

                  <Link
                    to={createPageUrl('UserManagement')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all font-medium ${
                      isActive(createPageUrl('UserManagement'))
                        ? 'bg-gradient-to-r from-amber-600 to-orange-600 text-white shadow-lg shadow-amber-500/50'
                        : 'text-amber-700 hover:bg-amber-100 hover:text-amber-900'
                    }`}
                  >
                    <Users className="w-4 h-4" />
                    <span>Users</span>
                  </Link>

                  <Link
                    to={createPageUrl('DownloadCode')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all font-medium ${
                      isActive(createPageUrl('DownloadCode'))
                        ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-500/50'
                        : 'text-emerald-700 hover:bg-emerald-100 hover:text-emerald-900'
                    }`}
                  >
                    <Download className="w-4 h-4" />
                    <span>Backup Code</span>
                  </Link>
                </>
              )}

              {/* Logo and Tagline - Top Right */}
              <div className="ml-4 flex items-center gap-4">
                <div className="flex items-center gap-3">
                  <img
                    src="/logo.png"
                    alt="Company Logo"
                    className="h-10 w-auto object-contain"
                    onError={(e) => {
                      // Fallback to gradient icon if logo not found
                      e.target.style.display = 'none';
                      e.target.nextSibling.style.display = 'flex';
                    }}
                  />
                  <div
                    className="hidden w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl items-center justify-center shadow-lg shadow-blue-500/50"
                  >
                    <Sparkles className="w-6 h-6 text-white" />
                  </div>
                  <div className="text-right">
                    <h2 className="text-lg font-bold text-blue-900">InsightSheet-lite</h2>
                    <p className="text-xs text-blue-600 font-semibold tracking-wide">DATA MADE SIMPLE</p>
                  </div>
                </div>

                {user ? (
                  <div className="flex items-center gap-3 ml-4 pl-4 border-l border-blue-300">
                    <span className="text-sm text-blue-700">{user.email}</span>
                    <button
                      onClick={handleLogout}
                      className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                    >
                      Logout
                    </button>
                  </div>
                ) : (
                  <Link
                    to={createPageUrl('Login')}
                    className="ml-4 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg shadow-blue-500/50 font-medium"
                  >
                    Login
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Main content */}
      <SubscriptionChecker>
        <ActivityLogger>
          <main className="min-h-[calc(100vh-16rem)]">
            {children}
          </main>
        </ActivityLogger>
      </SubscriptionChecker>

      {/* Footer */}
      <footer className="border-t border-blue-200 bg-white/95 mt-auto">
        <div className="container mx-auto px-4 py-8">
          <div className="grid md:grid-cols-3 gap-8">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/50">
                  <Sparkles className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-lg font-bold bg-gradient-to-r from-blue-700 to-indigo-600 bg-clip-text text-transparent">
                    InsightSheet<span className="text-blue-600">-lite</span>
                  </h1>
                </div>
              </div>
              <p className="text-sm text-blue-700">
                Privacy-first data & file management
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-blue-900 mb-3">Legal</h3>
              <div className="space-y-2">
                <Link
                  to={createPageUrl('Privacy')}
                  className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 transition-colors"
                >
                  <Shield className="w-4 h-4" />
                  Privacy Policy
                </Link>
                <Link
                  to={createPageUrl('Disclaimer')}
                  className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 transition-colors"
                >
                  <AlertTriangle className="w-4 h-4" />
                  Disclaimer & Terms
                </Link>
              </div>
            </div>

            <div>
              <div className="bg-gradient-to-br from-blue-100 to-indigo-100 border border-blue-300 rounded-xl p-4 backdrop-blur-sm">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="w-5 h-5 text-blue-600" />
                  <span className="font-semibold text-blue-900 text-sm">Privacy First</span>
                </div>
                <p className="text-xs text-blue-700 leading-relaxed">
                  100% browser processing<br />
                  Zero data storage<br />
                  No tracking
                </p>
              </div>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-blue-200 text-center">
            <p className="text-sm text-blue-600">
              © 2024 InsightSheet-lite • All rights reserved
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

