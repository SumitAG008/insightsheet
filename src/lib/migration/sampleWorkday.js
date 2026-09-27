/**
 * A deliberately messy Workday-style extract (8 tabs, ~40 workers) for demos
 * and tests. It contains the problems real extracts have: mixed date
 * formats, M/F/Male values, country names and ISO-2 codes, FTE as percent,
 * upper-case emails, IDs Excel turned into numbers, a manager outside the
 * extract, a terminated worker missing from the terminations tab, and
 * departments referenced but missing from the org list.
 */
import { sourceFromRows } from '@/lib/unifiedReporting/model';

function rng(seed) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

const FIRST = ['Olivia', 'James', 'Amelia', 'Noah', 'Isla', 'Liam', 'Ava', 'Arjun', 'Sofia', 'Lukas', 'Mia', 'Hugo', 'Emma', 'Leon', 'Priya', 'Omar', 'Chloe', 'Ethan', 'Hannah', 'Mateo'];
const LAST = ['Smith', 'Jones', 'Patel', 'Müller', 'Schmidt', 'Brown', 'Taylor', 'Wilson', 'Kumar', 'Evans', 'Fischer', 'Walker', 'Khan', 'Wright', 'Hughes'];

/** Build a valid IBAN (ISO 13616 check digits) from a country code and BBAN. */
function iban(cc, bban) {
  const digits = `${bban}${cc}00`.replace(/[A-Z]/g, (ch) => String(ch.charCodeAt(0) - 55));
  let rem = 0;
  for (const d of digits) rem = (rem * 10 + Number(d)) % 97;
  return `${cc}${String(98 - rem).padStart(2, '0')}${bban}`;
}
const spaced = (v) => v.replace(/(.{4})/g, '$1 ').trim();

