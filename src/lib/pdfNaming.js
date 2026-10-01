// File names for downloads: the name the customer uploaded plus a timestamp, or a name they type.

const pad = (n, w = 2) => String(n).padStart(w, '0');

/** YYYYMMDD_HHMMSS in local time. */
export const timestamp = (d = new Date()) =>
  `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;

/** The uploaded file's name without its extension. */
export const baseName = (name) => (name || 'document').replace(/\.[^/.]+$/, '') || 'document';

/** A name the person typed, made safe for every operating system; always ends in .pdf. */
export const safePdfName = (name, fallback) => {
  const cleaned = Array.from(String(name || '').replace(/\.pdf$/i, ''))
    .map((ch) => (ch.charCodeAt(0) < 32 || '\\/:*?"<>|'.includes(ch) ? '_' : ch))
    .join('')
    .trim()
    .slice(0, 150);
  return `${cleaned || fallback}.pdf`;
};
