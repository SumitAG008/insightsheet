// Settings: is Claude reachable from the meldra server? One real, tiny call; the reason in plain words if not.
import { useState } from 'react';
import { Bot, CheckCircle2, Loader2, XCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { getApiBase } from '@/utils/apiConfig';

export default function AiStatusCard() {
  const [state, setState] = useState({ loading: false, data: null, error: '' });
  const check = async () => {
    setState({ loading: true, data: null, error: '' });
    try {
      const res = await fetch(`${getApiBase()}/api/ai/status?fresh=true`, { headers: { Authorization: `Bearer ${localStorage.getItem('auth_token') || ''}` } });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.detail || `HTTP ${res.status}`);
      setState({ loading: false, data, error: '' });
    } catch (e) {
      setState({ loading: false, data: null, error: e.message || 'The server could not be reached.' });
    }
  };
  const d = state.data;
  return (
    <Card className="bg-white dark:bg-slate-900/80 backdrop-blur-xl border-slate-200 dark:border-slate-700/50 shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-slate-900 dark:text-white"><Bot className="w-5 h-5" />AI (Claude) status</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-slate-600 dark:text-slate-400">Checks that the meldra server can reach Claude, which powers Ask meldra, mapping, explanations and summaries.</p>
        <Button onClick={check} disabled={state.loading}>{state.loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}Check Claude</Button>
        {d && d.ok && (
          <p className="flex items-center gap-2 text-sm text-emerald-700 dark:text-emerald-400"><CheckCircle2 className="w-4 h-4" />Working · model {d.model}{d.latency_ms ? ` · replied in ${(d.latency_ms / 1000).toFixed(1)}s` : ''}</p>
        )}
        {d && !d.ok && (
          <p className="flex items-start gap-2 text-sm text-red-700 dark:text-red-400"><XCircle className="w-4 h-4 mt-0.5 shrink-0" />Not working · {d.reason}</p>
        )}
        {state.error && <p className="text-sm text-red-700 dark:text-red-400">{state.error}</p>}
      </CardContent>
    </Card>
  );
}
