// Formatting for meldra Legal: dd/mm/yyyy in both countries, ₹ with Indian digit grouping, £ for the UK.

export function fmtDate(iso) {
  if (!iso) return '—';
  const [y, m, d] = String(iso).slice(0, 10).split('-');
  if (!y || !m || !d) return String(iso);
  return `${d}/${m}/${y}`;
}

export function fmtMoney(value, country) {
  const n = Number(value || 0);
  if (country === 'GB') return `£${n.toLocaleString('en-GB', { maximumFractionDigits: 0 })}`;
  return `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

export function isoToday(offsetDays = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  const pad = (x) => String(x).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// Days from today to an ISO date (negative when it has passed).
export function daysFromToday(iso, today = isoToday()) {
  if (!iso) return null;
  const a = Date.UTC(...today.split('-').map((x, i) => Number(x) - (i === 1 ? 1 : 0)));
  const b = Date.UTC(...String(iso).slice(0, 10).split('-').map((x, i) => Number(x) - (i === 1 ? 1 : 0)));
  return Math.round((b - a) / 86400000);
}

export function countryForRegion(region) {
  return region === 'GB' ? 'GB' : 'IN';
}

// Whether the page is running inside the meldra phone app (Capacitor).
export function isNativeApp() {
  try {
    return Boolean(typeof window !== 'undefined' && window.Capacitor?.isNativePlatform?.());
  } catch {
    return false;
  }
}
