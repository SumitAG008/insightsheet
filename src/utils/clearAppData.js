/**
 * clearAppData.js — Clear all application session and local data
 *
 * Aligns with "nothing is stored" / zero client-side persistence after logout.
 * Call on: logout, 401 Unauthorized, or when redirecting to login after auth failure.
 *
 * When adding new localStorage keys that hold user/session data, add them to
 * APP_LOCAL_STORAGE_KEYS so they are cleared here.
 */

const APP_LOCAL_STORAGE_KEYS = [
  'auth_token',
  'user',
  'agent_history', // AgenticAI conversation history
];

/**
 * Clears all sessionStorage and known app keys in localStorage.
 * Does not clear in-memory token; the API client's setToken(null) does that.
 */
export function clearAllAppSessionData() {
  sessionStorage.clear();
  APP_LOCAL_STORAGE_KEYS.forEach((k) => localStorage.removeItem(k));
}
