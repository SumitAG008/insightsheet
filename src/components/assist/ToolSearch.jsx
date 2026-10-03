// Search every Meldra tool in plain words (Ctrl/⌘ + K). Ranking comes from the server and learns
// from what people pick; with an empty box it shows the tools suggested for you.
import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Command as CommandPrimitive } from 'cmdk';
import { ArrowLeft, CornerDownLeft, Loader2, Search, Sparkles } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { backendApi } from '@/api/backendClient';
import { DEFAULT_ICON, TOOLS, TOOLS_BY_ID, searchLocally } from './toolCatalog';
import AskMeldra from './AskMeldra';

// With an empty box and no history yet, show the most-used tools.
// A request in a sentence goes to Ask Meldra first; a few words go to the best tool.
const ASK = '__ask_meldra';
const isSentence = (q) => q.trim().split(/\s+/).length >= 4;
const STARTERS = ['excel_to_ppt', 'filename_cleaner', 'pdf_doc_converter', 'reconciliation', 'file_analyzer', 'unified_reporting'].map((id) => TOOLS_BY_ID[id]);

export default function ToolSearch({ open, onOpenChange }) {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState('');
  const [asking, setAsking] = useState(false);
  const requestId = useRef(0);

  useEffect(() => {
    if (!open) return undefined;
    const id = ++requestId.current;
    setLoading(true);
    const timer = setTimeout(async () => {
      const q = query.trim();
      let res;
      try {
        res = q ? (await backendApi.assist.search(q)).results : (await backendApi.assist.suggestions()).suggestions;
      } catch {
        res = null; // server unavailable: search on the device instead
      }
      if (!res || (!q && res.length === 0)) res = q ? searchLocally(q) : STARTERS;
      if (id === requestId.current) {
        setResults(res);
        setSelected(isSentence(q) ? ASK : res[0]?.id || ''); // Enter opens the best match
        setLoading(false);
      }
    }, query.trim() ? 180 : 0);
    return () => clearTimeout(timer);
  }, [query, open]);

  useEffect(() => {
    if (!open) { setQuery(''); setAsking(false); }
  }, [open]);

  const choose = (tool) => {
    if (query.trim()) backendApi.assist.choose(query, tool.id).catch(() => {});
    onOpenChange(false);
    navigate(tool.path);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="top-[20%] translate-y-0 overflow-hidden p-0 sm:max-w-xl gap-0 [&>button]:hidden">
        <DialogTitle className="sr-only">{asking ? 'Ask Meldra' : 'Search Meldra tools'}</DialogTitle>
        {asking ? (
          <div className="max-h-[80vh] overflow-y-auto p-4">
            <button type="button" onClick={() => setAsking(false)} className="mb-3 flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200">
              <ArrowLeft className="h-3.5 w-3.5" />Back to tool search
            </button>
            <AskMeldra initialRequest={query} onDone={() => onOpenChange(false)} />
          </div>
        ) : (
        <CommandPrimitive shouldFilter={false} loop value={selected} onValueChange={setSelected} className="flex w-full flex-col">
          <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-700 px-4">
            <Search className="h-5 w-5 shrink-0 text-slate-400" />
            <CommandPrimitive.Input
              value={query}
              onValueChange={setQuery}
              autoFocus
              placeholder="What do you want to do? A tool name, or the whole task in a sentence"
              className="h-14 w-full bg-transparent text-base text-slate-900 dark:text-slate-100 outline-none placeholder:text-slate-400"
            />
            {loading && <Loader2 className="h-4 w-4 shrink-0 animate-spin text-slate-400" />}
            <kbd className="shrink-0 rounded border border-slate-200 dark:border-slate-600 px-1.5 py-0.5 text-[11px] text-slate-400">Esc</kbd>
          </div>
          <CommandPrimitive.List className="max-h-[min(420px,60vh)] overflow-y-auto p-2">
            <CommandPrimitive.Item
              value={ASK}
              onSelect={() => setAsking(true)}
              className="group mb-1 flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-slate-900 dark:text-slate-100 aria-selected:bg-blue-50 dark:aria-selected:bg-slate-800"
            >
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 text-white"><Sparkles className="h-4 w-4" /></span>
              <span className="min-w-0 flex-1">
                <span className="block font-medium">{query.trim() ? <>Ask Meldra: “{query.trim()}”</> : 'Ask Meldra'}</span>
                <span className="block truncate text-xs text-slate-500 dark:text-slate-400">Describe the whole task, attach files; Meldra picks the tools and sets them up</span>
              </span>
              <CornerDownLeft className="h-4 w-4 shrink-0 text-slate-400 opacity-0 group-aria-selected:opacity-100" />
            </CommandPrimitive.Item>
            {!loading && results.length === 0 && (
              <CommandPrimitive.Empty className="py-10 text-center text-sm text-slate-500">
                No tool matches “{query.trim()}”. Try other words, e.g. “pdf”, “rename”, “charts”.
              </CommandPrimitive.Empty>
            )}
            {results.length > 0 && (
              <CommandPrimitive.Group
                heading={query.trim() ? 'Tools' : 'Suggested for you'}
                className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:pb-1 [&_[cmdk-group-heading]]:pt-2 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wide [&_[cmdk-group-heading]]:text-slate-400"
              >
                {results.map((tool) => {
                  const Icon = TOOLS_BY_ID[tool.id]?.icon || DEFAULT_ICON;
                  return (
                    <CommandPrimitive.Item
                      key={tool.id}
                      value={tool.id}
                      onSelect={() => choose(tool)}
                      className="group flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-slate-900 dark:text-slate-100 aria-selected:bg-blue-50 dark:aria-selected:bg-slate-800"
                    >
                      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-slate-100 text-slate-600 group-aria-selected:bg-blue-600 group-aria-selected:text-white dark:bg-slate-800 dark:text-slate-300">
                        <Icon className="h-4 w-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block font-medium">{tool.title}</span>
                        <span className="block truncate text-xs text-slate-500 dark:text-slate-400">{tool.reason || tool.description}</span>
                      </span>
                      <CornerDownLeft className="h-4 w-4 shrink-0 text-slate-400 opacity-0 group-aria-selected:opacity-100" />
                    </CommandPrimitive.Item>
                  );
                })}
              </CommandPrimitive.Group>
            )}
          </CommandPrimitive.List>
          <div className="flex items-center justify-between border-t border-slate-200 dark:border-slate-700 px-4 py-2 text-[11px] text-slate-400">
            <span>↑ ↓ to move · Enter to open</span>
            <span>{TOOLS.length} tools · learns from what you pick</span>
          </div>
        </CommandPrimitive>
        )}
      </DialogContent>
    </Dialog>
  );
}

/** Opens the search with Ctrl/⌘ + K anywhere in the app. */
export function useToolSearchShortcut(setOpen) {
  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [setOpen]);
}
