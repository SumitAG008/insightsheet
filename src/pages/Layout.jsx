

// Layout.jsx - Remove Workflow, Excel-to-PPT, add Agentic AI
import React, { useCallback, useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { LayoutDashboard, DollarSign, FileText, FileType, Shield, AlertTriangle, Sparkles, FileArchive, Users, Download, Brain, BarChart3, MessageSquareText, FileSpreadsheet, Database, MessageSquare, X, Menu, Plug, ScanLine, ChevronDown, Code, Settings as SettingsIcon, LogOut, HelpCircle, GitCompareArrows, LineChart, ArrowRightLeft } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import SubscriptionChecker from '@/components/subscription/SubscriptionChecker';
import Logo from '@/components/branding/Logo';
import { meldraAi } from '@/api/meldraClient';
import { LoginHistory } from '@/api/entities';
import { getIPAndLocation, getBrowserInfo } from '@/components/tracking/ActivityLogger';
import ActivityLogger from '@/components/tracking/ActivityLogger';
import LogoutWarningModal from '@/components/common/LogoutWarningModal';
import { clearAllAppSessionData } from '@/utils/clearAppData';
import CookieConsent from '@/components/CookieConsent';
import SupportChatWidget from '@/components/SupportChatWidget';
import OnboardingAssistantModal from '@/components/onboarding/OnboardingAssistantModal';
import { applyPreferences, applyPrimaryColor, applyTheme, getUserPreferences } from '@/lib/userPreferences';
import { useI18n } from '@/lib/i18n';

export default function Layout({ children, currentPageName }) {
  const { t } = useI18n();
  const location = useLocation();
  const isHome = currentPageName === 'Dashboard';
  const navigate = useNavigate();
  const [user, setUser] = React.useState(null);
  const [brandPrefs, setBrandPrefs] = React.useState({ brandName: null, logoUrl: null });
  const [loginTime, setLoginTime] = React.useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const [showLogoutWarning, setShowLogoutWarning] = React.useState(false);
  const [pendingLogout, setPendingLogout] = React.useState(false);
  const [showOnboarding, setShowOnboarding] = React.useState(false);
  
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

        try {
          const prefs = applyPreferences(currentUser.email);
          setBrandPrefs({ brandName: prefs.brandName || null, logoUrl: prefs.logoUrl || null });
        } catch {
          try {
            const prefs = getUserPreferences(currentUser.email);
            setBrandPrefs({ brandName: prefs.brandName || null, logoUrl: prefs.logoUrl || null });
          } catch {
            setBrandPrefs({ brandName: null, logoUrl: null });
          }
        }
        
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


  useEffect(() => {
    const applyFromPrefs = (email) => {
      try {
        const prefs = applyPreferences(email);
        setBrandPrefs({ brandName: prefs.brandName || null, logoUrl: prefs.logoUrl || null });
        try {
          applyTheme(prefs.theme);
          if (prefs.primaryColor) applyPrimaryColor(prefs.primaryColor);
        } catch {
          // ignore
        }
      } catch {
        try {
          const prefs = getUserPreferences(email);
          setBrandPrefs({ brandName: prefs.brandName || null, logoUrl: prefs.logoUrl || null });
          try {
            applyTheme(prefs.theme);
            if (prefs.primaryColor) applyPrimaryColor(prefs.primaryColor);
          } catch {
            // ignore
          }
        } catch {
          setBrandPrefs({ brandName: null, logoUrl: null });
        }
      }
    };

    const email = user?.email || 'anon';
    applyFromPrefs(email);

    const onPrefsChanged = (e) => {
      const nextEmail = e?.detail?.email || user?.email || 'anon';
      applyFromPrefs(nextEmail);
    };

    window.addEventListener('prefs:changed', onPrefsChanged);
    return () => window.removeEventListener('prefs:changed', onPrefsChanged);
  }, [user?.email]);

  useEffect(() => {
    if (!user?.email) return;

    let mode = '';
    try {
      const sp = new URLSearchParams(location.search);
      mode = (sp.get('onboarding') || '').trim().toLowerCase();
    } catch {
      mode = '';
    }

    const key = `onboarding_completed:${user.email}`;

    if (mode === 'reset') {
      try {
        localStorage.removeItem(key);
      } catch {
        // ignore
      }
      setShowOnboarding(true);
      return;
    }

    if (mode === '1') {
      setShowOnboarding(true);
      return;
    }

    let completed = false;
    try {
      completed = localStorage.getItem(key) === '1';
    } catch {
      completed = false;
    }

    if (!completed) {
      setShowOnboarding(true);
    }
  }, [user?.email, location.search]);

  const canAccessAgenticWorkflows = (user?.email || '').toLowerCase().trim() === 'sumitagaraia@gmail.com';


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
    clearAllAppSessionData();
    meldraAi.auth.logout();
    setUser(null);
    setLoginTime(null);

    // Redirect to login page
    navigate('/Login');
  };

  const handleOnboardingOpenChange = (open) => {
    setShowOnboarding(open);
    if (!open && user?.email) {
      try {
        localStorage.setItem(`onboarding_completed:${user.email}`, '1');
      } catch {
        // ignore
      }
    }
  };

  const openOnboarding = () => {
    setShowOnboarding(true);
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
    <div className="min-h-screen app-premium-bg dark:bg-slate-950">
      {/* Navigation */}
      <nav className="glass-surface-strong dark:bg-slate-900/95 dark:border-slate-800 sticky top-0 z-50">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <Link
              to={user && user.email ? createPageUrl('Dashboard') : '/pricing'}
              className="group rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              <Logo
                size="medium"
                className="group-hover:opacity-80 transition-opacity"
                lowercaseM
                brandName={brandPrefs.brandName}
                logoUrl={brandPrefs.logoUrl}
              />
            </Link>

            <div className="hidden xl:flex items-center gap-1 [&>a>svg:first-child]:hidden [&>button>svg:first-child]:hidden 2xl:[&>a>svg:first-child]:block 2xl:[&>button>svg:first-child]:block">
              {/* Show menu items only when user is logged in */}
              {user && user.email ? (
                <>
                  {/* Dashboard — group */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        type="button"
                        className={`flex items-center gap-2 px-3 py-2.5 rounded-lg transition-all duration-200 text-sm font-medium ${
                          [createPageUrl('Dashboard')].some(p => isActive(p))
                            ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg shadow-blue-500/30 scale-105 font-semibold'
                            : 'text-slate-900 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-blue-700 dark:hover:text-blue-400 data-[state=open]:bg-slate-100 data-[state=open]:dark:bg-slate-800'
                        }`}
                      >
                        <LayoutDashboard className="w-4 h-4" />
                        <span>{t('nav_dashboard')}</span>
                        <ChevronDown className="w-4 h-4 opacity-70" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="min-w-[220px] bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xl">
                      <DropdownMenuLabel className="text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider">{t('nav_dashboard')}</DropdownMenuLabel>
                      <DropdownMenuItem asChild>
                        <Link to={createPageUrl('Dashboard')} className="flex items-center gap-2 cursor-pointer">
                          <LayoutDashboard className="w-4 h-4" />
                          {t('nav_overview')}
                        </Link>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>

                  {/* File Analysis — group */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        type="button"
                        className={`flex items-center gap-2 px-3 py-2.5 rounded-lg transition-all duration-200 text-sm font-medium ${
                          [createPageUrl('FileAnalyzer'), createPageUrl('PLBuilder'), createPageUrl('AutoStandardize'), createPageUrl('Reconciliation')].some(p => isActive(p))
                            ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg shadow-blue-500/30 font-semibold'
                            : 'text-slate-900 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-blue-700 dark:hover:text-blue-400 data-[state=open]:bg-slate-100 data-[state=open]:dark:bg-slate-800'
                        }`}
                      >
                        <BarChart3 className="w-4 h-4" />
                        <span>{t('nav_file_analysis')}</span>
                        <ChevronDown className="w-4 h-4 opacity-70" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="min-w-[200px] bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xl">
                      <DropdownMenuLabel className="text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider">{t('nav_file_analysis')}</DropdownMenuLabel>
                      <DropdownMenuItem asChild>
                        <Link to={createPageUrl('FileAnalyzer')} className="flex items-center gap-2 cursor-pointer">
                          <BarChart3 className="w-4 h-4" />
                          {t('nav_analyzer')}
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link to={createPageUrl('AutoStandardize')} className="flex items-center gap-2 cursor-pointer">
                          <Sparkles className="w-4 h-4" />
                          {t('nav_auto_standardize')}
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link to={createPageUrl('Reconciliation')} className="flex items-center gap-2 cursor-pointer">
                          <GitCompareArrows className="w-4 h-4" />
                          {t('nav_reconciliation')}
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link to={createPageUrl('PLBuilder')} className="flex items-center gap-2 cursor-pointer">
                          <FileSpreadsheet className="w-4 h-4" />
                          {t('nav_pl_builder')}
                        </Link>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>

                  {/* AI Assistant — group */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        type="button"
                        className={`flex items-center gap-2 px-3 py-2.5 rounded-lg transition-all duration-200 text-sm font-medium ${
                          [createPageUrl('AgenticAI'), ...(canAccessAgenticWorkflows ? [createPageUrl('AgenticWorkflows')] : [])].some(p => isActive(p))
                            ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg shadow-blue-500/30 font-semibold'
                            : 'text-slate-900 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-blue-700 dark:hover:text-blue-400 data-[state=open]:bg-slate-100 data-[state=open]:dark:bg-slate-800'
                        }`}
                      >
                        <Brain className="w-4 h-4" />
                        <span>{t('nav_ai_assistant')}</span>
                        <ChevronDown className="w-4 h-4 opacity-70" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="min-w-[220px] bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xl">
                      <DropdownMenuLabel className="text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider">{t('nav_ai_assistant')}</DropdownMenuLabel>
                      <DropdownMenuItem asChild>
                        <Link to={createPageUrl('AgenticAI')} className="flex items-center gap-2 cursor-pointer">
                          <Brain className="w-4 h-4" />
                          AI Assistant
                        </Link>
                      </DropdownMenuItem>
                      {canAccessAgenticWorkflows && (
                        <DropdownMenuItem asChild>
                          <Link to={createPageUrl('AgenticWorkflows')} className="flex items-center gap-2 cursor-pointer">
                            <Sparkles className="w-4 h-4" />
                            Agentic Workflows (Beta)
                          </Link>
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>

                  {/* Unified Reporting */}
                  <Link
                    to="/unified-reporting"
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-lg transition-all duration-200 text-sm font-medium ${
                      isActive('/unified-reporting')
                        ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg shadow-blue-500/30 font-semibold'
                        : 'text-slate-900 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-blue-700 dark:hover:text-blue-400'
                    }`}
                  >
                    <LineChart className="w-4 h-4" />
                    <span>{t('nav_unified_reporting')}</span>
                  </Link>

                  {/* Next-Gen Migration */}
                  <Link
                    to="/migration"
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-lg transition-all duration-200 text-sm font-medium ${
                      isActive('/migration')
                        ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg shadow-blue-500/30 font-semibold'
                        : 'text-slate-900 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-blue-700 dark:hover:text-blue-400'
                    }`}
                  >
                    <ArrowRightLeft className="w-4 h-4" />
                    <span>{t('nav_migration')}</span>
                  </Link>

                  {/* Data & Schema — group */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        type="button"
                        className={`flex items-center gap-2 px-3 py-2.5 rounded-lg transition-all duration-200 text-sm font-medium ${
                          [createPageUrl('DataModelCreator'), createPageUrl('DatabaseConnection')].some(p => isActive(p))
                            ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg shadow-blue-500/30 font-semibold'
                            : 'text-slate-900 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-blue-700 dark:hover:text-blue-400 data-[state=open]:bg-slate-100 data-[state=open]:dark:bg-slate-800'
                        }`}
                      >
                        <Database className="w-4 h-4" />
                        <span>{t('nav_data_schema')}</span>
                        <ChevronDown className="w-4 h-4 opacity-70" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="min-w-[200px] bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xl">
                      <DropdownMenuLabel className="text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider">{t('nav_data_schema')}</DropdownMenuLabel>
                      <DropdownMenuItem asChild>
                        <Link to={createPageUrl('DataModelCreator')} className="flex items-center gap-2 cursor-pointer">
                          <Database className="w-4 h-4" />
                          {t('nav_db_schema')}
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link to={createPageUrl('DatabaseConnection')} className="flex items-center gap-2 cursor-pointer">
                          <Plug className="w-4 h-4" />
                          {t('nav_db_connect')}
                        </Link>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>

                  {/* File Conversion — group */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        type="button"
                        className={`flex items-center gap-2 px-3 py-2.5 rounded-lg transition-all duration-200 text-sm font-medium ${
                          [createPageUrl('FileToPPT'), createPageUrl('OCRConverter'), createPageUrl('PdfDocConverter'), createPageUrl('FilenameCleaner'), '/pdfeditor'].some(p => isActive(p))
                            ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg shadow-blue-500/30 font-semibold'
                            : 'text-slate-900 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-blue-700 dark:hover:text-blue-400 data-[state=open]:bg-slate-100 data-[state=open]:dark:bg-slate-800'
                        }`}
                      >
                        <FileText className="w-4 h-4" />
                        <span>{t('nav_file_conversion')}</span>
                        <ChevronDown className="w-4 h-4 opacity-70" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="min-w-[200px] bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xl">
                      <DropdownMenuLabel className="text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider">{t('nav_file_conversion')}</DropdownMenuLabel>
                      <DropdownMenuItem asChild>
                        <Link to={createPageUrl('FileToPPT')} className="flex items-center gap-2 cursor-pointer">
                          <FileText className="w-4 h-4" />
                          {t('nav_excel_to_ppt')}
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link to={createPageUrl('OCRConverter')} className="flex items-center gap-2 cursor-pointer">
                          <ScanLine className="w-4 h-4" />
                          {t('nav_ocr_to_doc_pdf')}
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link to={createPageUrl('PdfDocConverter')} className="flex items-center gap-2 cursor-pointer">
                          <FileType className="w-4 h-4" />
                          {t('nav_document_converter')}
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link to="/pdfeditor" className="flex items-center gap-2 cursor-pointer">
                          <FileType className="w-4 h-4" />
                          PDF Tools & Editor
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link to={createPageUrl('FilenameCleaner')} className="flex items-center gap-2 cursor-pointer">
                          <FileArchive className="w-4 h-4" />
                          {t('nav_zip_cleaner')}
                        </Link>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>

                  {/* Developers (developer.meldra.ai / API docs) — opens /developers on same host */}
                  <Link
                    to="/developers"
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-lg transition-all duration-200 text-sm font-medium ${
                      location.pathname.toLowerCase() === '/developers'
                        ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg shadow-blue-500/30 scale-105 font-semibold'
                        : 'text-slate-900 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-blue-700 dark:hover:text-blue-400 hover:scale-105'
                    }`}
                    title="developer.meldra.ai – API docs"
                  >
                    <Code className={`w-4 h-4 ${location.pathname.toLowerCase() === '/developers' ? 'text-white' : ''}`} />
                    <span>{t('nav_developers')}</span>
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
                  <span>{t('nav_pricing')}</span>
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
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        type="button"
                        className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
                        title="Account"
                      >
                        <span className="2xl:hidden grid h-7 w-7 place-items-center rounded-full bg-blue-600 text-xs font-semibold text-white" aria-hidden="true">{user.email.charAt(0).toUpperCase()}</span>
                        <span className="text-sm text-slate-700 dark:text-slate-300 font-medium hidden 2xl:inline max-w-[180px] truncate">{user.email}</span>
                        <ChevronDown className="w-4 h-4 opacity-70" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="min-w-[220px] bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xl">
                      <DropdownMenuLabel className="text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider">{t('nav_account')}</DropdownMenuLabel>
                      <DropdownMenuItem onClick={openOnboarding} className="flex items-center gap-2 cursor-pointer">
                        <HelpCircle className="w-4 h-4" />
                        {t('nav_onboarding')}
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link to={createPageUrl('Help')} className="flex items-center gap-2 cursor-pointer">
                          <HelpCircle className="w-4 h-4" />
                          <span>Help Guide</span>
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link to={createPageUrl('Settings')} className="flex items-center gap-2 cursor-pointer">
                          <SettingsIcon className="w-4 h-4" />
                          {t('nav_settings')}
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link to={createPageUrl('Security')} className="flex items-center gap-2 cursor-pointer">
                          <Shield className="w-4 h-4" />
                          {t('nav_security')}
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={handleLogoutClick} className="flex items-center gap-2 cursor-pointer">
                        <LogOut className="w-4 h-4" />
                        {t('nav_logout')}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ) : (
                <Link
                  to="/Login"
                  className="ml-4 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all shadow-md hover:shadow-lg font-semibold"
                >
                  {t('nav_login')}
                </Link>
              )}
            </div>

            {/* Mobile menu button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="xl:hidden p-2 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>

          {/* Mobile menu */}
          {mobileMenuOpen && (
            <div className="xl:hidden border-t border-slate-200 dark:border-slate-800 py-4 space-y-1">
              {user && user.email ? (
                <>
                  <p className="px-4 pt-1 pb-1 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t('nav_dashboard')}</p>
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
                    <span>{t('nav_dashboard')}</span>
                  </Link>

                  <p className="px-4 pt-3 pb-1 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t('nav_file_analysis')}</p>
                  <Link to={createPageUrl('FileAnalyzer')} onClick={() => setMobileMenuOpen(false)} className={`flex items-center gap-2 px-4 py-2.5 rounded-lg transition-all font-medium text-sm ${isActive(createPageUrl('FileAnalyzer')) ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg font-semibold' : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>
                    <BarChart3 className="w-4 h-4" /> <span>{t('nav_analyzer')}</span>
                  </Link>
                  <Link to={createPageUrl('AutoStandardize')} onClick={() => setMobileMenuOpen(false)} className={`flex items-center gap-2 px-4 py-2.5 rounded-lg transition-all font-medium text-sm ${isActive(createPageUrl('AutoStandardize')) ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg font-semibold' : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>
                    <Sparkles className="w-4 h-4" /> <span>{t('nav_auto_standardize')}</span>
                  </Link>
                  <Link to={createPageUrl('Reconciliation')} onClick={() => setMobileMenuOpen(false)} className={`flex items-center gap-2 px-4 py-2.5 rounded-lg transition-all font-medium text-sm ${isActive(createPageUrl('Reconciliation')) ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg font-semibold' : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>
                    <GitCompareArrows className="w-4 h-4" /> <span>{t('nav_reconciliation')}</span>
                  </Link>
                  <Link to={createPageUrl('PLBuilder')} onClick={() => setMobileMenuOpen(false)} className={`flex items-center gap-2 px-4 py-2.5 rounded-lg transition-all font-medium text-sm ${isActive(createPageUrl('PLBuilder')) ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg font-semibold' : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>
                    <FileSpreadsheet className="w-4 h-4" /> <span>{t('nav_pl_builder')}</span>
                  </Link>

                  <Link to={createPageUrl('AgenticAI')} onClick={() => setMobileMenuOpen(false)} className={`flex items-center gap-2 px-4 py-2.5 rounded-lg transition-all font-semibold text-sm ${isActive(createPageUrl('AgenticAI')) ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg' : 'text-slate-800 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>
                    <Brain className={`w-4 h-4 ${isActive(createPageUrl('AgenticAI')) ? 'text-white' : 'text-blue-500'}`} /> <span>{t('nav_ai_assistant')}</span>
                  </Link>

                  {canAccessAgenticWorkflows && (
                    <Link to={createPageUrl('AgenticWorkflows')} onClick={() => setMobileMenuOpen(false)} className={`flex items-center gap-2 px-4 py-2.5 rounded-lg transition-all font-medium text-sm ${isActive(createPageUrl('AgenticWorkflows')) ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg font-semibold' : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>
                      <Sparkles className="w-4 h-4" /> <span>Agentic Workflows (Beta)</span>
                    </Link>
                  )}

                  <Link to="/unified-reporting" onClick={() => setMobileMenuOpen(false)} className={`flex items-center gap-2 px-4 py-2.5 rounded-lg transition-all font-medium text-sm ${isActive('/unified-reporting') ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg font-semibold' : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>
                    <LineChart className="w-4 h-4" /> <span>{t('nav_unified_reporting')}</span>
                  </Link>
                  <Link to="/migration" onClick={() => setMobileMenuOpen(false)} className={`flex items-center gap-2 px-4 py-2.5 rounded-lg transition-all font-medium text-sm ${isActive('/migration') ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg font-semibold' : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>
                    <ArrowRightLeft className="w-4 h-4" /> <span>{t('nav_migration')}</span>
                  </Link>

                  <p className="px-4 pt-3 pb-1 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t('nav_data_schema')}</p>
                  <Link to={createPageUrl('DataModelCreator')} onClick={() => setMobileMenuOpen(false)} className={`flex items-center gap-2 px-4 py-2.5 rounded-lg transition-all font-medium text-sm ${isActive(createPageUrl('DataModelCreator')) ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg font-semibold' : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>
                    <Database className="w-4 h-4" /> <span>{t('nav_db_schema')}</span>
                  </Link>
                  <Link to={createPageUrl('DatabaseConnection')} onClick={() => setMobileMenuOpen(false)} className={`flex items-center gap-2 px-4 py-2.5 rounded-lg transition-all font-medium text-sm ${isActive(createPageUrl('DatabaseConnection')) ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg font-semibold' : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>
                    <Plug className="w-4 h-4" /> <span>{t('nav_db_connect')}</span>
                  </Link>

                  <p className="px-4 pt-3 pb-1 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t('nav_file_conversion')}</p>
                  <Link to={createPageUrl('FileToPPT')} onClick={() => setMobileMenuOpen(false)} className={`flex items-center gap-2 px-4 py-2.5 rounded-lg transition-all font-medium text-sm ${isActive(createPageUrl('FileToPPT')) ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg font-semibold' : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>
                    <FileText className="w-4 h-4" /> <span>{t('nav_excel_to_ppt')}</span>
                  </Link>
                  <Link to={createPageUrl('OCRConverter')} onClick={() => setMobileMenuOpen(false)} className={`flex items-center gap-2 px-4 py-2.5 rounded-lg transition-all font-medium text-sm ${isActive(createPageUrl('OCRConverter')) ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg font-semibold' : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>
                    <ScanLine className="w-4 h-4" /> <span>{t('nav_ocr_to_doc_pdf')}</span>
                  </Link>
                  <Link to={createPageUrl('PdfDocConverter')} onClick={() => setMobileMenuOpen(false)} className={`flex items-center gap-2 px-4 py-2.5 rounded-lg transition-all font-medium text-sm ${isActive(createPageUrl('PdfDocConverter')) ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg font-semibold' : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>
                    <FileType className="w-4 h-4" /> <span>{t('nav_document_converter')}</span>
                  </Link>
                  <Link to="/pdfeditor" onClick={() => setMobileMenuOpen(false)} className={`flex items-center gap-2 px-4 py-2.5 rounded-lg transition-all font-medium text-sm ${isActive('/pdfeditor') ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg font-semibold' : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>
                    <FileType className="w-4 h-4" /> <span>PDF Tools & Editor</span>
                  </Link>
                  <Link to={createPageUrl('FilenameCleaner')} onClick={() => setMobileMenuOpen(false)} className={`flex items-center gap-2 px-4 py-2.5 rounded-lg transition-all font-medium text-sm ${isActive(createPageUrl('FilenameCleaner')) ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg font-semibold' : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>
                    <FileArchive className="w-4 h-4" /> <span>{t('nav_zip_cleaner')}</span>
                  </Link>
                  <Link to="/developers" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-2 px-4 py-2.5 rounded-lg transition-all font-medium text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800">
                    <Code className="w-4 h-4" /> <span>{t('nav_developers')}</span>
                  </Link>
                  <div className="pt-2 border-t border-slate-200 dark:border-slate-800 mt-2 space-y-2">
                    <Link
                      to={createPageUrl('Settings')}
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 font-medium text-sm"
                    >
                      <SettingsIcon className="w-4 h-4" />
                      <span>{t('nav_settings')}</span>
                    </Link>
                    <button
                      type="button"
                      onClick={() => {
                        setMobileMenuOpen(false);
                        openOnboarding();
                      }}
                      className="w-full text-left flex items-center gap-2 px-4 py-2.5 rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 font-medium text-sm"
                    >
                      <HelpCircle className="w-4 h-4" />
                      <span>{t('nav_onboarding')}</span>
                    </button>
                    <Link
                      to={createPageUrl('Help')}
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 font-medium text-sm"
                    >
                      <HelpCircle className="w-4 h-4" />
                      <span>Help Guide</span>
                    </Link>
                    <Link
                      to={createPageUrl('Security')}
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 font-medium text-sm"
                    >
                      <Shield className="w-4 h-4" />
                      <span>{t('nav_security')}</span>
                    </Link>
                    <button
                      onClick={() => {
                        setMobileMenuOpen(false);
                        handleLogoutClick();
                      }}
                      className="w-full flex items-center gap-2 px-4 py-2.5 rounded-lg text-white bg-[#059669] hover:bg-[#047857] font-semibold text-sm"
                    >
                      {t('nav_logout')}
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
                  <span>{t('nav_pricing')}</span>
                </Link>
              )}
            </div>
          )}
        </div>
      </nav>

      {/* Main content */}
      <SubscriptionChecker>
        <ActivityLogger>
          <main className="min-h-[calc(100vh-16rem)] bg-transparent">
            <div className="container mx-auto px-4 py-8">
              {children}
            </div>
          </main>
        </ActivityLogger>
      </SubscriptionChecker>

      {/* Footer */}
      <footer className="glass-surface dark:bg-slate-900 dark:border-slate-800 mt-auto">
        <div className="container mx-auto px-4 py-8">
          <div className="grid md:grid-cols-3 gap-8 items-start">
            <div className="min-w-0">
              <Logo size="medium" showText={true} style={{ color: 'inherit' }} lowercaseM brandName={brandPrefs.brandName} logoUrl={brandPrefs.logoUrl} />
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-2 font-light" style={{ fontFamily: "'Inter', sans-serif", letterSpacing: '-0.01em' }}>
                {t('footer_tagline')}
              </p>
            </div>

            <div className="min-w-0">
              <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-3">{t('footer_legal')}</h3>
              <div className="space-y-3">
                <Link 
                  to={createPageUrl('Privacy')}
                  className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition-colors"
                >
                  <Shield className="w-4 h-4 flex-shrink-0" />
                  <span>{t('footer_privacy_policy')}</span>
                </Link>
                <Link
                  to="/faq"
                  className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition-colors"
                >
                  <MessageSquareText className="w-4 h-4 flex-shrink-0" />
                  <span>{t('footer_faq')}</span>
                </Link>
                <Link 
                  to={createPageUrl('Disclaimer')}
                  className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition-colors"
                >
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  <span>{t('footer_disclaimer_terms')}</span>
                </Link>
              </div>
            </div>

            <div className="min-w-0">
              <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-xl p-4 h-full">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                  <span className="font-semibold text-slate-900 dark:text-slate-100 text-sm">{t('footer_privacy_first')}</span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  {t('footer_privacy_line1')}<br />
                  {t('footer_privacy_line2')}<br />
                  {t('footer_privacy_line3')}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-800 text-center">
            <p className="text-sm text-slate-600 dark:text-slate-400">
              © 2026 meldra • All rights reserved
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

      {/* Cookie consent — main app; tracks accept/reject for compliance */}
      <CookieConsent privacyUrl={createPageUrl('Privacy')} />

      <SupportChatWidget page={currentPageName} />

      <OnboardingAssistantModal
        userEmail={user?.email}
        open={showOnboarding}
        onOpenChange={handleOnboardingOpenChange}
      />
    </div>
  );
}

