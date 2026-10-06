// Deadlines and tasks. A rule suggests a date; a person confirms it (and may change it). Who confirmed
// it is recorded and shown. Never presented as legal advice.
import { useState } from 'react';
import PropTypes from 'prop-types';
import { toast } from 'sonner';
import { CalendarClock, Check, Plus, ShieldCheck } from 'lucide-react';
import { legalApi } from '@/lib/legal/api';
import { fmtDate, isoToday } from '@/lib/legal/format';
import { Btn, Card, Empty, Field, LoadState, Panel, SectionTitle, Select, TextInput, useLegal, useLoad } from './shared';

function useMatterOptions(open) {
  const state = useLoad(() => (open ? legalApi.matters({ status: 'open' }) : Promise.resolve({ matters: [] })), [open]);
  return (state.data?.matters || []).map((m) => ({ value: String(m.id), label: m.title }));
}

function DeadlineCalculator({ open, onClose, onSaved }) {
  const { t, profile } = useLegal();
  const rules = profile?.deadline_rules || [];
  const [ruleId, setRuleId] = useState(rules[0]?.id || '');
  const [trigger, setTrigger] = useState(isoToday());
  const [suggestion, setSuggestion] = useState(null);
  const [due, setDue] = useState('');
  const [matterId, setMatterId] = useState('');
  const matterOptions = useMatterOptions(open);
  const rule = rules.find((r) => r.id === ruleId);

  const work = async () => {
    try {
      const s = await legalApi.suggestDeadline({ rule_id: ruleId, trigger_date: trigger });
      setSuggestion(s);
      setDue(s.suggested_date);
    } catch (e) {
      toast.error(e.message);
    }
  };
  const confirm = async () => {
    try {
      await legalApi.confirmDeadline({ rule_id: ruleId, trigger_date: trigger, due_date: due, matter_id: matterId ? Number(matterId) : null });
      onSaved?.();
      onClose();
    } catch (e) {
      toast.error(e.message);
    }
  };

  return (
    <Panel open={open} onClose={onClose} title={t('deadline_new')}
      footer={<><Btn variant="secondary" onClick={onClose}>{t('cancel')}</Btn><Btn onClick={confirm} disabled={!suggestion || !due}><ShieldCheck className="w-4 h-4" />{t('confirm')}</Btn></>}>
      <div className="space-y-3">
        <Field label={t('rule')}><Select options={rules.map((r) => ({ value: r.id, label: r.label }))} value={ruleId} onChange={(v) => { setRuleId(v); setSuggestion(null); }} /></Field>
        {rule ? <p className="text-xs text-slate-500">{rule.note}</p> : null}
        <Field label={`${t('trigger_date')}${rule ? ` — ${rule.trigger}` : ''}`}><TextInput type="date" value={trigger} onChange={(e) => { setTrigger(e.target.value); setSuggestion(null); }} /></Field>
        <Btn variant="secondary" onClick={work} disabled={!ruleId || !trigger}><CalendarClock className="w-4 h-4" />{t('suggested')}</Btn>
        {suggestion ? (
          <Card className="bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-900">
            <div className="text-sm">{t('suggested')}: <b className="text-lg">{fmtDate(suggestion.suggested_date)}</b> <span className="text-slate-500">({suggestion.period})</span></div>
            {suggestion.rolled ? <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">{suggestion.rolled}</p> : null}
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label={t('confirm_date')}><TextInput type="date" value={due} onChange={(e) => setDue(e.target.value)} /></Field>
              <Field label={t('tab_matters')}><Select options={matterOptions} value={matterId} onChange={setMatterId} placeholder="—" /></Field>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 mt-3">{t('not_legal_advice')}</p>
          </Card>
        ) : null}
      </div>
    </Panel>
  );
}

DeadlineCalculator.propTypes = { open: PropTypes.bool, onClose: PropTypes.func.isRequired, onSaved: PropTypes.func };

function TaskForm({ open, onClose, onSaved }) {
  const { t, me } = useLegal();
  const [form, setForm] = useState({ title: '', due_date: '', matter_id: '', assignee_email: me?.email || '' });
  const matterOptions = useMatterOptions(open);
  const save = async () => {
    try {
      await legalApi.createTask({ ...form, matter_id: form.matter_id ? Number(form.matter_id) : null, due_date: form.due_date || null });
      onSaved?.();
      onClose();
    } catch (e) {
      toast.error(e.message);
    }
  };
  return (
    <Panel open={open} onClose={onClose} title={t('task_new')} footer={<><Btn variant="secondary" onClick={onClose}>{t('cancel')}</Btn><Btn onClick={save} disabled={!form.title.trim()}>{t('save')}</Btn></>}>
      <div className="space-y-3">
        <Field label={t('f_title')}><TextInput value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label={t('due')}><TextInput type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} /></Field>
          <Field label={t('f_lawyer')}><TextInput type="email" value={form.assignee_email} onChange={(e) => setForm({ ...form, assignee_email: e.target.value })} /></Field>
        </div>
        <Field label={t('tab_matters')}><Select options={matterOptions} value={form.matter_id} onChange={(v) => setForm({ ...form, matter_id: v })} placeholder="—" /></Field>
      </div>
    </Panel>
  );
}

