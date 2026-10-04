import { describe, expect, it } from 'vitest';
import { REGIONS, REGION_ORDER, regionForCountry, regionForTimeZone } from './region';

describe('visitor region', () => {
  it('maps countries to India, UK, EU or rest of world', () => {
    expect(regionForCountry('IN')).toBe('IN');
    expect(regionForCountry('gb')).toBe('GB');
    expect(regionForCountry('DE')).toBe('EU');
    expect(regionForCountry('IE')).toBe('EU');
    expect(regionForCountry('US')).toBe('ROW');
    expect(regionForCountry('CH')).toBe('ROW'); // Switzerland is not in the EU
    expect(regionForCountry('XX')).toBe(null); // lookup failed: fall back to the time zone
  });

  it('falls back to the time zone', () => {
    expect(regionForTimeZone('Asia/Kolkata')).toBe('IN');
    expect(regionForTimeZone('Europe/London')).toBe('GB');
    expect(regionForTimeZone('Europe/Paris')).toBe('EU');
    expect(regionForTimeZone('Europe/Zurich')).toBe('ROW');
    expect(regionForTimeZone('America/New_York')).toBe('ROW');
  });

  it('prices every plan in each region currency', () => {
    expect(REGION_ORDER.map((r) => REGIONS[r].currency)).toEqual(['INR', 'GBP', 'EUR', 'USD']);
    expect(REGIONS.IN.prices.pro).toBe('₹599');
    expect(REGIONS.GB.prices.team).toBe('£15');
    expect(REGIONS.EU.prices.pro).toBe('€10');
    expect(REGIONS.ROW.prices.team).toBe('$18');
    for (const r of REGION_ORDER) expect(Object.keys(REGIONS[r].prices)).toEqual(['free', 'pro', 'team', 'business']);
  });
});
