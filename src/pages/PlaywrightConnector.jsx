import React, { useMemo, useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';

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
  const [maxPages, setMaxPages] = useState('2');
  const [timeoutMs, setTimeoutMs] = useState('25000');
  const [jobId, setJobId] = useState('');
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);

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
    if (!mp || mp <= 0) {
      toast.error('Max pages must be greater than 0');
      return;
    }
    if (!tm || tm < 5000) {
      toast.error('Timeout must be at least 5000ms');
      return;
    }

    setLoading(true);
    setStatus(null);
    try {
      const res = await fetch(`${apiBase}/api/connectors/playwright/books/run`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ max_pages: mp, timeout_ms: tm }),
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
      a.download = kind === 'csv' ? `books_to_scrape_${jobId}.csv` : `books_to_scrape_${jobId}_report.json`;
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
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Web Automation (Playwright)</h1>
        <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">
          BooksToScrape connector demo. No credentials. Exports a CSV and a small JSON report.
        </p>
      </div>

      <Card className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="text-sm font-medium">Max pages (required)</label>
            <Input value={maxPages} onChange={(e) => setMaxPages(e.target.value)} placeholder="e.g. 2" />
          </div>
          <div>
            <label className="text-sm font-medium">Timeout ms (required)</label>
            <Input value={timeoutMs} onChange={(e) => setTimeoutMs(e.target.value)} placeholder="e.g. 25000" />
          </div>
          <div className="flex items-end gap-2">
            <Button onClick={run} disabled={loading}>Run</Button>
            <Button variant="secondary" onClick={refresh} disabled={loading || !jobId}>Refresh</Button>
          </div>
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
