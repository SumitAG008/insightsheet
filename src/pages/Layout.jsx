

// Layout.jsx - Remove Workflow, Excel-to-PPT, add Agentic AI
import React, { useCallback, useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { LayoutDashboard, DollarSign, FileText, FileType, Shield, AlertTriangle, Sparkles, FileArchive, Users, Download, Brain, BarChart3, MessageSquareText, FileSpreadsheet, Database, MessageSquare, X, Menu, Plug, ScanLine, ChevronDown } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import SubscriptionChecker from '@/components/subscription/SubscriptionChecker';
import Logo from '@/components/branding/Logo';
import { meldraAi } from '@/api/meldraClient';
import { LoginHistory } from '@/api/entities';
import { getIPAndLocation, getBrowserInfo } from '@/components/tracking/ActivityLogger';
import ActivityLogger from '@/components/tracking/ActivityLogger';
import LogoutWarningModal from '@/components/common/LogoutWarningModal';

export default function Layout({ children, currentPageName }) {
  const location = useLocation();
  const isHome = currentPageName === 'Dashboard';
  const navigate = useNavigate();
  const [user, setUser] = React.useState(null);
  const [loginTime, setLoginTime] = React.useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const [showLogoutWarning, setShowLogoutWarning] = React.useState(false);
  const [pendingLogout, setPendingLogout] = React.useState(false);
  
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

  const handleLogoutClick = () => {
    setShowLogoutWarning(true);
  };

  const handleLogoutConfirm = async () => {
    setShowLogoutWarning(false);
    setPendingLogout(true);
    
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

    // Clear all app data (session + local: auth, user, agent_history, OCR draft, etc.)
    meldraAi.auth.logout();
    setUser(null);
    setLoginTime(null);

    // Redirect to login page
    navigate('/Login');
  };

  // Handle browser close/refresh warning
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      // Only show warning if user has active session data (sheet data, DB connection, etc.)
      const hasDbConnection = sessionStorage.getItem('db_connection');
      const hasData = sessionStorage.getItem('insightsheet_data') || hasDbConnection;
      
      if (hasData && user) {
        e.preventDefault();
        e.returnValue = 'You have unsaved work. All data will be permanently deleted when you close this window. Are you sure you want to leave?';
        return e.returnValue;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [user]);
  
  const isActive = (path) => location.pathname === path;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Navigation */}
      <nav className="border-b border-slate-200 dark:border-slate-800 backdrop-blur-xl bg-white/95 dark:bg-slate-900/95 sticky top-0 z-50 shadow-sm">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <Link to={user && user.email ? createPageUrl('Dashboard') : '/pricing'} className="group">
              <Logo size="medium" className="group-hover:opacity-80 transition-opacity" lowercaseM={isHome} />
            </Link>

            <div className="hidden md:flex items-center gap-2">
              {/* Show menu items only when user is logged in */}
              {user && user.email ? (
                <>
                  {/* Dashboard — standalone */}
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

                  {/* File Analysis — group */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        type="button"
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-lg transition-all duration-200 text-sm font-medium ${
                          [createPageUrl('FileAnalyzer'), createPageUrl('PLBuilder')].some(p => isActive(p))
                            ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg shadow-blue-500/30 font-semibold'
                            : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-blue-600 dark:hover:text-blue-400 data-[state=open]:bg-slate-100 data-[state=open]:dark:bg-slate-800'
                        }`}
                      >
                        <BarChart3 className="w-4 h-4" />
                        <span>File Analysis</span>
                        <ChevronDown className="w-4 h-4 opacity-70" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="min-w-[200px] bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xl">
                      <DropdownMenuLabel className="text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider">File Analysis</DropdownMenuLabel>
                      <DropdownMenuItem asChild>
                        <Link to={createPageUrl('FileAnalyzer')} className="flex items-center gap-2 cursor-pointer">
                          <BarChart3 className="w-4 h-4" />
                          Analyzer
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link to={createPageUrl('PLBuilder')} className="flex items-center gap-2 cursor-pointer">
                          <FileSpreadsheet className="w-4 h-4" />
                          P&L Builder
                        </Link>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>

                  {/* AI Assistant — standalone */}
                  <Link
                    to={createPageUrl('AgenticAI')}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-lg transition-all duration-200 text-sm font-semibold ${
                      isActive(createPageUrl('AgenticAI'))
                        ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg shadow-blue-500/30 scale-105'
                        : 'text-slate-800 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-blue-600 dark:hover:text-blue-400 hover:scale-105'
                    }`}
                  >
                    <Brain className={`w-4 h-4 ${isActive(createPageUrl('AgenticAI')) ? 'text-white' : 'text-blue-500'}`} />
                    <span>AI Assistant</span>
                  </Link>

                  {/* Data & Schema — group */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        type="button"
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-lg transition-all duration-200 text-sm font-medium ${
                          [createPageUrl('DataModelCreator'), createPageUrl('DatabaseConnection')].some(p => isActive(p))
                            ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg shadow-blue-500/30 font-semibold'
                            : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-blue-600 dark:hover:text-blue-400 data-[state=open]:bg-slate-100 data-[state=open]:dark:bg-slate-800'
                        }`}
                      >
                        <Database className="w-4 h-4" />
                        <span>Data & Schema</span>
                        <ChevronDown className="w-4 h-4 opacity-70" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="min-w-[200px] bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xl">
                      <DropdownMenuLabel className="text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider">Data & Schema</DropdownMenuLabel>
                      <DropdownMenuItem asChild>
                        <Link to={createPageUrl('DataModelCreator')} className="flex items-center gap-2 cursor-pointer">
                          <Database className="w-4 h-4" />
                          DB Schema
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link to={createPageUrl('DatabaseConnection')} className="flex items-center gap-2 cursor-pointer">
                          <Plug className="w-4 h-4" />
                          DB Connect
                        </Link>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>

                  {/* File Conversion — group */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        type="button"
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-lg transition-all duration-200 text-sm font-medium ${
                          [createPageUrl('FileToPPT'), createPageUrl('OCRConverter'), createPageUrl('PdfDocConverter'), createPageUrl('FilenameCleaner')].some(p => isActive(p))
                            ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg shadow-blue-500/30 font-semibold'
                            : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-blue-600 dark:hover:text-blue-400 data-[state=open]:bg-slate-100 data-[state=open]:dark:bg-slate-800'
                        }`}
                      >
                        <FileText className="w-4 h-4" />
                        <span>File Conversion</span>
                        <ChevronDown className="w-4 h-4 opacity-70" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="min-w-[200px] bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xl">
                      <DropdownMenuLabel className="text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider">File Conversion</DropdownMenuLabel>
                      <DropdownMenuItem asChild>
                        <Link to={createPageUrl('FileToPPT')} className="flex items-center gap-2 cursor-pointer">
                          <FileText className="w-4 h-4" />
                          Excel to PPT
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link to={createPageUrl('OCRConverter')} className="flex items-center gap-2 cursor-pointer">
                          <ScanLine className="w-4 h-4" />
                          OCR to DOC/PDF
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link to={createPageUrl('PdfDocConverter')} className="flex items-center gap-2 cursor-pointer">
                          <FileType className="w-4 h-4" />
                          Document Converter (PDF / DOC / PPT)
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link to={createPageUrl('FilenameCleaner')} className="flex items-center gap-2 cursor-pointer">
                          <FileArchive className="w-4 h-4" />
                          ZIP Cleaner
                        </Link>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>

                  {/* Reviews — standalone */}
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
                  <Link 
                    to={createPageUrl('IPTracking')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all font-medium text-sm ${
                      isActive(createPageUrl('IPTracking'))
                        ? 'bg-blue-600 text-white shadow-md'
                        : 'text-slate-900 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 font-medium'
                    }`}
                  >
                    <Shield className="w-4 h-4" />
                    <span>IP Tracking</span>
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
                    onClick={handleLogoutClick}
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
            <div className="md:hidden border-t border-slate-200 dark:border-slate-800 py-4 space-y-1">
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

                  <p className="px-4 pt-3 pb-1 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">File Analysis</p>
                  <Link to={createPageUrl('FileAnalyzer')} onClick={() => setMobileMenuOpen(false)} className={`flex items-center gap-2 px-4 py-2.5 rounded-lg transition-all font-medium text-sm ${isActive(createPageUrl('FileAnalyzer')) ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg font-semibold' : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>
                    <BarChart3 className="w-4 h-4" /> <span>Analyzer</span>
                  </Link>
                  <Link to={createPageUrl('PLBuilder')} onClick={() => setMobileMenuOpen(false)} className={`flex items-center gap-2 px-4 py-2.5 rounded-lg transition-all font-medium text-sm ${isActive(createPageUrl('PLBuilder')) ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg font-semibold' : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>
                    <FileSpreadsheet className="w-4 h-4" /> <span>P&L Builder</span>
                  </Link>

                  <Link to={createPageUrl('AgenticAI')} onClick={() => setMobileMenuOpen(false)} className={`flex items-center gap-2 px-4 py-2.5 rounded-lg transition-all font-semibold text-sm ${isActive(createPageUrl('AgenticAI')) ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg' : 'text-slate-800 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>
                    <Brain className={`w-4 h-4 ${isActive(createPageUrl('AgenticAI')) ? 'text-white' : 'text-blue-500'}`} /> <span>AI Assistant</span>
                  </Link>

                  <p className="px-4 pt-3 pb-1 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Data & Schema</p>
                  <Link to={createPageUrl('DataModelCreator')} onClick={() => setMobileMenuOpen(false)} className={`flex items-center gap-2 px-4 py-2.5 rounded-lg transition-all font-medium text-sm ${isActive(createPageUrl('DataModelCreator')) ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg font-semibold' : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>
                    <Database className="w-4 h-4" /> <span>DB Schema</span>
                  </Link>
                  <Link to={createPageUrl('DatabaseConnection')} onClick={() => setMobileMenuOpen(false)} className={`flex items-center gap-2 px-4 py-2.5 rounded-lg transition-all font-medium text-sm ${isActive(createPageUrl('DatabaseConnection')) ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg font-semibold' : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>
                    <Plug className="w-4 h-4" /> <span>DB Connect</span>
                  </Link>

                  <p className="px-4 pt-3 pb-1 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">File Conversion</p>
                  <Link to={createPageUrl('FileToPPT')} onClick={() => setMobileMenuOpen(false)} className={`flex items-center gap-2 px-4 py-2.5 rounded-lg transition-all font-medium text-sm ${isActive(createPageUrl('FileToPPT')) ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg font-semibold' : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>
                    <FileText className="w-4 h-4" /> <span>Excel to PPT</span>
                  </Link>
                  <Link to={createPageUrl('OCRConverter')} onClick={() => setMobileMenuOpen(false)} className={`flex items-center gap-2 px-4 py-2.5 rounded-lg transition-all font-medium text-sm ${isActive(createPageUrl('OCRConverter')) ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg font-semibold' : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>
                    <ScanLine className="w-4 h-4" /> <span>OCR to DOC/PDF</span>
                  </Link>
                  <Link to={createPageUrl('PdfDocConverter')} onClick={() => setMobileMenuOpen(false)} className={`flex items-center gap-2 px-4 py-2.5 rounded-lg transition-all font-medium text-sm ${isActive(createPageUrl('PdfDocConverter')) ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg font-semibold' : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>
                    <FileType className="w-4 h-4" /> <span>Document Converter (PDF / DOC / PPT)</span>
                  </Link>
                  <Link to={createPageUrl('FilenameCleaner')} onClick={() => setMobileMenuOpen(false)} className={`flex items-center gap-2 px-4 py-2.5 rounded-lg transition-all font-medium text-sm ${isActive(createPageUrl('FilenameCleaner')) ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg font-semibold' : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>
                    <FileArchive className="w-4 h-4" /> <span>ZIP Cleaner</span>
                  </Link>

                  <Link to={createPageUrl('Reviews')} onClick={() => setMobileMenuOpen(false)} className={`flex items-center gap-2 px-4 py-2.5 rounded-lg transition-all font-medium text-sm ${isActive(createPageUrl('Reviews')) ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg font-semibold' : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>
                    <MessageSquare className="w-4 h-4" /> <span>Reviews</span>
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
                        handleLogoutClick();
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
              <Logo size="medium" showText={true} style={{ color: 'inherit' }} lowercaseM={isHome} />
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-2 font-light" style={{ fontFamily: "'Inter', sans-serif", letterSpacing: '-0.01em' }}>
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

      {/* Logout Warning Modal */}
      <LogoutWarningModal
        open={showLogoutWarning}
        onCancel={() => setShowLogoutWarning(false)}
        onConfirm={handleLogoutConfirm}
      />
    </div>
  );
}

