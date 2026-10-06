// More: the web app's minimum for a firm (settings, team and profile), plus import, sample data,
// reminders, calendar, the phone app and, for the operator, who has the licence.
import { useState } from 'react';
import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { CalendarDays, Mail, Smartphone, Upload, UserPlus } from 'lucide-react';
import { legalApi } from '@/lib/legal/api';
import { LEGAL_LANGUAGES } from '@/lib/legal/i18n';
import { fmtDate } from '@/lib/legal/format';
import { Btn, Card, Field, SectionTitle, Select, TextInput, useLegal, useLoad } from './shared';

function Settings({ onSaved }) {
  const { t, settings, countries, me, setLang } = useLegal();
  const [form, setForm] = useState({ firm_name: settings.firm_name || '', country: settings.country, language: settings.language || 'en' });
  const save = async () => {
    try {
      const body = me.can_manage ? form : { language: form.language };
      await legalApi.saveSettings(body);
      setLang(form.language);
      toast.success(t('save'));
      onSaved?.();
    } catch (e) {
      toast.error(e.message);
    }
  };
  return (
    <Card>
      <SectionTitle>{t('more_settings')}</SectionTitle>
      <div className="space-y-3">
        <Field label={t('firm_name')}><TextInput value={form.firm_name} disabled={!me.can_manage} onChange={(e) => setForm({ ...form, firm_name: e.target.value })} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label={t('country')} hint={settings.configured ? undefined : t('country_auto')}>
            <Select options={countries.map((c) => ({ value: c.code, label: c.name }))} value={form.country} disabled={!me.can_manage} onChange={(v) => setForm({ ...form, country: v })} />
          </Field>
          <Field label={t('language')}>
            <Select options={LEGAL_LANGUAGES.map((l) => ({ value: l.code, label: l.label }))} value={form.language} onChange={(v) => setForm({ ...form, language: v })} />
          </Field>
        </div>
        <div className="text-xs text-slate-500">{me.email} · {t(`role_${me.role}`) !== `role_${me.role}` ? t(`role_${me.role}`) : me.role}</div>
        <div className="flex justify-end"><Btn onClick={save}>{t('save')}</Btn></div>
      </div>
    </Card>
  );
}

Settings.propTypes = { onSaved: PropTypes.func };

function Team() {
  const { t } = useLegal();
  const state = useLoad(() => legalApi.team(), []);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const team = state.data;
  const set = async (body) => {
    try {
      await legalApi.setTeam(body);
      state.reload();
    } catch (e) {
      toast.error(e.message);
    }
  };
  return (
    <Card>
      <SectionTitle>{t('more_team')}</SectionTitle>
      <ul className="divide-y divide-slate-100 dark:divide-slate-800">
        {(team?.members || []).map((m) => (
          <li key={m.email} className="py-2 flex items-center gap-2">
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium truncate text-slate-900 dark:text-slate-100">{m.name || m.email}</div>
              <div className="text-xs text-slate-500 truncate">{m.name ? m.email : ''} {m.open_matters ? `· ${m.open_matters} ${t('r_open').toLowerCase()}` : ''}</div>
            </div>
            <select disabled={!team.can_manage} value={m.role} onChange={(e) => set({ email: m.email, role: e.target.value })} className="text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-1.5">
              {team.roles.map((r) => <option key={r} value={r}>{t(`role_${r}`)}</option>)}
            </select>
          </li>
        ))}
      </ul>
      {team?.can_manage ? (
        <div className="mt-3 grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-2">
          <TextInput type="email" placeholder="email@firm.com" value={email} onChange={(e) => setEmail(e.target.value)} />
          <TextInput placeholder={t('f_title')} value={name} onChange={(e) => setName(e.target.value)} />
          <Btn variant="secondary" disabled={!email.includes('@')} onClick={() => { set({ email, name, role: 'associate' }); setEmail(''); setName(''); }}><UserPlus className="w-4 h-4" />{t('add_member')}</Btn>
        </div>
      ) : null}
      {team?.org_admin_link ? <Link to={team.org_admin_link} className="block mt-3 text-sm text-blue-700 dark:text-blue-400">{t('org_admin')} →</Link> : null}
    </Card>
  );
}

