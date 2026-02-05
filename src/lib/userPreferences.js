const DEFAULTS = {
  language: 'en',
  theme: 'system',
  brandName: null,
  logoUrl: null,
  primaryColor: null,
};

const THEME_KEY = 'app:theme';
const LANG_KEY = 'app:language';

const prefsKey = (email) => `prefs:${email || 'anon'}`;

function safeParseJson(s) {
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}

function clamp(n, min, max) {
  return Math.min(max, Math.max(min, n));
}

function hexToHslTriplet(hex) {
  if (!hex) return null;
  const h = String(hex).trim();
  const m = h.match(/^#?([0-9a-f]{6})$/i);
  if (!m) return null;

  const int = parseInt(m[1], 16);
  const r = ((int >> 16) & 255) / 255;
  const g = ((int >> 8) & 255) / 255;
  const b = (int & 255) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;

  let hue = 0;
  if (d !== 0) {
    if (max === r) hue = ((g - b) / d) % 6;
    else if (max === g) hue = (b - r) / d + 2;
    else hue = (r - g) / d + 4;
    hue *= 60;
    if (hue < 0) hue += 360;
  }

  const light = (max + min) / 2;
  const sat = d === 0 ? 0 : d / (1 - Math.abs(2 * light - 1));

  const H = Math.round(hue);
  const S = Math.round(sat * 100);
  const L = Math.round(light * 100);

  return `${clamp(H, 0, 360)} ${clamp(S, 0, 100)}% ${clamp(L, 0, 100)}%`;
}

export function getUserPreferences(email) {
  let fromUser = {};
  try {
    const raw = localStorage.getItem(prefsKey(email));
    fromUser = safeParseJson(raw) || {};
  } catch {
    fromUser = {};
  }

  let legacyLang = null;
  try {
    legacyLang = localStorage.getItem(LANG_KEY);
  } catch {
    legacyLang = null;
  }

  let legacyTheme = null;
  try {
    legacyTheme = localStorage.getItem(THEME_KEY);
  } catch {
    legacyTheme = null;
  }

  return {
    ...DEFAULTS,
    ...(legacyLang ? { language: legacyLang } : {}),
    ...(legacyTheme ? { theme: legacyTheme } : {}),
    ...fromUser,
  };
}

export function setUserPreferences(email, patch) {
  const current = getUserPreferences(email);
  const next = { ...current, ...(patch || {}) };
  try {
    localStorage.setItem(prefsKey(email), JSON.stringify(next));
  } catch {
    // ignore
  }
  return next;
}

export function applyTheme(theme) {
  const root = document.documentElement;
  const t = theme || 'system';

  const prefersDark = () => {
    try {
      return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    } catch {
      return false;
    }
  };

  const shouldDark = t === 'dark' || (t === 'system' && prefersDark());
  root.classList.toggle('dark', !!shouldDark);
}

export function applyPrimaryColor(hex) {
  const triplet = hexToHslTriplet(hex);
  if (!triplet) return;
  const root = document.documentElement;
  root.style.setProperty('--primary', triplet);
  root.style.setProperty('--ring', triplet);
}

export function applyPreferences(email) {
  const prefs = getUserPreferences(email);
  if (typeof document !== 'undefined') {
    applyTheme(prefs.theme);
    if (prefs.primaryColor) applyPrimaryColor(prefs.primaryColor);
  }
  return prefs;
}
