// "Suggested for you": tools ranked from your recent and routine use and what people usually do next.
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Sparkles } from 'lucide-react';
import { backendApi } from '@/api/backendClient';

export default function SuggestedTools() {
  const [tools, setTools] = useState(null);

  useEffect(() => {
    let alive = true;
    backendApi.assist.suggestions()
      .then((r) => alive && setTools(r.suggestions || []))
      .catch(() => alive && setTools([]));
    return () => {
      alive = false;
    };
  }, []);

  if (!tools || tools.length === 0) return null;
  return (
    <section aria-labelledby="suggested-tools" className="mb-8">
      <h2 id="suggested-tools" className="mb-3 flex items-center gap-2 text-lg font-semibold text-slate-900 dark:text-white">
        <Sparkles className="h-5 w-5 text-blue-600" /> Suggested for you
      </h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {tools.map((t) => (
          <Link
            key={t.id}
            to={t.path}
            className="rounded-xl border border-slate-200 bg-white p-4 transition hover:border-blue-400 hover:shadow-sm dark:border-slate-700 dark:bg-slate-900"
          >
            <div className="font-medium text-slate-900 dark:text-white">{t.title}</div>
            <div className="mt-1 text-sm text-slate-600 dark:text-slate-400">{t.reason || t.description}</div>
          </Link>
        ))}
      </div>
    </section>
  );
}
