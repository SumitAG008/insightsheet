import React, { useState, useEffect } from 'react';
import backendApi from '@/api/backendClient';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { AlertTriangle, CheckCircle, ShieldCheck, Activity, Award, BrainCircuit, FileSearch, Sparkles } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function ComplianceAudit() {
  const [projects, setProjects] = useState([]);
  const [periods, setPeriods] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [selectedPeriodId, setSelectedPeriodId] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [report, setReport] = useState(null);

  useEffect(() => {
    backendApi.esg.projects.list()
      .then(rows => {
        setProjects(rows || []);
      })
      .catch(console.error);
  }, []);

  useEffect(() => {
    if (selectedProjectId) {
      backendApi.esg.periods.list(selectedProjectId)
        .then(rows => setPeriods(rows || []))
        .catch(console.error);
    }
  }, [selectedProjectId]);

  useEffect(() => {
    if (selectedProjectId && selectedPeriodId) {
      setLoading(true);
      setError('');
      backendApi.esgV2.auditReport(selectedProjectId, selectedPeriodId)
        .then(data => setReport(data))
        .catch(e => setError(e.message || String(e)))
        .finally(() => setLoading(false));
    }
  }, [selectedProjectId, selectedPeriodId]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col relative overflow-hidden">
      {/* Decorative gradients */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl -z-10 animate-pulse" />
      <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-3xl -z-10" />

      <div className="container mx-auto px-4 py-10 max-w-7xl z-10">
        <header className="mb-10 text-center animate-in fade-in slide-in-from-bottom-4 duration-700">
          <Badge className="mb-3 bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 px-3 py-1 border border-indigo-500/20">
            <ShieldCheck className="w-4 h-4 mr-2 inline" /> AI-Powered Audit
          </Badge>
          <h1 className="text-4xl md:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white via-indigo-200 to-blue-200 tracking-tight">
            Compliance & Audit Intelligence
          </h1>
          <p className="mt-4 text-slate-400 max-w-2xl mx-auto text-lg">
            Continuous anomaly detection, historical benchmarking, and AI narrative generation for assurance-ready ESG disclosures.
          </p>
        </header>

        {/* Setup Form */}
        <div className="grid md:grid-cols-2 gap-4 mb-8 bg-slate-900/50 backdrop-blur-md p-6 rounded-2xl border border-slate-800 shadow-2xl">
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-2">Select Project</label>
            <select
              className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2.5 px-3 text-slate-200 focus:ring-2 focus:ring-indigo-500 transition-shadow"
              onChange={(e) => setSelectedProjectId(e.target.value)}
              value={selectedProjectId}
            >
              <option value="">-- Choose Project --</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-2">Select Period</label>
            <select
              className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2.5 px-3 text-slate-200 focus:ring-2 focus:ring-indigo-500 transition-shadow"
              onChange={(e) => setSelectedPeriodId(e.target.value)}
              value={selectedPeriodId}
              disabled={!selectedProjectId}
            >
              <option value="">-- Choose Period --</option>
              {periods.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
        </div>

        {loading && (
          <div className="flex justify-center py-20 text-indigo-400 animate-pulse">
            <BrainCircuit className="w-12 h-12 animate-spin-slow" />
            <span className="ml-4 text-xl font-medium mt-2">AI is evaluating your framework compliance...</span>
          </div>
        )}

        {error && (
          <Alert className="border-red-500/50 bg-red-500/10 text-red-200">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {!loading && report && (
          <div className="grid lg:grid-cols-12 gap-8 animate-in fade-in zoom-in-95 duration-500">
            {/* Main Content Column */}
            <div className="lg:col-span-8 space-y-8">
              
              {/* AI Narrative Panel */}
              <Card className="bg-gradient-to-br from-slate-900 to-indigo-950/40 border-slate-800/80 shadow-xl overflow-hidden relative">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500" />
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-indigo-400" />
                    <CardTitle className="text-xl text-slate-100">AI Narrative Draft</CardTitle>
                  </div>
                  <CardDescription className="text-indigo-200/60">
                    Auto-generated contextual summary for your annual report.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="bg-slate-950/50 p-5 rounded-xl border border-indigo-500/20 text-slate-300 leading-relaxed font-serif text-lg shadow-inner">
                    "{report.ai_narrative}"
                  </div>
                </CardContent>
              </Card>

              {/* Data Anomalies Table */}
              <Card className="bg-slate-900/40 border-slate-800 shadow-lg">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Activity className="w-5 h-5 text-rose-400" />
                      <CardTitle className="text-xl">Statistical Anomalies ({report.anomalies.length})</CardTitle>
                    </div>
                  </div>
                  <CardDescription>
                    We used Z-Score &amp; IQR bounds across historical benchmarks to find potential reporting errors.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {report.anomalies.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-emerald-400">
                      <CheckCircle className="w-12 h-12 mb-3 opacity-80" />
                      <p className="font-medium text-lg">No anomalies detected</p>
                      <p className="text-sm text-emerald-200/50">Your data matches expected trajectories.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {report.anomalies.map((a, i) => (
                        <div key={i} className="flex gap-4 p-4 rounded-xl border border-rose-500/20 bg-rose-500/5 items-start transition-colors hover:bg-rose-500/10">
                          <AlertTriangle className="w-6 h-6 text-rose-400 shrink-0 mt-1" />
                          <div>
                            <h4 className="font-medium text-rose-200">Metric ID #{a.metric_id} (Value: {a.value})</h4>
                            <p className="text-sm text-rose-200/70 mt-1">{a.detail}</p>
                            <span className="inline-block mt-2 text-xs uppercase tracking-wider bg-rose-900/50 text-rose-300 px-2 py-0.5 rounded">
                              Algorithm: {a.algorithm}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Sidebar Column */}
            <div className="lg:col-span-4 space-y-8">
              {/* Compliance Score */}
              <Card className="bg-slate-900 border-slate-800 shadow-xl overflow-hidden text-center group">
                <CardContent className="pt-8 pb-8 flex flex-col items-center relative z-10">
                  <div className="absolute inset-0 bg-gradient-to-b from-indigo-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <Award className="w-10 h-10 text-indigo-400 mb-4" />
                  <div className="text-5xl font-black bg-clip-text text-transparent bg-gradient-to-b from-white to-slate-400">
                    {report.compliance_score}
                  </div>
                  <p className="text-sm font-medium text-slate-400 mt-2 uppercase tracking-widest">
                    Health Score
                  </p>
                  
                  <div className="w-full mt-6 px-4">
                    <Progress value={report.compliance_score} className="h-2 bg-slate-800" indicatorClassName={`bg-indigo-500 transition-all duration-1000 ease-out`} />
                  </div>
                </CardContent>
              </Card>

              {/* Auditable Data Registry */}
              <Card className="bg-slate-900/60 border-slate-800">
                <CardHeader>
                  <div className="flex gap-2">
                    <FileSearch className="w-5 h-5 text-blue-400" />
                    <CardTitle className="text-lg">Audit Registry</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="px-0">
                  <div className="divide-y divide-slate-800">
                    {report.auditable_metrics.map(m => (
                      <div key={m.id} className="p-4 px-6 flex justify-between items-center hover:bg-slate-800/50 transition-colors cursor-default">
                        <div>
                          <p className="font-medium text-slate-200">Metric {m.id}</p>
                          <p className="text-xs text-slate-500 mt-1">
                            {m.evidence_count} evidence files linked
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-mono text-sm text-indigo-300">{m.value} {m.unit}</p>
                          <Badge variant="outline" className={`mt-1 text-[10px] ${m.status === 'approved' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border-amber-500/20'}`}>
                            {m.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                    {report.auditable_metrics.length === 0 && (
                      <div className="p-6 text-center text-slate-500 text-sm">
                        No metrics registered in this period.
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
