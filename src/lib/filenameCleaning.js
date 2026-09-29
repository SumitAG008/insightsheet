// Filename cleaning for the Filename Cleaner: pure functions, so they run in the browser (no upload)
// and are unit tested. Each folder and file name in a path is cleaned on its own, so the folder
// structure is kept, and names that become the same after cleaning get a numbered suffix.

const UNICODE_TO_ASCII = {
  'ä': 'a', 'ö': 'o', 'ü': 'u', 'ß': 'ss', 'Ä': 'A', 'Ö': 'O', 'Ü': 'U',
  'à': 'a', 'â': 'a', 'ç': 'c', 'è': 'e', 'é': 'e', 'ê': 'e', 'ë': 'e',
  'ì': 'i', 'î': 'i', 'ï': 'i', 'ò': 'o', 'ô': 'o', 'ù': 'u', 'û': 'u', 'ÿ': 'y',
  'À': 'A', 'Â': 'A', 'Ç': 'C', 'È': 'E', 'É': 'E', 'Ê': 'E', 'Ë': 'E',
  'Ì': 'I', 'Î': 'I', 'Ï': 'I', 'Ò': 'O', 'Ô': 'O', 'Ù': 'U', 'Û': 'U', 'Ÿ': 'Y',
  'á': 'a', 'í': 'i', 'ó': 'o', 'ú': 'u', 'ñ': 'n', 'Á': 'A', 'Í': 'I', 'Ó': 'O', 'Ú': 'U', 'Ñ': 'N',
  'ã': 'a', 'õ': 'o', 'Ã': 'A', 'Õ': 'O',
  'å': 'a', 'æ': 'ae', 'ø': 'o', 'Å': 'A', 'Æ': 'AE', 'Ø': 'O',
  'č': 'c', 'ď': 'd', 'ě': 'e', 'ň': 'n', 'ř': 'r', 'š': 's', 'ť': 't', 'ů': 'u', 'ž': 'z',
  'Č': 'C', 'Ď': 'D', 'Ě': 'E', 'Ň': 'N', 'Ř': 'R', 'Š': 'S', 'Ť': 'T', 'Ů': 'U', 'Ž': 'Z',
  'ą': 'a', 'ć': 'c', 'ę': 'e', 'ł': 'l', 'ń': 'n', 'ś': 's', 'ź': 'z', 'ż': 'z',
  'Ą': 'A', 'Ć': 'C', 'Ę': 'E', 'Ł': 'L', 'Ń': 'N', 'Ś': 'S', 'Ź': 'Z', 'Ż': 'Z',
  'ă': 'a', 'ș': 's', 'ț': 't', 'Ă': 'A', 'Ș': 'S', 'Ț': 'T',
  'ğ': 'g', 'ı': 'i', 'ş': 's', 'Ğ': 'G', 'İ': 'I', 'Ş': 'S',
  '¿': '', '¡': '', '°': '', '©': 'c', '®': 'r', '™': 'tm',
};

export const LANGUAGE_CHAR_MAPS = {
  german: { 'ä': 'a', 'ö': 'o', 'ü': 'u', 'ß': 'ss', 'Ä': 'A', 'Ö': 'O', 'Ü': 'U' },
  italian: { 'à': 'a', 'è': 'e', 'é': 'e', 'ì': 'i', 'ò': 'o', 'ù': 'u' },
  greek: { regex: /[Ͱ-Ͽἀ-῿]/g, replacement: '' },
  chinese: { regex: /[一-鿿]/g, replacement: '' },
  spanish: { 'á': 'a', 'é': 'e', 'í': 'i', 'ó': 'o', 'ú': 'u', 'ñ': 'n', 'ü': 'u', '¿': '', '¡': '' },
  russian: { regex: /[А-Яа-яЁё]/g, replacement: '' },
  arabic: { regex: /[؀-ۿݐ-ݿࢠ-ࣿ]/g, replacement: '' },
  japanese: { regex: /[぀-ゟ゠-ヿㇰ-ㇿ]/g, replacement: '' },
};

export const DEFAULT_OPTIONS = {
  allowedCharacters: 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789._-',
  disallowedCharacters: '',
  replacementCharacter: '-',
  maxLength: 255,
  preserveExtension: true,
  customRules: [],
};

const escapeRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\/-]/g, '\\$&');

export function toAscii(text) {
  let result = text;
  for (const [ch, rep] of Object.entries(UNICODE_TO_ASCII)) result = result.split(ch).join(rep);
  // Remove any remaining accents (é → e + combining mark → e).
  return result.normalize('NFD').replace(/[̀-ͯ]/g, '').normalize('NFC');
}

function splitExtension(name, preserve) {
  const dot = name.lastIndexOf('.');
  if (!preserve || dot <= 0 || dot === name.length - 1) return [name, ''];
  return [name.slice(0, dot), name.slice(dot)];
}

/** Clean one file or folder name (no slashes). */
export function cleanName(name, options = DEFAULT_OPTIONS, languages = {}) {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const rep = opts.replacementCharacter ?? '';
  const [rawBase, extension] = splitExtension(name, opts.preserveExtension);
  let base = toAscii(rawBase);

  for (const [lang, on] of Object.entries(languages)) {
    const map = on && LANGUAGE_CHAR_MAPS[lang];
    if (!map) continue;
    if (map.regex) base = base.replace(map.regex, map.replacement ?? rep);
    else for (const [ch, r] of Object.entries(map)) base = base.split(ch).join(r);
  }

  for (const rule of opts.customRules || []) {
    if (rule.find && rule.replace !== undefined) base = base.split(rule.find).join(rule.replace);
  }

  for (const ch of opts.disallowedCharacters || '') base = base.split(ch).join(rep);

  if (opts.allowedCharacters) {
    const allowed = new Set(opts.allowedCharacters);
    base = Array.from(base).map((ch) => (allowed.has(ch) ? ch : rep)).join('');
  }

  if (rep) {
    const r = escapeRegExp(rep);
    base = base.replace(new RegExp(`(?:${r}){2,}`, 'g'), rep).replace(new RegExp(`^(?:${r})+|(?:${r})+$`, 'g'), '');
  }

  if (opts.maxLength && base.length + extension.length > opts.maxLength) {
    base = base.slice(0, Math.max(1, opts.maxLength - extension.length));
  }
  if (!base) base = 'file';
  return base + extension;
}

/** Clean every segment of a path such as "Reports/Q1 Übersicht/März.xlsx". */
export function cleanPath(path, options = DEFAULT_OPTIONS, languages = {}) {
  const isDir = path.endsWith('/');
  const segments = path.split('/').filter(Boolean);
  const cleaned = segments.map((seg, i) => {
    const last = i === segments.length - 1;
    // Folder names have no extension to keep.
    const segOpts = last && !isDir ? options : { ...options, preserveExtension: false };
    return cleanName(seg, segOpts, languages);
  });
  return cleaned.join('/') + (isDir ? '/' : '');
}

/**
 * New names for all paths in an archive. Names that clash after cleaning (for example
 * "Résumé.pdf" and "Resume.pdf") get "-2", "-3", … so no file overwrites another.
 */
export function planRenames(paths, options = DEFAULT_OPTIONS, languages = {}) {
  const used = new Set();
  const sep = options.replacementCharacter || '-';
  return paths.map((original) => {
    let processed = cleanPath(original, options, languages);
    const key = (p) => p.toLowerCase();
    if (used.has(key(processed))) {
      const isDir = processed.endsWith('/');
      const trimmed = isDir ? processed.slice(0, -1) : processed;
      const slash = trimmed.lastIndexOf('/');
      const folder = trimmed.slice(0, slash + 1);
      const [base, ext] = splitExtension(trimmed.slice(slash + 1), !isDir && options.preserveExtension !== false);
      let n = 2;
      do {
        processed = `${folder}${base}${sep}${n}${ext}${isDir ? '/' : ''}`;
        n += 1;
      } while (used.has(key(processed)));
    }
    used.add(key(processed));
    return { original, processed, changed: original !== processed };
  });
}

/** Skip OS clutter that should not be renamed or shipped: macOS resource forks and Finder files. */
export function isSystemEntry(path) {
  return path.startsWith('__MACOSX/') || /(^|\/)\.DS_Store$/.test(path);
}
