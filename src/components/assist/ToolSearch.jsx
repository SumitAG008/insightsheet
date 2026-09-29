// Search every Meldra tool in plain words (Ctrl/⌘ + K). Ranking comes from the server and learns
// from what people pick; with an empty box it shows the tools suggested for you.
import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Command as CommandPrimitive } from 'cmdk';
import { Search } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { backendApi } from '@/api/backendClient';

export default function ToolSearch({ open, onOpenChange }) {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const requestId = useRef(0);

  useEffect(() => {
    if (!open) return undefined;
    const id = ++requestId.current;
    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const res = query.trim()
          ? (await backendApi.assist.search(query)).results
          : (await backendApi.assist.suggestions()).suggestions;
        if (id === requestId.current) setResults(res || []);
      } catch {
        if (id === requestId.current) setResults([]);
      } finally {
        if (id === requestId.current) setLoading(false);
      }
    }, query.trim() ? 180 : 0);
    return () => clearTimeout(timer);
  }, [query, open]);

  useEffect(() => {
    if (!open) setQuery('');
  }, [open]);

  const choose = (tool) => {
    if (query.trim()) backendApi.assist.choose(query, tool.id).catch(() => {});
    onOpenChange(false);
    navigate(tool.path);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="overflow-hidden p-0 sm:max-w-xl">
        <DialogTitle className="sr-only">Search Meldra tools</DialogTitle>
        <CommandPrimitive shouldFilter={false} className="flex w-full flex-col">
          <div className="flex items-center border-b px-3">
            <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
            <CommandPrimitive.Input
              value={query}
              onValueChange={setQuery}
              placeholder="What do you want to do? e.g. excel to ppt, rename files, bank rec"
              className="h-12 w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
            />
          </div>
          <CommandPrimitive.List className="max-h-[360px] overflow-y-auto p-2">
            {!loading && results.length === 0 && (
              <CommandPrimitive.Empty className="py-6 text-center text-sm text-slate-500">No matching tool. Try other words.</CommandPrimitive.Empty>
            )}
            {results.length > 0 && (
              <CommandPrimitive.Group heading={query.trim() ? 'Tools' : 'Suggested for you'} className="text-xs text-slate-500 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1">
                {results.map((tool) => (
                  <CommandPrimitive.Item
                    key={tool.id}
                    value={tool.id}
                    onSelect={() => choose(tool)}
                    className="flex cursor-pointer flex-col items-start gap-0.5 rounded-md px-2 py-2 text-sm text-slate-900 aria-selected:bg-slate-100 dark:text-slate-100 dark:aria-selected:bg-slate-800"
                  >
                    <span className="font-medium">{tool.title}</span>
                    <span className="text-xs text-slate-500 dark:text-slate-400">{tool.reason || tool.description}</span>
                  </CommandPrimitive.Item>
                ))}
              </CommandPrimitive.Group>
            )}
          </CommandPrimitive.List>
        </CommandPrimitive>
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
