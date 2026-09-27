import { useEffect, useMemo, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { ArrowRight, Check, Download, FileSpreadsheet, Loader2, RotateCcw, Settings2, Sparkles, Trash2, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { backendApi } from '@/api/backendClient';
import MappingStep from '@/components/migration/MappingStep';
import ReviewStep from '@/components/migration/ReviewStep';
import ExportStep from '@/components/migration/ExportStep';
import { CONCEPTS } from '@/lib/migration/concepts';
import { mapSheets, picklistValues, runMigration } from '@/lib/migration/engine';
import { buildZip } from '@/lib/migration/exporter';
import { buildWorkdaySample, downloadWorkdaySampleXlsx } from '@/lib/migration/sampleWorkday';
import { DEFAULT_SETTINGS, SUCCESSFACTORS } from '@/lib/migration/targets/successfactors';
import { parseFile } from '@/lib/unifiedReporting/model';
import * as store from '@/lib/unifiedReporting/storage';

const STEPS = [
  ['upload', 'Upload extract'],
  ['map', 'Map fields'],
  ['cleanse', 'Cleanse & validate'],
  ['export', 'Load order & export'],
];
const STORE_KEY = 'migration';
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
      {field('hireEventReason', 'Hire event reason', 'Event reason code for the first job record.')}
      {field('changeEventReason', 'Job change event reason', 'For later job history records.')}
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
        setStep(saved.step || 'map');
      }
      setLoaded(true);
    })();
  }, []);
  useEffect(() => {
    if (loaded) store.save(STORE_KEY, { sheets, mapping, settings, picklists, step });
  }, [loaded, sheets, mapping, settings, picklists, step]);

  const result = useMemo(() => (sheets.length ? runMigration(SUCCESSFACTORS, sheets, mapping, settings, picklists) : null), [sheets, mapping, settings, picklists]);
  const picklistRows = useMemo(() => (sheets.length ? picklistValues(sheets, mapping, picklists) : {}), [sheets, mapping, picklists]);

  const addSheets = (added) => {
    const next = [...sheets, ...added];
    setSheets(next);
    // Map only the new sheets; keep the user's choices on existing ones.
    setMapping((m) => ({ ...m, ...mapSheets(added) }));
    setStep('map');
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
    setSheets([]);
    setMapping(mapSheets(sample));
    setSheets(sample);
    setPicklists({});
    setStep('map');
  };

  const reset = () => {
    setSheets([]);
    setMapping({});
    setPicklists({});
    setSettings(DEFAULT_SETTINGS);
    setStep('upload');
  };

  const setColumn = (sheetId, col, concept) => setMapping((m) => ({
    ...m,
    [sheetId]: { ...(m[sheetId] || {}), [col]: concept ? { concept, confidence: 1, method: 'you' } : { concept: null, method: 'you' } },
  }));

  const refineWithAi = async () => {
    setBusy('ai');
    setMessage('');
    try {
      const out = await backendApi.migration.suggestMapping({
        sourceSystem: 'Workday',
        sheets: sheets.map((s) => ({ name: s.name, columns: s.columns.map((c) => c.name) })),
        concepts: CONCEPTS.map((c) => ({ id: c.id, label: `${c.label} (${c.group})` })),
      });
      let applied = 0;
      setMapping((m) => {
        const next = { ...m };
        for (const x of out.mappings || []) {
          const sheet = sheets.find((s) => s.name === x.sheet);
          const col = sheet?.columns.find((c) => c.name === x.column);
          if (!col) continue;
          const cur = next[sheet.id]?.[col.key];
          // Never override the user's own choices or confident rule matches.
          if (cur?.method === 'you' || (cur?.concept && cur.confidence >= 0.85)) continue;
          const taken = Object.entries(next[sheet.id] || {}).some(([k, v]) => k !== col.key && v?.concept === x.concept);
          if (taken) continue;
          next[sheet.id] = { ...(next[sheet.id] || {}), [col.key]: { concept: x.concept, confidence: Number(x.confidence) || 0.8, method: 'ai' } };
          applied++;
        }
        return next;
      });
      setMessage(applied ? `AI refined ${applied} column${applied > 1 ? 's' : ''}.` : 'AI agreed with the current mapping.');
    } catch {
      setMessage('The AI assistant is not available right now; the rule-based mapping is unchanged.');
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
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="m-0 text-2xl font-semibold tracking-tight">Next-Gen Migration</h1>
          <p className="mt-1 text-sm text-slate-500">
            <strong className="text-slate-700 dark:text-slate-200">Workday</strong> <ArrowRight className="inline h-3.5 w-3.5" /> <strong className="text-slate-700 dark:text-slate-200">SAP SuccessFactors Employee Central</strong> · Core HR · runs in your browser, employee data never leaves it
          </p>
        </div>
        <div className="flex gap-2">
          {sheets.length > 0 && <Button variant="outline" size="sm" onClick={() => setShowSettings(!showSettings)}><Settings2 className="mr-1.5 h-4 w-4" />Settings</Button>}
          {sheets.length > 0 && <Button variant="ghost" size="sm" onClick={reset}><RotateCcw className="mr-1.5 h-4 w-4" />Start over</Button>}
        </div>
      </div>

      {/* Stepper */}
      <ol className="mt-5 grid grid-cols-2 gap-2 md:grid-cols-4">
        {STEPS.map(([k, label], i) => {
          const done = i < stepIdx;
          const active = k === step;
          return (
            <li key={k}>
              <button
                type="button"
                disabled={!canGo(k)}
                onClick={() => setStep(k)}
                aria-current={active ? 'step' : undefined}
                className={`flex w-full items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left text-sm transition disabled:opacity-50 ${active ? 'border-blue-600 bg-blue-50 dark:bg-blue-950' : 'border-slate-200 bg-white hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900'}`}
              >
                <span className={`grid h-6 w-6 flex-none place-items-center rounded-full text-xs font-semibold ${active ? 'bg-blue-600 text-white' : done ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-200'}`}>
                  {done ? <Check className="h-3.5 w-3.5" /> : i + 1}
                </span>
                <span className="font-medium">{label}</span>
              </button>
            </li>
          );
        })}
      </ol>

      {showSettings && <div className="mt-4"><SettingsPanel settings={settings} onChange={(p) => setSettings((s) => ({ ...s, ...p }))} /></div>}
      {message && <p className="mt-4 rounded-lg bg-slate-100 px-3 py-2 text-sm dark:bg-slate-800" role="status">{message}</p>}

      <div className="mt-6">
        {step === 'upload' && (
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => { e.preventDefault(); onFiles([...e.dataTransfer.files]); }}
              className="rounded-2xl border-2 border-dashed border-slate-300 bg-white px-6 py-12 text-center dark:border-slate-700 dark:bg-slate-900"
            >
              <input ref={fileInput} type="file" multiple accept=".csv,.tsv,.xlsx,.xls" className="hidden" onChange={(e) => { onFiles([...e.target.files]); e.target.value = ''; }} />
              {busy === 'upload' ? <Loader2 className="mx-auto h-8 w-8 animate-spin text-blue-600" /> : <Upload className="mx-auto h-8 w-8 text-blue-600" />}
              <h2 className="mt-3 text-xl font-semibold">Drop your Workday extract</h2>
              <p className="mx-auto mt-1 max-w-lg text-sm text-slate-500">
                One workbook with many tabs, or several CSVs: worker data, job history, compensation, addresses, terminations, org lists. Tab and column names don’t need to match anything.
              </p>
              <Button className="mt-5" onClick={() => fileInput.current?.click()} disabled={busy === 'upload'}>Choose files</Button>
              <div className="mt-6 flex flex-wrap justify-center gap-2">
                <Button variant="outline" onClick={loadSample}><Sparkles className="mr-2 h-4 w-4" />Try a sample Workday extract</Button>
                <Button variant="ghost" onClick={downloadWorkdaySampleXlsx}><Download className="mr-2 h-4 w-4" />Download the sample as Excel</Button>
              </div>
            </div>
            <div className={card}>
              <h3 className="m-0 text-[15px] font-semibold">How it works</h3>
              <ol className="mt-3 space-y-3 text-sm">
                <li><strong>1. Map.</strong> Every column is matched to a SuccessFactors field by name, synonyms and its values (<code>Legal_First_Name</code>, <code>Given_Name</code> → first name). Tabs are joined on the employee ID, with no VLOOKUPs.</li>
                <li><strong>2. Resolve.</strong> Legal entities, departments, locations and jobs are built first, including any referenced but missing, then people, jobs, contact details, pay and terminations.</li>
                <li><strong>3. Cleanse.</strong> Dates, genders, countries, FTEs and picklists are converted to the target’s rules, and every change is logged. A pre-flight check lists what SuccessFactors would reject.</li>
                <li><strong>4. Export.</strong> A ZIP of numbered CSVs in load order, with a README and reports.</li>
              </ol>
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
          <MappingStep sheets={sheets} mapping={mapping} roles={result.data.sheetRoles} onChange={setColumn} onAi={refineWithAi} aiBusy={busy === 'ai'} />
        )}
        {step === 'cleanse' && result && (
          <ReviewStep
            result={result}
            picklistRows={picklistRows}
            onSetPicklist={(type, key, code) => setPicklists((p) => ({ ...p, [type]: { ...(p[type] || {}), [key]: code } }))}
          />
        )}
        {step === 'export' && result && <ExportStep result={result} settings={settings} onDownload={download} busy={busy === 'zip'} />}
      </div>

      {sheets.length > 0 && stepIdx < STEPS.length - 1 && step !== 'upload' && (
        <div className="mt-6 flex justify-end">
          <Button onClick={() => setStep(STEPS[stepIdx + 1][0])}>
            Next: {STEPS[stepIdx + 1][1]} <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
