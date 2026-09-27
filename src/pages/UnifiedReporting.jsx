import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowUp, Database, LayoutDashboard, MessageSquareText, Server, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { backendApi } from '@/api/backendClient';
import AnswerCard from '@/components/unifiedReporting/AnswerCard';
import ReportCard from '@/components/unifiedReporting/ReportCard';
import DashboardView from '@/components/unifiedReporting/DashboardView';
import SourcesView, { UploadZone } from '@/components/unifiedReporting/SourcesView';
import DatabaseSourceDialog from '@/components/unifiedReporting/DatabaseSourceDialog';
import {
  buildCatalog, columnsOf, defaultReport, fallbackFollowups, fallbackInsight, heuristic, sanitize, suggestQuestions,
} from '@/lib/unifiedReporting/engine';
import { buildModel, isLake, parseFile, refreshSource, rowCountOf, toKey } from '@/lib/unifiedReporting/model';
import useLakehouse, { namedRows } from '@/components/unifiedReporting/useLakehouse';
import { downloadBlob, downloadWorkbook, slug, toCSV } from '@/lib/unifiedReporting/export';
import { computeAsync } from '@/lib/unifiedReporting/remote';
import { buildSampleSources, sampleSuggestions } from '@/lib/unifiedReporting/sampleData';
import * as store from '@/lib/unifiedReporting/storage';

const uid = () => Math.random().toString(36).slice(2, 9);
const MAX_FILE_BYTES = 50 * 1024 * 1024;

