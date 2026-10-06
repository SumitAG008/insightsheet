import { useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  AlertTriangle, ArrowLeft, ArrowRight, ArrowRightLeft, BarChart3, BookOpen, ChevronRight, CreditCard, Database, FileSpreadsheet, FileText, Info, Lightbulb, Rocket, Search, Sparkles,
} from 'lucide-react';
import Logo from '@/components/branding/Logo';
import { ARTICLES } from '@/lib/help/content';
import { CATEGORIES, anchorId, formatUpdated, groupByCategory, neighbours, plainText, searchArticles } from '@/lib/help/articles';
import { PRODUCT } from '@/lib/seo';

const CATEGORY_ICONS = {
  'getting-started': Rocket,
  'ai-assistant': Sparkles,
  'spreadsheets-and-analysis': FileSpreadsheet,
  'pdf-and-documents': FileText,
  'data-and-integrations': Database,
  'unified-reporting': BarChart3,
  migration: ArrowRightLeft,
  'account-and-billing': CreditCard,
};

const hastText = (node) => (node?.type === 'text' ? node.value : (node?.children || []).map(hastText).join(''));
const isSignedIn = () => {
  try {
    return Boolean(localStorage.getItem('auth_token'));
  } catch {
    return false;
  }
};

function setHead(title, description) {
  document.title = title;
  const meta = document.querySelector('meta[name="description"]');
  if (meta && description) meta.setAttribute('content', description);
}

/* ---------- Markdown styling ---------- */

const CALLOUTS = {
  tip: { Icon: Lightbulb, box: 'border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/40', icon: 'text-emerald-600' },
  note: { Icon: Info, box: 'border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950/40', icon: 'text-blue-600' },
  important: { Icon: AlertTriangle, box: 'border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/40', icon: 'text-amber-600' },
};

function MdLink({ href = '', children }) {
  if (href.startsWith('/')) return <Link to={href} className="font-medium text-[#004FCD] underline decoration-blue-200 underline-offset-2 hover:decoration-[#004FCD] dark:text-blue-400">{children}</Link>;
  if (href.startsWith('#')) return <a href={href} className="font-medium text-[#004FCD] dark:text-blue-400">{children}</a>;
  return <a href={href} target="_blank" rel="noopener noreferrer" className="font-medium text-[#004FCD] underline decoration-blue-200 underline-offset-2 dark:text-blue-400">{children}</a>;
}
MdLink.propTypes = { href: PropTypes.string, children: PropTypes.node };

const MD = {
  h2: ({ node, children }) => {
    const id = anchorId(plainText(hastText(node)));
    return <h2 id={id} className="group mt-10 scroll-mt-24 border-t border-slate-200 pt-8 text-xl font-semibold tracking-tight text-slate-900 first:mt-0 first:border-0 first:pt-0 dark:border-slate-800 dark:text-white"><a href={`#${id}`} className="no-underline">{children}</a></h2>;
  },
  h3: ({ children }) => <h3 className="mt-7 text-base font-semibold text-slate-900 dark:text-white">{children}</h3>,
  p: ({ children }) => <p className="mt-4 leading-7 text-slate-700 dark:text-slate-300">{children}</p>,
  ul: ({ children }) => <ul className="mt-4 list-disc space-y-2 pl-6 leading-7 text-slate-700 marker:text-slate-400 dark:text-slate-300">{children}</ul>,
  ol: ({ children }) => <ol className="help-steps mt-5 space-y-3 leading-7 text-slate-700 dark:text-slate-300">{children}</ol>,
  li: ({ children }) => <li className="pl-1">{children}</li>,
  strong: ({ children }) => <strong className="font-semibold text-slate-900 dark:text-white">{children}</strong>,
  a: MdLink,
  code: ({ children }) => <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[0.85em] text-slate-800 dark:bg-slate-800 dark:text-slate-200">{children}</code>,
  pre: ({ children }) => <pre className="mt-4 overflow-x-auto rounded-xl bg-slate-900 p-4 text-sm text-slate-100 [&_code]:bg-transparent [&_code]:p-0 [&_code]:text-slate-100">{children}</pre>,
  blockquote: ({ node, children }) => {
    const kind = (hastText(node).trim().match(/^(tip|note|important)\b/i)?.[1] || 'note').toLowerCase();
    const { Icon, box, icon } = CALLOUTS[kind];
    return (
      <div className={`mt-5 flex gap-3 rounded-xl border px-4 py-3 ${box}`}>
        <Icon className={`mt-1 h-4 w-4 flex-none ${icon}`} aria-hidden="true" />
        <div className="min-w-0 [&>p:first-child]:mt-0 [&>p]:mt-2">{children}</div>
      </div>
    );
  },
  table: ({ children }) => <div className="mt-5 overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800"><table className="w-full border-collapse text-left text-sm">{children}</table></div>,
  thead: ({ children }) => <thead className="bg-slate-50 text-slate-900 dark:bg-slate-900 dark:text-white">{children}</thead>,
  th: ({ children }) => <th className="border-b border-slate-200 px-3 py-2.5 font-semibold dark:border-slate-800">{children}</th>,
  td: ({ children }) => <td className="border-b border-slate-100 px-3 py-2.5 align-top text-slate-700 dark:border-slate-800 dark:text-slate-300">{children}</td>,
  hr: () => <hr className="my-8 border-slate-200 dark:border-slate-800" />,
};

