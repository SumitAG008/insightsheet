import { useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import { AlertCircle, AlertTriangle, CheckCircle2, Info, Wand2 } from 'lucide-react';
import { PICKLISTS } from '@/lib/migration/dictionaries';

const TYPE_LABEL = {
  ...Object.fromEntries(Object.entries(PICKLISTS).map(([k, v]) => [k, v.label])),
  reason: 'Termination reason → event reason code',
  paycomp: 'Pay component → pay component code',
  wagetype: 'Payroll balance / wage type → target wage type code',
  paymethod: 'Payment method → payment method code',
};
const fmtAmount = (v, unit) => (unit === 'money' ? v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : v.toLocaleString());

function Coverage({ coverage }) {
  if (!coverage) return null;
  const pct = coverage.total ? Math.round(((coverage.mapped + coverage.carried) / coverage.total) * 100) : 100;
  const ROLE = { 'history:payroll': 'Payroll results', employee: 'Worker data', 'history:job': 'Job history', 'history:comp': 'Pay history', 'history:onetime': 'One-time pay', 'history:ytd': 'Payroll balances', detail: 'Carried as-is', unused: 'Carried as-is' };
  return (
    <section className={card}>
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="m-0 text-[15px] font-semibold">Data coverage</h3>
        <span className={`rounded-full px-2 py-0.5 text-xs ${coverage.left ? 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300' : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'}`}>
          {coverage.left ? `${coverage.left} column${coverage.left > 1 ? 's' : ''} left behind` : 'Nothing left behind'}
        </span>
      </div>
      <p className="mt-1 text-sm text-slate-500">
        {coverage.total} source columns: <strong>{coverage.mapped}</strong> migrated into SuccessFactors files, <strong>{coverage.carried}</strong> carried in custom files (no standard target yet, e.g. dependents), <strong>{coverage.left}</strong> left behind — {pct}% accounted for.
      </p>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full text-sm">
          <tbody>
            {coverage.tabs.map((t) => (
              <tr key={t.id} className="border-b border-slate-100 dark:border-slate-800">
                <td className="py-1.5 pr-3 font-medium">{t.name}</td>
                <td className="py-1.5 pr-3 text-slate-500">{ROLE[t.role] || (t.role?.startsWith('org:') ? `${t.role.slice(4).replace('_', ' ')} list` : t.role)}</td>
                <td className="py-1.5 pr-3 text-right tabular-nums text-slate-500">{t.rows.toLocaleString()} rows</td>
                <td className="py-1.5 pr-3 text-right tabular-nums">{t.mapped} migrated</td>
                <td className="py-1.5 pr-3 text-right tabular-nums">{t.carried ? `${t.carried} carried` : ''}</td>
                <td className="py-1.5 text-amber-700 dark:text-amber-400">{t.left.length ? `left: ${t.left.join(', ')}` : ''}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
Coverage.propTypes = { coverage: PropTypes.object };

function Reconciliation({ rows }) {
  if (!rows.length) return null;
  const bad = rows.filter((r) => !r.ok).length;
  return (
    <section className={card}>
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="m-0 text-[15px] font-semibold">Reconciliation</h3>
        <span className={`rounded-full px-2 py-0.5 text-xs ${bad ? 'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300' : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'}`}>
          {bad ? `${bad} control total${bad > 1 ? 's' : ''} differ` : 'All control totals match'}
        </span>
      </div>
      <p className="mt-1 text-sm text-slate-500">The same totals summed from your source tabs and from the files produced. A difference means rows were dropped or merged on the way.</p>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-xs text-slate-500 dark:border-slate-700">
              <th className="py-1.5 pr-3 font-medium">Control</th>
              <th className="py-1.5 pr-3 text-right font-medium">Source</th>
              <th className="py-1.5 pr-3 text-right font-medium">Output</th>
              <th className="py-1.5 pr-3 text-right font-medium">Difference</th>
              <th className="py-1.5" />
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.label} className="border-b border-slate-100 dark:border-slate-800">
                <td className="py-1.5 pr-3">{r.label}</td>
                <td className="py-1.5 pr-3 text-right tabular-nums">{fmtAmount(r.source, r.unit)}</td>
                <td className="py-1.5 pr-3 text-right tabular-nums">{fmtAmount(r.target, r.unit)}</td>
                <td className={`py-1.5 pr-3 text-right tabular-nums ${r.ok ? 'text-slate-400' : 'font-semibold text-red-600'}`}>{fmtAmount(Math.round((r.target - r.source) * 100) / 100, r.unit)}</td>
                <td className="py-1.5">{r.ok ? <CheckCircle2 className="h-4 w-4 text-emerald-600" aria-label="Matches" /> : <AlertCircle className="h-4 w-4 text-red-600" aria-label="Differs" />}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
Reconciliation.propTypes = { rows: PropTypes.array.isRequired };
const SEV = {
  error: { icon: AlertCircle, cls: 'text-red-600', label: 'Errors' },
  warning: { icon: AlertTriangle, cls: 'text-amber-600', label: 'Warnings' },
  info: { icon: Info, cls: 'text-blue-600', label: 'Notes' },
};
const card = 'rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900';

export function Stat({ label, value, tone }) {
  return (
    <div className={card}>
      <div className="text-sm text-slate-500">{label}</div>
      <div className={`mt-1 text-2xl font-semibold tracking-tight ${tone || ''}`}>{value}</div>
    </div>
  );
}
Stat.propTypes = { label: PropTypes.string, value: PropTypes.node, tone: PropTypes.string };

function PicklistTable({ type, rows, onSet }) {
  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800">
      <div className="border-b border-slate-100 px-3 py-2 text-sm font-medium dark:border-slate-800">{TYPE_LABEL[type] || type}</div>
      <table className="w-full text-sm">
        <tbody>
          {rows.map((r) => (
            <tr key={r.key} className="border-b border-slate-50 last:border-0 dark:border-slate-800">
              <td className="px-3 py-1.5">{r.raw} <span className="text-xs text-slate-400">×{r.count}</span></td>
              <td className="px-3 py-1.5 text-slate-400">→</td>
              <td className="px-3 py-1.5">
                <input
                  key={r.code}
                  className={`w-28 rounded-md border px-2 py-0.5 font-mono text-xs dark:bg-slate-900 ${r.source === 'missing' ? 'border-red-400' : 'border-slate-200 dark:border-slate-700'}`}
                  defaultValue={r.code}
                  placeholder="code"
                  aria-label={`Code for ${r.raw}`}
                  onBlur={(e) => { if (e.target.value !== r.code) onSet(type, r.key, e.target.value.trim()); }}
                />
              </td>
              <td className="px-3 py-1.5 text-xs text-slate-400">{r.source === 'you' ? 'set by you' : r.source === 'missing' ? 'needs a code' : 'suggested'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
PicklistTable.propTypes = { type: PropTypes.string.isRequired, rows: PropTypes.array.isRequired, onSet: PropTypes.func.isRequired };

export default function ReviewStep({ result, picklistRows, onSetPicklist }) {
  const [sev, setSev] = useState('error');
  const fixes = result.data.changes.reduce((a, c) => a + c.count, 0);
  const shown = useMemo(() => result.issues.filter((i) => i.severity === sev), [result.issues, sev]);
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <Stat label="Employees" value={result.data.people.length.toLocaleString()} />
        <Stat label="Files to load" value={result.files.length} />
        <Stat label="Automatic fixes" value={fixes.toLocaleString()} tone="text-blue-700 dark:text-blue-400" />
        <Stat label="Errors" value={result.counts.error} tone={result.counts.error ? 'text-red-600' : 'text-emerald-600'} />
        <Stat label="Warnings" value={result.counts.warning} tone={result.counts.warning ? 'text-amber-600' : ''} />
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <section className={card}>
          <h3 className="m-0 flex items-center gap-2 text-[15px] font-semibold"><Wand2 className="h-4 w-4 text-blue-600" />What we fixed automatically</h3>
          {result.data.changes.length ? (
            <ul className="mt-3 space-y-2.5">
              {result.data.changes.map((c) => (
                <li key={c.rule} className="text-sm">
                  <span className="font-semibold tabular-nums">{c.count.toLocaleString()}×</span> {c.text}
                  {c.examples.length > 0 && <div className="mt-0.5 truncate font-mono text-xs text-slate-500">{c.examples.map(([a, b]) => `${a} → ${b}`).join('   ·   ')}</div>}
                </li>
              ))}
            </ul>
          ) : <p className="mt-2 text-sm text-slate-500">Nothing needed fixing.</p>}
        </section>

        <section className={card}>
          <h3 className="m-0 text-[15px] font-semibold">Pre-flight check</h3>
          <p className="mt-1 text-sm text-slate-500">Every record checked against the target’s rules before anything is loaded: required fields, references between files, dates and codes.</p>
          <div className="mt-3 flex gap-1.5" role="group" aria-label="Severity">
            {Object.entries(SEV).map(([k, s]) => (
              <button key={k} type="button" aria-pressed={sev === k} onClick={() => setSev(k)} className={`rounded-full border px-3 py-1 text-sm ${sev === k ? 'border-slate-900 bg-slate-900 text-white dark:border-slate-100 dark:bg-slate-100 dark:text-slate-900' : 'border-slate-200 text-slate-600 dark:border-slate-700'}`}>
                {s.label} ({result.counts[k]})
              </button>
            ))}
          </div>
          <div className="mt-3 max-h-80 overflow-auto">
            {!shown.length ? (
              <p className="flex items-center gap-2 text-sm text-emerald-700 dark:text-emerald-400"><CheckCircle2 className="h-4 w-4" />None.</p>
            ) : (
              <table className="w-full text-sm">
                <tbody>
                  {shown.slice(0, 300).map((i, n) => {
                    const Icon = SEV[i.severity].icon;
                    return (
                      <tr key={`${i.key}-${i.field}-${n}`} className="border-b border-slate-100 align-top dark:border-slate-800">
                        <td className="py-1.5 pr-2"><Icon className={`h-4 w-4 ${SEV[i.severity].cls}`} /></td>
                        <td className="whitespace-nowrap py-1.5 pr-3 font-mono text-xs">{i.key}</td>
                        <td className="py-1.5 pr-3 text-slate-500">{i.entity}{i.field ? ` · ${i.field}` : ''}</td>
                        <td className="py-1.5">{i.message}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </section>
      </div>

      <Reconciliation rows={result.reconciliation || []} />
      <Coverage coverage={result.coverage} />

      {Object.keys(picklistRows).length > 0 && (
        <section className={card}>
          <h3 className="m-0 text-[15px] font-semibold">Value translations</h3>
          <p className="mt-1 text-sm text-slate-500">Picklist codes are configured per SuccessFactors instance. Check the suggestions against yours and type over any code; fields marked in red need one.</p>
          <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {Object.entries(picklistRows).map(([type, rows]) => <PicklistTable key={type} type={type} rows={rows} onSet={onSetPicklist} />)}
          </div>
        </section>
      )}
    </div>
  );
}

ReviewStep.propTypes = {
  result: PropTypes.object.isRequired,
  picklistRows: PropTypes.object.isRequired,
  onSetPicklist: PropTypes.func.isRequired,
};
