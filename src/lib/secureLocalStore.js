export async function deriveKeyFromPassphrase(passphrase, saltBase64, iterations = 250000) {
  const enc = new TextEncoder();
  const salt = saltBase64 ? base64ToBytes(saltBase64) : crypto.getRandomValues(new Uint8Array(16));
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(passphrase || ''),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  const key = await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );

  return {
    key,
    saltBase64: bytesToBase64(salt),
    iterations,
  };
}

export async function encryptJsonToLocalStorage(storageKey, jsonValue, passphrase) {
  if (!passphrase) throw new Error('Passphrase is required');

  const iv = crypto.getRandomValues(new Uint8Array(12));
  const { key, saltBase64, iterations } = await deriveKeyFromPassphrase(passphrase);

  const enc = new TextEncoder();
  const plaintext = enc.encode(JSON.stringify(jsonValue ?? null));
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, plaintext);

  const payload = {
    v: 1,
    alg: 'AES-GCM',
    kdf: 'PBKDF2-SHA256',
    iterations,
    salt: saltBase64,
    iv: bytesToBase64(iv),
    data: bytesToBase64(new Uint8Array(ciphertext)),
    savedAt: new Date().toISOString(),
  };

  localStorage.setItem(storageKey, JSON.stringify(payload));
  return { saved: true };
}

export async function decryptJsonFromLocalStorage(storageKey, passphrase) {
  const raw = localStorage.getItem(storageKey);
  if (!raw) return null;
  if (!passphrase) throw new Error('Passphrase is required');

  let payload;
  try {
    payload = JSON.parse(raw);
  } catch {
    throw new Error('Encrypted payload is corrupted');
  }

  const saltBase64 = payload?.salt;
  const ivBase64 = payload?.iv;
  const dataBase64 = payload?.data;
  const iterations = payload?.iterations || 250000;

  if (!saltBase64 || !ivBase64 || !dataBase64) {
    throw new Error('Encrypted payload missing fields');
  }

  const { key } = await deriveKeyFromPassphrase(passphrase, saltBase64, iterations);
  const iv = base64ToBytes(ivBase64);
  const ciphertext = base64ToBytes(dataBase64);

  let plaintext;
  try {
    plaintext = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext);
  } catch {
    throw new Error('Failed to decrypt. Passphrase may be incorrect.');
  }

  const dec = new TextDecoder();
  return JSON.parse(dec.decode(plaintext));
}

export function clearEncryptedLocalStorage(storageKey) {
  localStorage.removeItem(storageKey);
}

function bytesToBase64(bytes) {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

function base64ToBytes(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}