export default function UnifiedReporting() {
  const [sources, setSources] = useState([]);
  const [relationships, setRelationships] = useState([]);
  const [thread, setThread] = useState([]);
  const [board, setBoard] = useState([]);
  const [boardFilters, setBoardFilters] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [view, setView] = useState('ask');
  const [draft, setDraft] = useState('');
  const [mode, setMode] = useState('ask'); // 'ask' a question, or 'report': build a whole report from one prompt
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(null); // { text, pct } while files are read or uploaded
  const [sourcesReady, setSourcesReady] = useState(false); // true once stored sources (if any) have been loaded
  const [toastMsg, setToastMsg] = useState('');
  const [dbDialog, setDbDialog] = useState(null); // null | { refreshOf?: source }
  const inputRef = useRef(null);
  const toastTimer = useRef(null);

  const m = useMemo(() => buildModel(sources, relationships), [sources, relationships]);
  const mRef = useRef(m);
  mRef.current = m;

  /* ---------- persistence (browser only) ---------- */
  useEffect(() => {
    (async () => {
      const data = await store.load('data', null);
      const ui = await store.load('ui', null);
      if (data?.sources) {
        setSources(data.sources);
        setRelationships(data.relationships || []);
      }
      if (ui) {
        setThread((ui.thread || []).filter((x) => x && (x.spec || x.report)).map((x) => ({ ...x, status: 'done' })));
        setBoard(ui.board || []);
        setBoardFilters(ui.boardFilters || []);
      }
      if (!data?.sources?.length) setView('data');
      setLoaded(true);
    })();
  }, []);
  useEffect(() => { if (loaded) store.save('data', { sources, relationships }); }, [loaded, sources, relationships]);
  useEffect(() => {
    if (!loaded) return;
    const t = thread.filter((x) => x.status === 'done').slice(-30).map(({ id, q, spec, insight, used, kind, report }) => ({ id, q, spec, insight, used, kind, report }));
    store.save('ui', { thread: t, board, boardFilters });
  }, [loaded, thread, board, boardFilters]);
  useEffect(() => () => clearTimeout(toastTimer.current), []);

  const toast = useCallback((msg) => {
    setToastMsg(msg);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastMsg(''), 3800);
  }, []);

  /* ---------- Meldra lakehouse (Iceberg tables on the server) ---------- */
  const lakehouse = useLakehouse({ sources, setSources, toast });
  const { lake, active: toLake } = lakehouse;
  useEffect(() => {
    if (!loaded || !lake.checked) return;
    if (!lake.enabled) {
      setSourcesReady(true);
      return;
    }
    lakehouse.reconcile()
      .then((n) => { if (n) setView((v) => (v === 'data' ? 'ask' : v)); })
      .catch((e) => toast(e.message))
      .finally(() => setSourcesReady(true));
  }, [loaded, lake.checked, lake.enabled]); // eslint-disable-line react-hooks/exhaustive-deps

  // Answers and dashboard tiles whose data was removed are cleared, instead of piling up as
  // "this answer used data that has since been removed".
  useEffect(() => {
    if (!sourcesReady) return;
    const alive = (sp) => Boolean(sp) && sp.series.every((x) => m.views[x.view]);
    setThread((t) => {
      const next = t.flatMap((x) => {
        if (x.status !== 'done') return [x];
        if (x.kind === 'report') {
          const specs = x.report.specs.filter(alive);
          if (!specs.length) return [];
          return specs.length === x.report.specs.length ? [x] : [{ ...x, report: { ...x.report, specs } }];
        }
        return alive(x.spec) ? [x] : [];
      });
      return next.length === t.length && next.every((x, i) => x === t[i]) ? t : next;
    });
    setBoard((b) => (b.every((x) => alive(x.spec)) ? b : b.filter((x) => alive(x.spec))));
  }, [sourcesReady, m]);
  // Links whose source is gone (deleted here or on another device) are dropped.
  useEffect(() => {
    if (!loaded) return;
    const ids = new Set(sources.map((x) => x.id));
    setRelationships((rs) => (rs.every((r) => ids.has(r.from.source) && ids.has(r.to.source)) ? rs : rs.filter((r) => ids.has(r.from.source) && ids.has(r.to.source))));
  }, [loaded, sources]);

  /** Add sources: straight into the lakehouse when that is switched on, else kept in this browser. */
  const addSources = async (list) => {
    if (!toLake) {
      appendSources(list);
      return list;
    }
    setBusy(true);
    try {
      const stored = await lakehouse.moveMany(list);
      appendSources(stored);
      return stored;
    } finally {
      setBusy(false);
    }
  };

  const moveToLake = async (ids) => {
    const list = sources.filter((x) => ids.includes(x.id) && !isLake(x));
    if (!list.length) return;
    setBusy(true);
    try {
      for (const src of list) {
        const stored = await lakehouse.moveToLake(src);
        setSources((ss) => ss.map((x) => (x.id === src.id ? stored : x)));
      }
      toast(`Stored ${list.length === 1 ? list[0].name : `${list.length} sources`} in the Meldra lakehouse.`);
    } catch (e) {
      toast(e.message);
    } finally {
      setBusy(false);
    }
  };

  /* ---------- data sources ---------- */
  const addFiles = async (files) => {
    if (!files.length) return;
    setBusy(true);
    if (toLake) {
      const { added, errors } = await lakehouse.uploadFiles(files, (p) => setProgress({
        text: p.phase === 'upload'
          ? `Uploading ${p.file}${p.count > 1 ? ` (${p.index} of ${p.count})` : ''}… ${p.pct}%`
          : `Storing ${p.file} in the Meldra lakehouse: checking types and building the table…`,
        pct: p.phase === 'upload' ? p.pct : null,
      }));
      setProgress(null);
      setBusy(false);
      if (added.length) {
        appendSources(added);
        toast(`Stored ${added.map((x) => x.name).join(', ')} in the Meldra lakehouse (${added.reduce((a, x) => a + x.rowCount, 0).toLocaleString()} rows).`);
      }
      if (errors.length) toast(errors.join(' '));
      return;
    }
    const added = [];
    const errors = [];
    for (const [i, f] of files.entries()) {
      setProgress({ text: `Reading ${f.name}${files.length > 1 ? ` (${i + 1} of ${files.length})` : ''}…`, pct: Math.round((i / files.length) * 100) });
      if (f.size > MAX_FILE_BYTES) {
        errors.push(`${f.name} is larger than 50 MB.`);
        continue;
      }
      try {
        added.push(...(await parseFile(f)));
      } catch (e) {
        errors.push(e.message || `${f.name} could not be read.`);
      }
    }
    setProgress(null);
    setBusy(false);
    if (added.length) {
      appendSources(added);
      toast(`Added ${added.map((x) => x.name).join(', ')}. Check the suggested links on the right.`);
    }
    if (errors.length) toast(errors.join(' '));
  };

  const appendSources = (added) => setSources((s) => {
    const taken = new Set(s.map((x) => x.key));
    return [...s, ...added.map((x) => {
      let key = x.key;
      while (taken.has(key)) key = `${key}_2`;
      taken.add(key);
      return { ...x, key };
    })];
  });

  const addDatabaseSources = async (added, links) => {
    try {
      await addSources(added);
    } catch (e) {
      toast(e.message);
      return;
    }
    if (links.length) setRelationships((rs) => [...rs, ...links]);
    const n = links.length ? ` Linked ${links.length} foreign key${links.length === 1 ? '' : 's'}.` : '';
    toast(`Added ${added.map((x) => x.name).join(', ')} from the database.${n}`);
    setView('data');
  };

  const refreshFromDatabase = async (id, columns, rows, truncated) => {
    const src = sources.find((x) => x.id === id);
    const name = src?.name || 'the source';
    if (isLake(src)) {
      try {
        await lakehouse.replaceRows(src, columns, rows, 'database', src.origin);
        toast(`Refreshed ${name} in the lakehouse: ${rows.length.toLocaleString()} rows.`);
      } catch (e) {
        toast(e.message);
      }
      return;
    }
    setSources((ss) => ss.map((x) => (x.id === id ? { ...refreshSource(x, columns, rows), truncated } : x)));
    toast(`Refreshed ${name}: ${rows.length.toLocaleString()} rows.`);
  };

  const addSource = async (src, msg) => {
    try {
      await addSources([src]);
      toast(`Added ${src.name}: ${msg}${toLake ? ', stored in the Meldra lakehouse' : ''}. Check the suggested links on the right.`);
    } catch (e) {
      toast(e.message);
    }
  };

  // An API pull comes back as a new source; refresh it in place, keeping the user's column choices.
  const refreshApiSource = async (id, fresh, msg) => {
    const target = sources.find((x) => x.id === id);
    if (isLake(target)) {
      try {
        await lakehouse.replaceRows(target, fresh.columns.map((c) => c.name), namedRows(fresh), 'api', fresh.origin);
        toast(`Refreshed in the lakehouse: ${msg}.`);
      } catch (e) {
        toast(e.message);
      }
      return;
    }
    const byKey = Object.fromEntries(fresh.columns.map((c) => [c.key, c.name]));
    const rows = fresh.rows.map((r) => Object.fromEntries(Object.entries(r).map(([k, v]) => [byKey[k] || k, v])));
    setSources((ss) => ss.map((x) => (x.id === id ? { ...refreshSource(x, fresh.columns.map((c) => c.name), rows), truncated: fresh.truncated, origin: fresh.origin } : x)));
    toast(`Refreshed: ${msg}.`);
  };

  const loadSample = async () => {
    const { sources: ss, relationships: rs } = buildSampleSources();
    let list = ss;
    if (toLake) {
      setBusy(true);
      try {
        list = await lakehouse.moveMany(ss);
      } catch (e) {
        toast(e.message);
        return;
      } finally {
        setBusy(false);
      }
    }
    setSources((cur) => [...cur.filter((x) => x.kind !== 'sample' && x.storedKind !== 'sample'), ...list]);
    setRelationships((cur) => [...cur, ...rs]);
    setView('ask');
    toast(`Loaded a sample company with six systems${toLake ? ', stored in the Meldra lakehouse' : ''}.`);
  };

  const saveTimers = useRef({});
  const updateSource = (id, patch) => {
    const src = sources.find((x) => x.id === id);
    setSources((s) => s.map((x) => (x.id === id ? { ...x, ...patch } : x)));
    if (!isLake(src)) return;
    // Typing a system name shouldn't save on every key: save the last value after a short pause.
    const key = `${id}:${Object.keys(patch).sort().join(',')}`;
    clearTimeout(saveTimers.current[key]);
    saveTimers.current[key] = setTimeout(() => lakehouse.saveChoices({ ...src, ...patch }, patch), 700);
  };

  const removeSource = async (id) => {
    const src = sources.find((x) => x.id === id);
    if (isLake(src)) {
      if (!window.confirm(`Delete ${src.name} from the Meldra lakehouse? The stored data is removed permanently.`)) return;
      try {
        await lakehouse.remove(src);
      } catch (e) {
        toast(e.message);
        return;
      }
    }
    setSources((s) => s.filter((x) => x.id !== id));
    setRelationships((r) => r.filter((x) => x.from.source !== id && x.to.source !== id));
  };

  const renameColumn = (id, oldKey, raw) => {
    const newKey = toKey(raw);
    const src = sources.find((x) => x.id === id);
    if (!src || newKey === oldKey) return oldKey;
    if (src.columns.some((c) => c.key === newKey)) {
      toast(`${src.name} already has a column named ${newKey}.`);
      return oldKey;
    }
    if (isLake(src)) {
      updateSource(id, { columns: src.columns.map((c) => (c.key === oldKey ? { ...c, key: newKey } : c)) });
    } else updateSource(id, {
      columns: src.columns.map((c) => (c.key === oldKey ? { ...c, key: newKey } : c)),
      rows: src.rows.map((r) => {
        const o = { ...r, [newKey]: r[oldKey] };
        delete o[oldKey];
        return o;
      }),
    });
    setRelationships((rs) => rs.map((r) => ({
      ...r,
      from: r.from.source === id && r.from.col === oldKey ? { ...r.from, col: newKey } : r.from,
      to: r.to.source === id && r.to.col === oldKey ? { ...r.to, col: newKey } : r.to,
    })));
    return newKey;
  };

  const clearAll = async () => {
    if (sources.some(isLake)) {
      if (!window.confirm('Remove all data, including everything stored in the Meldra lakehouse? This cannot be undone.')) return;
      try {
        await lakehouse.removeAll();
      } catch (e) {
        toast(e.message);
        return;
      }
    }
    setSources([]);
    setRelationships([]);
    setThread([]);
    setBoard([]);
    setBoardFilters([]);
    toast('All data removed.');
  };

  /* ---------- asking ---------- */
  const patchItem = (id, patch) => setThread((t) => t.map((x) => (x.id === id ? { ...x, ...patch } : x)));

  const writeInsight = useCallback(async (id, q, spec) => {
    const model = mRef.current;
    let res;
    try {
      res = await computeAsync(spec, model);
    } catch {
      return;
    }
    const fallback = fallbackInsight(spec, res, model.currency);
    if (!res.labels.length) {
      patchItem(id, { insight: fallback });
      return;
    }
    const cols = columnsOf(res).slice(0, 9); // the answer writer takes at most 10 columns
    const rows = res.labels.slice(0, 25).map((l, i) => [l, ...cols.map((c) => (c.data[i] === null ? null : Math.round(c.data[i] * 100) / 100))]);
    try {
      const out = await backendApi.unifiedReporting.insight({
        question: q,
        columns: [spec.groupBy || 'total', ...cols.map((c) => `${c.label} (${c.unit}${c.sys ? `, from ${c.sys}` : ', derived'})`)],
        rows,
        currency: model.currency,
      });
      patchItem(id, { insight: out?.text || fallback });
    } catch {
      patchItem(id, { insight: fallback });
    }
  }, []);

  const scrollToItem = (id) => requestAnimationFrame(() => document.getElementById(`qa-${id}`)?.scrollIntoView({ block: 'start', behavior: 'smooth' }));

  const ask = useCallback(async (raw, preset) => {
    const q = String(raw || '').trim();
    if (!q) return;
    const model = mRef.current;
    setView('ask');
    const id = uid();
    if (model.empty) {
      setThread((t) => [...t, { id, q, status: 'error', err: 'Add some data first: upload an export from any system, or load the sample company.' }]);
      return;
    }
    const prev = [...thread].reverse().find((x) => x.status === 'done')?.q;
    setThread((t) => [...t, { id, q, status: 'thinking', stage: `Reading ${Object.keys(model.views).length} sources…` }]);
    scrollToItem(id);

    let spec = null;
    let used = 'suggested';
    if (preset) {
      try { spec = sanitize(preset, model); } catch { spec = null; }
    }
    if (!spec) {
      try {
        const out = await backendApi.unifiedReporting.plan({ question: q, previousQuestion: prev, catalog: buildCatalog(model) });
        spec = sanitize(out?.spec, model);
        used = 'ai';
      } catch {
        spec = null;
      }
    }
    if (!spec) {
      try {
        spec = heuristic(q, model);
        used = 'rules';
      } catch {
        patchItem(id, { status: 'error', err: 'That question could not be matched to your data. Try naming a column and a breakdown, like “amount by region”.' });
        return;
      }
    }
    if (spec.cannot) return patchItem(id, { status: 'cannot', err: spec.cannot, used });
    if (spec.clarify) return patchItem(id, { status: 'clarify', clarify: spec.clarify, options: spec.options, used });
    if (!spec.followups.length) spec.followups = fallbackFollowups(spec, model);
    patchItem(id, { status: 'done', spec, used, insight: '' });
    scrollToItem(id);
    await writeInsight(id, q, spec);
  }, [thread, writeInsight]);

  const runSpec = async (id, json) => {
    const it = thread.find((x) => x.id === id);
    const sp = sanitize(json, m);
    if (sp.cannot || sp.clarify) throw new Error('not a report');
    sp.followups = it.spec.followups;
    patchItem(id, { spec: sp, used: 'edited', insight: '' });
    await writeInsight(id, it.q, sp);
  };

  /** Change filters or analysis options on an answer, then re-write its summary. */
  const refine = async (id, patch) => {
    const it = thread.find((x) => x.id === id);
    if (!it?.spec) return;
    let sp;
    try {
      sp = sanitize({ ...it.spec, ...patch }, m);
    } catch {
      return;
    }
    sp.followups = it.spec.followups;
    patchItem(id, { spec: sp, insight: '' });
    await writeInsight(id, it.q, sp);
  };

  /** Build a whole report from one prompt: the AI designs the charts from column names; rules take over without AI. */
  const buildReport = async (raw) => {
    const q = String(raw || '').trim();
    if (!q) return;
    const model = mRef.current;
    setView('ask');
    const id = uid();
    if (model.empty) {
      setThread((t) => [...t, { id, q, kind: 'report', status: 'error', err: 'Add some data first: upload an export from any system, or load the sample company.' }]);
      return;
    }
    setThread((t) => [...t, { id, q, kind: 'report', status: 'thinking', stage: `Designing a report across ${Object.keys(model.views).length} sources…` }]);
    scrollToItem(id);
    let report = null;
    let used = 'ai';
    try {
      const out = await backendApi.unifiedReporting.buildReport({ request: q, catalog: buildCatalog(model), tiles: 6 });
      const r = out?.report || {};
      if (r.cannot) {
        patchItem(id, { status: 'cannot', err: String(r.cannot) });
        return;
      }
      const specs = (Array.isArray(r.tiles) ? r.tiles : []).map((t) => {
        try {
          const sp = sanitize(t, model);
          return sp.cannot || sp.clarify ? null : sp;
        } catch {
          return null;
        }
      }).filter(Boolean);
      if (specs.length) report = { title: String(r.title || q).slice(0, 120), summary: String(r.summary || '').slice(0, 400), specs };
    } catch {
      report = null;
    }
    if (!report) {
      used = 'rules';
      const specs = defaultReport(q, model);
      if (!specs.length) {
        patchItem(id, { status: 'error', err: 'No report could be built from this data. Try naming the numbers and breakdowns you want.' });
        return;
      }
      report = { title: q.replace(/^./, (c) => c.toUpperCase()), summary: '', specs };
    }
    patchItem(id, { status: 'done', report, used });
    scrollToItem(id);
  };

  const pinAll = (id) => {
    const it = thread.find((x) => x.id === id);
    if (!it?.report) return;
    setBoard((b) => [...b, ...it.report.specs.map((sp, i) => ({ id: `${id}_${i}`, spec: JSON.parse(JSON.stringify(sp)) })).filter((x) => !b.some((y) => y.id === x.id))]);
    toast(`Added ${it.report.specs.length} charts to your dashboard.`);
  };

  const reportExcel = async (id) => {
    const it = thread.find((x) => x.id === id);
    try {
      await downloadWorkbook(it.report.specs.map((spec) => ({ spec })), m, `${slug(it.report.title)}.xlsx`, [], computeAsync);
    } catch {
      toast('The Excel file could not be created.');
    }
  };

  const pin = (id) => {
    const it = thread.find((x) => x.id === id);
    if (!it || board.some((b) => b.id === id)) return;
    setBoard((b) => [...b, { id, spec: JSON.parse(JSON.stringify(it.spec)) }]);
    toast('Added to your dashboard.');
  };

  const download = async (id) => {
    const it = thread.find((x) => x.id === id);
    try {
      downloadBlob(new Blob([toCSV(it.spec, await computeAsync(it.spec, m))], { type: 'text/csv' }), `${slug(it.spec.title)}.csv`);
    } catch {
      toast('The CSV file could not be created.');
    }
  };

  const downloadExcel = async (id) => {
    const it = thread.find((x) => x.id === id);
    try {
      await downloadWorkbook([{ spec: it.spec }], m, `${slug(it.spec.title)}.xlsx`, [], computeAsync);
    } catch {
      toast('The Excel file could not be created.');
    }
  };

  const exportBoard = async () => {
    try {
      const n = await downloadWorkbook(board, m, `meldra-dashboard-${new Date().toISOString().slice(0, 10)}.xlsx`, boardFilters, computeAsync);
      toast(`Exported ${n} tile${n === 1 ? '' : 's'} to Excel.`);
    } catch {
      toast('Nothing on the dashboard could be exported.');
    }
  };

  const submit = (e) => {
    e.preventDefault();
    const v = draft;
    setDraft('');
    if (mode === 'report') buildReport(v);
    else ask(v);
  };

  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(160, el.scrollHeight)}px`;
  }, [draft]);

  const suggestions = useMemo(() => (m.empty ? [] : [...sampleSuggestions(m), ...suggestQuestions(m)].slice(0, 6)), [m]);
  const totalRows = sources.reduce((a, s) => a + rowCountOf(s), 0);

  const TABS = [
    ['ask', 'Ask', MessageSquareText, null],
    ['dashboard', 'Dashboard', LayoutDashboard, board.length || null],
    ['data', 'Data sources', Database, sources.length || null],
  ];

  if (!loaded) return <div className="p-10 text-center text-slate-500">Loading your data…</div>;

  return (
    <div className="mx-auto w-full max-w-[1440px] px-4 pb-6 pt-6 sm:px-6 lg:px-8">
      {/* Page header */}
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-slate-200 pb-4 dark:border-slate-800">
        <div>
          <h1 className="m-0 text-2xl font-semibold tracking-tight">Unified Reporting</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {m.empty ? 'Bring exports from your systems together and ask questions across all of them.' : `${sources.length} sources · ${totalRows.toLocaleString()} rows · shared on ${m.shared.length ? m.shared.join(', ') : 'nothing yet'}`}
          </p>
        </div>
        <nav className="flex rounded-xl bg-slate-100 p-1 dark:bg-slate-800" aria-label="Unified Reporting sections">
          {TABS.map(([k, label, Icon, count]) => (
            <button
              key={k}
              type="button"
              onClick={() => setView(k)}
              aria-current={view === k ? 'page' : undefined}
              className={`flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition-colors ${view === k ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-900 dark:text-white' : 'text-slate-600 hover:text-slate-900 dark:text-slate-300'}`}
            >
              <Icon className="h-4 w-4" />
              {label}
              {count ? <span className="rounded-full bg-blue-100 px-1.5 text-xs text-blue-700 dark:bg-blue-900 dark:text-blue-200">{count}</span> : null}
            </button>
          ))}
        </nav>
      </div>

      <div className="pt-6">
        {view === 'data' && (
          <SourcesView
            m={m}
            busy={busy}
            onFiles={addFiles}
            progress={progress}
            onConnectDatabase={() => setDbDialog({})}
            onRefreshSource={(src) => setDbDialog({ refreshOf: src })}
            onLoadSample={loadSample}
            onAddSource={addSource}
            lake={lake}
            storeInLake={lakehouse.storeInLake}
            onStoreInLake={lakehouse.setStoreInLake}
            onMoveToLake={moveToLake}
            lakeLinks={lakehouse.lakeLinks}
            onRefreshApiSource={refreshApiSource}
            onUpdateSource={updateSource}
            onRemoveSource={removeSource}
            onRenameColumn={renameColumn}
            onAddRelationship={(r) => setRelationships((rs) => [...rs, r])}
            onRemoveRelationship={(id) => setRelationships((rs) => rs.filter((r) => r.id !== id))}
            onClearAll={clearAll}
          />
        )}

        {view === 'dashboard' && (
          <DashboardView
            board={board}
            m={m}
            filters={boardFilters}
            onFilters={setBoardFilters}
            onExport={exportBoard}
            onRemove={(id) => setBoard((b) => b.filter((x) => x.id !== id))}
            onChart={(id, chart) => setBoard((b) => b.map((x) => (x.id === id ? { ...x, spec: { ...x.spec, chart } } : x)))}
            onGoAsk={() => setView('ask')}
          />
        )}

        {view === 'ask' && m.empty && (
          <div className="mx-auto max-w-3xl py-6">
            <h2 className="text-center text-3xl font-semibold tracking-tight">Ask questions across all your systems</h2>
            <p className="mx-auto mt-2 max-w-xl text-center text-slate-500">
              Upload exports from HR, finance, sales or procurement. Meldra finds the columns they share, links them, and answers questions with a chart and the sources behind every number.
            </p>
            <div className="mt-8"><UploadZone onFiles={addFiles} busy={busy} progress={progress} lake={lake} storeInLake={lakehouse.storeInLake} onStoreInLake={lakehouse.setStoreInLake} /></div>
            <div className="mt-4 text-center">
              <Button variant="outline" onClick={() => setDbDialog({})}><Server className="mr-2 h-4 w-4" />Connect a database</Button>
              <Button variant="outline" className="ml-2" onClick={loadSample}><Sparkles className="mr-2 h-4 w-4" />Try it with a sample company</Button>
            </div>
          </div>
        )}

        {view === 'ask' && !m.empty && (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[300px_minmax(0,1fr)]">
            <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <div className="flex items-center justify-between">
                  <h3 className="m-0 text-sm font-semibold">Your data</h3>
                  <button type="button" onClick={() => setView('data')} className="text-xs font-medium text-blue-700 dark:text-blue-400">Manage</button>
                </div>
                <ul className="mt-3 space-y-2">
                  {sources.map((s) => (
                    <li key={s.id} className="flex items-center justify-between gap-2 text-sm">
                      <span className="min-w-0">
                        <span className="block truncate font-medium">{s.system}</span>
                        <span className="block truncate text-xs text-slate-500">{s.name}</span>
                      </span>
                      <span className="flex-none text-xs tabular-nums text-slate-500">{rowCountOf(s).toLocaleString()}</span>
                    </li>
                  ))}
                </ul>
                {m.shared.length > 0 && (
                  <>
                    <div className="mt-4 text-xs font-medium uppercase tracking-wider text-slate-400">Can combine on</div>
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {m.shared.map((d) => <span key={d} className="rounded-full bg-blue-50 px-2 py-0.5 text-xs text-blue-700 dark:bg-blue-950 dark:text-blue-300">{d}</span>)}
                    </div>
                  </>
                )}
              </div>
              {thread.length > 0 && suggestions.length > 0 && (
                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                  <h3 className="m-0 text-sm font-semibold">Try asking</h3>
                  <ul className="mt-2 space-y-1">
                    {suggestions.map((s) => (
                      <li key={s.q}>
                        <button type="button" onClick={() => ask(s.q, s.spec)} className="w-full rounded-md px-2 py-1.5 text-left text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800">{s.q}</button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </aside>

            <section className="flex min-h-[60vh] min-w-0 flex-col">
              {sources.length === 1 && (
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm dark:border-amber-900 dark:bg-amber-950">
                  <span>
                    <strong>You have one source.</strong> Unified reporting combines systems: add another export (for example expenses, budgets or CRM
                    opportunities) and Meldra links them so you can ask questions across both.
                  </span>
                  <Button size="sm" variant="outline" onClick={() => setView('data')}><Database className="mr-1.5 h-4 w-4" />Add another source</Button>
                </div>
              )}
              {!thread.length && (
                <div className="pb-6">
                  <h2 className="m-0 text-xl font-semibold tracking-tight">What would you like to know?</h2>
                  <p className="mt-1 text-sm text-slate-500">Ask in plain words, or start from a question that fits your data:</p>
                  <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                    {suggestions.map((s) => (
                      <button key={s.q} type="button" onClick={() => ask(s.q, s.spec)} className="rounded-xl border border-slate-200 bg-white p-4 text-left text-sm leading-snug shadow-sm transition hover:border-blue-500 hover:shadow dark:border-slate-700 dark:bg-slate-900">
                        <span className="font-medium">{s.q}</span>
                        <small className="mt-2 block text-xs text-slate-500">{s.src}</small>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex-1">
                {thread.map((it) => (it.kind === 'report' ? (
                  <ReportCard
                    key={it.id}
                    item={it}
                    m={m}
                    onChart={(id, i, chart) => setThread((t) => t.map((x) => (x.id === id ? { ...x, report: { ...x.report, specs: x.report.specs.map((sp, k) => (k === i ? { ...sp, chart } : sp)) } } : x)))}
                    onPinAll={pinAll}
                    onExcel={reportExcel}
                  />
                ) : (
                  <AnswerCard
                    key={it.id}
                    item={it}
                    m={m}
                    pinned={board.some((b) => b.id === it.id)}
                    onAsk={(q) => ask(q)}
                    onPin={pin}
                    onChart={(id, chart) => patchItem(id, { spec: { ...thread.find((x) => x.id === id).spec, chart } })}
                    onDownload={download}
                    onDownloadExcel={downloadExcel}
                    onRunSpec={runSpec}
                    onRefine={refine}
                  />
                )))}
              </div>

              <div className="sticky bottom-0 z-10 -mx-1 bg-gradient-to-t from-slate-50 via-slate-50 to-transparent px-1 pb-3 pt-4 dark:from-slate-950 dark:via-slate-950">
                <div className="mb-2 flex gap-1" role="tablist" aria-label="What to do with your prompt">
                  {[['ask', 'Ask a question', MessageSquareText], ['report', 'Build a report', Sparkles]].map(([k, label, Icon]) => (
                    <button
                      key={k}
                      type="button"
                      role="tab"
                      aria-selected={mode === k}
                      onClick={() => setMode(k)}
                      className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${mode === k ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900' : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:ring-blue-400 dark:bg-slate-900 dark:text-slate-300 dark:ring-slate-700'}`}
                    >
                      <Icon className="h-3.5 w-3.5" />{label}
                    </button>
                  ))}
                </div>
                <form onSubmit={submit} className="flex items-end gap-2 rounded-2xl border border-slate-300 bg-white py-2 pl-4 pr-2 shadow-lg shadow-slate-900/5 focus-within:border-blue-500 dark:border-slate-700 dark:bg-slate-900">
                  <label htmlFor="ur-q" className="sr-only">{mode === 'report' ? 'Describe the report you need' : 'Ask a question about your data'}</label>
                  <textarea
                    id="ur-q"
                    ref={inputRef}
                    rows={1}
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) submit(e); }}
                    placeholder={mode === 'report'
                      ? 'Describe the report, e.g. "Board pack on workforce cost and revenue by department, last 12 months"'
                      : `Ask across ${sources.map((s) => s.system).slice(0, 3).join(', ')}${sources.length > 3 ? '…' : ''}`}
                    className="max-h-40 min-h-6 flex-1 resize-none border-0 bg-transparent py-2 text-base leading-snug outline-none"
                  />
                  <button type="submit" disabled={!draft.trim()} aria-label={mode === 'report' ? 'Build report' : 'Ask'} className="grid h-10 w-10 flex-none place-items-center rounded-xl bg-blue-600 text-white disabled:opacity-40">
                    <ArrowUp className="h-[18px] w-[18px]" />
                  </button>
                </form>
              </div>
            </section>
          </div>
        )}
      </div>

      <div
        role="status"
        aria-live="polite"
        className={`pointer-events-none fixed bottom-24 left-1/2 z-30 max-w-[90vw] -translate-x-1/2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm text-white shadow-lg transition-opacity dark:bg-slate-100 dark:text-slate-900 ${toastMsg ? 'opacity-100' : 'opacity-0'}`}
      >
        {toastMsg}
      </div>
      <DatabaseSourceDialog
        open={!!dbDialog}
        onOpenChange={(v) => { if (!v) setDbDialog(null); }}
        refreshOf={dbDialog?.refreshOf}
        onAdd={addDatabaseSources}
        onRefresh={refreshFromDatabase}
      />
    </div>
  );
}
