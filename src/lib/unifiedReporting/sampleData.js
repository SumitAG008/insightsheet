/**
 * Unified Reporting — sample unified model.
 *
 * Six business systems feeding one model, with customers matched across
 * systems by a Meldra ID. Generated deterministically (seeded RNG) so every
 * viewer sees the same numbers. Replace with real sources as connectors land.
 */

function rng(seed) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

const r = rng(42);
const pick = (a) => a[Math.floor(r() * a.length)];

export const TODAY = '2026-09-26';
const TODAY_MS = Date.UTC(2026, 8, 26);

export const MONTHS = [];
for (let i = 0; i < 12; i++) {
  const d = new Date(Date.UTC(2025, 9 + i, 1));
  MONTHS.push(d.toISOString().slice(0, 7));
}
const day = (m) => `${m}-${String(1 + Math.floor(r() * 28)).padStart(2, '0')}`;

/** Golden customer records: one Meldra Customer ID each. */
export const GOLD = {
  'Vodafone UK': { region: 'South', industry: 'Telecom', size: 1.4 },
  'BT Group': { region: 'London', industry: 'Telecom', size: 1.3 },
  'Ericsson Ltd': { region: 'South', industry: 'Telecom', size: 0.8 },
  'Volkswagen Group UK': { region: 'Midlands', industry: 'Automotive', size: 1.1 },
  Barclays: { region: 'London', industry: 'Finance', size: 1.2 },
  Tesco: { region: 'Midlands', industry: 'Retail', size: 0.9 },
  'Siemens UK': { region: 'North', industry: 'Industrial', size: 0.7 },
  'NHS Supply Chain': { region: 'North', industry: 'Healthcare', size: 0.6 },
};

/** Possible matches that need a human decision before they merge. */
export const PENDING = [
  {
    id: 'm1',
    src: 'British Telecommunications plc',
    sys: 'Billing',
    golden: 'BT Group',
    evidence: 'Same postcode (EC1A 7AJ) and 86% name similarity. Billing has no VAT number to confirm it.',
    what: 'invoices',
  },
  {
    id: 'm2',
    src: 'VW Group UK',
    sys: 'Salesforce',
    golden: 'Volkswagen Group UK',
    evidence: 'Same city (Milton Keynes) and 79% name similarity. The VAT number is written differently.',
    what: 'opportunities',
  },
];

const PL = ['Connectivity', 'Cloud', 'Security', 'Devices', 'Services'];

export const DATA = { orders: [], invoices: [], pipeline: [], employees: [], expenses: [], spend: [] };

for (const m of MONTHS) {
  for (const c in GOLD) {
    const n = 1 + Math.floor(r() * 3);
    for (let k = 0; k < n; k++) {
      const amt = Math.round(18000 * GOLD[c].size * (0.5 + r() * 1.1) * (1 + MONTHS.indexOf(m) * 0.02));
      const date = day(m);
      const pl = pick(PL);
      DATA.orders.push({ date, customer: c, region: GOLD[c].region, industry: GOLD[c].industry, product_line: pl, amount: amt });
      if (r() < 0.9) {
        const idate = new Date(Date.parse(date) + (5 + Math.floor(r() * 30)) * 864e5);
        if (idate.getTime() <= TODAY_MS) {
          const age = Math.floor((TODAY_MS - idate.getTime()) / 864e5);
          const status = age > 45 ? (r() < 0.88 ? 'Paid' : 'Overdue') : age > 30 ? (r() < 0.55 ? 'Paid' : 'Overdue') : 'Sent';
          const src = c === 'BT Group' ? 'British Telecommunications plc' : c;
          DATA.invoices.push({
            date: idate.toISOString().slice(0, 10),
            source_customer: src,
            product_line: pl,
            amount: Math.round(amt * (0.85 + r() * 0.15)),
            status,
            days_overdue: status === 'Overdue' ? Math.max(1, age - 30) : 0,
          });
        }
      }
    }
  }
}

const STAGES = ['Qualify', 'Propose', 'Negotiate', 'Closed won', 'Closed lost'];
const OWNERS = ['J. Patel', 'M. Okafor', 'S. Lindqvist', 'D. Alvarez', 'A. Mensah'];
for (let i = 0; i < 90; i++) {
  const c = pick(Object.keys(GOLD));
  DATA.pipeline.push({
    source_customer: c === 'Volkswagen Group UK' ? 'VW Group UK' : c,
    stage: pick(STAGES),
    owner: pick(OWNERS),
    close_month: ['2026-09', '2026-10', '2026-11', '2026-12', '2027-01', '2027-02', '2027-03'][Math.floor(r() * 7)],
    amount: Math.round(40000 * GOLD[c].size * (0.4 + r() * 1.6)),
  });
}

const DEPTS = { Sales: 30, Engineering: 44, Finance: 12, HR: 8, Operations: 22, Support: 24 };
const LVL = { L1: 42000, L2: 56000, L3: 74000, L4: 98000, L5: 135000 };
Object.entries(DEPTS).forEach(([d, n]) => {
  for (let i = 0; i < n; i++) {
    const lv = pick(['L1', 'L2', 'L2', 'L3', 'L3', 'L4', 'L5']);
    const y = 2019 + Math.floor(r() * 8);
    const hm = y === 2026 ? Math.floor(r() * 9) : Math.floor(r() * 12);
    DATA.employees.push({
      department: d,
      country: pick(['UK', 'UK', 'UK', 'Germany', 'Sweden', 'India']),
      level: lv,
      status: r() < 0.9 ? 'Active' : 'Left',
      hire_date: `${y}-${String(hm + 1).padStart(2, '0')}-${String(1 + Math.floor(r() * 28)).padStart(2, '0')}`,
      salary: Math.round(LVL[lv] * (0.9 + r() * 0.2)),
    });
  }
});