/* ---------- page parts ---------- */

function TopBar() {
  const signedIn = isSignedIn();
  return (
    <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/90 backdrop-blur dark:border-slate-800 dark:bg-slate-950/90">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link to="/help" className="flex items-center gap-3" aria-label="Help Center home">
          <Logo size="small" showText />
          <span className="hidden h-5 w-px bg-slate-200 sm:block dark:bg-slate-700" />
          <span className="hidden text-sm font-semibold text-slate-700 sm:block dark:text-slate-200">Help Center</span>
        </Link>
        <nav className="flex items-center gap-2 text-sm">
          <Link to="/pricing" className="hidden rounded-lg px-3 py-2 font-medium text-slate-600 hover:text-slate-900 sm:block dark:text-slate-300">Pricing</Link>
          <Link to={signedIn ? '/dashboard' : '/login'} className="rounded-lg bg-[#004FCD] px-3.5 py-2 font-semibold text-white shadow-sm hover:bg-[#0043ad]">
            {signedIn ? 'Open the app' : 'Sign in'}
          </Link>
        </nav>
      </div>
    </header>
  );
}

function SearchBox({ value, onChange, large = false }) {
  return (
    <label className={`relative block ${large ? 'mx-auto max-w-2xl' : ''}`}>
      <span className="sr-only">Search the Help Center</span>
      <Search className={`pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 ${large ? 'h-5 w-5' : 'h-4 w-4'}`} aria-hidden="true" />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search articles, e.g. “load into SuccessFactors”"
        className={`w-full rounded-xl border border-slate-200 bg-white text-slate-900 shadow-sm outline-none placeholder:text-slate-400 focus:border-[#004FCD] focus:ring-4 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:focus:ring-blue-950 ${large ? 'py-4 pl-12 pr-4 text-base' : 'py-2.5 pl-10 pr-3 text-sm'}`}
      />
    </label>
  );
}
SearchBox.propTypes = { value: PropTypes.string.isRequired, onChange: PropTypes.func.isRequired, large: PropTypes.bool };

