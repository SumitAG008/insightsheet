import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Building2, Gauge, RefreshCw } from 'lucide-react';
import { meldraAi } from '@/api/meldraClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import PlanLimitsTable from '@/components/subscription/PlanLimitsTable';
import { LIMIT_LABELS, formatLimit } from '@/lib/planLimits';

const PER_FILE_KEYS = ['file_size_mb', 'spreadsheet_rows', 'pdf_pages', 'ocr_pages', 'concurrent_jobs'];

function Meter({ label, used, limit, unit = '', resetsAt }) {
  const unlimited = limit === null || limit === undefined || Number(limit) < 0;
  const pct = unlimited ? 0 : Math.min(100, (Number(used || 0) / Math.max(1, Number(limit))) * 100);
  const color = pct >= 90 ? 'bg-red-500' : pct >= 70 ? 'bg-amber-500' : 'bg-emerald-500';
  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span className="text-slate-700 dark:text-slate-300">{label}</span>
        <span className="font-semibold text-slate-900 dark:text-slate-100">
          {Number(used || 0).toLocaleString()}{unit} / {unlimited ? 'Unlimited' : `${Number(limit).toLocaleString()}${unit}`}
        </span>
      </div>
      <div className="h-2 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
        <div className={`h-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      {resetsAt && (
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Resets {new Date(resetsAt).toLocaleDateString()}</p>
      )}
    </div>
  );
}

export default function Usage() {
  const [sub, setSub] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      setSub(await meldraAi.subscriptions.getMy());
    } catch (e) {
      setError(e.message || 'Could not load your plan.');
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const a = sub?.allowance || {};
  const org = sub?.organization;
  const isOrgAdmin = org && ['owner', 'admin'].includes(org.role);

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <Gauge className="w-7 h-7 text-blue-600" />
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Plan and usage</h1>
        </div>
        <Button variant="outline" onClick={load} disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {sub && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 flex-wrap">
                {sub.plan_name || 'Free'} plan
                {sub.limits_source === 'organization' && org && (
                  <span className="inline-flex items-center gap-1 text-sm font-normal text-slate-600 dark:text-slate-400">
                    <Building2 className="w-4 h-4" /> through {org.name}
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              {org && org.license_state === 'grace' && (
                <Alert className="bg-amber-50 border-amber-300 dark:bg-amber-950/30">
                  <AlertDescription>
                    {org.name}&apos;s licence ended on {new Date(org.license_end).toLocaleDateString()}. You keep access for a short
                    grace period while it is renewed.
                  </AlertDescription>
                </Alert>
              )}
              {org && org.license_state === 'expired' && (
                <Alert className="bg-amber-50 border-amber-300 dark:bg-amber-950/30">
                  <AlertDescription>
                    {org.name}&apos;s licence has ended, so your own plan&apos;s limits apply. Ask your organisation&apos;s admin about renewal.
                  </AlertDescription>
                </Alert>
              )}
              <Meter label="Conversions and file jobs this month" used={a.conversions?.used} limit={a.conversions?.limit} resetsAt={a.conversions?.resets_at} />
              <Meter label="AI questions this month" used={a.ai_queries?.used} limit={a.ai_queries?.limit} resetsAt={a.ai_queries?.resets_at} />
              <Meter label="Uploads this month" used={a.upload_mb?.used} limit={a.upload_mb?.limit} unit=" MB" resetsAt={a.upload_mb?.resets_at} />

              <div>
                <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-2">Per file</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {PER_FILE_KEYS.map((k) => (
                    <div key={k} className="flex justify-between rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm">
                      <span className="text-slate-600 dark:text-slate-400">{(sub.limit_labels || LIMIT_LABELS)[k]}</span>
                      <span className="font-semibold text-slate-900 dark:text-slate-100">{formatLimit(sub.limits?.[k], k)}</span>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                  When Meldra is very busy, a file may wait a few seconds for its turn; the page retries by itself.
                </p>
              </div>

              <div className="flex gap-3 flex-wrap">
                {isOrgAdmin && (
                  <Link to="/organization">
                    <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                      <Building2 className="w-4 h-4 mr-2" /> Manage {org.name}
                    </Button>
                  </Link>
                )}
                <Link to="/pricing">
                  <Button variant="outline">Compare plans</Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>All plans</CardTitle>
            </CardHeader>
            <CardContent>
              <PlanLimitsTable currentPlan={sub.plan_key} />
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
