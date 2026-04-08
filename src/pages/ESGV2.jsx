import React, { useEffect, useMemo, useState } from 'react';
import { backendApi } from '@/api/backendClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function ESGV2() {
  const [projects, setProjects] = useState([]);
  const [periods, setPeriods] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [selectedPeriodId, setSelectedPeriodId] = useState('');

  const [frameworks, setFrameworks] = useState([]);
  const [metricDefs, setMetricDefs] = useState([]);
  const [metricValues, setMetricValues] = useState([]);

  const [newFrameworkKey, setNewFrameworkKey] = useState('esrs');
  const [newFrameworkName, setNewFrameworkName] = useState('ESRS/CSRD');

  const [newMetricKey, setNewMetricKey] = useState('ghg_scope_1');
  const [newMetricName, setNewMetricName] = useState('GHG Scope 1');
  const [newMetricUnit, setNewMetricUnit] = useState('tCO2e');

  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const projectId = useMemo(() => (selectedProjectId ? Number(selectedProjectId) : null), [selectedProjectId]);
  const periodId = useMemo(() => (selectedPeriodId ? Number(selectedPeriodId) : null), [selectedPeriodId]);

  const loadProjects = async () => {
    const rows = await backendApi.esg.projects.list();
    setProjects(rows || []);
  };

  const loadPeriods = async (pid) => {
    if (!pid) {
      setPeriods([]);
      return;
    }
    const rows = await backendApi.esg.periods.list(pid);
    setPeriods(rows || []);
  };

  const loadV2 = async ({ pid, perId }) => {
    if (!pid) return;
    const [fw, defs] = await Promise.all([
      backendApi.esgV2.frameworks.list({ projectId: pid }),
      backendApi.esgV2.metricDefinitions.list({ projectId: pid }),
    ]);
    setFrameworks(fw || []);
    setMetricDefs(defs || []);

    if (perId) {
      const vals = await backendApi.esgV2.metricValues.list({ projectId: pid, periodId: perId });
      setMetricValues(vals || []);
    } else {
      setMetricValues([]);
    }
  };

  useEffect(() => {
    loadProjects().catch((e) => setError(e.message || String(e)));
  }, []);

  useEffect(() => {
    setError('');
    if (!projectId) {
      setPeriods([]);
      setSelectedPeriodId('');
      setFrameworks([]);
      setMetricDefs([]);
      setMetricValues([]);
      return;
    }
    loadPeriods(projectId).catch((e) => setError(e.message || String(e)));
    loadV2({ pid: projectId, perId: periodId }).catch((e) => setError(e.message || String(e)));
  }, [projectId]);

  useEffect(() => {
    setError('');
    if (!projectId) return;
    loadV2({ pid: projectId, perId: periodId }).catch((e) => setError(e.message || String(e)));
  }, [periodId]);

  const onUpsertFramework = async () => {
    if (!projectId) return;
    setBusy(true);
    setError('');
    try {
      await backendApi.esgV2.frameworks.upsert({
        project_id: projectId,
        key: newFrameworkKey,
        name: newFrameworkName,
        enabled: true,
      });
      await loadV2({ pid: projectId, perId: periodId });
    } catch (e) {
      setError(e.message || String(e));
    } finally {
      setBusy(false);
    }
  };

  const onUpsertMetricDef = async () => {
    if (!projectId) return;
    setBusy(true);
    setError('');
    try {
      await backendApi.esgV2.metricDefinitions.upsert({
        project_id: projectId,
        key: newMetricKey,
        name: newMetricName,
        unit: newMetricUnit,
        granularity: 'org',
      });
      await loadV2({ pid: projectId, perId: periodId });
    } catch (e) {
      setError(e.message || String(e));
    } finally {
      setBusy(false);
    }
  };

  const onCreateMetricValue = async () => {
    if (!projectId || !periodId) return;
    if (!metricDefs.length) {
      setError('Create a metric definition first.');
      return;
    }
    const metric_definition_id = metricDefs[0]?.id;
    setBusy(true);
    setError('');
    try {
      await backendApi.esgV2.metricValues.upsert({
        project_id: projectId,
        period_id: periodId,
        metric_definition_id,
        value: 123,
        unit: metricDefs[0]?.unit || null,
        status: 'submitted',
      });
      await loadV2({ pid: projectId, perId: periodId });
    } catch (e) {
      setError(e.message || String(e));
    } finally {
      setBusy(false);
    }
  };

  const onApproveFirst = async () => {
    if (!projectId || !periodId) return;
    if (!metricValues.length) {
      setError('No metric values to approve.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await backendApi.esgV2.metricValues.approve({
        project_id: projectId,
        period_id: periodId,
        metric_value_id: metricValues[0].id,
        evidence_waiver: false,
      });
      await loadV2({ pid: projectId, perId: periodId });
    } catch (e) {
      setError(e.message || String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <div className="max-w-6xl mx-auto px-6 py-8 space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">ESG v2 (Platform Foundation)</h1>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Framework-agnostic model: frameworks, metric definitions, metric values, evidence linking, strict approval.
          </p>
        </div>

        {error ? (
          <Card className="border-red-200 bg-red-50 dark:bg-red-950/30 dark:border-red-900">
            <CardContent className="py-3 text-sm text-red-800 dark:text-red-200">{error}</CardContent>
          </Card>
        ) : null}

        <Card>
          <CardHeader>
            <CardTitle>Context</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Project</Label>
              <select
                className="w-full h-10 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 text-sm"
                value={selectedProjectId}
                onChange={(e) => setSelectedProjectId(e.target.value)}
              >
                <option value="">Select project</option>
                {projects.map((p) => (
                  <option key={p.id} value={String(p.id)}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Period</Label>
              <select
                className="w-full h-10 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 text-sm"
                value={selectedPeriodId}
                onChange={(e) => setSelectedPeriodId(e.target.value)}
                disabled={!projectId}
              >
                <option value="">Select period</option>
                {periods.map((p) => (
                  <option key={p.id} value={String(p.id)}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Frameworks</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Framework key</Label>
                  <Input value={newFrameworkKey} onChange={(e) => setNewFrameworkKey(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Framework name</Label>
                  <Input value={newFrameworkName} onChange={(e) => setNewFrameworkName(e.target.value)} />
                </div>
              </div>
              <Button onClick={onUpsertFramework} disabled={!projectId || busy}>
                Upsert framework
              </Button>

              <div className="text-sm text-slate-700 dark:text-slate-200">
                {frameworks.length ? (
                  <ul className="space-y-1">
                    {frameworks.map((f) => (
                      <li key={f.id}>
                        {f.key} — {f.name} ({f.enabled ? 'enabled' : 'disabled'})
                      </li>
                    ))}
                  </ul>
                ) : (
                  <span>No frameworks yet.</span>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Metric Definitions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="space-y-2">
                  <Label>Key</Label>
                  <Input value={newMetricKey} onChange={(e) => setNewMetricKey(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Name</Label>
                  <Input value={newMetricName} onChange={(e) => setNewMetricName(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Unit</Label>
                  <Input value={newMetricUnit} onChange={(e) => setNewMetricUnit(e.target.value)} />
                </div>
              </div>
              <Button onClick={onUpsertMetricDef} disabled={!projectId || busy}>
                Upsert metric definition
              </Button>

              <div className="text-sm text-slate-700 dark:text-slate-200">
                {metricDefs.length ? (
                  <ul className="space-y-1">
                    {metricDefs.map((m) => (
                      <li key={m.id}>
                        {m.key} — {m.name} ({m.unit || 'unitless'})
                      </li>
                    ))}
                  </ul>
                ) : (
                  <span>No metric definitions yet.</span>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Metric Values</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-3">
              <Button onClick={onCreateMetricValue} disabled={!projectId || !periodId || busy}>
                Create/Update sample metric value
              </Button>
              <Button onClick={onApproveFirst} disabled={!projectId || !periodId || busy}>
                Approve first metric value (requires evidence)
              </Button>
            </div>

            <div className="text-sm text-slate-700 dark:text-slate-200">
              {metricValues.length ? (
                <ul className="space-y-1">
                  {metricValues.map((v) => (
                    <li key={v.id}>
                      MV#{v.id} — def:{v.metric_definition_id} — {v.value ?? 'null'} {v.unit || ''} — {v.status}
                    </li>
                  ))}
                </ul>
              ) : (
                <span>No metric values yet.</span>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
