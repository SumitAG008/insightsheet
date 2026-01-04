/**
 * Meldra UI - Formatting Utilities
 *
 * This module provides formatting utilities for displaying data in user interfaces,
 * including number formatting, date formatting, and data visualization helpers.
 *
 * @module meldra/ui/formatters
 */

/**
 * Format number with thousand separators
 *
 * @param {number} value - Number to format
 * @param {Object} options - Formatting options
 * @param {number} [options.decimals=2] - Number of decimal places
 * @param {string} [options.separator=','] - Thousand separator
 * @returns {string} - Formatted number
 *
 * @example
 * formatNumber(1234567.89); // "1,234,567.89"
 */
export function formatNumber(value, options = {}) {
  const { decimals = 2, separator = ',' } = options;

  if (value === null || value === undefined || isNaN(value)) {
    return '-';
  }

  const parts = value.toFixed(decimals).split('.');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, separator);

  return parts.join('.');
}

/**
 * Format number as currency
 *
 * @param {number} value - Amount to format
 * @param {Object} options - Formatting options
 * @param {string} [options.currency='USD'] - Currency code
 * @param {string} [options.locale='en-US'] - Locale for formatting
 * @returns {string} - Formatted currency
 *
 * @example
 * formatCurrency(1234.56); // "$1,234.56"
 */
export function formatCurrency(value, options = {}) {
  const { currency = 'USD', locale = 'en-US' } = options;

  if (value === null || value === undefined || isNaN(value)) {
    return '-';
  }

  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency
  }).format(value);
}

/**
 * Format number as percentage
 *
 * @param {number} value - Value to format (0-1 or 0-100)
 * @param {Object} options - Formatting options
 * @param {number} [options.decimals=1] - Decimal places
 * @param {boolean} [options.multiply=true] - Multiply by 100 if value is 0-1
 * @returns {string} - Formatted percentage
 *
 * @example
 * formatPercentage(0.1234); // "12.3%"
 */
export function formatPercentage(value, options = {}) {
  const { decimals = 1, multiply = true } = options;

  if (value === null || value === undefined || isNaN(value)) {
    return '-';
  }

  const percentValue = multiply ? value * 100 : value;
  return `${percentValue.toFixed(decimals)}%`;
}

/**
 * Format file size in human-readable format
 *
 * @param {number} bytes - File size in bytes
 * @param {number} [decimals=2] - Decimal places
 * @returns {string} - Formatted file size
 *
 * @example
 * formatFileSize(1536); // "1.50 KB"
 * formatFileSize(1048576); // "1.00 MB"
 */
export function formatFileSize(bytes, decimals = 2) {
  if (bytes === 0) return '0 Bytes';
  if (bytes === null || bytes === undefined) return '-';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(decimals))} ${sizes[i]}`;
}

/**
 * Format date/time
 *
 * @param {Date|string|number} date - Date to format
 * @param {Object} options - Formatting options
 * @param {string} [options.format='short'] - Format type: 'short', 'long', 'time', 'datetime'
 * @param {string} [options.locale='en-US'] - Locale for formatting
 * @returns {string} - Formatted date
 *
 * @example
 * formatDate(new Date(), { format: 'short' }); // "12/17/2024"
 * formatDate(new Date(), { format: 'long' }); // "December 17, 2024"
 */
export function formatDate(date, options = {}) {
  const { format = 'short', locale = 'en-US' } = options;

  if (!date) return '-';

  const d = new Date(date);
  if (isNaN(d.getTime())) return '-';

  const formats = {
    short: { month: 'numeric', day: 'numeric', year: 'numeric' },
    long: { month: 'long', day: 'numeric', year: 'numeric' },
    time: { hour: 'numeric', minute: '2-digit' },
    datetime: {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    }
  };

  return new Intl.DateTimeFormat(locale, formats[format] || formats.short).format(d);
}

/**
 * Format relative time (e.g., "2 hours ago")
 *
 * @param {Date|string|number} date - Date to format
 * @param {string} [locale='en-US'] - Locale for formatting
 * @returns {string} - Relative time string
 *
 * @example
 * formatRelativeTime(new Date(Date.now() - 3600000)); // "1 hour ago"
 */
export function formatRelativeTime(date, locale = 'en-US') {
  if (!date) return '-';

  const d = new Date(date);
  if (isNaN(d.getTime())) return '-';

  const now = new Date();
  const diffMs = now - d;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return 'just now';
  if (diffMin < 60) return `${diffMin} minute${diffMin !== 1 ? 's' : ''} ago`;
  if (diffHour < 24) return `${diffHour} hour${diffHour !== 1 ? 's' : ''} ago`;
  if (diffDay < 30) return `${diffDay} day${diffDay !== 1 ? 's' : ''} ago`;

  return formatDate(d, { format: 'short', locale });
}

/**
 * Truncate string with ellipsis
 *
 * @param {string} str - String to truncate
 * @param {number} maxLength - Maximum length
 * @param {string} [suffix='...'] - Suffix to append
 * @returns {string} - Truncated string
 *
 * @example
 * truncateString('Hello World', 8); // "Hello..."
 */
export function truncateString(str, maxLength, suffix = '...') {
  if (!str) return '';
  if (str.length <= maxLength) return str;

  return str.slice(0, maxLength - suffix.length) + suffix;
}

/**
 * Format duration in milliseconds to human-readable format
 *
 * @param {number} ms - Duration in milliseconds
 * @returns {string} - Formatted duration
 *
 * @example
 * formatDuration(90000); // "1m 30s"
 * formatDuration(3665000); // "1h 1m 5s"
 */
export function formatDuration(ms) {
  if (!ms || ms < 0) return '0s';

  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  const parts = [];

  if (days > 0) parts.push(`${days}d`);
  if (hours % 24 > 0) parts.push(`${hours % 24}h`);
  if (minutes % 60 > 0) parts.push(`${minutes % 60}m`);
  if (seconds % 60 > 0 && days === 0) parts.push(`${seconds % 60}s`);

  return parts.join(' ') || '0s';
}

/**
 * Format SQL data type for display
 *
 * @param {string} type - SQL data type
 * @returns {string} - Formatted type
 *
 * @example
 * formatDataType('VARCHAR'); // "String"
 * formatDataType('INTEGER'); // "Number"
 */
export function formatDataType(type) {
  const typeMap = {
    'VARCHAR': 'String',
    'CHAR': 'String',
    'TEXT': 'Text',
    'INTEGER': 'Number',
    'BIGINT': 'Number',
    'SMALLINT': 'Number',
    'DECIMAL': 'Decimal',
    'NUMERIC': 'Decimal',
    'REAL': 'Float',
    'DOUBLE PRECISION': 'Float',
    'BOOLEAN': 'Boolean',
    'DATE': 'Date',
    'TIME': 'Time',
    'TIMESTAMP': 'DateTime',
    'JSON': 'JSON',
    'JSONB': 'JSON',
    'UUID': 'UUID',
    'BLOB': 'Binary',
    'BYTEA': 'Binary'
  };

  return typeMap[type.toUpperCase()] || type;
}

export default {
  formatNumber,
  formatCurrency,
  formatPercentage,
  formatFileSize,
  formatDate,
  formatRelativeTime,
  truncateString,
  formatDuration,
  formatDataType
};
