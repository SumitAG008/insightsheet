// Sample data for demos: fictional companies in the sectors meldra sells to, plus complex cases
// built to break spreadsheets and macros. The files live in public/sample-data and are generated
// by scripts/build_showcase.py. Every "you will see" line below is checked against the product
// code in src/lib/showcase.test.js and backend/tests/test_showcase_pack.py; keep them in step.

export const SAMPLE_BASE = '/sample-data/';

export const SAMPLES = [
  {
    id: 'law-firm',
    sector: 'Law firms',
    solution: 'law-firms',
    company: 'Hartwell & Lane LLP',
    file: 'law-firm-hartwell-lane.xlsx',
    summary: 'A 14-lawyer firm: six months of time entries, 36 matters, monthly management accounts and aged debt.',
    tabs: ['Time entries (4,900+ rows)', 'Matters', 'Management accounts', 'Aged debt'],
    tool: 'workbench',
    steps: [
      'Open it in Workbench. Every tab is read at once, including the accounts tab with a title above the table.',
      'Charts for every tab: hours by practice area and by grade, time value by partner, net profit by month, and who owes the most.',
      'Get work done: "One sheet per Practice area" gives each head of department their own sheet in one download.',
      'Try asking (an AI answer; check the figures): "Which practice area has the lowest realisation, and why?"',
    ],
    youWillSee: [
      'Real Estate records the most hours but realises the least of its time value (about 75%), against about 90% in Corporate.',
      'Linden Care Homes owes the most; Northgate Retail and Silverline Haulage have most of their debt over 90 days.',
      'Net profit of £92k to £112k a month.',
    ],
  },
  {
    id: 'finance',
    sector: 'Finance teams',
    solution: 'finance',
    company: 'Northbridge Group plc',
    file: 'finance-northbridge-group.xlsx',
    summary: 'A £23.5m group: twelve-month P&L, budget against actual for six departments, and key-account invoices.',
    tabs: ['Group P&L', 'Budget vs actual', 'Key account invoices'],
    tool: 'workbench',
    steps: [
      'Open it in Workbench and choose "Charts for every tab": the P&L becomes one line per item over twelve months.',
      'In Get work done, pick the Budget vs actual tab and build "Total Variance by Department" from the two drop-downs.',
      'Download the charts as PowerPoint: native charts you can restyle, not pictures.',
    ],
    youWillSee: [
      'Revenue of £23.5m and EBITDA of £4.0m, a 17.2% margin.',
      'Technology is the only department over budget for the year, by about £38k, from March to June.',
      'UK & Ireland is the largest region for key accounts.',
    ],
  },
  {
    id: 'university',
    sector: 'Universities',
    solution: 'universities',
    company: 'Ashford University',
    file: 'university-ashford.xlsx',
    summary: 'Five years of enrolment by faculty, 900 students with attendance and continuation, survey scores and research income.',
    tabs: ['Enrolment', 'Students', 'Student survey', 'Research income'],
    tool: 'workbench',
    steps: [
      'Open it in Workbench. The enrolment tab, with years across the top, charts as a trend per faculty.',
      'Attendance and survey scores are averaged, not added up, because a total of percentages means nothing.',
      'Try asking (an AI answer; check the figures): "How does attendance relate to students withdrawing?"',
    ],
    youWillSee: [
      'Computing enrolment up about 40% in five years; Arts & Humanities down about 19%.',
      'Average attendance from 79% (Arts & Humanities) to 92% (Health Sciences).',
      'Students under 70% attendance withdraw at about six times the overall rate (28.6% against 4.6%).',
    ],
  },
  {
    id: 'insurance',
    sector: 'Insurance',
    solution: 'insurance',
    company: 'Kingsmere Underwriting',
    file: 'insurance-kingsmere-claims.xlsx',
    summary: 'A claims bordereau of 640 claims across four lines of business, with premiums by month.',
    tabs: ['Claims', 'Premiums'],
    tool: 'workbench',
    steps: [
      'Open it in Workbench: incurred claims by status, by line of business and by month of loss.',
      'Get work done on Claims: "One sheet per Status" separates open, closed and reopened claims for review.',
      'Run "Total Incurred by Line of business" on Claims and "Total Earned premium by Line of business" on Premiums: incurred divided by earned is the loss ratio.',
      'Try asking: "What is the loss ratio by line of business?" (an AI answer: check it against the two totals).',
    ],
    youWillSee: [
      'Liability has the largest incurred claims (£4.65m).',
      'Marine runs the highest loss ratio, about 71%.',
      '£4.1m held in reserves on open and reopened claims.',
    ],
  },
  {
    id: 'manufacturing',
    sector: 'Manufacturing',
    solution: 'manufacturing',
    company: 'Corran Precision Ltd',
    file: 'manufacturing-corran-precision.xlsx',
    summary: 'A quarter of production by line and shift, an inventory list against reorder points, and OEE by line.',
    tabs: ['Production', 'Inventory', 'OEE'],
    tool: 'workbench',
    steps: [
      'Open it in Workbench: units by line and product, and the monthly trend.',
      'Get work done on Inventory: "Total On hand by Stock status" shows what needs reordering.',
      'Try asking (an AI answer; check the figures): "Which line has the worst scrap rate and the most downtime?"',
    ],
    youWillSee: [
      'Line C scraps about 4% of what it makes, more than twice the other lines.',
      'Line D loses more than twice as many minutes to downtime as any other line.',
      '12 stock items are below their reorder point.',
    ],
  },
  {
    id: 'hr',
    sector: 'HR and payroll',
    solution: 'hr-payroll',
    company: 'Fernhill Systems Ltd',
    file: 'hr-fernhill-people.xlsx',
    summary: '125 employees with grade, location and salary, and six months of payroll by department.',
    tabs: ['Employees', 'Payroll'],
    tool: 'workbench',
    steps: [
      'Open it in Workbench: salary cost by location and grade, and payroll by department.',
      'For a system migration, use Migration and "Try a sample system extract": a deliberately messy HR extract.',
    ],
    youWillSee: ['103 active employees; Engineering carries the largest payroll.'],
  },
];

