// Meldra-styled cookie consent (Amadeus-style positioning). Used on developer.meldra.ai / /developers.
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const STORAGE_KEY = 'meldra_cookie_consent';

export default function CookieConsent({ privacyUrl, className }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (!window.localStorage.getItem(STORAGE_KEY)) setVisible(true);
    } catch (_) { setVisible(false); }
  }, []);

  const hide = (value) => {
    try { window.localStorage.setItem(STORAGE_KEY, value); } catch (_) {}
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      className={cn(
        'fixed bottom-0 left-0 right-0 z-50 border-t border-slate-200 bg-white shadow-[0_-4px_12px_rgba(0,0,0,0.06)]',
        'py-4 px-4 md:px-6',
        className
      )}
    >
      <div className="container mx-auto max-w-4xl flex flex-col sm:flex-row items-center justify-between gap-4">
        <p className="text-slate-600 text-sm text-center sm:text-left">
          By clicking &quot;Accept all cookies&quot;, you agree to the storing of cookies to enhance navigation and usage.{' '}
          <a href={privacyUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-700 underline">
            Privacy &amp; cookies
          </a>
        </p>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Button variant="outline" size="sm" className="border-slate-300 text-slate-600 hover:bg-slate-100" onClick={() => hide('rejected')}>
            Reject all
          </Button>
          <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white" onClick={() => hide('accepted')}>
            Accept all cookies
          </Button>
        </div>
      </div>
    </div>
  );
}
