import { describe, expect, it, vi } from 'vitest';

describe('backend API client', () => {
  it('has the file tools the pages call under backendApi.files', async () => {
    vi.stubEnv('VITE_API_URL', 'https://api.example.test');
    const { backendApi } = await import('./meldraClient');
    // Workbench and Reconciliation call these; they once sat under `auth` by mistake and failed.
    for (const name of ['analyzeFile', 'standardizePreview', 'standardize', 'reconcilePreview', 'reconcile']) {
      expect(typeof backendApi.files[name]).toBe('function');
    }
    expect(backendApi.auth.standardize).toBeUndefined();
  });
});
