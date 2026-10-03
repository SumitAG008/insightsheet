// Which region a visitor is in, and what that changes: currency, prices, tax wording and the legal
// rules shown on the pricing page, Terms and Privacy. Detection order: the visitor's own choice
// (remembered in this browser) → country from the IP lookup → the browser's time zone → rest of world.
import { useEffect, useState } from 'react';
import { getApiBase } from '@/utils/apiConfig';

export const REGION_ORDER = ['IN', 'GB', 'EU', 'ROW'];

// EU member states (ISO 3166-1 alpha-2).
const EU_COUNTRIES = new Set([
  'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE', 'GR', 'HU', 'IE', 'IT', 'LV', 'LT',
  'LU', 'MT', 'NL', 'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE',
]);

// List prices per region, before tax. Business is quoted per contract.
export const REGIONS = {
  IN: {
    label: 'India',
    currency: 'INR',
    prices: { free: '₹0', pro: '₹599', team: '₹999', business: 'Custom' },
    seatYear: '₹9,999',
    tax: 'Prices exclude GST at 18%, which is added to your invoice.',
  },
  GB: {
    label: 'United Kingdom',
    currency: 'GBP',
    prices: { free: '£0', pro: '£9', team: '£15', business: 'Custom' },
    seatYear: '£150',
    tax: 'Prices exclude VAT at 20%, which is added where it applies.',
  },
  EU: {
    label: 'European Union',
    currency: 'EUR',
    prices: { free: '€0', pro: '€10', team: '€17', business: 'Custom' },
    seatYear: '€170',
    tax: 'Prices exclude VAT. Consumers pay the VAT rate of their country; businesses with a valid VAT number are reverse-charged.',
  },
  ROW: {
    label: 'Rest of the world',
    currency: 'USD',
    prices: { free: '$0', pro: '$11', team: '$18', business: 'Custom' },
    seatYear: '$180',
    tax: 'Prices exclude sales tax, VAT or GST, which is added where your local law requires it.',
  },
};

export function regionForCountry(code) {
  const c = String(code || '').toUpperCase();
  if (c === 'IN') return 'IN';
  if (c === 'GB' || c === 'UK') return 'GB';
  if (EU_COUNTRIES.has(c)) return 'EU';
  return c && c !== 'XX' ? 'ROW' : null;
}

export function regionForTimeZone(tz) {
  const z = String(tz || '');
  if (z === 'Asia/Kolkata' || z === 'Asia/Calcutta') return 'IN';
  if (z === 'Europe/London' || z === 'Europe/Belfast') return 'GB';
  if (z.startsWith('Europe/') && !['Europe/Moscow', 'Europe/Istanbul', 'Europe/Kiev', 'Europe/Kyiv', 'Europe/Minsk', 'Europe/Zurich', 'Europe/Oslo', 'Europe/Belgrade'].includes(z)) return 'EU';
  return z ? 'ROW' : null;
}

const STORAGE_KEY = 'meldra:region';

function savedRegion() {
  try {
    const r = localStorage.getItem(STORAGE_KEY);
    return REGIONS[r] ? r : null;
  } catch {
    return null;
  }
}

function timeZoneRegion() {
  try {
    return regionForTimeZone(Intl.DateTimeFormat().resolvedOptions().timeZone);
  } catch {
    return null;
  }
}

let detected = null; // one lookup per page load

async function detectRegion() {
  if (detected) return detected;
  let region = null;
  const base = getApiBase();
  if (base) {
    try {
      const r = await fetch(`${base}/api/ip-lookup`);
      region = regionForCountry((await r.json())?.country_code);
    } catch {
      region = null;
    }
  }
  detected = region || timeZoneRegion() || 'ROW';
  return detected;
}

// [regionKey, setRegion, chosenByVisitor]
export function useRegion() {
  const [region, setRegionState] = useState(() => savedRegion() || timeZoneRegion() || 'ROW');
  const [chosen, setChosen] = useState(() => Boolean(savedRegion()));

  useEffect(() => {
    if (savedRegion()) return undefined;
    let alive = true;
    detectRegion().then((r) => alive && setRegionState(r));
    return () => {
      alive = false;
    };
  }, []);

  const setRegion = (r) => {
    if (!REGIONS[r]) return;
    try {
      localStorage.setItem(STORAGE_KEY, r);
    } catch {
      /* private mode: the choice lasts this page view */
    }
    setRegionState(r);
    setChosen(true);
  };

  return [region, setRegion, chosen];
}
