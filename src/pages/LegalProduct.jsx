// Public page for meldra Legal (website only). The product itself is hidden in the app unless the firm
// has bought it; this page is where firms in India and the UK learn about it and ask for access.
import { Link } from 'react-router-dom';
import { ArrowRight, BarChart3, BookOpen, CalendarCheck, FileSpreadsheet, Languages, Lock, Scale, ShieldCheck, Smartphone, Sparkles } from 'lucide-react';
import Logo from '@/components/branding/Logo';

const SALES = 'mailto:sales@meldra.ai?subject=meldra%20Legal%20%E2%80%94%20request%20access';

const FEATURES = [
  { icon: CalendarCheck, title: 'Daily hearing list', body: 'Every hearing for the day by court and item, the chance of an adjournment learned from your own history, and clashes when one lawyer is listed in two courts.' },
  { icon: Smartphone, title: 'Update in 15 seconds after court', body: 'Outcome, next date, purpose and notes from the phone. Paste or photograph the order sheet and meldra fills in the next date for you to check.' },
  { icon: ShieldCheck, title: 'Deadlines a person confirms', body: 'Limitation Act and CPC periods in India; CPR and Employment Tribunal time limits in the UK. A suggested date, confirmed by a named person. Never legal advice.' },
  { icon: BookOpen, title: 'Judgments one click away', body: 'Find Case Law search and summaries for the UK; links to eCourts, the Supreme Court and Indian Kanoon for India, with licensed sources added as firms ask.' },
  { icon: Sparkles, title: 'Citation and section checks', body: 'Checks every citation in a draft and merges repeats. Converts IPC ↔ BNS, CrPC ↔ BNSS and Evidence Act ↔ BSA, and flags old sections on new offences.' },
  { icon: FileSpreadsheet, title: 'Bring your Excel diary', body: 'Upload the diary you already keep. Columns like Case No, Parties, Court, NDOH and Advocate are recognised, in English or Hindi.' },
  { icon: BarChart3, title: 'Partner reports', body: 'Cases by court and stage, adjournments, ageing cases, workload per lawyer and fees billed against received.' },
  { icon: Languages, title: 'English and हिन्दी', body: 'The whole diary in English or Hindi, with standard Hindi legal terms. Case names, citations and sections stay exactly as in the original.' },
];

const COUNTRIES = [
  {
    flag: '🇮🇳',
    name: 'India',
    lines: ['CNR, case type, number, year and bench', 'Supreme Court, High Courts, district courts, NCLT, consumer commissions, DRT', 'Limitation Act and CPC deadlines', '₹ and dd/mm/yyyy; data kept in line with the DPDP Act 2023'],
  },
  {
    flag: '🇬🇧',
    name: 'United Kingdom',
    lines: ['Claim numbers for the High Court, County Court and Employment Tribunal', 'Works next to Clio, LEAP or your practice system', 'CPR deadlines (e.g. defence 14 or 28 days after service), ET time limits', '£ and dd/mm/yyyy; UK GDPR and SRA confidentiality'],
  },
];

export default function LegalProduct() {
  return (
    <div className="min-h-screen bg-white text-slate-900">
      <header className="border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <Link to="/" aria-label="meldra home"><Logo /></Link>
          <div className="flex items-center gap-2">
            <Link to="/login" className="text-sm font-semibold px-3 py-2 rounded-lg hover:bg-slate-100">Sign in</Link>
            <a href={SALES} className="text-sm font-semibold px-3 py-2 rounded-lg bg-blue-700 text-white">Request access</a>
          </div>
        </div>
      </header>

      <section className="max-w-6xl mx-auto px-4 pt-14 pb-10">
        <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-blue-700 bg-blue-50 px-3 py-1 rounded-full mb-4"><Scale className="w-3.5 h-3.5" />meldra Legal · for law firms</div>
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight max-w-3xl" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
          The case diary your firm already keeps, on every lawyer’s phone.
        </h1>
        <p className="mt-4 text-lg text-slate-600 max-w-2xl">
          Matters, hearings, deadlines and reports in one place, for firms in India and the UK. Import your Excel diary on day one; run the day from the phone; partners see the whole firm.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <a href={SALES} className="inline-flex items-center gap-2 rounded-lg px-5 py-3 font-semibold bg-blue-700 text-white">Request access <ArrowRight className="w-4 h-4" /></a>
          <Link to="/showcase" className="inline-flex items-center gap-2 rounded-lg px-5 py-3 font-semibold bg-slate-100">See sample firms</Link>
        </div>
        <p className="mt-3 text-sm text-slate-500">A paid add-on to meldra, enabled per firm. Priced per lawyer.</p>
      </section>

      <section className="bg-slate-50 border-y border-slate-200">
        <div className="max-w-6xl mx-auto px-4 py-12 grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {FEATURES.map(({ icon: Icon, title, body }) => (
            <div key={title} className="bg-white rounded-xl border border-slate-200 p-5">
              <Icon className="w-6 h-6 text-blue-700 mb-3" />
              <h2 className="font-semibold mb-1">{title}</h2>
              <p className="text-sm text-slate-600">{body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-4 py-12">
        <h2 className="text-2xl font-bold mb-6">One diary, set up for your country</h2>
        <div className="grid md:grid-cols-2 gap-4">
          {COUNTRIES.map((c) => (
            <div key={c.name} className="rounded-xl border border-slate-200 p-6">
              <div className="text-lg font-semibold mb-3">{c.flag} {c.name}</div>
              <ul className="space-y-2 text-sm text-slate-700 list-disc pl-5">{c.lines.map((l) => <li key={l}>{l}</li>)}</ul>
            </div>
          ))}
        </div>
        <p className="mt-4 text-sm text-slate-500">The profile is chosen from your location and can be changed at any time.</p>
      </section>

      <section className="max-w-6xl mx-auto px-4 pb-14">
        <div className="rounded-2xl bg-slate-900 text-white p-8 grid md:grid-cols-[auto_1fr] gap-6 items-start">
          <Lock className="w-10 h-10 text-blue-300" />
          <div>
            <h2 className="text-xl font-semibold mb-2">Confidential by design</h2>
            <p className="text-slate-300 text-sm max-w-3xl">
              Your case diary is stored encrypted and kept separately for your firm. Uploaded files are processed in memory and not kept. We link to court websites rather than copying from them, and every AI answer comes only from your own diary or the judgment in front of it.
            </p>
            <a href={SALES} className="mt-5 inline-flex items-center gap-2 rounded-lg px-5 py-3 font-semibold bg-white text-slate-900">Talk to us <ArrowRight className="w-4 h-4" /></a>
          </div>
        </div>
      </section>

      <footer className="border-t border-slate-200 py-6 text-center text-xs text-slate-500">
        meldra Legal organises your firm’s information. It does not give legal advice. · <Link to="/privacy" className="underline">Privacy</Link> · <Link to="/terms" className="underline">Terms</Link>
      </footer>
    </div>
  );
}
