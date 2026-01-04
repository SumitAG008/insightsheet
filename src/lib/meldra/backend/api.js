/**
 * Meldra Backend - API Utilities
 *
 * This module provides backend API utilities for handling HTTP requests,
 * authentication, and data transformation.
 *
 * @module meldra/backend/api
 */

/**
 * Create standardized API response
 *
 * @param {Object} data - Response data
 * @param {string} [message] - Optional message
 * @param {number} [status=200] - HTTP status code
 * @returns {Object} - Standardized response object
 *
 * @example
 * const response = createResponse({ users: [] }, 'Success', 200);
 */
export function createResponse(data, message = null, status = 200) {
  return {
    success: status >= 200 && status < 300,
    status,
    message,
    data,
    timestamp: new Date().toISOString()
  };
}

/**
 * Create standardized error response
 *
 * @param {string} message - Error message
 * @param {number} [status=500] - HTTP status code
 * @param {Object} [details] - Additional error details
 * @returns {Object} - Standardized error object
 *
 * @example
 * const error = createError('Not found', 404);
 */
export function createError(message, status = 500, details = null) {
  return {
    success: false,
    status,
    message,
    details,
    timestamp: new Date().toISOString()
  };
}

/**
 * Paginate array data
 *
 * @param {Array} data - Data to paginate
 * @param {number} page - Page number (1-indexed)
 * @param {number} [limit=10] - Items per page
 * @returns {Object} - Paginated result
 *
 * @example
 * const result = paginateData(users, 2, 10);
 * // { data: [...], page: 2, limit: 10, total: 100, totalPages: 10 }
 */
export function paginateData(data, page, limit = 10) {
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit;

  return {
    data: data.slice(startIndex, endIndex),
    page,
    limit,
    total: data.length,
    totalPages: Math.ceil(data.length / limit),
    hasNextPage: endIndex < data.length,
    hasPrevPage: page > 1
  };
}

/**
 * Validate required fields in object
 *
 * @param {Object} obj - Object to validate
 * @param {Array<string>} requiredFields - Required field names
 * @returns {Object} - Validation result
 *
 * @example
 * const result = validateRequiredFields({ name: 'John' }, ['name', 'email']);
 * // { valid: false, missing: ['email'] }
 */
export function validateRequiredFields(obj, requiredFields) {
  const missing = requiredFields.filter(field => !obj[field]);

  return {
    valid: missing.length === 0,
    missing
  };
}

/**
 * Sanitize object by removing null/undefined values
 *
 * @param {Object} obj - Object to sanitize
 * @returns {Object} - Sanitized object
 *
 * @example
 * const clean = sanitizeObject({ a: 1, b: null, c: undefined, d: 0 });
 * // { a: 1, d: 0 }
 */
export function sanitizeObject(obj) {
  return Object.fromEntries(
    Object.entries(obj).filter(([_, value]) => value !== null && value !== undefined)
  );
}

export default {
  createResponse,
  createError,
  paginateData,
  validateRequiredFields,
  sanitizeObject
};
