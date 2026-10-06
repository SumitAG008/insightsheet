// Ask meldra: say what you want in plain words, attach files if you have them, and meldra plans
// which tools to use and sets each one up for you. The planner sees file names and spreadsheet
// column headers only, never file contents.
import { useEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, ArrowUp, FileText, HelpCircle, Loader2, MessageSquare, Paperclip, Sparkles, X } from 'lucide-react';
import { backendApi } from '@/api/backendClient';
import { DEFAULT_ICON, TOOLS_BY_ID } from './toolCatalog';
import { setHandoff } from '@/lib/meldra/handoff';
import { readHeaders } from '@/lib/meldra/fileHeaders';

const EXAMPLES = [
  'Turn this sales workbook into a board presentation',
  'Compare my bank statement with the ledger and show what doesn’t match',
  'Revenue and headcount by department for the last 12 months',
  'Pull the line items out of these invoices into Excel',
  'Migrate our Oracle HR extract to SuccessFactors',
  'Collect the product table from a website into a spreadsheet',
];
const MAX_FILES = 10;

function Step({ step, n, files, onOpen, primary }) {
  const tool = TOOLS_BY_ID[step.tool];
  const Icon = tool?.icon || DEFAULT_ICON;
  return (
    <li className="flex items-start gap-3 rounded-xl border border-slate-200 p-3 dark:border-slate-700">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-blue-50 text-blue-700 dark:bg-slate-800 dark:text-blue-300"><Icon className="h-4 w-4" /></span>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold">{n}. {tool?.title || step.tool}</div>
        {step.why && <div className="text-sm text-slate-500">{step.why}</div>}
        {step.instruction && <div className="mt-1 rounded-md bg-slate-50 px-2 py-1 text-xs italic text-slate-600 dark:bg-slate-800 dark:text-slate-300">“{step.instruction}”</div>}
        {step.files.length > 0 && <div className="mt-1 text-xs text-slate-500">Uses {step.files.map((i) => files[i]?.name).filter(Boolean).join(', ')}</div>}
        {n > 1 && <div className="mt-1 text-xs text-slate-400">Uses what step {n - 1} gives you: download it there, then open this step.</div>}
      </div>
      <button
        type="button"
        onClick={() => onOpen(step)}
        aria-label={`Open ${tool?.title || step.tool}`}
        className={`shrink-0 rounded-lg px-3 py-1.5 text-sm font-medium ${primary ? 'bg-blue-600 text-white hover:bg-blue-700' : 'border border-slate-200 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800'}`}
      >
        Open <ArrowRight className="ml-1 inline h-3.5 w-3.5" />
      </button>
    </li>
  );
}
Step.propTypes = { step: PropTypes.object.isRequired, n: PropTypes.number.isRequired, files: PropTypes.array.isRequired, onOpen: PropTypes.func.isRequired, primary: PropTypes.bool };

