import { describe, expect, it } from 'vitest';
import { LEGAL_STRINGS, defaultLanguage, translate } from './i18n';
import { countryForRegion, daysFromToday, fmtDate, fmtMoney } from './format';
import { NAV, visibleNav } from '../navigation';
import { LEGAL_PUBLIC, isLegalOperator } from './launch';
import { SOLUTIONS } from '../solutions';
import { PUBLIC_PAGES } from '../seo';

describe('meldra Legal strings', () => {
  it('has a Hindi string for every English one', () => {
    const missing = Object.keys(LEGAL_STRINGS.en).filter((k) => !(k in LEGAL_STRINGS.hi));
    expect(missing).toEqual([]);
  });

  it('fills placeholders and falls back to English', () => {
    expect(translate('en', 'likely_adjourned', { p: 70 })).toBe('Adjourned in 70% of similar hearings');
    expect(translate('hi', 'likely_adjourned', { p: 70 })).toContain('70%');
    expect(translate('xx', 'tab_today')).toBe('Today');
  });

  it('defaults to Hindi only for Indian firms on Hindi devices', () => {
    expect(defaultLanguage('IN', ['hi-IN', 'en'])).toBe('hi');
    expect(defaultLanguage('IN', ['en-IN'])).toBe('en');
    expect(defaultLanguage('GB', ['hi'])).toBe('en');
  });
});

describe('meldra Legal formatting', () => {
  it('uses dd/mm/yyyy and local currency', () => {
    expect(fmtDate('2026-11-05')).toBe('05/11/2026');
    expect(fmtMoney(150000, 'IN')).toBe('₹1,50,000');
    expect(fmtMoney(1500, 'GB')).toBe('£1,500');
  });

  it('counts days from today', () => {
    expect(daysFromToday('2026-10-08', '2026-10-06')).toBe(2);
    expect(daysFromToday('2026-10-01', '2026-10-06')).toBe(-5);
  });

  it('picks the country profile from the region', () => {
    expect(countryForRegion('GB')).toBe('GB');
    expect(countryForRegion('IN')).toBe('IN');
    expect(countryForRegion('INTL')).toBe('IN');
  });
});

describe('meldra Legal in the menu', () => {
  it('is hidden unless the account has the licence', () => {
    expect(NAV.some((e) => e.id === 'legal')).toBe(true);
    expect(visibleNav({}).some((e) => e.id === 'legal')).toBe(false);
    expect(visibleNav({ legal: true }).some((e) => e.id === 'legal')).toBe(true);
    expect(isLegalOperator(' SumitAgaria@gmail.com ')).toBe(true);
    expect(isLegalOperator('someone@firm.example')).toBe(false);
  });
});

describe('meldra Legal before launch', () => {
  it('leaves no public trace while the launch switch is off', () => {
    expect(LEGAL_PUBLIC).toBe(false);
    const paths = SOLUTIONS.flatMap((s) => s.useCases.map((u) => u.to));
    expect(paths).not.toContain('/legal-diary');
    expect(Object.keys(PUBLIC_PAGES)).not.toContain('/legal-diary');
  });
});
