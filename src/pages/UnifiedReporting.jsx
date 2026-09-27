import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { backendApi } from '@/api/backendClient';
import AnswerCard from '@/components/unifiedReporting/AnswerCard';
import BoardView from '@/components/unifiedReporting/BoardView';
import DataView from '@/components/unifiedReporting/DataView';
import {
  PERSONAS, buildCatalog, columnsOf, compute, fallbackFollowups, fallbackInsight, heuristic, presetFor, sanitize,
} from '@/lib/unifiedReporting/engine';
import { PENDING, SYSTEMS } from '@/lib/unifiedReporting/sampleData';

const STORE_KEY = 'meldra-unified-reporting-v1';
const uid = () => Math.random().toString(36).slice(2, 9);

function loadState() {
  const base = { decisions: {}, thread: [], board: [], builder: false, persona: 'Finance' };
  try {
    const d = JSON.parse(localStorage.getItem(STORE_KEY) || 'null');
    if (d && typeof d === 'object') {
      return { ...base, ...d, thread: (d.thread || []).filter((x) => x && x.spec).map((x) => ({ ...x, status: 'done' })) };
    }
  } catch {
    /* storage unavailable: start fresh */
  }
  return base;
}

function saveState(s) {
  try {
    const thread = s.thread.filter((x) => x.status === 'done').slice(-30).map(({ id, q, spec, insight, used }) => ({ id, q, spec, insight, used }));
    localStorage.setItem(STORE_KEY, JSON.stringify({ ...s, thread }));
  } catch {
    /* storage unavailable: keep in memory only */
  }
}

const TABS = [['ask', 'Ask'], ['board', 'Board'], ['data', 'Data']];

