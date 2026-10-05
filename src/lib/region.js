// Which pricing region a visitor is in, and what that changes: currency, prices, tax wording and the legal
// rules shown on the pricing page, Terms and Privacy. The region comes from the server's IP lookup
// (/api/region) and cannot be chosen in the browser, so nobody sees another country's price list.
// If the location cannot be determined, the visitor gets US dollar pricing.
import { useEffect, useState } from 'react';
import { getApiBase } from '@/utils/apiConfig';

export const REGION_ORDER = ['IN', 'GB', 'EU', 'INTL'];
export const DEFAULT_REGION = 'INTL';

// EU member states (ISO 3166-1 alpha-2). Mirrors backend/app/services/pricing_region.py.
const EU_COUNTRIES = new Set([
  'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE', 'GR', 'HU', 'IE', 'IT', 'LV', 'LT',
  'LU', 'MT', 'NL', 'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE',
]);

// List prices per region, before tax. Kept in prices.js (no app imports) so the build's
// pre-rendered pages (scripts/prerender.mjs) show exactly the same figures.
export { REGIONS, ANNUAL_NOTE } from './prices.js';
import { REGIONS } from './prices.js';

export function regionForCountry(code) {
  const c = String(code || '').trim().toUpperCase();
  if (c === 'IN') return 'IN';
  if (c === 'GB' || c === 'UK') return 'GB';
  if (EU_COUNTRIES.has(c)) return 'EU';
  return DEFAULT_REGION;
}

// One line under the price table, e.g. "Prices in GBP for the United Kingdom, based on your location."
export function regionNote(region) {
  const r = REGIONS[region];
  if (!r) return '';
  return r.label ? `Prices in ${r.currency} for ${r.label}, based on your location.` : `Prices in ${r.currency}.`;
}

let pending = null; // one lookup per page load

export function detectRegion(fetchImpl = fetch) {
  if (pending) return pending;
  const base = getApiBase();
  pending = (async () => {
    if (!base) return DEFAULT_REGION;
    try {
      const res = await fetchImpl(`${base}/api/region`);
      const data = await res.json();
      return REGIONS[data?.region] ? data.region : DEFAULT_REGION;
    } catch {
      return DEFAULT_REGION;
    }
  })();
  return pending;
}

export function resetRegionForTests() {
  pending = null;
}

// [regionKey | null while loading]. There is no setter: the region follows the visitor's location.
export function useRegion() {
  const [region, setRegion] = useState(null);
  useEffect(() => {
    let alive = true;
    detectRegion().then((r) => alive && setRegion(r));
    return () => {
      alive = false;
    };
  }, []);
  return [region];
}
