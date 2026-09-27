/**
 * Next-Gen Migration engine: raw multi-tab extracts → load-ready target files.
 *
 *   1. mapSheets      — classify every column to a canonical concept (names,
 *                       synonyms and the shape of the values), per sheet.
 *   2. assemble       — cross-tab merge on the employee key (no VLOOKUPs):
 *                       one person record, job history rows, pay rows and
 *                       org lookup lists.
 *   3. cleanse        — normalise every value to the target's rules and log
 *                       each automatic fix (dates, picklists, countries…).
 *   4. buildOutputs   — fill the target templates, validate required fields
 *                       and references, and order files by dependency.
 */
import { CONCEPTS, CONCEPT_BY_ID, ORG_LISTS } from './concepts';
import { PICKLISTS, suggestCode, toCountry, toCurrency } from './dictionaries';

/* ======================= 1. mapping ======================= */

const norm = (s) => String(s ?? '').toLowerCase().replace(/[_\-./#()%]+/g, ' ').replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ').trim();
const tokens = (s) => norm(s).split(' ').filter(Boolean);
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function sampleValues(sheet, key, n = 60) {
  const out = [];
  for (const r of sheet.rows) {
    const v = r[key];
    if (v !== null && v !== undefined && String(v).trim() !== '') out.push(v);
    if (out.length >= n) break;
  }
  return out;
}

function nameScore(colName, concept) {
  const cn = norm(colName);
  const ct = new Set(tokens(colName));
  let best = 0;
  for (const syn of [concept.label.toLowerCase(), ...concept.synonyms]) {
    const sn = norm(syn);
    if (cn === sn) return 1;
    const st = tokens(syn);
    if (!st.length) continue;
    const inter = st.filter((t) => ct.has(t)).length;
    if (inter === st.length) {
      // All synonym words present; penalise extra words a little.
      best = Math.max(best, 0.82 - 0.04 * Math.max(0, ct.size - st.length));
    } else if (inter) {
      best = Math.max(best, 0.5 * (inter / Math.max(st.length, ct.size)));
    }
  }
  return best;
}

function valueScore(vals, concept) {
  if (!vals.length) return 0;
  const frac = (fn) => vals.filter(fn).length / vals.length;
  switch (concept.type) {
    case 'email': { const f = frac((v) => EMAIL_RE.test(String(v).trim())); return f > 0.6 ? 0.3 : f < 0.2 ? -0.6 : 0; }
    case 'date': { const f = frac((v) => parseDateParts(v) !== null); return f > 0.8 ? 0.15 : f < 0.3 ? -0.6 : 0; }
    case 'gender': return frac((v) => suggestCode('gender', v)) > 0.8 ? 0.3 : -0.3;
    case 'marital': return frac((v) => suggestCode('marital', v)) > 0.7 ? 0.2 : -0.2;
    case 'status': return frac((v) => suggestCode('status', v)) > 0.8 ? 0.2 : -0.2;
    case 'yesno': return frac((v) => suggestCode('yesno', v)) > 0.8 ? 0.2 : -0.2;
    case 'frequency': return frac((v) => suggestCode('frequency', v)) > 0.7 ? 0.2 : -0.2;
    case 'country': { const f = frac((v) => toCountry(v)); return f > 0.7 ? 0.25 : f < 0.3 ? -0.5 : 0; }
    case 'currency': return frac((v) => toCurrency(v)) > 0.8 ? 0.3 : -0.4;
    case 'number':
    case 'fte': return frac((v) => Number.isFinite(parseNum(v))) > 0.9 ? 0.1 : -0.5;
    default: return 0;
  }
}

/**
 * Suggest a concept for every column of every sheet. Returns
 * { [sheetId]: { [colKey]: { concept, confidence, method } } }.
 */
export function mapSheets(sheets) {
  const mapping = {};
  for (const sheet of sheets) {
    const cand = [];
    for (const col of sheet.columns) {
      const vals = sampleValues(sheet, col.key);
      for (const c of CONCEPTS) {
        const ns = nameScore(col.name, c);
        if (ns < 0.3) continue;
        cand.push({ col: col.key, concept: c.id, score: Math.min(1, ns + valueScore(vals, c)) });
      }
    }
    cand.sort((a, b) => b.score - a.score);
    const usedCol = new Set();
    const usedConcept = new Set();
    const m = {};
    for (const x of cand) {
      if (x.score < 0.55 || usedCol.has(x.col) || usedConcept.has(x.concept)) continue;
      usedCol.add(x.col);
      usedConcept.add(x.concept);
      m[x.col] = { concept: x.concept, confidence: Math.round(x.score * 100) / 100, method: 'rules' };
    }
    contextualise(m);
    mapping[sheet.id] = m;
  }
  return mapping;
}

/** Same word, different meaning by sheet: "Country" on a company list is the company's country. */
function contextualise(m) {
  const has = (id) => Object.values(m).some((x) => x.concept === id);
  const swap = (from, to) => Object.values(m).forEach((x) => { if (x.concept === from && !has(to)) x.concept = to; });
  if (has('employee_id')) {
    // A generic effective date on a pay-only sheet is the compensation date.
    if (has('salary_amount') && !has('job_code') && !has('department_code')) swap('job_effective_date', 'comp_effective_date');
    return;
  }
  if (has('company_code')) { swap('address_country', 'company_country'); swap('currency', 'company_currency'); }
  else if (has('location_code')) swap('address_country', 'location_country');
}

/* ======================= value cleansing ======================= */

export function parseNum(v) {
  if (typeof v === 'number') return v;
  const s = String(v ?? '').replace(/[£$€,\s]/g, '').replace(/%$/, '');
  if (!s || !/^-?\d*\.?\d+$/.test(s)) return NaN;
  return parseFloat(s);
}

/** Split a date-like value into parts, or null. Returns { iso } or { a, b, y } for ambiguous slashes. */
function parseDateParts(v) {
  if (v instanceof Date && !Number.isNaN(v.getTime())) return { iso: v.toISOString().slice(0, 10) };
  if (typeof v === 'number' && v > 20000 && v < 80000) {
    // Excel serial date (days since 1899-12-30).
    return { iso: new Date(Date.UTC(1899, 11, 30) + v * 864e5).toISOString().slice(0, 10), serial: true };
  }
  const s = String(v ?? '').trim();
  let m = s.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})(?:[ T].*)?$/);
  if (m) return { iso: `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}` };
  m = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2}|\d{4})$/);
  if (m) return { a: +m[1], b: +m[2], y: m[3] };
  m = s.match(/^(\d{1,2})[ -]([A-Za-z]{3,9})[ -,]*(\d{2}|\d{4})$/);
  if (m) {
    const mon = MONTHS.indexOf(m[2].slice(0, 3).toLowerCase()) + 1;
    if (mon) return { iso: `${fullYear(m[3])}-${String(mon).padStart(2, '0')}-${m[1].padStart(2, '0')}` };
  }
  return null;
}
const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

