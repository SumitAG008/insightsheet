import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Logo from '@/components/branding/Logo';
import { useI18n } from '@/lib/i18n';

const FAQ_ITEMS = [
  {
    id: 'auto-standardize',
  },
  {
    id: 'reconciliation',
  },
  {
    id: 'overview',
  },
  {
    id: 'trusted-excel',
  },
  {
    id: 'universal-analyze',
  },
  {
    id: 'blocked',
  },
  {
    id: 'clarify',
  },
  {
    id: 'file-analysis',
  },
  {
    id: 'doc-conversion',
  },
  {
    id: 'ai-assistant',
  },
  {
    id: 'data-schema',
  },
];

function normalize(s) {
  return String(s || '').toLowerCase().replace(/\s+/g, ' ').trim();
}

function renderFaqBody(body) {
  const lines = String(body || '').split(/\r?\n/);
  const blocks = [];

  let currentParagraph = [];
  let currentList = [];

  const flushParagraph = () => {
    if (!currentParagraph.length) return;
    blocks.push({ type: 'p', text: currentParagraph.join(' ').trim() });
    currentParagraph = [];
  };

  const flushList = () => {
    if (!currentList.length) return;
    blocks.push({ type: 'ul', items: currentList.slice() });
    currentList = [];
  };

  for (const raw of lines) {
    const line = String(raw || '').trim();
    if (!line) {
      flushParagraph();
      flushList();
      continue;
    }

    if (line.startsWith('- ')) {
      flushParagraph();
      currentList.push(line.slice(2).trim());
      continue;
    }

    flushList();
    currentParagraph.push(line);
  }

  flushParagraph();
  flushList();

  return (
    <div className="space-y-3">
      {blocks.map((b, idx) => {
        if (b.type === 'ul') {
          return (
            <ul key={idx} className="list-disc pl-5 space-y-1">
              {(b.items || []).map((it, i) => (
                <li key={i}>{it}</li>
              ))}
            </ul>
          );
        }
        return (
          <p key={idx} className="leading-relaxed">
            {b.text}
          </p>
        );
      })}
    </div>
  );
}

export default function Faq() {
  const { t } = useI18n();
  const [q, setQ] = useState('');

  const localizedFaqItems = useMemo(() => {
    return FAQ_ITEMS.map((x) => ({
      ...x,
      title: t(`faq_item_${x.id}_title`),
      body: t(`faq_item_${x.id}_body`),
    }));
  }, [t]);

  const filtered = useMemo(() => {
    const nq = normalize(q);
    if (!nq) return localizedFaqItems;
    return localizedFaqItems.filter((x) => {
      const hay = normalize(`${x.title}\n${x.body}`);
      return hay.includes(nq);
    });
  }, [q, localizedFaqItems]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-white dark:from-slate-950 dark:via-slate-950 dark:to-slate-950">
      <div className="container mx-auto max-w-5xl px-4 py-8 md:py-10">
        <div className="flex flex-col gap-6">
          <div className="flex items-center justify-between gap-4">
            <Link
              to={createPageUrl('Dashboard')}
              className="inline-flex items-center"
              aria-label={t('faq_back_aria')}
            >
              <Logo size="small" showText />
            </Link>

            <Link
              to={createPageUrl('Dashboard')}
              className="text-sm font-semibold text-blue-700 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
            >
              {t('faq_back_to_dashboard')}
            </Link>
          </div>

          <div className="rounded-2xl border border-slate-200/70 bg-white/70 backdrop-blur supports-[backdrop-filter]:bg-white/60 shadow-sm dark:border-slate-800/80 dark:bg-slate-900/30">
            <div className="px-6 py-7 md:px-8 md:py-8">
              <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
                <div className="min-w-0">
                  <h1
                    className="text-4xl md:text-5xl font-black tracking-tight text-slate-900 dark:text-white"
                    style={{ fontFamily: "'Space Grotesk', sans-serif", letterSpacing: '-0.03em' }}
                  >
                    {t('faq_title')}
                  </h1>
                  <p className="text-base md:text-lg text-slate-600 dark:text-slate-300 mt-2 font-medium">
                    {t('faq_subtitle')}
                  </p>
                </div>
              </div>

              <div className="mt-6">
                <Input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder={t('faq_search_placeholder')}
                  className="h-11 text-base bg-white/80 dark:bg-slate-950/40"
                />
              </div>
            </div>
          </div>

          <div className="space-y-5">
            {filtered.map((item) => (
              <Card
                key={item.id}
                className="border-slate-200/80 dark:border-slate-800/80 shadow-sm hover:shadow-md transition-shadow bg-white/90 dark:bg-slate-900/30"
              >
                <CardHeader className="pb-3">
                  <CardTitle
                    className="text-xl md:text-2xl font-extrabold text-slate-900 dark:text-white"
                    style={{ fontFamily: "'Space Grotesk', sans-serif", letterSpacing: '-0.015em' }}
                  >
                    {item.title}
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="text-[15px] md:text-base text-slate-700 dark:text-slate-200 leading-relaxed" style={{ fontFamily: "'Inter', sans-serif" }}>
                    {renderFaqBody(item.body)}
                  </div>
                </CardContent>
              </Card>
            ))}

            {filtered.length === 0 ? (
              <div className="text-sm text-slate-600 dark:text-slate-400">{t('faq_no_results')}</div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