TaskForm.propTypes = { open: PropTypes.bool, onClose: PropTypes.func.isRequired, onSaved: PropTypes.func };

export function TasksTab({ refreshKey, onChanged }) {
  const { t, openMatter } = useLegal();
  const [calc, setCalc] = useState(false);
  const [creating, setCreating] = useState(false);
  const state = useLoad(() => legalApi.tasks(true), [refreshKey]);
  const today = isoToday();
  const done = async (task) => {
    try {
      await legalApi.updateTask(task.id, { done: true });
      state.reload();
      onChanged?.();
    } catch (e) {
      toast.error(e.message);
    }
  };
  const tasks = state.data?.tasks || [];

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Btn onClick={() => setCalc(true)} className="flex-1 sm:flex-none"><CalendarClock className="w-4 h-4" />{t('deadline_new')}</Btn>
        <Btn variant="secondary" onClick={() => setCreating(true)}><Plus className="w-4 h-4" />{t('task_new')}</Btn>
      </div>
      <SectionTitle>{t('tasks_title')}</SectionTitle>
      <LoadState state={state} t={t} />
      {state.data && !tasks.length ? <Empty>{t('tasks_none')}</Empty> : null}
      <ul className="space-y-2">
        {tasks.map((x) => {
          const overdue = x.due_date && x.due_date < today;
          return (
            <li key={x.id} className="flex items-start gap-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2.5">
              <button type="button" onClick={() => done(x)} className="mt-0.5 w-6 h-6 rounded-full border-2 border-slate-300 dark:border-slate-600 flex items-center justify-center hover:border-emerald-500 shrink-0" aria-label={t('mark_done')}>
                <Check className="w-3.5 h-3.5 text-transparent hover:text-emerald-500" />
              </button>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium text-slate-900 dark:text-slate-100">{x.title}</div>
                {x.matter_title ? <button type="button" onClick={() => openMatter(x.matter_id)} className="text-xs text-blue-700 dark:text-blue-400 truncate block max-w-full">{x.matter_title}</button> : null}
                {x.kind === 'deadline' ? (
                  <div className="text-xs mt-0.5 text-slate-500">
                    {x.basis?.label}
                    {' · '}
                    {x.confirmed_by ? <span className="text-emerald-700 dark:text-emerald-400">{t('confirmed_by', { who: x.confirmed_by })}</span> : <span className="text-amber-700 dark:text-amber-400">{t('not_confirmed')}</span>}
                  </div>
                ) : null}
              </div>
              <div className={`text-sm font-semibold shrink-0 ${overdue ? 'text-red-600' : 'text-slate-700 dark:text-slate-200'}`}>{overdue ? `${t('overdue')} ` : ''}{fmtDate(x.due_date)}</div>
            </li>
          );
        })}
      </ul>
      {calc ? <DeadlineCalculator open onClose={() => setCalc(false)} onSaved={() => { state.reload(); onChanged?.(); }} /> : null}
      {creating ? <TaskForm open onClose={() => setCreating(false)} onSaved={() => { state.reload(); onChanged?.(); }} /> : null}
    </div>
  );
}

TasksTab.propTypes = { refreshKey: PropTypes.number, onChanged: PropTypes.func };
