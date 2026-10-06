// Matters: list and search, the matter card, a new/edit form and the post-hearing update.
import { useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import { toast } from 'sonner';
import { Briefcase, Copy, ExternalLink, Plus, Search, Sparkles, Video } from 'lucide-react';
import { legalApi } from '@/lib/legal/api';
import { fmtDate, fmtMoney, isoToday } from '@/lib/legal/format';
import { Btn, Card, Chip, Empty, Field, LoadState, Panel, SectionTitle, Select, TextArea, TextInput, useLegal, useLoad } from './shared';

export function courtOptions(profile) {
  return (profile?.courts || []).map((c) => ({ value: c.code, label: c.name }));
}

export function stageOptions(profile) {
  return (profile?.stages || []).map((s) => ({ value: s.code, label: s.label }));
}

export function stageLabel(profile, code) {
  return (profile?.stages || []).find((s) => s.code === code)?.label || code || '';
}

function copyText(text, t) {
  try {
    navigator.clipboard.writeText(text);
    toast.success(t('copied'));
  } catch {
    /* clipboard blocked */
  }
}

// --- the 15-second update after a hearing ------------------------------------------------------
export function HearingUpdate({ matter, open, onClose, onSaved }) {
  const { t, profile, lang } = useLegal();
  const [form, setForm] = useState({ date: matter?.next_hearing && matter.next_hearing <= isoToday() ? matter.next_hearing : isoToday(), outcome: 'adjourned', next_date: '', purpose: '', judge: '', notes: '', stage: '' });
  const [orderText, setOrderText] = useState('');
  const [reading, setReading] = useState(false);
  const [evidence, setEvidence] = useState(null);
  const [saving, setSaving] = useState(false);
  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v?.target ? v.target.value : v }));

  const readOrder = async () => {
    if (!orderText.trim()) return;
    setReading(true);
    try {
      const r = await legalApi.extractOrder(orderText, lang);
      setForm((f) => ({
        ...f,
        next_date: r.next_date || f.next_date,
        outcome: r.outcome || f.outcome,
        stage: r.stage || f.stage,
        judge: r.judge || f.judge,
        notes: [f.notes, r.summary].filter(Boolean).join('\n'),
      }));
      setEvidence(r);
      if (!r.next_date) toast.message('No next date found in the order. Please enter it.');
    } catch (e) {
      toast.error(e.message);
    } finally {
      setReading(false);
    }
  };

  const save = async () => {
    setSaving(true);
    try {
      const body = { ...form };
      Object.keys(body).forEach((k) => body[k] === '' && delete body[k]);
      await legalApi.addHearing(matter.id, body);
      toast.success(t('save'));
      onSaved?.();
      onClose();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  if (!matter) return null;
  return (
    <Panel
      open={open}
      onClose={onClose}
      title={`${t('update_after_hearing')}: ${matter.title}`}
      footer={
        <>
          <Btn variant="secondary" onClick={onClose}>{t('cancel')}</Btn>
          <Btn onClick={save} disabled={saving || !form.date}>{t('save')}</Btn>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <span className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">{t('outcome')}</span>
          <div className="flex flex-wrap gap-2">
            {(profile?.outcomes || []).map((o) => (
              <Chip key={o} active={form.outcome === o} onClick={() => set('outcome')(o)}>{t(`o_${o}`)}</Chip>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label={t('hearing_date')}><TextInput type="date" value={form.date} onChange={set('date')} /></Field>
          <Field label={t('next_date')}><TextInput type="date" value={form.next_date} min={form.date} onChange={set('next_date')} /></Field>
        </div>
        <div className="flex flex-wrap gap-2">
          {[7, 14, 21, 30, 60].map((d) => {
            const base = new Date(`${form.date}T00:00:00`);
            base.setDate(base.getDate() + d);
            const iso = `${base.getFullYear()}-${String(base.getMonth() + 1).padStart(2, '0')}-${String(base.getDate()).padStart(2, '0')}`;
            return (
              <Chip key={d} active={form.next_date === iso} onClick={() => set('next_date')(iso)}>+{d}</Chip>
            );
          })}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label={t('purpose')}><TextInput value={form.purpose} onChange={set('purpose')} /></Field>
          <Field label={t('f_stage')}><Select options={stageOptions(profile)} value={form.stage} onChange={set('stage')} placeholder="—" /></Field>
        </div>
        <Field label={t('judge')}><TextInput value={form.judge} onChange={set('judge')} /></Field>
        <Field label={t('f_notes')}><TextArea rows={3} value={form.notes} onChange={set('notes')} /></Field>
        <Card className="bg-slate-50 dark:bg-slate-950">
          <div className="flex items-center gap-2 mb-1 font-semibold text-sm"><Sparkles className="w-4 h-4 text-blue-600" />{t('read_order')}</div>
          <p className="text-xs text-slate-500 mb-2">{t('read_order_hint')}</p>
          <TextArea rows={4} value={orderText} onChange={(e) => setOrderText(e.target.value)} />
          <div className="mt-2 flex justify-end"><Btn variant="secondary" onClick={readOrder} disabled={reading || !orderText.trim()}>{reading ? t('loading') : t('read_order_go')}</Btn></div>
          {evidence?.evidence ? <p className="mt-2 text-xs text-slate-600 dark:text-slate-300"><b>{t('evidence')}:</b> “{evidence.evidence}”</p> : null}
          {evidence?.next_steps?.length ? (
            <ul className="mt-2 text-xs list-disc pl-5 text-slate-600 dark:text-slate-300">{evidence.next_steps.map((s) => <li key={s}>{s}</li>)}</ul>
          ) : null}
        </Card>
      </div>
    </Panel>
  );
}

HearingUpdate.propTypes = { matter: PropTypes.object, open: PropTypes.bool, onClose: PropTypes.func.isRequired, onSaved: PropTypes.func };

// --- new / edit -----------------------------------------------------------------------------
const EMPTY = { title: '', petitioner: '', respondent: '', client: '', client_phone: '', court_code: '', stage: '', lawyer_email: '', next_hearing: '', filed_on: '', fees_billed: '', fees_collected: '', sections: '', offence_date: '', opposing_counsel: '', notes: '', references: {} };

export function MatterForm({ open, onClose, initial, onSaved }) {
  const { t, profile, country, me } = useLegal();
  const [form, setForm] = useState(() => ({ ...EMPTY, lawyer_email: me?.email || '', ...(initial || {}), references: { ...((initial || {}).references || {}) } }));
  const [saving, setSaving] = useState(false);
  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v?.target ? v.target.value : v }));
  const setRef = (k) => (e) => setForm((f) => ({ ...f, references: { ...f.references, [k]: e.target.value } }));
  const mcountry = initial?.country || country;

  const save = async () => {
    setSaving(true);
    try {
      const body = { ...form, country: mcountry };
      ['next_hearing', 'filed_on', 'offence_date', 'fees_billed', 'fees_collected'].forEach((k) => body[k] === '' && (body[k] = null));
      const res = initial?.id ? await legalApi.updateMatter(initial.id, body) : await legalApi.createMatter(body);
      (res.warnings || []).forEach((w) => toast.message(w));
      onSaved?.(res);
      onClose();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Panel
      open={open}
      onClose={onClose}
      title={initial?.id ? `${t('edit')}: ${initial.title}` : t('matters_new')}
      footer={
        <>
          <Btn variant="secondary" onClick={onClose}>{t('cancel')}</Btn>
          <Btn onClick={save} disabled={saving}>{t('save')}</Btn>
        </>
      }
    >
      <div className="space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label={t('f_petitioner')}><TextInput value={form.petitioner || ''} onChange={set('petitioner')} /></Field>
          <Field label={t('f_respondent')}><TextInput value={form.respondent || ''} onChange={set('respondent')} /></Field>
        </div>
        <Field label={t('f_title')} hint="Filled from the parties if left blank."><TextInput value={form.title || ''} onChange={set('title')} /></Field>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label={t('f_client')}><TextInput value={form.client || ''} onChange={set('client')} /></Field>
          <Field label={t('f_client_phone')}><TextInput type="tel" value={form.client_phone || ''} onChange={set('client_phone')} /></Field>
        </div>
        <Field label={t('f_court')}><Select options={courtOptions(profile)} value={form.court_code || ''} onChange={set('court_code')} placeholder="—" /></Field>
        <div className="grid grid-cols-2 gap-3">
          {(profile?.reference_fields || []).map((rf) => (
            <Field key={rf.key} label={rf.label} hint={rf.hint}>
              <TextInput value={form.references?.[rf.key] || ''} onChange={setRef(rf.key)} />
            </Field>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label={t('f_stage')}><Select options={stageOptions(profile)} value={form.stage || ''} onChange={set('stage')} placeholder="—" /></Field>
          <Field label={t('f_next_hearing')}><TextInput type="date" value={form.next_hearing || ''} onChange={set('next_hearing')} /></Field>
          <Field label={t('f_lawyer')}><TextInput type="email" value={form.lawyer_email || ''} onChange={set('lawyer_email')} /></Field>
          <Field label={t('f_filed_on')}><TextInput type="date" value={form.filed_on || ''} onChange={set('filed_on')} /></Field>
          <Field label={`${t('f_fees_billed')} (${profile?.currency_symbol || ''})`}><TextInput inputMode="decimal" value={form.fees_billed ?? ''} onChange={set('fees_billed')} /></Field>
          <Field label={`${t('f_fees_collected')} (${profile?.currency_symbol || ''})`}><TextInput inputMode="decimal" value={form.fees_collected ?? ''} onChange={set('fees_collected')} /></Field>
        </div>
        {mcountry === 'IN' ? (
          <div className="grid grid-cols-2 gap-3">
            <Field label={t('f_sections')}><TextInput value={form.sections || ''} onChange={set('sections')} placeholder="e.g. 420, 406 IPC" /></Field>
            <Field label={t('f_offence_date')}><TextInput type="date" value={form.offence_date || ''} onChange={set('offence_date')} /></Field>
          </div>
        ) : null}
        <Field label={t('f_opposing')}><TextInput value={form.opposing_counsel || ''} onChange={set('opposing_counsel')} /></Field>
        {initial?.id ? (
          <Field label={t('f_status')}>
            <Select options={['open', 'disposed', 'closed'].map((s) => ({ value: s, label: t(`status_${s}`) }))} value={form.status || 'open'} onChange={set('status')} />
          </Field>
        ) : null}
        <Field label={t('f_notes')}><TextArea rows={3} value={form.notes || ''} onChange={set('notes')} /></Field>
      </div>
    </Panel>
  );
}

MatterForm.propTypes = { open: PropTypes.bool, onClose: PropTypes.func.isRequired, initial: PropTypes.object, onSaved: PropTypes.func };

// --- the matter card ------------------------------------------------------------------------
export function LinkList({ links }) {
  const { t } = useLegal();
  return (
    <div className="space-y-1.5">
      {links.map((l) => (
        <div key={l.url + l.label} className="flex items-center gap-2">
          <a href={l.url} target="_blank" rel="noreferrer" className="flex-1 inline-flex items-center gap-1.5 text-sm text-blue-700 dark:text-blue-400 hover:underline">
            <ExternalLink className="w-3.5 h-3.5 shrink-0" /> {l.label}
          </a>
          {l.copy ? (
            <button type="button" onClick={() => copyText(l.copy, t)} className="inline-flex items-center gap-1 text-xs text-slate-600 dark:text-slate-300 px-2 py-1 rounded bg-slate-100 dark:bg-slate-800">
              <Copy className="w-3 h-3" /> {l.copy}
            </button>
          ) : null}
        </div>
      ))}
    </div>
  );
}

LinkList.propTypes = { links: PropTypes.array.isRequired };

export function MatterDetail({ matterId, onClose, onChanged }) {
  const { t, profile } = useLegal();
  const state = useLoad(() => legalApi.matter(matterId), [matterId]);
  const [editing, setEditing] = useState(false);
  const [updating, setUpdating] = useState(false);
  const m = state.data;
  const changed = () => {
    state.reload();
    onChanged?.();
  };
  const remove = async () => {
    if (!window.confirm(`${t('delete')}: ${m.title}?`)) return;
    try {
      await legalApi.deleteMatter(m.id);
      onChanged?.();
      onClose();
    } catch (e) {
      toast.error(e.message);
    }
  };
  const lastVideo = m?.hearings?.find((h) => h.video_link)?.video_link;

  return (
    <Panel open onClose={onClose} title={m?.title || t('loading')}>
      <LoadState state={state} t={t} />
      {m ? (
        <div className="space-y-5">
          <div>
            <div className="text-sm text-slate-600 dark:text-slate-300">{m.court_name || '—'} {m.reference ? `· ${m.reference}` : ''}</div>
            <div className="mt-1 flex flex-wrap gap-2 text-xs">
              <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800">{t(`status_${m.status}`)}</span>
              {m.stage ? <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-800 dark:bg-blue-950 dark:text-blue-200">{stageLabel(profile, m.stage)}</span> : null}
              {m.adjournment_likelihood != null ? <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 dark:bg-amber-950 dark:text-amber-200">{t('likely_adjourned', { p: Math.round(m.adjournment_likelihood * 100) })}</span> : null}
            </div>
            {m.warnings?.length ? <ul className="mt-2 text-xs text-amber-700 dark:text-amber-300 list-disc pl-5">{m.warnings.map((w) => <li key={w}>{w}</li>)}</ul> : null}
          </div>

          <div className="flex flex-wrap gap-2">
            {m.status === 'open' ? <Btn onClick={() => setUpdating(true)}>{t('update_after_hearing')}</Btn> : null}
            {lastVideo ? <a href={lastVideo} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2.5 text-sm font-semibold bg-emerald-600 text-white"><Video className="w-4 h-4" />{t('join_video')}</a> : null}
            <Btn variant="secondary" onClick={() => setEditing(true)}>{t('edit')}</Btn>
            <Btn variant="danger" onClick={remove}>{t('delete')}</Btn>
          </div>

          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            {[
              ['f_next_hearing', fmtDate(m.next_hearing)],
              ['f_client', m.client_phone ? <a key="p" href={`tel:${m.client_phone}`} className="text-blue-700 dark:text-blue-400">{m.client || m.client_phone}</a> : m.client],
              ['f_lawyer', m.lawyer_email],
              ['f_filed_on', fmtDate(m.filed_on)],
              ['f_opposing', m.opposing_counsel],
              ['f_fees_billed', `${fmtMoney(m.fees_billed, m.country)} / ${fmtMoney(m.fees_collected, m.country)}`],
            ].map(([k, v]) => (
              <div key={k}>
                <dt className="text-xs text-slate-500">{t(k)}</dt>
                <dd className="text-slate-900 dark:text-slate-100 break-words">{v || '—'}</dd>
              </div>
            ))}
          </dl>
          {Object.entries(m.references || {}).filter(([, v]) => v).length ? (
            <div className="text-xs text-slate-600 dark:text-slate-300 flex flex-wrap gap-x-4 gap-y-1">
              {(profile?.reference_fields || []).filter((rf) => m.references?.[rf.key]).map((rf) => <span key={rf.key}><b>{rf.label}:</b> {m.references[rf.key]}</span>)}
            </div>
          ) : null}
          {m.notes ? <p className="text-sm whitespace-pre-wrap text-slate-700 dark:text-slate-300">{m.notes}</p> : null}

          {m.statutes?.length ? (
            <div>
              <SectionTitle>{t('statutes_found')}</SectionTitle>
              <ul className="text-sm space-y-1">{m.statutes.map((s) => <li key={s.old_section}>{s.old_act} {s.old_section} → <b>{s.new_act} {s.new_section}</b> · {s.subject}</li>)}</ul>
              {m.which_law ? <p className="text-xs text-slate-500 mt-1">{m.which_law}</p> : null}
            </div>
          ) : null}

          <div>
            <SectionTitle>{t('history')}</SectionTitle>
            {m.hearings?.length ? (
              <ol className="relative border-l border-slate-200 dark:border-slate-700 ml-2 space-y-3">
                {m.hearings.map((h) => (
                  <li key={h.id} className="ml-4">
                    <span className="absolute -left-1.5 mt-1.5 w-3 h-3 rounded-full bg-blue-600" />
                    <div className="text-sm font-medium text-slate-900 dark:text-slate-100">{fmtDate(h.date)} {h.outcome ? `· ${t(`o_${h.outcome}`)}` : ''}</div>
                    <div className="text-xs text-slate-600 dark:text-slate-300">{[h.purpose, h.judge, h.next_date ? `${t('next_date')}: ${fmtDate(h.next_date)}` : ''].filter(Boolean).join(' · ')}</div>
                    {h.notes ? <div className="text-xs text-slate-500 whitespace-pre-wrap">{h.notes}</div> : null}
                  </li>
                ))}
              </ol>
            ) : (
              <Empty>{t('history_none')}</Empty>
            )}
          </div>

          {m.tasks?.length ? (
            <div>
              <SectionTitle>{t('tasks_title')}</SectionTitle>
              <ul className="text-sm space-y-1">{m.tasks.map((x) => <li key={x.id} className={x.done ? 'line-through text-slate-400' : ''}>{fmtDate(x.due_date)} · {x.title}</li>)}</ul>
            </div>
          ) : null}

          <div>
            <SectionTitle>{t('court_links')}</SectionTitle>
            <LinkList links={m.links || []} />
            <p className="text-xs text-slate-500 mt-2">{t('links_note')}</p>
          </div>
        </div>
      ) : null}
      {editing && m ? <MatterForm open initial={m} onClose={() => setEditing(false)} onSaved={changed} /> : null}
      {updating && m ? <HearingUpdate open matter={m} onClose={() => setUpdating(false)} onSaved={changed} /> : null}
    </Panel>
  );
}

MatterDetail.propTypes = { matterId: PropTypes.number.isRequired, onClose: PropTypes.func.isRequired, onChanged: PropTypes.func };

// --- list -----------------------------------------------------------------------------------
function NextDate({ iso }) {
  const today = isoToday();
  const cls = !iso ? 'text-slate-400' : iso < today ? 'text-red-600 font-semibold' : iso === today ? 'text-blue-700 dark:text-blue-400 font-semibold' : 'text-slate-900 dark:text-slate-100';
  return <span className={`tabular-nums ${cls}`}>{fmtDate(iso)}</span>;
}

NextDate.propTypes = { iso: PropTypes.string };

export function MattersTab({ refreshKey, onChanged }) {
  const { t, profile, openMatter, goTab } = useLegal();
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('open');
  const [court, setCourt] = useState('');
  const [creating, setCreating] = useState(false);
  const state = useLoad(() => legalApi.matters({ status }), [status, refreshKey]);
  const all = state.data?.matters || [];
  const courts = useMemo(() => {
    const seen = new Map();
    all.forEach((m) => m.court_code && seen.set(m.court_code, m.court_name || m.court_code));
    return [...seen.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [all]);
  const rows = useMemo(() => {
    const ql = q.trim().toLowerCase();
    return all.filter((m) => (!court || m.court_code === court)
      && (!ql || [m.title, m.client, m.reference, m.court_name, m.lawyer_email, ...(Object.values(m.references || {}))].join(' ').toLowerCase().includes(ql)));
  }, [all, q, court]);
  const due = (m) => Math.max(0, Number(m.fees_billed || 0) - Number(m.fees_collected || 0));

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-3.5 text-slate-400" />
          <TextInput className="pl-9" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('matters_search')} />
        </div>
        <Btn onClick={() => setCreating(true)} aria-label={t('matters_new')}><Plus className="w-4 h-4" /><span className="hidden sm:inline">{t('matters_new')}</span></Btn>
      </div>
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {['open', 'disposed', ''].map((s) => (
          <Chip key={s || 'all'} active={status === s} onClick={() => setStatus(s)}>{s ? t(`status_${s}`) : t('all')}</Chip>
        ))}
        <select value={court} onChange={(e) => setCourt(e.target.value)} className="shrink-0 rounded-full border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm px-3 py-1.5">
          <option value="">{t('f_court')}: {t('all')}</option>
          {courts.map(([code, name]) => <option key={code} value={code}>{name}</option>)}
        </select>
        {state.data ? <span className="ml-auto shrink-0 text-xs text-slate-500">{rows.length} / {all.length}</span> : null}
      </div>
      <LoadState state={state} t={t} />

      {state.data && !all.length && !q && status !== 'disposed' ? (
        <Card className="text-center py-10">
          <Briefcase className="w-9 h-9 mx-auto text-slate-300 mb-2" />
          <div className="font-semibold text-slate-800 dark:text-slate-100">{t('matters_empty_title')}</div>
          <p className="text-sm text-slate-500 max-w-md mx-auto mt-1 mb-4">{t('matters_none')}</p>
          <div className="flex flex-wrap justify-center gap-2">
            <Btn onClick={() => setCreating(true)}><Plus className="w-4 h-4" />{t('matters_new')}</Btn>
            <Btn variant="secondary" onClick={() => goTab('more')}>{t('more_import')}</Btn>
          </div>
        </Card>
      ) : null}
      {state.data && all.length && !rows.length ? <Empty>{t('none')}</Empty> : null}

      {rows.length ? (
        <div className="hidden md:block overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-2.5 font-semibold">{t('col_matter')}</th>
                <th className="px-3 py-2.5 font-semibold">{t('f_court')}</th>
                <th className="px-3 py-2.5 font-semibold">{t('f_stage')}</th>
                <th className="px-3 py-2.5 font-semibold whitespace-nowrap">{t('col_next')}</th>
                <th className="px-3 py-2.5 font-semibold">{t('f_lawyer').replace(/\s*\(.*\)/, '')}</th>
                <th className="px-4 py-2.5 font-semibold text-right whitespace-nowrap">{t('col_fees_due')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {rows.map((m) => (
                <tr key={m.id} onClick={() => openMatter(m.id)} className="cursor-pointer hover:bg-blue-50/50 dark:hover:bg-slate-800/60">
                  <td className="px-4 py-3 max-w-[18rem]">
                    <div className="font-semibold text-slate-900 dark:text-slate-100 truncate">{m.title}</div>
                    <div className="text-xs text-slate-500 truncate">{[m.reference, m.client].filter(Boolean).join(' · ') || '—'}</div>
                  </td>
                  <td className="px-3 py-3 text-slate-700 dark:text-slate-300 max-w-[11rem] truncate">{m.court_name || '—'}</td>
                  <td className="px-3 py-3">
                    {m.stage ? <span className="px-2 py-0.5 rounded-full text-xs bg-blue-50 text-blue-800 dark:bg-blue-950 dark:text-blue-200 whitespace-nowrap">{stageLabel(profile, m.stage)}</span> : <span className="text-slate-400">—</span>}
                    {m.status !== 'open' ? <span className="ml-1 px-2 py-0.5 rounded-full text-xs bg-slate-100 dark:bg-slate-800">{t(`status_${m.status}`)}</span> : null}
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap"><NextDate iso={m.next_hearing} /></td>
                  <td className="px-3 py-3 text-slate-600 dark:text-slate-300 max-w-[10rem] truncate" title={m.lawyer_email || ''}>{m.lawyer_email || '—'}</td>
                  <td className="px-4 py-3 text-right tabular-nums whitespace-nowrap">{due(m) ? fmtMoney(due(m), m.country) : <span className="text-slate-400">—</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      <ul className="space-y-2 md:hidden">
        {rows.map((m) => (
          <li key={m.id}>
            <button type="button" onClick={() => openMatter(m.id)} className="w-full text-left rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-3 hover:border-blue-400">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-semibold text-slate-900 dark:text-slate-100 truncate">{m.title}</div>
                  <div className="text-xs text-slate-500 truncate">{m.court_name || '—'}{m.reference ? ` · ${m.reference}` : ''}</div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-sm"><NextDate iso={m.next_hearing} /></div>
                  <div className="text-xs text-slate-500">{stageLabel(profile, m.stage)}</div>
                </div>
              </div>
            </button>
          </li>
        ))}
      </ul>
      {creating ? <MatterForm open onClose={() => setCreating(false)} onSaved={(m) => { onChanged?.(); state.reload(); if (m?.id) openMatter(m.id); }} /> : null}
    </div>
  );
}

MattersTab.propTypes = { refreshKey: PropTypes.number, onChanged: PropTypes.func };
