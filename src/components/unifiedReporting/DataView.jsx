import PropTypes from 'prop-types';
import { Button } from '@/components/ui/button';
import { CATALOG, CONFORMED, DATA, GOLD, PENDING, SYSTEMS, VIEWS } from '@/lib/unifiedReporting/sampleData';

const Label = ({ children }) => <div className="mb-2.5 mt-7 text-xs font-medium uppercase tracking-wider text-slate-400">{children}</div>;
Label.propTypes = { children: PropTypes.node };

const card = 'rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900';

export default function DataView({ decisions, onUndo, onGoAsk }) {
  const pend = PENDING.filter((p) => !decisions[p.id]).length;
  return (
    <div>
      <h1 className="mt-8 text-2xl font-semibold tracking-tight">Your data</h1>
      <p className="mb-2 text-slate-500 dark:text-slate-400">
        Every system feeds one unified model. Business users ask questions; builders can see exactly how each view is put together. This preview runs on sample data.
      </p>

      <Label>Connected systems</Label>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {SYSTEMS.map((s) => (
          <div key={s.name} className={card}>
            <div className="flex items-center justify-between">
              <h3 className="m-0 text-[15px] font-semibold">{s.name}</h3>
              <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">Connected</span>
            </div>
            <p className="mt-1.5 text-sm text-slate-500">{s.holds}</p>
            <p className="mt-1 text-xs text-slate-500">{DATA[s.view].length.toLocaleString()} rows · feeds <code>meldra.{s.view}</code></p>
          </div>
        ))}
      </div>

      <Label>Shared dimensions</Label>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {CONFORMED.map((c) => (
          <div key={c.name} className={card}>
            <h3 className="m-0 text-[15px] font-semibold">{c.name}</h3>
            <p className="mt-1.5 text-sm text-slate-500">Joined on {c.key} across {c.systems.join(', ')}.</p>
          </div>
        ))}
      </div>
      <p className="mt-2 text-sm text-slate-500">Any measures can be combined when they share one of these. Each system is totalled first and then joined, so totals never inflate.</p>

      <Label>Customer matching</Label>
      <div className={card}>
        <p className="m-0 text-sm text-slate-600 dark:text-slate-300">
          {Object.keys(GOLD).length} companies with one Meldra ID each, matched across SAP S/4, Salesforce and Billing.
          {pend ? ` ${pend} possible match${pend > 1 ? 'es need' : ' needs'} a decision.` : ' All matches decided.'}
        </p>
        {pend > 0 && <Button variant="outline" size="sm" className="mt-3" onClick={onGoAsk}>Review on the Ask tab</Button>}
        {PENDING.filter((p) => decisions[p.id]).map((p) => (
          <p key={p.id} className="mt-2 text-sm">
            “{p.src}” ({p.sys}) {decisions[p.id] === 'yes' ? `is matched to ${p.golden}` : `is kept separate from ${p.golden}`}.{' '}
            <Button variant="link" size="sm" className="h-auto p-0" onClick={() => onUndo(p.id)}>Undo</Button>
          </p>
        ))}
      </div>

      <div className="mt-3 overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-slate-500 dark:border-slate-700">
              <th className="px-3 py-2 font-medium">View</th>
              <th className="px-3 py-2 font-medium">From</th>
              <th className="px-3 py-2 font-medium">Break down by</th>
              <th className="px-3 py-2 font-medium">Measures</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(VIEWS).map(([k, V]) => (
              <tr key={k} className="border-b border-slate-100 dark:border-slate-800">
                <td className="whitespace-nowrap px-3 py-2"><code>meldra.{k}</code></td>
                <td className="whitespace-nowrap px-3 py-2">{V.sys}</td>
                <td className="min-w-[200px] px-3 py-2">{V.dims.join(', ')}</td>
                <td className="whitespace-nowrap px-3 py-2">{V.measures.join(', ')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Label>Add a system</Label>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {CATALOG.map((c) => (
          <div key={c} className={card}>
            <div className="flex items-center justify-between">
              <h3 className="m-0 text-[15px] font-semibold">{c}</h3>
              <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs text-slate-500 dark:bg-slate-800">Planned</span>
            </div>
            <p className="mt-1.5 text-sm text-slate-500">Connect once, then ask about it like any other system.</p>
          </div>
        ))}
      </div>
    </div>
  );
}

DataView.propTypes = {
  decisions: PropTypes.object.isRequired,
  onUndo: PropTypes.func.isRequired,
  onGoAsk: PropTypes.func.isRequired,
};
