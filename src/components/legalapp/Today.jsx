// Today: the firm's day at a glance. A summary strip, the day's hearings by court (with the chance of
// adjournment and clashes), and alongside them suggestions, what is due and the coming week. On a
// phone the side column stacks under the hearings; on desktop it sits to the right.
import { useState } from 'react';
import PropTypes from 'prop-types';
import { toast } from 'sonner';
import {
  AlertTriangle, CalendarClock, CalendarDays, CheckCircle2, ChevronLeft, ChevronRight, Clock, FileSpreadsheet, Gavel, IndianRupee,
  PoundSterling, Phone, Sparkles, Users,
} from 'lucide-react';
import { legalApi } from '@/lib/legal/api';
import { fmtDate, fmtMoney, isoToday } from '@/lib/legal/format';
import { Btn, Card, Chip, Empty, LoadState, SectionTitle, SuggestionItem, useLegal, useLoad } from './shared';
import { HearingUpdate, LinkList, stageLabel } from './Matters';

function shift(iso, days) {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function Kpi({ icon: Icon, label, value, tone = 'slate', onClick }) {
  const tones = {
    slate: 'text-slate-900 dark:text-slate-100',
    blue: 'text-blue-700 dark:text-blue-300',
    amber: 'text-amber-700 dark:text-amber-300',
    red: 'text-red-700 dark:text-red-300',
  };
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={`text-left rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3.5 py-3 ${onClick ? 'hover:border-blue-400 transition' : ''}`}
    >
      <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
        <Icon className="w-3.5 h-3.5" />
        <span className="truncate">{label}</span>
      </div>
      <div className={`mt-1 text-2xl font-bold tabular-nums ${tones[tone]}`}>{value}</div>
    </Tag>
  );
}

Kpi.propTypes = { icon: PropTypes.elementType.isRequired, label: PropTypes.string.isRequired, value: PropTypes.node, tone: PropTypes.string, onClick: PropTypes.func };

function GettingStarted() {
  const { t, goTab, reloadAll, country } = useLegal();
  const [busy, setBusy] = useState(false);
  const loadSample = async () => {
    setBusy(true);
    try {
      await legalApi.loadSample(country);
      reloadAll();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };
  const steps = [
    { icon: Gavel, label: t('start_firm'), go: () => goTab('more') },
    { icon: Users, label: t('start_team'), go: () => goTab('more') },
    { icon: FileSpreadsheet, label: t('start_import'), go: () => goTab('more') },
    { icon: CalendarClock, label: t('start_reminders'), go: () => goTab('more') },
  ];
  return (
    <Card className="border-blue-200 dark:border-blue-900 bg-gradient-to-br from-blue-50 to-white dark:from-blue-950/40 dark:to-slate-900">
      <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{t('start_title')}</h2>
      <p className="text-sm text-slate-600 dark:text-slate-300 mb-4">{t('start_body')}</p>
      <ol className="grid sm:grid-cols-2 gap-2 mb-4">
        {steps.map(({ icon: Icon, label, go }, i) => (
          <li key={label}>
            <button type="button" onClick={go} className="w-full flex items-center gap-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2.5 text-left hover:border-blue-400">
              <span className="grid place-items-center w-7 h-7 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200 text-xs font-bold shrink-0">{i + 1}</span>
              <Icon className="w-4 h-4 text-slate-500 shrink-0" />
              <span className="text-sm font-medium text-slate-800 dark:text-slate-100">{label}</span>
            </button>
          </li>
        ))}
      </ol>
      <Btn variant="secondary" onClick={loadSample} disabled={busy}><Sparkles className="w-4 h-4" />{t('start_sample')}</Btn>
    </Card>
  );
}

function SampleBanner() {
  const { t, reloadAll } = useLegal();
  const remove = async () => {
    try {
      await legalApi.clearSample();
      reloadAll();
    } catch (e) {
      toast.error(e.message);
    }
  };
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 px-3 py-2 text-sm text-amber-900 dark:text-amber-200">
      <span>{t('sample_banner')}</span>
      <button type="button" onClick={remove} className="font-semibold underline underline-offset-2">{t('sample_remove')}</button>
    </div>
  );
}

