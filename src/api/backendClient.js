/**
 * Backend API Client for InsightSheet-lite
 * Connects to Python FastAPI backend
 */

import { clearAllAppSessionData } from '@/utils/clearAppData';
import { getDeviceId } from '@/lib/deviceId';

// SECURITY: Require HTTPS API URL - no localhost fallback in production
const API_URL = import.meta.env.VITE_API_URL || (() => {
  // Only allow localhost in development (when running on localhost)
  if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
    return 'http://localhost:8001';
  }
  // Production must use HTTPS
  throw new Error('VITE_API_URL environment variable must be set to HTTPS URL in production');
})();

const getApiBaseUrl = () => API_URL;

// Token management
let authToken = null;

const getToken = () => {
  if (!authToken) {
    authToken = localStorage.getItem('auth_token');
  }
  return authToken;
};

const setToken = (token) => {
  authToken = token;
  if (token) {
    localStorage.setItem('auth_token', token);
  } else {
    localStorage.removeItem('auth_token');
  }
};

// Helper function for API calls. options.timeoutMs aborts the request to avoid hanging on "Signing in..."
const apiCall = async (endpoint, options = {}) => {
  const { timeoutMs, ...rest } = options;
  const token = getToken();

  const headers = { ...rest.headers };

  if (token && !headers['Authorization']) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  if (rest.body && typeof rest.body === 'object' && !(rest.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
    rest.body = JSON.stringify(rest.body);
  }

  let timeoutId;
  if (timeoutMs) {
    const controller = new AbortController();
    timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    rest.signal = controller.signal;
  }

  let response;
  try {
    response = await fetch(`${API_URL}${endpoint}`, { ...rest, headers });
  } catch (e) {
    if (e.name === 'AbortError') {
      throw new Error('Request timed out. Please check your connection and try again.');
    }
    throw new Error(`Failed to fetch (${endpoint}). Please verify backend URL/CORS. API=${API_URL}`);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }

  if (response.status === 401) {
    clearAllAppSessionData();
    setToken(null);
    window.location.href = '/login';
    throw new Error('Unauthorized');
  }

  return response;
};

/** Parse a JSON response or throw an Error carrying the server's explanation. */
const jsonOrThrow = async (response, fallback) => {
  if (response.ok) return response.json();
  const error = await response.json().catch(() => ({}));
  const detail = Array.isArray(error.detail) ? error.detail.map((d) => d.msg).join('; ') : error.detail;
  throw new Error(detail || `${fallback} (${response.status}).`);
};

// API Client
export const backendApi = {
  // Authentication
  auth: {
    register: async (email, password, fullName) => {
      const response = await apiCall('/api/auth/register', {
        method: 'POST',
        body: { email, password, full_name: fullName },
      });
      
      // Check if response is ok
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `Registration failed: ${response.status}`);
      }
      
      return response.json();
    },

    login: async (email, password) => {
      const response = await apiCall('/api/auth/login', {
        method: 'POST',
        body: { email, password },
        timeoutMs: 25000,
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || `Login failed: ${response.status}`);
      }

      if (data.access_token) {
        setToken(data.access_token);
      }

      return data;
    },

    verifyLoginOtp: async (challengeId, otp, signOutSessionIds) => {
      const response = await apiCall('/api/auth/mfa/verify', {
        method: 'POST',
        body: {
          challenge_id: challengeId,
          otp,
          device_id: getDeviceId(),
          ...(signOutSessionIds && signOutSessionIds.length ? { sign_out_session_ids: signOutSessionIds } : {}),
        },
        timeoutMs: 25000,
      });
      const data = await response.json();

      if (!response.ok) {
        // Signed in on the maximum number of devices: the caller shows them so one can be signed out.
        if (response.status === 409 && data.detail && data.detail.code === 'device_limit') {
          const err = new Error(data.detail.message);
          err.code = 'device_limit';
          err.devices = data.detail.devices || [];
          err.limit = data.detail.limit;
          throw err;
        }
        throw new Error(data.detail || `OTP verify failed: ${response.status}`);
      }

      if (data.access_token) {
        setToken(data.access_token);
      }

      return data;
    },

    logout: () => {
      // End this device's session on the server too (best effort), so it frees a device slot.
      const token = getToken();
      if (token) {
        fetch(`${API_URL}/api/auth/logout`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } }).catch(() => {});
      }
      clearAllAppSessionData();
      setToken(null);
    },

    devices: async () => jsonOrThrow(await apiCall('/api/auth/devices'), 'Could not load your devices'),

    signOutDevice: async (sessionId) =>
      jsonOrThrow(
        await apiCall(`/api/auth/devices/${encodeURIComponent(sessionId)}`, { method: 'DELETE' }),
        'Could not sign that device out',
      ),

    me: async () => {
      const response = await apiCall('/api/auth/me');
      return response.json();
    },

    isAuthenticated: () => {
      return !!getToken();
    },

    forgotPassword: async (email) => {
      const response = await apiCall('/api/auth/forgot-password', {
        method: 'POST',
        body: { email },
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `Failed to send reset email: ${response.status}`);
      }
      
      return response.json();
    },

    resetPassword: async (token, newPassword) => {
      const response = await apiCall('/api/auth/reset-password', {
        method: 'POST',
        body: { token, new_password: newPassword },
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `Password reset failed: ${response.status}`);
      }
      
      return response.json();
    },
  },

  // AI/LLM Integration
  llm: {
    invoke: async (prompt, options = {}) => {
      const response = await apiCall('/api/integrations/llm/invoke', {
        method: 'POST',
        body: {
          prompt,
          add_context_from_internet: options.addContext || false,
          response_json_schema: options.responseSchema || null,
        },
      });
      return response.json();
    },

    transform: async (instruction, columns, sampleRows) => {
      const response = await apiCall('/api/ai/transform', {
        method: 'POST',
        body: {
          instruction,
          columns: Array.isArray(columns) ? columns : [],
          sample_rows: Array.isArray(sampleRows) ? sampleRows : null,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `Transform failed: ${response.status}`);
      }

      return response.json();
    },

    generateImage: async (prompt, size = '1024x1024') => {
      const response = await apiCall('/api/integrations/image/generate', {
        method: 'POST',
        body: { prompt, size },
      });
      return response.json();
    },

    generateFormula: async (description, context) => {
      const response = await apiCall('/api/ai/formula', {
        method: 'POST',
        body: { description, context },
      });
      return response.json();
    },

    analyzeData: async (dataSummary, question) => {
      const response = await apiCall('/api/ai/analyze', {
        method: 'POST',
        body: { data_summary: dataSummary, question },
      });
      return response.json();
    },

    suggestChart: async (columns, dataPreview) => {
      const response = await apiCall('/api/ai/suggest-chart', {
        method: 'POST',
        body: { columns, data_preview: dataPreview },
      });
      return response.json();
    },
  },

  // File Processing
  files: {
    excelToPpt: async (file) => {
      const formData = new FormData();
      formData.append('file', file);

      const response = await apiCall('/api/files/excel-to-ppt', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Conversion failed');
      }

      return response.blob();
    },

    processZip: async (file, options) => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('options', JSON.stringify(options));

      const response = await apiCall('/api/files/process-zip', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Processing failed');
      }

      return response.blob();
    },
  },

  // Subscriptions
  subscriptions: {
    getMy: async () => {
      const response = await apiCall('/api/subscriptions/me');
      return response.json();
    },

    upgrade: async () => {
      const response = await apiCall('/api/subscriptions/upgrade', {
        method: 'POST',
      });
      return response.json();
    },
  },

  // Tool search and suggestions that learn from usage
  assist: {
    search: async (q) => jsonOrThrow(await apiCall(`/api/assist/search?q=${encodeURIComponent(q)}`), 'Search failed'),
    suggestions: async () => jsonOrThrow(await apiCall('/api/assist/suggestions'), 'Could not load suggestions'),
    choose: async (q, toolId) =>
      jsonOrThrow(await apiCall('/api/assist/search/choose', { method: 'POST', body: { q, tool_id: toolId } }), 'Could not save choice'),
  },

  // Activity
  activity: {
    log: async (activityType, pageName, details) => {
      try {
        const response = await apiCall('/api/activity/log', {
          method: 'POST',
          body: {
            activity_type: activityType,
            page_name: pageName,
            details: details || null,
          },
        });
        
        // Silently fail if activity logging fails - it's not critical
        if (!response.ok) {
          console.warn('Activity logging failed:', response.status);
          return null;
        }
        
        return await response.json();
      } catch (error) {
        // Silently fail - activity logging should never break the app
        console.warn('Activity logging skipped:', error.message);
        return null;
      }
    },

    getHistory: async (limit = 50) => {
      const response = await apiCall(`/api/activity/history?limit=${limit}`);
      return response.json();
    },
  },

  // Database Connections
  db: {
    testConnection: async (dbType, connectionData) => {
      const response = await apiCall('/api/db/test-connection', {
        method: 'POST',
        body: { db_type: dbType, connection_data: connectionData },
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Connection test failed');
      }
      return response.json();
    },

    getSchema: async (connectionId, dbType) => {
      const response = await apiCall(`/api/db/schema?connection_id=${encodeURIComponent(connectionId)}&db_type=${encodeURIComponent(dbType)}`);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to get schema');
      }
      return response.json();
    },

    query: async (connectionId, dbType, query, maxRows) => {
      const response = await apiCall('/api/db/query', {
        method: 'POST',
        body: { connection_id: connectionId, db_type: dbType, query, ...(maxRows ? { max_rows: maxRows } : {}) },
        timeoutMs: maxRows ? 180000 : undefined,
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Query execution failed');
      }
      return response.json();
    },

    disconnect: async (connectionId, dbType) => {
      const response = await apiCall('/api/db/disconnect', {
        method: 'POST',
        body: { connection_id: connectionId, db_type: dbType },
      });
      // Don't throw on disconnect - it's cleanup
      return response.ok ? response.json() : null;
    },
  },

  // Next-Gen Migration (column headers only, never employee values)
  migration: {
    suggestMapping: async ({ sourceSystem, sheets, concepts }) => {
      const response = await apiCall('/api/migration/suggest-mapping', {
        method: 'POST',
        body: { source_system: sourceSystem, sheets, concepts },
        timeoutMs: 60000,
      });
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.detail || 'Mapping assistant failed');
      }
      return response.json();
    },
  },

  // Meldra lakehouse: sources stored as Apache Iceberg tables (Polaris catalog), aggregated server-side.
  lakehouse: {
    status: async () => {
      const response = await apiCall('/api/lakehouse/status', { timeoutMs: 15000 });
      if (!response.ok) return { enabled: false };
      return response.json();
    },

    sources: async () => jsonOrThrow(await apiCall('/api/lakehouse/sources', { timeoutMs: 60000 }), 'Could not list your stored sources'),

    /** Upload with progress: onProgress({ phase: 'upload' | 'processing', pct }) while the file travels, then while it is stored. */
    upload: (file, system, onProgress) => new Promise((resolve, reject) => {
      const form = new FormData();
      form.append('file', file);
      if (system) form.append('system', system);
      const xhr = new XMLHttpRequest();
      xhr.open('POST', `${API_URL}/api/lakehouse/upload`);
      const token = getToken();
      if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      xhr.timeout = 30 * 60000;
      xhr.upload.onprogress = (e) => { if (e.lengthComputable) onProgress?.({ phase: 'upload', pct: Math.round((e.loaded / e.total) * 100) }); };
      xhr.upload.onload = () => onProgress?.({ phase: 'processing', pct: 100 });
      xhr.onload = () => {
        let body = {};
        try { body = JSON.parse(xhr.responseText || '{}'); } catch { /* not JSON */ }
        if (xhr.status === 401) {
          clearAllAppSessionData();
          setToken(null);
          window.location.href = '/login';
          reject(new Error('Unauthorized'));
        } else if (xhr.status >= 200 && xhr.status < 300) resolve(body);
        else reject(new Error((typeof body.detail === 'string' && body.detail) || `Could not store ${file.name} (${xhr.status}).`));
      };
      xhr.onerror = () => reject(new Error(`Could not upload ${file.name}. Check your connection.`));
      xhr.ontimeout = () => reject(new Error(`Uploading ${file.name} took too long.`));
      xhr.send(form);
    }),

    storeRows: async ({ name, system, kind, columns, rows, origin, replaceTable }) => jsonOrThrow(await apiCall('/api/lakehouse/rows', {
      method: 'POST',
      body: { name, system, kind, columns, rows, origin: origin || null, replace_table: replaceTable || null },
      timeoutMs: 10 * 60000,
    }), `Could not store ${name}`),

    update: async (table, patch) => jsonOrThrow(await apiCall(`/api/lakehouse/sources/${encodeURIComponent(table)}`, { method: 'PATCH', body: patch }), 'Could not save the change'),

    remove: async (table) => jsonOrThrow(await apiCall(`/api/lakehouse/sources/${encodeURIComponent(table)}`, { method: 'DELETE' }), 'Could not delete the source'),

    removeAll: async () => jsonOrThrow(await apiCall('/api/lakehouse/sources', { method: 'DELETE', timeoutMs: 5 * 60000 }), 'Could not delete your stored data'),

    preview: async (table) => jsonOrThrow(await apiCall(`/api/lakehouse/sources/${encodeURIComponent(table)}/preview`), 'Could not load rows'),

    aggregate: async (series) => jsonOrThrow(await apiCall('/api/lakehouse/aggregate', { method: 'POST', body: { series }, timeoutMs: 5 * 60000 }), 'Could not calculate the answer'),
    sql: async (body) => jsonOrThrow(await apiCall('/api/lakehouse/sql', { method: 'POST', body, timeoutMs: 2 * 60000 }), 'Could not run the query'),

    suggestLinks: async (tables) => jsonOrThrow(await apiCall('/api/lakehouse/suggest-links', { method: 'POST', body: { tables }, timeoutMs: 5 * 60000 }), 'Could not suggest links'),
  },

  // Unified Reporting (planner sees catalog metadata only, never rows)
  unifiedReporting: {
    buildReport: async ({ request, catalog, tiles }) => jsonOrThrow(await apiCall('/api/unified-reporting/build-report', {
      method: 'POST',
      body: { request, catalog, tiles: tiles || 6 },
      timeoutMs: 90000,
    }), 'Report builder failed'),

    plan: async ({ question, previousQuestion, catalog }) => {
      const response = await apiCall('/api/unified-reporting/plan', {
        method: 'POST',
        body: { question, previous_question: previousQuestion || null, catalog },
        timeoutMs: 45000,
      });
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.detail || 'Report planner failed');
      }
      return response.json();
    },

    // API connector: the backend fetches on the user's behalf (HTTPS, public hosts only); nothing is stored.
    connectorPresets: async () => {
      const response = await apiCall('/api/unified-reporting/connector/presets', { timeoutMs: 20000 });
      if (!response.ok) throw new Error('Could not load connector presets');
      return response.json();
    },

    connectorFetch: async (config) => {
      const response = await apiCall('/api/unified-reporting/connector/fetch', {
        method: 'POST',
        body: config,
        timeoutMs: 180000,
      });
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        const detail = Array.isArray(error.detail) ? error.detail.map((d) => d.msg).join('; ') : error.detail;
        throw new Error(detail || `The API could not be read (${response.status}).`);
      }
      return response.json();
    },

    insight: async ({ question, columns, rows, notes, currency }) => {
      const response = await apiCall('/api/unified-reporting/insight', {
        method: 'POST',
        body: { question, columns, rows, notes: notes || null, currency: currency || null },
        timeoutMs: 45000,
      });
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.detail || 'Answer writer failed');
      }
      return response.json();
    },
  },

  // Admin (requires admin role)
  admin: {
    getUsers: async () => {
      const response = await apiCall('/api/admin/users');
      return response.json();
    },

    getSubscriptions: async () => {
      const response = await apiCall('/api/admin/subscriptions');
      return response.json();
    },
  },

  // Health check
  health: async () => {
    const response = await fetch(`${API_URL}/health`);
    return response.json();
  },
};

// Export token management
export const auth = {
  getToken,
  setToken,
};

// Meldra AI client - main export
export const meldraAi = {
  auth: backendApi.auth,
  integrations: {
    Core: {
      InvokeLLM: async (prompt) => {
        const result = await backendApi.llm.invoke(prompt);
        return result.response;
      },
      GenerateImage: async (prompt) => {
        const result = await backendApi.llm.generateImage(prompt);
        return result.image_url;
      },
    },
  },
  entities: {
    Subscription: {
      filter: async (params) => {
        // Return array for compatibility
        const subscription = await backendApi.subscriptions.getMy();
        if (params.user_email && subscription.user_email === params.user_email) {
          return [subscription];
        }
        return [];
      },
    },
  },
};

export default backendApi;
