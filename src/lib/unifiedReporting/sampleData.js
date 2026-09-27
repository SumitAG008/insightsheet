/**
 * Optional sample dataset: six business systems, loaded through exactly the
 * same pipeline as an uploaded file. Generated with a seeded RNG so every
 * viewer sees the same numbers.
 *
 * Expenses (Concur) carry only an employee_id, so breaking them down by
 * department works through the SuccessFactors employee file — the same
 * lookup a real Concur + SuccessFactors setup needs.
 */
import { sourceFromRows, suggestRelationships } from './model';

function rng(seed) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

export function buildSampleSources() {
  const r = rng(42);
  const pick = (a) => a[Math.floor(r() * a.length)];
  const TODAY_MS = Date.UTC(2026, 8, 26);
  const MONTHS = [];
  for (let i = 0; i < 12; i++) MONTHS.push(new Date(Date.UTC(2025, 9 + i, 1)).toISOString().slice(0, 7));
  const day = (m) => `${m}-${String(1 + Math.floor(r() * 28)).padStart(2, '0')}`;

  const CUSTOMERS = {
    'Vodafone UK': { region: 'South', industry: 'Telecom', size: 1.4 },
    'BT Group': { region: 'London', industry: 'Telecom', size: 1.3 },
    'Ericsson Ltd': { region: 'South', industry: 'Telecom', size: 0.8 },
    'Volkswagen Group UK': { region: 'Midlands', industry: 'Automotive', size: 1.1 },
    Barclays: { region: 'London', industry: 'Finance', size: 1.2 },
    Tesco: { region: 'Midlands', industry: 'Retail', size: 0.9 },
    'Siemens UK': { region: 'North', industry: 'Industrial', size: 0.7 },
    'NHS Supply Chain': { region: 'North', industry: 'Healthcare', size: 0.6 },
  };
  const PL = ['Connectivity', 'Cloud', 'Security', 'Devices', 'Services'];

  const orders = [];
  const invoices = [];
  for (const m of MONTHS) {
    for (const c in CUSTOMERS) {
      const n = 1 + Math.floor(r() * 3);
      for (let k = 0; k < n; k++) {
        const amount = Math.round(18000 * CUSTOMERS[c].size * (0.5 + r() * 1.1) * (1 + MONTHS.indexOf(m) * 0.02));
        const order_date = day(m);
        const product_line = pick(PL);
        orders.push({ order_id: `SO-${10000 + orders.length}`, order_date, customer: c, region: CUSTOMERS[c].region, industry: CUSTOMERS[c].industry, product_line, amount });
        if (r() < 0.9) {
          const idate = new Date(Date.parse(order_date) + (5 + Math.floor(r() * 30)) * 864e5);
          if (idate.getTime() <= TODAY_MS) {
            const age = Math.floor((TODAY_MS - idate.getTime()) / 864e5);
            const status = age > 45 ? (r() < 0.88 ? 'Paid' : 'Overdue') : age > 30 ? (r() < 0.55 ? 'Paid' : 'Overdue') : 'Sent';
            invoices.push({
              invoice_id: `INV-${50000 + invoices.length}`,
              invoice_date: idate.toISOString().slice(0, 10),
              customer: c,
              product_line,
              amount: Math.round(amount * (0.85 + r() * 0.15)),
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
  const pipeline = [];
  for (let i = 0; i < 90; i++) {
    const c = pick(Object.keys(CUSTOMERS));
    pipeline.push({
      opportunity_id: `OPP-${700 + i}`,
      customer: c,
      stage: pick(STAGES),
      owner: pick(OWNERS),
      close_date: `${['2026-09', '2026-10', '2026-11', '2026-12', '2027-01', '2027-02', '2027-03'][Math.floor(r() * 7)]}-15`,
      amount: Math.round(40000 * CUSTOMERS[c].size * (0.4 + r() * 1.6)),
    });
  }

  const DEPTS = { Sales: 30, Engineering: 44, Finance: 12, HR: 8, Operations: 22, Support: 24 };
  const LVL = { L1: 42000, L2: 56000, L3: 74000, L4: 98000, L5: 135000 };
  const employees = [];
  Object.entries(DEPTS).forEach(([department, n]) => {
    for (let i = 0; i < n; i++) {
      const level = pick(['L1', 'L2', 'L2', 'L3', 'L3', 'L4', 'L5']);
      const y = 2019 + Math.floor(r() * 8);
      const hm = y === 2026 ? Math.floor(r() * 9) : Math.floor(r() * 12);
      employees.push({
        employee_id: `E${1000 + employees.length}`,
        department,
        country: pick(['UK', 'UK', 'UK', 'Germany', 'Sweden', 'India']),
        level,
        status: r() < 0.9 ? 'Active' : 'Left',
        hire_date: `${y}-${String(hm + 1).padStart(2, '0')}-${String(1 + Math.floor(r() * 28)).padStart(2, '0')}`,
        salary: Math.round(LVL[level] * (0.9 + r() * 0.2)),
      });
    }
  });

  // Sales travels most; weight claimants accordingly.
  const weight = { Sales: 5, Engineering: 2, Finance: 1, HR: 1, Operations: 2, Support: 1 };
  const claimants = employees.flatMap((e) => Array(weight[e.department]).fill(e.employee_id));
  const CAT = { Travel: [120, 900], Hotels: [90, 420], Meals: [15, 140], Software: [20, 300], Training: [150, 1400] };
  const expenses = [];
  for (let i = 0; i < 320; i++) {
    const category = pick(Object.keys(CAT));
    const [a, b] = CAT[category];
    expenses.push({
      claim_id: `EXP-${9000 + i}`,
      claim_date: day(pick(MONTHS)),
      employee_id: pick(claimants),
      category,
      amount: Math.round(a + r() * (b - a)),
      in_policy: r() < 0.9 ? 'Yes' : 'No',
    });
  }

  const SUP = { AWS: 'Cloud', Microsoft: 'Software', Dell: 'Hardware', Accenture: 'Consulting', Capita: 'Facilities', Cisco: 'Hardware', 'Salesforce Inc': 'Software' };
  const spend = [];
  for (let i = 0; i < 220; i++) {
    const supplier = pick(Object.keys(SUP));
    const base = SUP[supplier] === 'Consulting' ? 30000 : SUP[supplier] === 'Cloud' ? 18000 : 6000;
    spend.push({
      po_id: `PO-${3000 + i}`,
      po_date: day(pick(MONTHS)),
      supplier,
      category: SUP[supplier],
      department: pick(Object.keys(DEPTS)),
      amount: Math.round(base * (0.3 + r() * 1.4)),
      on_contract: r() < 0.8 ? 'Yes' : 'No',
    });
  }

  const sources = [
    sourceFromRows('Sales orders', orders, 'SAP S/4'),
    sourceFromRows('Invoices', invoices, 'Billing'),
    sourceFromRows('Opportunities', pipeline, 'Salesforce'),
    sourceFromRows('Employees', employees, 'SuccessFactors'),
    sourceFromRows('Expenses', expenses, 'Concur'),
    sourceFromRows('Supplier spend', spend, 'Ariba'),
  ];
  const relationships = suggestRelationships(sources).map(({ id, from, to }) => ({ id, from, to }));
  return { sources, relationships };
}

/** Showcase questions for the sample dataset (only offered when it is loaded). */
export function sampleSuggestions(m) {
  const v = m.views;
  if (!v.employees || !v.expenses || !v.supplier_spend || !v.invoices || !v.opportunities) return [];
  const active = { dim: 'status', op: 'eq', value: 'Active' };
  return [
    {
      q: 'Cost per employee by department',
      src: 'SuccessFactors + Concur + Ariba',
      spec: {
        title: 'Cost per employee by department',
        groupBy: 'department',
        chart: 'bar',
        series: [
          { view: 'employees', measure: null, agg: 'count', filters: [active], label: 'Headcount' },
          { view: 'employees', measure: 'salary', agg: 'sum', filters: [active], label: 'Salaries' },
          { view: 'expenses', measure: 'amount', agg: 'sum', filters: [], label: 'Expenses' },
          { view: 'supplier_spend', measure: 'amount', agg: 'sum', filters: [], label: 'Supplier spend' },
        ],
        derived: [{ label: 'Cost per head', numerator: [1, 2, 3], denominator: 0 }],
        followups: ['Expenses by department', 'Expenses by category', 'Average salary by level'],
      },
    },
    {
      q: 'Customers: invoiced vs days overdue, sized by open pipeline',
      src: 'Billing + Salesforce',
      spec: {
        title: 'Customers: invoiced vs days overdue, sized by open pipeline',
        groupBy: 'customer',
        chart: 'scatter',
        series: [
          { view: 'invoices', measure: 'amount', agg: 'sum', label: 'Invoiced' },
          { view: 'invoices', measure: 'days_overdue', agg: 'avg', filters: [{ dim: 'status', op: 'eq', value: 'Overdue' }], label: 'Avg days overdue' },
          { view: 'opportunities', measure: 'amount', agg: 'sum', filters: [{ dim: 'stage', op: 'neq', value: 'Closed won' }, { dim: 'stage', op: 'neq', value: 'Closed lost' }], label: 'Open pipeline' },
        ],
      },
    },
    {
      q: 'Expenses by department and category',
      src: 'Concur + SuccessFactors',
      spec: {
        title: 'Expenses by department and category',
        groupBy: 'department',
        splitBy: 'category',
        chart: 'heatmap',
        series: [{ view: 'expenses', measure: 'amount', agg: 'sum', label: 'Expenses' }],
        followups: ['Expenses by month and category', 'Share of expenses by category', 'Expenses by category'],
      },
    },
    {
      q: 'Orders by month, 3-month rolling',
      src: 'SAP S/4',
      spec: {
        title: 'Orders by month, 3-month rolling',
        groupBy: 'month',
        chart: 'line',
        window: 3,
        series: [{ view: 'sales_orders', measure: 'amount', agg: 'sum', label: 'Orders' }],
      },
    },
  ];
}
