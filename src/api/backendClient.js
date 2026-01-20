/**
 * Backend API Client for InsightSheet-lite
 * Connects to Python FastAPI backend
 */

import { clearAllAppSessionData } from '@/utils/clearAppData';

// SECURITY: Require HTTPS API URL - no localhost fallback in production
const API_URL = import.meta.env.VITE_API_URL || (() => {
  // Only allow localhost in development (when running on localhost)
  if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
    return 'http://localhost:8001';
  }
  // Production must use HTTPS
  throw new Error('VITE_API_URL environment variable must be set to HTTPS URL in production');
})();

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
    throw e;
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

    logout: () => {
      clearAllAppSessionData();
      setToken(null);
    },

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
      const response = await apiCall(`/api/db/schema?connection_id=${connectionId}&db_type=${dbType}`);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to get schema');
      }
      return response.json();
    },

    query: async (connectionId, dbType, query) => {
      const response = await apiCall('/api/db/query', {
        method: 'POST',
        body: { connection_id: connectionId, db_type: dbType, query },
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
