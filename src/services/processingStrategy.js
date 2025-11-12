/**
 * Processing Strategy Service
 *
 * Intelligently chooses between browser and backend processing
 * based on file size and subscription tier
 *
 * Business Logic:
 * - Free Tier: Browser-only (up to 5MB)
 * - Pro Tier: Backend available for files >5MB (up to 50MB)
 * - Enterprise Tier: Backend available for files >5MB (up to 500MB)
 */

import { backendApi } from '@/api/backendClient';

export const PROCESSING_LIMITS = {
  FREE: {
    MAX_SIZE: 5 * 1024 * 1024, // 5 MB
    MAX_ROWS: 5000,
    BACKEND_AVAILABLE: false
  },
  PRO: {
    MAX_SIZE: 50 * 1024 * 1024, // 50 MB
    MAX_ROWS: 100000,
    BACKEND_AVAILABLE: true
  },
  ENTERPRISE: {
    MAX_SIZE: 500 * 1024 * 1024, // 500 MB
    MAX_ROWS: Infinity,
    BACKEND_AVAILABLE: true
  }
};

export class ProcessingStrategy {
  constructor(userSubscription) {
    this.subscription = userSubscription || { tier: 'free' };
    this.tier = this.subscription.tier?.toLowerCase() || 'free';
  }

  /**
   * Determine if file should use backend processing
   */
  shouldUseBackend(fileSize, rowCount = 0) {
    const limits = PROCESSING_LIMITS[this.tier.toUpperCase()] || PROCESSING_LIMITS.FREE;

    // Free tier always uses browser
    if (this.tier === 'free') {
      return false;
    }

    // Pro/Enterprise use backend for files > 5MB
    if (fileSize > PROCESSING_LIMITS.FREE.MAX_SIZE) {
      return limits.BACKEND_AVAILABLE;
    }

    // Pro/Enterprise use backend for large datasets
    if (rowCount > PROCESSING_LIMITS.FREE.MAX_ROWS) {
      return limits.BACKEND_AVAILABLE;
    }

    // Default to browser for small files
    return false;
  }

  /**
   * Check if file size is within tier limits
   */
  validateFileSize(fileSize) {
    const limits = PROCESSING_LIMITS[this.tier.toUpperCase()] || PROCESSING_LIMITS.FREE;

    if (fileSize > limits.MAX_SIZE) {
      return {
        valid: false,
        error: `File size (${(fileSize / 1024 / 1024).toFixed(2)} MB) exceeds ${this.tier} tier limit (${limits.MAX_SIZE / 1024 / 1024} MB)`,
        currentLimit: limits.MAX_SIZE,
        upgradeRequired: this.tier !== 'enterprise',
        suggestedTier: this.tier === 'free' ? 'pro' : 'enterprise'
      };
    }

    return {
      valid: true,
      currentLimit: limits.MAX_SIZE,
      tier: this.tier
    };
  }

  /**
   * Get user-friendly message about processing method
   */
  getProcessingMessage(fileSize, useBackend) {
    if (useBackend) {
      return {
        title: 'Backend Processing',
        message: `Large file detected (${(fileSize / 1024 / 1024).toFixed(2)} MB). Processing on server for better performance.`,
        icon: '⚡',
        color: 'blue',
        note: 'Your data will be processed in memory only and immediately deleted after processing.'
      };
    } else {
      return {
        title: 'Browser Processing',
        message: `Processing locally in your browser (${(fileSize / 1024 / 1024).toFixed(2)} MB).`,
        icon: '🔒',
        color: 'green',
        note: '100% private - your data never leaves your device.'
      };
    }
  }

  /**
   * Get upgrade message if file is too large
   */
  getUpgradeMessage(fileSize) {
    const validation = this.validateFileSize(fileSize);

    if (validation.valid) {
      return null;
    }

    const messages = {
      free: {
        title: 'Upgrade to Pro',
        message: `Process files up to 50 MB with backend processing.`,
        features: [
          '✓ Files up to 50 MB',
          '✓ Datasets up to 100,000 rows',
          '✓ Faster processing',
          '✓ Advanced Excel features'
        ],
        ctaText: 'Upgrade to Pro',
        price: '$9/month'
      },
      pro: {
        title: 'Upgrade to Enterprise',
        message: `Process files up to 500 MB with dedicated resources.`,
        features: [
          '✓ Files up to 500 MB',
          '✓ Unlimited rows',
          '✓ Priority processing',
          '✓ Dedicated support'
        ],
        ctaText: 'Contact Sales',
        price: 'Custom pricing'
      }
    };

    return messages[this.tier] || messages.free;
  }
}

