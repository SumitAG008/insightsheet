import PropTypes from 'prop-types';
import { Link, useParams } from 'react-router-dom';
import { ArrowRight, Briefcase, FileSpreadsheet } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { SOLUTIONS, SOLUTIONS_BY_ID, STATUS_LABELS } from '@/lib/solutions';
import { SAMPLES } from '@/lib/showcase';

const STATUS_STYLES = {
  available: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300',
  beta: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
  planned: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
};

const SALES_EMAIL = 'sales@meldra.ai';

function UseCase({ sector, useCase }) {
  const interest = `mailto:${SALES_EMAIL}?subject=${encodeURIComponent(`Interested: ${sector.name} - ${useCase.title}`)}`;
  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-3">
          <CardTitle className="text-base text-slate-900 dark:text-slate-100">{useCase.title}</CardTitle>
          <Badge className={`shrink-0 ${STATUS_STYLES[useCase.status]}`}>{STATUS_LABELS[useCase.status]}</Badge>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col flex-1 gap-3 text-sm">
        <p className="text-slate-600 dark:text-slate-400">{useCase.problem}</p>
        <p className="text-slate-800 dark:text-slate-200">{useCase.delivers}</p>
        <div className="mt-auto pt-1">
          {useCase.to ? (
            <Link to={useCase.to} className="inline-flex items-center gap-1 font-semibold text-blue-700 dark:text-blue-400 hover:underline">
              Open <ArrowRight className="w-4 h-4" />
            </Link>
          ) : (
            <a href={interest} className="inline-flex items-center gap-1 font-semibold text-slate-700 dark:text-slate-300 hover:underline">
              Register interest <ArrowRight className="w-4 h-4" />
            </a>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

UseCase.propTypes = {
  sector: PropTypes.shape({ name: PropTypes.string.isRequired }).isRequired,
  useCase: PropTypes.shape({
    title: PropTypes.string.isRequired,
    problem: PropTypes.string.isRequired,
    delivers: PropTypes.string.isRequired,
    status: PropTypes.oneOf(['available', 'beta', 'planned']).isRequired,
    to: PropTypes.string,
  }).isRequired,
};

function SectorTabs({ active }) {
  return (
    <nav className="flex flex-wrap gap-2" aria-label="Sectors">
      {SOLUTIONS.map((s) => (
        <Link
          key={s.id}
          to={`/solutions/${s.id}`}
          className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
            active === s.id
              ? 'bg-blue-600 border-blue-600 text-white'
              : 'border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          {s.name}
        </Link>
      ))}
    </nav>
  );
}

SectorTabs.propTypes = { active: PropTypes.string };

export default function Solutions() {
  const { sector: sectorId } = useParams();
  const sector = sectorId ? SOLUTIONS_BY_ID[sectorId] : null;
  const sample = sector ? SAMPLES.find((x) => x.solution === sector.id) : null;

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl space-y-6">
      <div className="flex items-center gap-3">
        <Briefcase className="w-7 h-7 text-blue-600" />
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{sector ? sector.name : 'Solutions'}</h1>
      </div>
      <p className="text-slate-600 dark:text-slate-400 max-w-3xl">
        {sector
          ? sector.summary
          : 'The same meldra engine, set up for the work each sector does every month. Available means the tool does the job today; Beta means it works and is still being tested on real files; Planned is on the roadmap.'}
      </p>

      <SectorTabs active={sector?.id} />

      {sectorId && !sector && <p className="text-slate-600 dark:text-slate-400">That sector isn&apos;t listed. Choose one above.</p>}

      {sample && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-blue-200 dark:border-blue-900 bg-blue-50/70 dark:bg-blue-950/30 px-4 py-3">
          <FileSpreadsheet className="h-5 w-5 text-blue-700 dark:text-blue-300 shrink-0" />
          <p className="text-sm text-slate-800 dark:text-slate-200 flex-1 min-w-[220px]">
            <span className="font-semibold">Try it on sample data:</span> {sample.company} (fictional). {sample.summary}
          </p>
          <Link to={`/workbench?sample=${sample.id}`} className="inline-flex items-center gap-1 text-sm font-medium text-blue-700 dark:text-blue-300">
            Open in Workbench <ArrowRight className="h-4 w-4" />
          </Link>
          <Link to={`/showcase#${sample.id}`} className="text-sm text-blue-700 dark:text-blue-300 underline underline-offset-2">
            Demo script
          </Link>
        </div>
      )}

      {sector ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sector.useCases.map((u) => (
            <UseCase key={u.title} sector={sector} useCase={u} />
          ))}
        </div>
      ) : (
        !sectorId && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {SOLUTIONS.map((s) => {
              const ready = s.useCases.filter((u) => u.status !== 'planned').length;
              return (
                <Link key={s.id} to={`/solutions/${s.id}`} className="block group">
                  <Card className="h-full transition-shadow group-hover:shadow-lg">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg text-slate-900 dark:text-slate-100">{s.name}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm">
                      <p className="text-slate-600 dark:text-slate-400">{s.summary}</p>
                      <p className="text-slate-800 dark:text-slate-200 font-medium">
                        {ready} of {s.useCases.length} use cases available or in beta
                      </p>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        )
      )}
    </div>
  );
}