function fullYear(y) {
  if (String(y).length === 4) return String(y);
  const yy = +y;
  const pivot = (new Date().getFullYear() % 100) + 1;
  return String(yy <= pivot ? 2000 + yy : 1900 + yy);
}

const validIso = (iso) => {
  const d = new Date(`${iso}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === iso;
};

/** Decide day/month order for a column from values that can only be read one way. */
export function detectDateOrder(values) {
  let dmy = 0;
  let mdy = 0;
  for (const v of values) {
    const p = parseDateParts(v);
    if (!p || p.iso) continue;
    if (p.a > 12) dmy++;
    if (p.b > 12) mdy++;
  }
  if (dmy && !mdy) return 'DMY';
  if (mdy && !dmy) return 'MDY';
  return null;
}

export function toIsoDate(v, order) {
  const p = parseDateParts(v);
  if (!p) return null;
  if (p.iso) return validIso(p.iso) ? p.iso : null;
  const [month, day] = order === 'DMY' ? [p.b, p.a] : [p.a, p.b];
  const iso = `${fullYear(p.y)}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  return validIso(iso) ? iso : null;
}

export function formatDate(iso, fmt) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return fmt.replace('yyyy', y).replace('MM', m).replace('dd', d);
}

/**
 * Clean one value for a concept. Returns { value, rule?, error? } where rule
 * names the automatic fix applied (for the change log).
 */
