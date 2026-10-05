import { useEffect, useMemo, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';
import {
  ArrowRight, ArrowRightLeft, Check, Download, FileCheck2, FileSpreadsheet, FolderSync, Loader2, Lock, RotateCcw, Settings2, ShieldCheck, Sparkles, Trash2, Upload, Wand2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import ProductHeader, { StatTile, headerButton } from '@/components/common/ProductHeader';
import { backendApi } from '@/api/backendClient';
import MappingStep from '@/components/migration/MappingStep';
import ReviewStep from '@/components/migration/ReviewStep';
import ExportStep from '@/components/migration/ExportStep';
import { CONCEPTS } from '@/lib/migration/concepts';
import { mapSheets, picklistValues, runMigration, valueGroups } from '@/lib/migration/engine';
import { buildReviewWorkbook, buildZip } from '@/lib/migration/exporter';
import { applyProfile, exportProfile } from '@/lib/migration/profile';
import { buildWorkdaySample, downloadWorkdaySampleXlsx } from '@/lib/migration/sampleWorkday';
import { DEFAULT_SETTINGS, SUCCESSFACTORS } from '@/lib/migration/targets/successfactors';
import { parseFile } from '@/lib/unifiedReporting/model';
import * as store from '@/lib/unifiedReporting/storage';

const STEPS = [
  ['upload', 'Upload extract', 'Excel or CSV from the legacy system'],
  ['map', 'Map fields', 'Columns matched to target fields'],
  ['cleanse', 'Cleanse & validate', 'Values fixed, codes translated'],
  ['export', 'Load order & export', 'Load-ready files, in order'],
];
const TARGET_NAME = 'SAP SuccessFactors Employee Central';
const HOW_IT_WORKS = [
  [Wand2, 'Automatic mapping', 'Every column is matched to a target field by its name, synonyms and the shape of its values. AI refines what the rules cannot place, using tab and column names only.'],
  [FolderSync, 'Records assembled for you', 'Tabs are joined per employee without VLOOKUPs, and org, job and cost centre lists are built from the data.'],
  [ShieldCheck, 'Cleansed and validated', 'Dates, countries, picklists and bank details are standardised, and every fix and every problem is listed before you load.'],
  [FileCheck2, 'Load-ready package', 'A zip of import files numbered in load order, plus a review workbook and a reconciliation of counts and totals.'],
];
const STORE_KEY = 'migration';
const SOURCE_SYSTEMS = ['Workday', 'Oracle HCM Cloud', 'Oracle E-Business Suite', 'SAP HCM (on-premise)', 'ADP', 'UKG / Kronos', 'BambooHR', 'Dayforce (Ceridian)', 'PeopleSoft', 'Sage People', 'Excel / custom'];
const card = 'rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900';

function SettingsPanel({ settings, onChange }) {
  const field = (key, label, hint, input) => (
    <label className="block text-sm">
      <span className="font-medium">{label}</span>
      {input || (
        <input className="mt-1 w-full rounded-md border border-slate-200 bg-white px-2 py-1 font-mono text-xs dark:border-slate-700 dark:bg-slate-900" value={settings[key]} onChange={(e) => onChange({ [key]: e.target.value })} />
      )}
      {hint && <span className="mt-0.5 block text-xs text-slate-500">{hint}</span>}
    </label>
  );
  const select = (key, opts) => (
    <select className="mt-1 w-full rounded-md border border-slate-200 bg-white px-2 py-1 text-sm dark:border-slate-700 dark:bg-slate-900" value={settings[key]} onChange={(e) => onChange({ [key]: e.target.value })}>
      {opts.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
    </select>
  );
  return (
    <div className={`${card} grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4`}>
      {field('dateFormat', 'Output date format', 'Match what your instance’s import expects.', select('dateFormat', [['MM/dd/yyyy', 'MM/dd/yyyy'], ['yyyy-MM-dd', 'yyyy-MM-dd'], ['dd/MM/yyyy', 'dd/MM/yyyy']]))}
      {field('sourceDateOrder', 'Source date order', 'Auto reads it from dates like 25/04 or 04/25.', select('sourceDateOrder', [['auto', 'Detect per column'], ['MDY', 'Month / day / year'], ['DMY', 'Day / month / year']]))}
      {field('hireEventReason', 'Hire event reason', 'First job record.')}
      {field('jobChangeEventReason', 'Job change event reason', 'Later records where the job, title or grade changed.')}
      {field('transferEventReason', 'Transfer event reason', 'Later records where the org, location or cost center changed.')}
      {field('changeEventReason', 'Data change event reason', 'Any other later record.')}
      {field('paymentMethod', 'Default payment method code', 'Used when the extract has none.')}
      {field('retirementEventReason', 'Retirement event reason', 'Termination reason code used for retirees.')}
      <label className="flex items-center gap-2 text-sm sm:col-span-2">
        <input type="checkbox" checked={!!settings.sapPayrollTransfer} onChange={(e) => onChange({ sapPayrollTransfer: e.target.checked })} />
        Generate SAP payroll legacy transfer files (T558B / T558C) for a mid-year go-live on SAP payroll
      </label>
      {settings.sapPayrollTransfer && field('sapCountryGrouping', 'SAP country grouping (MOLGA)', 'Required by T558C, e.g. your country’s 2-digit grouping.')}
      {settings.sapPayrollTransfer && field('sapPeriodModifier', 'SAP period modifier', 'Payroll area period modifier, e.g. 01 = monthly.')}
      {settings.sapPayrollTransfer && field('sapOffCyclePayType', 'Off-cycle payroll type', 'Used for runs marked off-cycle or bonus.')}
      {field('pensionPayoutFrequency', 'Pension payout frequency code', 'Used when the retirees tab has none.')}
      {field('defaultTimezone', 'Default time zone', 'Used when neither the job nor its location has one.')}
      {field('basePayComponent', 'Base pay component', 'Pay component code for base salary.')}
      {field('workEmailType', 'Work email type code')}
      {field('phoneType', 'Work phone type code')}
      {field('addressType', 'Address type code')}
      {field('foundationStartDate', 'Foundation start date (ISO)', 'Effective start for org records.')}
      <label className="flex items-center gap-2 text-sm sm:col-span-2">
        <input type="checkbox" checked={settings.labelRow} onChange={(e) => onChange({ labelRow: e.target.checked })} />
        Include the second header row with field labels (as in downloaded templates)
      </label>
    </div>
  );
}

SettingsPanel.propTypes = { settings: PropTypes.object.isRequired, onChange: PropTypes.func.isRequired };

export default function Migration() {
  const [sheets, setSheets] = useState([]);
  const [mapping, setMapping] = useState({});
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [picklists, setPicklists] = useState({});
  // Which value translations the AI filled: { [type]: { [key]: true } }.
  const [aiMarks, setAiMarks] = useState({});
  const [valuesAiStatus, setValuesAiStatus] = useState(null);
  // What the AI says each tab is: { [sheetId]: { purpose, note } }.
  const [tabInfo, setTabInfo] = useState({});
  const [aiStatus, setAiStatus] = useState(null);
  // A profile loaded before any extract is applied to the next upload.
  const [pendingProfile, setPendingProfile] = useState(null);
  const profileInput = useRef(null);
  const [step, setStep] = useState('upload');
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState('');
  const [message, setMessage] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const fileInput = useRef(null);

  useEffect(() => {
    (async () => {
      const saved = await store.load(STORE_KEY, null);
      if (saved?.sheets?.length) {
        setSheets(saved.sheets);
        setMapping(saved.mapping || {});
        setSettings({ ...DEFAULT_SETTINGS, ...(saved.settings || {}) });
        setPicklists(saved.picklists || {});
        setAiMarks(saved.aiMarks || {});
        setTabInfo(saved.tabInfo || {});
        setStep(saved.step || 'map');
      }
      setLoaded(true);
    })();
  }, []);
  useEffect(() => {
    if (loaded) store.save(STORE_KEY, { sheets, mapping, settings, picklists, aiMarks, step, tabInfo });
  }, [loaded, sheets, mapping, settings, picklists, aiMarks, step, tabInfo]);

  const purposes = useMemo(() => Object.fromEntries(Object.entries(tabInfo).map(([k, v]) => [k, v.purpose])), [tabInfo]);
  const result = useMemo(() => (sheets.length ? runMigration(SUCCESSFACTORS, sheets, mapping, settings, picklists, purposes) : null), [sheets, mapping, settings, picklists, purposes]);
  const picklistRows = useMemo(() => (sheets.length ? picklistValues(sheets, mapping, picklists, aiMarks) : {}), [sheets, mapping, picklists, aiMarks]);
  const sourceSystem = settings.sourceSystem || 'Workday';

  const addSheets = (added) => {
    const next = [...sheets, ...added];
    // Map only the new sheets; keep the user's choices on existing ones.
    let nextMapping = { ...mapping, ...mapSheets(added) };
    if (pendingProfile) {
      const applied = applyProfile(pendingProfile, next, nextMapping, settings);
      nextMapping = applied.mapping;
      setSettings(applied.settings);
      setPicklists(applied.picklists);
      setAiMarks({});
      setTabInfo((cur) => ({ ...cur, ...applied.tabInfo }));
      setMessage(`Profile applied: ${applied.stats.applied} column choices on ${applied.stats.matchedTabs} of ${applied.stats.tabs} tabs.`);
      setPendingProfile(null);
    }
    setSheets(next);
    setMapping(nextMapping);
    setStep('map');
    runAi(next, nextMapping, { auto: true });
  };

  const onFiles = async (files) => {
    if (!files.length) return;
    setBusy('upload');
    setMessage('');
    const added = [];
    const errors = [];
    for (const f of files) {
      try {
        added.push(...(await parseFile(f)));
      } catch (e) {
        errors.push(e.message);
      }
    }
    setBusy('');
    if (errors.length) setMessage(errors.join(' '));
    if (added.length) addSheets(added);
  };

  const loadSample = () => {
    const sample = buildWorkdaySample().map((s) => {
      const copy = { ...s };
      delete copy.rawRows;
      return copy;
    });
    const sampleMapping = mapSheets(sample);
    setMapping(sampleMapping);
    setSheets(sample);
    setPicklists({});
    setAiMarks({});
    setTabInfo({});
    setStep('map');
    runAi(sample, sampleMapping, { auto: true });
  };

  const reset = () => {
    setSheets([]);
    setMapping({});
    setPicklists({});
    setAiMarks({});
    setValuesAiStatus(null);
    setTabInfo({});
    setAiStatus(null);
    setSettings(DEFAULT_SETTINGS);
    setStep('upload');
  };

  const setColumn = (sheetId, col, concept) => setMapping((m) => ({
    ...m,
    [sheetId]: { ...(m[sheetId] || {}), [col]: concept ? { concept, confidence: 1, method: 'you' } : { concept: null, method: 'you' } },
  }));

  /**
   * AI pass: classify every tab and map what the rules could not place
   * confidently. Sends tab and column names only, never values. The user's
   * own choices and confident rule matches are never overwritten.
   */
  const runAi = async (sheetList, baseMapping, { auto = false } = {}) => {
    setBusy('ai');
    setAiStatus({ state: 'running' });
    try {
      const out = await backendApi.migration.suggestMapping({
        sourceSystem,
        sheets: sheetList.map((s) => ({ name: s.name, columns: s.columns.map((c) => c.name) })),
        concepts: CONCEPTS.map((c) => ({ id: c.id, label: `${c.label} (${c.group})` })),
      });
      const next = { ...baseMapping };
      let applied = 0;
      for (const x of out.mappings || []) {
        const sheet = sheetList.find((s) => s.name === x.sheet);
        const col = sheet?.columns.find((c) => c.name === x.column);
        if (!col) continue;
        const cur = next[sheet.id]?.[col.key];
        if (cur?.method === 'you' || cur?.method === 'profile' || (cur?.concept && cur.confidence >= 0.85)) continue;
        if (cur?.concept === x.concept) continue;
        const taken = Object.entries(next[sheet.id] || {}).some(([k, v]) => k !== col.key && v?.concept === x.concept);
        if (taken) continue;
        next[sheet.id] = { ...(next[sheet.id] || {}), [col.key]: { concept: x.concept, confidence: Math.min(1, Number(x.confidence) || 0.8), method: 'ai' } };
        applied++;
      }
      const info = {};
      for (const t of out.tabs || []) {
        const sheet = sheetList.find((s) => s.name === t.sheet);
        if (sheet) info[sheet.id] = { purpose: t.purpose, note: t.note };
      }
      setMapping(next);
      setTabInfo((cur) => ({ ...cur, ...info }));
      setAiStatus({ state: 'ok', applied, tabs: Object.keys(info).length });
    } catch (e) {
      setAiStatus({ state: 'error', reason: e.message, auto });
    }
    setBusy('');
  };
  const refineWithAi = () => runAi(sheets, mapping);

  /**
   * AI pass on value translations: fills codes the dictionary could not place
   * and gives copied-through values (termination reasons, pay components…) one
   * consistent code. Sends distinct value labels only, on request. Codes you
   * typed are never overwritten.
   */
  const translateValuesWithAi = async () => {
    const groups = valueGroups(picklistRows);
    if (!groups.length) {
      setValuesAiStatus({ state: 'ok', applied: 0 });
      return;
    }
    setBusy('values');
    setValuesAiStatus({ state: 'running' });
    try {
      const out = await backendApi.migration.suggestValues({ sourceSystem, groups });
      const nextPicklists = { ...picklists };
      const nextMarks = { ...aiMarks };
      let applied = 0;
      for (const v of out.values || []) {
        const key = String(v.value).trim().toLowerCase();
        const own = picklists[v.type]?.[key] !== undefined && !aiMarks[v.type]?.[key];
        if (own) continue;
        nextPicklists[v.type] = { ...(nextPicklists[v.type] || {}), [key]: v.code };
        nextMarks[v.type] = { ...(nextMarks[v.type] || {}), [key]: true };
        applied++;
      }
      setPicklists(nextPicklists);
      setAiMarks(nextMarks);
      setValuesAiStatus({ state: 'ok', applied });
    } catch (e) {
      setValuesAiStatus({ state: 'error', reason: e.message });
    }
    setBusy('');
  };
  const setPicklistCode = (type, key, code) => {
    setPicklists((p) => ({ ...p, [type]: { ...(p[type] || {}), [key]: code } }));
    setAiMarks((m) => {
      if (!m[type]?.[key]) return m;
      const rest = { ...m[type] };
      delete rest[key];
      return { ...m, [type]: rest };
    });
  };

  const saveProfile = () => {
    const profile = exportProfile({ sheets, mapping, settings, picklists, tabInfo });
    saveBlob(new Blob([JSON.stringify(profile, null, 2)], { type: 'application/json' }), `migration_profile_${new Date().toISOString().slice(0, 10)}.json`);
  };
  const loadProfile = async (file) => {
    if (!file) return;
    try {
      const profile = JSON.parse(await file.text());
      if (!sheets.length) {
        applyProfile(profile, [], {}, settings); // validates the file
        setPendingProfile(profile);
        setMessage('Profile loaded: it will be applied to the extract you upload next.');
        return;
      }
      const applied = applyProfile(profile, sheets, mapping, settings);
      setMapping(applied.mapping);
      setSettings(applied.settings);
      setPicklists(applied.picklists);
      setAiMarks({});
      setTabInfo((cur) => ({ ...cur, ...applied.tabInfo }));
      setMessage(`Profile applied: ${applied.stats.applied} column choices on ${applied.stats.matchedTabs} of ${applied.stats.tabs} tabs, plus its value translations and settings.`);
    } catch (e) {
      setMessage(`The profile could not be loaded: ${e.message}`);
    }
  };

  const saveBlob = (blob, name) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
  };
  const downloadWorkbook = async () => {
    setBusy('zip');
    try {
      saveBlob(await buildReviewWorkbook({ result, settings }), `migration_review_${new Date().toISOString().slice(0, 10)}.xlsx`);
    } catch (e) {
      setMessage(`The workbook could not be built: ${e.message}`);
    }
    setBusy('');
  };

  const download = async () => {
    setBusy('zip');
    try {
      const blob = await buildZip({ result, target: SUCCESSFACTORS, settings, sheets, mapping });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `successfactors_migration_${new Date().toISOString().slice(0, 10)}.zip`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setMessage(`The package could not be built: ${e.message}`);
    }
    setBusy('');
  };

  if (!loaded) return <div className="p-10 text-center text-slate-500">Loading…</div>;
  const stepIdx = STEPS.findIndex(([k]) => k === step);
  const canGo = (k) => k === 'upload' || sheets.length > 0;

  return (
    <div className="mx-auto w-full max-w-[1440px] px-4 pb-10 pt-6 sm:px-6 lg:px-8">
      <input ref={profileInput} type="file" accept=".json,application/json" className="hidden" onChange={(e) => { loadProfile(e.target.files[0]); e.target.value = ''; }} />
      <ProductHeader
        icon={ArrowRightLeft}
        eyebrow="Migration"
        title="HR data migration, ready to load"
        description={`Turn a legacy HR extract into load-ready ${TARGET_NAME} files: mapped, cleansed, validated and in load order. Save the result as a profile and rerun every mock cycle in minutes.`}
        points={[[Lock, 'Processed in your browser'], [Sparkles, 'AI sees column names, never values'], [FolderSync, 'Reusable for every mock cycle']]}
        guide="/help/migration-overview"
        actions={(
          <>
            <button type="button" className={headerButton} onClick={() => profileInput.current?.click()} title="Re-use mappings, value translations and settings from an earlier run">Load profile</button>
            {sheets.length > 0 && <button type="button" className={headerButton} onClick={saveProfile} title="Save mappings, value translations and settings for the next mock load or cutover">Save profile</button>}
            {sheets.length > 0 && <button type="button" className={headerButton} onClick={() => setShowSettings(!showSettings)} aria-pressed={showSettings}><Settings2 className="h-4 w-4" />Settings</button>}
            {sheets.length > 0 && <button type="button" className={headerButton} onClick={reset}><RotateCcw className="h-4 w-4" />Start over</button>}
          </>
        )}
        stats={result && (
          <>
            <StatTile label="Employees" value={(result.reconciliation.find((r) => r.label === 'Employees')?.source || 0).toLocaleString()} hint={`${sheets.length} tab${sheets.length === 1 ? '' : 's'} · ${sheets.reduce((a, x) => a + x.rows.length, 0).toLocaleString()} rows`} />
            <StatTile label="Columns mapped" value={`${result.coverage.mapped + result.coverage.carried} / ${result.coverage.total}`} hint={result.coverage.left ? `${result.coverage.left} still to place` : 'All columns placed'} />
            <StatTile label="Errors to fix" value={result.issues.filter((x) => x.severity === 'error').length.toLocaleString()} hint={`${result.issues.filter((x) => x.severity === 'warning').length.toLocaleString()} warnings`} />
            <StatTile label="Load files" value={result.files.length.toLocaleString()} hint="Numbered in load order" />
          </>
        )}
      >
        <div className="mt-5 flex flex-wrap items-center gap-2 text-sm">
          <span className="rounded-lg bg-white px-3 py-1.5 font-semibold text-[#02161A] shadow-sm">{sourceSystem}</span>
          <ArrowRight className="h-4 w-4 text-[#DDFA21]" aria-hidden="true" />
          <span className="rounded-lg bg-white px-3 py-1.5 font-semibold text-[#02161A] shadow-sm">{TARGET_NAME}</span>
        </div>
      </ProductHeader>

      {/* Stepper */}
      <ol className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4" aria-label="Migration steps">
        {STEPS.map(([k, label, hint], i) => {
          const done = i < stepIdx;
          const active = k === step;
          return (
            <li key={k} className="relative">
              <button
                type="button"
                disabled={!canGo(k)}
                onClick={() => setStep(k)}
                aria-current={active ? 'step' : undefined}
                className={`group flex w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left transition disabled:cursor-not-allowed disabled:opacity-50 ${active ? 'border-[#004FCD] bg-white shadow-md shadow-blue-900/10 ring-4 ring-blue-50 dark:bg-slate-900 dark:ring-blue-950' : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm dark:border-slate-800 dark:bg-slate-900'}`}
              >
                <span className={`grid h-8 w-8 flex-none place-items-center rounded-full text-sm font-semibold ${active ? 'bg-[#004FCD] text-white' : done ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300'}`}>
                  {done ? <Check className="h-4 w-4" /> : i + 1}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold text-slate-900 dark:text-white">{label}</span>
                  <span className="block truncate text-xs text-slate-500">{hint}</span>
                </span>
              </button>
              <span className={`absolute -bottom-2 left-4 right-4 h-1 rounded-full ${done ? 'bg-emerald-500' : active ? 'bg-[#004FCD]' : 'bg-transparent'}`} aria-hidden="true" />
            </li>
          );
        })}
      </ol>

      {showSettings && <div className="mt-4"><SettingsPanel settings={settings} onChange={(p) => setSettings((s) => ({ ...s, ...p }))} /></div>}
      {message && <p className="mt-4 rounded-lg bg-slate-100 px-3 py-2 text-sm dark:bg-slate-800" role="status">{message}</p>}

      <div className="mt-6">
        {step === 'upload' && (
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_400px]">
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => { e.preventDefault(); onFiles([...e.dataTransfer.files]); }}
              className="relative overflow-hidden rounded-3xl border-2 border-dashed border-blue-200 bg-gradient-to-b from-blue-50/70 to-white px-6 py-12 text-center transition hover:border-[#004FCD] dark:border-blue-900 dark:from-blue-950/30 dark:to-slate-900"
            >
              <input ref={fileInput} type="file" multiple accept=".csv,.tsv,.xlsx,.xls" className="hidden" onChange={(e) => { onFiles([...e.target.files]); e.target.value = ''; }} />
              <span className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-[#004FCD] text-white shadow-lg shadow-blue-900/20">
                {busy === 'upload' ? <Loader2 className="h-7 w-7 animate-spin" /> : <Upload className="h-7 w-7" />}
              </span>
              <h2 className="mt-5 text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">Drop your system extract here</h2>
              <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-500">
                One workbook with several tabs, or several CSV files: people, jobs, pay, addresses, bank details and org lists. Meldra recognises each tab and maps it for you.
              </p>
              <label className="mx-auto mt-5 flex max-w-sm items-center justify-center gap-2 text-sm">
                <span className="font-medium text-slate-600 dark:text-slate-300">Source system</span>
                <input
                  list="migration-source-systems"
                  className="w-52 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm shadow-sm dark:border-slate-700 dark:bg-slate-900"
                  value={sourceSystem}
                  onChange={(e) => setSettings((cur) => ({ ...cur, sourceSystem: e.target.value.slice(0, 60) }))}
                />
                <datalist id="migration-source-systems">{SOURCE_SYSTEMS.map((x) => <option key={x} value={x} />)}</datalist>
              </label>
              <Button className="mt-5 h-11 bg-[#004FCD] px-6 text-base hover:bg-[#0043ad]" onClick={() => fileInput.current?.click()} disabled={busy === 'upload'}>Choose files</Button>
              <p className="mt-2 text-xs text-slate-400">Excel (.xlsx, .xls) or CSV · files stay in your browser</p>
              <div className="mt-7 flex flex-wrap justify-center gap-2 border-t border-blue-100 pt-6 dark:border-slate-800">
                <Button variant="outline" onClick={loadSample}><Sparkles className="mr-2 h-4 w-4" />Try a sample system extract</Button>
                <Button variant="ghost" onClick={downloadWorkdaySampleXlsx}><Download className="mr-2 h-4 w-4" />Download sample as Excel</Button>
              </div>
            </div>
            <div className={`${card} p-6`}>
              <h3 className="m-0 text-base font-semibold text-slate-900 dark:text-white">How it works</h3>
              <ol className="mt-4 space-y-4">
                {HOW_IT_WORKS.map(([Icon, title, text]) => (
                  <li key={title} className="flex gap-3">
                    <span className="grid h-9 w-9 flex-none place-items-center rounded-xl bg-blue-50 text-[#004FCD] dark:bg-blue-950 dark:text-blue-300"><Icon className="h-4 w-4" aria-hidden="true" /></span>
                    <span className="min-w-0 text-sm">
                      <span className="block font-semibold text-slate-900 dark:text-white">{title}</span>
                      <span className="mt-0.5 block leading-6 text-slate-500">{text}</span>
                    </span>
                  </li>
                ))}
              </ol>
              <Link to="/help/prepare-your-extract" className="mt-5 inline-flex items-center gap-1 text-sm font-semibold text-[#004FCD] hover:underline dark:text-blue-400">How to prepare your extract <ArrowRight className="h-3.5 w-3.5" /></Link>
            </div>
            {sheets.length > 0 && (
              <div className={`${card} lg:col-span-2`}>
                <h3 className="m-0 text-[15px] font-semibold">Loaded tabs</h3>
                <ul className="mt-2 divide-y divide-slate-100 dark:divide-slate-800">
                  {sheets.map((s) => (
                    <li key={s.id} className="flex items-center gap-3 py-2 text-sm">
                      <FileSpreadsheet className="h-4 w-4 text-blue-600" />
                      <span className="font-medium">{s.name}</span>
                      <span className="text-slate-500">{s.rows.length.toLocaleString()} rows · {s.columns.length} columns</span>
                      <Button variant="ghost" size="icon" className="ml-auto h-7 w-7" aria-label={`Remove ${s.name}`} onClick={() => setSheets((x) => x.filter((y) => y.id !== s.id))}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {step === 'map' && result && (
          <MappingStep sheets={sheets} mapping={mapping} roles={result.data.sheetRoles} tabInfo={tabInfo} aiStatus={aiStatus} onChange={setColumn} onAi={refineWithAi} aiBusy={busy === 'ai'} />
        )}
        {step === 'cleanse' && result && (
          <ReviewStep
            result={result}
            picklistRows={picklistRows}
            onSetPicklist={setPicklistCode}
            onTranslateWithAi={translateValuesWithAi}
            aiBusy={busy === 'values'}
            aiStatus={valuesAiStatus}
          />
        )}
        {step === 'export' && result && <ExportStep result={result} settings={settings} onDownload={download} onDownloadWorkbook={downloadWorkbook} busy={busy === 'zip'} />}
      </div>

      {sheets.length > 0 && stepIdx < STEPS.length - 1 && step !== 'upload' && (
        <div className="mt-6 flex justify-end">
          <Button className="h-11 bg-[#004FCD] px-5 hover:bg-[#0043ad]" onClick={() => setStep(STEPS[stepIdx + 1][0])}>
            Next: {STEPS[stepIdx + 1][1]} <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
