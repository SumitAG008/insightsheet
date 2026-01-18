// pages/IPTracking.jsx - Admin: IP tracking table and per-subscription distinct IP summary (sharing)
import React, { useState, useEffect, useCallback } from 'react';
import { Shield, MapPin, Users, AlertTriangle, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { meldraAi } from '@/api/meldraClient';
import { format } from 'date-fns';

const PAGE_SIZE = 50;

export default function IPTracking() {
  const [ipData, setIpData] = useState({ items: [], total: 0, limit: PAGE_SIZE, offset: 0 });
  const [summary, setSummary] = useState([]);
  const [loading, setLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);
  const [period, setPeriod] = useState('30d');
  // Filters for IP table
  const [filters, setFilters] = useState({ user_email: '', ip_address: '', event_type: '' });
  const [filterApplied, setFilterApplied] = useState(false);

  const loadIpTracking = useCallback(async (offset = 0) => {
    const params = { limit: PAGE_SIZE, offset, ...filters };
    Object.keys(params).forEach(k => { if (params[k] === '' || params[k] == null) delete params[k]; });
    try {
      const data = await meldraAi.admin.getIpTracking(params);
      if (data.detail && !data.items) {
        setAccessDenied(true);
        return;
      }
      setIpData({ items: data.items || [], total: data.total ?? 0, limit: data.limit ?? PAGE_SIZE, offset: data.offset ?? 0 });
      setAccessDenied(false);
    } catch (e) {
      if (e.message && (e.message.includes('403') || e.message.includes('Forbidden'))) setAccessDenied(true);
      else setIpData(prev => ({ ...prev, items: [] }));
    }
  }, [filters]);

  const loadSummary = useCallback(async () => {
    try {
      const data = await meldraAi.admin.getSubscriptionIpSummary(period);
      if (Array.isArray(data)) setSummary(data);
      else if (data.detail) setAccessDenied(true);
      else setSummary([]);
    } catch (e) {
      if (e.message && (e.message.includes('403') || e.message.includes('Forbidden'))) setAccessDenied(true);
      else setSummary([]);
    }
  }, [period]);

  useEffect(() => {
    setLoading(true);
    Promise.all([loadIpTracking(0), loadSummary()]).finally(() => setLoading(false));
  }, [loadIpTracking, loadSummary, filterApplied]);

  const handleFilter = () => { setFilterApplied(a => !a); setLoading(true); loadIpTracking(0).finally(() => setLoading(false)); };
  const nextPage = () => { const o = ipData.offset + PAGE_SIZE; if (o < ipData.total) { setLoading(true); loadIpTracking(o).finally(() => setLoading(false)); } };
  const prevPage = () => { const o = Math.max(0, ipData.offset - PAGE_SIZE); setLoading(true); loadIpTracking(o).finally(() => setLoading(false)); };

  if (accessDenied) {
    return (
      <div className="min-h-screen bg-white dark:bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <Shield className="w-16 h-16 text-amber-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Access Denied</h1>
          <p className="text-slate-600 dark:text-slate-400">IP Tracking is only available to admins.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 py-8">
      <div className="container mx-auto px-4 max-w-7xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2 flex items-center gap-3">
            <Shield className="w-9 h-9 text-blue-600" />
            IP Tracking & Security
          </h1>
          <p className="text-slate-600 dark:text-slate-400">IP log and per-subscription distinct IP count to detect account sharing.</p>
        </div>

        <Tabs defaultValue="ip-log" className="space-y-6">
          <TabsList className="bg-slate-900/80 border border-slate-700/50 p-1">
            <TabsTrigger value="ip-log" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white font-semibold">
              <MapPin className="w-4 h-4 mr-2" /> IP Security Log
            </TabsTrigger>
            <TabsTrigger value="ip-per-sub" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white font-semibold">
              <Users className="w-4 h-4 mr-2" /> IPs per Subscription
            </TabsTrigger>
          </TabsList>

          <TabsContent value="ip-log" className="space-y-4">
            <div className="flex flex-wrap gap-3 items-end">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">User</label>
                <Input placeholder="Email" value={filters.user_email} onChange={e => setFilters(f => ({ ...f, user_email: e.target.value }))} className="w-48 bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">IP</label>
                <Input placeholder="IP address" value={filters.ip_address} onChange={e => setFilters(f => ({ ...f, ip_address: e.target.value }))} className="w-40 bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Event</label>
                <select value={filters.event_type} onChange={e => setFilters(f => ({ ...f, event_type: e.target.value }))} className="h-10 px-3 rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100">
                  <option value="">All</option>
                  <option value="login">login</option>
                  <option value="logout">logout</option>
                  <option value="failed_login">failed_login</option>
                </select>
              </div>
              <Button onClick={handleFilter} className="bg-blue-600 hover:bg-blue-700">Apply</Button>
              <Button variant="outline" onClick={() => { setFilters({ user_email: '', ip_address: '', event_type: '' }); setFilterApplied(a => !a); }}>Reset</Button>
            </div>

            <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-100 dark:bg-slate-800/80">
                    <TableHead className="font-semibold">IP</TableHead>
                    <TableHead className="font-semibold">User</TableHead>
                    <TableHead className="font-semibold">Event</TableHead>
                    <TableHead className="font-semibold">Date</TableHead>
                    <TableHead className="font-semibold">Location</TableHead>
                    <TableHead className="font-semibold">Browser</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading && ipData.items.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="text-center py-8 text-slate-500">Loading…</TableCell></TableRow>
                  ) : ipData.items.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="text-center py-8 text-slate-500">No records</TableCell></TableRow>
                  ) : (
                    ipData.items.map((h) => (
                      <TableRow key={h.id} className="dark:border-slate-700/50">
                        <TableCell className="font-mono text-sm">{h.ip_address}</TableCell>
                        <TableCell>{h.user_email}</TableCell>
                        <TableCell><Badge variant={h.event_type === 'login' ? 'default' : 'secondary'} className={h.event_type === 'failed_login' ? 'bg-red-500/20 text-red-300' : ''}>{h.event_type}</Badge></TableCell>
                        <TableCell className="text-slate-600 dark:text-slate-400">{h.created_date ? format(new Date(h.created_date), 'yyyy-MM-dd HH:mm') : '—'}</TableCell>
                        <TableCell className="text-slate-600 dark:text-slate-400 max-w-[160px] truncate" title={h.location}>{h.location}</TableCell>
                        <TableCell className="text-slate-600 dark:text-slate-400 max-w-[160px] truncate" title={h.browser}>{h.browser}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            <div className="flex items-center justify-between px-2 py-3 border-t border-slate-200 dark:border-slate-700">
              <span className="text-sm text-slate-600 dark:text-slate-400">
                {ipData.offset + 1}–{Math.min(ipData.offset + ipData.items.length, ipData.total)} of {ipData.total}
              </span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={prevPage} disabled={ipData.offset === 0 || loading}><ChevronLeft className="w-4 h-4" /></Button>
                <Button variant="outline" size="sm" onClick={nextPage} disabled={ipData.offset + ipData.items.length >= ipData.total || loading}><ChevronRight className="w-4 h-4" /></Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="ip-per-sub" className="space-y-4">
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Period:</span>
              {['7d', '30d', 'all'].map((p) => (
                <Button key={p} variant={period === p ? 'default' : 'outline'} size="sm" onClick={() => setPeriod(p)} className={period === p ? 'bg-blue-600' : ''}>{p === 'all' ? 'All' : p}</Button>
              ))}
              <Button variant="ghost" size="sm" onClick={() => { setLoading(true); loadSummary().finally(() => setLoading(false)); }}><RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /></Button>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400">Distinct IPs per subscription: high values may indicate one login used from many locations.</p>

            <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-100 dark:bg-slate-800/80">
                    <TableHead className="font-semibold">User</TableHead>
                    <TableHead className="font-semibold">Plan</TableHead>
                    <TableHead className="font-semibold">Distinct IPs</TableHead>
                    <TableHead className="font-semibold">Total logins</TableHead>
                    <TableHead className="font-semibold">Last login</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading && summary.length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="text-center py-8 text-slate-500">Loading…</TableCell></TableRow>
                  ) : summary.length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="text-center py-8 text-slate-500">No data</TableCell></TableRow>
                  ) : (
                    summary.map((r, i) => (
                      <TableRow key={r.user_email + i} className="dark:border-slate-700/50">
                        <TableCell>{r.user_email}</TableCell>
                        <TableCell><Badge variant="outline">{r.plan}</Badge></TableCell>
                        <TableCell>
                          <span className={r.distinct_ip_count > 2 ? 'text-amber-600 dark:text-amber-400 font-semibold flex items-center gap-1' : ''}>
                            {r.distinct_ip_count > 2 && <AlertTriangle className="w-4 h-4" />}
                            {r.distinct_ip_count}
                          </span>
                        </TableCell>
                        <TableCell className="text-slate-600 dark:text-slate-400">{r.total_logins}</TableCell>
                        <TableCell className="text-slate-600 dark:text-slate-400">{r.last_login_at ? format(new Date(r.last_login_at), 'yyyy-MM-dd HH:mm') : '—'}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