function HearingCard({ row, onUpdate }) {
  const { t, profile, openMatter } = useLegal();
  const [showLinks, setShowLinks] = useState(false);
  const { matter: m, last_hearing: last, adjournment_likelihood: p, links } = row;
  return (
    <Card className="!p-0 overflow-hidden">
      <div className="flex">
        <div className={`w-1 shrink-0 ${p != null && p >= 0.6 ? 'bg-amber-400' : 'bg-blue-600'}`} />
        <div className="flex-1 min-w-0">
          <button type="button" onClick={() => openMatter(m.id)} className="w-full text-left px-4 pt-3 pb-2">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-[11px] font-semibold uppercase tracking-wide text-blue-700 dark:text-blue-400 truncate">
                  {m.court_name || '—'}{last?.item_no ? ` · ${t('item')} ${last.item_no}` : ''}
                </div>
                <div className="font-semibold text-slate-900 dark:text-slate-100 leading-snug">{m.title}</div>
                <div className="mt-0.5 text-xs text-slate-500 truncate">{[m.reference, stageLabel(profile, m.stage), m.lawyer_email].filter(Boolean).join(' · ')}</div>
              </div>
              {p != null ? (
                <div className="shrink-0 text-right">
                  <div className={`text-lg font-bold tabular-nums ${p >= 0.6 ? 'text-amber-600' : 'text-slate-700 dark:text-slate-200'}`}>{Math.round(p * 100)}%</div>
                  <div className="text-[10px] uppercase tracking-wide text-slate-400">{t('o_adjourned')}</div>
                </div>
              ) : null}
            </div>
            {last ? (
              <div className="mt-2 text-xs text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/60 rounded-md px-2 py-1.5">
                <span className="font-medium">{t('last_time')}:</span> {fmtDate(last.date)}{last.outcome ? ` · ${t(`o_${last.outcome}`)}` : ''}{last.purpose ? ` · ${last.purpose}` : ''}
              </div>
            ) : null}
          </button>
          <div className="flex flex-wrap items-center gap-2 px-4 pb-3">
            <Btn className="!py-2" onClick={() => onUpdate(m)}>{t('update_after_hearing')}</Btn>
            {m.client_phone ? (
              <a href={`tel:${m.client_phone}`} className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold bg-slate-100 dark:bg-slate-800">
                <Phone className="w-4 h-4" />{m.client || ''}
              </a>
            ) : null}
            <Btn variant="ghost" className="!py-2" onClick={() => setShowLinks(!showLinks)}>{t('court_links')}</Btn>
          </div>
          {showLinks ? <div className="px-4 pb-3"><LinkList links={links} /></div> : null}
        </div>
      </div>
    </Card>
  );
}

HearingCard.propTypes = { row: PropTypes.object.isRequired, onUpdate: PropTypes.func.isRequired };