const EXW = { Sales: 5, Engineering: 2, Finance: 1, HR: 1, Operations: 2, Support: 1 };
const EXD = Object.entries(EXW).flatMap(([d, w]) => Array(w).fill(d));
const CAT = { Travel: [120, 900], Hotels: [90, 420], Meals: [15, 140], Software: [20, 300], Training: [150, 1400] };
for (let i = 0; i < 320; i++) {
  const c = pick(Object.keys(CAT));
  const [a, b] = CAT[c];
  DATA.expenses.push({
    date: day(pick(MONTHS)),
    department: pick(EXD),
    category: c,
    amount: Math.round(a + r() * (b - a)),
    in_policy: r() < 0.9 ? 'Yes' : 'No',
  });
}

const SUP = { AWS: 'Cloud', Microsoft: 'Software', Dell: 'Hardware', Accenture: 'Consulting', Capita: 'Facilities', Cisco: 'Hardware', 'Salesforce Inc': 'Software' };
for (let i = 0; i < 220; i++) {
  const s = pick(Object.keys(SUP));
  const base = SUP[s] === 'Consulting' ? 30000 : SUP[s] === 'Cloud' ? 18000 : 6000;
  DATA.spend.push({
    date: day(pick(MONTHS)),
    supplier: s,
    category: SUP[s],
    department: pick(Object.keys(DEPTS)),
    amount: Math.round(base * (0.3 + r() * 1.4)),
    on_contract: r() < 0.8 ? 'Yes' : 'No',
  });
}

/** Views of the unified model: what can be broken down by what. */
export const VIEWS = {
  invoices: {
    label: 'Invoices',
    sys: 'Billing',
    dims: ['customer', 'region', 'industry', 'product_line', 'status', 'month'],
    measures: ['amount', 'days_overdue'],
    desc: 'Invoices issued to customers (GBP). month is the invoice month.',
  },
  orders: {
    label: 'Sales orders',
    sys: 'SAP S/4',
    dims: ['customer', 'region', 'industry', 'product_line', 'month'],
    measures: ['amount'],
    desc: 'Customer sales orders (GBP). month is the order month.',
  },
  pipeline: {
    label: 'Opportunities',
    sys: 'Salesforce',
    dims: ['customer', 'region', 'industry', 'stage', 'owner', 'month'],
    measures: ['amount'],
    desc: 'Sales opportunities (GBP). month is the expected close month.',
  },
  employees: {
    label: 'Employees',
    sys: 'SuccessFactors',
    dims: ['department', 'country', 'level', 'status', 'month'],
    measures: ['salary'],
    desc: 'One row per employee. Count rows for headcount; filter status = Active for current headcount. month is the hire month.',
  },
  expenses: {
    label: 'Expenses',
    sys: 'Concur',
    dims: ['department', 'category', 'in_policy', 'month'],
    measures: ['amount'],
    desc: 'Employee expense claims (GBP).',
  },
  spend: {
    label: 'Supplier spend',
    sys: 'Ariba',
    dims: ['supplier', 'category', 'department', 'on_contract', 'month'],
    measures: ['amount'],
    desc: 'Purchase orders with suppliers (GBP).',
  },
};

export const SYSTEMS = [
  { name: 'SAP S/4', holds: 'Sales orders, customers', view: 'orders' },
  { name: 'Billing', holds: 'Invoices, payments', view: 'invoices' },
  { name: 'Salesforce', holds: 'Opportunities, accounts', view: 'pipeline' },
  { name: 'SuccessFactors', holds: 'Employees, departments', view: 'employees' },
  { name: 'Concur', holds: 'Expense claims', view: 'expenses' },
  { name: 'Ariba', holds: 'Suppliers, purchase orders', view: 'spend' },
];

/** Shared (conformed) dimensions that let systems be combined. */
export const CONFORMED = [
  { name: 'Customer', key: 'Meldra Customer ID', systems: ['SAP S/4', 'Billing', 'Salesforce'] },
  { name: 'Department', key: 'Meldra Department ID', systems: ['SuccessFactors', 'Concur', 'Ariba'] },
  { name: 'Month', key: 'Calendar month', systems: ['All systems'] },
];

export const CATALOG = ['Workday', 'Oracle ERP', 'Microsoft Dynamics 365', 'NetSuite', 'HubSpot', 'Snowflake', 'Databricks', 'Any REST API', 'SQL database'];

export const PERSONAS = {
  Finance: [
    ['Which customers have overdue invoices?', 'Billing'],
    ['Ordered vs invoiced by customer', 'SAP S/4 + Billing'],
    ['Invoiced amount by month', 'Billing'],
  ],
  Sales: [
    ['Open pipeline by stage', 'Salesforce'],
    ['Top 5 customers by orders this year', 'SAP S/4'],
    ['Customers: invoiced vs days overdue, sized by pipeline', 'Billing + Salesforce'],
  ],
  People: [
    ['Cost per employee by department', 'SuccessFactors + Concur + Ariba'],
    ['Headcount vs expenses by department', 'SuccessFactors + Concur'],
    ['Average salary by level', 'SuccessFactors'],
  ],
  Procurement: [
    ['Off-contract spend by supplier', 'Ariba'],
    ['Spend by category', 'Ariba'],
    ['Supplier spend vs expenses by department', 'Ariba + Concur'],
  ],
};
