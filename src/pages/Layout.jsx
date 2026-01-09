

// Layout.jsx - Remove Workflow, Excel-to-PPT, add Agentic AI
import React, { useCallback } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { LayoutDashboard, DollarSign, FileText, Shield, AlertTriangle, Sparkles, FileArchive, Users, Download, Brain, BarChart3, MessageSquareText, FileSpreadsheet, Database, MessageSquare, X, Menu } from 'lucide-react';
import SubscriptionChecker from '@/components/subscription/SubscriptionChecker';
import Logo from '@/components/branding/Logo';
import { meldraAi } from '@/api/meldraClient';
import { LoginHistory } from '@/api/entities';
import { getIPAndLocation, getBrowserInfo } from '@/components/tracking/ActivityLogger';
import ActivityLogger from '@/components/tracking/ActivityLogger';

export default function Layout({ children }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [user, setUser] = React.useState(null);
  const [loginTime, setLoginTime] = React.useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  
  const loadUser = useCallback(async () => {
    try {
      // Check if token exists first
      const token = localStorage.getItem('auth_token');
      if (!token) {
        setUser(null);
        return;
      }

      const currentUser = await meldraAi.auth.me();
      
      // Only set user if we got valid user data
      if (currentUser && currentUser.email) {
        setUser(currentUser);
        
        const loginTimestamp = Date.now();
        setLoginTime(loginTimestamp);
        sessionStorage.setItem('loginTime', loginTimestamp.toString());
        
        const sessionLogged = sessionStorage.getItem('sessionLogged');
        if (!sessionLogged) {
          await logLogin(currentUser.email);
          sessionStorage.setItem('sessionLogged', 'true');
        }
      } else {
        setUser(null);
      }
    } catch (error) {
      // User not logged in - clear any stale data
      // Only log if it's not an expected authentication error
      if (!error.message || (!error.message.includes('Not authenticated') && !error.message.includes('Unauthorized'))) {
        console.error('Error loading user:', error);
      }
      setUser(null);
      localStorage.removeItem('auth_token');
      sessionStorage.removeItem('sessionLogged');
      sessionStorage.removeItem('loginTime');
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
      } catch (error) {
        console.error('Error logging logout:', error);
      }
    }

    // Clear all auth data
    await meldraAi.auth.logout();
    setUser(null);
    setLoginTime(null);
    sessionStorage.removeItem('sessionLogged');
    sessionStorage.removeItem('loginTime');
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user');
    
    // Redirect to login page
    navigate('/Login');
  };
  
  const isActive = (path) => location.pathname === path;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Navigation */}
      <nav className="border-b border-slate-200 dark:border-slate-800 backdrop-blur-xl bg-white/95 dark:bg-slate-900/95 sticky top-0 z-50 shadow-sm">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <Link to={user && user.email ? createPageUrl('Dashboard') : '/pricing'} className="group">
              <Logo size="medium" className="group-hover:opacity-80 transition-opacity" />
            </Link>

            <div className="hidden md:flex items-center gap-2">
              {/* Show menu items only when user is logged in */}
              {user && user.email ? (
                <>
                  <Link 
                    to={createPageUrl('Dashboard')}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-lg transition-all duration-200 text-sm font-medium ${
                      isActive(createPageUrl('Dashboard'))
                        ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg shadow-blue-500/30 scale-105 font-semibold'
                        : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-blue-600 dark:hover:text-blue-400 hover:scale-105'
                    }`}
                  >
                    <LayoutDashboard className={`w-4 h-4 ${isActive(createPageUrl('Dashboard')) ? 'text-white' : ''}`} />
                    <span>Dashboard</span>
                  </Link>

                  <Link
                    to={createPageUrl('FileAnalyzer')}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-lg transition-all duration-200 text-sm font-medium ${
                      isActive(createPageUrl('FileAnalyzer'))
                        ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg shadow-blue-500/30 scale-105 font-semibold'
                        : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-blue-600 dark:hover:text-blue-400 hover:scale-105'
                    }`}
                  >
                    <BarChart3 className={`w-4 h-4 ${isActive(createPageUrl('FileAnalyzer')) ? 'text-white' : ''}`} />
                    <span>Analyzer</span>
                  </Link>

                  <Link
                    to={createPageUrl('PLBuilder')}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-lg transition-all duration-200 text-sm font-medium ${
                      isActive(createPageUrl('PLBuilder'))
                        ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg shadow-blue-500/30 scale-105 font-semibold'
                        : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-blue-600 dark:hover:text-blue-400 hover:scale-105'
                    }`}
                  >
                    <FileSpreadsheet className={`w-4 h-4 ${isActive(createPageUrl('PLBuilder')) ? 'text-white' : ''}`} />
                    <span>P&L Builder</span>
                  </Link>

                  <Link
                    to={createPageUrl('AgenticAI')}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-lg transition-all duration-200 text-sm font-medium ${
                      isActive(createPageUrl('AgenticAI'))
                        ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg shadow-blue-500/30 scale-105 font-semibold'
                        : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-blue-600 dark:hover:text-blue-400 hover:scale-105'
                    }`}
                  >
                    <Brain className={`w-4 h-4 ${isActive(createPageUrl('AgenticAI')) ? 'text-white' : ''}`} />
                    <span>AI Assistant</span>
                  </Link>

                  <Link
                    to={createPageUrl('DataModelCreator')}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-lg transition-all duration-200 text-sm font-medium ${
                      isActive(createPageUrl('DataModelCreator'))
                        ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg shadow-blue-500/30 scale-105 font-semibold'
                        : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-blue-600 dark:hover:text-blue-400 hover:scale-105'
                    }`}
                  >
                    <Database className={`w-4 h-4 ${isActive(createPageUrl('DataModelCreator')) ? 'text-white' : ''}`} />
                    <span>DB Schema</span>
                  </Link>

                  <Link
                    to={createPageUrl('FileToPPT')}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-lg transition-all duration-200 text-sm font-medium ${
                      isActive(createPageUrl('FileToPPT'))
                        ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg shadow-blue-500/30 scale-105 font-semibold'
                        : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-blue-600 dark:hover:text-blue-400 hover:scale-105'
                    }`}
                  >
                    <FileText className={`w-4 h-4 ${isActive(createPageUrl('FileToPPT')) ? 'text-white' : ''}`} />
                    <span>Excel to PPT</span>
                  </Link>

                  <Link 
                    to={createPageUrl('FilenameCleaner')}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-lg transition-all duration-200 text-sm font-medium ${
                      isActive(createPageUrl('FilenameCleaner'))
                        ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg shadow-blue-500/30 scale-105 font-semibold'
                        : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-blue-600 dark:hover:text-blue-400 hover:scale-105'
                    }`}
                  >
                    <FileArchive className={`w-4 h-4 ${isActive(createPageUrl('FilenameCleaner')) ? 'text-white' : ''}`} />
                    <span>ZIP Cleaner</span>
                  </Link>

                  <Link
                    to={createPageUrl('Reviews')}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-lg transition-all duration-200 text-sm font-medium ${
                      isActive(createPageUrl('Reviews'))
                        ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg shadow-blue-500/30 scale-105 font-semibold'
                        : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-blue-600 dark:hover:text-blue-400 hover:scale-105'
                    }`}
                  >
                    <MessageSquare className={`w-4 h-4 ${isActive(createPageUrl('Reviews')) ? 'text-white' : ''}`} />
                    <span>Reviews</span>
                  </Link>
                </>
              ) : (
                /* Show only Pricing link when not logged in */
                <Link
                  to="/pricing"
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all font-medium text-sm ${
                    isActive('/pricing') || isActive('/')
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <DollarSign className="w-4 h-4" />
                  <span>Pricing</span>
                </Link>
              )}

              {user && user.email === 'sumit@meldra.ai' && (
                <>
                  <Link 
                    to={createPageUrl('AdminDashboard')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all font-medium text-sm ${
                      isActive(createPageUrl('AdminDashboard'))
                        ? 'bg-blue-600 text-white shadow-md'
                        : 'text-slate-900 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 font-medium'
                    }`}
                  >
                    <DollarSign className="w-4 h-4" />
                    <span>Admin</span>
                  </Link>
                  
                  <Link 
                    to={createPageUrl('UserManagement')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all font-medium text-sm ${
                      isActive(createPageUrl('UserManagement'))
                        ? 'bg-blue-600 text-white shadow-md'
                        : 'text-slate-900 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 font-medium'
                    }`}
                  >
                    <Users className="w-4 h-4" />
                    <span>Users</span>
                  </Link>

                  <Link 
                    to={createPageUrl('DownloadCode')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all font-medium text-sm ${
                      isActive(createPageUrl('DownloadCode'))
                        ? 'bg-blue-600 text-white shadow-md'
                        : 'text-slate-900 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 font-medium'
                    }`}
                  >
                    <Download className="w-4 h-4" />
                    <span>Backup Code</span>
                  </Link>
                </>
              )}

              {user && user.email ? (
                <div className="ml-4 flex items-center gap-3 pl-4 border-l border-slate-200 dark:border-slate-700">
                  <span className="text-sm text-slate-700 dark:text-slate-300 font-medium hidden sm:inline max-w-[150px] truncate">{user.email}</span>
                  <Link
                    to={createPageUrl('Security')}
                    className="px-3 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-all font-medium"
                    title="Security Settings"
                  >
                    <Shield className="w-4 h-4" />
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="px-4 py-2 text-sm text-white bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 rounded-lg transition-all font-semibold shadow-md hover:shadow-lg"
                  >
                    Logout
                  </button>
                </div>
              ) : (
                <Link
                  to="/Login"
                  className="ml-4 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all shadow-md hover:shadow-lg font-semibold"
                >
                  Login
                </Link>
              )}
            </div>

            {/* Mobile menu button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>

          {/* Mobile menu */}
          {mobileMenuOpen && (
            <div className="md:hidden border-t border-slate-200 dark:border-slate-800 py-4 space-y-2">
              {user && user.email ? (
                <>
                  <Link 
                    to={createPageUrl('Dashboard')}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-lg transition-all font-medium text-sm ${
                      isActive(createPageUrl('Dashboard'))
                        ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg font-semibold'
                        : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <LayoutDashboard className="w-4 h-4" />
                    <span>Dashboard</span>
                  </Link>
                  <Link
                    to={createPageUrl('FileAnalyzer')}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-lg transition-all font-medium text-sm ${
                      isActive(createPageUrl('FileAnalyzer'))
                        ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg font-semibold'
                        : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <BarChart3 className="w-4 h-4" />
                    <span>Analyzer</span>
                  </Link>
                  <Link
                    to={createPageUrl('PLBuilder')}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-lg transition-all font-medium text-sm ${
                      isActive(createPageUrl('PLBuilder'))
                        ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg font-semibold'
                        : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <FileSpreadsheet className="w-4 h-4" />
                    <span>P&L Builder</span>
                  </Link>
                  <Link
                    to={createPageUrl('AgenticAI')}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-lg transition-all font-medium text-sm ${
                      isActive(createPageUrl('AgenticAI'))
                        ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg font-semibold'
                        : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <Brain className="w-4 h-4" />
                    <span>AI Assistant</span>
                  </Link>
                  <Link
                    to={createPageUrl('DataModelCreator')}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-lg transition-all font-medium text-sm ${
                      isActive(createPageUrl('DataModelCreator'))
                        ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg font-semibold'
                        : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <Database className="w-4 h-4" />
                    <span>DB Schema</span>
                  </Link>
                  <Link
                    to={createPageUrl('FileToPPT')}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-lg transition-all font-medium text-sm ${
                      isActive(createPageUrl('FileToPPT'))
                        ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg font-semibold'
                        : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <FileText className="w-4 h-4" />
                    <span>Excel to PPT</span>
                  </Link>
                  <Link 
                    to={createPageUrl('FilenameCleaner')}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-lg transition-all font-medium text-sm ${
                      isActive(createPageUrl('FilenameCleaner'))
                        ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg font-semibold'
                        : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <FileArchive className="w-4 h-4" />
                    <span>ZIP Cleaner</span>
                  </Link>
                  <Link
                    to={createPageUrl('Reviews')}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-lg transition-all font-medium text-sm ${
                      isActive(createPageUrl('Reviews'))
                        ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg font-semibold'
                        : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <MessageSquare className="w-4 h-4" />
                    <span>Reviews</span>
                  </Link>
                  <div className="pt-2 border-t border-slate-200 dark:border-slate-800 mt-2 space-y-2">
                    <Link
                      to={createPageUrl('Security')}
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 font-medium text-sm"
                    >
                      <Shield className="w-4 h-4" />
                      <span>Security</span>
                    </Link>
                    <button
                      onClick={() => {
                        setMobileMenuOpen(false);
                        handleLogout();
                      }}
                      className="w-full flex items-center gap-2 px-4 py-2.5 rounded-lg text-white bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 font-semibold text-sm"
                    >
                      Logout
                    </button>
                  </div>
                </>
              ) : (
                <Link 
                  to="/pricing"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-lg transition-all font-medium text-sm ${
                    isActive('/pricing') || isActive('/')
                      ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg font-semibold'
                      : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <DollarSign className="w-4 h-4" />
                  <span>Pricing</span>
                </Link>
              )}
            </div>
          )}
        </div>
      </nav>

      {/* Main content */}
      <SubscriptionChecker>
        <ActivityLogger>
          <main className="min-h-[calc(100vh-16rem)] bg-white dark:bg-slate-950">
            <div className="container mx-auto px-4 py-8">
              {children}
            </div>
          </main>
        </ActivityLogger>
      </SubscriptionChecker>

      {/* Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 mt-auto">
        <div className="container mx-auto px-4 py-8">
          <div className="grid md:grid-cols-3 gap-8 items-start">
            <div className="min-w-0">
              <Logo size="medium" showText={true} />
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">
                Privacy-first data & file management
              </p>
            </div>

            <div className="min-w-0">
              <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-3">Legal</h3>
              <div className="space-y-2">
                <Link 
                  to={createPageUrl('Privacy')}
                  className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition-colors"
                >
                  <Shield className="w-4 h-4 flex-shrink-0" />
                  <span>Privacy Policy</span>
                </Link>
                <Link 
                  to={createPageUrl('Disclaimer')}
                  className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition-colors"
                >
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  <span>Disclaimer & Terms</span>
                </Link>
              </div>
            </div>

            <div className="min-w-0">
              <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-xl p-4 h-full">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                  <span className="font-semibold text-slate-900 dark:text-slate-100 text-sm">Privacy First</span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  100% browser processing<br />
                  Zero data storage<br />
                  No tracking
                </p>
              </div>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-800 text-center">
            <p className="text-sm text-slate-600 dark:text-slate-400">
              © 2026 Meldra • All rights reserved
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