function Import({ onDone }) {
  const { t, country } = useLegal();
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [busy, setBusy] = useState(false);
  const run = async () => {
    setBusy(true);
    try {
      setPreview(await legalApi.importPreview(file, country));
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };
  const commit = async () => {
    setBusy(true);
    try {
      const r = await legalApi.importCommit(preview.rows);
      toast.success(t('import_done', { n: r.created }));
      setPreview(null);
      setFile(null);
      onDone?.();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Card>
      <SectionTitle>{t('more_import')}</SectionTitle>
      <p className="text-sm text-slate-600 dark:text-slate-300 mb-3">{t('import_hint')}</p>
      <div className="flex flex-wrap gap-2 items-center">
        <input type="file" accept=".xlsx,.xls,.csv" onChange={(e) => { setFile(e.target.files?.[0] || null); setPreview(null); }} className="text-sm max-w-full" />
        <Btn variant="secondary" disabled={!file || busy} onClick={run}><Upload className="w-4 h-4" />{t('import_preview')}</Btn>
      </div>
      {preview ? (
        <div className="mt-4 space-y-3">
          <div className="text-xs text-slate-500">
            {Object.entries(preview.mapping).map(([k, v]) => <span key={k} className="inline-block mr-2 mb-1 px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800">{v} → {k}</span>)}
          </div>
          <div className="overflow-x-auto max-h-64 border border-slate-200 dark:border-slate-800 rounded-lg">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-slate-50 dark:bg-slate-900"><tr className="text-left">{['f_title', 'f_court', 'f_next_hearing', 'f_stage', 'f_lawyer'].map((k) => <th key={k} className="px-2 py-1.5">{t(k)}</th>)}</tr></thead>
              <tbody>
                {preview.rows.slice(0, 50).map((r) => (
                  <tr key={r.row} className={`border-t border-slate-100 dark:border-slate-800 ${r.issues?.length ? 'bg-amber-50 dark:bg-amber-950/30' : ''}`}>
                    <td className="px-2 py-1">{r.title || [r.petitioner, r.respondent].filter(Boolean).join(' v ')}</td>
                    <td className="px-2 py-1">{r.court_code || r.court_text}</td>
                    <td className="px-2 py-1">{fmtDate(r.next_hearing)}</td>
                    <td className="px-2 py-1">{r.stage || r.stage_text}</td>
                    <td className="px-2 py-1">{r.lawyer_email || r.lawyer_name}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {preview.issues.length ? (
            <details className="text-xs text-amber-800 dark:text-amber-300">
              <summary>{t('import_issues')} ({preview.issues.length})</summary>
              <ul className="list-disc pl-5 mt-1">{preview.issues.slice(0, 50).map((i) => <li key={i.row}>Row {i.row}: {i.issues.join(' ')}</li>)}</ul>
            </details>
          ) : null}
          <div className="flex justify-end"><Btn onClick={commit} disabled={busy || !preview.count}>{t('import_commit', { n: preview.count })}</Btn></div>
        </div>
      ) : null}
    </Card>
  );
}

Import.propTypes = { onDone: PropTypes.func };

function SampleData({ onDone }) {
  const { t } = useLegal();
  const [busy, setBusy] = useState(false);
  const run = async (fn) => {
    setBusy(true);
    try {
      await fn();
      onDone?.();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Card>
      <SectionTitle>{t('more_sample')}</SectionTitle>
      <p className="text-sm text-slate-600 dark:text-slate-300 mb-3">{t('sample_hint')}</p>
      <div className="flex flex-wrap gap-2">
        <Btn variant="secondary" disabled={busy} onClick={() => run(() => legalApi.loadSample('IN'))}>{t('sample_load_in')}</Btn>
        <Btn variant="secondary" disabled={busy} onClick={() => run(() => legalApi.loadSample('GB'))}>{t('sample_load_gb')}</Btn>
        <Btn variant="danger" disabled={busy} onClick={() => run(() => legalApi.clearSample())}>{t('sample_clear')}</Btn>
      </div>
    </Card>
  );
}

SampleData.propTypes = { onDone: PropTypes.func };

function Reminders() {
  const { t } = useLegal();
  const [preview, setPreview] = useState(null);
  const download = async () => {
    try {
      const res = await legalApi.calendar();
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'meldra-legal.ics';
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      toast.error(e.message);
    }
  };
  return (
    <Card>
      <SectionTitle>{t('more_reminders')}</SectionTitle>
      <p className="text-sm text-slate-600 dark:text-slate-300 mb-3">{t('reminders_hint')}</p>
      <div className="flex flex-wrap gap-2">
        <Btn variant="secondary" onClick={async () => setPreview((await legalApi.reminderPreview()).text)}>{t('reminders_preview')}</Btn>
        <Btn variant="secondary" onClick={async () => { try { const r = await legalApi.reminderSend(); toast[r.sent ? 'success' : 'message'](r.sent ? t('reminders_send') : r.reason); } catch (e) { toast.error(e.message); } }}><Mail className="w-4 h-4" />{t('reminders_send')}</Btn>
        <Btn variant="secondary" onClick={download}><CalendarDays className="w-4 h-4" />{t('calendar')}</Btn>
      </div>
      {preview ? <pre className="mt-3 text-xs whitespace-pre-wrap bg-slate-50 dark:bg-slate-950 p-3 rounded-lg">{preview}</pre> : null}
    </Card>
  );
}

function Phone() {
  const { t } = useLegal();
  const url = typeof window !== 'undefined' ? `${window.location.origin}/legal` : 'https://insight.meldra.ai/legal';
  return (
    <Card className="hidden md:block">
      <SectionTitle>{t('more_phone')}</SectionTitle>
      <div className="flex items-start gap-3">
        <Smartphone className="w-8 h-8 text-blue-700 shrink-0" />
        <div className="text-sm text-slate-600 dark:text-slate-300">
          <p>{t('phone_hint')}</p>
          <p className="mt-1 font-mono text-xs">{url}</p>
        </div>
      </div>
    </Card>
  );
}

function OperatorAccess() {
  const { t } = useLegal();
  const state = useLoad(() => legalApi.accessList(), []);
  const [email, setEmail] = useState('');
  const [expires, setExpires] = useState('');
  const grant = async (body) => {
    try {
      await legalApi.grant(body);
      state.reload();
    } catch (e) {
      toast.error(e.message);
    }
  };
  const data = state.data;
  return (
    <Card className="border-blue-300 dark:border-blue-800">
      <SectionTitle>{t('more_access')}</SectionTitle>
      {data ? (
        <>
          <p className="text-xs text-slate-500 mb-2">Operator: {data.operators.join(', ')}</p>
          <ul className="divide-y divide-slate-100 dark:divide-slate-800 mb-3">
            {data.grants.map((g) => (
              <li key={g.email} className="py-1.5 flex items-center justify-between gap-2 text-sm">
                <span className={g.enabled ? '' : 'line-through text-slate-400'}>{g.email}{g.expires_at ? ` · ${fmtDate(g.expires_at)}` : ''}</span>
                {g.enabled ? <Btn variant="danger" className="!py-1" onClick={() => grant({ email: g.email, enabled: false })}>{t('revoke')}</Btn> : <Btn variant="secondary" className="!py-1" onClick={() => grant({ email: g.email, enabled: true })}>{t('grant')}</Btn>}
              </li>
            ))}
          </ul>
          <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_auto] gap-2">
            <TextInput type="email" placeholder="lawyer@firm.com" value={email} onChange={(e) => setEmail(e.target.value)} />
            <TextInput type="date" title={t('expires')} value={expires} onChange={(e) => setExpires(e.target.value)} />
            <Btn disabled={!email.includes('@')} onClick={() => { grant({ email, enabled: true, expires_at: expires || null }); setEmail(''); setExpires(''); }}>{t('grant')}</Btn>
          </div>
          <p className="text-xs text-slate-500 mt-2">{data.note}</p>
        </>
      ) : null}
    </Card>
  );
}

export function MoreTab({ onChanged }) {
  const { t, me } = useLegal();
  return (
    <div className="space-y-4">
      <Settings onSaved={onChanged} />
      <Team />
      <Import onDone={onChanged} />
      <Reminders />
      <SampleData onDone={onChanged} />
      <Phone />
      {me.is_operator ? <OperatorAccess /> : null}
      <p className="text-xs text-slate-500 px-1">{t('privacy_note')}</p>
    </div>
  );
}

MoreTab.propTypes = { onChanged: PropTypes.func };