function ResultList({ results, query }) {
  if (!results.length) {
    return <p className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500 dark:border-slate-700">No articles match “{query}”. Try fewer or different words.</p>;
  }
  return (
    <ul className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200 bg-white dark:divide-slate-800 dark:border-slate-800 dark:bg-slate-900">
      {results.map((a) => (
        <li key={a.slug}>
          <Link to={`/help/${a.slug}`} className="flex items-start gap-3 px-5 py-4 hover:bg-slate-50 dark:hover:bg-slate-800/60">
            <BookOpen className="mt-0.5 h-4 w-4 flex-none text-[#004FCD]" aria-hidden="true" />
            <span className="min-w-0">
              <span className="block font-medium text-slate-900 dark:text-white">{a.title}</span>
              <span className="mt-0.5 block text-sm text-slate-500">{a.categoryName} · {a.summary}</span>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
ResultList.propTypes = { results: PropTypes.array.isRequired, query: PropTypes.string.isRequired };

function Home() {
  const [q, setQ] = useState('');
  const results = useMemo(() => searchArticles(ARTICLES, q), [q]);
  const groups = useMemo(() => groupByCategory(ARTICLES), []);
  const { hash } = useLocation();
  useEffect(() => setHead(`Help Center | ${PRODUCT}`, `Step-by-step guides for ${PRODUCT}: Unified Reporting, Migration, plans and team licences.`), []);
  useEffect(() => {
    if (hash) requestAnimationFrame(() => document.getElementById(hash.slice(1))?.scrollIntoView({ block: 'start', behavior: 'smooth' }));
  }, [hash]);

  return (
    <>
      <section className="relative overflow-hidden bg-[#004FCD] text-white">
        <div className="pointer-events-none absolute inset-0 opacity-30 [background:radial-gradient(60rem_30rem_at_80%_-10%,#DDFA21_0%,transparent_45%),radial-gradient(40rem_25rem_at_0%_120%,#02161A_0%,transparent_60%)]" />
        <div className="relative mx-auto max-w-7xl px-4 py-14 text-center sm:px-6 sm:py-20">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#DDFA21]">Help Center</p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-5xl" style={{ fontFamily: "'Space Grotesk', sans-serif", letterSpacing: '-0.03em' }}>How can we help?</h1>
          <p className="mx-auto mt-3 max-w-xl text-base text-blue-100 sm:text-lg">Step-by-step guides for every part of {PRODUCT}.</p>
          <div className="mt-8"><SearchBox value={q} onChange={setQ} large /></div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        {q.trim() ? (
          <div className="mx-auto max-w-3xl">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-500">{results.length} result{results.length === 1 ? '' : 's'}</h2>
            <ResultList results={results} query={q} />
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {groups.map((g) => {
              const Icon = CATEGORY_ICONS[g.id] || BookOpen;
              return (
                <section key={g.id} id={g.id} className="scroll-mt-24 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                  <div className="flex items-start gap-4">
                    <span className="grid h-11 w-11 flex-none place-items-center rounded-xl bg-blue-50 text-[#004FCD] dark:bg-blue-950 dark:text-blue-300"><Icon className="h-5 w-5" aria-hidden="true" /></span>
                    <div className="min-w-0">
                      <h2 className="text-lg font-semibold text-slate-900 dark:text-white">{g.name}</h2>
                      <p className="mt-1 text-sm text-slate-500">{g.description}</p>
                    </div>
                  </div>
                  <ul className="mt-5 space-y-1">
                    {g.articles.map((a) => (
                      <li key={a.slug}>
                        <Link to={`/help/${a.slug}`} className="group flex items-center justify-between gap-3 rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 hover:text-[#004FCD] dark:text-slate-300 dark:hover:bg-slate-800">
                          <span>{a.title}</span>
                          <ChevronRight className="h-4 w-4 flex-none text-slate-300 group-hover:text-[#004FCD]" aria-hidden="true" />
                        </Link>
                      </li>
                    ))}
                  </ul>
                </section>
              );
            })}
          </div>
        )}
        {!ARTICLES.length && <p className="text-center text-slate-500">Articles are on their way.</p>}
      </div>
    </>
  );
}

function Sidebar({ current }) {
  const groups = useMemo(() => groupByCategory(ARTICLES), []);
  return (
    <nav aria-label="Help articles" className="space-y-6 text-sm">
      {groups.map((g) => (
        <div key={g.id}>
          <h3 className="px-3 text-xs font-semibold uppercase tracking-wider text-slate-400">{g.name}</h3>
          <ul className="mt-2 space-y-0.5">
            {g.articles.map((a) => (
              <li key={a.slug}>
                <Link
                  to={`/help/${a.slug}`}
                  aria-current={a.slug === current ? 'page' : undefined}
                  className={`block rounded-lg px-3 py-1.5 ${a.slug === current ? 'bg-blue-50 font-semibold text-[#004FCD] dark:bg-blue-950 dark:text-blue-300' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-white'}`}
                >
                  {a.title}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  );
}
Sidebar.propTypes = { current: PropTypes.string };

function Article({ article }) {
  const [q, setQ] = useState('');
  const results = useMemo(() => searchArticles(ARTICLES, q), [q]);
  const { prev, next } = neighbours(ARTICLES, article.slug);
  useEffect(() => {
    setHead(`${article.title} | ${PRODUCT} Help`, article.summary);
    window.scrollTo(0, 0);
  }, [article]);

  return (
    <div className="mx-auto grid max-w-7xl grid-cols-1 gap-10 px-4 py-8 sm:px-6 lg:grid-cols-[240px_minmax(0,1fr)] xl:grid-cols-[240px_minmax(0,1fr)_200px]">
      <aside className="hidden lg:block">
        <div className="sticky top-24 max-h-[calc(100vh-7rem)] space-y-6 overflow-y-auto pb-8">
          <SearchBox value={q} onChange={setQ} />
          {q.trim() ? <ResultList results={results} query={q} /> : <Sidebar current={article.slug} />}
        </div>
      </aside>

      <article className="min-w-0 max-w-3xl">
        <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-sm text-slate-500">
          <Link to="/help" className="hover:text-[#004FCD]">Help Center</Link>
          <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
          <Link to={`/help#${article.category}`} className="hover:text-[#004FCD]">{article.categoryName}</Link>
        </nav>
        <h1 className="mt-4 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl dark:text-white" style={{ fontFamily: "'Space Grotesk', sans-serif", letterSpacing: '-0.02em' }}>{article.title}</h1>
        {article.summary && <p className="mt-3 text-lg leading-8 text-slate-600 dark:text-slate-400">{article.summary}</p>}
        {article.updated && <p className="mt-3 text-xs font-medium uppercase tracking-wider text-slate-400">Updated {formatUpdated(article.updated)}</p>}
        <div className="mt-8 border-t border-slate-200 pt-8 dark:border-slate-800">
          <Markdown remarkPlugins={[remarkGfm]} components={MD}>{article.body}</Markdown>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-3 border-t border-slate-200 pt-8 sm:grid-cols-2 dark:border-slate-800">
          {prev ? (
            <Link to={`/help/${prev.slug}`} className="rounded-xl border border-slate-200 p-4 hover:border-[#004FCD] dark:border-slate-800">
              <span className="flex items-center gap-1 text-xs text-slate-500"><ArrowLeft className="h-3.5 w-3.5" />Previous</span>
              <span className="mt-1 block font-medium text-slate-900 dark:text-white">{prev.title}</span>
            </Link>
          ) : <span />}
          {next && (
            <Link to={`/help/${next.slug}`} className="rounded-xl border border-slate-200 p-4 text-right hover:border-[#004FCD] dark:border-slate-800">
              <span className="flex items-center justify-end gap-1 text-xs text-slate-500">Next<ArrowRight className="h-3.5 w-3.5" /></span>
              <span className="mt-1 block font-medium text-slate-900 dark:text-white">{next.title}</span>
            </Link>
          )}
        </div>
        <p className="mt-8 text-sm text-slate-500">
          Still stuck? Email <a href="mailto:support@meldra.ai" className="font-medium text-[#004FCD]">support@meldra.ai</a> and tell us which article you were following.
        </p>
      </article>

      {article.headings.length > 1 && (
        <aside className="hidden xl:block">
          <div className="sticky top-24">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">On this page</h3>
            <ul className="mt-3 space-y-2 border-l border-slate-200 text-sm dark:border-slate-800">
              {article.headings.map((h) => (
                <li key={h.id}><a href={`#${h.id}`} className="-ml-px block border-l border-transparent pl-3 text-slate-500 hover:border-[#004FCD] hover:text-slate-900 dark:hover:text-white">{h.text}</a></li>
              ))}
            </ul>
          </div>
        </aside>
      )}
    </div>
  );
}
Article.propTypes = { article: PropTypes.object.isRequired };

function NotFound() {
  const navigate = useNavigate();
  useEffect(() => setHead(`Article not found | ${PRODUCT} Help`), []);
  return (
    <div className="mx-auto max-w-xl px-4 py-24 text-center">
      <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">We couldn’t find that article</h1>
      <p className="mt-2 text-slate-500">It may have moved. Browse the Help Center or search for it.</p>
      <button type="button" onClick={() => navigate('/help')} className="mt-6 rounded-lg bg-[#004FCD] px-4 py-2 font-semibold text-white">Go to the Help Center</button>
    </div>
  );
}

export default function HelpCenter() {
  const { slug } = useParams();
  const article = slug ? ARTICLES.find((a) => a.slug === slug.toLowerCase()) : null;
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <TopBar />
      <main>{!slug ? <Home /> : article ? <Article article={article} /> : <NotFound />}</main>
      <footer className="border-t border-slate-200 py-8 text-center text-sm text-slate-500 dark:border-slate-800">
        <div className="flex flex-wrap justify-center gap-x-5 gap-y-2">
          {CATEGORIES.map((c) => <Link key={c.id} to={`/help#${c.id}`} className="hover:text-slate-900 dark:hover:text-white">{c.name}</Link>)}
          <Link to="/terms" className="hover:text-slate-900 dark:hover:text-white">Terms</Link>
          <Link to="/privacy" className="hover:text-slate-900 dark:hover:text-white">Privacy</Link>
        </div>
      </footer>
    </div>
  );
}
