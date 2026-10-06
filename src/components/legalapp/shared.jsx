// Shared pieces for meldra Legal: the app context, a panel that is full screen on phones and a dialog
// on desktop, and small form controls. Native inputs and selects are used on purpose: on a phone they
// open the system date picker and list, which is faster in a court corridor.
import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { X } from 'lucide-react';

export const LegalContext = createContext(null);
export const useLegal = () => useContext(LegalContext);

export function Panel({ open, onClose, title, children, footer }) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[60] flex items-end md:items-center justify-center" role="dialog" aria-modal="true" aria-label={title}>
      <button type="button" aria-label="Close" className="absolute inset-0 bg-slate-900/50" onClick={onClose} />
      <div className="relative flex flex-col w-full h-[100dvh] md:h-auto md:max-h-[88vh] md:max-w-2xl bg-white dark:bg-slate-900 md:rounded-2xl shadow-xl">
        <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-slate-200 dark:border-slate-800" style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top))' }}>
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100 truncate">{title}</h2>
          <button type="button" onClick={onClose} className="p-2 -mr-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800" aria-label="Close">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-4">{children}</div>
        {footer ? (
          <div className="px-4 py-3 border-t border-slate-200 dark:border-slate-800 flex gap-2 justify-end" style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}>
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );
}

Panel.propTypes = {
  open: PropTypes.bool,
  onClose: PropTypes.func.isRequired,
  title: PropTypes.string.isRequired,
  children: PropTypes.node,
  footer: PropTypes.node,
};

const inputCls =
  'w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2.5 text-[15px] text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500';

export function Field({ label, children, hint }) {
  return (
    <label className="block">
      <span className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">{label}</span>
      {children}
      {hint ? <span className="block text-xs text-slate-500 mt-1">{hint}</span> : null}
    </label>
  );
}

Field.propTypes = { label: PropTypes.string.isRequired, children: PropTypes.node, hint: PropTypes.string };

export function TextInput(props) {
  return <input {...props} className={`${inputCls} ${props.className || ''}`} />;
}
TextInput.propTypes = { className: PropTypes.string };

export function TextArea(props) {
  return <textarea rows={4} {...props} className={`${inputCls} ${props.className || ''}`} />;
}
TextArea.propTypes = { className: PropTypes.string };

export function Select({ options, value, onChange, placeholder, ...rest }) {
  return (
    <select value={value ?? ''} onChange={(e) => onChange(e.target.value)} className={inputCls} {...rest}>
      {placeholder !== undefined ? <option value="">{placeholder}</option> : null}
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

Select.propTypes = {
  options: PropTypes.arrayOf(PropTypes.shape({ value: PropTypes.string, label: PropTypes.string })).isRequired,
  value: PropTypes.string,
  onChange: PropTypes.func.isRequired,
  placeholder: PropTypes.string,
};

export function Btn({ children, variant = 'primary', className = '', ...rest }) {
  const styles = {
    primary: 'bg-blue-700 hover:bg-blue-800 text-white',
    secondary: 'bg-slate-100 hover:bg-slate-200 text-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-100',
    danger: 'bg-red-50 hover:bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300',
    ghost: 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200',
  };
  return (
    <button
      type="button"
      {...rest}
      className={`inline-flex items-center justify-center gap-1.5 rounded-lg px-3.5 py-2.5 text-sm font-semibold transition disabled:opacity-50 disabled:pointer-events-none ${styles[variant]} ${className}`}
    >
      {children}
    </button>
  );
}

Btn.propTypes = { children: PropTypes.node, variant: PropTypes.oneOf(['primary', 'secondary', 'danger', 'ghost']), className: PropTypes.string };

export function Chip({ active, children, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`shrink-0 whitespace-nowrap px-3 py-1.5 rounded-full text-sm font-medium border transition ${
        active
          ? 'bg-blue-700 border-blue-700 text-white'
          : 'bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-blue-400'
      }`}
    >
      {children}
    </button>
  );
}

Chip.propTypes = { active: PropTypes.bool, children: PropTypes.node, onClick: PropTypes.func };

export function Card({ children, className = '' }) {
  return <div className={`rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 ${className}`}>{children}</div>;
}
Card.propTypes = { children: PropTypes.node, className: PropTypes.string };

export function SectionTitle({ children, right }) {
  return (
    <div className="flex items-center justify-between gap-2 mb-2 mt-1">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{children}</h3>
      {right}
    </div>
  );
}
SectionTitle.propTypes = { children: PropTypes.node, right: PropTypes.node };

export function Empty({ children }) {
  return <p className="text-sm text-slate-500 dark:text-slate-400 py-6 text-center">{children}</p>;
}
Empty.propTypes = { children: PropTypes.node };

const SEVERITY = {
  high: 'border-l-red-500',
  medium: 'border-l-amber-500',
  low: 'border-l-slate-400',
};

export function SuggestionItem({ s, onOpen }) {
  return (
    <button
      type="button"
      onClick={() => s.matter_id && onOpen?.(s.matter_id)}
      className={`w-full text-left rounded-lg border border-slate-200 dark:border-slate-800 border-l-4 ${SEVERITY[s.severity]} bg-white dark:bg-slate-900 px-3 py-2.5`}
    >
      {s.title ? <div className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">{s.title}</div> : null}
      <div className="text-sm text-slate-600 dark:text-slate-300">{s.text}</div>
    </button>
  );
}

SuggestionItem.propTypes = {
  s: PropTypes.shape({ severity: PropTypes.string, title: PropTypes.string, text: PropTypes.string, matter_id: PropTypes.number }).isRequired,
  onOpen: PropTypes.func,
};

// Load data with a loading and error state; reload() re-runs it.
export function useLoad(fn, deps) {
  const [state, setState] = useState({ loading: true, error: null, data: null });
  const load = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const data = await fn();
      setState({ loading: false, error: null, data });
    } catch (e) {
      setState({ loading: false, error: e.message || 'Error', data: null });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  useEffect(() => {
    load();
  }, [load]);
  return { ...state, reload: load };
}

export function LoadState({ state, t }) {
  if (state.loading && !state.data) return <Empty>{t('loading')}</Empty>;
  if (state.error)
    return (
      <div className="text-center py-6">
        <p className="text-sm text-red-600 mb-2">{state.error}</p>
        <Btn variant="secondary" onClick={state.reload}>
          {t('retry')}
        </Btn>
      </div>
    );
  return null;
}

LoadState.propTypes = { state: PropTypes.object.isRequired, t: PropTypes.func.isRequired };
