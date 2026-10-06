// Deadlines and tasks. A rule suggests a date as soon as the rule and trigger date are chosen; a person
// confirms it (and may change it). Who confirmed it is recorded and shown. Never presented as legal advice.
import { useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import { toast } from 'sonner';
import { CalendarClock, Check, ListChecks, Plus, ShieldAlert, ShieldCheck } from 'lucide-react';
import { legalApi } from '@/lib/legal/api';
import { daysFromToday, fmtDate, isoToday } from '@/lib/legal/format';
import { Btn, Card, Field, LoadState, Panel, SectionTitle, Select, TextArea, TextInput, useLegal, useLoad } from './shared';

function useMatterOptions(open) {
  const state = useLoad(() => (open ? legalApi.matters({ status: 'open' }) : Promise.resolve({ matters: [] })), [open]);
  return (state.data?.matters || []).map((m) => ({ value: String(m.id), label: m.title }));
}

function useTeamOptions(open, me) {
  const state = useLoad(() => (open ? legalApi.team() : Promise.resolve({ members: [] })), [open]);
  const members = state.data?.members || [];
  const opts = members.map((m) => ({ value: m.email, label: m.name ? `${m.name} (${m.email})` : m.email }));
  if (me?.email && !opts.some((o) => o.value === me.email)) opts.unshift({ value: me.email, label: me.email });
  return opts;
}

function DeadlineCalculator({ open, onClose, onSaved }) {
  const { t, profile, me } = useLegal();
  const rules = profile?.deadline_rules || [];
  const [ruleId, setRuleId] = useState(rules[0]?.id || '');
  const [trigger, setTrigger] = useState(isoToday());
  const [suggestion, setSuggestion] = useState(null);
  const [due, setDue] = useState('');
  const [matterId, setMatterId] = useState('');
  const [assignee, setAssignee] = useState(me?.email || '');
  const [saving, setSaving] = useState(false);
  const matterOptions = useMatterOptions(open);
  const teamOptions = useTeamOptions(open, me);
  const rule = rules.find((r) => r.id === ruleId);

  // Work the date out as soon as the rule and trigger date are known.
  useEffect(() => {
    let alive = true;
    if (!ruleId || !trigger) {
      setSuggestion(null);
      return undefined;
    }
    legalApi
      .suggestDeadline({ rule_id: ruleId, trigger_date: trigger })
      .then((s) => {
        if (!alive) return;
        setSuggestion(s);
        setDue(s.suggested_date);
      })
      .catch((e) => alive && toast.error(e.message));
    return () => {
      alive = false;
    };
  }, [ruleId, trigger]);

  const confirm = async () => {
    setSaving(true);
    try {
      await legalApi.confirmDeadline({ rule_id: ruleId, trigger_date: trigger, due_date: due, matter_id: matterId ? Number(matterId) : null, assignee_email: assignee || null });
      onSaved?.();
      onClose();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };
  const changed = suggestion && due && due !== suggestion.suggested_date;

  return (
    <Panel open={open} onClose={onClose} title={t('deadline_new')}
      footer={<><Btn variant="secondary" onClick={onClose}>{t('cancel')}</Btn><Btn onClick={confirm} disabled={!suggestion || !due || saving}><ShieldCheck className="w-4 h-4" />{t('confirm')}</Btn></>}>
      <div className="space-y-4">
        <Field label={t('pick_rule')}><Select options={rules.map((r) => ({ value: r.id, label: r.label }))} value={ruleId} onChange={setRuleId} /></Field>
        {rule ? (
          <dl className="grid grid-cols-2 gap-3 text-sm rounded-lg bg-slate-50 dark:bg-slate-800/60 px-3 py-2.5">
            <div><dt className="text-xs text-slate-500">{t('period')}</dt><dd className="font-medium">{rule.n} {rule.unit}{rule.offset_days === -1 ? ' − 1 day' : ''}</dd></div>
            <div><dt className="text-xs text-slate-500">{t('trigger_date')}</dt><dd className="font-medium">{rule.trigger}</dd></div>
            {rule.note ? <div className="col-span-2 text-xs text-slate-600 dark:text-slate-300">{rule.note}</div> : null}
          </dl>
        ) : null}
        <Field label={rule ? rule.trigger : t('trigger_date')}><TextInput type="date" value={trigger} onChange={(e) => setTrigger(e.target.value)} /></Field>

        {suggestion ? (
          <Card className="bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-900">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <div>
                <div className="text-xs uppercase tracking-wide text-blue-800 dark:text-blue-300 font-semibold">{t('live_suggestion')}</div>
                <div className="text-2xl font-bold text-slate-900 dark:text-slate-100 tabular-nums">{fmtDate(suggestion.suggested_date)}</div>
              </div>
              <div className="text-sm text-slate-600 dark:text-slate-300">{suggestion.period} · {fmtDate(suggestion.trigger_date)}</div>
            </div>
            {suggestion.rolled ? <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">{suggestion.rolled}</p> : null}
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label={t('confirm_date')} hint={changed ? `${t('suggested')}: ${fmtDate(suggestion.suggested_date)}` : undefined}>
                <TextInput type="date" value={due} onChange={(e) => setDue(e.target.value)} />
              </Field>
              <Field label={t('assignee')}><Select options={teamOptions} value={assignee} onChange={setAssignee} /></Field>
              <div className="sm:col-span-2"><Field label={t('tab_matters')}><Select options={matterOptions} value={matterId} onChange={setMatterId} placeholder="—" /></Field></div>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 mt-3 flex gap-1.5"><ShieldAlert className="w-4 h-4 shrink-0" />{t('not_legal_advice')}</p>
          </Card>
        ) : null}
      </div>
    </Panel>
  );
}

DeadlineCalculator.propTypes = { open: PropTypes.bool, onClose: PropTypes.func.isRequired, onSaved: PropTypes.func };

function TaskForm({ open, onClose, onSaved }) {
  const { t, me } = useLegal();
  const [form, setForm] = useState({ title: '', due_date: '', matter_id: '', assignee_email: me?.email || '', notes: '' });
  const [saving, setSaving] = useState(false);
  const matterOptions = useMatterOptions(open);
  const teamOptions = useTeamOptions(open, me);
  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v?.target ? v.target.value : v }));
  const save = async () => {
    setSaving(true);
    try {
      await legalApi.createTask({ ...form, matter_id: form.matter_id ? Number(form.matter_id) : null, due_date: form.due_date || null, notes: form.notes || null });
      onSaved?.();
      onClose();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };
  return (
    <Panel open={open} onClose={onClose} title={t('task_new')} footer={<><Btn variant="secondary" onClick={onClose}>{t('cancel')}</Btn><Btn onClick={save} disabled={!form.title.trim() || saving}>{t('save')}</Btn></>}>
      <div className="space-y-3">
        <Field label={t('task_title')}><TextInput autoFocus value={form.title} onChange={set('title')} placeholder="e.g. File rejoinder, brief counsel, collect certified copy" /></Field>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label={t('due')}><TextInput type="date" value={form.due_date} onChange={set('due_date')} /></Field>
          <Field label={t('assignee')}><Select options={teamOptions} value={form.assignee_email} onChange={set('assignee_email')} /></Field>
        </div>
        <Field label={t('tab_matters')}><Select options={matterOptions} value={form.matter_id} onChange={set('matter_id')} placeholder="—" /></Field>
        <Field label={t('f_notes')}><TextArea rows={3} value={form.notes} onChange={set('notes')} /></Field>
      </div>
    </Panel>
  );
}

TaskForm.propTypes = { open: PropTypes.bool, onClose: PropTypes.func.isRequired, onSaved: PropTypes.func };

function TaskRow({ x, onDone }) {
  const { t, openMatter } = useLegal();
  const days = daysFromToday(x.due_date);
  const overdue = days != null && days < 0;
  return (
    <li className="flex items-start gap-3 px-3 py-3">
      <button type="button" onClick={() => onDone(x)} className="group mt-0.5 w-6 h-6 rounded-full border-2 border-slate-300 dark:border-slate-600 flex items-center justify-center hover:border-emerald-500 shrink-0" aria-label={t('mark_done')}>
        <Check className="w-3.5 h-3.5 text-transparent group-hover:text-emerald-500" />
      </button>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          {x.kind === 'deadline' ? <span className="text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-200">{t('kind_deadline')}</span> : null}
          <span className="text-sm font-medium text-slate-900 dark:text-slate-100">{x.title}</span>
        </div>
        {x.matter_title ? <button type="button" onClick={() => openMatter(x.matter_id)} className="text-xs text-blue-700 dark:text-blue-400 truncate block max-w-full hover:underline">{x.matter_title}</button> : null}
        <div className="text-xs mt-0.5 text-slate-500 flex flex-wrap gap-x-3">
          {x.kind === 'deadline' && x.basis?.label ? <span>{t('basis')}: {x.basis.label}</span> : null}
          {x.kind === 'deadline' ? (
            x.confirmed_by ? <span className="text-emerald-700 dark:text-emerald-400">{t('confirmed_by', { who: x.confirmed_by })}</span> : <span className="text-amber-700 dark:text-amber-400">{t('not_confirmed')}</span>
          ) : null}
          {x.assignee_email ? <span>{t('assignee')}: {x.assignee_email}</span> : null}
        </div>
      </div>
      <div className="text-right shrink-0">
        <div className={`text-sm font-semibold tabular-nums ${overdue ? 'text-red-600' : days === 0 ? 'text-blue-700' : 'text-slate-700 dark:text-slate-200'}`}>{fmtDate(x.due_date)}</div>
        {days != null ? <div className={`text-xs ${overdue ? 'text-red-600' : 'text-slate-500'}`}>{overdue ? `${-days}d ${t('overdue').toLowerCase()}` : days === 0 ? t('tab_today') : `${days}d`}</div> : null}
      </div>
    </li>
  );
}

TaskRow.propTypes = { x: PropTypes.object.isRequired, onDone: PropTypes.func.isRequired };

export function TasksTab({ refreshKey, onChanged }) {
  const { t } = useLegal();
  const [calc, setCalc] = useState(false);
  const [creating, setCreating] = useState(false);
  const state = useLoad(() => legalApi.tasks(true), [refreshKey]);
  const done = async (task) => {
    try {
      await legalApi.updateTask(task.id, { done: true });
      toast.success(`${t('mark_done')}: ${task.title}`);
      state.reload();
      onChanged?.();
    } catch (e) {
      toast.error(e.message);
    }
  };
  const groups = useMemo(() => {
    const tasks = state.data?.tasks || [];
    const g = { overdue: [], week: [], later: [], nodate: [] };
    tasks.forEach((x) => {
      const d = daysFromToday(x.due_date);
      if (d == null) g.nodate.push(x);
      else if (d < 0) g.overdue.push(x);
      else if (d <= 7) g.week.push(x);
      else g.later.push(x);
    });
    return g;
  }, [state.data]);
  const total = state.data?.tasks?.length || 0;
  const reload = () => {
    state.reload();
    onChanged?.();
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Btn onClick={() => setCalc(true)}><CalendarClock className="w-4 h-4" />{t('deadline_new')}</Btn>
        <Btn variant="secondary" onClick={() => setCreating(true)}><Plus className="w-4 h-4" />{t('task_new')}</Btn>
      </div>
      <LoadState state={state} t={t} />
      {state.data && !total ? (
        <Card className="text-center py-10">
          <ListChecks className="w-9 h-9 mx-auto text-slate-300 mb-2" />
          <div className="font-semibold text-slate-800 dark:text-slate-100">{t('deadlines_empty_title')}</div>
          <p className="text-sm text-slate-500 max-w-lg mx-auto mt-1 mb-4">{t('deadlines_empty_body')}</p>
          <Btn onClick={() => setCalc(true)}><CalendarClock className="w-4 h-4" />{t('deadline_new')}</Btn>
        </Card>
      ) : null}
      {[
        ['overdue', 'grp_overdue', 'text-red-700 dark:text-red-400'],
        ['week', 'grp_week', 'text-slate-500'],
        ['later', 'grp_later', 'text-slate-500'],
        ['nodate', 'grp_nodate', 'text-slate-500'],
      ].map(([key, label, cls]) => (groups[key].length ? (
        <section key={key}>
          <SectionTitle><span className={cls}>{t(label)} ({groups[key].length})</span></SectionTitle>
          <ul className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 divide-y divide-slate-100 dark:divide-slate-800">
            {groups[key].map((x) => <TaskRow key={x.id} x={x} onDone={done} />)}
          </ul>
        </section>
      ) : null))}
      {calc ? <DeadlineCalculator open onClose={() => setCalc(false)} onSaved={reload} /> : null}
      {creating ? <TaskForm open onClose={() => setCreating(false)} onSaved={reload} /> : null}
    </div>
  );
}

TasksTab.propTypes = { refreshKey: PropTypes.number, onChanged: PropTypes.func };
