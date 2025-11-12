

// Layout.jsx - Remove Workflow, Excel-to-PPT, add Agentic AI
import React, { useCallback } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Upload, LayoutDashboard, DollarSign, FileText, Shield, AlertTriangle, Sparkles, FileArchive, Users, Download, Brain } from 'lucide-react';
import SubscriptionChecker from '@/components/subscription/SubscriptionChecker';
import Logo from '@/components/branding/Logo';
import { backendApi } from '@/api/backendClient';
import { LoginHistory } from '@/api/entities';
import { getIPAndLocation, getBrowserInfo } from '@/components/tracking/ActivityLogger';
import ActivityLogger from '@/components/tracking/ActivityLogger';

export default function Layout({ children }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [user, setUser] = React.useState(null);
  const [loginTime, setLoginTime] = React.useState(null);

  const loadUser = useCallback(async () => {
    try {
      const currentUser = await backendApi.auth.me();
      setUser(currentUser);
      
      const loginTimestamp = Date.now();
      setLoginTime(loginTimestamp);
      sessionStorage.setItem('loginTime', loginTimestamp.toString());
      
      const sessionLogged = sessionStorage.getItem('sessionLogged');
      if (!sessionLogged) {
        await logLogin(currentUser.email);
        sessionStorage.setItem('sessionLogged', 'true');
      }
    } catch (error) {
      // User not logged in
    }
  }, []);

  React.useEffect(() => {
    loadUser();
  }, [loadUser]);

  const logLogin = async (email) => {
    try {
      const ipData = await getIPAndLocation();
      const browser = getBrowserInfo();
      
      await LoginHistory.create({
        user_email: email,
        event_type: 'login',
        ip_address: ipData.ip,
        location: ipData.location,
        browser: browser,
      });
    } catch (error) {
      console.error('Error logging login:', error);
    }
  };

  const handleLogout = async () => {
    if (user) {
      try {
        const loginTimestamp = parseInt(sessionStorage.getItem('loginTime') || '0');
        const sessionDuration = loginTimestamp ? Math.round((Date.now() - loginTimestamp) / 60000) : 0;
        
        const ipData = await getIPAndLocation();
        const browser = getBrowserInfo();
        
        await LoginHistory.create({
          user_email: user.email,
          event_type: 'logout',
          ip_address: ipData.ip,
          location: ipData.location,
          browser: browser,
          session_duration: sessionDuration
        });
        
        sessionStorage.removeItem('loginTime');
        sessionStorage.removeItem('sessionLogged');
      } catch (error) {
        console.error('Error logging logout:', error);
      }
    }

    backendApi.auth.logout();
    window.location.reload();
  };
  
  const isActive = (path) => location.pathname === path;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950">
      {/* Navigation */}
      <nav className="border-b border-purple-800/30 backdrop-blur-xl bg-slate-900/90 sticky top-0 z-50 shadow-lg shadow-purple-900/20">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <Link to={createPageUrl('Upload')} className="group">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg shadow-purple-500/50">
                  <Sparkles className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-purple-400 bg-clip-text text-transparent">
                    InsightSheet<span className="text-purple-400">-lite</span>
                  </h1>
                  <p className="text-xs text-purple-400 font-medium tracking-wider">DATA MADE SIMPLE</p>
                </div>
              </div>
            </Link>

            <div className="hidden md:flex items-center gap-2">
              <Link 
                to={createPageUrl('Upload')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all font-medium ${
                  isActive(createPageUrl('Upload'))
                    ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg shadow-purple-500/50'
                    : 'text-purple-300 hover:bg-purple-900/50 hover:text-purple-100'
                }`}
              >
                <Upload className="w-4 h-4" />
                <span>CSV Upload</span>
              </Link>
              
              <Link 
                to={createPageUrl('Dashboard')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all font-medium ${
                  isActive(createPageUrl('Dashboard'))
                    ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg shadow-purple-500/50'
                    : 'text-purple-300 hover:bg-purple-900/50 hover:text-purple-100'
                }`}
              >
                <LayoutDashboard className="w-4 h-4" />
                <span>Dashboard</span>
              </Link>

              <Link 
                to={createPageUrl('AgenticAI')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all font-medium ${
                  isActive(createPageUrl('AgenticAI'))
                    ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg shadow-purple-500/50'
                    : 'text-purple-300 hover:bg-purple-900/50 hover:text-purple-100'
                }`}
              >
                <Brain className="w-4 h-4" />
                <span>Agentic AI</span>
              </Link>

              <Link 
                to={createPageUrl('FileToPPT')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all font-medium ${
                  isActive(createPageUrl('FileToPPT'))
                    ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg shadow-purple-500/50'
                    : 'text-purple-300 hover:bg-purple-900/50 hover:text-purple-100'
                }`}
              >
                <FileText className="w-4 h-4" />
                <span>File to PPT</span>
              </Link>

              <Link 
                to={createPageUrl('FilenameCleaner')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all font-medium ${
                  isActive(createPageUrl('FilenameCleaner'))
                    ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg shadow-purple-500/50'
                    : 'text-purple-300 hover:bg-purple-900/50 hover:text-purple-100'
                }`}
              >
                <FileArchive className="w-4 h-4" />
                <span>ZIP Cleaner</span>
              </Link>

              <Link 
                to={createPageUrl('Pricing')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all font-medium ${
                  isActive(createPageUrl('Pricing'))
                    ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg shadow-purple-500/50'
                    : 'text-purple-300 hover:bg-purple-900/50 hover:text-purple-100'
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
                        ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg shadow-purple-500/50'
                        : 'text-purple-300 hover:bg-purple-900/50 hover:text-purple-100'
                    }`}
                  >
                    <DollarSign className="w-4 h-4" />
                    <span>Admin</span>
                  </Link>
                  
                  <Link 
                    to={createPageUrl('UserManagement')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all font-medium ${
                      isActive(createPageUrl('UserManagement'))
                        ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg shadow-purple-500/50'
                        : 'text-purple-300 hover:bg-purple-900/50 hover:text-purple-100'
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
                        : 'text-emerald-300 hover:bg-emerald-900/50 hover:text-emerald-100'
                    }`}
                  >
                    <Download className="w-4 h-4" />
                    <span>Backup Code</span>
                  </Link>
                </>
              )}

              {user ? (
                <div className="ml-4 flex items-center gap-3">
                  <span className="text-sm text-purple-300">{user.email}</span>
                  <button
                    onClick={handleLogout}
                    className="text-sm text-purple-400 hover:text-purple-200 font-medium"
                  >
                    Logout
                  </button>
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
      <footer className="border-t border-purple-800/30 bg-slate-900/90 mt-auto">
        <div className="container mx-auto px-4 py-8">
          <div className="grid md:grid-cols-3 gap-8">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl flex items-center justify-center shadow-lg shadow-purple-500/50">
                  <Sparkles className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-lg font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                    InsightSheet<span className="text-purple-400">-lite</span>
                  </h1>
                </div>
              </div>
              <p className="text-sm text-purple-300">
                Privacy-first data & file management
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-purple-200 mb-3">Legal</h3>
              <div className="space-y-2">
                <Link 
                  to={createPageUrl('Privacy')}
                  className="flex items-center gap-2 text-sm text-purple-400 hover:text-purple-200 transition-colors"
                >
                  <Shield className="w-4 h-4" />
                  Privacy Policy
                </Link>
                <Link 
                  to={createPageUrl('Disclaimer')}
                  className="flex items-center gap-2 text-sm text-purple-400 hover:text-purple-200 transition-colors"
                >
                  <AlertTriangle className="w-4 h-4" />
                  Disclaimer & Terms
                </Link>
              </div>
            </div>

            <div>
              <div className="bg-gradient-to-br from-purple-900/50 to-pink-900/50 border border-purple-500/30 rounded-xl p-4 backdrop-blur-sm">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="w-5 h-5 text-purple-400" />
                  <span className="font-semibold text-purple-200 text-sm">Privacy First</span>
                </div>
                <p className="text-xs text-purple-300 leading-relaxed">
                  100% browser processing<br />
                  Zero data storage<br />
                  No tracking
                </p>
              </div>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-purple-800/30 text-center">
            <p className="text-sm text-purple-400">
              © 2024 InsightSheet-lite • All rights reserved
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