export function cleanValue(conceptId, raw, ctx) {
  const c = CONCEPT_BY_ID[conceptId];
  if (raw === null || raw === undefined || String(raw).trim() === '') return { value: '' };
  const s = String(raw);
  const t = s.trim().replace(/\s+/g, ' ');
  const trimmed = t !== s ? 'whitespace' : null;
  switch (c?.type) {
    case 'date': {
      const iso = toIsoDate(raw, ctx.dateOrder);
      if (!iso) return { value: '', error: `“${s}” is not a date` };
      return { value: iso, rule: iso === t ? trimmed : 'date' };
    }
    case 'email': {
      const e = t.toLowerCase();
      if (!EMAIL_RE.test(e)) return { value: '', error: `“${s}” is not a valid email address` };
      return { value: e, rule: e !== s ? 'email' : null };
    }
    case 'phone': {
      // "+44 (0)20…": the bracketed trunk 0 is dropped when a country code is present.
      const p = (t.startsWith('+') ? t.replace(/\(0\)/g, '') : t).replace(/(?!^\+)[^\d]/g, '');
      return { value: p, rule: p !== s ? 'phone' : null };
    }
    case 'country': {
      const a3 = toCountry(t);
      if (!a3) return { value: '', error: `Unknown country “${s}”` };
      return { value: a3, rule: a3 !== s ? 'country' : null };
    }
    case 'currency': {
      const cur = toCurrency(t);
      if (!cur) return { value: '', error: `Unknown currency “${s}”` };
      return { value: cur, rule: cur !== s ? 'currency' : null };
    }
    case 'gender':
    case 'marital':
    case 'status':
    case 'yesno':
    case 'frequency': {
      const key = t.toLowerCase();
      const code = ctx.picklists?.[c.type]?.[key] ?? suggestCode(c.type, t);
      if (!code) return { value: '', error: `No ${PICKLISTS[c.type].label.toLowerCase()} code for “${s}”`, picklist: c.type };
      return { value: code, rule: code !== s ? `picklist:${c.type}` : null };
    }
    case 'reason': {
      // Event reason codes are instance-specific: pass through unless the user mapped one.
      const code = ctx.picklists?.reason?.[t.toLowerCase()] || t;
      return { value: code, rule: code !== t ? 'picklist:reason' : trimmed };
    }
    case 'fte': {
      let n = parseNum(t);
      if (!Number.isFinite(n)) return { value: '', error: `“${s}” is not a number` };
      let rule = String(n) !== s ? 'number' : null;
      if (n > 1.5 && n <= 100) { n = Math.round((n / 100) * 10000) / 10000; rule = 'fte'; }
      return { value: String(n), rule };
    }
    case 'number': {
      const n = parseNum(t);
      if (!Number.isFinite(n)) return { value: '', error: `“${s}” is not a number` };
      return { value: String(n), rule: String(n) !== s ? 'number' : null };
    }
    case 'id': {
      // Excel turns 1001 into 1001.0 or 1001 (number); IDs are text.
      const v = typeof raw === 'number' && Number.isInteger(raw) ? String(raw) : t.replace(/^(\d+)\.0+$/, '$1');
      return { value: v, rule: v !== s ? (v !== t ? 'id' : trimmed) : null };
    }
    default:
      return { value: t, rule: trimmed };
  }
}

