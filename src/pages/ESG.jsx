import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { backendApi } from '@/api/backendClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Plus, RefreshCw, Building2, Calendar, MapPin, Ruler, FileText } from 'lucide-react';

const FRAMEWORK_OPTIONS = [
  { value: 'GRI', label: 'GRI' },
  { value: 'SASB', label: 'SASB' },
];

export default function ESG() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [projects, setProjects] = useState([]);
  const [periods, setPeriods] = useState([]);
  const [sites, setSites] = useState([]);
  const [metrics, setMetrics] = useState([]);

  const [evidence, setEvidence] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [dashboardSummary, setDashboardSummary] = useState(null);
  const [dashboardAnomalies, setDashboardAnomalies] = useState([]);
  const [dashboardFinance, setDashboardFinance] = useState(null);
  const [dashboardInsights, setDashboardInsights] = useState(null);
  const [activities, setActivities] = useState([]);

  const [activeTab, setActiveTab] = useState('sites');
  const [evidenceError, setEvidenceError] = useState('');
  const [dashboardError, setDashboardError] = useState('');

  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [selectedPeriodId, setSelectedPeriodId] = useState('');

  const [projectDialogOpen, setProjectDialogOpen] = useState(false);
  const [periodDialogOpen, setPeriodDialogOpen] = useState(false);
  const [siteDialogOpen, setSiteDialogOpen] = useState(false);
  const [metricDialogOpen, setMetricDialogOpen] = useState(false);

  const [evidenceDialogOpen, setEvidenceDialogOpen] = useState(false);
  const [evidenceFile, setEvidenceFile] = useState(null);
  const [evidenceSiteId, setEvidenceSiteId] = useState('');

  const [newProject, setNewProject] = useState({ name: '', description: '' });
  const [newPeriod, setNewPeriod] = useState({ name: '', framework: 'GRI', start_date: '', end_date: '' });
  const [newSite, setNewSite] = useState({ name: '', country: '', region: '' });
  const [newMetric, setNewMetric] = useState({
    site_id: '',
    scope: '',
    category: '',
    subcategory: '',
    value: '',
    unit: '',
    notes: '',
  });

  const selectedProject = useMemo(
    () => projects.find((p) => String(p.id) === String(selectedProjectId)) || null,
    [projects, selectedProjectId]
  );

  const selectedPeriod = useMemo(
    () => periods.find((p) => String(p.id) === String(selectedPeriodId)) || null,
    [periods, selectedPeriodId]
  );

  const loadProjects = useCallback(async () => {
    setError('');
    setLoading(true);
    try {
      const rows = await backendApi.esg.projects.list();
      setProjects(Array.isArray(rows) ? rows : []);
      const nextSelected = (Array.isArray(rows) && rows[0]) ? String(rows[0].id) : '';
      setSelectedProjectId((prev) => prev || nextSelected);
    } catch (e) {
      setError(e?.message || 'Failed to load ESG projects');
      setProjects([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadEvidenceAndSuggestions = useCallback(async ({ projectId, periodId }) => {
    if (!projectId || !periodId) {
      setEvidence([]);
      setSuggestions([]);
      setEvidenceError('');
      return;
    }

    setEvidenceError('');
    setLoading(true);
    try {
      const [evRows, sugRows] = await Promise.all([
        backendApi.esg.evidence.list({ projectId, periodId }),
        backendApi.esg.suggestions.list({ projectId, periodId, status: 'pending' }),
      ]);
      setEvidence(Array.isArray(evRows) ? evRows : []);
      setSuggestions(Array.isArray(sugRows) ? sugRows : []);
    } catch (e) {
      setEvidenceError(e?.message || 'Failed to load evidence');
      setEvidence([]);
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadDashboard = useCallback(async ({ projectId, periodId }) => {
    if (!projectId || !periodId) {
      setDashboardSummary(null);
      setDashboardAnomalies([]);
      setDashboardFinance(null);
      setDashboardInsights(null);
      setActivities([]);
      setDashboardError('');
      return;
    }

    setDashboardError('');
    setLoading(true);
    try {
      const [summary, anomalies, finance, acts] = await Promise.all([
        backendApi.esg.dashboard.summary({ projectId, periodId }),
        backendApi.esg.dashboard.anomalies({ projectId, periodId }),
        backendApi.esg.dashboard.financeKpis({ projectId, periodId }),
        backendApi.esg.activities.list({ projectId, periodId, limit: 50 }),
      ]);
      setDashboardSummary(summary || null);
      setDashboardAnomalies(Array.isArray(anomalies?.anomalies) ? anomalies.anomalies : []);
      setDashboardFinance(finance || null);
      setActivities(Array.isArray(acts) ? acts : []);
    } catch (e) {
      setDashboardError(e?.message || 'Failed to load dashboard');
      setDashboardSummary(null);
      setDashboardAnomalies([]);
      setDashboardFinance(null);
      setDashboardInsights(null);
      setActivities([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadProjectScopedData = useCallback(async (projectId) => {
    if (!projectId) {
      setPeriods([]);
      setSites([]);
      setSelectedPeriodId('');
      return;
    }

    setError('');
    setLoading(true);
    try {
      const [periodRows, siteRows] = await Promise.all([
        backendApi.esg.periods.list(projectId),
        backendApi.esg.sites.list(projectId),
      ]);
      const nextPeriods = Array.isArray(periodRows) ? periodRows : [];
      setPeriods(nextPeriods);
      setSites(Array.isArray(siteRows) ? siteRows : []);
      const firstPeriod = nextPeriods[0] ? String(nextPeriods[0].id) : '';
      setSelectedPeriodId((prev) => {
        if (prev && nextPeriods.some((p) => String(p.id) === String(prev))) return prev;
        return firstPeriod;
      });
    } catch (e) {
      setError(e?.message || 'Failed to load ESG project data');
      setPeriods([]);
      setSites([]);
      setSelectedPeriodId('');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadMetrics = useCallback(async ({ projectId, periodId }) => {
    if (!projectId || !periodId) {
      setMetrics([]);
      return;
    }

    setError('');
    setLoading(true);
    try {
      const rows = await backendApi.esg.metrics.list({ projectId, periodId });
      setMetrics(Array.isArray(rows) ? rows : []);
    } catch (e) {
      setError(e?.message || 'Failed to load ESG metrics');
      setMetrics([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  useEffect(() => {
    loadProjectScopedData(selectedProjectId);
  }, [selectedProjectId, loadProjectScopedData]);

  useEffect(() => {
    loadMetrics({ projectId: selectedProjectId, periodId: selectedPeriodId });
  }, [selectedProjectId, selectedPeriodId, loadMetrics]);

  useEffect(() => {
    if (activeTab !== 'evidence') return;
    loadEvidenceAndSuggestions({ projectId: selectedProjectId, periodId: selectedPeriodId });
  }, [selectedProjectId, selectedPeriodId, activeTab, loadEvidenceAndSuggestions]);

  useEffect(() => {
    if (activeTab !== 'dashboard') return;
    loadDashboard({ projectId: selectedProjectId, periodId: selectedPeriodId });
  }, [selectedProjectId, selectedPeriodId, activeTab, loadDashboard]);

  const onRefresh = async () => {
    await loadProjects();
  };

  const uploadEvidence = async () => {
    if (!selectedProjectId || !selectedPeriodId) {
      setError('Select a project and reporting period first');
      return;
    }
    if (!evidenceFile) {
      setError('Choose a file to upload');
      return;
    }

    setError('');
    setLoading(true);
    try {
      await backendApi.esg.evidence.upload({
        projectId: Number(selectedProjectId),
        periodId: Number(selectedPeriodId),
        siteId: evidenceSiteId ? Number(evidenceSiteId) : null,
        file: evidenceFile,
      });
      setEvidenceDialogOpen(false);
      setEvidenceFile(null);
      setEvidenceSiteId('');
      await loadEvidenceAndSuggestions({ projectId: selectedProjectId, periodId: selectedPeriodId });
    } catch (e) {
      setError(e?.message || 'Failed to upload evidence');
    } finally {
      setLoading(false);
    }
  };

  const runEvidenceExtraction = async (evidenceId) => {
    if (!evidenceId) return;
    setError('');
    setLoading(true);
    try {
      await backendApi.esg.evidence.extract(evidenceId);
      await loadEvidenceAndSuggestions({ projectId: selectedProjectId, periodId: selectedPeriodId });
    } catch (e) {
      setError(e?.message || 'Failed to extract evidence');
    } finally {
      setLoading(false);
    }
  };

  const reviewSuggestion = async ({ suggestionId, status }) => {
    if (!suggestionId) return;
    setError('');
    setLoading(true);
    try {
      await backendApi.esg.suggestions.review({ suggestionId, status });
      await loadEvidenceAndSuggestions({ projectId: selectedProjectId, periodId: selectedPeriodId });
      await loadMetrics({ projectId: selectedProjectId, periodId: selectedPeriodId });
    } catch (e) {
      setError(e?.message || 'Failed to update suggestion');
    } finally {
      setLoading(false);
    }
  };

  const generateAiInsights = async () => {
    if (!selectedProjectId || !selectedPeriodId) {
      setError('Select a project and reporting period first');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const out = await backendApi.esg.dashboard.insights({ projectId: selectedProjectId, periodId: selectedPeriodId });
      setDashboardInsights(out?.insights || null);
    } catch (e) {
      setError(e?.message || 'Failed to generate AI insights');
      setDashboardInsights(null);
    } finally {
      setLoading(false);
    }
  };

  const createProject = async () => {
    const name = (newProject.name || '').trim();
    if (!name) {
      setError('Project name is required');
      return;
    }

    setError('');
    setLoading(true);
    try {
      const created = await backendApi.esg.projects.create({
        name,
        description: (newProject.description || '').trim() || null,
      });
      setProjectDialogOpen(false);
      setNewProject({ name: '', description: '' });
      await loadProjects();
      if (created?.id) setSelectedProjectId(String(created.id));
    } catch (e) {
      setError(e?.message || 'Failed to create project');
    } finally {
      setLoading(false);
    }
  };

  const createPeriod = async () => {
    if (!selectedProjectId) {
      setError('Select a project first');
      return;
    }
    const name = (newPeriod.name || '').trim();
    if (!name) {
      setError('Period name is required');
      return;
    }

    setError('');
    setLoading(true);
    try {
      const payload = {
        project_id: Number(selectedProjectId),
        name,
        framework: (newPeriod.framework || '').trim() || null,
        start_date: newPeriod.start_date ? new Date(newPeriod.start_date).toISOString() : null,
        end_date: newPeriod.end_date ? new Date(newPeriod.end_date).toISOString() : null,
      };
      const created = await backendApi.esg.periods.create(payload);
      setPeriodDialogOpen(false);
      setNewPeriod({ name: '', framework: 'GRI', start_date: '', end_date: '' });
      await loadProjectScopedData(selectedProjectId);
      if (created?.id) setSelectedPeriodId(String(created.id));
    } catch (e) {
      setError(e?.message || 'Failed to create reporting period');
    } finally {
      setLoading(false);
    }
  };

  const createSite = async () => {
    if (!selectedProjectId) {
      setError('Select a project first');
      return;
    }
    const name = (newSite.name || '').trim();
    if (!name) {
      setError('Site name is required');
      return;
    }

    setError('');
    setLoading(true);
    try {
      await backendApi.esg.sites.create({
        project_id: Number(selectedProjectId),
        name,
        country: (newSite.country || '').trim() || null,
        region: (newSite.region || '').trim() || null,
      });
      setSiteDialogOpen(false);
      setNewSite({ name: '', country: '', region: '' });
      await loadProjectScopedData(selectedProjectId);
    } catch (e) {
      setError(e?.message || 'Failed to create site');
    } finally {
      setLoading(false);
    }
  };

  const createMetric = async () => {
    if (!selectedProjectId || !selectedPeriodId) {
      setError('Select a project and reporting period first');
      return;
    }
    const category = (newMetric.category || '').trim();
    if (!category) {
      setError('Metric category is required');
      return;
    }

    const valueStr = (newMetric.value || '').trim();
    const value = valueStr ? Number(valueStr) : null;
    if (valueStr && Number.isNaN(value)) {
      setError('Metric value must be a number');
      return;
    }

    setError('');
    setLoading(true);
    try {
      const payload = {
        project_id: Number(selectedProjectId),
        period_id: Number(selectedPeriodId),
        site_id: newMetric.site_id ? Number(newMetric.site_id) : null,
        scope: (newMetric.scope || '').trim() || null,
        category,
        subcategory: (newMetric.subcategory || '').trim() || null,
        value,
        unit: (newMetric.unit || '').trim() || null,
        notes: (newMetric.notes || '').trim() || null,
      };
      await backendApi.esg.metrics.create(payload);
      setMetricDialogOpen(false);
      setNewMetric({ site_id: '', scope: '', category: '', subcategory: '', value: '', unit: '', notes: '' });
      await loadMetrics({ projectId: selectedProjectId, periodId: selectedPeriodId });
    } catch (e) {
      setError(e?.message || 'Failed to create metric');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">ESG Reporting</h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            Create projects, define reporting periods, add sites and metrics, and build an auditable ESG dataset.
          </p>
        </div>
        <Button variant="outline" onClick={onRefresh} disabled={loading} className="gap-2">
          <RefreshCw className="w-4 h-4" />
          Refresh
        </Button>
      </div>

      {error ? (
        <Alert className="mb-6 border-red-300 bg-red-50 dark:bg-red-950/30 dark:border-red-900">
          <AlertDescription className="text-red-800 dark:text-red-200">{error}</AlertDescription>
        </Alert>
      ) : null}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-3">
          <div className="glass-surface p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-900 dark:text-slate-100 font-semibold">
                <Building2 className="w-4 h-4" />
                Project
              </div>
              <Dialog open={projectDialogOpen} onOpenChange={setProjectDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" className="gap-2">
                    <Plus className="w-4 h-4" />
                    New
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-lg bg-white dark:bg-slate-900">
                  <DialogHeader>
                    <DialogTitle>Create ESG Project</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Project name</label>
                      <Input value={newProject.name} onChange={(e) => setNewProject((p) => ({ ...p, name: e.target.value }))} placeholder="e.g. Acme Corp" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Description (optional)</label>
                      <Textarea value={newProject.description} onChange={(e) => setNewProject((p) => ({ ...p, description: e.target.value }))} placeholder="Optional notes" />
                    </div>
                  </div>
                  <DialogFooter className="gap-2">
                    <Button variant="outline" onClick={() => setProjectDialogOpen(false)} disabled={loading}>Cancel</Button>
                    <Button onClick={createProject} disabled={loading}>Create</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a project" />
              </SelectTrigger>
              <SelectContent>
                {projects.map((p) => (
                  <SelectItem key={p.id} value={String(p.id)}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="pt-2 border-t border-slate-200 dark:border-slate-800" />

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-900 dark:text-slate-100 font-semibold">
                <Calendar className="w-4 h-4" />
                Reporting period
              </div>
              <Dialog open={periodDialogOpen} onOpenChange={setPeriodDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" className="gap-2" disabled={!selectedProjectId}>
                    <Plus className="w-4 h-4" />
                    New
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-lg bg-white dark:bg-slate-900">
                  <DialogHeader>
                    <DialogTitle>Create Reporting Period</DialogTitle>
                  </DialogHeader>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Period name</label>
                      <Input value={newPeriod.name} onChange={(e) => setNewPeriod((p) => ({ ...p, name: e.target.value }))} placeholder="e.g. FY2026" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Framework</label>
                      <Select value={newPeriod.framework} onValueChange={(v) => setNewPeriod((p) => ({ ...p, framework: v }))}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select framework" />
                        </SelectTrigger>
                        <SelectContent>
                          {FRAMEWORK_OPTIONS.map((o) => (
                            <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Start date (optional)</label>
                        <Input type="date" value={newPeriod.start_date} onChange={(e) => setNewPeriod((p) => ({ ...p, start_date: e.target.value }))} />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">End date (optional)</label>
                        <Input type="date" value={newPeriod.end_date} onChange={(e) => setNewPeriod((p) => ({ ...p, end_date: e.target.value }))} />
                      </div>
                    </div>
                  </div>

                  <DialogFooter className="gap-2">
                    <Button variant="outline" onClick={() => setPeriodDialogOpen(false)} disabled={loading}>Cancel</Button>
                    <Button onClick={createPeriod} disabled={loading}>Create</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            <Select value={selectedPeriodId} onValueChange={setSelectedPeriodId}>
              <SelectTrigger>
                <SelectValue placeholder={selectedProjectId ? 'Select a period' : 'Select a project first'} />
              </SelectTrigger>
              <SelectContent>
                {periods.map((p) => (
                  <SelectItem key={p.id} value={String(p.id)}>
                    {p.name}{p.framework ? ` · ${p.framework}` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="pt-2 border-t border-slate-200 dark:border-slate-800" />

            <div className="text-xs text-slate-600 dark:text-slate-300 space-y-1">
              <div>
                <span className="font-semibold">Selected:</span>{' '}
                {selectedProject ? selectedProject.name : 'No project'}
              </div>
              <div>
                <span className="font-semibold">Period:</span>{' '}
                {selectedPeriod ? selectedPeriod.name : 'No period'}
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-9">
          <div className="glass-surface p-4">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-5">
              <TabsList className="bg-slate-900/80 border border-slate-700/50 p-1">
                <TabsTrigger value="sites" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white font-semibold">
                  <MapPin className="w-4 h-4 mr-2" /> Sites
                </TabsTrigger>
                <TabsTrigger value="metrics" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white font-semibold">
                  <Ruler className="w-4 h-4 mr-2" /> Metrics
                </TabsTrigger>
                <TabsTrigger value="evidence" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white font-semibold">
                  <FileText className="w-4 h-4 mr-2" /> Evidence
                </TabsTrigger>
                <TabsTrigger value="dashboard" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white font-semibold">
                  <FileText className="w-4 h-4 mr-2" /> Dashboard
                </TabsTrigger>
              </TabsList>

              <TabsContent value="sites" className="space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-lg font-semibold text-slate-900 dark:text-slate-100">Sites</div>
                    <div className="text-sm text-slate-600 dark:text-slate-300">Facilities/locations where metrics are reported.</div>
                  </div>
                  <Dialog open={siteDialogOpen} onOpenChange={setSiteDialogOpen}>
                    <DialogTrigger asChild>
                      <Button className="gap-2" disabled={!selectedProjectId}>
                        <Plus className="w-4 h-4" /> Add site
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-lg bg-white dark:bg-slate-900">
                      <DialogHeader>
                        <DialogTitle>Add Site</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Site name</label>
                          <Input value={newSite.name} onChange={(e) => setNewSite((s) => ({ ...s, name: e.target.value }))} placeholder="e.g. Mumbai Plant" />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Country (optional)</label>
                            <Input value={newSite.country} onChange={(e) => setNewSite((s) => ({ ...s, country: e.target.value }))} placeholder="e.g. India" />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Region (optional)</label>
                            <Input value={newSite.region} onChange={(e) => setNewSite((s) => ({ ...s, region: e.target.value }))} placeholder="e.g. APAC" />
                          </div>
                        </div>
                      </div>
                      <DialogFooter className="gap-2">
                        <Button variant="outline" onClick={() => setSiteDialogOpen(false)} disabled={loading}>Cancel</Button>
                        <Button onClick={createSite} disabled={loading}>Save</Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>

                <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white/60 dark:bg-slate-950/20">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Country</TableHead>
                        <TableHead>Region</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sites.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={3} className="text-center text-slate-600 dark:text-slate-300 py-8">
                            {selectedProjectId ? 'No sites yet. Add your first site.' : 'Select a project to manage sites.'}
                          </TableCell>
                        </TableRow>
                      ) : (
                        sites.map((s) => (
                          <TableRow key={s.id}>
                            <TableCell className="font-medium">{s.name}</TableCell>
                            <TableCell>{s.country || '-'}</TableCell>
                            <TableCell>{s.region || '-'}</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>

              <TabsContent value="metrics" className="space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-lg font-semibold text-slate-900 dark:text-slate-100">Metrics</div>
                    <div className="text-sm text-slate-600 dark:text-slate-300">Capture ESG metrics for the selected period.</div>
                  </div>
                  <Dialog open={metricDialogOpen} onOpenChange={setMetricDialogOpen}>
                    <DialogTrigger asChild>
                      <Button className="gap-2" disabled={!selectedProjectId || !selectedPeriodId}>
                        <Plus className="w-4 h-4" /> Add metric
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl bg-white dark:bg-slate-900">
                      <DialogHeader>
                        <DialogTitle>Add Metric</DialogTitle>
                      </DialogHeader>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Category</label>
                          <Input value={newMetric.category} onChange={(e) => setNewMetric((m) => ({ ...m, category: e.target.value }))} placeholder="e.g. GHG Emissions" />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Subcategory (optional)</label>
                          <Input value={newMetric.subcategory} onChange={(e) => setNewMetric((m) => ({ ...m, subcategory: e.target.value }))} placeholder="e.g. Scope 2" />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Scope (optional)</label>
                          <Input value={newMetric.scope} onChange={(e) => setNewMetric((m) => ({ ...m, scope: e.target.value }))} placeholder="e.g. Scope 1/2/3" />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Site (optional)</label>
                          <Select value={newMetric.site_id} onValueChange={(v) => setNewMetric((m) => ({ ...m, site_id: v }))}>
                            <SelectTrigger>
                              <SelectValue placeholder="All sites / none" />
                            </SelectTrigger>
                            <SelectContent>
                              {sites.map((s) => (
                                <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Value (optional)</label>
                          <Input value={newMetric.value} onChange={(e) => setNewMetric((m) => ({ ...m, value: e.target.value }))} placeholder="e.g. 1250" />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Unit (optional)</label>
                          <Input value={newMetric.unit} onChange={(e) => setNewMetric((m) => ({ ...m, unit: e.target.value }))} placeholder="e.g. tCO2e" />
                        </div>
                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Notes (optional)</label>
                          <Textarea value={newMetric.notes} onChange={(e) => setNewMetric((m) => ({ ...m, notes: e.target.value }))} placeholder="Methodology / calculation notes" />
                        </div>
                      </div>
                      <DialogFooter className="gap-2">
                        <Button variant="outline" onClick={() => setMetricDialogOpen(false)} disabled={loading}>Cancel</Button>
                        <Button onClick={createMetric} disabled={loading}>Save</Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>

                <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white/60 dark:bg-slate-950/20">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Category</TableHead>
                        <TableHead>Subcategory</TableHead>
                        <TableHead>Scope</TableHead>
                        <TableHead>Site</TableHead>
                        <TableHead className="text-right">Value</TableHead>
                        <TableHead>Unit</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {metrics.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center text-slate-600 dark:text-slate-300 py-8">
                            {selectedProjectId && selectedPeriodId
                              ? 'No metrics yet. Add your first metric.'
                              : 'Select a project and reporting period to manage metrics.'}
                          </TableCell>
                        </TableRow>
                      ) : (
                        metrics.map((m) => {
                          const site = m.site_id ? sites.find((s) => String(s.id) === String(m.site_id)) : null;
                          return (
                            <TableRow key={m.id}>
                              <TableCell className="font-medium">{m.category}</TableCell>
                              <TableCell>{m.subcategory || '-'}</TableCell>
                              <TableCell>{m.scope || '-'}</TableCell>
                              <TableCell>{site ? site.name : '-'}</TableCell>
                              <TableCell className="text-right">{m.value == null ? '-' : String(m.value)}</TableCell>
                              <TableCell>{m.unit || '-'}</TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>

              <TabsContent value="dashboard" className="space-y-4">
                {!selectedProjectId || !selectedPeriodId ? (
                  <div className="bg-white/60 dark:bg-slate-950/20 border border-slate-200 dark:border-slate-800 rounded-2xl p-6">
                    <div className="text-lg font-semibold text-slate-900 dark:text-slate-100">Dashboard</div>
                    <div className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                      Select a project and reporting period to see ESG coverage, anomalies, and AI insights.
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {dashboardError ? (
                      <Alert>
                        <AlertDescription>{dashboardError}</AlertDescription>
                      </Alert>
                    ) : null}

                    <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                      <div className="bg-white/60 dark:bg-slate-950/20 border border-slate-200 dark:border-slate-800 rounded-2xl p-4">
                        <div className="text-xs text-slate-600 dark:text-slate-300">Sites</div>
                        <div className="text-2xl font-semibold">{dashboardSummary?.counts?.sites ?? '-'}</div>
                      </div>
                      <div className="bg-white/60 dark:bg-slate-950/20 border border-slate-200 dark:border-slate-800 rounded-2xl p-4">
                        <div className="text-xs text-slate-600 dark:text-slate-300">Metrics</div>
                        <div className="text-2xl font-semibold">{dashboardSummary?.counts?.metrics ?? '-'}</div>
                      </div>
                      <div className="bg-white/60 dark:bg-slate-950/20 border border-slate-200 dark:border-slate-800 rounded-2xl p-4">
                        <div className="text-xs text-slate-600 dark:text-slate-300">Evidence</div>
                        <div className="text-2xl font-semibold">{dashboardSummary?.counts?.evidence ?? '-'}</div>
                      </div>
                      <div className="bg-white/60 dark:bg-slate-950/20 border border-slate-200 dark:border-slate-800 rounded-2xl p-4">
                        <div className="text-xs text-slate-600 dark:text-slate-300">Pending AI suggestions</div>
                        <div className="text-2xl font-semibold">{dashboardSummary?.counts?.pending_suggestions ?? '-'}</div>
                      </div>
                      <div className="bg-white/60 dark:bg-slate-950/20 border border-slate-200 dark:border-slate-800 rounded-2xl p-4">
                        <div className="text-xs text-slate-600 dark:text-slate-300">Metrics w/o evidence</div>
                        <div className="text-2xl font-semibold">{dashboardSummary?.counts?.metrics_without_evidence ?? '-'}</div>
                      </div>
                    </div>

                    {Number(dashboardSummary?.counts?.metrics_without_evidence || 0) > 0 ? (
                      <Alert>
                        <AlertDescription>
                          {dashboardSummary.counts.metrics_without_evidence} metrics do not have evidence linked yet. Upload evidence and/or link metrics to source documents.
                        </AlertDescription>
                      </Alert>
                    ) : null}

                    {Number(dashboardSummary?.counts?.pending_suggestions || 0) > 0 ? (
                      <div className="bg-white/60 dark:bg-slate-950/20 border border-slate-200 dark:border-slate-800 rounded-2xl p-4">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">AI suggestions to review</div>
                            <div className="text-xs text-slate-600 dark:text-slate-300">Approve to create metrics automatically.</div>
                          </div>
                        </div>
                        <div className="mt-3 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Category</TableHead>
                                <TableHead>Subcategory</TableHead>
                                <TableHead className="text-right">Value</TableHead>
                                <TableHead>Unit</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {suggestions.slice(0, 10).map((s) => (
                                <TableRow key={s.id}>
                                  <TableCell className="font-medium">{s.category}</TableCell>
                                  <TableCell>{s.subcategory || '-'}</TableCell>
                                  <TableCell className="text-right">{s.value == null ? '-' : String(s.value)}</TableCell>
                                  <TableCell>{s.unit || '-'}</TableCell>
                                  <TableCell className="text-right">
                                    <div className="flex justify-end gap-2">
                                      <Button size="sm" onClick={() => reviewSuggestion({ suggestionId: s.id, status: 'approved' })} disabled={loading}>Approve</Button>
                                      <Button size="sm" variant="outline" onClick={() => reviewSuggestion({ suggestionId: s.id, status: 'rejected' })} disabled={loading}>Reject</Button>
                                    </div>
                                  </TableCell>
                                </TableRow>
                              ))}
                              {suggestions.length === 0 ? (
                                <TableRow>
                                  <TableCell colSpan={5} className="text-center text-slate-600 dark:text-slate-300 py-8">
                                    No pending AI suggestions.
                                  </TableCell>
                                </TableRow>
                              ) : null}
                            </TableBody>
                          </Table>
                        </div>
                      </div>
                    ) : null}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="bg-white/60 dark:bg-slate-950/20 border border-slate-200 dark:border-slate-800 rounded-2xl p-4">
                        <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">Finance KPIs</div>
                        <div className="mt-3 text-sm text-slate-700 dark:text-slate-200 space-y-1">
                          <div className="flex items-center justify-between">
                            <span>Total utilities spend</span>
                            <span className="font-semibold">{dashboardFinance?.kpis?.total_utilities_spend ?? '-'}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span>Total emissions reported</span>
                            <span className="font-semibold">{dashboardFinance?.kpis?.total_emissions_reported ?? '-'}</span>
                          </div>
                        </div>
                        <div className="mt-2 text-xs text-slate-600 dark:text-slate-300">
                          Add cost metrics (unit GBP/USD/EUR/INR or category contains “cost/spend”) to improve finance reporting.
                        </div>
                      </div>

                      <div className="bg-white/60 dark:bg-slate-950/20 border border-slate-200 dark:border-slate-800 rounded-2xl p-4">
                        <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">Anomalies</div>
                        <div className="mt-3 text-sm text-slate-700 dark:text-slate-200">
                          {dashboardAnomalies.length === 0 ? (
                            <div className="text-xs text-slate-600 dark:text-slate-300">No anomalies detected yet (needs enough data points).</div>
                          ) : (
                            <div className="space-y-2">
                              {dashboardAnomalies.slice(0, 5).map((a, idx) => (
                                <div key={`${a.key}-${idx}`} className="flex items-center justify-between">
                                  <span className="truncate pr-2">{a.key}</span>
                                  <span className="font-semibold">z={Number(a.z_score || 0).toFixed(1)}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="bg-white/60 dark:bg-slate-950/20 border border-slate-200 dark:border-slate-800 rounded-2xl p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">AI Insights</div>
                          <div className="text-xs text-slate-600 dark:text-slate-300">Generate a narrative with recommendations + citations.</div>
                        </div>
                        <Button onClick={generateAiInsights} disabled={loading} className="gap-2">
                          <RefreshCw className="w-4 h-4" /> Generate
                        </Button>
                      </div>
                      <div className="mt-3 text-sm text-slate-700 dark:text-slate-200 whitespace-pre-wrap">
                        {dashboardInsights ? (typeof dashboardInsights === 'string' ? dashboardInsights : JSON.stringify(dashboardInsights, null, 2)) : 'No insights generated yet.'}
                      </div>
                    </div>

                    <div className="bg-white/60 dark:bg-slate-950/20 border border-slate-200 dark:border-slate-800 rounded-2xl p-4">
                      <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">Activities</div>
                      <div className="mt-3 text-sm text-slate-700 dark:text-slate-200">
                        {activities.length === 0 ? (
                          <div className="text-xs text-slate-600 dark:text-slate-300">No activity yet.</div>
                        ) : (
                          <div className="space-y-2">
                            {activities.slice(0, 10).map((a) => (
                              <div key={a.id} className="flex items-center justify-between gap-3">
                                <span className="truncate">{a.activity_type}</span>
                                <span className="text-xs text-slate-600 dark:text-slate-300">{a.created_date ? new Date(a.created_date).toLocaleString() : ''}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="evidence" className="space-y-4">
                {evidenceError ? (
                  <Alert>
                    <AlertDescription>{evidenceError}</AlertDescription>
                  </Alert>
                ) : null}
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-lg font-semibold text-slate-900 dark:text-slate-100">Evidence</div>
                    <div className="text-sm text-slate-600 dark:text-slate-300">Upload invoices/bills/spreadsheets and let AI suggest metrics.</div>
                  </div>
                  <Dialog open={evidenceDialogOpen} onOpenChange={setEvidenceDialogOpen}>
                    <DialogTrigger asChild>
                      <Button className="gap-2" disabled={!selectedProjectId || !selectedPeriodId}>
                        <Plus className="w-4 h-4" /> Upload evidence
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl bg-white dark:bg-slate-900">
                      <DialogHeader>
                        <DialogTitle>Upload Evidence</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Site (optional)</label>
                          <Select value={evidenceSiteId} onValueChange={setEvidenceSiteId}>
                            <SelectTrigger>
                              <SelectValue placeholder="Link to a site (optional)" />
                            </SelectTrigger>
                            <SelectContent>
                              {sites.map((s) => (
                                <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">File</label>
                          <Input type="file" onChange={(e) => setEvidenceFile(e.target.files?.[0] || null)} />
                          <div className="mt-1 text-xs text-slate-600 dark:text-slate-300">PDF, CSV, XLSX are supported for best extraction.</div>
                        </div>
                      </div>
                      <DialogFooter className="gap-2">
                        <Button variant="outline" onClick={() => setEvidenceDialogOpen(false)} disabled={loading}>Cancel</Button>
                        <Button onClick={uploadEvidence} disabled={loading}>Upload</Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white/60 dark:bg-slate-950/20">
                    <div className="p-4 border-b border-slate-200 dark:border-slate-800">
                      <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">Uploaded evidence</div>
                      <div className="text-xs text-slate-600 dark:text-slate-300">Run extraction to create AI metric suggestions.</div>
                    </div>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Filename</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {evidence.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={3} className="text-center text-slate-600 dark:text-slate-300 py-8">
                              {selectedProjectId && selectedPeriodId ? 'No evidence yet. Upload the first document.' : 'Select a project and period first.'}
                            </TableCell>
                          </TableRow>
                        ) : (
                          evidence.map((ev) => (
                            <TableRow key={ev.id}>
                              <TableCell className="font-medium truncate max-w-[220px]">{ev.filename}</TableCell>
                              <TableCell>{ev.status || '-'}</TableCell>
                              <TableCell className="text-right">
                                <div className="flex justify-end gap-2">
                                  <Button size="sm" variant="outline" onClick={() => window.open(backendApi.esg.evidence.downloadUrl(ev.id), '_blank')} disabled={loading}>
                                    Open
                                  </Button>
                                  <Button size="sm" onClick={() => runEvidenceExtraction(ev.id)} disabled={loading}>
                                    Extract
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>

                  <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white/60 dark:bg-slate-950/20">
                    <div className="p-4 border-b border-slate-200 dark:border-slate-800">
                      <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">AI metric suggestions</div>
                      <div className="text-xs text-slate-600 dark:text-slate-300">Approve suggestions to create metrics.</div>
                    </div>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Category</TableHead>
                          <TableHead className="text-right">Value</TableHead>
                          <TableHead>Unit</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {suggestions.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={4} className="text-center text-slate-600 dark:text-slate-300 py-8">
                              No pending suggestions. Upload evidence and run Extract.
                            </TableCell>
                          </TableRow>
                        ) : (
                          suggestions.map((s) => (
                            <TableRow key={s.id}>
                              <TableCell className="font-medium">{s.category}{s.subcategory ? ` · ${s.subcategory}` : ''}</TableCell>
                              <TableCell className="text-right">{s.value == null ? '-' : String(s.value)}</TableCell>
                              <TableCell>{s.unit || '-'}</TableCell>
                              <TableCell className="text-right">
                                <div className="flex justify-end gap-2">
                                  <Button size="sm" onClick={() => reviewSuggestion({ suggestionId: s.id, status: 'approved' })} disabled={loading}>Approve</Button>
                                  <Button size="sm" variant="outline" onClick={() => reviewSuggestion({ suggestionId: s.id, status: 'rejected' })} disabled={loading}>Reject</Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
}
