import { useState } from 'react';
import PropTypes from 'prop-types';
import { Button } from '@/components/ui/button';
import { AlertCircle, Download, FileText, Loader2 } from 'lucide-react';
import { fileRows } from '@/lib/migration/exporter';

const STAGE_TONE = {
  'Foundation data': 'bg-violet-50 text-violet-700 dark:bg-violet-950 dark:text-violet-300',
  People: 'bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300',
  Employment: 'bg-teal-50 text-teal-700 dark:bg-teal-950 dark:text-teal-300',
  Contact: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  Compensation: 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
};

function Preview({ file, settings }) {
  const rows = fileRows(file, settings);
  const head = rows[0];
  const body = rows.slice(settings.labelRow ? 2 : 1, (settings.labelRow ? 2 : 1) + 8);
  return (
    <div className="overflow-auto rounded-xl border border-slate-200 dark:border-slate-800">
      <table className="w-full border-collapse font-mono text-xs">
        <thead className="bg-slate-50 dark:bg-slate-800">
          <tr>{head.map((h) => <th key={h} className="whitespace-nowrap px-2.5 py-1.5 text-left font-medium">{h}</th>)}</tr>
        </thead>
        <tbody>
          {body.map((r, i) => (
            <tr key={i} className="border-t border-slate-100 dark:border-slate-800">
              {r.map((v, j) => <td key={j} className={`whitespace-nowrap px-2.5 py-1 ${v === '' ? 'text-slate-300' : ''}`}>{v === '' ? '·' : v}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
Preview.propTypes = { file: PropTypes.object.isRequired, settings: PropTypes.object.isRequired };

export default function ExportStep({ result, settings, onDownload, busy }) {
  const [selected, setSelected] = useState(result.files[0]?.entity.id);
  const current = result.files.find((f) => f.entity.id === selected) || result.files[0];
  const errorsFor = (label) => result.issues.filter((i) => i.severity === 'error' && i.entity === label).length;

  return (
    <div className="grid grid-cols-1 gap-5 xl:grid-cols-[380px_minmax(0,1fr)]">
      <aside className="space-y-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h3 className="m-0 text-[15px] font-semibold">Load order</h3>
          <p className="mt-1 text-sm text-slate-500">Each file only references files above it, so nothing is orphaned on load.</p>
          <ol className="mt-3 space-y-1">
            {result.files.map((f) => {
              const errs = errorsFor(f.entity.label);
              return (
                <li key={f.entity.id}>
                  <button
                    type="button"
                    onClick={() => setSelected(f.entity.id)}
                    aria-pressed={current?.entity.id === f.entity.id}
                    className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm ${current?.entity.id === f.entity.id ? 'bg-blue-50 dark:bg-blue-950' : 'hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                  >
                    <span className="grid h-6 w-6 flex-none place-items-center rounded-full bg-slate-900 text-xs font-semibold text-white dark:bg-slate-100 dark:text-slate-900">{f.order}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{f.entity.label}</span>
                      <span className="block truncate font-mono text-xs text-slate-500">{f.fileName}</span>
                    </span>
                    <span className={`flex-none rounded-full px-2 py-0.5 text-[11px] ${STAGE_TONE[f.entity.stage] || ''}`}>{f.rows.length}</span>
                    {errs > 0 && <span className="flex-none text-xs text-red-600">{errs}!</span>}
                  </button>
                </li>
              );
            })}
          </ol>
        </div>
      </aside>

      <section className="min-w-0 space-y-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex-1">
              <h3 className="m-0 text-lg font-semibold">Migration package</h3>
              <p className="mt-1 text-sm text-slate-500">
                {result.files.length} CSV files in load order, a README with the sequence, and reports of the mapping, every automatic fix and open issues.
              </p>
            </div>
            <Button size="lg" onClick={onDownload} disabled={busy}>
              {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
              Download ZIP
            </Button>
          </div>
          {result.counts.error > 0 && (
            <p className="mt-3 flex items-start gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800 dark:bg-red-950 dark:text-red-200">
              <AlertCircle className="mt-0.5 h-4 w-4 flex-none" />
              {result.counts.error} records would be rejected on import. You can download now (they’re listed in issues.csv), but fixing them first on the Cleanse step gives a clean load.
            </p>
          )}
          <p className="mt-3 text-xs text-slate-500">
            Column IDs follow the standard Employee Central import templates. Templates are generated per instance, so compare with the ones from Admin Center › Import Employee Data before loading. Direct push through the SuccessFactors OData API, with a dry-run first, comes with the API connector.
          </p>
        </div>

        {current && (
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-3 flex items-center gap-2">
              <FileText className="h-4 w-4 text-blue-600" />
              <h3 className="m-0 text-[15px] font-semibold">{current.fileName}</h3>
              <span className="text-sm text-slate-500">· {current.entity.label} · {current.rows.length} rows{current.entity.dependsOn.length ? ` · needs ${current.entity.dependsOn.filter((d) => result.files.some((f) => f.entity.id === d)).join(', ')}` : ''}</span>
            </div>
            <Preview file={current} settings={settings} />
          </div>
        )}
      </section>
    </div>
  );
}

ExportStep.propTypes = {
  result: PropTypes.object.isRequired,
  settings: PropTypes.object.isRequired,
  onDownload: PropTypes.func.isRequired,
  busy: PropTypes.bool,
};