export const RULE_TEXT = {
  date: 'Rewrote dates into one standard format',
  email: 'Lower-cased email addresses',
  phone: 'Stripped formatting from phone numbers',
  country: 'Converted countries to ISO 3-letter codes',
  currency: 'Converted currencies to ISO codes',
  'picklist:gender': 'Translated gender values to picklist codes',
  'picklist:marital': 'Translated marital status values to picklist codes',
  'picklist:status': 'Translated employment status to active / inactive',
  'picklist:yesno': 'Translated yes / no values',
  'picklist:frequency': 'Translated pay frequencies to picklist codes',
  'picklist:reason': 'Translated termination reasons to event reason codes',
  fte: 'Converted FTE percentages (100 → 1.0)',
  number: 'Removed symbols and separators from numbers',
  id: 'Restored IDs that Excel had turned into numbers',
  whitespace: 'Trimmed stray spaces',
  'org-created': 'Created org records that were referenced but missing from the org lists',
  'org-name': 'Filled org names from job data',
  'company-country': 'Inferred legal entity country from its employees’ locations',
  'job-from-person': 'Built a job record from worker data (no job history sheet)',
  'merged-duplicate': 'Merged duplicate rows for the same employee',
};

/* ======================= 2. assemble ======================= */

const JOB_GROUPS = new Set(['Job', 'Organization']);
const groupOf = (id) => CONCEPT_BY_ID[id]?.group;

/**
 * Cross-tab merge. Every sheet with an employee key contributes to that
 * employee; sheets with several rows per employee and an effective date are
 * history (job or pay events). Sheets without an employee key are org lists.
 */
