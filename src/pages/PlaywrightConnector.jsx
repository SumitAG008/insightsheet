import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { meldraAi } from '@/api/meldraClient';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { peekHandoff } from '@/lib/meldra/handoff';

function getApiBase() {
  if (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL) return import.meta.env.VITE_API_URL;
  if (typeof window !== 'undefined' && window.location.hostname === 'localhost') return 'http://localhost:8001';
  return '';
}

function getToken() {
  return typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
}

export default function PlaywrightConnector() {
  const apiBase = useMemo(() => getApiBase(), []);
  // Ask meldra hands over a website URL: start on the custom-URL connector so it can be filled in.
  const [connector, setConnector] = useState(() => (/^https?:\/\//i.test(peekHandoff('/PlaywrightConnector')?.instruction || '') ? 'custom' : 'books'));
  const [maxPages, setMaxPages] = useState('2');
  const [timeoutMs, setTimeoutMs] = useState('25000');
  const [startUrl, setStartUrl] = useState('https://webscraper.io/test-sites/e-commerce/static');
  const [customUrl, setCustomUrl] = useState('https://webscraper.io/test-sites/e-commerce/static');
  const [itemSelector, setItemSelector] = useState('div.thumbnail');
  const [fieldsJson, setFieldsJson] = useState(
    JSON.stringify(
      {
        title: 'a.title',
        price: 'h4.price',
        description: 'p.description',
        product_url: 'a.title@href',
      },
      null,
      2
    )
  );
  const [maxItems, setMaxItems] = useState('50');
  const [jobId, setJobId] = useState('');
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [plan, setPlan] = useState(null); // 'free' | 'premium' (any paid plan or organisation licence)

  useEffect(() => {
    meldraAi.subscriptions.getMy().then((s) => setPlan(s?.plan || 'free')).catch(() => {});
  }, []);

  const run = async () => {
    if (!apiBase) {
      toast.error('Backend not configured. Set VITE_API_URL.');
      return;
    }
    const token = getToken();
    if (!token) {
      toast.error('Please login first.');
      return;
    }

    const mp = Number(maxPages);
    const tm = Number(timeoutMs);
    if (!tm || tm < 5000) {
      toast.error('Timeout must be at least 5000ms');
      return;
    }

    if (connector !== 'custom') {
      if (!mp || mp <= 0) {
        toast.error('Max pages must be greater than 0');
        return;
      }
    }

    setLoading(true);
    setStatus(null);
    try {
      let endpoint = `${apiBase}/api/connectors/playwright/books/run`;
      let body = { max_pages: mp, timeout_ms: tm };

      if (connector === 'webscraper') {
        endpoint = `${apiBase}/api/connectors/playwright/webscraper/ecommerce/run`;
        body = { max_pages: mp, timeout_ms: tm, start_url: (startUrl || '').trim() || undefined };
      } else if (connector === 'custom') {
        const mi = Number(maxItems);
        if (!mi || mi <= 0) {
          toast.error('Max items must be greater than 0');
          return;
        }
        if (!customUrl || !customUrl.trim()) {
          toast.error('URL is required');
          return;
        }
        if (!itemSelector || !itemSelector.trim()) {
          toast.error('Item selector is required');
          return;
        }

        let fields;
        try {
          fields = JSON.parse(fieldsJson);
        } catch {
          toast.error('Fields JSON is invalid');
          return;
        }
        if (!fields || typeof fields !== 'object' || Array.isArray(fields) || Object.keys(fields).length === 0) {
          toast.error('Fields JSON must be a non-empty object');
          return;
        }

        endpoint = `${apiBase}/api/connectors/playwright/custom/run`;
        body = {
          url: customUrl.trim(),
          item_selector: itemSelector.trim(),
          fields,
          max_items: mi,
          timeout_ms: tm,
        };
      }

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });
      const text = await res.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch {
        data = { detail: text };
      }
      if (!res.ok) {
        throw new Error(data.detail || `HTTP ${res.status}`);
      }
      setJobId(data.job_id);
      toast.success('Job started');
    } catch (e) {
      toast.error(e.message || 'Failed to start job');
    } finally {
      setLoading(false);
    }
  };

  const refresh = async () => {
    if (!apiBase || !jobId) return;
    const token = getToken();
    if (!token) return;

    setLoading(true);
    try {
      const res = await fetch(`${apiBase}/api/connectors/playwright/jobs/${encodeURIComponent(jobId)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || `HTTP ${res.status}`);
      setStatus(data);
    } catch (e) {
      toast.error(e.message || 'Failed to fetch status');
    } finally {
      setLoading(false);
    }
  };

  const download = async (kind) => {
    if (!apiBase || !jobId) return;
    const token = getToken();
    if (!token) return;

    setLoading(true);
    try {
      const res = await fetch(`${apiBase}/api/connectors/playwright/jobs/${encodeURIComponent(jobId)}/download?type=${encodeURIComponent(kind)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const t = await res.text();
        throw new Error(t || `HTTP ${res.status}`);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const connectorName = (status?.connector || connector || 'playwright').toString();
      a.download = kind === 'csv' ? `${connectorName}_${jobId}.csv` : `${connectorName}_${jobId}_report.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      toast.error(e.message || 'Download failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-blue-700 dark:text-blue-300">Web Automation (Playwright)</h1>
        <p className="text-sm text-blue-700/80 dark:text-blue-300/80 mt-1">Run web automation jobs and export CSV/JSON artifacts.</p>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          One job at a time; each run counts as one conversion. Public websites only, and only data you are allowed to collect.
        </p>
      </div>

      {plan === 'free' && (
        <div className="mb-4 rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/30 p-3 text-sm text-amber-900 dark:text-amber-200">
          Web data is included in paid plans and organisation licences.{' '}
          <Link to="/pricing" className="underline font-medium">See plans</Link>
        </div>
      )}

      <Card className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="text-sm font-medium">Connector</label>
            <Select value={connector} onValueChange={setConnector}>
              <SelectTrigger>
                <SelectValue placeholder="Select connector" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="books">BooksToScrape (preset)</SelectItem>
                <SelectItem value="webscraper">WebScraper E‑Commerce (preset)</SelectItem>
                <SelectItem value="custom">Custom URL (advanced)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium">Max pages (required)</label>
            <Input value={maxPages} onChange={(e) => setMaxPages(e.target.value)} placeholder="e.g. 2" disabled={connector === 'custom'} />
          </div>
          <div>
            <label className="text-sm font-medium">Timeout ms (required)</label>
            <Input value={timeoutMs} onChange={(e) => setTimeoutMs(e.target.value)} placeholder="e.g. 25000" />
          </div>
        </div>

        {connector === 'webscraper' ? (
          <div className="mt-4">
            <label className="text-sm font-medium">Start URL (optional)</label>
            <Input value={startUrl} onChange={(e) => setStartUrl(e.target.value)} placeholder="https://webscraper.io/test-sites/e-commerce/static" />
            <div className="text-xs text-slate-600 dark:text-slate-300 mt-1">Defaults to webscraper.io static e-commerce test site.</div>
          </div>
        ) : null}

        {connector === 'custom' ? (
          <div className="mt-4 grid grid-cols-1 gap-4">
            <div>
              <label className="text-sm font-medium">URL (required)</label>
              <Input data-meldra-prompt value={customUrl} onChange={(e) => setCustomUrl(e.target.value)} placeholder="https://..." />
            </div>
            <div>
              <label className="text-sm font-medium">Item selector (required)</label>
              <Input value={itemSelector} onChange={(e) => setItemSelector(e.target.value)} placeholder="e.g. div.thumbnail" />
            </div>
            <div>
              <label className="text-sm font-medium">Max items (required)</label>
              <Input value={maxItems} onChange={(e) => setMaxItems(e.target.value)} placeholder="e.g. 50" />
            </div>
            <div>
              <label className="text-sm font-medium">Fields JSON (required)</label>
              <Textarea value={fieldsJson} onChange={(e) => setFieldsJson(e.target.value)} className="font-mono" />
              <div className="text-xs text-slate-600 dark:text-slate-300 mt-1">
                Example: {'{'}"title":"a.title","product_url":"a.title@href"{'}'} (use @attr for attributes)
              </div>
            </div>
          </div>
        ) : null}

        <div className="mt-4 flex items-end gap-2">
          <Button onClick={run} disabled={loading}>Run</Button>
          <Button variant="secondary" onClick={refresh} disabled={loading || !jobId}>Refresh</Button>
        </div>

        {jobId ? (
          <div className="mt-4">
            <div className="text-sm text-slate-700 dark:text-slate-200">
              Job ID: <span className="font-mono">{jobId}</span>
            </div>

            {status ? (
              <div className="mt-3 text-sm">
                <div>Status: <span className="font-semibold">{status.status}</span></div>
                {status.error_message ? <div className="text-red-600 mt-1">{status.error_message}</div> : null}
                <div className="mt-3 flex gap-2">
                  <Button onClick={() => download('csv')} disabled={loading || status.status !== 'succeeded'}>Download CSV</Button>
                  <Button variant="secondary" onClick={() => download('report')} disabled={loading || status.status !== 'succeeded'}>Download Report</Button>
                </div>
              </div>
            ) : (
              <div className="mt-3 text-sm text-slate-600 dark:text-slate-300">
                Click Refresh to fetch job status.
              </div>
            )}
          </div>
        ) : null}
      </Card>
    </div>
  );
}
