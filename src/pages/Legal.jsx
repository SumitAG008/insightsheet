// meldra Legal: the matter and hearing diary for law firms. A paid add-on: accounts without the licence
// see a short "request access" card (and never see it in the menu). Built phone-first: bottom tabs on
// small screens, so lawyers can run their day from the meldra phone app; the same screens work on the web.
import { useCallback, useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import { Link, Navigate } from 'react-router-dom';
import { LEGAL_PUBLIC } from '@/lib/legal/launch';
import { BarChart3, CalendarCheck, Briefcase, ListChecks, MoreHorizontal, Scale, Search } from 'lucide-react';
import { legalApi } from '@/lib/legal/api';
import { defaultLanguage, translate } from '@/lib/legal/i18n';
import { isNativeApp } from '@/lib/legal/format';
import { Btn, LegalContext } from '@/components/legalapp/shared';
import { TodayTab } from '@/components/legalapp/Today';
import { MattersTab, MatterDetail } from '@/components/legalapp/Matters';
import { TasksTab } from '@/components/legalapp/Tasks';
import { ResearchTab } from '@/components/legalapp/Research';
import { ReportsTab } from '@/components/legalapp/Reports';
import { MoreTab } from '@/components/legalapp/More';

const TABS = [
  { id: 'today', icon: CalendarCheck },
  { id: 'matters', icon: Briefcase },
  { id: 'tasks', icon: ListChecks },
  { id: 'research', icon: Search },
  { id: 'reports', icon: BarChart3 },
  { id: 'more', icon: MoreHorizontal },
];
const TAB_KEY = 'legal:tab';
const LANG_KEY = 'legal:lang';

function readStore(key) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStore(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* private mode */
  }
}

function Locked({ lang }) {
  const t = (k) => translate(lang, k);
  return (
    <div className="max-w-lg mx-auto px-4 py-16 text-center">
      <Scale className="w-12 h-12 mx-auto text-blue-700 mb-4" />
      <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">{t('locked_title')}</h1>
      <p className="text-slate-600 dark:text-slate-300 mb-6">{t('locked_body')}</p>
      <div className="flex flex-wrap gap-3 justify-center">
        <a href="mailto:sales@meldra.ai?subject=meldra%20Legal%20access" className="inline-flex items-center rounded-lg px-4 py-2.5 text-sm font-semibold bg-blue-700 text-white">{t('locked_cta')}</a>
        <Link to="/legal-diary" className="inline-flex items-center rounded-lg px-4 py-2.5 text-sm font-semibold bg-slate-100 dark:bg-slate-800">{t('locked_more')}</Link>
      </div>
    </div>
  );
}

Locked.propTypes = { lang: PropTypes.string.isRequired };