/**
 * Excel Processing with automatic backend/browser selection
 */
export async function processExcelFile(file, user) {
  const strategy = new ProcessingStrategy(user?.subscription);
  const fileSize = file.size;

  // Validate file size
  const validation = strategy.validateFileSize(fileSize);
  if (!validation.valid) {
    return {
      success: false,
      error: validation.error,
      upgradeMessage: strategy.getUpgradeMessage(fileSize)
    };
  }

  // Decide processing method
  const useBackend = strategy.shouldUseBackend(fileSize);
  const processingMessage = strategy.getProcessingMessage(fileSize, useBackend);

  if (useBackend) {
    // Use Python backend
    return await processWithBackend(file, user, processingMessage);
  } else {
    // Use browser
    return await processWithBrowser(file, processingMessage);
  }
}

/**
 * Process file using Python backend
 */
async function processWithBackend(file, user, message) {
  try {
    // Show processing message
    console.log(message.title, message.message);

    // Upload to backend
    const formData = new FormData();
    formData.append('file', file);

    const response = await backendApi.post('/api/excel/parse', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });

    return {
      success: true,
      data: response.data.sheets,
      method: 'backend',
      message: message
    };
  } catch (error) {
    console.error('Backend processing failed:', error);

    // Fallback to browser if backend fails
    if (error.response?.status === 403) {
      return {
        success: false,
        error: error.response.data.detail.error,
        upgradeRequired: error.response.data.detail.upgradeRequired
      };
    }

    throw error;
  }
}

/**
 * Process file using browser (XLSX.js)
 */
async function processWithBrowser(file, message) {
  console.log(message.title, message.message);

  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        if (!window.XLSX) {
          throw new Error('XLSX library not loaded');
        }

        const data = new Uint8Array(e.target.result);
        const workbook = window.XLSX.read(data, { type: 'array' });

        const sheets = {};
        workbook.SheetNames.forEach((sheetName) => {
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = window.XLSX.utils.sheet_to_json(worksheet, { header: 1 });

          if (jsonData.length > 0) {
            const headers = jsonData[0];
            const rows = jsonData.slice(1).map(row => {
              const rowObj = {};
              headers.forEach((header, idx) => {
                rowObj[header] = row[idx];
              });
              return rowObj;
            });

            sheets[sheetName] = {
              headers: headers,
              rows: rows,
              rowCount: rows.length,
              columnCount: headers.length
            };
          }
        });

        resolve({
          success: true,
          data: sheets,
          method: 'browser',
          message: message
        });
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = () => reject(reader.error);
    reader.readAsArrayBuffer(file);
  });
}

/**
 * Reconciliation with backend support
 */
export async function reconcileDatasets(sourceData, targetData, config, user) {
  const strategy = new ProcessingStrategy(user?.subscription);
  const totalRows = sourceData.length + targetData.length;

  // Check if backend should be used
  const useBackend = strategy.shouldUseBackend(0, totalRows);

  if (useBackend) {
    try {
      const response = await backendApi.post('/api/excel/reconcile', {
        source_data: sourceData,
        target_data: targetData,
        source_key: config.sourceKey,
        target_key: config.targetKey,
        compare_columns: config.compareColumns
      });

      return {
        success: true,
        ...response.data,
        method: 'backend'
      };
    } catch (error) {
      console.error('Backend reconciliation failed:', error);
      // Fallback to browser
      return reconcileBrowser(sourceData, targetData, config);
    }
  } else {
    return reconcileBrowser(sourceData, targetData, config);
  }
}

function reconcileBrowser(sourceData, targetData, config) {
  // Browser-based reconciliation (existing code)
  // ... XLOOKUP logic from Reconciliation.jsx ...

  return {
    success: true,
    method: 'browser',
    // ... results ...
  };
}
