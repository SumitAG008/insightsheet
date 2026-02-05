import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { getApiBase } from '@/utils/apiConfig';

const getToken = () => (typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null) || '';

export default function SuggestionsPanel({ page = 'dashboard' }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [data, setData] = useState(null);
  const [expanded, setExpanded] = useState({});
  const navigate = useNavigate();

  useEffect(() => {
    const api = getApiBase();
    const token = getToken();
    if (!api || !token) return;

    let alive = true;
    (async () => {
      setLoading(true);
      setError('');
      try {
        const res = await fetch(`${api}/api/suggestions?page=${encodeURIComponent(page)}`, {
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
        if (alive) setError(e?.message || 'Failed to load suggestions');
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [page]);

  const suggestions = data?.suggestions || [];
  const plan = data?.plan || '';

  const handleAction = (s) => {
    const a = s?.action;
    if (!a) return;
    if (a.type === 'navigate' && a.url) {
      navigate(a.url);
    }
  };

  const toggleExpanded = (id) => {
    setExpanded((prev) => ({ ...prev, [id]: !prev?.[id] }));
  };

  const api = getApiBase();
  const token = getToken();
  const canLoad = Boolean(api && token);

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-base font-bold text-slate-900 dark:text-white">Suggestions</h3>
        {plan && plan !== 'premium' && (
          <span className="text-xs px-2 py-1 rounded-full bg-amber-500/15 text-amber-500 font-semibold">Free</span>
        )}
      </div>

      {plan && plan !== 'premium' && (
        <div className="text-xs text-slate-600 dark:text-slate-300 mb-3">
          Free plan exports include a <span className="font-semibold">meldra.ai</span> watermark. Upgrade for watermark-free exports.
        </div>
      )}

      {!canLoad && (
        <Alert className="bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800">
          <AlertDescription className="text-slate-600 dark:text-slate-300">
            Log in to see personalized suggestions.
            <Link to="/login" className="underline font-semibold ml-2">Log in</Link>
          </AlertDescription>
        </Alert>
      )}

      {canLoad && loading && (
        <p className="text-sm text-slate-600 dark:text-slate-300">Loading suggestions…</p>
      )}

      {canLoad && error && (
        <Alert className="bg-red-500/10 border-red-500/30">
          <AlertDescription className="text-red-600 dark:text-red-300">{error}</AlertDescription>
        </Alert>
      )}

      {canLoad && !loading && !error && suggestions.length === 0 && (
        <p className="text-sm text-slate-600 dark:text-slate-300">No suggestions right now.</p>
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
                    Open
                  </Button>
                ) : Array.isArray(s.manual_steps) && s.manual_steps.length > 0 ? (
                  <Button size="sm" variant="outline" onClick={() => toggleExpanded(s.id)}>
                    {expanded?.[s.id] ? 'Hide steps' : 'Learn how'}
                  </Button>
                ) : (
                  <span className="text-xs text-slate-500 dark:text-slate-400">No action available</span>
                )}
              </div>

              {expanded?.[s.id] && Array.isArray(s.manual_steps) && s.manual_steps.length > 0 && (
                <div className="mt-3 text-xs text-slate-700 dark:text-slate-200">
                  <div className="font-semibold mb-1">Steps:</div>
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
