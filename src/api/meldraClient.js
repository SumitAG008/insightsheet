/**
 * Meldra AI Client
 *
 * Custom implementation using FastAPI backend instead of Base44 platform.
 * This provides a compatible interface while using our own backend.
 */

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
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

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

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });

  // Handle unauthorized
  if (response.status === 401) {
    setToken(null);
    window.location.href = '/login';
    throw new Error('Unauthorized');
  }

  return response;
};

// Backend API Client
export const backendApi = {
  // Authentication
  auth: {
    register: async (email, password, fullName) => {
      const response = await apiCall('/api/auth/register', {
        method: 'POST',
        body: { email, password, full_name: fullName },
      });
      return response.json();
    },

    login: async (email, password) => {
      const response = await apiCall('/api/auth/login', {
        method: 'POST',
        body: { email, password },
      });
      const data = await response.json();

      if (data.access_token) {
        setToken(data.access_token);
      }

      return data;
    },

    logout: () => {
      setToken(null);
      localStorage.removeItem('user');
    },

    me: async () => {
      const response = await apiCall('/api/auth/me');
      return response.json();
    },

    redirectToLogin: () => {
      window.location.href = '/login';
    },

    isAuthenticated: () => {
      return !!getToken();
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
      const data = await response.json();
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
      const response = await apiCall('/api/activity/log', {
        method: 'POST',
        body: {
          activity_type: activityType,
          page_name: pageName,
          details,
        },
      });
      return response.json();
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
  },

  // Health check
  health: async () => {
    const response = await fetch(`${API_URL}/health`);
    return response.json();
  },
};

// Export meldraAi with backward compatibility layer
meldraAi.auth = backendApi.auth;
meldraAi.integrations.Core.InvokeLLM = backendApi.llm.invoke;
meldraAi.integrations.Core.GenerateImage = backendApi.llm.generateImage;
meldraAi.integrations.Core.UploadFile = backendApi.files.upload;
meldraAi.integrations.Core.ExtractDataFromUploadedFile = backendApi.files.extractData;
meldraAi.integrations.Core.CreateFileSignedUrl = backendApi.files.createSignedUrl;
meldraAi.integrations.Core.SendEmail = async (options) => {
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
  create: backendApi.activity.log,
  filter: backendApi.activity.getHistory,
};

export default meldraAi;
