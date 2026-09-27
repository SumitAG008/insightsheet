import { useState } from 'react';
import PropTypes from 'prop-types';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronRight, Loader2, Sparkles } from 'lucide-react';
import { CONCEPTS } from '@/lib/migration/concepts';

const GROUPS = [...new Set(CONCEPTS.map((c) => c.group))];
const ROLE_TEXT = {
  employee: 'Worker data (one row per employee)',
  'history:job': 'Job history (several rows per employee)',
  'history:comp': 'Pay history (several rows per employee)',
  'history:onetime': 'One-time payments (bonuses, awards)',
  'history:ytd': 'Payroll year-to-date balances',
  'org:cost_center': 'Cost center list',
  'org:company': 'Legal entity list',
  'org:department': 'Department list',
  'org:location': 'Location list',
  'org:job': 'Job list',
  'org:business_unit': 'Business unit list',
  'org:division': 'Division list',
  unused: 'Not used — no employee ID or org code mapped',
};

function Badge({ m }) {
  if (!m?.concept) return <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500 dark:bg-slate-800">Not used</span>;
  if (m.method === 'you') return <span className="rounded-full bg-violet-50 px-2 py-0.5 text-xs text-violet-700 dark:bg-violet-950 dark:text-violet-300">Set by you</span>;
  const pct = Math.round((m.confidence ?? 0) * 100);
  const tone = pct >= 85 ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300';
  return <span className={`rounded-full px-2 py-0.5 text-xs ${tone}`}>{m.method === 'ai' ? 'AI' : 'Auto'} · {pct}%</span>;
}
Badge.propTypes = { m: PropTypes.object };

function samples(sheet, key) {
  const seen = [];
  for (const r of sheet.rows) {
    const v = r[key];
    if (v !== null && v !== undefined && String(v).trim() !== '' && !seen.includes(String(v))) seen.push(String(v));
    if (seen.length >= 3) break;
  }
  return seen;
}

function SheetCard({ sheet, m, role, onChange }) {
  const [open, setOpen] = useState(true);
  const mapped = sheet.columns.filter((c) => m[c.key]?.concept).length;
  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <button type="button" onClick={() => setOpen(!open)} className="flex w-full items-center gap-3 px-4 py-3 text-left" aria-expanded={open}>
        {open ? <ChevronDown className="h-4 w-4 text-slate-400" /> : <ChevronRight className="h-4 w-4 text-slate-400" />}
        <span className="font-semibold">{sheet.name}</span>
        <span className="text-sm text-slate-500">{ROLE_TEXT[role] || role}</span>
        <span className="ml-auto text-sm text-slate-500">{mapped}/{sheet.columns.length} columns mapped · {sheet.rows.length.toLocaleString()} rows</span>
      </button>
      {open && (
        <div className="overflow-x-auto border-t border-slate-100 dark:border-slate-800">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="text-left text-xs text-slate-500">
                <th className="px-4 py-2 font-medium">Source column</th>
                <th className="px-4 py-2 font-medium">Sample values</th>
                <th className="px-4 py-2 font-medium">Maps to</th>
                <th className="px-4 py-2 font-medium" />
              </tr>
            </thead>
            <tbody>
              {sheet.columns.map((c) => (
                <tr key={c.key} className="border-t border-slate-100 dark:border-slate-800">
                  <td className="whitespace-nowrap px-4 py-2 font-mono text-xs">{c.name}</td>
                  <td className="max-w-[280px] truncate px-4 py-2 text-slate-500" title={samples(sheet, c.key).join(' · ')}>{samples(sheet, c.key).join(' · ') || '—'}</td>
                  <td className="px-4 py-2">
                    <select
                      className="w-56 rounded-md border border-slate-200 bg-white px-2 py-1 text-sm dark:border-slate-700 dark:bg-slate-900"
                      value={m[c.key]?.concept || ''}
                      aria-label={`Field for ${c.name}`}
                      onChange={(e) => onChange(c.key, e.target.value)}
                    >
                      <option value="">— Not used —</option>
                      {GROUPS.map((g) => (
                        <optgroup key={g} label={g}>
                          {CONCEPTS.filter((x) => x.group === g).map((x) => <option key={x.id} value={x.id}>{x.label}</option>)}
                        </optgroup>
                      ))}
                    </select>
                  </td>
                  <td className="whitespace-nowrap px-4 py-2"><Badge m={m[c.key]} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
SheetCard.propTypes = { sheet: PropTypes.object.isRequired, m: PropTypes.object.isRequired, role: PropTypes.string, onChange: PropTypes.func.isRequired };

export default function MappingStep({ sheets, mapping, roles, onChange, onAi, aiBusy }) {
  const total = sheets.reduce((a, s) => a + s.columns.length, 0);
  const mapped = sheets.reduce((a, s) => a + s.columns.filter((c) => mapping[s.id]?.[c.key]?.concept).length, 0);
  const low = sheets.reduce((a, s) => a + s.columns.filter((c) => { const m = mapping[s.id]?.[c.key]; return m?.concept && m.method !== 'you' && m.confidence < 0.85; }).length, 0);
  const idSheets = sheets.filter((s) => Object.values(mapping[s.id] || {}).some((m) => m?.concept === 'employee_id')).length;
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex-1 text-sm">
          <strong>{mapped} of {total}</strong> columns mapped across {sheets.length} tabs. {idSheets} tabs are joined on the employee ID.
          {low > 0 && <span className="text-amber-700 dark:text-amber-400"> {low} lower-confidence matches are worth a look.</span>}
          <p className="mt-1 text-slate-500">Matching uses column names, synonyms and the shape of the values. Change any row; your choices win.</p>
        </div>
        <Button variant="outline" onClick={onAi} disabled={aiBusy}>
          {aiBusy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
          Refine with AI
        </Button>
      </div>
      <p className="text-xs text-slate-500">“Refine with AI” sends only tab and column names — never employee values.</p>
      {sheets.map((s) => (
        <SheetCard key={s.id} sheet={s} m={mapping[s.id] || {}} role={roles[s.id]} onChange={(col, concept) => onChange(s.id, col, concept)} />
      ))}
    </div>
  );
}

MappingStep.propTypes = {
  sheets: PropTypes.array.isRequired,
  mapping: PropTypes.object.isRequired,
  roles: PropTypes.object.isRequired,
  onChange: PropTypes.func.isRequired,
  onAi: PropTypes.func.isRequired,
  aiBusy: PropTypes.bool,
};

