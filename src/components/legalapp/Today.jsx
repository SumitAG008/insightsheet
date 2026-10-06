// Today: the day's hearings by court, with the chance of adjournment, clashes, suggestions,
// matters waiting for an update and what is due soon. The screen lawyers open on the phone each morning.
import { useState } from 'react';
import PropTypes from 'prop-types';
import { AlertTriangle, ChevronLeft, ChevronRight, Phone } from 'lucide-react';
import { legalApi } from '@/lib/legal/api';
import { fmtDate, isoToday } from '@/lib/legal/format';
import { Btn, Card, Chip, Empty, LoadState, SectionTitle, SuggestionItem, useLegal, useLoad } from './shared';
import { HearingUpdate, LinkList, stageLabel } from './Matters';

function shift(iso, days) {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function TodayTab({ refreshKey, onChanged }) {
  const { t, profile, openMatter, lang } = useLegal();
  const [day, setDay] = useState(isoToday());
  const [mine, setMine] = useState(false);
  const [updating, setUpdating] = useState(null);
  const [allSug, setAllSug] = useState(false);
  const [openLinks, setOpenLinks] = useState(null);
  const board = useLoad(() => legalApi.today({ date: day, mine }), [day, mine, refreshKey]);
  const sug = useLoad(() => legalApi.suggestions(mine), [mine, refreshKey]);
  const data = board.data;
  const suggestions = sug.data?.suggestions || [];
  const weekday = new Date(`${day}T00:00:00`).toLocaleDateString(lang === 'hi' ? 'hi-IN' : 'en-GB', { weekday: 'long' });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-2">
        <button type="button" onClick={() => setDay(shift(day, -1))} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800" aria-label="Previous day"><ChevronLeft className="w-5 h-5" /></button>
        <label className="text-center">
          <div className="text-lg font-bold text-slate-900 dark:text-slate-100">{fmtDate(day)}</div>
          <div className="text-xs text-slate-500">{weekday}</div>
          <input type="date" value={day} onChange={(e) => e.target.value && setDay(e.target.value)} className="sr-only" />
        </label>
        <button type="button" onClick={() => setDay(shift(day, 1))} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800" aria-label="Next day"><ChevronRight className="w-5 h-5" /></button>
      </div>
      <div className="flex gap-2 justify-center">
        <Chip active={day === isoToday()} onClick={() => setDay(isoToday())}>{t('tab_today')}</Chip>
        <Chip active={mine} onClick={() => setMine(!mine)}>{t('today_mine')}</Chip>
      </div>

      {suggestions.length ? (
        <div>
          <SectionTitle right={suggestions.length > 3 ? <button type="button" className="text-xs text-blue-700 dark:text-blue-400" onClick={() => setAllSug(!allSug)}>{allSug ? '−' : `+${suggestions.length - 3}`}</button> : null}>
            {t('suggestions')}
          </SectionTitle>
          <div className="space-y-2">
            {(allSug ? suggestions : suggestions.slice(0, 3)).map((s, i) => <SuggestionItem key={`${s.key}-${s.matter_id}-${i}`} s={s} onOpen={openMatter} />)}
          </div>
        </div>
      ) : null}

      <div>
        <SectionTitle>{t('today_title')} {data ? `(${data.hearings.length})` : ''}</SectionTitle>
        <LoadState state={board} t={t} />
        {data?.clashes?.map((c) => (
          <div key={c.lawyer_email} className="mb-2 flex items-start gap-2 rounded-lg bg-red-50 dark:bg-red-950/40 text-red-800 dark:text-red-200 px-3 py-2 text-sm">
            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" /> {t('today_clash')}: {c.lawyer_email}
          </div>
        ))}
        {data && !data.hearings.length ? <Empty>{t('today_none')}</Empty> : null}
        <div className="space-y-2">
          {data?.hearings.map(({ matter: m, last_hearing: last, adjournment_likelihood: p, links }) => (
            <Card key={m.id} className="!p-0 overflow-hidden">
              <button type="button" onClick={() => openMatter(m.id)} className="w-full text-left px-4 pt-3 pb-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-xs font-semibold uppercase tracking-wide text-blue-700 dark:text-blue-400 truncate">{m.court_name || '—'}{last?.item_no ? ` · ${t('item')} ${last.item_no}` : ''}</div>
                    <div className="font-semibold text-slate-900 dark:text-slate-100">{m.title}</div>
                    <div className="text-xs text-slate-500">{[m.reference, stageLabel(profile, m.stage), m.lawyer_email].filter(Boolean).join(' · ')}</div>
                  </div>
                  {p != null ? (
                    <span className={`shrink-0 text-xs font-semibold px-2 py-1 rounded-full ${p >= 0.6 ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200' : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200'}`} title={t('likely_adjourned', { p: Math.round(p * 100) })}>
                      {Math.round(p * 100)}%
                    </span>
                  ) : null}
                </div>
                {last ? <div className="mt-1 text-xs text-slate-500">{t('last_time')}: {fmtDate(last.date)}{last.outcome ? ` · ${t(`o_${last.outcome}`)}` : ''}{last.purpose ? ` · ${last.purpose}` : ''}</div> : null}
              </button>
              <div className="flex flex-wrap gap-2 px-4 pb-3">
                <Btn className="!py-2" onClick={() => setUpdating(m)}>{t('update_after_hearing')}</Btn>
                {m.client_phone ? <a href={`tel:${m.client_phone}`} className="inline-flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-semibold bg-slate-100 dark:bg-slate-800"><Phone className="w-4 h-4" />{m.client || ''}</a> : null}
                <Btn variant="ghost" className="!py-2" onClick={() => setOpenLinks(openLinks === m.id ? null : m.id)}>{t('court_links')}</Btn>
              </div>
              {openLinks === m.id ? <div className="px-4 pb-3"><LinkList links={links} /></div> : null}
            </Card>
          ))}
        </div>
      </div>

      {data?.needs_update?.length ? (
        <div>
          <SectionTitle>{t('today_needs_update')}</SectionTitle>
          <ul className="space-y-2">
            {data.needs_update.map((m) => (
              <li key={m.id} className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 dark:border-slate-800 px-3 py-2 bg-white dark:bg-slate-900">
                <button type="button" className="min-w-0 text-left" onClick={() => openMatter(m.id)}>
                  <div className="text-sm font-medium truncate text-slate-900 dark:text-slate-100">{m.title}</div>
                  <div className="text-xs text-red-600">{fmtDate(m.next_hearing)} · {m.court_name}</div>
                </button>
                <Btn variant="secondary" className="!py-1.5 shrink-0" onClick={() => setUpdating(m)}>{t('edit')}</Btn>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {data?.tasks_due?.length ? (
        <div>
          <SectionTitle>{t('today_tasks_due')}</SectionTitle>
          <ul className="space-y-1 text-sm">
            {data.tasks_due.map((x) => (
              <li key={x.id} className={x.due_date < isoToday() ? 'text-red-600' : 'text-slate-700 dark:text-slate-200'}>
                {fmtDate(x.due_date)} · {x.title}{x.kind === 'deadline' && !x.confirmed_by ? ` (${t('not_confirmed')})` : ''}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {data?.upcoming?.length ? (
        <div>
          <SectionTitle>{t('today_upcoming')}</SectionTitle>
          <ul className="space-y-1">
            {data.upcoming.map((m) => (
              <li key={m.id}>
                <button type="button" onClick={() => openMatter(m.id)} className="w-full flex justify-between gap-3 text-left text-sm py-1">
                  <span className="truncate text-slate-800 dark:text-slate-200">{m.title}</span>
                  <span className="shrink-0 text-slate-500">{fmtDate(m.next_hearing)}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {updating ? <HearingUpdate open matter={updating} onClose={() => setUpdating(null)} onSaved={() => { board.reload(); sug.reload(); onChanged?.(); }} /> : null}
    </div>
  );
}

TodayTab.propTypes = { refreshKey: PropTypes.number, onChanged: PropTypes.func };
