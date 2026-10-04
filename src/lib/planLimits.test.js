import { describe, expect, it } from 'vitest';
import { FALLBACK_LIMITS, HEADLINE_KEYS, LIMIT_LABELS, PLAN_ORDER, formatLimit } from './planLimits';

describe('plan limits shown on the website', () => {
  it('has every limit for every plan', () => {
    for (const plan of PLAN_ORDER) {
      expect(Object.keys(FALLBACK_LIMITS.plans[plan].limits).sort()).toEqual(Object.keys(LIMIT_LABELS).sort());
    }
    expect(HEADLINE_KEYS.every((k) => k in LIMIT_LABELS)).toBe(true);
  });

  it('matches the published Free / Pro / Team figures', () => {
    const { free, pro, team } = FALLBACK_LIMITS.plans;
    expect([free.limits.file_size_mb, pro.limits.file_size_mb, team.limits.file_size_mb]).toEqual([10, 50, 100]);
    expect([free.limits.conversions_per_month, pro.limits.conversions_per_month, team.limits.conversions_per_month]).toEqual([20, 500, 2000]);
    expect([free.limits.ai_queries_per_month, pro.limits.ai_queries_per_month, team.limits.ai_queries_per_month]).toEqual([20, 300, 1000]);
  });

  it('formats limits for people', () => {
    expect(formatLimit(-1, 'pdf_pages')).toBe('Unlimited');
    expect(formatLimit(5000, 'monthly_upload_mb')).toBe('5 GB');
    expect(formatLimit(50, 'file_size_mb')).toBe('50 MB');
    expect(formatLimit(undefined, 'pdf_pages')).toBe('—');
  });
});
