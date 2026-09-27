/**
 * Browser-only persistence for Unified Reporting (IndexedDB).
 * Uploaded rows never leave the device; every call degrades to a no-op when
 * storage is unavailable (private windows, blocked site data).
 */
const DB = 'meldra-unified-reporting';
const STORE = 'kv';

function open() {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') return reject(new Error('no indexedDB'));
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => {
      // Let a logout's deleteDatabase through even while the page is open.
      req.result.onversionchange = () => req.result.close();
      resolve(req.result);
    };
    req.onerror = () => reject(req.error);
  });
}

export async function load(key, fallback) {
  try {
    const db = await open();
    return await new Promise((resolve) => {
      const req = db.transaction(STORE).objectStore(STORE).get(key);
      req.onsuccess = () => resolve(req.result ?? fallback);
      req.onerror = () => resolve(fallback);
    }).finally(() => db.close());
  } catch {
    return fallback;
  }
}

export async function save(key, value) {
  try {
    const db = await open();
    await new Promise((resolve) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).put(value, key);
      tx.oncomplete = resolve;
      tx.onerror = resolve;
      tx.onabort = resolve;
    }).finally(() => db.close());
  } catch {
    /* storage unavailable: keep in memory only */
  }
}

/** Delete everything Unified Reporting kept in this browser (called on logout). */
export function clearAll() {
  return new Promise((resolve) => {
    try {
      if (typeof indexedDB === 'undefined') return resolve(false);
      const req = indexedDB.deleteDatabase(DB);
      req.onsuccess = () => resolve(true);
      req.onerror = () => resolve(false);
      req.onblocked = () => resolve(false);
    } catch {
      resolve(false);
    }
  });
}
