import React, { useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import { useLocation, useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Info, Sparkles, Upload, Wand2 } from 'lucide-react';

export default function OnboardingAssistantModal({ userEmail, open, onOpenChange }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (open) setStep(0);
  }, [open]);

  const forceOnboarding = useMemo(() => {
    try {
      const sp = new URLSearchParams(location.search);
      return sp.get('onboarding') === '1';
    } catch {
      return false;
    }
  }, [location.search]);

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

  const steps = [
    {
      title: 'Welcome to Meldra',
      subtitle: 'Here\'s what you can do in a couple of minutes.',
      body: (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary" className="border border-slate-200 dark:border-slate-800">
              <Sparkles className="w-3.5 h-3.5 mr-1" />
              AI-assisted
            </Badge>
            <Badge variant="secondary" className="border border-slate-200 dark:border-slate-800">
              <Info className="w-3.5 h-3.5 mr-1" />
              Privacy-first
            </Badge>
          </div>
          <div className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
            You\'re signed in as <span className="font-semibold">{userEmail || 'your account'}</span>. I\'ll guide you through the main workflows.
          </div>
        </div>
      ),
      primary: { label: 'Next', onClick: () => setStep(1) },
      secondary: { label: 'Skip', onClick: close },
    },
    {
      title: 'What Meldra can do',
      subtitle: 'Breadth across spreadsheets + exports + conversions.',
      body: (
        <div className="space-y-2">
          {canDo.map((t) => (
            <div key={t} className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-300">
              <CheckCircle2 className="w-4 h-4 mt-0.5 text-emerald-600" />
              <div>{t}</div>
            </div>
          ))}
        </div>
      ),
      primary: { label: 'Next', onClick: () => setStep(2) },
      secondary: { label: 'Back', onClick: () => setStep(0) },
    },
    {
      title: 'What to expect (limits)',
      subtitle: 'Clear boundaries so users trust the output.',
      body: (
        <div className="space-y-2">
          {cantDo.map((t) => (
            <div key={t} className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-300">
              <Info className="w-4 h-4 mt-0.5 text-amber-600" />
              <div>{t}</div>
            </div>
          ))}
        </div>
      ),
      primary: { label: 'Show me how', onClick: () => setStep(3) },
      secondary: { label: 'Back', onClick: () => setStep(1) },
    },
    {
      title: 'Start with a workflow',
      subtitle: 'Pick one. You can come back any time.',
      body: (
        <div className="grid gap-3">
          <button
            type="button"
            onClick={goDashboard}
            className="w-full rounded-xl border border-slate-200 dark:border-slate-800 p-3 text-left hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors"
          >
            <div className="flex items-center gap-2 font-semibold text-slate-900 dark:text-slate-100">
              <Upload className="w-4 h-4 text-blue-600" />
              Upload a file
            </div>
            <div className="text-xs text-slate-600 dark:text-slate-400 mt-1">Clean, transform, validate, chart, export.</div>
          </button>

          <button
            type="button"
            onClick={goAiTools}
            className="w-full rounded-xl border border-slate-200 dark:border-slate-800 p-3 text-left hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors"
          >
            <div className="flex items-center gap-2 font-semibold text-slate-900 dark:text-slate-100">
              <Wand2 className="w-4 h-4 text-purple-600" />
              Try AI Tools
            </div>
            <div className="text-xs text-slate-600 dark:text-slate-400 mt-1">Ask for operations in plain English.</div>
          </button>

          <button
            type="button"
            onClick={goConversion}
            className="w-full rounded-xl border border-slate-200 dark:border-slate-800 p-3 text-left hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors"
          >
            <div className="flex items-center gap-2 font-semibold text-slate-900 dark:text-slate-100">
              <Sparkles className="w-4 h-4 text-indigo-600" />
              Convert documents
            </div>
            <div className="text-xs text-slate-600 dark:text-slate-400 mt-1">PDF/DOC/PPT conversions and downloads.</div>
          </button>

          <button
            type="button"
            onClick={goTemplates}
            className="w-full rounded-xl border border-slate-200 dark:border-slate-800 p-3 text-left hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors"
          >
            <div className="font-semibold text-slate-900 dark:text-slate-100">Browse templates</div>
            <div className="text-xs text-slate-600 dark:text-slate-400 mt-1">Start from common business datasets.</div>
          </button>
        </div>
      ),
      primary: { label: 'Done', onClick: close },
      secondary: { label: 'Back', onClick: () => setStep(2) },
    },
  ];

  const current = steps[Math.max(0, Math.min(step, steps.length - 1))];

  return (
    <Dialog open={open} onOpenChange={(v) => onOpenChange(v)}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{current.title}</DialogTitle>
          <DialogDescription>{current.subtitle}</DialogDescription>
        </DialogHeader>

        {current.body}

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={current.secondary.onClick}>
            {current.secondary.label}
          </Button>
          <Button onClick={current.primary.onClick}>
            {current.primary.label}
          </Button>
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
