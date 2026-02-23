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

async function fileToBase64(file) {
  const buf = await file.arrayBuffer();
  const bytes = new Uint8Array(buf);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export default function InvoiceExtractor() {
  const apiBase = useMemo(() => getApiBase(), []);
  const [features, setFeatures] = useState(null);
  const [featureKey, setFeatureKey] = useState('');
  const [file, setFile] = useState(null);
  const [filename, setFilename] = useState('');
  const [jobId, setJobId] = useState('');
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [maxPages, setMaxPages] = useState('25');

  const isEnabled = Array.isArray(features) ? features.includes('invoice_extractor') : false;

  const refreshFeatures = async () => {
    if (!apiBase) return;
    const token = getToken();
    if (!token) return;
    try {
      const res = await fetch(`${apiBase}/api/features/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || `HTTP ${res.status}`);
      setFeatures(data.features || []);
    } catch (e) {
      // Don't block page if features endpoint fails
      setFeatures([]);
    }
  };

  const redeemKey = async () => {
    if (!apiBase) {
      toast.error('Backend not configured. Set VITE_API_URL.');
      return;
    }
    const token = getToken();
    if (!token) {
      toast.error('Please login first.');
      return;
    }
    const k = (featureKey || '').trim();
    if (!k) {
      toast.error('Please paste a feature key.');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${apiBase}/api/features/redeem`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ key: k }),
      });
      const text = await res.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch {
        data = { detail: text };
      }
      if (!res.ok) throw new Error(data.detail || `HTTP ${res.status}`);
      toast.success(`Unlocked: ${data.feature || 'feature'}`);
      setFeatureKey('');
      await refreshFeatures();
    } catch (e) {
      toast.error(e.message || 'Failed to redeem key');
    } finally {
      setLoading(false);
    }
  };

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

    if (!file) {
      toast.error('Please choose a file (PDF or image).');
      return;
    }

    if (!isEnabled) {
      toast.error('Invoices & Receipts module is not enabled for your account.');
      return;
    }

    const mp = Number(maxPages);
    if (!mp || mp <= 0) {
      toast.error('Max pages must be greater than 0');
      return;
    }

    setLoading(true);
    setStatus(null);
    try {
      const b64 = await fileToBase64(file);
      const res = await fetch(`${apiBase}/api/unstructured/invoice/run`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          filename: filename || file.name,
          content_base64: b64,
          max_pages: mp,
        }),
      });

      const text = await res.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch {
        data = { detail: text };
      }

      if (!res.ok) throw new Error(data.detail || `HTTP ${res.status}`);

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

    if (!isEnabled) {
      toast.error('Invoices & Receipts module is not enabled for your account.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${apiBase}/api/unstructured/invoice/jobs/${encodeURIComponent(jobId)}`, {
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

    if (!isEnabled) {
      toast.error('Invoices & Receipts module is not enabled for your account.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(
        `${apiBase}/api/unstructured/invoice/jobs/${encodeURIComponent(jobId)}/download?type=${encodeURIComponent(kind)}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (!res.ok) {
        const t = await res.text();
        throw new Error(t || `HTTP ${res.status}`);
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;

      if (kind === 'header_csv') a.download = `invoice_header_${jobId}.csv`;
      else if (kind === 'line_items_csv') a.download = `invoice_line_items_${jobId}.csv`;
      else a.download = `invoice_report_${jobId}.json`;

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
        <h1 className="text-2xl font-bold text-blue-700 dark:text-blue-300">Invoices & Receipts</h1>
        <p className="text-sm text-blue-700/80 dark:text-blue-300/80 mt-1">
          Upload a PDF/image invoice or receipt. Meldra extracts structured fields and line items and exports CSV/JSON.
        </p>
      </div>

      <Card className="p-4">
        <div className="mb-4 flex items-center gap-2">
          <Button variant="secondary" onClick={refreshFeatures} disabled={loading}>Refresh Access</Button>
          {features === null ? (
            <span className="text-sm text-slate-600 dark:text-slate-300">Access not checked yet.</span>
          ) : isEnabled ? (
            <span className="text-sm text-emerald-700 dark:text-emerald-300">Module enabled</span>
          ) : (
            <span className="text-sm text-amber-700 dark:text-amber-300">Module locked</span>
          )}
        </div>

        {!isEnabled ? (
          <div className="mb-4">
            <div className="text-sm text-slate-700 dark:text-slate-200 font-medium">Unlock with feature key</div>
            <div className="mt-2 flex flex-col md:flex-row gap-2">
              <Input value={featureKey} onChange={(e) => setFeatureKey(e.target.value)} placeholder="fk_..." />
              <Button onClick={redeemKey} disabled={loading}>Redeem</Button>
            </div>
            <div className="mt-2 text-xs text-slate-600 dark:text-slate-300">
              Ask support/admin for an invoices module key. This feature is not enabled by default.
            </div>
          </div>
        ) : null}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="text-sm font-medium">File (required)</label>
            <Input
              type="file"
              onChange={(e) => {
                const f = e.target.files && e.target.files[0] ? e.target.files[0] : null;
                setFile(f);
                setFilename(f ? f.name : '');
              }}
            />
          </div>
          <div>
            <label className="text-sm font-medium">Filename override (optional)</label>
            <Input value={filename} onChange={(e) => setFilename(e.target.value)} placeholder="invoice.pdf" />
          </div>
          <div>
            <label className="text-sm font-medium">Max pages</label>
            <Input value={maxPages} onChange={(e) => setMaxPages(e.target.value)} placeholder="25" />
          </div>
        </div>

        <div className="mt-4 flex items-end gap-2">
          <Button onClick={run} disabled={loading || !isEnabled}>Run</Button>
          <Button variant="secondary" onClick={refresh} disabled={loading || !jobId || !isEnabled}>Refresh</Button>
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

                <div className="mt-3 flex flex-wrap gap-2">
                  <Button onClick={() => download('header_csv')} disabled={loading || status.status !== 'succeeded'}>
                    Download Header CSV
                  </Button>
                  <Button variant="secondary" onClick={() => download('line_items_csv')} disabled={loading || status.status !== 'succeeded'}>
                    Download Line Items CSV
                  </Button>
                  <Button variant="secondary" onClick={() => download('report_json')} disabled={loading || status.status !== 'succeeded'}>
                    Download Report JSON
                  </Button>
                </div>
              </div>
            ) : (
              <div className="mt-3 text-sm text-slate-600 dark:text-slate-300">Click Refresh to fetch job status.</div>
            )}
          </div>
        ) : null}
      </Card>
    </div>
  );
}
