// Research: case-law search in the allowed sources, citation checking for drafts, old ↔ new criminal law,
// and questions about the firm's own diary. The country follows the firm's profile but can be switched.
import { useState } from 'react';
import PropTypes from 'prop-types';
import { toast } from 'sonner';
import { ExternalLink, Search, Sparkles } from 'lucide-react';
import { legalApi } from '@/lib/legal/api';
import { Btn, Card, Chip, Empty, SectionTitle, TextArea, TextInput, useLegal } from './shared';

const STATUS_STYLE = {
  verified: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200',
  not_verified: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200',
  not_found: 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200',
  format_problem: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200',
};

function CaseLaw({ country }) {
  const { t, lang } = useLegal();
  const [q, setQ] = useState('');
  const [res, setRes] = useState(null);
  const [busy, setBusy] = useState(false);
  const [summary, setSummary] = useState({});
  const go = async (e) => {
    e?.preventDefault();
    if (q.trim().length < 2) return;
    setBusy(true);
    try {
      setRes(await legalApi.research(q.trim(), country));
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };
  const summarise = async (r) => {
    setSummary((s) => ({ ...s, [r.url]: { loading: true } }));
    try {
      const out = await legalApi.summarise({ url: r.url, title: r.title, language: lang });
      setSummary((s) => ({ ...s, [r.url]: out }));
    } catch (err) {
      setSummary((s) => ({ ...s, [r.url]: { error: err.message } }));
    }
  };
  return (
    <div className="space-y-3">
      <form onSubmit={go} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-3.5 text-slate-400" />
          <TextInput className="pl-9" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('research_query')} />
        </div>
        <Btn type="submit" disabled={busy}>{busy ? t('loading') : t('search')}</Btn>
      </form>
      {res ? (
        <>
          {res.searched?.length ? <p className="text-xs text-slate-500">{t('research_searched')}: {res.searched.join(', ')}</p> : <p className="text-xs text-slate-500">{t('research_no_live')}</p>}
          {res.errors?.map((e) => <p key={e} className="text-xs text-amber-700">{e}</p>)}
          <ul className="space-y-2">
            {res.results.map((r) => (
              <li key={r.url || r.title}>
                <Card className="!p-3">
                  <a href={r.url} target="_blank" rel="noreferrer" className="font-semibold text-sm text-blue-700 dark:text-blue-400 hover:underline inline-flex gap-1">{r.title}<ExternalLink className="w-3.5 h-3.5 mt-0.5 shrink-0" /></a>
                  <div className="text-xs text-slate-500">{[r.citation, r.court, r.date, r.source].filter(Boolean).join(' · ')}</div>
                  {r.snippet ? <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">{r.snippet}</p> : null}
                  {r.source === 'Find Case Law' ? (
                    <div className="mt-2">
                      {!summary[r.url] ? <Btn variant="secondary" className="!py-1.5" onClick={() => summarise(r)}><Sparkles className="w-3.5 h-3.5" />{t('summarise')}</Btn> : null}
                      {summary[r.url]?.loading ? <p className="text-xs text-slate-500">{t('loading')}</p> : null}
                      {summary[r.url]?.error ? <p className="text-xs text-red-600">{summary[r.url].error}</p> : null}
                      {summary[r.url]?.summary ? (
                        <div className="text-sm mt-1 space-y-1">
                          <p className="whitespace-pre-wrap">{summary[r.url].summary}</p>
                          {summary[r.url].holding ? <p><b>Holding:</b> {summary[r.url].holding}</p> : null}
                          {(summary[r.url].key_paragraphs || []).map((k) => <blockquote key={k.quote} className="border-l-2 border-slate-300 pl-2 text-xs text-slate-600 dark:text-slate-300">{k.para ? `[${k.para}] ` : ''}“{k.quote}”</blockquote>)}
                          <p className="text-xs text-slate-500">{summary[r.url].note}</p>
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </Card>
              </li>
            ))}
          </ul>
          <div>
            <SectionTitle>{t('research_more')}</SectionTitle>
            <div className="flex flex-wrap gap-2">
              {res.more.map((l) => <a key={l.url} href={l.url} target="_blank" rel="noreferrer" className="text-sm px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800 inline-flex items-center gap-1">{l.label}<ExternalLink className="w-3 h-3" /></a>)}
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}

CaseLaw.propTypes = { country: PropTypes.string.isRequired };

function CitationChecker() {
  const { t } = useLegal();
  const [text, setText] = useState('');
  const [live, setLive] = useState(true);
  const [res, setRes] = useState(null);
  const [busy, setBusy] = useState(false);
  const go = async () => {
    setBusy(true);
    try {
      setRes(await legalApi.checkCitations(text, live));
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="space-y-3">
      <p className="text-sm text-slate-600 dark:text-slate-300">{t('citations_hint')}</p>
      <TextArea rows={7} value={text} onChange={(e) => setText(e.target.value)} placeholder="… (1973) 4 SCC 225 … [2023] UKSC 42 …" />
      <div className="flex items-center justify-between gap-2">
        <label className="text-sm inline-flex items-center gap-2"><input type="checkbox" checked={live} onChange={(e) => setLive(e.target.checked)} /> {t('citations_live')}</label>
        <Btn onClick={go} disabled={busy || !text.trim()}>{busy ? t('loading') : t('citations_go')}</Btn>
      </div>
      {res ? (
        <div className="space-y-2">
          {!res.citations.length ? <Empty>{t('none')}</Empty> : null}
          {res.citations.map((c) => (
            <Card key={c.normalised} className="!p-3">
              <div className="flex items-start justify-between gap-2">
                <a href={c.check_url} target="_blank" rel="noreferrer" className="font-mono text-sm text-blue-700 dark:text-blue-400 hover:underline">{c.normalised}</a>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full shrink-0 ${STATUS_STYLE[c.status]}`}>{t(`c_${c.status}`)}</span>
              </div>
              <div className="text-xs text-slate-500">{c.type}{c.count > 1 ? ` · ×${c.count}` : ''}{c.source ? ` · ${c.source}` : ''}</div>
              {c.issues?.length ? <ul className="text-xs text-amber-700 dark:text-amber-300 list-disc pl-5 mt-1">{c.issues.map((i) => <li key={i}>{i}</li>)}</ul> : null}
            </Card>
          ))}
          {res.statutes?.length ? (
            <Card className="!p-3">
              <div className="text-sm font-semibold mb-1">{t('statutes_found')}</div>
              <ul className="text-sm">{res.statutes.map((s) => <li key={s.old_act + s.old_section}>{s.old_act} {s.old_section} ↔ <b>{s.new_act} {s.new_section}</b> · {s.subject}</li>)}</ul>
            </Card>
          ) : null}
          <p className="text-xs text-slate-500">{res.note}</p>
        </div>
      ) : null}
    </div>
  );
}

function StatuteConverter() {
  const { t } = useLegal();
  const [q, setQ] = useState('');
  const [res, setRes] = useState(null);
  const go = async (e) => {
    e?.preventDefault();
    if (!q.trim()) return;
    try {
      setRes(await legalApi.statutes(q.trim()));
    } catch (err) {
      toast.error(err.message);
    }
  };
  return (
    <div className="space-y-3">
      <form onSubmit={go} className="flex gap-2">
        <TextInput value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('statute_hint')} />
        <Btn type="submit">{t('search')}</Btn>
      </form>
      {res ? (
        <>
          {!res.results.length ? <Empty>{t('none')}</Empty> : null}
          <ul className="divide-y divide-slate-200 dark:divide-slate-800 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
            {res.results.map((r) => (
              <li key={r.old_act + r.old_section} className="px-3 py-2 text-sm flex flex-wrap justify-between gap-2">
                <span><b>{r.old_act} {r.old_section}</b> → <b className="text-blue-700 dark:text-blue-400">{r.new_act} {r.new_section}</b></span>
                <span className="text-slate-500">{r.subject}</span>
              </li>
            ))}
          </ul>
          <p className="text-xs text-slate-500">{res.note}</p>
        </>
      ) : null}
    </div>
  );
}

function AskDiary() {
  const { t, lang } = useLegal();
  const [q, setQ] = useState('');
  const [res, setRes] = useState(null);
  const [busy, setBusy] = useState(false);
  const { openMatter } = useLegal();
  const go = async (question) => {
    const text = (question ?? q).trim();
    if (text.length < 2) return;
    setQ(text);
    setBusy(true);
    try {
      setRes(await legalApi.ask(text, lang));
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <TextInput value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && go()} placeholder={t('ask_hint')} />
        <Btn onClick={() => go()} disabled={busy}><Sparkles className="w-4 h-4" />{busy ? '…' : t('ask_go')}</Btn>
      </div>
      {res ? (
        <Card>
          <p className="text-sm whitespace-pre-wrap text-slate-800 dark:text-slate-100">{res.answer}</p>
          {res.matter_ids?.length ? <div className="mt-2 flex flex-wrap gap-2">{res.matter_ids.map((id) => <Chip key={id} onClick={() => openMatter(id)}>#{id}</Chip>)}</div> : null}
          {res.follow_ups?.length ? <div className="mt-3 flex flex-wrap gap-2">{res.follow_ups.map((f) => <Chip key={f} onClick={() => go(f)}>{f}</Chip>)}</div> : null}
        </Card>
      ) : null}
      <p className="text-xs text-slate-500">{t('ai_note')}</p>
    </div>
  );
}

export function ResearchTab() {
  const { t, country, countries } = useLegal();
  const [view, setView] = useState('caselaw');
  const [rc, setRc] = useState(country);
  const tools = [
    ['caselaw', t('research_caselaw')],
    ['citations', t('citations_title')],
    ...(rc === 'IN' ? [['statutes', 'IPC → BNS']] : []),
    ['ask', t('ask_title')],
  ];
  return (
    <div className="space-y-4">
      <div className="flex gap-2 overflow-x-auto pb-1">
        {tools.map(([k, label]) => <Chip key={k} active={view === k} onClick={() => setView(k)}>{label}</Chip>)}
      </div>
      {view === 'caselaw' || view === 'statutes' ? (
        <div className="flex gap-2 items-center text-xs text-slate-500">
          {t('country')}:
          {countries.map((c) => <Chip key={c.code} active={rc === c.code} onClick={() => { setRc(c.code); if (c.code !== 'IN' && view === 'statutes') setView('caselaw'); }}>{c.name}</Chip>)}
        </div>
      ) : null}
      {view === 'caselaw' ? <CaseLaw key={rc} country={rc} /> : null}
      {view === 'citations' ? <CitationChecker /> : null}
      {view === 'statutes' ? (
        <>
          <SectionTitle>{t('statute_title')}</SectionTitle>
          <StatuteConverter />
        </>
      ) : null}
      {view === 'ask' ? <AskDiary /> : null}
    </div>
  );
}
