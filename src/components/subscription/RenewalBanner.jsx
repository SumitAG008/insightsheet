import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarClock, X } from 'lucide-react';
import { meldraAi } from '@/api/meldraClient';
import { renewalNotice } from '@/lib/renewal';

// A strip under the menu when the organisation's licence is due for renewal (90, 60, 30 and 7 days
// before the end date, and during the grace period). Admins see it from 90 days; members only once
// the licence has ended. Dismissing hides it for this browser session, until the next stage.
export default function RenewalBanner() {
  const [org, setOrg] = useState(null);
  const [role, setRole] = useState(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    meldraAi.org
      .me()
      .then((r) => {
        if (cancelled) return;
        setOrg(r?.organization || null);
        setRole(r?.role || null);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const notice = renewalNotice(org, role);
  const key = notice ? `renewal_banner_dismissed:${org.license_id}:${org.renewal_stage}` : null;

  useEffect(() => {
    if (!key) return;
    try {
      setDismissed(sessionStorage.getItem(key) === '1');
    } catch {
      setDismissed(false);
    }
  }, [key]);

  if (!notice || dismissed) return null;

  const dismiss = () => {
    setDismissed(true);
    try {
      sessionStorage.setItem(key, '1');
    } catch {
      // ignore
    }
  };

  const tone = notice.urgent
    ? 'bg-red-50 border-red-200 text-red-900 dark:bg-red-950/40 dark:border-red-900 dark:text-red-200'
    : 'bg-amber-50 border-amber-200 text-amber-900 dark:bg-amber-950/40 dark:border-amber-900 dark:text-amber-200';

  return (
    <div className={`border-b ${tone}`} role="status">
      <div className="container mx-auto px-4 py-2 flex items-center gap-3 text-sm">
        <CalendarClock className="w-4 h-4 shrink-0" />
        <p className="flex-1">{notice.text}</p>
        {notice.canRenew && (
          <Link to="/organization#renewal" className="font-semibold underline whitespace-nowrap">
            Request renewal
          </Link>
        )}
        <button type="button" onClick={dismiss} className="p-1 rounded hover:bg-black/5 dark:hover:bg-white/10" aria-label="Hide renewal notice">
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
