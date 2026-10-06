// meldra Legal API client. Every call carries the visitor's region (from /api/region) so a new firm's
// country profile defaults to where they are; they can change it in settings.
import { useEffect, useState } from 'react';
import { getApiBase } from '@/utils/apiConfig';
import { detectRegion } from '@/lib/region';

function token() {
  try {
    return localStorage.getItem('auth_token');
  } catch {
    return null;
  }
}

export class LegalApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

async function request(path, { method = 'GET', body, form, raw } = {}) {
  const base = getApiBase();
  const headers = { Authorization: `Bearer ${token() || ''}` };
  let region = 'INTL';
  try {
    region = await detectRegion();
  } catch {
    /* keep INTL */
  }
  headers['X-Region'] = region;
  let payload;
  if (form) payload = form;
  else if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
    payload = JSON.stringify(body);
  }
  const res = await fetch(`${base}/api/legal${path}`, { method, headers, body: payload });
  if (raw) {
    if (!res.ok) throw new LegalApiError(`HTTP ${res.status}`, res.status);
    return res;
  }
  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { detail: text };
  }
  if (!res.ok) {
    const detail = Array.isArray(data?.detail) ? data.detail.map((d) => d.msg).join('; ') : data?.detail;
    throw new LegalApiError(detail || `HTTP ${res.status}`, res.status);
  }
  return data;
}

export const legalApi = {
  access: () => request('/access'),
  bootstrap: () => request('/bootstrap'),
  saveSettings: (body) => request('/settings', { method: 'PUT', body }),
  matters: (params = {}) => request(`/matters?${new URLSearchParams(params)}`),
  matter: (id) => request(`/matters/${id}`),
  createMatter: (body) => request('/matters', { method: 'POST', body }),
  updateMatter: (id, body) => request(`/matters/${id}`, { method: 'PUT', body }),
  deleteMatter: (id) => request(`/matters/${id}`, { method: 'DELETE' }),
  addHearing: (id, body) => request(`/matters/${id}/hearings`, { method: 'POST', body }),
  deleteHearing: (id) => request(`/hearings/${id}`, { method: 'DELETE' }),
  today: (params = {}) => request(`/today?${new URLSearchParams(params)}`),
  tasks: (open = true) => request(`/tasks?open=${open}`),
  createTask: (body) => request('/tasks', { method: 'POST', body }),
  updateTask: (id, body) => request(`/tasks/${id}`, { method: 'PUT', body }),
  deleteTask: (id) => request(`/tasks/${id}`, { method: 'DELETE' }),
  suggestDeadline: (body) => request('/deadlines/suggest', { method: 'POST', body }),
  confirmDeadline: (body) => request('/deadlines', { method: 'POST', body }),
  importPreview: (file, country) => {
    const form = new FormData();
    form.append('file', file);
    if (country) form.append('country', country);
    return request('/import/preview', { method: 'POST', form });
  },
  importCommit: (rows) => request('/import/commit', { method: 'POST', body: { rows } }),
  reports: () => request('/reports'),
  suggestions: (mine = false) => request(`/suggestions?mine=${mine}`),
  extractOrder: (text, language) => request('/ai/extract-order', { method: 'POST', body: { text, language } }),
  ask: (question, language) => request('/ai/ask', { method: 'POST', body: { question, language } }),
  summarise: (body) => request('/ai/summarise', { method: 'POST', body }),
  checkCitations: (text, live) => request('/citations/check', { method: 'POST', body: { text, live } }),
  statutes: (q) => request(`/statutes?q=${encodeURIComponent(q)}`),
  research: (q, country) => request(`/research/search?${new URLSearchParams({ q, country: country || '' })}`),
  team: () => request('/team'),
  setTeam: (body) => request('/team', { method: 'POST', body }),
  loadSample: (country) => request('/sample', { method: 'POST', body: { country } }),
  clearSample: () => request('/sample', { method: 'DELETE' }),
  reminderPreview: () => request('/reminders/preview'),
  reminderSend: () => request('/reminders/send-me', { method: 'POST' }),
  calendar: () => request('/calendar.ics', { raw: true }),
  accessList: () => request('/admin/access'),
  grant: (body) => request('/admin/access', { method: 'POST', body }),
};

// Whether this account has meldra Legal. Unlicensed accounts never see it in the menu.
let accessPromise = null;
let accessFor = null;
export function fetchLegalAccess(email) {
  if (!email || !token()) return Promise.resolve(false);
  if (accessPromise && accessFor === email) return accessPromise;
  accessFor = email;
  accessPromise = legalApi
    .access()
    .then((r) => Boolean(r?.enabled))
    .catch(() => false);
  return accessPromise;
}

export function resetLegalAccess() {
  accessPromise = null;
  accessFor = null;
}

export function useLegalAccess(email) {
  const [enabled, setEnabled] = useState(false);
  useEffect(() => {
    let alive = true;
    fetchLegalAccess(email).then((v) => alive && setEnabled(v));
    return () => {
      alive = false;
    };
  }, [email]);
  return enabled;
}
