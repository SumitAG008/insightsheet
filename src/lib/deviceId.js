// A random id for this browser, sent at sign-in so the server can tell this device apart from
// the account's other devices (a subscription can be signed in on a limited number at once).
const KEY = 'meldra.deviceId';

export function getDeviceId() {
  try {
    let id = localStorage.getItem(KEY);
    if (!id) {
      id = (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`).slice(0, 64);
      localStorage.setItem(KEY, id);
    }
    return id;
  } catch {
    return null; // storage unavailable: the server treats each sign-in as a new device
  }
}
