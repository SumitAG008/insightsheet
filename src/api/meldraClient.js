import { createClient } from '@base44/sdk';

// Create a client with authentication required
export const meldraAi = createClient({
  appId: "68dec14952c191b56537bc60",
  requiresAuth: true // Ensure authentication is required for all operations
});
