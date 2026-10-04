import React, { useEffect, useState } from 'react';
import { Building2, Download, History, Trash2, UserPlus } from 'lucide-react';
import { meldraAi } from '@/api/meldraClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

function saveBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function Organization() {
  const [me, setMe] = useState(null);
  const [data, setData] = useState(null);
  const [events, setEvents] = useState([]);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('member');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);

  const isAdmin = me && ['owner', 'admin'].includes(me.role);

  const load = async () => {
    setError('');
    try {
      const mine = await meldraAi.org.me();
      setMe(mine);
      if (mine?.organization && ['owner', 'admin'].includes(mine.role)) {
        setData(await meldraAi.org.members());
        setEvents((await meldraAi.org.events(90)).events || []);
      }
    } catch (e) {
      setError(e.message);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const run = async (fn, okMessage) => {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await fn();
      if (okMessage) setNotice(okMessage);
      await load();
    } catch (e) {
      setError(e.message);
    }
    setBusy(false);
  };

  if (me && !me.organization) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <Alert>
          <AlertDescription>
            You are not part of an organisation. If your university, hospital or company has a Meldra licence, sign in with
            your work email or ask your IT admin to add you.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const org = data?.organization || me?.organization;
  const seatsFull = org && org.seats && org.seats_used >= org.seats;

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl space-y-6">
      <div className="flex items-center gap-3">
        <Building2 className="w-7 h-7 text-blue-600" />
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{org?.name || 'Organisation'}</h1>
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

      {org && (
        <Card>
          <CardHeader>
            <CardTitle>Licence</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <div className="text-slate-500 dark:text-slate-400">Plan</div>
              <div className="font-semibold capitalize text-slate-900 dark:text-slate-100">{org.plan || '—'}</div>
            </div>
            <div>
              <div className="text-slate-500 dark:text-slate-400">Seats used</div>
              <div className={`font-semibold ${seatsFull ? 'text-amber-600' : 'text-slate-900 dark:text-slate-100'}`}>
                {org.seats_used} / {org.seats}
              </div>
            </div>
            <div>
              <div className="text-slate-500 dark:text-slate-400">Renews</div>
              <div className="font-semibold text-slate-900 dark:text-slate-100">
                {org.end_date ? new Date(org.end_date).toLocaleDateString() : '—'}
              </div>
            </div>
            <div>
              <div className="text-slate-500 dark:text-slate-400">Status</div>
              <div className="font-semibold capitalize text-slate-900 dark:text-slate-100">{org.state}</div>
            </div>
          </CardContent>
        </Card>
      )}

      {me && !isAdmin && (
        <Alert>
          <AlertDescription>Your organisation&apos;s admins manage seats and members.</AlertDescription>
        </Alert>
      )}

      {isAdmin && data && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Add a person</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-col sm:flex-row gap-2">
                <Input type="email" placeholder="name@organisation.ac.uk" value={email} onChange={(e) => setEmail(e.target.value)} />
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-sm"
                >
                  <option value="member">Member</option>
                  <option value="admin">Admin</option>
                  {me.role === 'owner' && <option value="owner">Owner</option>}
                </select>
                <Button
                  disabled={busy || !email.trim() || seatsFull}
                  onClick={() =>
                    run(async () => {
                      await meldraAi.org.addMember(email.trim(), role);
                      setEmail('');
                    }, `${email.trim()} has a seat. They sign in to Meldra with this email to use it.`)
                  }
                >
                  <UserPlus className="w-4 h-4 mr-2" /> Add
                </Button>
              </div>
              {seatsFull && (
                <p className="text-sm text-amber-700 dark:text-amber-400">
                  All seats are in use. Remove someone, or contact sales@meldra.ai to add seats.
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Members and usage this month</CardTitle>
              <Button variant="outline" size="sm" onClick={() => run(async () => saveBlob(await meldraAi.org.usageCsv(), 'meldra-usage.csv'))}>
                <Download className="w-4 h-4 mr-2" /> Export CSV
              </Button>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead className="text-right">Conversions</TableHead>
                    <TableHead className="text-right">AI questions</TableHead>
                    <TableHead className="text-right">Uploaded (MB)</TableHead>
                    <TableHead>Last seen</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.members.map((m) => (
                    <TableRow key={m.email}>
                      <TableCell>
                        {m.email}
                        {!m.registered && <span className="ml-2 text-xs text-slate-500">(not signed up yet)</span>}
                      </TableCell>
                      <TableCell>
                        <select
                          value={m.role}
                          disabled={busy || (m.role === 'owner' && me.role !== 'owner')}
                          onChange={(e) => run(() => meldraAi.org.setRole(m.email, e.target.value), 'Role updated.')}
                          className="rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-2 py-1 text-sm"
                        >
                          <option value="member">Member</option>
                          <option value="admin">Admin</option>
                          {(me.role === 'owner' || m.role === 'owner') && <option value="owner">Owner</option>}
                        </select>
                      </TableCell>
                      <TableCell className="text-right">{m.conversions ?? 0}</TableCell>
                      <TableCell className="text-right">{m.ai_queries ?? 0}</TableCell>
                      <TableCell className="text-right">{m.upload_mb ?? 0}</TableCell>
                      <TableCell>{m.last_seen ? new Date(m.last_seen).toLocaleDateString() : '—'}</TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={busy}
                          title="Remove from organisation"
                          onClick={() => {
                            if (window.confirm(`Remove ${m.email}? Their seat becomes free and they move to their own plan.`)) {
                              run(() => meldraAi.org.removeMember(m.email), `${m.email} was removed.`);
                            }
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-3">
                Usage is counts only. Meldra never stores or shows file names or file contents.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="w-5 h-5" /> Change history (90 days)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {events.length === 0 ? (
                <p className="text-sm text-slate-500">No changes yet.</p>
              ) : (
                <ul className="space-y-1 text-sm">
                  {events.map((e, i) => (
                    <li key={i} className="text-slate-700 dark:text-slate-300">
                      <span className="text-slate-500">{new Date(e.at).toLocaleString()}</span> — {e.actor || 'system'}:{' '}
                      {e.event.replace(/_/g, ' ')}
                      {e.details?.email ? ` (${e.details.email})` : ''}
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
