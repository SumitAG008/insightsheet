import React, { useState, useEffect } from 'react';
import backendApi from '@/api/backendClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';

export default function SupplierRiskDueDiligence() {
  const [projects, setProjects] = useState([]);
  const [periods, setPeriods] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [selectedPeriodId, setSelectedPeriodId] = useState('');
  
  const [exportUrl, setExportUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const loadProjects = async () => {
    try {
      const rows = await backendApi.esg.projects.list();
      setProjects(rows || []);
    } catch (e) {
      console.error(e);
    }
  };

  const loadPeriods = async (pid) => {
    if (!pid) {
      setPeriods([]);
      return;
    }
    try {
      const rows = await backendApi.esg.periods.list(pid);
      setPeriods(rows || []);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadProjects();
  }, []);

  useEffect(() => {
    if (selectedProjectId) {
      loadPeriods(selectedProjectId);
    }
  }, [selectedProjectId]);

  const handleExport = async () => {
    if (!selectedProjectId || !selectedPeriodId) return;
    setBusy(true);
    setError('');
    setExportUrl('');
    try {
      const res = await backendApi.esgV2.export(selectedProjectId, selectedPeriodId);
      if (res && res.url) {
        setExportUrl(res.url);
      } else {
        setError("Failed to generate AWS S3 export link.");
      }
    } catch (e) {
      setError(e.message || String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">Supplier Risk &amp; Due Diligence</h1>
        <p className="text-slate-600 dark:text-slate-300">
          Supplier screening, ESG scorecards, evidence collection, remediation workflows, and assurance-ready exports.
        </p>
      </div>

      <div className="mt-8 grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>What you’ll manage here</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-disc pl-5 text-slate-700 dark:text-slate-200 space-y-1">
              <li>Supplier registry and tiering</li>
              <li>Risk screening (country/sector, allegations, sanctions)</li>
              <li>Supplier questionnaires and evidence vault</li>
              <li>Corrective action plans and remediation tracking</li>
              <li>Regulatory reporting packs (LkSG / CSDDD)</li>
            </ul>
          </CardContent>
        </Card>

        <Card className="border-indigo-200 bg-indigo-50/50 dark:bg-indigo-950/20 dark:border-indigo-900">
          <CardHeader>
            <CardTitle>AWS S3 Regulatory Export</CardTitle>
            <CardDescription>
              Generate compliance and regulatory reports for all customers (Basic to Pro) stored durably on AWS S3.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <div className="p-3 text-sm text-red-800 bg-red-100 rounded-md dark:bg-red-900/30 dark:text-red-200">
                {error}
              </div>
            )}
            
            <div className="space-y-3">
              <div>
                <Label>Select Project</Label>
                <select
                  className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 dark:bg-slate-900 dark:border-slate-700"
                  value={selectedProjectId}
                  onChange={(e) => setSelectedProjectId(e.target.value)}
                >
                  <option value="">-- Choose a Project --</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <Label>Select Period</Label>
                <select
                  className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 dark:bg-slate-900 dark:border-slate-700"
                  value={selectedPeriodId}
                  onChange={(e) => setSelectedPeriodId(e.target.value)}
                  disabled={!selectedProjectId}
                >
                  <option value="">-- Choose a Period --</option>
                  {periods.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              <div className="pt-2">
                <Button 
                  onClick={handleExport} 
                  disabled={!selectedProjectId || !selectedPeriodId || busy}
                  className="w-full sm:w-auto"
                >
                  {busy ? 'Generating Export on S3...' : 'Export to AWS S3'}
                </Button>
              </div>

              {exportUrl && (
                <div className="mt-4 p-4 border border-green-200 bg-green-50 rounded-lg dark:bg-green-900/20 dark:border-green-900">
                  <h3 className="font-medium text-green-900 dark:text-green-100 flex items-center mb-2">
                    ✅ Export Successfully Generated
                  </h3>
                  <p className="text-sm text-green-800 dark:text-green-200 break-all mb-4">
                    Your ESG report has been uploaded to AWS S3 and is ready to download securely.
                  </p>
                  <a 
                    href={exportUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ring-offset-background bg-slate-900 text-white hover:bg-slate-900/90 h-10 py-2 px-4 shadow-md dark:bg-indigo-600 dark:text-white dark:hover:bg-indigo-700"
                  >
                    Download S3 Report (JSON)
                  </a>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
