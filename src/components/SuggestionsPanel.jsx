import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { getApiBase } from '@/utils/apiConfig';
import { useI18n } from '@/lib/i18n';

const getToken = () => (typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null) || '';

export default function SuggestionsPanel({ page = 'dashboard', hasData = false, activeTab = '' }) {
  const { t } = useI18n();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [data, setData] = useState(null);
  const [expanded, setExpanded] = useState({});
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const api = getApiBase();
    const token = getToken();
    if (!api || !token) return;

    let alive = true;
    (async () => {
      setLoading(true);
      setError('');
      try {
        const qs = new URLSearchParams();
        qs.set('page', page);
        qs.set('has_data', hasData ? '1' : '0');
        if (activeTab) qs.set('tab', String(activeTab));
        const res = await fetch(`${api}/api/suggestions?${qs.toString()}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const t = await res.text();
        if (!res.ok) {
          let msg = t;
          try {
            const j = JSON.parse(t);
            msg = j.detail || msg;
          } catch (_) {}
          throw new Error(msg || `HTTP ${res.status}`);
        }
        const j = JSON.parse(t);
        if (alive) setData(j);
      } catch (e) {
        if (alive) setError(e?.message || t('suggestions_failed_to_load'));
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [page, hasData, activeTab]);

  const suggestions = data?.suggestions || [];
  const plan = data?.plan || '';

  const handleAction = (s) => {
    const a = s?.action;
    if (!a) return;
    if (a.type === 'navigate' && a.url) {
      try {
        const u = new URL(a.url, window.location.origin);
        const currentPath = `${location.pathname}${location.search}${location.hash || ''}`;
        const nextPath = `${u.pathname}${u.search}${u.hash || ''}`;

        // If it's effectively the same URL, React Router may no-op.
        if (currentPath === nextPath) {
          const hash = (u.hash || '').replace('#', '').trim();
          if (hash) {
            if (window.location.hash !== u.hash) window.location.hash = u.hash;
            const el = document.getElementById(hash);
            if (el) {
              setTimeout(() => {
                try {
                  el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                } catch (_) {}
              }, 50);
            }
          }
          return;
        }

        // Force a new navigation when target differs.
        navigate(`${u.pathname}${u.search}${u.hash}`, { replace: false });
      } catch (_) {
        navigate(a.url);
      }
    }
  };

  const toggleExpanded = (id) => {
    setExpanded((prev) => ({ ...prev, [id]: !prev?.[id] }));
  };

  const api = getApiBase();
  const token = getToken();
  const canLoad = Boolean(api && token);

  // Nothing to suggest: show nothing rather than an empty box.
  const isFree = Boolean(plan) && !String(plan).toLowerCase().startsWith('premium');
  if (canLoad && !loading && !error && suggestions.length === 0 && !isFree) return null;

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-base font-bold text-slate-900 dark:text-white">{t('suggestions_title')}</h3>
        {isFree && (
          <span className="text-xs px-2 py-1 rounded-full bg-amber-500/15 text-amber-500 font-semibold">{t('suggestions_badge_free')}</span>
        )}
      </div>

      {isFree && (
        <div className="text-xs text-slate-600 dark:text-slate-300 mb-3">
          {t('suggestions_free_watermark_note', { brand: 'meldra.ai' })}
        </div>
      )}

      {!canLoad && (
        <Alert className="bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800">
          <AlertDescription className="text-slate-600 dark:text-slate-300">
            {t('suggestions_login_prompt')}
            <Link to="/login" className="underline font-semibold ml-2">{t('suggestions_login_link')}</Link>
          </AlertDescription>
        </Alert>
      )}

      {canLoad && loading && (
        <p className="text-sm text-slate-600 dark:text-slate-300">{t('suggestions_loading')}</p>
      )}

      {canLoad && error && (
        <Alert className="bg-red-500/10 border-red-500/30">
          <AlertDescription className="text-red-600 dark:text-red-300">{error}</AlertDescription>
        </Alert>
      )}

      {canLoad && !loading && !error && suggestions.length === 0 && (
        <p className="text-sm text-slate-600 dark:text-slate-300">{t('suggestions_none')}</p>
      )}

      {canLoad && suggestions.length > 0 && (
        <div className="space-y-3">
          {suggestions.map((s) => (
            <div key={s.id} className="rounded-lg border border-slate-200 dark:border-slate-800 p-3">
              <div className="text-sm font-semibold text-slate-900 dark:text-white">{s.title}</div>
              {s.reason && <div className="text-xs text-slate-600 dark:text-slate-300 mt-1">{s.reason}</div>}
              <div className="mt-3 flex gap-2 flex-wrap">
                {s.action?.type === 'navigate' && s.action?.url ? (
                  <Button size="sm" className="bg-[#4169E1] hover:bg-[#3659c7] text-white" onClick={() => handleAction(s)}>
                    {t('suggestions_open')}
                  </Button>
                ) : Array.isArray(s.manual_steps) && s.manual_steps.length > 0 ? (
                  <Button size="sm" variant="outline" onClick={() => toggleExpanded(s.id)}>
                    {expanded?.[s.id] ? t('suggestions_hide_steps') : t('suggestions_learn_how')}
                  </Button>
                ) : (
                  <span className="text-xs text-slate-500 dark:text-slate-400">{t('suggestions_no_action')}</span>
                )}
              </div>

              {expanded?.[s.id] && Array.isArray(s.manual_steps) && s.manual_steps.length > 0 && (
                <div className="mt-3 text-xs text-slate-700 dark:text-slate-200">
                  <div className="font-semibold mb-1">{t('suggestions_steps_label')}</div>
                  <div className="space-y-1">
                    {s.manual_steps.map((st, idx) => (
                      <div key={`${s.id}_${idx}`}>{idx + 1}. {st}</div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
