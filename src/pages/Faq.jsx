import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Logo from '@/components/branding/Logo';

const FAQ_ITEMS = [
  {
    id: 'overview',
    title: 'What is the Dashboard Overview tab?',
    body: `Overview is your executive summary.

It shows:
- KPIs (totals, averages, distributions) from your current dataset
- A small set of charts chosen from your data
- A "Trusted from Excel (Strict Correctness)" panel when you upload Excel, which only renders charts that can be justified from real sheet structure (no fake trends).`,
  },
  {
    id: 'trusted-excel',
    title: 'What does "Trusted from Excel (Strict Correctness)" mean?',
    body: `It means meldra will only display charts when it can prove the X-axis and values are real.

Examples:
- A monthly sheet (Jan-25…Dec-25) will show a 12-point trend.
- A random row index will NOT be used as a timeline.

If structure is unclear, meldra asks for clarification instead of guessing.`,
  },
  {
    id: 'universal-analyze',
    title: 'What is Universal Analyze (Excel Intelligence)?',
    body: `Universal Analyze inspects an uploaded Excel workbook and tries to detect:
- Tables/regions inside each sheet
- Header row (especially month/quarter/year headers)
- Category rows (e.g., salesperson/product)
- Value cells

It returns:
- Diagnostics (formula cache risk)
- Sheet insights (pattern/tier/confidence)
- Trusted chart-ready aggregates (when confidence is high)`,
  },
  {
    id: 'blocked',
    title: 'What does it mean when my Excel is "blocked"?',
    body: `Blocked means formulas exist but cached results appear missing, so showing charts would be misleading.

How to fix:
- Open the workbook in Excel
- Let it calculate
- Save
- Re-upload

Alternative: Copy → Paste Special → Values, then save as a new file and upload it.`,
  },
  {
    id: 'clarify',
    title: 'What does "needs clarification" mean?',
    body: `It means meldra detected structure but needs you to confirm which row is the header and where data starts.

In Overview → Trusted from Excel:
- Choose the sheet
- Enter the header row number (the row with month/period labels)
- Enter the data start row number
- Click "Apply & re-analyze"`,
  },
  {
    id: 'file-analysis',
    title: 'What can I do in File Analysis?',
    body: `File Analysis is for understanding a file quickly.

You can:
- Upload a file and get a preview
- Extract key text/structure (depending on file type)
- Run analysis workflows that summarize or prepare data for downstream steps

If you want charts and interactive exploration, use Dashboard.`,
  },
  {
    id: 'doc-conversion',
    title: 'What can I do in Doc Conversion?',
    body: `Doc Conversion converts documents into usable outputs.

Typical uses:
- PDF/DOC/PPT conversions
- OCR extraction for scanned documents
- Exporting to formats you can edit

Note: Some conversions render pages as images, so charts/text may not be editable unless the converter reconstructs shapes and data.`,
  },
  {
    id: 'ai-assistant',
    title: 'What is the AI Assistant tab for?',
    body: `AI Assistant helps you ask questions and generate outputs from your current dataset.

Use it to:
- Ask business questions in natural language
- Get explanations and suggestions
- Generate formulas or transformations

Always review outputs before sharing externally.`,
  },
  {
    id: 'data-schema',
    title: 'What is Data & Schema used for?',
    body: `Data & Schema helps you understand table structure and relationships.

Use it to:
- Inspect columns/types
- Import schema and relationships
- Generate SQL/model mappings

This is most useful when connecting to databases or building a reusable data model.`,
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
  const [q, setQ] = useState('');

  const filtered = useMemo(() => {
    const nq = normalize(q);
    if (!nq) return FAQ_ITEMS;
    return FAQ_ITEMS.filter((x) => {
      const hay = normalize(`${x.title}\n${x.body}`);
      return hay.includes(nq);
    });
  }, [q]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-white dark:from-slate-950 dark:via-slate-950 dark:to-slate-950">
      <div className="container mx-auto max-w-5xl px-4 py-8 md:py-10">
        <div className="flex flex-col gap-6">
          <div className="flex items-center justify-between gap-4">
            <Link
              to={createPageUrl('Dashboard')}
              className="inline-flex items-center"
              aria-label="Back to Dashboard"
            >
              <Logo size="small" showText />
            </Link>

            <Link
              to={createPageUrl('Dashboard')}
              className="text-sm font-semibold text-blue-700 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
            >
              Back to Dashboard
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
                    FAQ
                  </h1>
                  <p className="text-base md:text-lg text-slate-600 dark:text-slate-300 mt-2 font-medium">
                    Definitions and expectations for the main tabs and features.
                  </p>
                </div>
              </div>

              <div className="mt-6">
                <Input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search FAQ (e.g. 'blocked', 'overview', 'conversion')"
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
              <div className="text-sm text-slate-600 dark:text-slate-400">No results.</div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
