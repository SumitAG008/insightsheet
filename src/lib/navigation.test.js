import { describe, expect, it } from 'vitest';
import { NAV, isEntryActive, visibleNav } from './navigation';
import { SOLUTIONS } from './solutions';
import { renewalNotice } from './renewal';

describe('main menu', () => {
  it('has the seven entries in order', () => {
    expect(NAV.map((e) => e.id)).toEqual([
      'home', 'workbench', 'unified_reporting', 'migration', 'documents', 'solutions', 'automations',
    ]);
  });

  it('no longer has a separate AI assistant entry', () => {
    const paths = NAV.flatMap((e) => (e.items ? e.items.map((i) => i.to) : [e.to])).map((p) => p.toLowerCase());
    expect(paths).not.toContain('/agenticai');
    expect(new Set(paths).size).toBe(paths.length);
  });

  it('makes Workbench one page, so the menu and page names match', () => {
    const workbench = NAV.find((e) => e.id === 'workbench');
    expect(workbench.items).toBeUndefined();
    expect(workbench.to).toBe('/workbench');
  });

  it('hides Automations without access', () => {
    expect(visibleNav({}).some((e) => e.id === 'automations')).toBe(false);
    expect(visibleNav({ agenticWorkflows: true }).some((e) => e.id === 'automations')).toBe(true);
  });

  it('highlights the entry that owns the page, ignoring case', () => {
    const byId = Object.fromEntries(NAV.map((e) => [e.id, e]));
    expect(isEntryActive(byId.documents, '/ocrconverter')).toBe(true);
    expect(isEntryActive(byId.solutions, '/solutions/law-firms')).toBe(true);
    expect(isEntryActive(byId.home, '/dashboard')).toBe(true);
    expect(isEntryActive(byId.workbench, '/migration')).toBe(false);
    expect(isEntryActive(byId.workbench, '/Workbench')).toBe(true);
  });

  it('links Solutions menu items to listed sectors', () => {
    const ids = new Set(SOLUTIONS.map((s) => s.id));
    const solutions = NAV.find((e) => e.id === 'solutions');
    for (const item of solutions.items) {
      const id = item.to.split('/')[2];
      if (id) expect(ids.has(id)).toBe(true);
    }
  });
});

describe('solutions', () => {
  it('links every available or beta use case to a tool, and none of the planned ones', () => {
    for (const s of SOLUTIONS) {
      for (const u of s.useCases) {
        expect(['available', 'beta', 'planned']).toContain(u.status);
        if (u.status === 'planned') expect(u.to).toBeUndefined();
        else expect(u.to).toMatch(/^\//);
      }
    }
  });
});

describe('renewal notice', () => {
  const org = { name: 'Uni', license_id: 1, end_date: '2026-11-01T00:00:00', grace_ends: '2026-11-15T00:00:00', days_left: 25 };

  it('tells admins ahead of the end date, not members', () => {
    expect(renewalNotice({ ...org, renewal_stage: 'd30' }, 'owner').canRenew).toBe(true);
    expect(renewalNotice({ ...org, renewal_stage: 'd30' }, 'member')).toBeNull();
  });

  it('tells everyone during the grace period, urgently', () => {
    const n = renewalNotice({ ...org, renewal_stage: 'grace' }, 'member');
    expect(n.urgent).toBe(true);
    expect(n.canRenew).toBe(false);
  });

  it('says nothing once renewed', () => {
    expect(renewalNotice({ ...org, renewal_stage: null }, 'owner')).toBeNull();
  });
});
