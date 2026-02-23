import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

import { backendApi } from '@/api/backendClient';

function getApiBase() {
  if (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL) return import.meta.env.VITE_API_URL;
  if (typeof window !== 'undefined' && window.location.hostname === 'localhost') return 'http://localhost:8001';
  return '';
}

function getToken() {
  return typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
}

export default function HelpGuide() {
  const apiBase = useMemo(() => getApiBase(), []);
  const [me, setMe] = useState(null);
  const [features, setFeatures] = useState(null);
  const [loading, setLoading] = useState(false);

  const isAdmin = (me?.role || '').toLowerCase() === 'admin';
  const enabled = (f) => (Array.isArray(features) ? features.includes(String(f || '').toLowerCase()) : false);

  const refreshAccess = async () => {
    if (!apiBase) return;
    const token = getToken();
    if (!token) return;

    setLoading(true);
    try {
      const [meRes, featRes] = await Promise.all([
        backendApi.auth.me(),
        fetch(`${apiBase}/api/features/me`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      setMe(meRes);

      const featText = await featRes.text();
      let featData;
      try {
        featData = JSON.parse(featText);
      } catch {
        featData = { detail: featText };
      }
      if (!featRes.ok) throw new Error(featData.detail || `HTTP ${featRes.status}`);
      setFeatures(featData.features || []);
    } catch (e) {
      setFeatures([]);
      toast.error(e?.message || 'Failed to load access');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshAccess();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3 mb-6">
        <div>
          <h1 className="text-3xl md:text-4xl font-black tracking-tight text-slate-900 dark:text-white" style={{ fontFamily: "'Space Grotesk', sans-serif", letterSpacing: '-0.03em' }}>
            Help Guide
          </h1>
          <div className="mt-2 text-sm text-slate-600 dark:text-slate-300">
            Guide version: <span className="font-semibold">2026.02</span>
            <span className="mx-2">•</span>
            Feature-gating build: <span className="font-semibold">2360180</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={refreshAccess} disabled={loading}>Refresh Access</Button>
          {features === null ? (
            <span className="text-sm text-slate-600 dark:text-slate-300">Checking…</span>
          ) : (
            <span className="text-sm text-slate-600 dark:text-slate-300">
              Logged in as <span className="font-semibold">{me?.email || 'user'}</span>
              {isAdmin ? <span className="ml-2 text-emerald-700 dark:text-emerald-300 font-semibold">(admin)</span> : null}
            </span>
          )}
        </div>
      </div>

      <div className="grid gap-4">
        <Card className="p-5">
          <div className="text-lg font-extrabold text-slate-900 dark:text-white">Security and access model</div>
          <div className="mt-2 text-sm text-slate-700 dark:text-slate-200 leading-relaxed">
            This app uses <span className="font-semibold">feature gating</span>. Some modules are <span className="font-semibold">locked by default</span> and become available only after:
            <div className="mt-2">
              <div className="text-sm">1) An admin grants access to your email, or</div>
              <div className="text-sm">2) You redeem a one-time feature key (e.g. <span className="font-mono">fk_...</span>).</div>
            </div>
            <div className="mt-2 text-xs text-slate-600 dark:text-slate-300">
              Do not share feature keys publicly. Keys can be restricted to a user email and may expire.
            </div>
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-lg font-extrabold text-slate-900 dark:text-white">Invoice / Receipt Extractor</div>
              <div className="mt-1 text-sm text-slate-600 dark:text-slate-300">Feature: <span className="font-mono">invoice_extractor</span></div>
            </div>
            {features === null ? null : enabled('invoice_extractor') ? (
              <div className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">Enabled</div>
            ) : (
              <div className="text-sm font-semibold text-amber-700 dark:text-amber-300">Locked</div>
            )}
          </div>

          {!enabled('invoice_extractor') ? (
            <div className="mt-3 text-sm text-slate-700 dark:text-slate-200">
              To unlock:
              <div className="mt-2">
                <div>1) Open <span className="font-mono">/invoiceextractor</span></div>
                <div>2) Paste your feature key and click <span className="font-semibold">Redeem</span></div>
                <div>3) Click <span className="font-semibold">Refresh Access</span> if needed</div>
              </div>
            </div>
          ) : (
            <div className="mt-3 text-sm text-slate-700 dark:text-slate-200">
              How to run:
              <div className="mt-2">
                <div>1) Go to <span className="font-mono">/invoiceextractor</span></div>
                <div>2) Upload a PDF/image invoice or receipt</div>
                <div>3) Click <span className="font-semibold">Run</span> to start extraction</div>
                <div>4) Use <span className="font-semibold">Refresh</span> to check status</div>
                <div>5) Download exports: Header CSV, Line Items CSV, Report JSON</div>
              </div>
              <div className="mt-3 text-xs text-slate-600 dark:text-slate-300">
                If you see a <span className="font-mono">403 Feature not enabled</span> error, your access is not active yet.
              </div>
            </div>
          )}
        </Card>

        <Card className="p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-lg font-extrabold text-slate-900 dark:text-white">Playwright Connector</div>
              <div className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                This module is subscription/premium gated. Feature-key gating can also be added using the same framework.
              </div>
            </div>
          </div>
          <div className="mt-3 text-sm text-slate-700 dark:text-slate-200">
            How to use:
            <div className="mt-2">
              <div>1) Go to <span className="font-mono">/playwrightconnector</span></div>
              <div>2) Choose a connector preset (BooksToScrape, WebScraper e-commerce, Custom URL)</div>
              <div>3) Click <span className="font-semibold">Run</span></div>
              <div>4) Refresh status and download CSV/report when complete</div>
            </div>
          </div>
        </Card>

        {isAdmin ? (
          <Card className="p-5">
            <div className="text-lg font-extrabold text-slate-900 dark:text-white">Admin: issuing access</div>
            <div className="mt-2 text-sm text-slate-700 dark:text-slate-200">
              Generate a key:
              <pre className="mt-2 font-mono text-xs bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-lg p-3 overflow-x-auto whitespace-pre-wrap">
                {`POST /api/admin/features/key\n{\n  "feature": "invoice_extractor",\n  "user_email": "customer@example.com"\n}`}
              </pre>
              Grant directly (no key):
              <pre className="mt-2 font-mono text-xs bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-lg p-3 overflow-x-auto whitespace-pre-wrap">
                {`POST /api/admin/features/grant\n{\n  "user_email": "customer@example.com",\n  "feature": "invoice_extractor",\n  "enabled": true\n}`}
              </pre>
            </div>
          </Card>
        ) : null}
      </div>
    </div>
  );
}