export function assemble(sheets, mapping, settings, picklists = {}) {
  const changes = {};
  const issues = [];
  const unmappedPicklist = {};
  const logChange = (rule, before, after) => {
    if (!rule) return;
    const c = (changes[rule] ||= { rule, text: RULE_TEXT[rule] || rule, count: 0, examples: [] });
    c.count++;
    if (c.examples.length < 3 && before !== undefined && String(before) !== String(after)) c.examples.push([String(before), String(after)]);
  };

  const people = new Map();
  const jobRows = [];
  const compRows = [];
  const org = Object.fromEntries(ORG_LISTS.map((l) => [l.id, new Map()]));
  const sheetRoles = {};

  for (const sheet of sheets) {
    const m = mapping[sheet.id] || {};
    const cols = Object.entries(m).filter(([, x]) => x && x.concept);
    const conceptCol = Object.fromEntries(cols.map(([k, x]) => [x.concept, k]));
    const dateOrders = {};
    for (const [k, x] of cols) {
      if (CONCEPT_BY_ID[x.concept]?.type !== 'date') continue;
      const forced = settings.sourceDateOrder !== 'auto' ? settings.sourceDateOrder : null;
      const detected = detectDateOrder(sampleValues(sheet, k, 5000));
      dateOrders[k] = forced || detected || 'MDY';
      if (!forced && !detected && sampleValues(sheet, k, 200).some((v) => parseDateParts(v)?.a)) {
        issues.push({ severity: 'info', entity: sheet.name, key: '', field: sheet.columns.find((c) => c.key === k)?.name, message: 'Every date could be read either way; read as month/day/year. Change “Source date order” in Settings if that is wrong.' });
      }
    }

    const cleanRow = (r) => {
      const o = {};
      for (const [k, x] of cols) {
        const res = cleanValue(x.concept, r[k], { dateOrder: dateOrders[k], picklists });
        if (res.error) {
          if (res.picklist) {
            const bucket = (unmappedPicklist[res.picklist] ||= new Map());
            bucket.set(String(r[k]).trim(), (bucket.get(String(r[k]).trim()) || 0) + 1);
          }
          o.__errors = [...(o.__errors || []), { concept: x.concept, message: res.error }];
        } else if (res.value !== '') {
          o[x.concept] = res.value;
          logChange(res.rule, r[k], res.value);
        }
      }
      return o;
    };

    if (!conceptCol.employee_id) {
      const list = ORG_LISTS.find((l) => conceptCol[l.code]);
      if (!list) { sheetRoles[sheet.id] = 'unused'; continue; }
      sheetRoles[sheet.id] = `org:${list.id}`;
      for (const r of sheet.rows) {
        const o = cleanRow(r);
        const code = o[list.code];
        if (!code) continue;
        org[list.id].set(code, { code, name: list.name ? o[list.name] || '' : '', extra: Object.fromEntries(list.extra.map((e) => [e, o[e] || ''])), listed: true, sheet: sheet.name });
      }
      continue;
    }

    const counts = new Map();
    for (const r of sheet.rows) {
      const id = cleanValue('employee_id', r[conceptCol.employee_id], {}).value;
      if (id) counts.set(id, (counts.get(id) || 0) + 1);
    }
    const repeats = [...counts.values()].some((n) => n > 1);
    const hasJob = cols.some(([, x]) => JOB_GROUPS.has(groupOf(x.concept)) && x.concept !== 'manager_id') || conceptCol.manager_id;
    const hasComp = cols.some(([, x]) => groupOf(x.concept) === 'Compensation');
    const isHistory = repeats && (conceptCol.job_effective_date || conceptCol.comp_effective_date);
    sheetRoles[sheet.id] = isHistory ? (hasComp && !hasJob ? 'history:comp' : 'history:job') : 'employee';

    for (const r of sheet.rows) {
      const o = cleanRow(r);
      const id = o.employee_id;
      if (!id) continue;
      const p = people.get(id) || { id, values: {}, sources: new Set(), errors: [] };
      people.set(id, p);
      p.sources.add(sheet.name);
      (o.__errors || []).forEach((e) => p.errors.push({ ...e, sheet: sheet.name }));
      if (isHistory) {
        const target = sheetRoles[sheet.id] === 'history:comp' ? compRows : jobRows;
        target.push({ id, values: o, sheet: sheet.name });
        continue;
      }
      if (counts.get(id) > 1 && !p.dupLogged?.has(sheet.name)) {
        (p.dupLogged ||= new Set()).add(sheet.name);
        logChange('merged-duplicate', `${id} ×${counts.get(id)} in ${sheet.name}`, id);
      }
      for (const [k, v] of Object.entries(o)) {
        if (k.startsWith('__') || k === 'employee_id') continue;
        const cur = p.values[k];
        if (cur === undefined || cur === '') p.values[k] = v;
        else if (cur !== v) {
          issues.push({ severity: 'warning', entity: 'Source data', key: id, field: CONCEPT_BY_ID[k]?.label || k, message: `Different values across tabs (“${cur}” kept, “${v}” in ${sheet.name})` });
        }
      }
    }
  }

  // Order history; derive single rows when no history sheet exists.
  const byDate = (key) => (a, b) => String(a.values[key] || '').localeCompare(String(b.values[key] || ''));
  jobRows.sort(byDate('job_effective_date'));
  compRows.sort(byDate('comp_effective_date'));
  const jobsFor = new Map();
  for (const j of jobRows) (jobsFor.get(j.id) || jobsFor.set(j.id, []).get(j.id)).push(j);
  const compsFor = new Map();
  for (const c of compRows) (compsFor.get(c.id) || compsFor.set(c.id, []).get(c.id)).push(c);
  for (const p of people.values()) {
    if (!jobsFor.has(p.id) && Object.keys(p.values).some((k) => JOB_GROUPS.has(groupOf(k)))) {
      jobsFor.set(p.id, [{ id: p.id, values: {}, sheet: 'worker data', derived: true }]);
      logChange('job-from-person');
    }
    if (!compsFor.has(p.id) && p.values.salary_amount) compsFor.set(p.id, [{ id: p.id, values: {}, sheet: 'worker data', derived: true }]);
  }

  // Org records referenced by people or jobs but missing from the lists.
  const refs = [
    ['company', 'company_code', 'company_name'], ['department', 'department_code', 'department_name'],
    ['location', 'location_code', 'location_name'], ['job', 'job_code', 'job_name'],
    ['business_unit', 'business_unit', null], ['division', 'division', null],
  ];
  const allJobValues = [...people.values()].flatMap((p) => [p.values, ...(jobsFor.get(p.id) || []).map((j) => j.values)]);
  for (const [list, codeKey, nameKey] of refs) {
    for (const v of allJobValues) {
      const code = v[codeKey];
      if (!code) continue;
      const rec = org[list].get(code);
      if (!rec) {
        org[list].set(code, { code, name: (nameKey && v[nameKey]) || '', extra: { cost_center: v.cost_center || '', timezone: v.timezone || '', location_country: v.location_country || '' }, listed: false });
        logChange('org-created', code, `${list} ${code}`);
      } else if (nameKey && !rec.name && v[nameKey]) {
        rec.name = v[nameKey];
        logChange('org-name', code, v[nameKey]);
      }
    }
  }

  // Legal entity country: infer from where its people work when the list lacks it.
  for (const rec of org.company.values()) {
    if (rec.extra.company_country) continue;
    const tally = {};
    for (const p of people.values()) {
      const jobs = jobsFor.get(p.id) || [];
      const last = jobs.length ? { ...p.values, ...jobs[jobs.length - 1].values } : p.values;
      if (last.company_code !== rec.code) continue;
      const loc = last.location_code && org.location.get(last.location_code);
      const ctry = loc?.extra.location_country || last.address_country;
      if (ctry) tally[ctry] = (tally[ctry] || 0) + 1;
    }
    const best = Object.entries(tally).sort((a, b) => b[1] - a[1])[0];
    if (best) {
      rec.extra.company_country = best[0];
      logChange('company-country', rec.code, best[0]);
    }
  }

  return {
    people: [...people.values()],
    jobsFor,
    compsFor,
    org,
    changes: Object.values(changes).sort((a, b) => b.count - a.count),
    issues,
    sheetRoles,
    unmappedPicklist: Object.fromEntries(Object.entries(unmappedPicklist).map(([k, v]) => [k, [...v.entries()].map(([raw, count]) => ({ raw, count }))])),
  };
}