export function buildWorkdaySample() {
  const r = rng(7);
  const pick = (a) => a[Math.floor(r() * a.length)];
  const pad = (n) => String(n).padStart(2, '0');
  const us = (y, m, d) => `${pad(m)}/${pad(d)}/${y}`;
  const usShort = (y, m, d) => `${pad(m)}/${pad(d)}/${String(y).slice(2)}`;

  const companies = [
    { Company_ID: 'GB01', Company_Name: 'Meldra Demo UK Ltd', Country: 'United Kingdom', Currency: 'GBP' },
    { Company_ID: 'DE01', Company_Name: 'Meldra Demo GmbH', Country: 'DE', Currency: 'EUR' },
    { Company_ID: 'US01', Company_Name: 'Meldra Demo Inc.', Country: '', Currency: 'USD' },
  ];
  const locations = [
    { Location_ID: 'LON', Location_Name: 'London HQ', Location_Country: 'GB', Time_Zone: 'Europe/London', company: 'GB01' },
    { Location_ID: 'MAN', Location_Name: 'Manchester', Location_Country: 'United Kingdom', Time_Zone: 'Europe/London', company: 'GB01' },
    { Location_ID: 'BER', Location_Name: 'Berlin', Location_Country: 'Germany', Time_Zone: 'Europe/Berlin', company: 'DE01' },
    { Location_ID: 'NYC', Location_Name: 'New York', Location_Country: 'USA', Time_Zone: 'America/New_York', company: 'US01' },
  ];
  const depts = [
    { Supervisory_Org_ID: 'SO-100', Supervisory_Org_Name: 'Executive' },
    { Supervisory_Org_ID: 'SO-200', Supervisory_Org_Name: 'Engineering' },
    { Supervisory_Org_ID: 'SO-300', Supervisory_Org_Name: 'Sales' },
    { Supervisory_Org_ID: 'SO-400', Supervisory_Org_Name: 'People & Culture' },
    // SO-500 (Finance) is used in job data but missing here on purpose.
  ];
  const jobs = [['JP-ENG2', 'Software Engineer II'], ['JP-ENG3', 'Senior Software Engineer'], ['JP-SLS1', 'Account Executive'], ['JP-HRBP', 'HR Business Partner'], ['JP-FIN1', 'Financial Analyst'], ['JP-EXEC', 'Executive']];

  const workers = [];
  // Cost centers per legal entity and function, under one root per entity.
  const DEPT_NAME = { 100: 'Executive', 200: 'Engineering', 300: 'Sales', 400: 'People & Culture' };
  const costCenters = [];
  for (const c of companies) {
    costCenters.push({ Cost_Center_ID: `${c.Company_ID}-000`, Cost_Center_Name: `${c.Company_Name} total`, Company: c.Company_ID, Parent_Cost_Center: '' });
    for (const [n, name] of Object.entries(DEPT_NAME)) costCenters.push({ Cost_Center_ID: `${c.Company_ID}-${n}`, Cost_Center_Name: `${c.Company_ID} ${name}`, Company: c.Company_ID, Parent_Cost_Center: `${c.Company_ID}-000` });
  }
  // Points at a legal entity that doesn't exist (caught by the pre-flight check).
  costCenters.push({ Cost_Center_ID: 'FR01-200', Cost_Center_Name: 'FR01 Engineering', Company: 'FR01', Parent_Cost_Center: 'FR01-000' });

  const jobRows = [];
  const comp = [];
  const oneTime = [];
  const bank = [];
  const ytd = [];
  const retirees = [];
  const pension = [];
  const dependents = [];
  const REL = ['Spouse', 'Child', 'Child', 'Domestic Partner'];
  const addresses = [];
  const terms = [];
  const N = 40;
  for (let i = 0; i < N; i++) {
    const id = 21000 + i;
    const first = pick(FIRST);
    const last = pick(LAST);
    // Workers 9 and 27 carry the planted UK bank-detail errors, so they work in London.
    const loc = i === 0 || i === 9 || i === 27 ? locations[0] : pick(locations);
    const dept = i === 0 ? 'SO-100' : i === 12 ? 'SO-200' : pick(['SO-200', 'SO-200', 'SO-300', 'SO-300', 'SO-400', 'SO-500']);
    const job = i === 0 ? jobs[5] : i === 12 ? jobs[0] : dept === 'SO-500' ? jobs[4] : dept === 'SO-400' ? jobs[3] : dept === 'SO-300' ? jobs[2] : pick([jobs[0], jobs[1]]);
    const hy = 2014 + Math.floor(r() * 11);
    const hm = 1 + Math.floor(r() * 12);
    const hd = 1 + Math.floor(r() * 28);
    const by = 1965 + Math.floor(r() * 35);
    const terminated = i % 9 === 4;
    // Workers 7, 20 and 33 have retired: they appear on the Retirees tab, not Terminations.
    const retired = !terminated && i % 13 === 7;
    const leaver = terminated || retired;
    const gender = pick(['M', 'F', 'Male', 'female', 'F', 'M', 'Not Declared']);
    workers.push({
      // Some IDs come through as numbers, as Excel does.
      Employee_ID: i % 5 === 0 ? id : `${id}`,
      Legal_First_Name: i % 11 === 3 ? ` ${first} ` : first,
      Legal_Last_Name: last,
      Preferred_Name: i % 4 === 0 ? first.slice(0, 3) : '',
      Gender: gender,
      Date_of_Birth: usShort(by, 1 + Math.floor(r() * 12), 1 + Math.floor(r() * 28)),
      Marital_Status: pick(['Married', 'Single', 'S', 'married', 'Divorced', 'Civil Partnership']),
      Nationality: pick(['United Kingdom', 'GB', 'Germany', 'India', 'United States', 'Spain']),
      Primary_Work_Email: i === 17 ? 'olivia.smith@meldra-demo' : `${first}.${last}${i}@MELDRA-DEMO.COM`.replace('ü', 'u'),
      Work_Phone: `+44 (0)20 7946 ${String(1000 + i).slice(-4)}`,
      Worker_Status: terminated ? 'Terminated' : retired ? 'Retired' : 'Active',
      Hire_Date: us(hy, hm, hd),
      // No SuccessFactors field for this one: it is carried in a custom file.
      Union_Member: pick(['Y', 'N', 'N']),
    });
    const events = 1 + (i % 3 === 0 ? 1 : 0);
    // Worker 15 is charged to another entity's cost center (a finance warning).
    const ccFor = (d) => (i === 15 ? `${loc.company === 'DE01' ? 'GB01' : 'DE01'}-${d.slice(3)}` : `${loc.company}-${d.slice(3)}`);
    for (let e = 0; e < events; e++) {
      const y = e === 0 ? hy : Math.min(2026, hy + 2);
      // Every sixth worker moves to Sales at their second event (a transfer).
      const deptNow = e === 1 && i % 6 === 3 ? 'SO-300' : dept;
      jobRows.push({
        Employee_ID: `${id}`,
        Effective_Date: e === 0 ? us(hy, hm, hd) : us(y, 4, 1),
        Job_Profile_ID: e === 1 && job === jobs[0] ? jobs[1][0] : job[0],
        Job_Profile: e === 1 && job === jobs[0] ? jobs[1][1] : job[1],
        Business_Title: e === 1 && job === jobs[0] ? jobs[1][1] : job[1],
        Company_ID: loc.company,
        Supervisory_Org: deptNow,
        Cost_Center: ccFor(deptNow),
        Location_ID: loc.Location_ID,
        Manager_Employee_ID: i === 0 ? '' : i === 23 ? '99999' : `${21000 + (i % 6 === 0 ? 0 : 1 + (i % 5))}`,
        Worker_Type: pick(['Regular', 'Regular', 'Regular', 'Fixed Term']),
        FTE: i % 7 === 0 ? '50' : '100',
        Scheduled_Weekly_Hours: i % 7 === 0 ? '20' : '40',
      });
    }
    const base = { 'JP-EXEC': 185000, 'JP-ENG3': 92000, 'JP-ENG2': 68000, 'JP-SLS1': 55000, 'JP-HRBP': 58000, 'JP-FIN1': 52000 }[job[0]];
    const cur = loc.company === 'US01' ? 'USD' : loc.company === 'DE01' ? 'EUR' : 'GBP';
    const sym = { USD: '$', EUR: '€', GBP: '£' }[cur];
    const payGroup = loc.company === 'US01' ? 'US-SM' : loc.company === 'DE01' ? 'DE-M' : 'UK-M';
    const salary = Math.round(base * (0.9 + r() * 0.2));
    const compRow = (date, plan, amount, freq) => comp.push({
      Employee_ID: `${id}`,
      Compensation_Effective_Date: date,
      Compensation_Plan: plan,
      Pay_Group: payGroup,
      Amount: `${sym}${amount.toLocaleString('en-US')}`,
      Currency: cur,
      Frequency: freq,
    });
    compRow(us(hy, hm, hd), 'Base Salary', salary, pick(['Annual', 'Annually', 'Yearly']));
    if (dept === 'SO-300') compRow(us(hy, hm, hd), 'Car Allowance', 4800, 'Annual');
    // A raise with each second job event: pay history per employee.
    if (events > 1) compRow(us(Math.min(2026, hy + 2), 4, 1), 'Base Salary', Math.round(salary * 1.08), 'Annual');

    if (retired) {
      retirees.push({ Employee_ID: `${id}`, Retirement_Date: us(2025, 6 + (i % 6), 30), Pension_Scheme: cur === 'GBP' ? 'Meldra UK Pension Plan' : cur === 'EUR' ? 'Meldra Betriebsrente' : 'Meldra US 401(k)', Monthly_Pension: Math.round(salary * 0.015), Currency: cur });
    } else if (!terminated) {
      pension.push({
        Employee_ID: `${id}`,
        Pension_Scheme: cur === 'GBP' ? 'Meldra UK Pension Plan' : cur === 'EUR' ? 'Meldra Betriebsrente' : 'Meldra US 401(k)',
        Member_Number: `PN${String(id).slice(-4)}`,
        Enrolment_Date: us(hy, hm, hd),
        Employee_Contribution_Pct: cur === 'USD' ? 6 : 5,
        Employer_Contribution_Pct: cur === 'USD' ? 4 : 8,
      });
    }
    // Dependents: several rows per employee, with their own names and birth dates.
    if (i % 3 === 2) {
      for (let d = 0; d < 1 + (i % 2); d++) {
        dependents.push({ Employee_ID: `${id}`, Dependent_First_Name: pick(FIRST), Dependent_Last_Name: last, Relationship: d === 0 ? REL[i % 4] : 'Child', Date_of_Birth: usShort(2008 + (i % 12), 1 + d, 10 + d) });
      }
    }

    if (i % 3 !== 1 && !leaver) {
      oneTime.push({ Employee_ID: `${id}`, Payment_Date: us(2026, 3, 31), One_Time_Payment_Plan: 'Annual Bonus', Amount: Math.round(salary * 0.08), Currency: cur });
    }
    if (i % 10 === 2) oneTime.push({ Employee_ID: `${id}`, Payment_Date: us(2026, 6, 30), One_Time_Payment_Plan: 'Spot Award', Amount: 500, Currency: cur });

    const acct = String(10000000 + Math.floor(r() * 89999999));
    if (cur === 'GBP') {
      const sort = String(200000 + (i * 137) % 99999).padStart(6, '0');
      bank.push({
        Employee_ID: `${id}`, Payment_Method: 'Direct Deposit', Bank_Country: 'United Kingdom', Bank_Name: 'NatWest',
        // Worker 9's IBAN has a typo (checksum fails); worker 27's sort code lost a digit.
        IBAN: i === 9 ? iban('GB', `NWBK${sort}${acct}`).replace(/\d$/, (d) => String((+d + 1) % 10)) : spaced(iban('GB', `NWBK${sort}${acct}`)),
        Bank_Code: i === 27 ? `${sort.slice(0, 2)}-${sort.slice(2, 4)}-${sort.slice(4, 5)}` : `${sort.slice(0, 2)}-${sort.slice(2, 4)}-${sort.slice(4)}`,
        Account_Number: acct, BIC: 'NWBKGB2L',
      });
    } else if (cur === 'EUR') {
      const blz = '10070000';
      const kto = acct.padStart(10, '0');
      bank.push({ Employee_ID: `${id}`, Payment_Method: 'Direct Deposit', Bank_Country: 'DE', Bank_Name: 'Deutsche Bank', IBAN: spaced(iban('DE', `${blz}${kto}`)), Bank_Code: blz, Account_Number: kto, BIC: 'DEUTDEBBXXX' });
    } else {
      bank.push({ Employee_ID: `${id}`, Payment_Method: 'Direct Deposit', Bank_Country: 'USA', Bank_Name: 'JPMorgan Chase', IBAN: '', Bank_Code: '021000021', Account_Number: acct, BIC: 'CHASUS33' });
    }

    if (!leaver) {
      const gross = Math.round((salary / 12) * 6 * 100) / 100;
      const taxYear = cur === 'GBP' ? '2026-27' : '2026';
      const bal = (name, amount) => ytd.push({ Employee_ID: `${id}`, Tax_Year: taxYear, Pay_Balance: name, YTD_Amount: amount.toFixed(2), Currency: cur });
      bal('Gross Pay', gross);
      bal(cur === 'USD' ? 'Federal Income Tax' : cur === 'EUR' ? 'Lohnsteuer' : 'PAYE Tax', Math.round(gross * 0.22 * 100) / 100);
      bal(cur === 'USD' ? 'Social Security' : cur === 'EUR' ? 'Rentenversicherung' : 'Employee NIC', Math.round(gross * 0.08 * 100) / 100);
    }
    addresses.push({
      Employee_ID: `${id}`,
      Address_Line_1: `${10 + i} ${pick(['High Street', 'Station Road', 'Hauptstraße', 'Main Street', 'Park Lane'])}`,
      City: { LON: 'London', MAN: 'Manchester', BER: 'Berlin', NYC: 'New York' }[loc.Location_ID],
      State_Province: loc.Location_ID === 'NYC' ? 'NY' : '',
      Postal_Code: { LON: 'EC1A 1BB', MAN: 'M1 1AE', BER: '10115', NYC: '10001' }[loc.Location_ID],
      Country: { LON: 'United Kingdom', MAN: 'UK', BER: 'Deutschland', NYC: 'US' }[loc.Location_ID],
    });
    // Worker 31 is terminated but missing from this tab on purpose.
    if (terminated && i !== 31) {
      terms.push({
        Employee_ID: `${id}`,
        Termination_Date: us(2025, 1 + (i % 12), 15),
        Primary_Reason: pick(['Resignation', 'Resignation', 'Redundancy', 'Retirement']),
        Last_Day_of_Work: us(2025, 1 + (i % 12), 15),
        Eligible_for_Rehire: pick(['Y', 'N', 'Yes']),
      });
    }
  }

  const sheets = [
    ['Worker_Data', workers],
    ['Job_History', jobRows],
    ['Compensation_History', comp],
    ['One_Time_Payments', oneTime],
    ['Bank_Accounts', bank],
    ['Payroll_YTD', ytd],
    ['Retirees', retirees],
    ['Pension_Enrolment', pension],
    ['Dependents', dependents],
    ['Home_Address', addresses],
    ['Terminations', terms],
    ['Companies', companies],
    ['Supervisory_Orgs', depts],
    ['Cost_Centers', costCenters],
    ['Locations', locations.map((l) => ({ Location_ID: l.Location_ID, Location_Name: l.Location_Name, Location_Country: l.Location_Country, Time_Zone: l.Time_Zone }))],
  ];
  return sheets.map(([name, rows]) => ({ ...sourceFromRows(name, rows, 'Workday', 'sample'), rawRows: rows }));
}

/** The sample as an .xlsx workbook, so users can try the real upload path. */
export async function downloadWorkdaySampleXlsx() {
  const XLSX = await import('xlsx');
  const wb = XLSX.utils.book_new();
  for (const s of buildWorkdaySample()) XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(s.rawRows), s.name);
  XLSX.writeFile(wb, 'workday_extract_sample.xlsx');
}
