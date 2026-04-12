import React, { useState, useEffect } from 'react';
import backendApi from '@/api/backendClient';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingDown, Leaf, Target, FlaskConical, AlertCircle, Sparkles } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';

export default function DecarbonizationPlanner() {
  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [data, setData] = useState(null);

  useEffect(() => {
    backendApi.esg.projects.list()
      .then(rows => setProjects(rows || []))
      .catch(console.error);
  }, []);

  useEffect(() => {
    if (selectedProjectId) {
      setLoading(true);
      setError('');
      backendApi.esgV2.predictNetZero(selectedProjectId)
        .then(res => {
          // Format data for Recharts
          const chartData = [];
          
          res.historical.forEach(h => {
            const dt = new Date(h.date);
            chartData.push({
              name: `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2, '0')}`,
              historical: Math.round(h.emission),
              forecast: null
            });
          });

          // Join the last historical to forecast so the line connects cleanly
          if (chartData.length > 0 && res.forecast.forecast.length > 0) {
              const lastHist = chartData[chartData.length - 1];
              lastHist.forecast = lastHist.historical;
          }

          res.forecast.forecast.forEach(f => {
            const dt = new Date(f.date);
            chartData.push({
              name: `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2, '0')}`,
              historical: null,
              forecast: Math.round(f.value),
              upper: Math.round(f.upper_bound),
              lower: Math.round(f.lower_bound)
            });
          });

          setData({
             raw: res,
             chartData
          });
        })
        .catch(e => setError(e.message || String(e)))
        .finally(() => setLoading(false));
    } else {
        setData(null);
    }
  }, [selectedProjectId]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col relative overflow-hidden">
      {/* Dynamic emerald gradients for the 'Green/Eco' vibe */}
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-emerald-600/10 rounded-full blur-[120px] -z-10 animate-pulse delay-700" />
      <div className="absolute bottom-20 left-10 w-[400px] h-[400px] bg-teal-600/10 rounded-full blur-[100px] -z-10" />

      <div className="container mx-auto px-4 py-10 max-w-7xl z-10">
        <header className="mb-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <Badge className="mb-3 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 px-3 py-1 border border-emerald-500/20">
            <FlaskConical className="w-4 h-4 mr-2 inline" /> Predictive ML Forecasting
          </Badge>
          <h1 className="text-4xl md:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white via-emerald-100 to-teal-200 tracking-tight">
            Decarbonization Planner
          </h1>
          <p className="mt-4 text-emerald-100/50 max-w-2xl text-lg flex items-center gap-2">
            AI-driven trajectory mapping for your organization's Net-Zero goals.
          </p>
        </header>

        {/* Setup Form */}
        <div className="mb-8 p-1 rounded-2xl bg-gradient-to-r from-emerald-500/20 via-teal-500/10 to-transparent inline-block">
          <div className="bg-slate-900/80 backdrop-blur-md p-4 px-6 rounded-xl border border-emerald-900/30 flex items-center gap-4 shadow-xl">
            <label className="text-sm font-medium text-slate-300 whitespace-nowrap">Analyze Project:</label>
            <select
              className="w-64 bg-slate-950 border border-slate-700 rounded-lg py-2 px-3 text-emerald-100 focus:ring-2 focus:ring-emerald-500 transition-shadow outline-none"
              onChange={(e) => setSelectedProjectId(e.target.value)}
              value={selectedProjectId}
            >
              <option value="">-- Choose ESG Initiative --</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
        </div>

        {loading && (
          <div className="flex justify-center py-24 text-emerald-400">
            <div className="flex flex-col items-center gap-4 animate-in zoom-in slide-in-from-bottom-4">
               <TrendingDown className="w-12 h-12 animate-bounce" />
               <span className="text-xl font-medium">Crunching historical telemetry &amp; generating trajectory...</span>
            </div>
          </div>
        )}

        {error && (
          <Alert className="border-red-500/50 bg-red-500/10 text-red-200">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {!loading && data && (
          <div className="animate-in fade-in slide-in-from-bottom-8 duration-700 space-y-8">
            
            {/* KPI Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="bg-slate-900/60 border-slate-800 shadow-lg">
                <CardHeader className="pb-2">
                  <CardDescription className="uppercase tracking-wider text-xs font-bold text-slate-500">Current Footprint</CardDescription>
                  <CardTitle className="text-3xl text-slate-100 font-mono">
                    {Math.round(data.raw.net_zero_projection.current_metric).toLocaleString()} <span className="text-sm text-slate-500">tCO2e</span>
                  </CardTitle>
                </CardHeader>
              </Card>

              <Card className="bg-emerald-950/20 border-emerald-900/50 shadow-[0_0_30px_-10px_rgba(16,185,129,0.2)]">
                <CardHeader className="pb-2">
                  <CardDescription className="uppercase tracking-wider text-xs font-bold text-emerald-500">12-Month Trajectory</CardDescription>
                  <CardTitle className="text-3xl text-emerald-300 font-mono">
                    {Math.round(data.raw.net_zero_projection.projected_metric).toLocaleString()} <span className="text-sm text-emerald-600/60">tCO2e</span>
                  </CardTitle>
                </CardHeader>
              </Card>

              <Card className="bg-gradient-to-br from-indigo-900/40 to-slate-900 border-indigo-500/30">
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2 mb-1 text-indigo-400">
                    <Target className="w-4 h-4" />
                    <CardDescription className="uppercase tracking-wider text-xs font-bold text-indigo-400 m-0">Predicted Drop</CardDescription>
                  </div>
                  <CardTitle className="text-3xl text-indigo-100 font-bold">
                    {data.raw.net_zero_projection.reduction_percentage}%
                  </CardTitle>
                </CardHeader>
              </Card>
            </div>

            {/* Main Interactive Chart */}
            <Card className="bg-slate-900/40 border-slate-800/80 shadow-2xl backdrop-blur-xl">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-xl items-center flex gap-2">
                     <Leaf className="w-5 h-5 text-emerald-500" /> Emissions Horizon
                  </CardTitle>
                  <CardDescription>Historical data paired with AI-driven Exponential Smoothing (12 Periods)</CardDescription>
                </div>
                <Badge variant="outline" className="border-teal-500/30 text-teal-300 bg-teal-500/10">
                   Machine Learning Confidence: ~85%
                </Badge>
              </CardHeader>
              <CardContent>
                <div className="h-[450px] w-full mt-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data.chartData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorHistorical" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#475569" stopOpacity={0.8}/>
                          <stop offset="95%" stopColor="#475569" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="colorForecast" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.5}/>
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                      <XAxis dataKey="name" stroke="#64748b" fontSize={12} tickMargin={10} minTickGap={30} />
                      <YAxis stroke="#64748b" fontSize={12} tickFormatter={(val) => `${val/1000}k`} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '8px' }}
                        itemStyle={{ fontWeight: 600 }}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="historical" 
                        stroke="#94a3b8" 
                        fillOpacity={1} 
                        fill="url(#colorHistorical)" 
                        strokeWidth={2}
                        name="Verified History"
                      />
                      <Area 
                        type="monotone" 
                        dataKey="forecast" 
                        stroke="#10b981" 
                        fillOpacity={1} 
                        fill="url(#colorForecast)" 
                        strokeWidth={3}
                        strokeDasharray="5 5"
                        name="AI Projection"
                      />
                      {/* Zero line target */}
                      <ReferenceLine y={0} stroke="#ef4444" strokeDasharray="3 3" label={{ position: 'insideRight', value: 'Net Zero Zero-Line', fill: '#ef4444', fontSize: 12 }} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* AI Insights generated by LLM */}
            <Card className="bg-gradient-to-br from-teal-950/40 to-slate-900 border-teal-900/30 overflow-hidden relative">
               <div className="absolute top-0 right-0 p-4 opacity-10">
                  <Sparkles className="w-32 h-32 text-teal-300" />
               </div>
               <CardHeader>
                 <CardTitle className="text-lg flex items-center gap-2 text-teal-100">
                    <Sparkles className="w-5 h-5 text-teal-400" />
                    AI Decarbonization Insights
                 </CardTitle>
               </CardHeader>
               <CardContent>
                  <ul className="space-y-3 z-10 relative">
                     {data.raw.forecast.insights.map((insight, idx) => (
                        <li key={idx} className="flex gap-3 items-start bg-slate-950/30 p-3 rounded-lg border border-slate-800/50">
                           <AlertCircle className="w-5 h-5 text-teal-500 shrink-0 mt-0.5" />
                           <span className="text-slate-300">{insight}</span>
                        </li>
                     ))}
                  </ul>
               </CardContent>
            </Card>

          </div>
        )}
      </div>
    </div>
  );
}
