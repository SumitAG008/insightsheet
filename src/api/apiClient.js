// API Client to replace Base44 SDK
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

class APIClient {
  constructor() {
    this.baseURL = API_URL;
    this.token = localStorage.getItem('token');
  }

  setToken(token) {
    this.token = token;
    if (token) {
      localStorage.setItem('token', token);
    } else {
      localStorage.removeItem('token');
    }
  }

  async request(endpoint, options = {}) {
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }

    const config = {
      ...options,
      headers,
    };

    try {
      const response = await fetch(`${this.baseURL}${endpoint}`, config);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'Request failed');
      }

      return data;
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  }

  // Authentication methods
  auth = {
    register: async (email, password, name) => {
      const data = await this.request('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ email, password, name }),
      });
      this.setToken(data.token);
      return data;
    },

    login: async (email, password) => {
      const data = await this.request('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      this.setToken(data.token);
      return data;
    },

    logout: () => {
      this.setToken(null);
    },

    getCurrentUser: async () => {
      return await this.request('/auth/me');
    },

    updateProfile: async (updates) => {
      return await this.request('/users/profile', {
        method: 'PUT',
        body: JSON.stringify(updates),
      });
    },
  };

  // Subscription management
  subscriptions = {
    get: async () => {
      return await this.request('/subscriptions');
    },

    upgrade: async (plan) => {
      return await this.request('/subscriptions/upgrade', {
        method: 'POST',
        body: JSON.stringify({ plan }),
      });
    },
  };

  // File operations
  files = {
    upload: async (file) => {
      const formData = new FormData();
      formData.append('file', file);

      const headers = {};
      if (this.token) {
        headers.Authorization = `Bearer ${this.token}`;
      }

      const response = await fetch(`${this.baseURL}/files/upload`, {
        method: 'POST',
        headers,
        body: formData,
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error?.message || 'Upload failed');
      }

      return data;
    },

    list: async () => {
      return await this.request('/files');
    },
  };

  // Activity tracking
  activity = {
    log: async (action, resource, resourceId, metadata) => {
      return await this.request('/activity', {
        method: 'POST',
        body: JSON.stringify({ action, resource, resourceId, metadata }),
      });
    },

    getLog: async (page = 1, limit = 50) => {
      return await this.request(`/activity?page=${page}&limit=${limit}`);
    },
  };
}

// Export singleton instance
export const apiClient = new APIClient();

// Export for compatibility with existing Base44 code
export const User = apiClient.auth;
export const Subscription = apiClient.subscriptions;
export const UserActivity = apiClient.activity;
