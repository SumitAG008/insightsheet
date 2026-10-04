import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/utils/apiConfig', () => ({ getApiBase: () => 'https://api.example' }));

import {
  DEFAULT_REGION,
  REGIONS,
  REGION_ORDER,
  detectRegion,
  regionForCountry,
  regionNote,
  resetRegionForTests,
} from './region';

describe('visitor region', () => {
  beforeEach(() => resetRegionForTests());

  it('maps countries to India, UK, EU or US dollars', () => {
    expect(regionForCountry('IN')).toBe('IN');
    expect(regionForCountry('gb')).toBe('GB');
    expect(regionForCountry('DE')).toBe('EU');
    expect(regionForCountry('IE')).toBe('EU');
    expect(regionForCountry('US')).toBe('INTL');
    expect(regionForCountry('CH')).toBe('INTL'); // Switzerland is not in the EU
  });

  it('defaults to US dollars when the location is unknown', () => {
    for (const code of [undefined, '', 'XX']) expect(regionForCountry(code)).toBe(DEFAULT_REGION);
    expect(REGIONS[DEFAULT_REGION].currency).toBe('USD');
  });

  it('takes the region from the server, never from the browser', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ json: async () => ({ region: 'GB', currency: 'GBP' }) });
    try {
      localStorage.setItem('meldra:region', 'IN'); // an old saved choice must be ignored
    } catch {
      /* no localStorage in this test environment */
    }
    expect(await detectRegion(fetchImpl)).toBe('GB');
    expect(fetchImpl).toHaveBeenCalledWith('https://api.example/api/region');
  });

  it('falls back to US dollars if the lookup fails or returns something unknown', async () => {
    expect(await detectRegion(vi.fn().mockRejectedValue(new Error('offline')))).toBe('INTL');
    resetRegionForTests();
    expect(await detectRegion(vi.fn().mockResolvedValue({ json: async () => ({ region: 'MARS' }) }))).toBe('INTL');
  });

  it('never labels anyone as "rest of the world"', () => {
    expect(regionNote('GB')).toBe('Prices in GBP for the United Kingdom, based on your location.');
    expect(regionNote('INTL')).toBe('Prices in USD.');
    for (const r of REGION_ORDER) expect(regionNote(r).toLowerCase()).not.toContain('rest of');
  });

  it('prices every plan in each region currency', () => {
    expect(REGION_ORDER.map((r) => REGIONS[r].currency)).toEqual(['INR', 'GBP', 'EUR', 'USD']);
    expect(REGIONS.IN.prices.pro).toBe('₹599');
    expect(REGIONS.GB.prices.team).toBe('£15');
    expect(REGIONS.EU.prices.pro).toBe('€10');
    expect(REGIONS.INTL.prices.team).toBe('$18');
    for (const r of REGION_ORDER) expect(Object.keys(REGIONS[r].prices)).toEqual(['free', 'pro', 'team', 'business']);
  });
});
