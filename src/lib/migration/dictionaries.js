/**
 * Value translation dictionaries. Countries go to ISO 3166 alpha-3, which
 * SuccessFactors country fields use. Picklist codes (gender, marital status,
 * frequency…) are configured per SuccessFactors instance, so these are
 * suggestions the user reviews and can override on the Cleanse step.
 */

// [alpha3, alpha2, ...names/aliases]
const COUNTRY_ROWS = [
  ['USA', 'US', 'united states', 'united states of america', 'usa', 'u.s.', 'u.s.a.', 'america'],
  ['GBR', 'GB', 'united kingdom', 'uk', 'great britain', 'england', 'scotland', 'wales', 'northern ireland', 'britain'],
  ['IRL', 'IE', 'ireland', 'republic of ireland'],
  ['DEU', 'DE', 'germany', 'deutschland'],
  ['FRA', 'FR', 'france'],
  ['ESP', 'ES', 'spain', 'españa'],
  ['ITA', 'IT', 'italy', 'italia'],
  ['NLD', 'NL', 'netherlands', 'the netherlands', 'holland'],
  ['BEL', 'BE', 'belgium'],
  ['LUX', 'LU', 'luxembourg'],
  ['CHE', 'CH', 'switzerland'],
  ['AUT', 'AT', 'austria'],
  ['SWE', 'SE', 'sweden'],
  ['NOR', 'NO', 'norway'],
  ['DNK', 'DK', 'denmark'],
  ['FIN', 'FI', 'finland'],
  ['POL', 'PL', 'poland'],
  ['CZE', 'CZ', 'czech republic', 'czechia'],
  ['HUN', 'HU', 'hungary'],
  ['ROU', 'RO', 'romania'],
  ['PRT', 'PT', 'portugal'],
  ['GRC', 'GR', 'greece'],
  ['TUR', 'TR', 'turkey', 'türkiye'],
  ['CAN', 'CA', 'canada'],
  ['MEX', 'MX', 'mexico'],
  ['BRA', 'BR', 'brazil', 'brasil'],
  ['ARG', 'AR', 'argentina'],
  ['CHL', 'CL', 'chile'],
  ['COL', 'CO', 'colombia'],
  ['IND', 'IN', 'india'],
  ['CHN', 'CN', 'china', "people's republic of china"],
  ['JPN', 'JP', 'japan'],
  ['KOR', 'KR', 'south korea', 'korea', 'republic of korea'],
  ['SGP', 'SG', 'singapore'],
  ['MYS', 'MY', 'malaysia'],
  ['IDN', 'ID', 'indonesia'],
  ['PHL', 'PH', 'philippines'],
  ['THA', 'TH', 'thailand'],
  ['VNM', 'VN', 'vietnam', 'viet nam'],
  ['HKG', 'HK', 'hong kong'],
  ['TWN', 'TW', 'taiwan'],
  ['AUS', 'AU', 'australia'],
  ['NZL', 'NZ', 'new zealand'],
  ['ZAF', 'ZA', 'south africa'],
  ['NGA', 'NG', 'nigeria'],
  ['KEN', 'KE', 'kenya'],
  ['EGY', 'EG', 'egypt'],
  ['ARE', 'AE', 'united arab emirates', 'uae'],
  ['SAU', 'SA', 'saudi arabia'],
  ['ISR', 'IL', 'israel'],
  ['PAK', 'PK', 'pakistan'],
  ['BGD', 'BD', 'bangladesh'],
  ['LKA', 'LK', 'sri lanka'],
  ['UKR', 'UA', 'ukraine'],
];

const COUNTRY_INDEX = new Map();
for (const [a3, a2, ...names] of COUNTRY_ROWS) {
  COUNTRY_INDEX.set(a3.toLowerCase(), a3);
  COUNTRY_INDEX.set(a2.toLowerCase(), a3);
  names.forEach((n) => COUNTRY_INDEX.set(n, a3));
}

/** ISO alpha-3 for a country name/alpha-2/alpha-3, else null. */
export function toCountry(v) {
  if (v === null || v === undefined) return null;
  const s = String(v).trim().toLowerCase().replace(/\s+/g, ' ');
  return COUNTRY_INDEX.get(s) || null;
}

