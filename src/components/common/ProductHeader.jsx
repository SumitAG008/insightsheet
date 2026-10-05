// The branded header used by the flagship tools (Unified Reporting, Migration): product name, one-line
// promise, trust points, actions and live stats, on the meldra blue panel.
import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';
import { BookOpen } from 'lucide-react';

export function StatTile({ label, value, hint }) {
  return (
    <div className="min-w-0 rounded-xl bg-white/10 px-4 py-3 ring-1 ring-inset ring-white/15">
      <div className="truncate text-[11px] font-semibold uppercase tracking-wider text-blue-100/80">{label}</div>
      <div className="mt-1 truncate text-xl font-semibold tabular-nums text-white">{value}</div>
      {hint && <div className="mt-0.5 truncate text-xs text-blue-100/70">{hint}</div>}
    </div>
  );
}
StatTile.propTypes = { label: PropTypes.string.isRequired, value: PropTypes.node.isRequired, hint: PropTypes.node };

export default function ProductHeader({ icon: Icon, eyebrow, title, description, points = [], actions, stats, guide, children }) {
  return (
    <section className="relative overflow-hidden rounded-3xl bg-[#02161A] text-white shadow-xl shadow-blue-950/10">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-[#004FCD] via-[#0a3fa8] to-[#02161A]" />
      <div className="pointer-events-none absolute inset-0 opacity-[0.12] [background-image:linear-gradient(rgba(255,255,255,.6)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.6)_1px,transparent_1px)] [background-size:32px_32px] [mask-image:radial-gradient(ellipse_at_top_right,black,transparent_70%)]" />
      <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-[#DDFA21] opacity-20 blur-3xl" />

      <div className="relative px-5 py-6 sm:px-8 sm:py-8">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div className="min-w-0 max-w-3xl">
            <div className="flex items-center gap-2.5">
              {Icon && <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#DDFA21] text-[#02161A] shadow-sm"><Icon className="h-5 w-5" aria-hidden="true" /></span>}
              <span className="text-xs font-semibold uppercase tracking-[0.18em] text-[#DDFA21]">{eyebrow}</span>
            </div>
            <h1 className="mt-3 text-2xl font-bold tracking-tight sm:text-[2rem] sm:leading-tight" style={{ fontFamily: "'Space Grotesk', sans-serif", letterSpacing: '-0.02em' }}>{title}</h1>
            {description && <p className="mt-2 text-sm leading-6 text-blue-100 sm:text-base">{description}</p>}
            {points.length > 0 && (
              <ul className="mt-4 flex flex-wrap gap-2">
                {points.map(([PointIcon, text]) => (
                  <li key={text} className="flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-white ring-1 ring-inset ring-white/15">
                    <PointIcon className="h-3.5 w-3.5 text-[#DDFA21]" aria-hidden="true" />{text}
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {actions}
            {guide && (
              <Link to={guide} className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-white/10 px-3 text-sm font-medium text-white ring-1 ring-inset ring-white/20 hover:bg-white/20">
                <BookOpen className="h-4 w-4" aria-hidden="true" />Guide
              </Link>
            )}
          </div>
        </div>
        {children}
        {stats && <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">{stats}</div>}
      </div>
    </section>
  );
}

ProductHeader.propTypes = {
  icon: PropTypes.elementType,
  eyebrow: PropTypes.string.isRequired,
  title: PropTypes.string.isRequired,
  description: PropTypes.node,
  points: PropTypes.array,
  actions: PropTypes.node,
  stats: PropTypes.node,
  guide: PropTypes.string,
  children: PropTypes.node,
};

/** A button styled for the dark header panel. */
export const headerButton = 'inline-flex h-9 items-center gap-1.5 rounded-lg bg-white/10 px-3 text-sm font-medium text-white ring-1 ring-inset ring-white/20 hover:bg-white/20 disabled:opacity-50';
export const headerButtonPrimary = 'inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#DDFA21] px-3.5 text-sm font-semibold text-[#02161A] shadow-sm hover:bg-[#e8ff5a] disabled:opacity-50';