export default function AskMeldra({ initialRequest = '', onDone, compact = false }) {
  const navigate = useNavigate();
  const [request, setRequest] = useState(initialRequest);
  const [files, setFiles] = useState([]);
  const [busy, setBusy] = useState(false);
  const [plan, setPlan] = useState(null);
  const [error, setError] = useState('');
  const [reply, setReply] = useState('');
  const fileInput = useRef(null);
  const asked = useRef('');

  useEffect(() => { setRequest(initialRequest); }, [initialRequest]);

  const addFiles = (list) => setFiles((cur) => [...cur, ...list].slice(0, MAX_FILES));

  const ask = async (text) => {
    const q = text.trim();
    if (!q || busy) return;
    asked.current = q;
    setBusy(true);
    setError('');
    setPlan(null);
    try {
      const meta = await Promise.all(files.map(async (f) => ({ name: f.name, type: (f.name.split('.').pop() || '').toLowerCase(), headers: await readHeaders(f) })));
      setPlan(await backendApi.assist.plan({ request: q, files: meta, page: window.location.pathname }));
    } catch (e) {
      setError(e.message || 'Ask meldra is unavailable right now. Try the tool search instead.');
    }
    setBusy(false);
  };

  const open = (step) => {
    const tool = TOOLS_BY_ID[step.tool];
    if (!tool) return;
    backendApi.assist.choose(asked.current.slice(0, 200), step.tool).catch(() => {});
    setHandoff({ path: tool.path, toolTitle: tool.title, files: step.files.map((i) => files[i]).filter(Boolean), instruction: step.instruction });
    onDone?.();
    navigate(tool.path);
  };

  const answerQuestion = (e) => {
    e.preventDefault();
    if (!reply.trim()) return;
    const next = `${asked.current}\nMore detail: ${reply.trim()}`;
    setRequest(next);
    setReply('');
    ask(next);
  };

  return (
    <div
      className="space-y-3"
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => { e.preventDefault(); addFiles([...e.dataTransfer.files]); }}
    >
      <form onSubmit={(e) => { e.preventDefault(); ask(request); }} className="rounded-2xl border border-slate-300 bg-white p-2 shadow-sm focus-within:border-blue-500 dark:border-slate-700 dark:bg-slate-900">
        <label htmlFor="ask-meldra" className="sr-only">What do you want to do?</label>
        <textarea
          id="ask-meldra"
          rows={compact ? 2 : 3}
          value={request}
          autoFocus={!compact}
          maxLength={1000}
          onChange={(e) => setRequest(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); ask(request); } }}
          placeholder="What do you want to do? Describe it in your own words and attach files if you have them."
          className="w-full resize-none border-0 bg-transparent px-2 py-1.5 text-base outline-none"
        />
        <div className="flex flex-wrap items-center gap-2 px-1">
          <input ref={fileInput} type="file" multiple className="hidden" data-meldra-skip onChange={(e) => { addFiles([...e.target.files]); e.target.value = ''; }} />
          <button type="button" onClick={() => fileInput.current?.click()} className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-sm text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800">
            <Paperclip className="h-4 w-4" />Attach
          </button>
          {files.map((f, i) => (
            <span key={`${f.name}-${i}`} className="flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs dark:bg-slate-800">
              <FileText className="h-3 w-3" />{f.name}
              <button type="button" aria-label={`Remove ${f.name}`} onClick={() => setFiles((cur) => cur.filter((_, j) => j !== i))}><X className="h-3 w-3" /></button>
            </span>
          ))}
          <button type="submit" disabled={!request.trim() || busy} aria-label="Ask meldra" className="ml-auto grid h-9 w-9 place-items-center rounded-xl bg-blue-600 text-white disabled:opacity-40">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowUp className="h-4 w-4" />}
          </button>
        </div>
      </form>
      <p className="text-xs text-slate-500">meldra sees your words, file names and spreadsheet column headings to plan this. File contents stay with you until you run a tool.</p>

      {!plan && !busy && !compact && (
        <div className="flex flex-wrap gap-2">
          {EXAMPLES.map((x) => (
            <button key={x} type="button" onClick={() => setRequest(x)} className="rounded-full border border-slate-200 px-3 py-1 text-xs text-slate-600 hover:border-blue-400 dark:border-slate-700 dark:text-slate-300">{x}</button>
          ))}
        </div>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}

      {plan?.kind === 'plan' && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium"><Sparkles className="h-4 w-4 text-blue-600" />{plan.summary || 'Here’s how meldra will do it'}{plan.source === 'search' && <span className="text-xs font-normal text-slate-400">(best match from search)</span>}</div>
          <ol className="space-y-2">{plan.steps.map((s, i) => <Step key={`${s.tool}-${i}`} step={s} n={i + 1} files={files} onOpen={open} primary={i === 0} />)}</ol>
        </div>
      )}
      {plan?.kind === 'clarify' && (
        <form onSubmit={answerQuestion} className="space-y-2 rounded-xl border border-amber-200 bg-amber-50 p-3 dark:border-amber-900 dark:bg-amber-950/40">
          <div className="flex items-start gap-2 text-sm"><HelpCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />{plan.question}</div>
          <div className="flex gap-2">
            <input value={reply} onChange={(e) => setReply(e.target.value)} autoFocus placeholder="Your answer" className="flex-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-sm dark:border-slate-700 dark:bg-slate-900" />
            <button type="submit" className="rounded-lg bg-blue-600 px-3 py-1 text-sm text-white">Continue</button>
          </div>
        </form>
      )}
      {plan?.kind === 'answer' && (
        <div className="flex items-start gap-2 rounded-xl border border-slate-200 p-3 text-sm dark:border-slate-700"><MessageSquare className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" /><p className="m-0 whitespace-pre-line">{plan.answer}</p></div>
      )}
    </div>
  );
}
AskMeldra.propTypes = { initialRequest: PropTypes.string, onDone: PropTypes.func, compact: PropTypes.bool };