export function TodayTab({ refreshKey, onChanged }) {
  const { t, country, openMatter, goTab, lang } = useLegal();
  const [day, setDay] = useState(isoToday());
  const [mine, setMine] = useState(false);
  const [updating, setUpdating] = useState(null);
  const [allSug, setAllSug] = useState(false);
  const board = useLoad(() => legalApi.today({ date: day, mine }), [day, mine, refreshKey]);
  const sug = useLoad(() => legalApi.suggestions(mine), [mine, refreshKey]);
  const ov = useLoad(() => legalApi.overview(mine), [mine, refreshKey]);
  const data = board.data;
  const o = ov.data;
  const suggestions = sug.data?.suggestions || [];
  const weekday = new Date(`${day}T00:00:00`).toLocaleDateString(lang === 'hi' ? 'hi-IN' : 'en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
  const isEmpty = o && o.open_matters === 0 && !o.has_sample;
  const reload = () => {
    board.reload();
    sug.reload();
    ov.reload();
    onChanged?.();
  };

  if (isEmpty) return <GettingStarted />;

  return (
    <div className="space-y-5">
      {o?.has_sample ? <SampleBanner /> : null}

      {o ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          <Kpi icon={Gavel} label={t('kpi_today')} value={o.hearings_today} tone="blue" onClick={() => setDay(isoToday())} />
          <Kpi icon={CalendarDays} label={t('kpi_week')} value={o.hearings_week} />
          <Kpi icon={AlertTriangle} label={t('kpi_update')} value={o.needs_update} tone={o.needs_update ? 'red' : 'slate'} />
          <Kpi icon={Clock} label={t('kpi_due')} value={o.due_week} tone={o.due_week ? 'amber' : 'slate'} onClick={() => goTab('tasks')} />
          <Kpi icon={CheckCircle2} label={t('kpi_overdue')} value={o.overdue_tasks} tone={o.overdue_tasks ? 'red' : 'slate'} onClick={() => goTab('tasks')} />
          <Kpi icon={country === 'GB' ? PoundSterling : IndianRupee} label={t('kpi_fees')} value={fmtMoney(o.fees_outstanding, country)} onClick={() => goTab('reports')} />
        </div>
      ) : null}

      <div className="grid lg:grid-cols-3 gap-5 items-start">
        <section className="lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between gap-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-2 py-2">
            <button type="button" onClick={() => setDay(shift(day, -1))} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800" aria-label="Previous day"><ChevronLeft className="w-5 h-5" /></button>
            <label className="text-center cursor-pointer">
              <div className="text-lg font-bold text-slate-900 dark:text-slate-100">{fmtDate(day)}</div>
              <div className="text-xs text-slate-500">{weekday}</div>
              <input type="date" value={day} onChange={(e) => e.target.value && setDay(e.target.value)} className="sr-only" />
            </label>
            <button type="button" onClick={() => setDay(shift(day, 1))} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800" aria-label="Next day"><ChevronRight className="w-5 h-5" /></button>
          </div>
          <div className="flex gap-2">
            <Chip active={day === isoToday()} onClick={() => setDay(isoToday())}>{t('tab_today')}</Chip>
            <Chip active={mine} onClick={() => setMine(!mine)}>{t('today_mine')}</Chip>
          </div>

          <SectionTitle>{t('today_title')} {data ? `(${data.hearings.length})` : ''}</SectionTitle>
          <LoadState state={board} t={t} />
          {data?.clashes?.map((c) => (
            <div key={c.lawyer_email} className="flex items-start gap-2 rounded-lg bg-red-50 dark:bg-red-950/40 text-red-800 dark:text-red-200 px-3 py-2 text-sm">
              <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" /> {t('today_clash')}: {c.lawyer_email}
            </div>
          ))}
          {data && !data.hearings.length ? (
            <Card className="text-center py-8">
              <CalendarDays className="w-8 h-8 mx-auto text-slate-300 mb-2" />
              <div className="font-medium text-slate-700 dark:text-slate-200">{t('hearings_none_title')}</div>
              {data.next_listed ? (
                <button type="button" onClick={() => setDay(data.next_listed)} className="mt-2 text-sm text-blue-700 dark:text-blue-400 hover:underline">
                  {t('next_listed', { d: fmtDate(data.next_listed) })} →
                </button>
              ) : null}
            </Card>
          ) : null}
          <div className="space-y-2">
            {data?.hearings.map((row) => <HearingCard key={row.matter.id} row={row} onUpdate={setUpdating} />)}
          </div>

          {data?.needs_update?.length ? (
            <div className="pt-2">
              <SectionTitle>{t('today_needs_update')}</SectionTitle>
              <ul className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 divide-y divide-slate-100 dark:divide-slate-800">
                {data.needs_update.map((m) => (
                  <li key={m.id} className="flex items-center justify-between gap-2 px-3 py-2.5">
                    <button type="button" className="min-w-0 text-left" onClick={() => openMatter(m.id)}>
                      <div className="text-sm font-medium truncate text-slate-900 dark:text-slate-100">{m.title}</div>
                      <div className="text-xs text-red-600">{fmtDate(m.next_hearing)} · {m.court_name}</div>
                    </button>
                    <Btn variant="secondary" className="!py-1.5 shrink-0" onClick={() => setUpdating(m)}>{t('update_after_hearing')}</Btn>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </section>

        <aside className="space-y-5">
          <div>
            <SectionTitle right={suggestions.length > 4 ? <button type="button" className="text-xs text-blue-700 dark:text-blue-400" onClick={() => setAllSug(!allSug)}>{allSug ? '−' : `${t('view_all')} (${suggestions.length})`}</button> : null}>
              {t('suggestions')}
            </SectionTitle>
            {sug.data && !suggestions.length ? <Empty>{t('suggestions_none')}</Empty> : null}
            <div className="space-y-2">
              {(allSug ? suggestions : suggestions.slice(0, 4)).map((s, i) => <SuggestionItem key={`${s.key}-${s.matter_id}-${i}`} s={s} onOpen={openMatter} />)}
            </div>
          </div>

          {data?.tasks_due?.length ? (
            <div>
              <SectionTitle right={<button type="button" className="text-xs text-blue-700 dark:text-blue-400" onClick={() => goTab('tasks')}>{t('view_all')}</button>}>{t('today_tasks_due')}</SectionTitle>
              <ul className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 divide-y divide-slate-100 dark:divide-slate-800 text-sm">
                {data.tasks_due.map((x) => (
                  <li key={x.id} className="px-3 py-2 flex justify-between gap-3">
                    <span className="min-w-0 truncate text-slate-800 dark:text-slate-200">{x.title}{x.kind === 'deadline' && !x.confirmed_by ? <span className="ml-1 text-xs text-amber-700">({t('not_confirmed')})</span> : null}</span>
                    <span className={`shrink-0 tabular-nums ${x.due_date < isoToday() ? 'text-red-600 font-semibold' : 'text-slate-500'}`}>{fmtDate(x.due_date)}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {data?.upcoming?.length ? (
            <div>
              <SectionTitle>{t('today_upcoming')}</SectionTitle>
              <ul className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 divide-y divide-slate-100 dark:divide-slate-800">
                {data.upcoming.map((m) => (
                  <li key={m.id}>
                    <button type="button" onClick={() => openMatter(m.id)} className="w-full flex justify-between gap-3 text-left text-sm px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-800/60">
                      <span className="min-w-0">
                        <span className="block truncate text-slate-800 dark:text-slate-200">{m.title}</span>
                        <span className="block truncate text-xs text-slate-500">{m.court_name}</span>
                      </span>
                      <span className="shrink-0 text-slate-600 dark:text-slate-300 tabular-nums">{fmtDate(m.next_hearing)}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </aside>
      </div>

      {updating ? <HearingUpdate open matter={updating} onClose={() => setUpdating(null)} onSaved={reload} /> : null}
    </div>
  );
}

TodayTab.propTypes = { refreshKey: PropTypes.number, onChanged: PropTypes.func };