export default function UnifiedReporting() {
  const [state, setState] = useState(loadState);
  const [view, setView] = useState('ask');
  const [draft, setDraft] = useState('');
  const [toastMsg, setToastMsg] = useState('');
  const stateRef = useRef(state);
  const inputRef = useRef(null);
  const toastTimer = useRef(null);

  useEffect(() => {
    stateRef.current = state;
    saveState(state);
  }, [state]);
  useEffect(() => () => clearTimeout(toastTimer.current), []);

  const toast = useCallback((m) => {
    setToastMsg(m);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastMsg(''), 3400);
  }, []);

  const patchItem = (id, patch) => setState((s) => ({ ...s, thread: s.thread.map((x) => (x.id === id ? { ...x, ...patch } : x)) }));

  const writeInsight = useCallback(async (id, q, spec) => {
    const res = compute(spec, stateRef.current.decisions);
    if (!res.labels.length) {
      patchItem(id, { insight: fallbackInsight(spec, res) });
      return;
    }
    const cols = columnsOf(res);
    const rows = res.labels.slice(0, 25).map((l, i) => [l, ...cols.map((c) => (c.data[i] === null ? null : Math.round(c.data[i] * 100) / 100))]);
    const pend = PENDING.filter((p) => stateRef.current.decisions[p.id] !== 'yes' && res.labels.includes(p.src));
    const notes = pend.length
      ? pend.map((p) => `"${p.src}" in ${p.sys} may be ${p.golden} but is waiting for a match decision, so it appears separately`).join('; ')
      : null;
    try {
      const out = await backendApi.unifiedReporting.insight({
        question: q,
        columns: [spec.groupBy || 'total', ...cols.map((c) => `${c.label} (${c.unit}${c.sys ? `, from ${c.sys}` : ', derived'})`)],
        rows,
        notes,
      });
      patchItem(id, { insight: out?.text || fallbackInsight(spec, res) });
    } catch {
      patchItem(id, { insight: fallbackInsight(spec, res) });
    }
  }, []);

  const ask = useCallback(async (raw) => {
    const q = String(raw || '').trim();
    if (!q) return;
    setView('ask');
    const prev = [...stateRef.current.thread].reverse().find((x) => x.status === 'done')?.q;
    const id = uid();
    setState((s) => ({ ...s, thread: [...s.thread, { id, q, status: 'thinking', stage: 'Working out which systems to read…' }] }));
    requestAnimationFrame(() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' }));

    let spec = presetFor(q);
    let used = 'rules';
    if (!spec) {
      try {
        const out = await backendApi.unifiedReporting.plan({ question: q, previousQuestion: prev, catalog: buildCatalog() });
        spec = sanitize(out?.spec);
        used = 'ai';
      } catch {
        spec = null;
      }
    }
    if (!spec) {
      try {
        spec = heuristic(q);
        used = 'rules';
      } catch {
        patchItem(id, { status: 'error', err: 'That question could not be read. Try naming what you want to see and how to break it down, like “invoices by customer”.' });
        return;
      }
    }
    if (spec.cannot) {
      patchItem(id, { status: 'cannot', err: spec.cannot, used });
      return;
    }
    if (spec.clarify) {
      patchItem(id, { status: 'clarify', clarify: spec.clarify, options: spec.options, used });
      return;
    }
    if (!spec.followups.length) spec.followups = fallbackFollowups(spec);
    patchItem(id, { status: 'done', spec, used, insight: '' });
    requestAnimationFrame(() => document.getElementById(`qa-${id}`)?.scrollIntoView({ block: 'start', behavior: 'smooth' }));
    await writeInsight(id, q, spec);
  }, [writeInsight]);

  const decide = (p, v) => {
    setState((s) => ({ ...s, decisions: { ...s.decisions, [p.id]: v } }));
    toast(v === 'yes' ? `${p.src} now counts toward ${p.golden} in every answer.` : `${p.src} stays a separate company.`);
  };

  const pin = (id) => {
    const it = state.thread.find((x) => x.id === id);
    if (!it || state.board.some((b) => b.id === id)) return;
    setState((s) => ({ ...s, board: [...s.board, { id, spec: JSON.parse(JSON.stringify(it.spec)) }] }));
    toast('Pinned to your board');
  };

  const showTable = (id) => patchItem(id, { spec: { ...state.thread.find((x) => x.id === id).spec, chart: 'table' } });

  const runSpec = async (id, json) => {
    const it = state.thread.find((x) => x.id === id);
    const sp = sanitize(json);
    if (sp.cannot || sp.clarify) throw new Error('not a report spec');
    sp.followups = it.spec.followups;
    patchItem(id, { spec: sp, used: 'edited', insight: '' });
    await writeInsight(id, it.q, sp);
  };

  const download = (id) => {
    const it = state.thread.find((x) => x.id === id);
    const res = compute(it.spec, state.decisions);
    const cols = columnsOf(res);
    const cell = (v) => {
      const s = String(v ?? '');
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const csv = [
      [it.spec.groupBy || 'total', ...cols.map((c) => c.label)].map(cell).join(','),
      ...res.labels.map((l, i) => [l, ...cols.map((c) => (c.data[i] === null ? '' : Math.round(c.data[i] * 100) / 100))].map(cell).join(',')),
    ].join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `${it.spec.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'report'}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const submit = (e) => {
    e.preventDefault();
    const v = draft;
    setDraft('');
    ask(v);
  };

  const autosize = (el) => {
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(160, el.scrollHeight)}px`;
  };
  useEffect(() => autosize(inputRef.current), [draft]);

  const empty = !state.thread.length;
  const pending = PENDING.filter((p) => !state.decisions[p.id]);

  return (
    <div className="relative min-h-[calc(100vh-4rem)]">
      {/* Section bar */}
      <div className="sticky top-16 z-10 border-b border-slate-200 bg-slate-50/95 backdrop-blur dark:border-slate-800 dark:bg-slate-950/95">
        <div className="mx-auto flex h-14 max-w-4xl items-center gap-3 px-4">
          <span className="mr-auto font-semibold tracking-tight">Unified Reporting</span>
          <nav className="flex gap-0.5" aria-label="Unified Reporting sections">
            {TABS.map(([k, label]) => (
              <button
                key={k}
                type="button"
                onClick={() => { setView(k); window.scrollTo(0, 0); }}
                aria-current={view === k ? 'page' : undefined}
                className={`rounded-lg px-3 py-2 text-sm font-medium ${view === k ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:text-slate-100 dark:ring-slate-700' : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-100'}`}
              >
                {label}
              </button>
            ))}
          </nav>
          <label className="flex cursor-pointer items-center gap-2 whitespace-nowrap text-sm text-slate-500" title="Show how every answer is built">
            <Switch checked={state.builder} onCheckedChange={(v) => setState((s) => ({ ...s, builder: v }))} />
            <span className="hidden sm:inline">Builder view</span>
          </label>
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-4 pb-10">
        {view === 'board' && (
          <BoardView board={state.board} decisions={state.decisions} onUnpin={(id) => setState((s) => ({ ...s, board: s.board.filter((b) => b.id !== id) }))} onGoAsk={() => setView('ask')} />
        )}
        {view === 'data' && (
          <DataView
            decisions={state.decisions}
            onUndo={(id) => setState((s) => { const d = { ...s.decisions }; delete d[id]; return { ...s, decisions: d }; })}
            onGoAsk={() => setView('ask')}
          />
        )}

        {view === 'ask' && (
          <>
            {empty && (
              <section className="pb-2 pt-10">
                <h1 className="m-0 text-3xl font-semibold leading-tight tracking-tight">Ask anything about your business.</h1>
                <p className="mt-2.5 max-w-[60ch] text-slate-500 dark:text-slate-400">
                  Meldra reads across all your connected systems and answers in plain words, with a chart and the sources behind every number.
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {SYSTEMS.map((s) => (
                    <span key={s.name} className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1 text-sm dark:border-slate-700 dark:bg-slate-900">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" aria-hidden="true" />{s.name}
                    </span>
                  ))}
                  <button type="button" onClick={() => setView('data')} className="rounded-full border border-dashed border-slate-300 px-3 py-1 text-sm text-slate-500 dark:border-slate-600">+ Add a system</button>
                </div>
              </section>
            )}

            {pending.length > 0 && (
              <>
                <div className="mb-2.5 mt-7 text-xs font-medium uppercase tracking-wider text-slate-400">Needs your decision</div>
                {pending.map((p) => (
                  <div key={p.id} className="mt-2 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
                    <h3 className="m-0 text-[15px] font-semibold">Is “{p.src}” in {p.sys} the same company as {p.golden}?</h3>
                    <p className="mb-3 mt-1.5 text-sm text-slate-500">{p.evidence} Until you decide, its {p.what} are reported separately.</p>
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" onClick={() => decide(p, 'yes')}>Yes, same company</Button>
                      <Button size="sm" variant="outline" onClick={() => decide(p, 'no')}>No, keep separate</Button>
                    </div>
                  </div>
                ))}
              </>
            )}

            {empty && (
              <>
                <div className="mb-2.5 mt-7 text-xs font-medium uppercase tracking-wider text-slate-400">Try asking</div>
                <div className="mb-2.5 flex flex-wrap gap-1.5" role="group" aria-label="Question ideas for">
                  {Object.keys(PERSONAS).map((p) => (
                    <button
                      key={p}
                      type="button"
                      aria-pressed={state.persona === p}
                      onClick={() => setState((s) => ({ ...s, persona: p }))}
                      className={`rounded-full border px-3 py-1 text-sm ${state.persona === p ? 'border-slate-900 bg-slate-900 text-white dark:border-slate-100 dark:bg-slate-100 dark:text-slate-900' : 'border-slate-200 text-slate-500 dark:border-slate-700'}`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                  {PERSONAS[state.persona].map(([q, src]) => (
                    <button key={q} type="button" onClick={() => ask(q)} className="rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-left text-sm leading-snug hover:border-blue-500 dark:border-slate-700 dark:bg-slate-900">
                      {q}
                      <small className="mt-1.5 block text-xs text-slate-400">{src}</small>
                    </button>
                  ))}
                </div>
              </>
            )}

            <div className="pb-2 pt-5">
              {state.thread.map((it) => (
                <AnswerCard
                  key={it.id}
                  item={it}
                  decisions={state.decisions}
                  builder={state.builder}
                  pinned={state.board.some((b) => b.id === it.id)}
                  onAsk={ask}
                  onPin={pin}
                  onShowTable={showTable}
                  onDownload={download}
                  onRunSpec={runSpec}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {view === 'ask' && (
        <div className="sticky bottom-0 z-10 bg-gradient-to-t from-slate-50 via-slate-50 to-transparent pb-4 pt-3.5 dark:from-slate-950 dark:via-slate-950">
          <div className="mx-auto max-w-4xl px-4">
            <form onSubmit={submit} className="flex items-end gap-2 rounded-2xl border border-slate-200 bg-white py-2 pl-4 pr-2 shadow-lg shadow-slate-900/5 focus-within:border-blue-500 dark:border-slate-700 dark:bg-slate-900">
              <label htmlFor="ur-q" className="sr-only">Ask Meldra</label>
              <textarea
                id="ur-q"
                ref={inputRef}
                rows={1}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) submit(e); }}
                placeholder="Ask about customers, revenue, people, spend…"
                className="max-h-40 min-h-6 flex-1 resize-none border-0 bg-transparent py-2 text-base leading-snug outline-none"
              />
              <button type="submit" disabled={!draft.trim()} aria-label="Ask" className="grid h-10 w-10 flex-none place-items-center rounded-xl bg-blue-600 text-white disabled:opacity-40">
                <ArrowUp className="h-[18px] w-[18px]" />
              </button>
            </form>
            <p className="mt-2 text-center text-xs text-slate-400">Answers are planned by Meldra AI when available, otherwise read with built-in rules. Sample data.</p>
          </div>
        </div>
      )}

      <div
        role="status"
        aria-live="polite"
        className={`pointer-events-none fixed bottom-24 left-1/2 z-30 max-w-[90vw] -translate-x-1/2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm text-white transition-opacity dark:bg-slate-100 dark:text-slate-900 ${toastMsg ? 'opacity-100' : 'opacity-0'}`}
      >
        {toastMsg}
      </div>
    </div>
  );
}
