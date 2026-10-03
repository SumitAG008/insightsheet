import React, { useEffect, useState } from 'react';
import { BadgePoundSterling, Building2, CalendarClock, Download, Plus, RefreshCw } from 'lucide-react';
import { meldraAi } from '@/api/meldraClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { LIMIT_LABELS } from '@/lib/planLimits';

const SECTORS = ['university', 'hospital', 'insurance', 'manufacturing', 'company', 'other'];
const today = () => new Date().toISOString().slice(0, 10);
const inAYear = () => {
  const d = new Date();
  d.setFullYear(d.getFullYear() + 1);
  return d.toISOString().slice(0, 10);
};
const money = (obj) =>
  Object.entries(obj || {})
    .map(([cur, v]) => `${cur} ${Number(v).toLocaleString(undefined, { maximumFractionDigits: 0 })}`)
    .join(' · ') || '—';

function saveBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function Field({ label, children }) {
  return (
    <label className="block text-sm">
      <span className="text-slate-600 dark:text-slate-400">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}

const selectCls = 'w-full rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-sm';

export default function AdminLicenses() {
  const [report, setReport] = useState(null);
  const [orgs, setOrgs] = useState([]);
  const [selected, setSelected] = useState(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);

  const [orgForm, setOrgForm] = useState({ name: '', sector: 'university', country: '', email_domain: '', auto_join: true, owner_email: '', billing_email: '', tax_id: '', crm_ref: '' });
  const [licForm, setLicForm] = useState({
    plan: 'team', pack: 'university', seats: 25, start_date: today(), end_date: inAYear(), status: 'active',
    contract_value: '', currency: 'INR', billing_period: 'annual', po_number: '', invoice_number: '', invoice_status: 'draft', limits: '', notes: '',
  });
  const [memberEmail, setMemberEmail] = useState('');

  const load = async () => {
    setError('');
    try {
      const [r, o] = await Promise.all([meldraAi.admin.orgs.report(), meldraAi.admin.orgs.list()]);
      setReport(r);
      setOrgs(o.organizations || []);
      if (selected) setSelected(await meldraAi.admin.orgs.get(selected.organization.id));
    } catch (e) {
      setError(e.message);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const run = async (fn, ok) => {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await fn();
      if (ok) setNotice(ok);
      await load();
    } catch (e) {
      setError(e.message);
    }
    setBusy(false);
  };

  const open = (id) => run(async () => setSelected(await meldraAi.admin.orgs.get(id)));

  const createOrg = () =>
    run(async () => {
      const body = Object.fromEntries(Object.entries(orgForm).filter(([, v]) => v !== ''));
      const org = await meldraAi.admin.orgs.create(body);
      setSelected(await meldraAi.admin.orgs.get(org.id));
      setOrgForm({ ...orgForm, name: '', email_domain: '', owner_email: '', billing_email: '', tax_id: '', crm_ref: '' });
    }, 'Organisation created. Now record its licence.');

  const createLicence = () =>
    run(async () => {
      let limits;
      if (licForm.limits.trim()) {
        try {
          limits = JSON.parse(licForm.limits);
        } catch {
          throw new Error('Custom limits must be JSON, e.g. {"conversions_per_month": 5000}');
        }
      }
      const body = {
        ...licForm,
        seats: Number(licForm.seats),
        contract_value: Number(licForm.contract_value || 0),
        limits,
      };
      Object.keys(body).forEach((k) => (body[k] === '' || body[k] === undefined) && delete body[k]);
      await meldraAi.admin.orgs.createLicense(selected.organization.id, body);
    }, 'Licence recorded. Members now get its limits.');

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <BadgePoundSterling className="w-7 h-7 text-blue-600" />
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Licences and customers</h1>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => run(async () => saveBlob(await meldraAi.admin.orgs.reportCsv(), 'meldra-licences.csv'))}>
            <Download className="w-4 h-4 mr-2" /> Export CSV
          </Button>
          <Button variant="outline" onClick={load} disabled={busy}>
            <RefreshCw className="w-4 h-4 mr-2" /> Refresh
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {notice && (
        <Alert className="bg-emerald-50 border-emerald-300 dark:bg-emerald-950/30">
          <AlertDescription>{notice}</AlertDescription>
        </Alert>
      )}

      {report && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            ['Annual recurring revenue', money(report.arr_by_currency)],
            ['Invoiced but unpaid', money(report.unpaid_by_currency)],
            ['Customers (pilots)', `${report.customers} (${report.pilots})`],
            ['Seats used / sold', `${report.seats_used} / ${report.seats_sold} (${Math.round((report.seat_utilisation || 0) * 100)}%)`],
          ].map(([label, value]) => (
            <Card key={label}>
              <CardContent className="pt-5">
                <div className="text-xs text-slate-500 dark:text-slate-400">{label}</div>
                <div className="text-lg font-bold text-slate-900 dark:text-slate-100 mt-1">{value}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {report && report.renewals.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarClock className="w-5 h-5" /> Renewals in the next 90 days
            </CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead>Ends</TableHead>
                  <TableHead className="text-right">Days</TableHead>
                  <TableHead className="text-right">Seats used</TableHead>
                  <TableHead className="text-right">Annual value</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {report.renewals.map((r) => (
                  <TableRow key={r.organization_id} className="cursor-pointer" onClick={() => open(r.organization_id)}>
                    <TableCell>{r.name}</TableCell>
                    <TableCell>{new Date(r.end_date).toLocaleDateString()}</TableCell>
                    <TableCell className={`text-right ${r.days_left < 30 ? 'text-red-600 font-semibold' : ''}`}>{r.days_left}</TableCell>
                    <TableCell className="text-right">{r.seats_used} / {r.seats}</TableCell>
                    <TableCell className="text-right">{r.currency} {Number(r.annual_value).toLocaleString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5" /> Customers
          </CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Sector</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Seats</TableHead>
                <TableHead>Ends</TableHead>
                <TableHead>Invoice</TableHead>
                <TableHead className="text-right">Annual value</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orgs.map((o) => (
                <TableRow key={o.organization_id} className="cursor-pointer" onClick={() => open(o.organization_id)}>
                  <TableCell className="font-medium">{o.name}</TableCell>
                  <TableCell className="capitalize">{o.sector}</TableCell>
                  <TableCell className="capitalize">{o.plan || '—'}</TableCell>
                  <TableCell className="capitalize">{o.state}</TableCell>
                  <TableCell className={`text-right ${o.seats && o.seats_used / o.seats < 0.5 ? 'text-amber-600' : ''}`}>
                    {o.seats_used} / {o.seats}
                  </TableCell>
                  <TableCell>{o.end_date ? new Date(o.end_date).toLocaleDateString() : '—'}</TableCell>
                  <TableCell className="capitalize">{o.invoice_status || '—'}</TableCell>
                  <TableCell className="text-right">{o.currency ? `${o.currency} ${Number(o.annual_value).toLocaleString()}` : '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {selected && (
        <Card className="border-blue-300 dark:border-blue-800">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>{selected.organization.name}</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => setSelected(null)}>Close</Button>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              <div><span className="text-slate-500">Domain:</span> {selected.organization.email_domain || '—'} {selected.organization.auto_join ? '(auto-join)' : ''}</div>
              <div><span className="text-slate-500">Billing:</span> {selected.organization.billing_email || '—'}</div>
              <div><span className="text-slate-500">Tax ID:</span> {selected.organization.tax_id || '—'}</div>
              <div><span className="text-slate-500">CRM:</span> {selected.organization.crm_ref || '—'}</div>
            </div>

            <div>
              <h3 className="font-semibold mb-2">Licences</h3>
              {selected.licenses.length === 0 && <p className="text-sm text-slate-500">No licence yet — record one below.</p>}
              {selected.licenses.map((l) => (
                <div key={l.id} className="rounded-lg border border-slate-200 dark:border-slate-700 p-3 mb-2 text-sm flex flex-wrap gap-x-6 gap-y-1 items-center">
                  <span className="font-semibold capitalize">{l.plan}{l.pack ? ` · ${l.pack}` : ''}</span>
                  <span>{l.seats} seats</span>
                  <span>{new Date(l.start_date).toLocaleDateString()} → {new Date(l.end_date).toLocaleDateString()}</span>
                  <span className="capitalize">{l.state}</span>
                  <span>{l.currency} {Number(l.contract_value).toLocaleString()} ({l.currency} {Number(l.annual_value).toLocaleString()}/yr)</span>
                  <span>PO {l.po_number || '—'} · Invoice {l.invoice_number || '—'} ({l.invoice_status})</span>
                  {l.invoice_status !== 'paid' && (
                    <Button size="sm" variant="outline" disabled={busy}
                      onClick={() => run(() => meldraAi.admin.orgs.updateLicense(l.id, { invoice_status: 'paid', paid_date: today() }), 'Marked as paid.')}>
                      Mark paid
                    </Button>
                  )}
                  {Object.keys(l.limits_override || {}).length > 0 && (
                    <span className="text-xs text-slate-500 w-full">Custom limits: {JSON.stringify(l.limits_override)}</span>
                  )}
                </div>
              ))}
            </div>

            <div>
              <h3 className="font-semibold mb-2">Record a licence (the signed deal)</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Field label="Plan">
                  <select className={selectCls} value={licForm.plan} onChange={(e) => setLicForm({ ...licForm, plan: e.target.value })}>
                    <option value="pro">Pro</option><option value="team">Team</option><option value="business">Business</option>
                  </select>
                </Field>
                <Field label="Pack">
                  <select className={selectCls} value={licForm.pack} onChange={(e) => setLicForm({ ...licForm, pack: e.target.value })}>
                    {['university', 'hospital', 'insurance', 'manufacturing', 'general'].map((p) => <option key={p} value={p}>{p}</option>)}
                  </select>
                </Field>
                <Field label="Seats"><Input type="number" min={1} value={licForm.seats} onChange={(e) => setLicForm({ ...licForm, seats: e.target.value })} /></Field>
                <Field label="Status">
                  <select className={selectCls} value={licForm.status} onChange={(e) => setLicForm({ ...licForm, status: e.target.value })}>
                    <option value="pilot">Pilot</option><option value="active">Active</option>
                  </select>
                </Field>
                <Field label="Start"><Input type="date" value={licForm.start_date} onChange={(e) => setLicForm({ ...licForm, start_date: e.target.value })} /></Field>
                <Field label="End"><Input type="date" value={licForm.end_date} onChange={(e) => setLicForm({ ...licForm, end_date: e.target.value })} /></Field>
                <Field label="Contract value (whole term, before tax)"><Input type="number" min={0} value={licForm.contract_value} onChange={(e) => setLicForm({ ...licForm, contract_value: e.target.value })} /></Field>
                <Field label="Currency">
                  <select className={selectCls} value={licForm.currency} onChange={(e) => setLicForm({ ...licForm, currency: e.target.value })}>
                    {['INR', 'GBP', 'USD', 'EUR'].map((c) => <option key={c}>{c}</option>)}
                  </select>
                </Field>
                <Field label="Billing">
                  <select className={selectCls} value={licForm.billing_period} onChange={(e) => setLicForm({ ...licForm, billing_period: e.target.value })}>
                    <option value="annual">Annual</option><option value="multi_year">Multi-year</option><option value="monthly">Monthly</option>
                  </select>
                </Field>
                <Field label="PO number"><Input value={licForm.po_number} onChange={(e) => setLicForm({ ...licForm, po_number: e.target.value })} /></Field>
                <Field label="Invoice number"><Input value={licForm.invoice_number} onChange={(e) => setLicForm({ ...licForm, invoice_number: e.target.value })} /></Field>
                <Field label="Invoice status">
                  <select className={selectCls} value={licForm.invoice_status} onChange={(e) => setLicForm({ ...licForm, invoice_status: e.target.value })}>
                    {['draft', 'sent', 'paid', 'overdue', 'void'].map((s) => <option key={s}>{s}</option>)}
                  </select>
                </Field>
              </div>
              <div className="mt-3">
                <Field label={`Custom limits (optional JSON). Keys: ${Object.keys(LIMIT_LABELS).join(', ')}`}>
                  <Input placeholder='{"conversions_per_month": 5000, "file_size_mb": 150}' value={licForm.limits} onChange={(e) => setLicForm({ ...licForm, limits: e.target.value })} />
                </Field>
              </div>
              <Button className="mt-3" disabled={busy} onClick={createLicence}>
                <Plus className="w-4 h-4 mr-2" /> Record licence
              </Button>
            </div>

            <div>
              <h3 className="font-semibold mb-2">Members ({selected.members.length})</h3>
              <div className="flex gap-2 mb-2">
                <Input type="email" placeholder="person@customer.org" value={memberEmail} onChange={(e) => setMemberEmail(e.target.value)} />
                <Button disabled={busy || !memberEmail.trim()}
                  onClick={() => run(async () => { await meldraAi.admin.orgs.addMember(selected.organization.id, memberEmail.trim()); setMemberEmail(''); }, 'Member added.')}>
                  Add
                </Button>
              </div>
              <ul className="text-sm space-y-1">
                {selected.members.map((m) => (
                  <li key={m.email} className="flex justify-between">
                    <span>{m.email} <span className="text-slate-500">({m.role}{m.registered ? '' : ', not signed up'})</span></span>
                    <span className="text-slate-500">{m.conversions} conversions · {m.ai_queries} AI</span>
                  </li>
                ))}
              </ul>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Plus className="w-5 h-5" /> New customer</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Field label="Name"><Input value={orgForm.name} onChange={(e) => setOrgForm({ ...orgForm, name: e.target.value })} placeholder="University of Example" /></Field>
            <Field label="Sector">
              <select className={selectCls} value={orgForm.sector} onChange={(e) => setOrgForm({ ...orgForm, sector: e.target.value })}>
                {SECTORS.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </Field>
            <Field label="Country"><Input value={orgForm.country} onChange={(e) => setOrgForm({ ...orgForm, country: e.target.value })} /></Field>
            <Field label="Email domain (for auto-join)"><Input value={orgForm.email_domain} onChange={(e) => setOrgForm({ ...orgForm, email_domain: e.target.value })} placeholder="example.ac.uk" /></Field>
            <Field label="Customer's admin (owner) email"><Input type="email" value={orgForm.owner_email} onChange={(e) => setOrgForm({ ...orgForm, owner_email: e.target.value })} /></Field>
            <Field label="Billing email"><Input type="email" value={orgForm.billing_email} onChange={(e) => setOrgForm({ ...orgForm, billing_email: e.target.value })} /></Field>
            <Field label="GSTIN / VAT number"><Input value={orgForm.tax_id} onChange={(e) => setOrgForm({ ...orgForm, tax_id: e.target.value })} /></Field>
            <Field label="CRM reference (HubSpot / Zoho deal id)"><Input value={orgForm.crm_ref} onChange={(e) => setOrgForm({ ...orgForm, crm_ref: e.target.value })} /></Field>
            <label className="flex items-center gap-2 text-sm mt-6">
              <input type="checkbox" checked={orgForm.auto_join} onChange={(e) => setOrgForm({ ...orgForm, auto_join: e.target.checked })} />
              Give seats automatically to people with this email domain
            </label>
          </div>
          <Button className="mt-4" disabled={busy || orgForm.name.trim().length < 2} onClick={createOrg}>
            <Plus className="w-4 h-4 mr-2" /> Create customer
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