export default function Legal() {
  const [boot, setBoot] = useState({ loading: true, data: null, locked: false, error: null });
  const [tab, setTab] = useState(() => readStore(TAB_KEY) || 'today');
  const [lang, setLangState] = useState(() => readStore(LANG_KEY) || null);
  const [matterId, setMatterId] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const load = useCallback(async () => {
    try {
      const data = await legalApi.bootstrap();
      setBoot({ loading: false, data, locked: false, error: null });
    } catch (e) {
      const error =
        e.status === 404
          ? 'The meldra server has not been updated with meldra Legal yet. Redeploy the backend (Railway) from main, then reload this page.'
          : e.message;
      setBoot({ loading: false, data: null, locked: e.status === 403, error: e.status === 403 ? null : error });
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Hide floating buttons (support chat) over the bottom tab bar on phones while this page is open.
  useEffect(() => {
    const cls = document.body.classList;
    cls.add('legal-tabbar');
    if (isNativeApp()) cls.add('legal-native');
    return () => cls.remove('legal-tabbar', 'legal-native');
  }, []);

  const data = boot.data;
  const effectiveLang = lang || data?.settings?.language || defaultLanguage(data?.profile?.country, typeof navigator !== 'undefined' ? navigator.languages : []);
  const setLang = useCallback((l) => {
    setLangState(l);
    writeStore(LANG_KEY, l);
  }, []);
  const changeTab = useCallback((id) => {
    setTab(id);
    writeStore(TAB_KEY, id);
    window.scrollTo?.({ top: 0 });
  }, []);
  const bump = useCallback(() => setRefreshKey((k) => k + 1), []);
  const reloadAll = useCallback(() => {
    bump();
    load();
  }, [bump, load]);

  const ctx = useMemo(() => {
    if (!data) return null;
    return {
      t: (k, v) => translate(effectiveLang, k, v),
      lang: effectiveLang,
      setLang,
      country: data.profile.country,
      profile: data.profile,
      countries: data.countries,
      settings: data.settings,
      me: data.me,
      openMatter: (id) => setMatterId(id),
      goTab: changeTab,
      reloadAll,
    };
  }, [data, effectiveLang, setLang, changeTab, reloadAll]);

  if (boot.loading) return <div className="py-20 text-center text-slate-500">{translate(effectiveLang || 'en', 'loading')}</div>;
  if (boot.locked) return LEGAL_PUBLIC ? <Locked lang={effectiveLang || 'en'} /> : <Navigate to="/Dashboard" replace />;
  if (boot.error || !ctx)
    return (
      <div className="py-20 text-center">
        <p className="text-red-600 mb-3">{boot.error}</p>
        <Btn variant="secondary" onClick={load}>{translate('en', 'retry')}</Btn>
      </div>
    );

  const { t } = ctx;
  const native = isNativeApp();

  return (
    <LegalContext.Provider value={ctx}>
      <div className={`max-w-6xl mx-auto px-4 pt-4 ${native ? 'pb-28' : 'pb-28 md:pb-10'}`}>
        <header className="flex items-center justify-between gap-3 mb-4">
          <div className="min-w-0">
            <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2"><Scale className="w-5 h-5 text-blue-700" />{t('app_name')}</h1>
            <p className="text-xs text-slate-500 truncate flex items-center gap-2">
              <span className="truncate">{data.settings.firm_name || data.me.email}</span>
              <span className="shrink-0 px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-medium">{data.profile.country === 'GB' ? 'UK' : 'India'}</span>
            </p>
          </div>
          <div className="flex rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden text-sm shrink-0">
            {['en', 'hi'].map((l) => (
              <button key={l} type="button" onClick={() => setLang(l)} className={`px-2.5 py-1.5 ${effectiveLang === l ? 'bg-blue-700 text-white' : 'bg-white dark:bg-slate-900'}`}>{l === 'en' ? 'EN' : 'हि'}</button>
            ))}
          </div>
        </header>

        <nav className="hidden md:flex gap-1 mb-5 border-b border-slate-200 dark:border-slate-800" aria-label="meldra Legal">
          {TABS.map(({ id, icon: Icon }) => (
            <button key={id} type="button" onClick={() => changeTab(id)} className={`inline-flex items-center gap-2 px-3 py-2.5 text-sm font-medium border-b-2 -mb-px ${tab === id ? 'border-blue-700 text-blue-700 dark:text-blue-400' : 'border-transparent text-slate-600 dark:text-slate-300 hover:text-slate-900'}`}>
              <Icon className="w-4 h-4" />{t(`tab_${id}`)}
            </button>
          ))}
        </nav>

        <main>
          {tab === 'today' ? <TodayTab refreshKey={refreshKey} onChanged={bump} /> : null}
          {tab === 'matters' ? <MattersTab refreshKey={refreshKey} onChanged={bump} /> : null}
          {tab === 'tasks' ? <TasksTab refreshKey={refreshKey} onChanged={bump} /> : null}
          {tab === 'research' ? <ResearchTab /> : null}
          {tab === 'reports' ? <ReportsTab refreshKey={refreshKey} /> : null}
          {tab === 'more' ? <MoreTab onChanged={reloadAll} /> : null}
        </main>
      </div>

      <nav className={`fixed bottom-0 inset-x-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur border-t border-slate-200 dark:border-slate-800 ${native ? '' : 'md:hidden'}`} style={{ paddingBottom: 'env(safe-area-inset-bottom)' }} aria-label="meldra Legal">
        <div className="grid grid-cols-6">
          {TABS.map(({ id, icon: Icon }) => (
            <button key={id} type="button" onClick={() => changeTab(id)} className={`flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium ${tab === id ? 'text-blue-700 dark:text-blue-400' : 'text-slate-500'}`} aria-current={tab === id ? 'page' : undefined}>
              <Icon className="w-5 h-5" />
              <span className="truncate max-w-full px-0.5">{t(`tab_${id}`)}</span>
            </button>
          ))}
        </div>
      </nav>

      {matterId ? <MatterDetail matterId={matterId} onClose={() => setMatterId(null)} onChanged={bump} /> : null}
    </LegalContext.Provider>
  );
}