/* ======================= 3. outputs & validation ======================= */

/** Topological order of entities by dependsOn (ignoring entities with no rows). */
export function loadOrder(entities) {
  const ids = new Set(entities.map((e) => e.id));
  const done = [];
  const seen = new Set();
  const visit = (e, stack = new Set()) => {
    if (seen.has(e.id)) return;
    if (stack.has(e.id)) throw new Error(`Circular dependency at ${e.id}`);
    stack.add(e.id);
    for (const d of e.dependsOn) {
      const dep = entities.find((x) => x.id === d);
      if (dep && ids.has(d)) visit(dep, stack);
    }
    seen.add(e.id);
    done.push(e);
  };
  entities.forEach((e) => visit(e));
  return done;
}

/** Build every target file, validate it, and order the files for loading. */
export function buildOutputs(target, data, settings) {
  const issues = [...data.issues];
  const personIds = new Set(data.people.map((p) => p.id));
  const fmtDate = (iso) => formatDate(iso, settings.dateFormat);

  for (const p of data.people) {
    for (const e of p.errors) issues.push({ severity: 'error', entity: e.sheet, key: p.id, field: CONCEPT_BY_ID[e.concept]?.label, message: e.message });
  }

  const orgExtra = (list, code, key) => (code && data.org[list].get(code)?.extra[key]) || '';
  const makeCtx = (p, extra = {}) => {
    const jobs = data.jobsFor.get(p.id) || [];
    const latest = jobs.length ? jobs[jobs.length - 1].values : {};
    return {
      settings,
      orgExtra,
      get: (k) => (k === 'employee_id' ? p.id : p.values[k] || ''),
      job: (k) => latest[k] || p.values[k] || '',
      ...extra,
    };
  };
  const withRow = (p, row, extra = {}) => {
    const base = makeCtx(p);
    return { ...base, get: (k) => (k === 'employee_id' ? p.id : row[k] || p.values[k] || ''), ...extra };
  };

  const recordsFor = (entity) => {
    const [kind, list] = entity.grain.split(':');
    if (kind === 'org') {
      return [...data.org[list].values()].map((rec) => ({ key: rec.code, ctx: { settings, code: rec.code, name: rec.name, extra: rec.extra } }));
    }
    const out = [];
    for (const p of data.people) {
      const terminated = p.values.status === 'inactive' || !!p.values.termination_date;
      switch (entity.grain) {
        case 'employee':
          out.push({ key: p.id, ctx: makeCtx(p) });
          break;
        case 'job':
          (data.jobsFor.get(p.id) || []).forEach((j, i) => out.push({ key: `${p.id} @ ${j.values.job_effective_date || p.values.hire_date || '?'}`, person: p.id, ctx: withRow(p, j.values, { isFirstJob: i === 0 }) }));
          break;
        case 'comp':
          (data.compsFor.get(p.id) || []).forEach((c) => out.push({ key: `${p.id} @ ${c.values.comp_effective_date || '?'}`, person: p.id, ctx: withRow(p, c.values) }));
          break;
        case 'termination':
          if (terminated) out.push({ key: p.id, ctx: makeCtx(p) });
          break;
        case 'email': {
          const work = p.values.email_work;
          const personal = p.values.email_personal;
          if (work) out.push({ key: p.id, ctx: makeCtx(p, { email: work, emailType: settings.workEmailType, isPrimary: true }) });
          if (personal) out.push({ key: p.id, ctx: makeCtx(p, { email: personal, emailType: settings.personalEmailType, isPrimary: !work }) });
          break;
        }
        case 'phone':
          if (p.values.phone_work) out.push({ key: p.id, ctx: makeCtx(p) });
          break;
        case 'address':
          if (p.values.address_line1 || p.values.city || p.values.postal_code) out.push({ key: p.id, ctx: makeCtx(p) });
          break;
        default:
      }
    }
    return out;
  };

  const orgCodes = Object.fromEntries(Object.entries(data.org).map(([k, v]) => [k, new Set(v.keys())]));
  const refSet = { employee: personIds, FOCompany: orgCodes.company, FOBusinessUnit: orgCodes.business_unit, FODivision: orgCodes.division, FODepartment: orgCodes.department, FOLocation: orgCodes.location, FOJobCode: orgCodes.job };

  const files = [];
  for (const entity of target.entities) {
    const records = recordsFor(entity);
    if (!records.length) continue;
    const rows = records.map(({ key, ctx }) => {
      const row = {};
      for (const f of entity.fields) {
        let v = f.derive ? f.derive(ctx) : ctx.get(f.from);
        v = v === null || v === undefined ? '' : String(v);
        if (f.date && v) v = fmtDate(v);
        row[f.id] = v;
        const missingTermination = entity.grain === 'termination' && !ctx.get('termination_date');
        if (f.required && !v && !missingTermination) {
          const concept = f.from ? CONCEPT_BY_ID[f.from]?.label : null;
          issues.push({ severity: 'error', entity: entity.label, key, field: f.id, message: `Required${concept ? ` (${concept})` : ''} is empty` });
        }
        if (f.ref && v && !['NO_MANAGER', 'NO_HR'].includes(v) && refSet[f.ref] && !refSet[f.ref].has(v)) {
          issues.push({ severity: 'error', entity: entity.label, key, field: f.id, message: f.ref === 'employee' ? `Manager ${v} is not in this migration` : `${v} does not exist in ${f.ref}` });
        }
      }
      return row;
    });
    files.push({ entity, rows });
  }

  // Cross-record rules the templates can't express.
  for (const p of data.people) {
    const v = p.values;
    if (v.status === 'inactive' && !v.termination_date) issues.push({ severity: 'error', entity: 'Termination Details', key: p.id, field: 'end-date', message: 'Marked terminated, but no termination date or reason was found in any tab' });
    if (v.termination_date && v.hire_date && v.termination_date < v.hire_date) issues.push({ severity: 'error', entity: 'Termination Details', key: p.id, field: 'end-date', message: `Termination date ${v.termination_date} is before hire date ${v.hire_date}` });
    if (v.status === 'active' && v.termination_date && v.termination_date < settings.asOf) issues.push({ severity: 'warning', entity: 'Basic User Import', key: p.id, field: 'STATUS', message: `Active, but has a past termination date (${v.termination_date})` });
    if (v.date_of_birth && v.hire_date) {
      const age = (Date.parse(v.hire_date) - Date.parse(v.date_of_birth)) / (365.25 * 864e5);
      if (age < 14 || age > 90) issues.push({ severity: 'warning', entity: 'Biographical Information', key: p.id, field: 'date-of-birth', message: `Age at hire would be ${Math.floor(age)}; check the date order` });
    }
  }
  const emails = new Map();
  for (const p of data.people) if (p.values.email_work) emails.set(p.values.email_work, [...(emails.get(p.values.email_work) || []), p.id]);
  for (const [e, ids] of emails) if (ids.length > 1) issues.push({ severity: 'warning', entity: 'Email Information', key: ids.join(', '), field: 'email-address', message: `${e} is shared by ${ids.length} employees` });

  const ordered = loadOrder(files.map((f) => f.entity)).map((e, i) => {
    const f = files.find((x) => x.entity.id === e.id);
    return { ...f, order: i + 1, fileName: `${String(i + 1).padStart(2, '0')}_${e.id}.csv` };
  });

  const counts = { error: 0, warning: 0, info: 0 };
  issues.forEach((i) => { counts[i.severity]++; });
  return { files: ordered, issues, counts };
}

