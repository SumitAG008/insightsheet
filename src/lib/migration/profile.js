/**
 * Migration profile: the mapping, value translations and settings of one
 * migration, saved as a file and re-applied to the next extract. This is
 * SAP's "export the value conversion and reuse it in production": mock load
 * 1 → mock load 2 → cutover all run with the same decisions.
 */
import { CONCEPT_BY_ID } from './concepts';

export const PROFILE_VERSION = 1;

// "workday_extract · Worker_Data" and "Worker_Data" are the same tab across extracts.
const tabName = (name) => String(name).split(' · ').pop().trim().toLowerCase();
const colName = (name) => String(name).trim().toLowerCase();

export function exportProfile({ sheets, mapping, settings, picklists, tabInfo, source = 'Workday', target = 'successfactors' }) {
  const tabs = {};
  for (const s of sheets) {
    const cols = {};
    for (const c of s.columns) {
      const m = mapping[s.id]?.[c.key];
      if (m && (m.concept || m.method === 'you')) cols[c.name] = { concept: m.concept || null, method: m.method };
    }
    tabs[tabName(s.name)] = { columns: cols, purpose: tabInfo?.[s.id]?.purpose || null };
  }
  // asOf is "today" at run time, not a project decision.
  const kept = { ...(settings || {}) };
  delete kept.asOf;
  return { kind: 'meldra-migration-profile', version: PROFILE_VERSION, source, target, savedAt: new Date().toISOString(), settings: kept, picklists: picklists || {}, tabs };
}

/**
 * Apply a saved profile to newly loaded sheets. Saved choices win over the
 * automatic mapping; columns the profile doesn't know keep their new mapping.
 */
export function applyProfile(profile, sheets, currentMapping, currentSettings) {
  if (!profile || profile.kind !== 'meldra-migration-profile') throw new Error('This file is not a meldra migration profile.');
  const mapping = { ...currentMapping };
  const tabInfo = {};
  let applied = 0;
  let matchedTabs = 0;
  for (const s of sheets) {
    const saved = profile.tabs?.[tabName(s.name)];
    if (!saved) continue;
    matchedTabs++;
    if (saved.purpose) tabInfo[s.id] = { purpose: saved.purpose, note: 'From profile' };
    const next = { ...(mapping[s.id] || {}) };
    for (const c of s.columns) {
      const hit = Object.entries(saved.columns || {}).find(([name]) => colName(name) === colName(c.name));
      if (!hit) continue;
      const concept = hit[1].concept && CONCEPT_BY_ID[hit[1].concept] ? hit[1].concept : null;
      next[c.key] = { concept, confidence: 1, method: 'profile' };
      applied++;
    }
    mapping[s.id] = next;
  }
  return {
    mapping,
    tabInfo,
    settings: { ...currentSettings, ...(profile.settings || {}) },
    picklists: profile.picklists || {},
    stats: { applied, matchedTabs, tabs: sheets.length },
  };
}
