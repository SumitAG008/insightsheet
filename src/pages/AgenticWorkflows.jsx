import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { backendApi } from '@/api/meldraClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Sparkles } from 'lucide-react';
import { runCleanPipeline, getAutoFillOptions } from '@/lib/dataCleaning';
import { applyTransform } from '@/lib/transformUtils';

export default function AgenticWorkflows() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);

  const [features, setFeatures] = useState(null);
  const [featureKey, setFeatureKey] = useState('');

  const [workflowSteps, setWorkflowSteps] = useState([
    { id: `${Date.now()}-1`, action: 'analyze', description: 'Analyze the dataset and summarize key patterns.' },
  ]);
  const [workflowRun, setWorkflowRun] = useState(null);
  const [workflowRunning, setWorkflowRunning] = useState(false);

  const getApiBase = () => {
    if (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL) return import.meta.env.VITE_API_URL;
    if (typeof window !== 'undefined' && window.location.hostname === 'localhost') return 'http://localhost:8001';
    return '';
  };

  const getToken = () => {
    return typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
  };

  const canAccessAgenticWorkflows = (email) => (email || '').toLowerCase().trim() === 'sumitagaraia@gmail.com';

  const isWorkflowEnabled = Array.isArray(features) ? features.includes('agentic_workflows') : false;

  const refreshFeatures = async () => {
    const apiBase = getApiBase();
    const token = getToken();
    if (!apiBase || !token) return;
    try {
      const res = await fetch(`${apiBase}/api/features/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.detail || `HTTP ${res.status}`);
      setFeatures(data.features || []);
    } catch {
      setFeatures([]);
    }
  };

  const redeemWorkflowKey = async () => {
    const apiBase = getApiBase();
    const token = getToken();
    if (!apiBase) {
      toast.error('Backend not configured. Set VITE_API_URL.');
      return;
    }
    if (!token) {
      toast.error('Please login first.');
      return;
    }
    const k = (featureKey || '').trim();
    if (!k) {
      toast.error('Please paste a feature key.');
      return;
    }
    try {
      const res = await fetch(`${apiBase}/api/features/redeem`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ key: k }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.detail || `HTTP ${res.status}`);
      toast.success('Access granted');
      setFeatureKey('');
      await refreshFeatures();
    } catch (e) {
      toast.error(e?.message || 'Failed to redeem key');
    }
  };

  useEffect(() => {
    const fromSession = JSON.parse(sessionStorage.getItem('insightsheet_data') || 'null');
    if (fromSession) {
      setData(fromSession);
    } else {
      const fromLocal = JSON.parse(localStorage.getItem('insightsheet_data') || 'null');
      setData(fromLocal);
    }

    const gate = async () => {
      const apiBase = getApiBase();
      const token = getToken();
      if (!apiBase || !token) {
        navigate('/Login');
        return;
      }

      try {
        const res = await fetch(`${apiBase}/api/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const body = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(body.detail || `HTTP ${res.status}`);
        const email = body?.email;
        if (!canAccessAgenticWorkflows(email)) {
          toast.error('Agentic Workflows is in private beta');
          navigate('/dashboard');
          return;
        }
      } catch {
        toast.error('Please login again');
        navigate('/Login');
        return;
      }

      refreshFeatures();
    };

    gate();
  }, []);

  const safeJson = (obj) => {
    try {
      return JSON.stringify(obj, null, 2);
    } catch {
      return String(obj ?? '');
    }
  };

  const executeAnalysis = async (step, data) => {
    const maxColsForPrompt = 30;
    const promptHeaders = (data.headers || []).slice(0, maxColsForPrompt);
    const sampleData = (data.rows || []).slice(0, 20).map((row) => {
      const r = {};
      for (const h of promptHeaders) r[h] = row?.[h];
      return r;
    });
    const analysisPrompt = `Analyze this data and provide insights:\n\n${step.description}\n\nData sample:\n${safeJson(sampleData)}\n\nProvide specific, actionable insights.`;

    const insightsResponse = await backendApi.llm.invoke(analysisPrompt, {
      addContext: false,
      model: 'gpt-4o-mini',
      max_tokens: 900,
    });

    return { success: true, output: insightsResponse.response };
  };

  const executeClean = async (step, data) => {
    const { fill } = getAutoFillOptions(data.rows || [], data.headers || []);
    const opts = { fill, outlierColumns: [], outlierThreshold: 1.5 };
    const { data: cleanedData, summary } = runCleanPipeline(data, opts);
    setData(cleanedData);
    sessionStorage.setItem('insightsheet_data', JSON.stringify(cleanedData));
    return {
      success: true,
      output: `Cleaned: ${summary.join('; ')}. Rows: ${cleanedData.rows.length}`,
      updatedData: cleanedData,
    };
  };

  const executeTransform = async (step, data) => {
    try {
      const columns = (data.headers || []).map((h) => ({ name: h }));
      const r = await backendApi.llm.transform(step.description || 'Create a useful new column', columns, (data.rows || []).slice(0, 15));
      const name = (r.new_column_name || 'new_column').replace(/\s+/g, '_');
      const colA = r.col_a || r.colA;
      const colB = r.col_b || r.colB;
      const op = (r.op || 'add').toLowerCase();
      if (!colA || !colB || !(data.headers || []).includes(colA) || !(data.headers || []).includes(colB)) {
        return { success: true, output: `Transform suggested columns that don't exist (${colA}, ${colB}). No change applied.` };
      }
      if ((data.headers || []).includes(name)) {
        return { success: true, output: `Column "${name}" already exists. No change applied.` };
      }
      const newRows = applyTransform(data.rows || [], colA, colB, op, name, r.separator || ' ');
      const updated = { headers: [...(data.headers || []), name], rows: newRows };
      setData(updated);
      sessionStorage.setItem('insightsheet_data', JSON.stringify(updated));
      return {
        success: true,
        output: `Created column "${name}" = ${colA} ${op} ${colB}. Rows: ${newRows.length}`,
        updatedData: updated,
      };
    } catch (e) {
      return { success: false, output: `Transform failed: ${e.message || 'unknown error'}` };
    }
  };

  const executeCalculate = async (step, data) => {
    const numericColumns = (data.headers || []).filter((header) => {
      return (data.rows || []).some((row) => {
        const val = row[header];
        return !Number.isNaN(parseFloat(val));
      });
    });

    const stats = {};
    numericColumns.forEach((col) => {
      const values = (data.rows || [])
        .map((row) => parseFloat(row[col]))
        .filter((v) => !Number.isNaN(v));

      if (!values.length) return;
      stats[col] = {
        avg: (values.reduce((a, b) => a + b, 0) / values.length).toFixed(2),
        min: Math.min(...values).toFixed(2),
        max: Math.max(...values).toFixed(2),
        count: values.length,
      };
    });

    return {
      success: true,
      output: `Calculated stats for ${numericColumns.length} numeric columns\n${JSON.stringify(stats, null, 2)}`,
    };
  };

  const executeReport = async (step, data) => {
    const reportPrompt = `Generate a professional report based on:\n\n${step.description}\n\nData overview:\n- Total rows: ${data.rows.length}\n- Columns: ${(data.headers || []).join(', ')}\n\nCreate a clear, business-ready summary.`;

    const reportResponse = await backendApi.llm.invoke(reportPrompt, {
      addContext: false,
      model: 'gpt-4o-mini',
      max_tokens: 900,
    });

    return { success: true, output: reportResponse.response };
  };

  const addWorkflowStep = () => {
    setWorkflowSteps((prev) => ([
      ...prev,
      { id: `${Date.now()}-${Math.random().toString(16).slice(2)}`, action: 'analyze', description: '' },
    ]));
  };

  const updateWorkflowStep = (id, patch) => {
    setWorkflowSteps((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  };

  const removeWorkflowStep = (id) => {
    setWorkflowSteps((prev) => prev.filter((s) => s.id !== id));
  };

  const runWorkflow = async () => {
    if (!isWorkflowEnabled) {
      toast.error('Agentic Workflows is locked. Redeem a key to enable it.');
      return;
    }
    if (!data) {
      toast.error('Upload a CSV/XLSX first (workflow MVP runs on tabular data).');
      return;
    }
    const steps = (workflowSteps || []).filter((s) => (s?.description || '').trim());
    if (!steps.length) {
      toast.error('Add at least one step with a description.');
      return;
    }

    setWorkflowRunning(true);
    setWorkflowRun(null);
    try {
      const results = [];
      let currentData = data;
      for (let i = 0; i < steps.length; i += 1) {
        const step = steps[i];
        let stepResult;
        switch ((step.action || '').toLowerCase()) {
          case 'analyze':
            stepResult = await executeAnalysis(step, currentData);
            break;
          case 'clean':
            stepResult = await executeClean(step, currentData);
            break;
          case 'transform':
            stepResult = await executeTransform(step, currentData);
            break;
          case 'calculate':
            stepResult = await executeCalculate(step, currentData);
            break;
          case 'report':
            stepResult = await executeReport(step, currentData);
            break;
          default:
            stepResult = { success: true, output: 'Step completed.' };
        }

        if (stepResult?.updatedData) currentData = stepResult.updatedData;
        results.push({
          idx: i + 1,
          action: step.action,
          description: step.description,
          success: stepResult?.success !== false,
          output: stepResult?.output ?? '',
        });
      }

      setWorkflowRun({
        started_at: new Date().toISOString(),
        steps: results,
        status: 'completed',
      });
      toast.success('Workflow completed');
    } catch (e) {
      setWorkflowRun({
        started_at: new Date().toISOString(),
        steps: [],
        status: 'error',
        error: e?.message || 'Workflow failed',
      });
      toast.error(e?.message || 'Workflow failed');
    } finally {
      setWorkflowRunning(false);
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 p-6">
      <div className="container mx-auto max-w-6xl">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="w-20 h-20 bg-[#4169E1] rounded-2xl flex items-center justify-center shadow-lg">
              <Sparkles className="w-10 h-10 text-white" />
            </div>
          </div>
          <h1 className="text-4xl font-bold text-slate-900 dark:text-white mb-2">Agentic Workflows (Beta)</h1>
          <p className="text-slate-600 dark:text-slate-400 text-lg">Build a simple step-by-step workflow and run it on your dataset.</p>
        </div>

        <div className="bg-white dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200 dark:border-slate-800 rounded-2xl p-6 mb-6 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3 mb-4">
            <div />
            <div className="flex items-center gap-2">
              <Button variant="secondary" onClick={refreshFeatures} disabled={workflowRunning}>Refresh Access</Button>
              {features === null ? (
                <span className="text-sm text-slate-600 dark:text-slate-300">Access not checked.</span>
              ) : isWorkflowEnabled ? (
                <span className="text-sm text-emerald-700 dark:text-emerald-300 font-semibold">Enabled</span>
              ) : (
                <span className="text-sm text-amber-700 dark:text-amber-300 font-semibold">Locked</span>
              )}
            </div>
          </div>

          {!isWorkflowEnabled ? (
            <div className="mb-5">
              <div className="text-sm text-slate-700 dark:text-slate-200 font-semibold">Unlock with feature key</div>
              <div className="mt-2 flex flex-col md:flex-row gap-2">
                <Input value={featureKey} onChange={(e) => setFeatureKey(e.target.value)} placeholder="fk_..." />
                <Button onClick={redeemWorkflowKey} disabled={workflowRunning}>Redeem</Button>
              </div>
              <div className="mt-2 text-xs text-slate-600 dark:text-slate-300">This module is disabled by default. Ask admin/support for access.</div>
            </div>
          ) : null}

          <div className="space-y-3">
            {workflowSteps.map((s, idx) => (
              <div key={s.id} className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 bg-slate-50/50 dark:bg-slate-950/20">
                <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
                  <div className="text-sm font-semibold text-slate-900 dark:text-white">Step {idx + 1}</div>
                  <div className="flex items-center gap-2">
                    <select
                      value={s.action}
                      onChange={(e) => updateWorkflowStep(s.id, { action: e.target.value })}
                      className="h-9 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-2 text-sm"
                      disabled={workflowRunning}
                    >
                      <option value="analyze">Analyze</option>
                      <option value="clean">Clean</option>
                      <option value="transform">Transform</option>
                      <option value="calculate">Calculate</option>
                      <option value="report">Report</option>
                    </select>
                    <Button variant="secondary" onClick={() => removeWorkflowStep(s.id)} disabled={workflowRunning || workflowSteps.length <= 1}>Remove</Button>
                  </div>
                </div>
                <div className="mt-3">
                  <Textarea
                    value={s.description}
                    onChange={(e) => updateWorkflowStep(s.id, { description: e.target.value })}
                    placeholder="Describe what this step should do…"
                    className="bg-white dark:bg-slate-950/40 border-slate-200 dark:border-slate-800"
                    disabled={workflowRunning}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 flex flex-col md:flex-row gap-2">
            <Button variant="secondary" onClick={addWorkflowStep} disabled={workflowRunning || !isWorkflowEnabled}>Add Step</Button>
            <Button onClick={runWorkflow} disabled={workflowRunning || !isWorkflowEnabled} className="bg-[#4169E1] hover:bg-[#3659c7]">
              {workflowRunning ? 'Running…' : 'Run Workflow'}
            </Button>
          </div>

          {workflowRun ? (
            <div className="mt-5 rounded-xl border border-slate-200 dark:border-slate-800 p-4 bg-white/70 dark:bg-slate-950/30">
              <div className="flex items-center justify-between gap-3">
                <div className="text-sm font-semibold text-slate-900 dark:text-white">Run status: {workflowRun.status}</div>
                {workflowRun.status === 'completed' ? (
                  <div className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">Completed</div>
                ) : (
                  <div className="text-sm font-semibold text-amber-700 dark:text-amber-300">Error</div>
                )}
              </div>
              {workflowRun.error ? (
                <div className="mt-2 text-sm text-red-700 dark:text-red-300">{workflowRun.error}</div>
              ) : null}
              <div className="mt-3 space-y-3">
                {(workflowRun.steps || []).map((r) => (
                  <div key={r.idx} className="rounded-lg border border-slate-200 dark:border-slate-800 p-3">
                    <div className="text-sm font-semibold text-slate-900 dark:text-white">{r.idx}. {r.action} — {r.success ? 'ok' : 'failed'}</div>
                    <div className="text-sm text-slate-700 dark:text-slate-200 mt-1 whitespace-pre-wrap">{r.output}</div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {!data ? (
            <div className="mt-4 text-sm text-amber-700 dark:text-amber-300">
              No dataset found. Upload a CSV/XLSX in Dashboard first, then come back here.
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
