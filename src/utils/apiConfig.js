/**
 * Secure API Configuration
 * 
 * SECURITY: No localhost fallbacks in production
 * All API calls must use HTTPS in production
 */

/**
 * Get the API URL securely
 * - In production: Requires VITE_API_URL to be set (must be HTTPS)
 * - In development: Allows localhost only when running on localhost
 * 
 * @returns {string} API URL
 * @throws {Error} If API URL is not configured in production
 */
export function getApiUrl() {
  // If VITE_API_URL is explicitly set, use it
  if (import.meta.env.VITE_API_URL) {
    const url = import.meta.env.VITE_API_URL;
    // SECURITY: In production, enforce HTTPS
    if (typeof window !== 'undefined' && window.location.protocol === 'https:') {
      if (!url.startsWith('https://')) {
        console.error('SECURITY ERROR: API URL must use HTTPS in production');
        throw new Error('VITE_API_URL must use HTTPS in production');
      }
    }
    return url;
  }

  // Development fallback: Only allow localhost when actually running on localhost
  if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
    return 'http://localhost:8001';
  }

  // Production: Must have VITE_API_URL set
  throw new Error(
    'VITE_API_URL environment variable must be set to HTTPS URL in production. ' +
    'Please configure it in your deployment platform (Vercel/Railway).'
  );
}

/**
 * Get API URL with fallback (for backward compatibility)
 * Use getApiUrl() for new code
 */
export const API_URL = getApiUrl();
