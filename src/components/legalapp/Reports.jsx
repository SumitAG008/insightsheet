// Reports: cases by court and stage, adjournments, ageing, workload per lawyer, fees billed against received.
import PropTypes from 'prop-types';
import { legalApi } from '@/lib/legal/api';
import { fmtMoney } from '@/lib/legal/format';
import { Card, Empty, LoadState, SectionTitle, useLegal, useLoad } from './shared';
import { stageLabel } from './Matters';

function Bars({ rows, label = (r) => r.label }) {
  const max = Math.max(1, ...rows.map((r) => r.count));
  if (!rows.length) return <Empty>—</Empty>;
  return (
    <ul className="space-y-1.5">
      {rows.map((r) => (
        <li key={r.label} className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 items-center text-sm">
          <div className="min-w-0">
            <div className="truncate text-slate-700 dark:text-slate-200">{label(r)}</div>
            <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
              <div className="h-full rounded-full bg-blue-600" style={{ width: `${(r.count / max) * 100}%` }} />
            </div>
          </div>
          <span className="font-semibold tabular-nums text-slate-900 dark:text-slate-100">{r.count}</span>
        </li>
      ))}
    </ul>
  );
}

Bars.propTypes = { rows: PropTypes.array.isRequired, label: PropTypes.func };

function Tile({ label, value, tone = 'text-slate-900 dark:text-slate-100' }) {
  return (
    <Card className="!p-3">
      <div className="text-xs text-slate-500">{label}</div>
      <div className={`text-2xl font-bold tabular-nums ${tone}`}>{value}</div>
    </Card>
  );
}

Tile.propTypes = { label: PropTypes.string, value: PropTypes.node, tone: PropTypes.string };

export function ReportsTab({ refreshKey }) {
  const { t, profile, country, openMatter } = useLegal();
  const state = useLoad(() => legalApi.reports(), [refreshKey]);
  const r = state.data;
  return (
    <div className="space-y-5">
      <LoadState state={state} t={t} />
      {r ? (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <Tile label={t('r_open')} value={r.totals.open} />
            <Tile label={t('r_disposed')} value={r.totals.disposed} />
            <Tile label={t('r_adjournments')} value={r.totals.adjournments} tone="text-amber-700 dark:text-amber-300" />
            <Tile label={t('r_outstanding')} value={fmtMoney(r.fees.outstanding, country)} tone="text-red-700 dark:text-red-300" />
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <Card><SectionTitle>{t('r_by_court')}</SectionTitle><Bars rows={r.by_court} /></Card>
            <Card><SectionTitle>{t('r_by_stage')}</SectionTitle><Bars rows={r.by_stage} label={(x) => stageLabel(profile, x.label) || '—'} /></Card>
            <Card><SectionTitle>{t('r_adj_court')}</SectionTitle><Bars rows={r.adjournments_by_court} /></Card>
            <Card><SectionTitle>{t('r_ageing')}</SectionTitle><Bars rows={r.ageing_buckets} /></Card>
          </div>
          <Card>
            <SectionTitle>{t('r_fees')}</SectionTitle>
            <div className="flex flex-wrap gap-6 text-sm mb-3">
              <span>{t('r_billed')}: <b>{fmtMoney(r.fees.billed, country)}</b></span>
              <span>{t('r_collected')}: <b>{fmtMoney(r.fees.collected, country)}</b></span>
              {r.fees.collection_rate != null ? <span>{Math.round(r.fees.collection_rate * 100)}%</span> : null}
            </div>
            <div className="h-3 rounded-full bg-red-100 dark:bg-red-950 overflow-hidden mb-3">
              <div className="h-full bg-emerald-600" style={{ width: `${Math.round((r.fees.collection_rate || 0) * 100)}%` }} />
            </div>
            <ul className="text-sm space-y-1">
              {r.fees.top_outstanding.map((x) => (
                <li key={x.id} className="flex justify-between gap-3">
                  <button type="button" className="truncate text-left text-blue-700 dark:text-blue-400" onClick={() => openMatter(x.id)}>{x.client || x.title}</button>
                  <span className="tabular-nums shrink-0">{fmtMoney(x.outstanding, country)}</span>
                </li>
              ))}
            </ul>
          </Card>
          <Card>
            <SectionTitle>{t('r_workload')}</SectionTitle>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="text-left text-xs text-slate-500"><th className="py-1 pr-3">{t('f_lawyer')}</th><th className="py-1 pr-3 text-right">{t('r_open')}</th><th className="py-1 pr-3 text-right">{t('r_hearings_30')}</th><th className="py-1 text-right">{t('r_open_tasks')}</th></tr></thead>
                <tbody>
                  {r.workload.map((w) => (
                    <tr key={w.lawyer} className="border-t border-slate-100 dark:border-slate-800">
                      <td className="py-1.5 pr-3 truncate max-w-[12rem]">{w.lawyer}</td>
                      <td className="py-1.5 pr-3 text-right tabular-nums">{w.open_matters}</td>
                      <td className="py-1.5 pr-3 text-right tabular-nums">{w.hearings_next_30_days}</td>
                      <td className="py-1.5 text-right tabular-nums">{w.open_tasks}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
          {r.ageing_cases.length ? (
            <Card>
              <SectionTitle>{t('r_ageing_list')}</SectionTitle>
              <ul className="text-sm space-y-1">
                {r.ageing_cases.map((a) => (
                  <li key={a.id} className="flex justify-between gap-3">
                    <button type="button" className="truncate text-left text-blue-700 dark:text-blue-400" onClick={() => openMatter(a.id)}>{a.title}</button>
                    <span className="shrink-0 tabular-nums">{a.years}y</span>
                  </li>
                ))}
              </ul>
            </Card>
          ) : null}
        </>
      ) : null}
    </div>
  );
}

ReportsTab.propTypes = { refreshKey: PropTypes.number };
