/**
 * API base URL for the backend. Used by Document Converter, IP lookup, etc.
 */
export function getApiBase() {
  if (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  if (typeof window !== 'undefined' && window.location?.hostname === 'localhost') {
    return 'http://localhost:8001';
  }
  return '';
}
