/**
 * Meldra AI Client
 *
 * Custom implementation using FastAPI backend for Meldra platform.
 * This provides a compatible interface while using our own backend.
 */

import { clearAllAppSessionData } from '@/utils/clearAppData';

// Meldra AI client - placeholder for SDK features
// TODO: Implement full SDK when @meldra-ai/sdk is published
export const meldraAi = {
  appId: "68dec14952c191b56537bc60",
  requiresAuth: true,
  // Placeholder for SDK features - currently using backendApi
  integrations: {
    Core: {
      InvokeLLM: null,
      SendEmail: null,
      UploadFile: null,
      GenerateImage: null,
      ExtractDataFromUploadedFile: null,
      CreateFileSignedUrl: null,
      UploadPrivateFile: null,
    }
  },
  entities: {
    Subscription: null,
    LoginHistory: null,
    UserActivity: null,
  },
  auth: null
};

/**
 * Backend API Client for InsightSheet-lite
 * Connects to Python FastAPI backend
 */
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

// Helper function for API calls
const apiCall = async (endpoint, options = {}) => {
  const token = getToken();

  const headers = {
    ...options.headers,
  };

  // Add auth token if available
  if (token && !headers['Authorization']) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // Add Content-Type for JSON requests
  if (options.body && typeof options.body === 'object' && !(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
    options.body = JSON.stringify(options.body);
  }

  try {
    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers,
    });

    // Handle unauthorized — clear all app data and redirect to login
    if (response.status === 401) {
      clearAllAppSessionData();
      setToken(null);
      window.location.href = '/Login';
      throw new Error('Unauthorized');
    }

    return response;
  } catch (error) {
    // Network error - backend not reachable
    if (error.name === 'TypeError' && (error.message.includes('fetch') || error.message.includes('Failed to fetch'))) {
      const errorMsg = `Cannot connect to backend server at ${API_URL}. Please ensure the backend is running.`;
      console.error('Backend connection failed:', {
        url: `${API_URL}${endpoint}`,
        error: error.message,
        apiUrl: API_URL
      });
      throw new Error(errorMsg);
    }
    throw error;
  }
};

