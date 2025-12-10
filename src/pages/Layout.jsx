
// Layout.jsx - Remove Workflow, Excel-to-PPT, add Agentic AI
import React, { useCallback } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Upload, LayoutDashboard, DollarSign, FileText, Shield, AlertTriangle, Sparkles, FileArchive, Users, Download, Brain } from 'lucide-react';
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

  // Tool categories for dropdown
  const tools = [
    { name: 'Data Upload', path: 'Upload', icon: Upload, desc: 'Upload CSV & Excel files' },
    { name: 'Dashboard', path: 'Dashboard', icon: LayoutDashboard, desc: 'Analyze & visualize data' },
    { name: 'Agentic AI', path: 'AgenticAI', icon: Brain, desc: 'AI-powered operations' },
    { name: 'File to PPT', path: 'FileToPPT', icon: FileText, desc: 'Convert files to presentations' },
    { name: 'ZIP Cleaner', path: 'FilenameCleaner', icon: FileArchive, desc: 'Batch rename files' },
  ];

  const adminTools = [
    { name: 'Admin Dashboard', path: 'AdminDashboard', icon: LayoutDashboard },
    { name: 'User Management', path: 'UserManagement', icon: Users },
    { name: 'Backup Code', path: 'DownloadCode', icon: Download },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50/30 to-slate-50 dark:from-slate-950 dark:via-purple-950/20 dark:to-slate-950 transition-colors duration-300">
      {/* Premium Navigation Bar */}
      <nav className="sticky top-0 z-50 border-b border-purple-200/50 dark:border-purple-800/30">
        <div className="meldra-glass-strong">
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-between h-16">
              {/* Logo */}
              <Link to={createPageUrl('Upload')} className="group">
                <Logo size="medium" variant={isDark ? "dark" : "default"} />
              </Link>

              {/* Desktop Navigation */}
              <div className="hidden lg:flex items-center gap-1">
                {/* Tools Dropdown */}
                <div className="relative">
                  <button
                    onClick={() => setToolsDropdownOpen(!toolsDropdownOpen)}
                    onBlur={() => setTimeout(() => setToolsDropdownOpen(false), 200)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all ${
                      toolsDropdownOpen
                        ? 'bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300'
                        : 'text-slate-700 dark:text-slate-300 hover:bg-purple-50 dark:hover:bg-purple-900/30'
                    }`}
                  >
                    <Layers className="w-4 h-4" />
                    <span>Tools</span>
                    <ChevronDown className={`w-4 h-4 transition-transform ${toolsDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {toolsDropdownOpen && (
                    <div className="absolute top-full left-0 mt-2 w-72 meldra-card p-2 shadow-xl">
                      {tools.map((tool) => (
                        <Link
                          key={tool.path}
                          to={createPageUrl(tool.path)}
                          className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                            isActive(createPageUrl(tool.path))
                              ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white'
                              : 'hover:bg-purple-50 dark:hover:bg-purple-900/30 text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          <tool.icon className="w-5 h-5" />
                          <div>
                            <p className="font-medium">{tool.name}</p>
                            <p className={`text-xs ${isActive(createPageUrl(tool.path)) ? 'text-white/80' : 'text-slate-500 dark:text-slate-400'}`}>
                              {tool.desc}
                            </p>
                          </div>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <Link
                  to={createPageUrl('Login')}
                  className="ml-4 px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all shadow-lg shadow-purple-500/50 font-medium"
                >
                  Login
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden meldra-glass border-t border-purple-200/50 dark:border-purple-800/30">
            <div className="container mx-auto px-4 py-4 space-y-2">
              {tools.map((tool) => (
                <Link
                  key={tool.path}
                  to={createPageUrl(tool.path)}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                    isActive(createPageUrl(tool.path))
                      ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-purple-50 dark:hover:bg-purple-900/30'
                  }`}
                >
                  <tool.icon className="w-5 h-5" />
                  <span>{tool.name}</span>
                </Link>
              ))}
              <Link
                to={createPageUrl('Pricing')}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                  isActive(createPageUrl('Pricing'))
                    ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-purple-50 dark:hover:bg-purple-900/30'
                }`}
              >
                <DollarSign className="w-5 h-5" />
                <span>Pricing</span>
              </Link>
            </div>
          </div>
        )}
      </nav>

      {/* Main content */}
      <SubscriptionChecker>
        <ActivityLogger>
          <main className="min-h-[calc(100vh-16rem)]">
            {children}
          </main>
        </ActivityLogger>
      </SubscriptionChecker>

      {/* Premium Footer */}
      <footer className="border-t border-purple-200/50 dark:border-purple-800/30 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm mt-auto">
        <div className="container mx-auto px-4 py-12">
          <div className="grid md:grid-cols-4 gap-8">
            {/* Brand Column */}
            <div className="md:col-span-1">
              <Logo size="medium" variant={isDark ? "dark" : "default"} />
              <p className="mt-4 text-sm text-slate-600 dark:text-slate-400">
                Transform your data into actionable insights with AI-powered intelligence.
              </p>
            </div>

            {/* Tools Column */}
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white mb-4">Tools</h3>
              <div className="space-y-2">
                {tools.slice(0, 4).map((tool) => (
                  <Link
                    key={tool.path}
                    to={createPageUrl(tool.path)}
                    className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 hover:text-purple-600 dark:hover:text-purple-400 transition-colors"
                  >
                    <tool.icon className="w-4 h-4" />
                    {tool.name}
                  </Link>
                ))}
              </div>
            </div>

            {/* Legal Column */}
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white mb-4">Legal</h3>
              <div className="space-y-2">
                <Link
                  to={createPageUrl('Privacy')}
                  className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 hover:text-purple-600 dark:hover:text-purple-400 transition-colors"
                >
                  <Shield className="w-4 h-4" />
                  Privacy Policy
                </Link>
                <Link
                  to={createPageUrl('Disclaimer')}
                  className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 hover:text-purple-600 dark:hover:text-purple-400 transition-colors"
                >
                  <AlertTriangle className="w-4 h-4" />
                  Terms & Conditions
                </Link>
              </div>
            </div>

            {/* Trust Badge */}
            <div>
              <div className="meldra-card p-4">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center">
                    <Shield className="w-4 h-4 text-white" />
                  </div>
                  <span className="font-bold text-slate-900 dark:text-white">Privacy First</span>
                </div>
                <ul className="text-xs text-slate-600 dark:text-slate-400 space-y-1">
                  <li className="flex items-center gap-2">
                    <Sparkles className="w-3 h-3 text-purple-500" />
                    100% Browser Processing
                  </li>
                  <li className="flex items-center gap-2">
                    <Sparkles className="w-3 h-3 text-purple-500" />
                    Zero Data Storage
                  </li>
                  <li className="flex items-center gap-2">
                    <Sparkles className="w-3 h-3 text-purple-500" />
                    End-to-End Encryption
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="mt-12 pt-6 border-t border-purple-200/50 dark:border-purple-800/30 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm text-slate-600 dark:text-slate-400">
              © 2025 Meldra. All rights reserved.
            </p>
            <div className="flex items-center gap-4">
              <span className="text-xs text-slate-500 dark:text-slate-500">
                Powered by AI • Built with Privacy in Mind
              </span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
