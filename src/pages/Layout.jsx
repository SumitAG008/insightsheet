
// Layout.jsx - Clean navigation with dropdown menus
import React, { useCallback, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Upload, LayoutDashboard, DollarSign, FileText, Shield, AlertTriangle, Sparkles, FileArchive, Users, Download, Brain, FileSpreadsheet, GitCompare, Calculator, Calendar, BookOpen, Play, ChevronDown } from 'lucide-react';
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
  const [openDropdown, setOpenDropdown] = useState(null);

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

  const toggleDropdown = (name) => {
    setOpenDropdown(openDropdown === name ? null : name);
  };

  const DropdownMenu = ({ name, icon: Icon, items }) => (
    <div className="relative">
      <button
        onClick={() => toggleDropdown(name)}
        className="flex items-center gap-2 px-4 py-2 rounded-lg transition-all font-medium text-blue-700 hover:bg-blue-100 hover:text-blue-900"
      >
        <Icon className="w-4 h-4" />
        <span>{name}</span>
        <ChevronDown className={`w-4 h-4 transition-transform ${openDropdown === name ? 'rotate-180' : ''}`} />
      </button>

      {openDropdown === name && (
        <div className="absolute top-full left-0 mt-1 bg-white border border-blue-200 rounded-lg shadow-xl min-w-[200px] py-2 z-50">
          {items.map((item, idx) => (
            <Link
              key={idx}
              to={createPageUrl(item.page)}
              onClick={() => setOpenDropdown(null)}
              className="flex items-center gap-3 px-4 py-2 text-blue-700 hover:bg-blue-50 hover:text-blue-900 transition-colors"
            >
              <item.icon className="w-4 h-4" />
              <span>{item.label}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );

  const fileMenuItems = [
    { icon: Upload, label: 'CSV Upload', page: 'Upload' },
    { icon: FileText, label: 'File to PPT', page: 'FileToPPT' },
    { icon: FileArchive, label: 'ZIP Cleaner', page: 'FilenameCleaner' },
  ];

  const excelMenuItems = [
    { icon: FileSpreadsheet, label: 'Sheet Manager', page: 'SheetManager' },
    { icon: GitCompare, label: 'Reconciliation', page: 'Reconciliation' },
    { icon: Calculator, label: 'Accounting', page: 'AccountingToolkit' },
    { icon: Calendar, label: 'Projects', page: 'ProjectTracker' },
  ];

  const helpMenuItems = [
    { icon: BookOpen, label: 'User Guide', page: 'UserGuide' },
    { icon: Play, label: 'Demo', page: 'Demo' },
  ];

  const adminMenuItems = [
    { icon: LayoutDashboard, label: 'Admin Dashboard', page: 'AdminDashboard' },
    { icon: Users, label: 'User Management', page: 'UserManagement' },
    { icon: Download, label: 'Backup Code', page: 'DownloadCode' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-blue-100">
      {/* Navigation */}
      <nav className="border-b border-blue-200 backdrop-blur-xl bg-white/95 sticky top-0 z-50 shadow-lg shadow-blue-200/50">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
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

            {/* Main Navigation */}
            <div className="hidden md:flex items-center gap-1">
              {/* Dashboard */}
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

              {/* Files Dropdown */}
              <DropdownMenu name="Files" icon={FileText} items={fileMenuItems} />

              {/* Excel Tools Dropdown */}
              <DropdownMenu name="Excel Tools" icon={FileSpreadsheet} items={excelMenuItems} />

              {/* AI Tools */}
              <Link
                to={createPageUrl('AgenticAI')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all font-medium ${
                  isActive(createPageUrl('AgenticAI'))
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/50'
                    : 'text-blue-700 hover:bg-blue-100 hover:text-blue-900'
                }`}
              >
                <Brain className="w-4 h-4" />
                <span>AI Tools</span>
              </Link>

              {/* Help Dropdown */}
              <DropdownMenu name="Help" icon={BookOpen} items={helpMenuItems} />

              {/* Pricing */}
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

              {/* Admin Dropdown (for admin only) */}
              {user && user.email === 'sumit@meldra.ai' && (
                <DropdownMenu name="Admin" icon={Shield} items={adminMenuItems} />
              )}
            </div>

            {/* User Section */}
            <div className="flex items-center gap-4">
              {/* Company Logo - Top Right */}
              <div className="hidden lg:flex items-center gap-3 border-l border-blue-200 pl-4">
                <img
                  src="https://base44.com/logo_v2.svg"
                  alt="Company Logo"
                  className="h-10 w-auto object-contain"
                  onError={(e) => {
                    // Fallback to local logo if CDN fails
                    e.target.src = '/logo.png';
                  }}
                />
              </div>

              {/* User Auth */}
              {user ? (
                <div className="flex items-center gap-3 border-l border-blue-200 pl-4">
                  <div className="text-right">
                    <p className="text-sm font-semibold text-blue-900">{user.email}</p>
                    <p className="text-xs text-blue-600">Logged in</p>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="px-4 py-2 text-sm bg-blue-100 hover:bg-blue-200 text-blue-900 rounded-lg font-medium transition-colors"
                  >
                    Logout
                  </button>
                </div>
              ) : (
                <Link
                  to={createPageUrl('Login')}
                  className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg shadow-blue-500/50 font-medium"
                >
                  Login
                </Link>
              )}
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

