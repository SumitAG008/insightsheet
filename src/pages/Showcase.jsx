// Showcase: sample data from fictional companies in each sector meldra sells to, plus complex
// cases, each with a demo script and what the product shows. Public, so prospects can download the
// files and try them; the "Open in" links go to the tools (sign-in required there).
import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';
import { ArrowRight, Download, FileSpreadsheet, FlaskConical } from 'lucide-react';
import Logo from '@/components/branding/Logo';
import { Card, CardContent } from '@/components/ui/card';
import { COMPLEX_CASES, SAMPLES, TOOL_LINKS, sampleUrl } from '@/lib/showcase';

function FileLink({ file }) {
  const name = file.split('/').pop();
  return (
    <a
      href={sampleUrl(file)}
      download={name}
      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-1.5 text-sm text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
    >
      <Download className="h-4 w-4" />
      {name}
    </a>
  );
}
FileLink.propTypes = { file: PropTypes.string.isRequired };

function Steps({ title, items }) {
  return (
    <div className="space-y-1.5">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{title}</p>
      <ol className="list-decimal pl-5 space-y-1 text-sm text-slate-700 dark:text-slate-300">
        {items.map((s) => (
          <li key={s}>{s}</li>
        ))}
      </ol>
    </div>
  );
}
Steps.propTypes = { title: PropTypes.string.isRequired, items: PropTypes.arrayOf(PropTypes.string).isRequired };

function Seen({ items }) {
  return (
    <div className="rounded-xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/60 p-3 space-y-1">
      <p className="text-xs font-semibold uppercase tracking-wide text-blue-800 dark:text-blue-300">What you will see</p>
      <ul className="list-disc pl-5 space-y-1 text-sm text-slate-800 dark:text-slate-200">
        {items.map((s) => (
          <li key={s}>{s}</li>
        ))}
      </ul>
    </div>
  );
}
Seen.propTypes = { items: PropTypes.arrayOf(PropTypes.string).isRequired };

function OpenLink({ to, label }) {
  return (
    <Link to={to} className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700">
      {label}
      <ArrowRight className="h-4 w-4" />
    </Link>
  );
}
OpenLink.propTypes = { to: PropTypes.string.isRequired, label: PropTypes.string.isRequired };

export default function Showcase() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <div className="container mx-auto max-w-6xl px-4 py-8 space-y-10">
        <div className="flex items-center justify-between gap-4">
          <Link to="/" aria-label="meldra home">
            <Logo size="small" showText />
          </Link>
          <Link to="/workbench" className="text-sm font-semibold text-blue-700 hover:text-blue-800 dark:text-blue-400">
            Open Workbench
          </Link>
        </div>

        <header className="space-y-3 max-w-3xl">
          <h1 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white">See meldra on realistic data</h1>
          <p className="text-slate-600 dark:text-slate-400">
            Six fictional companies, one per sector, and five hard cases built to break spreadsheets and macros. Download any file
            and open it in meldra, or bring your own. Each script lists what you will see; those results are checked by our
            automated tests on every release, so the demo shows what the product does.
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-500">
            All companies, people and figures are invented. Answers to typed questions come from AI and should be checked; every
            other number is calculated.
          </p>
        </header>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-blue-600" /> Sector samples
          </h2>
          <div className="grid gap-5 lg:grid-cols-2">
            {SAMPLES.map((s) => (
              <Card key={s.id} id={s.id} className="flex flex-col">
                <CardContent className="py-5 space-y-4 flex-1 flex flex-col">
                  <div className="space-y-1">
                    <p className="text-xs font-semibold uppercase tracking-wide text-blue-700 dark:text-blue-400">{s.sector}</p>
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{s.company}</h3>
                    <p className="text-sm text-slate-600 dark:text-slate-400">{s.summary}</p>
                    <p className="text-xs text-slate-500">Tabs: {s.tabs.join(' · ')}</p>
                  </div>
                  <Steps title="Demo script" items={s.steps} />
                  <Seen items={s.youWillSee} />
                  <div className="mt-auto flex flex-wrap gap-2 pt-1">
                    <OpenLink to={`/workbench?sample=${s.id}`} label="Open in Workbench" />
                    <FileLink file={s.file} />
                    <Link to={`/solutions/${s.solution}`} className="inline-flex items-center px-2 py-1.5 text-sm text-blue-700 dark:text-blue-400 underline underline-offset-2">
                      {s.sector} solutions
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white flex items-center gap-2">
            <FlaskConical className="h-5 w-5 text-blue-600" /> Complex cases
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 max-w-3xl">
            The situations where hand-built spreadsheets and macros fail quietly. Each file has its problems planted on purpose, so
            you can check meldra finds all of them and nothing else.
          </p>
          <div className="grid gap-5 lg:grid-cols-2">
            {COMPLEX_CASES.map((c) => {
              const tool = TOOL_LINKS[c.tool];
              const to = c.tool === 'workbench' ? `/workbench?sample=${c.id}` : tool.to;
              return (
                <Card key={c.id} id={c.id} className="flex flex-col">
                  <CardContent className="py-5 space-y-4 flex-1 flex flex-col">
                    <div className="space-y-1">
                      <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{c.title}</h3>
                      <p className="text-sm text-slate-600 dark:text-slate-400">{c.problem}</p>
                    </div>
                    <Steps title="Demo script" items={c.steps} />
                    <Seen items={c.youWillSee} />
                    <div className="mt-auto flex flex-wrap gap-2 pt-1">
                      <OpenLink to={to} label={tool.label} />
                      {c.files.map((f) => (
                        <FileLink key={f} file={f} />
                      ))}
                      {c.link && (
                        <a href={c.link} className="inline-flex items-center px-2 py-1.5 text-sm text-blue-700 dark:text-blue-400 underline underline-offset-2">
                          Test pack and script
                        </a>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}
