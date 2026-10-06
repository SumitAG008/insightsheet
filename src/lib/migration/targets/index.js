/**
 * Every target system the migration engine can produce load files for. The
 * source side is system-neutral (any extract maps to the canonical concepts in
 * ../concepts.js), so any source can go to any target here.
 */
import { SUCCESSFACTORS, DEFAULT_SETTINGS } from './successfactors';
import { WORKDAY } from './workday';
import { ORACLE_HCM } from './oracle';
import { SALESFORCE } from './salesforce';

export const TARGETS = [SUCCESSFACTORS, WORKDAY, ORACLE_HCM, SALESFORCE];
export const TARGET_BY_ID = Object.fromEntries(TARGETS.map((t) => [t.id, t]));
export const DEFAULT_TARGET = 'successfactors';

export function targetFor(id) {
  return TARGET_BY_ID[id] || TARGET_BY_ID[DEFAULT_TARGET];
}

/** Settings for a target: the shared defaults, the target's own defaults, then the user's choices. */
export function settingsFor(target, current = {}) {
  const switched = current.target && current.target !== target.id;
  const base = { ...DEFAULT_SETTINGS, ...(target.defaultSettings || {}) };
  const merged = { ...base, ...current, target: target.id };
  // A new target brings its own date format; other choices carry over.
  if (switched || !current.dateFormat) merged.dateFormat = base.dateFormat;
  return merged;
}

// Systems people migrate from. Free text is allowed as well.
export const SOURCE_SYSTEMS = [
  'Workday', 'SAP SuccessFactors', 'Oracle HCM Cloud', 'Salesforce', 'Oracle E-Business Suite', 'SAP HCM (on-premise)', 'ADP',
  'UKG / Kronos', 'BambooHR', 'Dayforce (Ceridian)', 'PeopleSoft', 'Sage People', 'Excel / custom',
];