export const COMPLEX_CASES = [
  {
    id: 'messy-pack',
    title: 'The workbook that breaks macros',
    files: ['complex/messy-management-pack.xlsx'],
    tool: 'workbench',
    problem:
      'A cover page, an empty tab, titles above the tables, amounts typed as "£5,610.70" and "(1,250.00)", three date formats in one column, "north" next to "North", a missing amount and two duplicate rows.',
    steps: [
      'Open it in Workbench. The cover and empty tabs are recognised and skipped; the tables are found under their titles.',
      'Check quality on "Regional sales" lists every problem, each with its fix already ticked.',
      'Preview, then download the clean copy of that tab.',
    ],
    youWillSee: [
      '2 duplicate rows removed and 1 inconsistent spelling fixed, so Region has exactly North, South and West.',
      'Every date becomes a real date, read day-first: 03/07/2026 is 3 July.',
      'Four credit notes in brackets become negative numbers.',
    ],
  },
  {
    id: 'bank-rec',
    title: 'Bank statement against cash book',
    files: ['complex/bank-statement-september.csv', 'complex/cash-book-september.xlsx'],
    tool: 'reconciliation',
    problem:
      'September: 180 payments. Six have not cleared, the bank took three charges the books do not have, three amounts were keyed wrongly, one payment was entered twice, two differ by a penny and three references have stray spaces.',
    steps: [
      'Open Reconciliation. Left: cash-book-september.xlsx. Right: bank-statement-september.csv.',
      'Key: Reference on both sides. Amount: Amount on both sides. Tolerance: 0.01.',
      'Run it and download the exceptions workbook.',
    ],
    youWillSee: [
      '170 matched, 4 mismatched (the three typos and the double entry), 6 only in the cash book, 3 only at the bank.',
      'Set the tolerance to 0 and the two penny differences appear as mismatches too.',
    ],
  },
  {
    id: 'intercompany',
    title: 'Intercompany balances that should agree',
    files: ['complex/intercompany-uk.xlsx', 'complex/intercompany-de.xlsx'],
    tool: 'reconciliation',
    problem:
      'The UK and German companies each list what they owe each other. One invoice used a different exchange rate, one had a part-payment netted off, one is not yet booked in Germany and one is booked only there.',
    steps: [
      'Open Reconciliation with the UK file on the left and the German file on the right.',
      'Key: IC reference. Amount: Amount GBP.',
    ],
    youWillSee: ['37 matched, 2 mismatched, 1 missing on each side: the four planted differences and nothing else.'],
  },
  {
    id: 'unified',
    title: 'Answers across four systems',
    files: [],
    tool: 'unified',
    problem:
      'HR, expenses, budget and CRM exports that cannot answer "expenses against budget by department" on their own, because expenses only carry an employee ID.',
    steps: ['Open Unified Reporting and load the sample company, or use the test pack and its script.'],
    youWillSee: ['Expenses by department through the HR link, against budget, with the checks behind each number.'],
    link: '/unified-reporting-test-pack/README.html',
  },
  {
    id: 'migration',
    title: 'A messy HR extract made load-ready',
    files: [],
    tool: 'migration',
    problem:
      'An eight-tab HR extract with mixed date formats, M/F/Male values, country names and codes, a manager outside the extract and departments missing from the org list.',
    steps: ['Open Migration and choose "Try a sample system extract".'],
    youWillSee: ['Each problem listed with the rows it affects, and load files that pass the target system\'s checks.'],
  },
];

export const TOOL_LINKS = {
  workbench: { label: 'Open in Workbench', to: '/workbench' },
  reconciliation: { label: 'Open Reconciliation', to: '/Reconciliation' },
  unified: { label: 'Open Unified Reporting', to: '/unified-reporting' },
  migration: { label: 'Open Migration', to: '/migration' },
};

export const sampleUrl = (file) => `${SAMPLE_BASE}${file}`;

export const SAMPLES_BY_ID = Object.fromEntries(SAMPLES.map((s) => [s.id, s]));

/** Fetch a sample as a File, as if the person had chosen it. */
export async function fetchSample(file, fetchImpl = fetch) {
  const res = await fetchImpl(sampleUrl(file));
  if (!res.ok) throw new Error(`The sample ${file} could not be loaded (${res.status}).`);
  const blob = await res.blob();
  const name = file.split('/').pop();
  const type = name.endsWith('.csv') ? 'text/csv' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
  return new File([blob], name, { type });
}
