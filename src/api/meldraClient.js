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

  convert: {
    convertFile: async (endpoint, file, options = {}) => {
      const formData = new FormData();
      formData.append('file', file);
      if (options.ocrLang) formData.append('ocr_lang', options.ocrLang);
      if (options.mode) formData.append('mode', options.mode);
      if (options.maxPages != null) formData.append('max_pages', String(options.maxPages));
      if (options.timeoutSeconds != null) formData.append('timeout_seconds', String(options.timeoutSeconds));

      const response = await apiCall(`/api/convert/${endpoint}`, {
        method: 'POST',
        body: formData,
        timeoutMs: options.timeoutMs || 240000,
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.detail || `Conversion failed: ${response.status}`);
      }

      const blob = await response.blob();
      const cd = response.headers.get('content-disposition') || '';
      let filename = options.filename || 'converted-file';
      const m = cd.match(/filename=([^;]+)/i);
      if (m && m[1]) {
        filename = m[1].trim().replace(/^"|"$/g, '');
      }
      return { blob, filename };
    },
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

// Helper function for API calls. options.timeoutMs aborts to avoid long hangs (e.g. OCR).
const apiCall = async (endpoint, options = {}) => {
  const { timeoutMs, ...rest } = options;
  const token = getToken();

  const headers = { ...rest.headers };

  if (!headers['X-Request-Id']) {
    let rid;
    try {
      rid = globalThis?.crypto?.randomUUID ? globalThis.crypto.randomUUID() : null;
    } catch {
      rid = null;
    }
    if (!rid) {
      rid = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    }
    headers['X-Request-Id'] = rid;
  }

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
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error('Request timed out. Try a smaller image or try again later.');
    }
    if (error.name === 'TypeError' && (error.message.includes('fetch') || error.message.includes('Failed to fetch'))) {
      throw new Error(`Cannot connect to backend at ${API_URL}. Check your connection or try again later.`);
    }
    throw error;
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }

  if (response.status === 401) {
    clearAllAppSessionData();
    setToken(null);
    window.location.href = '/Login';
    throw new Error('Unauthorized');
  }

  return response;
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

    standardizePreview: async (file, options = {}) => {
      const formData = new FormData();
      formData.append('file', file);
      if (options && typeof options.dedupeRows === 'boolean') {
        formData.append('dedupe_rows', String(options.dedupeRows));
      }
      if (options && typeof options.normalizeHeaders === 'boolean') {
        formData.append('normalize_headers', String(options.normalizeHeaders));
      }
      if (options && typeof options.parseNumbers === 'boolean') {
        formData.append('parse_numbers', String(options.parseNumbers));
      }
      if (options && typeof options.parseDates === 'boolean') {
        formData.append('parse_dates', String(options.parseDates));
      }

      const response = await apiCall('/api/files/standardize-preview', {
        method: 'POST',
        body: formData,
        timeoutMs: options.timeoutMs || 60000,
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.detail || `Standardize preview failed: ${response.status}`);
      }
      return response.json();
    },

    standardize: async (file, options = {}) => {
      const formData = new FormData();
      formData.append('file', file);
      if (options && typeof options.dedupeRows === 'boolean') {
        formData.append('dedupe_rows', String(options.dedupeRows));
      }
      if (options && typeof options.normalizeHeaders === 'boolean') {
        formData.append('normalize_headers', String(options.normalizeHeaders));
      }
      if (options && typeof options.parseNumbers === 'boolean') {
        formData.append('parse_numbers', String(options.parseNumbers));
      }
      if (options && typeof options.parseDates === 'boolean') {
        formData.append('parse_dates', String(options.parseDates));
      }

      const response = await apiCall('/api/files/standardize', {
        method: 'POST',
        body: formData,
        timeoutMs: options.timeoutMs || 90000,
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.detail || `Standardize failed: ${response.status}`);
      }
      return response.blob();
    },

    reconcilePreview: async (leftFile, rightFile, params, options = {}) => {
      const formData = new FormData();
      formData.append('left_file', leftFile);
      formData.append('right_file', rightFile);
      formData.append('left_key_col', params.leftKeyCol);
      formData.append('right_key_col', params.rightKeyCol);
      formData.append('left_amount_col', params.leftAmountCol);
      formData.append('right_amount_col', params.rightAmountCol);
      if (params && typeof params.tolerance !== 'undefined') {
        formData.append('tolerance', String(params.tolerance));
      }

      const response = await apiCall('/api/files/reconcile-preview', {
        method: 'POST',
        body: formData,
        timeoutMs: options.timeoutMs || 60000,
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.detail || `Reconcile preview failed: ${response.status}`);
      }
      return response.json();
    },

    reconcile: async (leftFile, rightFile, params, options = {}) => {
      const formData = new FormData();
      formData.append('left_file', leftFile);
      formData.append('right_file', rightFile);
      formData.append('left_key_col', params.leftKeyCol);
      formData.append('right_key_col', params.rightKeyCol);
      formData.append('left_amount_col', params.leftAmountCol);
      formData.append('right_amount_col', params.rightAmountCol);
      if (params && typeof params.tolerance !== 'undefined') {
        formData.append('tolerance', String(params.tolerance));
      }

      const response = await apiCall('/api/files/reconcile', {
        method: 'POST',
        body: formData,
        timeoutMs: options.timeoutMs || 120000,
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.detail || `Reconcile failed: ${response.status}`);
      }
      return response.blob();
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
      // End this device's session on the server too (best effort), so it frees a device slot.
      const token = getToken();
      if (token) {
        fetch(`${API_URL}/api/auth/logout`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } }).catch(() => {});
      }
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

  // Developer API keys
  developer: {
    requestSandboxKey: async () => {
      const response = await apiCall('/api/developer/keys/request-sandbox', {
        method: 'POST',
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.detail || `Sandbox key request failed: ${response.status}`);
      }
      return response.json();
    },

    listKeys: async () => {
      const response = await apiCall('/api/developer/keys');
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.detail || `Failed to load API keys: ${response.status}`);
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

    invokeWithFile: async (prompt, file, options = {}) => {
      const formData = new FormData();
      formData.append('prompt', prompt || '');
      formData.append('add_context_from_internet', String(!!options.addContext));
      if (options.responseSchema) {
        formData.append('response_json_schema', JSON.stringify(options.responseSchema));
      }
      formData.append('file', file);

      const response = await apiCall('/api/integrations/llm/invoke-with-file', {
        method: 'POST',
        body: formData,
        timeoutMs: options.timeoutMs || 90000,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `LLM invoke-with-file failed: ${response.status}`);
      }

      const data = await response.json();
      return data;
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

  // Customer support chat (KB-grounded)
  support: {
    chat: async (message, options = {}) => {
      const response = await apiCall('/api/support/chat', {
        method: 'POST',
        body: {
          message,
          page: options.page || null,
        },
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.detail || `Support chat failed: ${response.status}`);
      }
      return response.json();
    },

    chatWithFile: async (message, file, options = {}) => {
      const formData = new FormData();
      formData.append('message', message || '');
      if (options.page) formData.append('page', options.page);
      formData.append('file', file);

      const response = await apiCall('/api/support/chat-with-file', {
        method: 'POST',
        body: formData,
        timeoutMs: options.timeoutMs || 90000,
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.detail || `Support chat-with-file failed: ${response.status}`);
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

    excelToPpt: async (file, options = {}) => {
      const formData = new FormData();
      formData.append('file', file);
      // Presentation design (applies to this deck only; nothing is stored on the server)
      const design = (options && options.design) || {};
      if (design.theme) formData.append('theme', design.theme);
      if (design.brandColor) formData.append('brand_color', design.brandColor);
      if (design.font) formData.append('font', design.font);
      if (design.company) formData.append('company', design.company);
      if (design.logo) formData.append('logo', design.logo);

      const mode = (options && options.mode) ? String(options.mode) : '';
      const qs = mode ? `?mode=${encodeURIComponent(mode)}` : '';

      const response = await apiCall(`/api/files/excel-to-ppt${qs}` , {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Conversion failed');
      }

      return response.blob();
    },

    generatePL: async (prompt, context) => {
      const response = await apiCall('/api/files/generate-pl', {
        method: 'POST',
        body: { prompt, context: context || {} },
        timeoutMs: 90000,
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.detail || `P&L generation failed: ${response.status}`);
      }
      return response.blob();
    },

    generatePLWithFile: async (prompt, context, file, options = {}) => {
      const formData = new FormData();
      formData.append('prompt', prompt || '');
      if (context) formData.append('context_json', JSON.stringify(context));
      if (options && typeof options.llmAssistHeadersOnly === 'boolean') {
        formData.append('llm_assist_headers_only', String(options.llmAssistHeadersOnly));
      }
      if (options && options.candidateId) {
        formData.append('candidate_id', String(options.candidateId));
      }
      formData.append('file', file);

      const response = await apiCall('/api/files/generate-pl-with-file', {
        method: 'POST',
        body: formData,
        timeoutMs: options.timeoutMs || 90000,
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.detail || `P&L generate-with-file failed: ${response.status}`);
      }
      return response.blob();
    },

    plExtractionPreview: async (file, options = {}) => {
      const formData = new FormData();
      formData.append('file', file);

      const response = await apiCall('/api/files/pl-extraction-preview', {
        method: 'POST',
        body: formData,
        timeoutMs: options.timeoutMs || 60000,
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.detail || `Preview failed: ${response.status}`);
      }
      return response.json();
    },

    universalAnalyze: async (file, options = {}) => {
      const formData = new FormData();
      formData.append('file', file);

      if (options && options.overrides) {
        formData.append('overrides', JSON.stringify(options.overrides));
      }

      const url = options?.recalculate ? '/api/files/universal-analyze?recalculate=1' : '/api/files/universal-analyze';

      const response = await apiCall(url, {
        method: 'POST',
        body: formData,
        timeoutMs: options.timeoutMs || 120000,
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        const status = response.status;
        if (status === 502 || status === 503 || status === 504) {
          throw new Error(err.detail || 'Universal analyze took too long or the server is busy. Try again later.');
        }
        throw new Error(err.detail || `Universal analyze failed: ${status}`);
      }

      return response.json();
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
        timeoutMs: 60000,
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        const status = response.status;
        if (status === 502 || status === 503 || status === 504) {
          throw new Error(err.detail || 'Analysis took too long or the server is busy. Try a smaller file or try again later.');
        }
        throw new Error(err.detail || 'Analysis failed');
      }

      return response.json();
    },

    ocrExtract: async (file, ocrLang) => {
      const formData = new FormData();
      formData.append('file', file);
      if (ocrLang) formData.append('ocr_lang', ocrLang);
      const response = await apiCall('/api/files/ocr-extract', {
        method: 'POST',
        body: formData,
        timeoutMs: 90000,
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        const status = response.status;
        if (status === 502 || status === 503 || status === 504) {
          throw new Error(err.detail || 'OCR took too long or the server is busy. Try a smaller image or try again later.');
        }
        throw new Error(err.detail || 'OCR extraction failed');
      }
      return response.json();
    },

    ocrExport: async (payload) => {
      const body = {
        text: payload.text ?? '',
        format: payload.format,
        title: payload.title || 'OCR Document',
      };
      if (payload.mode === 'layout' && payload.pages != null && Array.isArray(payload.pages) && payload.pages.length > 0) {
        body.pages = payload.pages;
        body.mode = 'layout';
      }
      if (payload.mode === 'layout' && payload.layout != null && payload.image_width != null && payload.image_height != null) {
        body.layout = payload.layout;
        body.image_width = payload.image_width;
        body.image_height = payload.image_height;
        if (payload.tables != null) body.tables = payload.tables;
        body.mode = 'layout';
      }
      if (payload.preserve_image && payload.image_base64) {
        body.preserve_image = true;
        body.image_base64 = payload.image_base64;
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

    /** A non-editable PDF / scan / photo of a form -> the same PDF with fill-in fields. */
    makeFillable: async (file, ocrLang) => {
      const formData = new FormData();
      formData.append('file', file);
      if (ocrLang) formData.append('ocr_lang', ocrLang);
      const response = await apiCall('/api/files/make-fillable', { method: 'POST', body: formData, timeoutMs: 300000 });
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.detail || `Could not make this form fillable (${response.status}).`);
      }
      const num = (h) => Number(response.headers.get(h) || 0);
      return {
        blob: await response.blob(),
        fields: num('X-Fillable-Fields'),
        checkboxes: num('X-Fillable-Checkboxes'),
        pages: num('X-Fillable-Pages'),
        scannedPages: num('X-Fillable-Scanned-Pages'),
      };
    },

    /** Label/value pairs and text from a form, statement or letter (PDF or image). */
    extractFormData: async (file, ocrLang) => {
      const formData = new FormData();
      formData.append('file', file);
      if (ocrLang) formData.append('ocr_lang', ocrLang);
      const response = await apiCall('/api/files/extract-form-data', { method: 'POST', body: formData, timeoutMs: 300000 });
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.detail || `Could not read this document (${response.status}).`);
      }
      return response.json();
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
meldraAi.subscriptions = backendApi.subscriptions;
meldraAi.admin = backendApi.admin;
meldraAi.files = backendApi.files;
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
