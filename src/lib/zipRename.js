// Rename the files inside a ZIP in the browser. JSZip reads the central directory, so archives
// written by macOS, Windows, Office and streaming tools (sizes in a trailing data descriptor)
// all work, and folder structure, dates and contents are kept.
import JSZip from 'jszip';
import { isSystemEntry } from '@/lib/filenameCleaning';

const utf8 = new TextDecoder('utf-8', { fatal: true });
const legacy = new TextDecoder('windows-1252');

// Names without the UTF-8 flag are usually UTF-8 anyway; older Windows tools use a legacy code page.
function decodeFileName(bytes) {
  const arr = bytes instanceof Uint8Array ? bytes : Uint8Array.from(bytes);
  try {
    return utf8.decode(arr);
  } catch {
    return legacy.decode(arr);
  }
}

/** Load an archive; returns the zip and the entry paths worth renaming (system files skipped). */
export async function readArchive(data) {
  const zip = await JSZip.loadAsync(data, { decodeFileName });
  const paths = [];
  zip.forEach((path) => {
    if (!isSystemEntry(path)) paths.push(path);
  });
  return { zip, paths };
}

/** Build a new archive with each entry renamed per plan ([{original, processed}]). */
export async function writeRenamedArchive(zip, plan, type = 'blob') {
  const out = new JSZip();
  for (const { original, processed } of plan) {
    const entry = zip.file(original) || zip.files[original];
    if (!entry) continue;
    if (entry.dir) {
      out.folder(processed.replace(/\/$/, ''));
      continue;
    }
    out.file(processed, await entry.async('uint8array'), {
      binary: true,
      date: entry.date,
      unixPermissions: entry.unixPermissions,
      dosPermissions: entry.dosPermissions,
    });
  }
  return out.generateAsync({
    type,
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
    mimeType: 'application/zip',
    platform: 'DOS',
  });
}