/** Run the whole pipeline. */
export function runMigration(target, sheets, mapping, settings, picklists) {
  const data = assemble(sheets, mapping, settings, picklists);
  const out = buildOutputs(target, data, settings);
  return { data, ...out };
}

/* ======================= picklist review ======================= */

export const REVIEW_TYPES = ['gender', 'marital', 'status', 'yesno', 'frequency', 'reason'];

/**
 * Every distinct source value of each picklist-like concept, with the code it
 * will become (user override, else suggestion) so the user can review them.
 */
export function picklistValues(sheets, mapping, picklists = {}) {
  const out = {};
  for (const sheet of sheets) {
    for (const [col, x] of Object.entries(mapping[sheet.id] || {})) {
      const type = CONCEPT_BY_ID[x?.concept]?.type;
      if (!REVIEW_TYPES.includes(type)) continue;
      const bucket = (out[type] ||= new Map());
      for (const r of sheet.rows) {
        const raw = String(r[col] ?? '').trim();
        if (!raw) continue;
        const key = raw.toLowerCase();
        const cur = bucket.get(key) || { raw, count: 0 };
        cur.count++;
        bucket.set(key, cur);
      }
    }
  }
  return Object.fromEntries(Object.entries(out).map(([type, m]) => [type, [...m.entries()].map(([key, v]) => {
    const override = picklists[type]?.[key];
    const suggested = type === 'reason' ? v.raw : suggestCode(type, v.raw);
    return { key, raw: v.raw, count: v.count, code: override ?? suggested ?? '', source: override !== undefined ? 'you' : suggested ? 'suggested' : 'missing' };
  }).sort((a, b) => b.count - a.count)]));
}
