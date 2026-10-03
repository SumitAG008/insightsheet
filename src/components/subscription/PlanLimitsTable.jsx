import React, { useEffect, useState } from 'react';
import { meldraAi } from '@/api/meldraClient';
import { FALLBACK_LIMITS, HEADLINE_KEYS, PLAN_ORDER, PLAN_PRICES, formatLimit } from '@/lib/planLimits';

// Side-by-side plan comparison, read from the server's limits table so it always matches what is enforced.
export default function PlanLimitsTable({ currentPlan = null, keys = HEADLINE_KEYS }) {
  const [table, setTable] = useState(FALLBACK_LIMITS);

  useEffect(() => {
    let alive = true;
    meldraAi.plans
      .limits()
      .then((data) => {
        if (alive && data?.plans) setTable(data);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  const labels = table.keys || FALLBACK_LIMITS.keys;

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-slate-50 dark:bg-slate-800/60">
            <th className="text-left p-3 font-semibold text-slate-700 dark:text-slate-200 min-w-[180px]">&nbsp;</th>
            {PLAN_ORDER.map((p) => (
              <th
                key={p}
                className={`text-left p-3 min-w-[120px] ${currentPlan === p ? 'bg-blue-50 dark:bg-blue-950/40' : ''}`}
              >
                <div className="font-bold text-slate-900 dark:text-slate-100">
                  {table.plans?.[p]?.name || p}
                  {currentPlan === p && <span className="ml-2 text-xs font-medium text-blue-600 dark:text-blue-400">Your plan</span>}
                </div>
                <div className="text-slate-700 dark:text-slate-300 font-medium">
                  {PLAN_PRICES[p].inr} / {PLAN_PRICES[p].gbp}
                </div>
                {PLAN_PRICES[p].unit && <div className="text-xs text-slate-500 dark:text-slate-400">{PLAN_PRICES[p].unit}</div>}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {keys.map((key) => (
            <tr key={key} className="border-t border-slate-200 dark:border-slate-700">
              <td className="p-3 text-slate-700 dark:text-slate-300">{labels[key] || key}</td>
              {PLAN_ORDER.map((p) => (
                <td
                  key={p}
                  className={`p-3 text-slate-900 dark:text-slate-100 ${currentPlan === p ? 'bg-blue-50/60 dark:bg-blue-950/30' : ''}`}
                >
                  {p === 'business' && key !== 'concurrent_jobs' ? (
                    <span>
                      {formatLimit(table.plans?.[p]?.limits?.[key], key)}
                      <span className="text-xs text-slate-500 dark:text-slate-400"> or as agreed</span>
                    </span>
                  ) : (
                    formatLimit(table.plans?.[p]?.limits?.[key], key)
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