// Backend API Client
export const backendApi = {
  // Authentication
  auth: {
    register: async (userData) => {
      const response = await apiCall('/api/auth/register', {
        method: 'POST',
        body: userData,
      });
      
      // Check if response is ok
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `Registration failed: ${response.status}`);
      }
      
      return response.json();
    },

    login: async (email, password) => {
      try {
        const response = await apiCall('/api/auth/login', {
          method: 'POST',
          body: { email, password },
        });
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.detail || `Login failed: ${response.status}`);
        }
        
        const data = await response.json();

        if (data.access_token) {
          setToken(data.access_token);
          // Store user info
          if (data.user) {
            localStorage.setItem('user', JSON.stringify(data.user));
          }
        }

        return data;
      } catch (error) {
        console.error('Login error:', error);
        throw error;
      }
    },

    logout: () => {
      clearAllAppSessionData();
      setToken(null);
    },

    me: async () => {
      const token = getToken();
      if (!token) {
        throw new Error('Not authenticated');
      }
      
      try {
        const response = await apiCall('/api/auth/me');
        
        if (!response.ok) {
          if (response.status === 401) {
            setToken(null);
            throw new Error('Not authenticated');
          }
          throw new Error('Failed to get user info');
        }
        
        const data = await response.json();
        
        // Validate user data
        if (!data || !data.email) {
          setToken(null);
          throw new Error('Invalid user data');
        }
        
        return data;
      } catch (error) {
        // Clear token on any error
        setToken(null);
        throw error;
      }
    },

    redirectToLogin: () => {
      window.location.href = '/Login';
    },

    isAuthenticated: () => {
      return !!getToken();
    },

    forgotPassword: async (email) => {
      const response = await apiCall('/api/auth/forgot-password', {
        method: 'POST',
        body: { email },
      });
      return response.json();
    },

    resetPassword: async (token, newPassword) => {
      const response = await apiCall('/api/auth/reset-password', {
        method: 'POST',
        body: { token, new_password: newPassword },
      });
      return response.json();
    },

    verify2FA: async (email, code) => {
      const response = await apiCall('/api/auth/verify-2fa', {
        method: 'POST',
        body: { email, code },
      });
      const data = await response.json();
      if (data.access_token) {
        setToken(data.access_token);
      }
      return data;
    },

    setup2FA: async () => {
      const response = await apiCall('/api/auth/setup-2fa', {
        method: 'POST',
      });
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
          model: options.model || 'gpt-4o-mini',
          temperature: options.temperature || 0.7,
          max_tokens: options.max_tokens || 1000,
          add_context_from_internet: options.addContext || false,
          response_json_schema: options.responseSchema || null,
        },
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `LLM invocation failed: ${response.status}`);
      }
      
      const data = await response.json();
      // Backend returns {"response": {...}}, so extract the response
      return data.response || data;
    },

    generateImage: async (options = {}) => {
      const response = await apiCall('/api/integrations/image/generate', {
        method: 'POST',
        body: {
          prompt: options.prompt,
          size: options.size || '1024x1024',
          n: options.n || 1
        },
      });
      const data = await response.json();
      return data.image_url || data;
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

    transform: async (instruction, columns, sampleRows) => {
      const response = await apiCall('/api/ai/transform', {
        method: 'POST',
        body: { instruction, columns, sample_rows: sampleRows || null },
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.detail || 'Transform failed');
      }
      return response.json();
    },

    explainSql: async (sql, schema) => {
      const response = await apiCall('/api/ai/explain-sql', {
        method: 'POST',
        body: { sql, schema: schema || null },
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.detail || 'Explain SQL failed');
      }
      return response.json();
    },
  },

  // File Processing
  files: {
    upload: async (file, folder = 'uploads') => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', folder);

      const response = await apiCall('/api/files/upload', {
        method: 'POST',
        body: formData,
      });

      return response.json();
    },

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

    extractData: async (fileUrl, format) => {
      const response = await apiCall('/api/files/extract', {
        method: 'POST',
        body: { file_url: fileUrl, format },
      });
      return response.json();
    },

    createSignedUrl: async (fileKey, expiresIn = 3600) => {
      const response = await apiCall('/api/files/signed-url', {
        method: 'POST',
        body: { file_key: fileKey, expires_in: expiresIn },
      });
      const data = await response.json();
      return data.url;
    },

    analyzeFile: async (file) => {
      const formData = new FormData();
      formData.append('file', file);

      const response = await apiCall('/api/files/analyze', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Analysis failed');
      }

      return response.json();
    },

    ocrExtract: async (file) => {
      const formData = new FormData();
      formData.append('file', file);
      const response = await apiCall('/api/files/ocr-extract', {
        method: 'POST',
        body: formData,
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.detail || 'OCR extraction failed');
      }
      return response.json();
    },

    ocrExport: async ({ text, format, title, layout, image_width, image_height, tables, mode }) => {
      const body = { text: text || '', format, title: title || 'OCR Document' };
      if (mode === 'layout' && layout != null && image_width != null && image_height != null) {
        body.layout = layout;
        body.image_width = image_width;
        body.image_height = image_height;
        if (tables != null) body.tables = tables;
        body.mode = 'layout';
      }
      const response = await apiCall('/api/files/ocr-export', {
        method: 'POST',
        body,
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.detail || 'OCR export failed');
      }
      return response.blob();
    },

    generatePL: async (prompt, context = {}) => {
      const response = await apiCall('/api/files/generate-pl', {
        method: 'POST',
        body: {
          prompt,
          context,
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'P&L generation failed');
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

    create: async (data) => {
      const response = await apiCall('/api/subscriptions', {
        method: 'POST',
        body: data,
      });
      return response.json();
    },

    update: async (subscriptionId, data) => {
      const response = await apiCall(`/api/subscriptions/${subscriptionId}`, {
        method: 'PUT',
        body: data,
      });
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

  // Login History
  loginHistory: {
    create: async (data) => {
      const response = await apiCall('/api/login-history', {
        method: 'POST',
        body: data,
      });
      return response.json();
    },

    filter: async (params) => {
      const queryString = new URLSearchParams(params).toString();
      const response = await apiCall(`/api/login-history?${queryString}`);
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

    getIpTracking: async (params = {}) => {
      const q = new URLSearchParams(params).toString();
      const response = await apiCall(`/api/admin/ip-tracking?${q}`);
      return response.json();
    },

    getSubscriptionIpSummary: async (period = '30d') => {
      const response = await apiCall(`/api/admin/subscription-ip-summary?period=${period}`);
      return response.json();
    },
  },

  // Health check
  health: async () => {
    const response = await fetch(`${API_URL}/health`);
    return response.json();
  },
};

// Export meldraAi with backward compatibility layer
meldraAi.auth = backendApi.auth;
meldraAi.admin = backendApi.admin;
meldraAi.integrations.Core.InvokeLLM = backendApi.llm.invoke;
meldraAi.integrations.Core.GenerateImage = backendApi.llm.generateImage;
meldraAi.integrations.Core.UploadFile = backendApi.files.upload;
meldraAi.integrations.Core.ExtractDataFromUploadedFile = backendApi.files.extractData;
meldraAi.integrations.Core.CreateFileSignedUrl = backendApi.files.createSignedUrl;
meldraAi.integrations.Core.SendEmail = async () => {
  // Placeholder for email sending
  console.warn('SendEmail not implemented yet');
  return { success: false, message: 'Email sending not implemented' };
};
meldraAi.integrations.Core.UploadPrivateFile = backendApi.files.upload;

// Entities with compatibility layer
meldraAi.entities.Subscription = {
  filter: async (params) => {
    const subscription = await backendApi.subscriptions.getMy();
    if (params.user_email && subscription.user_email === params.user_email) {
      return [subscription];
    }
    return [];
  },
  create: backendApi.subscriptions.create,
  update: async function(data) {
    if (this.id) {
      return backendApi.subscriptions.update(this.id, data);
    }
    throw new Error('No subscription ID');
  },
};

meldraAi.entities.LoginHistory = {
  create: backendApi.loginHistory.create,
  filter: backendApi.loginHistory.filter,
};

meldraAi.entities.UserActivity = {
  create: async (data) => {
    // Map UserActivity.create({...}) to backendApi.activity.log(activityType, pageName, details)
    // Extract only the fields the backend accepts
    const activityType = data.activity_type || data.activityType || 'unknown';
    const pageName = data.page_name || data.pageName || window?.location?.pathname || '';
    const details = data.details || null;
    
    // Call the backend endpoint with correct format
    return await backendApi.activity.log(activityType, pageName, details);
  },
  filter: backendApi.activity.getHistory,
};

export default meldraAi;