/** Suggested target codes per picklist type, with the source values they absorb. */
export const PICKLISTS = {
  gender: {
    label: 'Gender',
    codes: [
      { code: 'M', synonyms: ['m', 'male', 'man', '1'] },
      { code: 'F', synonyms: ['f', 'female', 'woman', '2'] },
      { code: 'U', synonyms: ['u', 'unknown', 'not declared', 'undeclared', 'prefer not to say', 'not specified', 'x', 'n/a'] },
      { code: 'O', synonyms: ['o', 'other', 'non-binary', 'nonbinary', 'diverse', 'd'] },
    ],
  },
  marital: {
    label: 'Marital status',
    codes: [
      { code: 'S', synonyms: ['s', 'single', 'never married', 'unmarried'] },
      { code: 'M', synonyms: ['m', 'married'] },
      { code: 'P', synonyms: ['p', 'partnership', 'civil partnership', 'domestic partner', 'registered partnership'] },
      { code: 'D', synonyms: ['d', 'divorced'] },
      { code: 'SP', synonyms: ['sp', 'separated'] },
      { code: 'W', synonyms: ['w', 'widowed', 'widow', 'widower'] },
    ],
  },
  status: {
    label: 'Employment status',
    codes: [
      { code: 'active', synonyms: ['active', 'a', 'employed', 'current', 'on leave', 'leave of absence', 'yes', 'y', '1'] },
      { code: 'inactive', synonyms: ['terminated', 't', 'inactive', 'i', 'separated', 'left', 'former', 'no', 'n', '0', 'retired', 'retiree', 'pensioner', 'deceased', 'r'] },
    ],
  },
  yesno: {
    label: 'Yes / no',
    codes: [
      { code: 'Yes', synonyms: ['y', 'yes', 'true', '1', 'eligible'] },
      { code: 'No', synonyms: ['n', 'no', 'false', '0', 'not eligible', 'ineligible'] },
    ],
  },
  frequency: {
    label: 'Pay frequency',
    codes: [
      { code: 'ANN', synonyms: ['annual', 'annually', 'yearly', 'per year', 'year', 'ann', 'a'] },
      { code: 'MON', synonyms: ['monthly', 'per month', 'month', 'mon', 'm'] },
      { code: 'SMN', synonyms: ['semi-monthly', 'semimonthly', 'twice monthly'] },
      { code: 'BWK', synonyms: ['bi-weekly', 'biweekly', 'fortnightly', 'every two weeks'] },
      { code: 'WKL', synonyms: ['weekly', 'per week', 'week', 'w'] },
      { code: 'HRL', synonyms: ['hourly', 'per hour', 'hour', 'h'] },
    ],
  },
};

export const PICKLIST_TYPES = Object.keys(PICKLISTS);

/** Suggested code for a raw value, or null when no synonym matches. */
export function suggestCode(type, raw) {
  const p = PICKLISTS[type];
  if (!p) return null;
  const s = String(raw ?? '').trim().toLowerCase();
  if (!s) return null;
  const hit = p.codes.find((c) => c.code.toLowerCase() === s || c.synonyms.includes(s));
  return hit ? hit.code : null;
}

const CURRENCIES = new Set(['GBP', 'USD', 'EUR', 'CHF', 'SEK', 'NOK', 'DKK', 'PLN', 'CZK', 'HUF', 'RON', 'CAD', 'MXN', 'BRL', 'ARS', 'CLP', 'COP', 'INR', 'CNY', 'JPY', 'KRW', 'SGD', 'MYR', 'IDR', 'PHP', 'THB', 'VND', 'HKD', 'TWD', 'AUD', 'NZD', 'ZAR', 'NGN', 'KES', 'EGP', 'AED', 'SAR', 'ILS', 'PKR', 'BDT', 'LKR', 'UAH', 'TRY']);
const CURRENCY_SYMBOLS = { '£': 'GBP', $: 'USD', '€': 'EUR', '¥': 'JPY', '₹': 'INR' };

export function toCurrency(v) {
  const s = String(v ?? '').trim();
  if (!s) return null;
  if (CURRENCY_SYMBOLS[s]) return CURRENCY_SYMBOLS[s];
  const u = s.toUpperCase();
  return CURRENCIES.has(u) ? u : null;
}
