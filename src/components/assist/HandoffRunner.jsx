// Delivers an Ask meldra handoff into the tool page it was meant for: the attached files go into
// the page's own file inputs and the planner's instruction into its instruction box, then a small
// banner says what was done. Nothing is run automatically; the user reviews and presses the
// page's own button.
import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { CheckCircle2, Info, Sparkles, X } from 'lucide-react';
import { fillFileInputs, fillPrompt, onHandoff, peekHandoff, takeHandoff } from '@/lib/meldra/handoff';

const WAIT_MS = 20000;
const TICK_MS = 300;

export default function HandoffRunner() {
  const location = useLocation();
  const [banner, setBanner] = useState(null);
  const [tick, setTick] = useState(0);

  useEffect(() => onHandoff(() => setTick((t) => t + 1)), []);

  useEffect(() => {
    if (!peekHandoff(location.pathname)) return undefined;
    const h = takeHandoff(location.pathname);
    let files = [...h.files];
    let filesDone = files.length === 0;
    let promptDone = !h.instruction;
    let filled = false;
    let tabOpened = false;
    const started = Date.now();
    setBanner({ tool: h.toolTitle, state: 'working', files: h.files.map((f) => f.name), instruction: h.instruction });

    const timer = setInterval(() => {
      if (!filesDone) {
        const ready = document.querySelectorAll('input[type="file"]:not([disabled])').length > 0;
        if (ready) {
          files = fillFileInputs(document, files);
          filesDone = true;
        }
      }
      // Some instruction boxes appear only once data is loaded, or sit on another tab
      // (marked data-meldra-prompt-tab), e.g. Unified Reporting's Ask tab.
      if (filesDone && !promptDone) {
        promptDone = filled = fillPrompt(document, h.instruction);
        const tab = document.querySelector('[data-meldra-prompt-tab]');
        if (!promptDone && tab && !tabOpened && Date.now() - started > 1500) {
          tab.click();
          tabOpened = true;
        }
      }
      const timedOut = Date.now() - started > WAIT_MS;
      if ((filesDone && promptDone) || timedOut) {
        clearInterval(timer);
        setBanner({
          tool: h.toolTitle,
          state: 'done',
          files: h.files.map((f) => f.name),
          missedFiles: filesDone ? files.map((f) => f.name) : h.files.map((f) => f.name),
          instruction: h.instruction,
          instructionFilled: filled,
        });
      }
    }, TICK_MS);
    return () => clearInterval(timer);
  }, [location.pathname, tick]);

  if (!banner) return null;
  const added = banner.files.filter((n) => !(banner.missedFiles || []).includes(n));
  return (
    <div role="status" className="fixed bottom-4 left-1/2 z-50 w-[min(640px,calc(100vw-32px))] -translate-x-1/2 rounded-2xl border border-blue-200 bg-white p-4 text-sm shadow-xl dark:border-blue-900 dark:bg-slate-900">
      <div className="flex items-start gap-3">
        <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" />
        <div className="min-w-0 flex-1 space-y-1">
          <div className="font-semibold">Ask meldra · {banner.tool}</div>
          {banner.state === 'working' && <div className="text-slate-500">Setting up your request…</div>}
          {banner.state === 'done' && (
            <>
              {added.length > 0 && <div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400"><CheckCircle2 className="h-4 w-4" />Added {added.join(', ')}</div>}
              {banner.missedFiles?.length > 0 && <div className="flex items-center gap-1.5 text-amber-700 dark:text-amber-400"><Info className="h-4 w-4" />Add {banner.missedFiles.join(', ')} on this page yourself; it didn’t fit its upload box.</div>}
              {banner.instruction && (banner.instructionFilled
                ? <div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400"><CheckCircle2 className="h-4 w-4" />Instruction filled in. Check it, then run.</div>
                : <div className="text-slate-600 dark:text-slate-300">Your instruction: <span className="italic">“{banner.instruction}”</span></div>)}
              {!banner.instruction && added.length > 0 && <div className="text-slate-500">Check the options, then run.</div>}
            </>
          )}
        </div>
        <button type="button" onClick={() => setBanner(null)} aria-label="Dismiss" className="rounded p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
