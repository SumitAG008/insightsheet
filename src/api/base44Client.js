import { createClient } from '@base44/sdk';
// import { getAccessToken } from '@base44/sdk/utils/auth-utils';

// Create a client - auth optional for testing
// TODO: Replace with Meldra's own auth system
export const base44 = createClient({
  appId: "68dec14952c191b56537bc60",
  requiresAuth: false // Disabled for UI testing - enable when auth is set up
});
