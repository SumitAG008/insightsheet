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
    { Supervisory_Org_ID: 'SO-100', Supervisory_Org_Name: 'Executive', Cost_Center: 'CC1000' },
    { Supervisory_Org_ID: 'SO-200', Supervisory_Org_Name: 'Engineering', Cost_Center: 'CC2000' },
    { Supervisory_Org_ID: 'SO-300', Supervisory_Org_Name: 'Sales', Cost_Center: 'CC3000' },
    { Supervisory_Org_ID: 'SO-400', Supervisory_Org_Name: 'People & Culture', Cost_Center: 'CC4000' },
    // SO-500 (Finance) is used in job data but missing here on purpose.
  ];
  const jobs = [['JP-ENG2', 'Software Engineer II'], ['JP-ENG3', 'Senior Software Engineer'], ['JP-SLS1', 'Account Executive'], ['JP-HRBP', 'HR Business Partner'], ['JP-FIN1', 'Financial Analyst'], ['JP-EXEC', 'Executive']];

  const workers = [];
  const jobRows = [];
  const comp = [];
  const addresses = [];
  const terms = [];
  const N = 40;
  for (let i = 0; i < N; i++) {
    const id = 21000 + i;
    const first = pick(FIRST);
    const last = pick(LAST);
    const loc = i === 0 ? locations[0] : pick(locations);
    const dept = i === 0 ? 'SO-100' : pick(['SO-200', 'SO-200', 'SO-300', 'SO-300', 'SO-400', 'SO-500']);
    const job = i === 0 ? jobs[5] : dept === 'SO-500' ? jobs[4] : dept === 'SO-400' ? jobs[3] : dept === 'SO-300' ? jobs[2] : pick([jobs[0], jobs[1]]);
    const hy = 2014 + Math.floor(r() * 11);
    const hm = 1 + Math.floor(r() * 12);
    const hd = 1 + Math.floor(r() * 28);
    const by = 1965 + Math.floor(r() * 35);
    const terminated = i % 9 === 4;
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
      Worker_Status: terminated ? 'Terminated' : 'Active',
      Hire_Date: us(hy, hm, hd),
    });
    const events = 1 + (i % 3 === 0 ? 1 : 0);
    for (let e = 0; e < events; e++) {
      const y = e === 0 ? hy : Math.min(2026, hy + 2);
      jobRows.push({
        Employee_ID: `${id}`,
        Effective_Date: e === 0 ? us(hy, hm, hd) : us(y, 4, 1),
        Job_Profile_ID: e === 1 && job === jobs[0] ? jobs[1][0] : job[0],
        Job_Profile: e === 1 && job === jobs[0] ? jobs[1][1] : job[1],
        Business_Title: e === 1 && job === jobs[0] ? jobs[1][1] : job[1],
        Company_ID: loc.company,
        Supervisory_Org: dept,
        Location_ID: loc.Location_ID,
        Manager_Employee_ID: i === 0 ? '' : i === 23 ? '99999' : `${21000 + (i % 6 === 0 ? 0 : 1 + (i % 5))}`,
        Worker_Type: pick(['Regular', 'Regular', 'Regular', 'Fixed Term']),
        FTE: i % 7 === 0 ? '50' : '100',
        Scheduled_Weekly_Hours: i % 7 === 0 ? '20' : '40',
      });
    }
    const base = { 'JP-EXEC': 185000, 'JP-ENG3': 92000, 'JP-ENG2': 68000, 'JP-SLS1': 55000, 'JP-HRBP': 58000, 'JP-FIN1': 52000 }[job[0]];
    comp.push({
      Employee_ID: `${id}`,
      Compensation_Effective_Date: us(hy, hm, hd),
      Pay_Group: loc.company === 'US01' ? 'US-SM' : loc.company === 'DE01' ? 'DE-M' : 'UK-M',
      Base_Pay_Amount: `${loc.company === 'US01' ? '$' : loc.company === 'DE01' ? '€' : '£'}${Math.round(base * (0.9 + r() * 0.2)).toLocaleString('en-US')}`,
      Currency: loc.company === 'US01' ? 'USD' : loc.company === 'DE01' ? 'EUR' : 'GBP',
      Frequency: pick(['Annual', 'Annually', 'Yearly']),
    });
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
    ['Compensation', comp],
    ['Home_Address', addresses],
    ['Terminations', terms],
    ['Companies', companies],
    ['Supervisory_Orgs', depts],
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
