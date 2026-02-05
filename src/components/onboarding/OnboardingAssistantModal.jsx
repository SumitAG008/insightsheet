import React, { useEffect, useMemo, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { useLocation, useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { backendApi, meldraAi } from '@/api/meldraClient';
import { CheckCircle2, Info, Sparkles, Upload, Wand2, Send, Loader2 } from 'lucide-react';

export default function OnboardingAssistantModal({ userEmail, open, onOpenChange }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const listRef = useRef(null);

  const forceOnboarding = useMemo(() => {
    try {
      const sp = new URLSearchParams(location.search);
      return sp.get('onboarding') === '1';
    } catch {
      return false;
    }
  }, [location.search]);

  const normalizeAssistantText = (text) => {
    const raw = String(text || '');
    return raw
      .replace(/^\s{0,3}#{1,6}\s+/gm, '')
      .replace(/```[\s\S]*?```/g, (block) => block.replace(/```[a-zA-Z0-9_-]*\n?/, '').replace(/```\s*$/, ''))
      .replace(/^\s*>\s?/gm, '')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  };

  const isAuthed = useMemo(() => {
    try {
      return !!meldraAi?.auth?.isAuthenticated?.();
    } catch {
      return false;
    }
  }, []);

  const canDo = [
    'Upload Excel/CSV and clean, transform, validate, and explore it',
    'Ask for quick insights and charts from your data',
    'Export results and share outputs',
    'Convert documents (PDF/DOC/PPT) via the conversion tools',
  ];

  const cantDo = [
    'Guarantee perfect results for every messy file — always review before sharing',
    'Recover your data after you clear the tab/session (privacy-first behavior)',
    'Turn every PDF chart into a fully editable PowerPoint chart (PDFs often flatten to images)',
  ];

  useEffect(() => {
    if (!open) return;
    const intro = `Hi${userEmail ? ` ${userEmail}` : ''} — welcome to Meldra.\n\nHere are a few things I can help with:\n- What Meldra can do\n- What it can't do / common limitations\n- Privacy mode + data retention\n- Exporting and conversions\n\nAsk me anything, or use the quick prompts below.`;
    setMessages([{ role: 'assistant', content: intro }]);
    setInput('');
    setLoading(false);
  }, [open, userEmail]);

  useEffect(() => {
    if (!open) return;
    const el = listRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [open, messages.length, loading]);

  const close = () => {
    onOpenChange(false);
  };

  const goDashboard = () => {
    navigate('/dashboard');
    close();
  };

  const goAiTools = () => {
    navigate('/dashboard?tab=ai#ai');
    close();
  };

  const goTemplates = () => {
    navigate('/dashboard');
    close();
  };

  const goConversion = () => {
    navigate('/pdfdocconverter');
    close();
  };

  const quickPrompts = [
    { label: 'What can Meldra do?', text: 'What can Meldra do? Give me a quick overview.' },
    { label: 'What can it not do?', text: 'What are the key limitations users should know?' },
    { label: 'Privacy & retention', text: 'Explain privacy mode and how long data is kept.' },
    { label: 'Exports', text: 'What outputs can I export and what is included?' },
    { label: 'PDF → PPT editability', text: 'Why are PDF to PPT charts/images sometimes not editable?' },
  ];

  const localAnswer = (q) => {
    const query = String(q || '').toLowerCase();
    if (query.includes('can') && query.includes('do')) {
      return `Meldra can help you:\n\n${canDo.map((x) => `- ${x}`).join('\n')}\n\nIf you tell me your file type and goal, I can suggest the best workflow.`;
    }
    if (query.includes('limit') || query.includes("can't") || query.includes('cannot')) {
      return `Key limitations / expectations:\n\n${cantDo.map((x) => `- ${x}`).join('\n')}\n\nIf you share your exact scenario, I can suggest the best workaround.`;
    }
    if (query.includes('privacy') || query.includes('retention') || query.includes('store')) {
      return 'Privacy mode means your spreadsheet processing happens locally in the browser for many workflows. For some API conversions, files may be sent to the backend to process. If you tell me which page/tool you are using, I can explain exactly what gets uploaded and what is retained.';
    }
    if (query.includes('pdf') && query.includes('ppt')) {
      return 'Most PDF→PPT converters render each PDF page as an image, so charts/text become pixels and are not editable in PowerPoint. To produce editable slides, the system must reconstruct text/shapes (and charts usually need the original data).';
    }
    return 'Tell me what you are trying to do (upload/clean/chart/export/convert) and I’ll guide you.';
  };

  const send = async (text) => {
    const q = String(text || '').trim();
    if (!q || loading) return;

    setMessages((prev) => [...prev, { role: 'user', content: q }]);
    setInput('');
    setLoading(true);

    try {
      if (!isAuthed) {
        setMessages((prev) => [...prev, { role: 'assistant', content: normalizeAssistantText(localAnswer(q)) }]);
        return;
      }

      const res = await backendApi.support.chat(q, { page: 'onboarding' });
      const answer = normalizeAssistantText(res?.answer || localAnswer(q));
      setMessages((prev) => [...prev, { role: 'assistant', content: answer }]);
    } catch (e) {
      setMessages((prev) => [...prev, { role: 'assistant', content: normalizeAssistantText(localAnswer(q)) }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send(input);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => onOpenChange(v)}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Onboarding Assistant</DialogTitle>
        </DialogHeader>

        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary" className="border border-slate-200 dark:border-slate-800">
            <Sparkles className="w-3.5 h-3.5 mr-1" />
            AI-assisted
          </Badge>
          <Badge variant="secondary" className="border border-slate-200 dark:border-slate-800">
            <Info className="w-3.5 h-3.5 mr-1" />
            Privacy-first
          </Badge>
          {userEmail && (
            <div className="text-xs text-slate-500 dark:text-slate-400">Signed in as <span className="font-semibold">{userEmail}</span></div>
          )}
        </div>

        <div
          ref={listRef}
          className="max-h-[360px] overflow-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-4 space-y-3"
        >
          {messages.map((m, idx) => (
            <div
              key={idx}
              className={
                m.role === 'user'
                  ? 'ml-auto max-w-[85%] rounded-2xl bg-blue-600 text-white px-3 py-2 text-sm whitespace-pre-wrap'
                  : 'mr-auto max-w-[85%] rounded-2xl bg-slate-100 dark:bg-slate-900 text-slate-900 dark:text-slate-100 px-3 py-2 text-sm whitespace-pre-wrap'
              }
            >
              {m.content}
            </div>
          ))}

          {loading && (
            <div className="mr-auto max-w-[85%] rounded-2xl bg-slate-100 dark:bg-slate-900 text-slate-900 dark:text-slate-100 px-3 py-2 text-sm flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              Thinking…
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          {quickPrompts.map((p) => (
            <button
              key={p.label}
              type="button"
              onClick={() => send(p.text)}
              className="text-xs px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              disabled={loading}
            >
              {p.label}
            </button>
          ))}
        </div>

        <div className="grid gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask a question (press Enter to send)…"
            className="min-h-[72px]"
            disabled={loading}
          />
          <div className="flex justify-end">
            <Button onClick={() => send(input)} disabled={loading || !input.trim()}>
              <Send className="w-4 h-4 mr-2" />
              Send
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <Button variant="outline" onClick={goDashboard}>
            <Upload className="w-4 h-4 mr-2" />
            Upload a file
          </Button>
          <Button variant="outline" onClick={goAiTools}>
            <Wand2 className="w-4 h-4 mr-2" />
            AI Tools
          </Button>
          <Button variant="outline" onClick={goConversion}>
            <CheckCircle2 className="w-4 h-4 mr-2" />
            Conversions
          </Button>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={close}>Close</Button>
          <Button onClick={close}>Done</Button>
        </DialogFooter>

        {forceOnboarding && (
          <div className="text-[11px] text-slate-500 dark:text-slate-400">
            Tip: remove <span className="font-mono">?onboarding=1</span> to stop forcing onboarding.
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

OnboardingAssistantModal.propTypes = {
  userEmail: PropTypes.string,
  open: PropTypes.bool.isRequired,
  onOpenChange: PropTypes.func.isRequired,
};
