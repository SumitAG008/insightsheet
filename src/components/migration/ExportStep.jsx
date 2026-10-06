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
  Payroll: 'bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300',
  'Carry-over': 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400',
};

const maskValue = (v) => (v.length <= 4 ? v : `${'•'.repeat(Math.min(8, v.length - 4))}${v.slice(-4)}`);

function Preview({ file, settings, target }) {
  const rows = fileRows(file, settings, target);
  // fileRows adds the label row only when the target uses one.
  const skip = rows.length - file.rows.length;
  const head = rows[0];
  const sensitive = file.entity.fields.map((f) => !!f.sensitive);
  const body = rows.slice(skip, skip + 8);
  return (
    <div className="overflow-auto rounded-xl border border-slate-200 dark:border-slate-800">
      <table className="w-full border-collapse font-mono text-xs">
        <thead className="bg-slate-50 dark:bg-slate-800">
          <tr>{head.map((h) => <th key={h} className="whitespace-nowrap px-2.5 py-1.5 text-left font-medium">{h}</th>)}</tr>
        </thead>
        <tbody>
          {body.map((r, i) => (
            <tr key={i} className="border-t border-slate-100 dark:border-slate-800">
              {r.map((v, j) => <td key={j} className={`whitespace-nowrap px-2.5 py-1 ${v === '' ? 'text-slate-300' : ''}`}>{v === '' ? '·' : sensitive[j] ? maskValue(v) : v}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
Preview.propTypes = { file: PropTypes.object.isRequired, settings: PropTypes.object.isRequired, target: PropTypes.object.isRequired };

const PACKAGE_TEXT = {
  csv: 'one CSV per file',
  eib: 'one EIB workbook (.xlsx) per Workday web service, with a tab per record type linked by Spreadsheet Key',
  hdl: 'the HDL .dat files in load order (hdl_upload/), plus a second load for terminations',
};

export default function ExportStep({ result, settings, target, onDownload, onDownloadWorkbook, busy }) {
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
                {result.files.length} files in load order. The ZIP holds {PACKAGE_TEXT[target.format] || PACKAGE_TEXT.csv}, plus a README with the load sequence and reports. The review workbook puts everything in one Excel file for checking with the business.
              </p>
            </div>
            <div className="flex flex-col items-stretch gap-2">
              <Button size="lg" onClick={onDownload} disabled={busy}>
                {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                Download ZIP for {target.short || target.label}
              </Button>
              <Button variant="outline" onClick={onDownloadWorkbook} disabled={busy}><FileText className="mr-2 h-4 w-4" />Review workbook (.xlsx)</Button>
            </div>
          </div>
          {result.counts.error > 0 && (
            <p className="mt-3 flex items-start gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800 dark:bg-red-950 dark:text-red-200">
              <AlertCircle className="mt-0.5 h-4 w-4 flex-none" />
              {result.counts.error} records would be rejected on import. You can download now (they’re listed in issues.csv), but fixing them first on the Cleanse step gives a clean load.
            </p>
          )}
          <p className="mt-3 text-xs text-slate-500">
            {{
              successfactors: 'Column IDs follow the standard Employee Central import templates. Templates are generated per instance, so compare with the ones from Admin Center › Import Employee Data before loading.',
              workday: 'Column names follow the Workday web service elements. Workday generates the exact EIB template per tenant: copy each tab into the template from Create EIB before loading, and check reference IDs against your tenant.',
              oracle: 'Attribute names follow the standard HDL business objects. Compare with View Business Objects in your pod (and add flexfields) before loading. SourceSystemIds are fixed per person, so reloads update rather than duplicate.',
              salesforce: 'Preview: field API names differ between orgs. Check them in Setup › Object Manager › Employee and rename the headers before loading with Bulk API (upsert on the external ID).',
            }[target.id]}
          </p>
        </div>

        {current && (
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-3 flex items-center gap-2">
              <FileText className="h-4 w-4 text-blue-600" />
              <h3 className="m-0 text-[15px] font-semibold">{current.fileName}</h3>
              <span className="text-sm text-slate-500">· {current.entity.label} · {current.rows.length} rows{current.entity.dependsOn.length ? ` · needs ${current.entity.dependsOn.filter((d) => result.files.some((f) => f.entity.id === d)).join(', ')}` : ''}</span>
            </div>
            {current.entity.mdf && <p className="mb-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:bg-amber-950 dark:text-amber-200">Payment Information is an MDF object: download its template from Import and Export Data in your instance and match these columns to it. Bank numbers are masked here and complete in the download.</p>}
            {current.entity.custom && <p className="mb-3 rounded-lg bg-slate-100 px-3 py-2 text-sm text-slate-700 dark:bg-slate-800 dark:text-slate-200">No standard {target.short || target.label} file for this data yet ({current.entity.reason?.toLowerCase()}). It is carried as-is so nothing is lost: load it into a custom object, or hand it to payroll or benefits.</p>}
            {current.entity.payroll && <p className="mb-3 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-900 dark:bg-rose-950 dark:text-rose-200">Year-to-date balances are loaded by payroll (Employee Central Payroll or your payroll provider), not by an Employee Central import. Map the wage types to your payroll’s codes on the Cleanse step.</p>}
            <Preview file={current} settings={settings} target={target} />
          </div>
        )}
      </section>
    </div>
  );
}

ExportStep.propTypes = {
  result: PropTypes.object.isRequired,
  settings: PropTypes.object.isRequired,
  target: PropTypes.object.isRequired,
  onDownload: PropTypes.func.isRequired,
  onDownloadWorkbook: PropTypes.func.isRequired,
  busy: PropTypes.bool,
};
