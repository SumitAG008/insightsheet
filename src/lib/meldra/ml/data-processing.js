/**
 * Meldra ML - Data Processing Utilities
 *
 * This module provides machine learning and data processing utilities,
 * including data cleaning, normalization, feature engineering, and statistical analysis.
 *
 * @module meldra/ml/data-processing
 */

/**
 * Calculate basic statistics for a numeric array
 *
 * @param {Array<number>} data - Numeric data array
 * @returns {Object} - Statistics object
 *
 * @example
 * const stats = calculateStatistics([1, 2, 3, 4, 5]);
 * // { mean: 3, median: 3, mode: null, stdDev: 1.41, min: 1, max: 5 }
 */
export function calculateStatistics(data) {
  if (!Array.isArray(data) || data.length === 0) {
    throw new Error('Data must be a non-empty array');
  }

  const sorted = [...data].sort((a, b) => a - b);
  const sum = data.reduce((acc, val) => acc + val, 0);
  const mean = sum / data.length;

  // Median
  const mid = Math.floor(sorted.length / 2);
  const median = sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];

  // Mode
  const frequency = {};
  let maxFreq = 0;
  let mode = null;

  data.forEach(val => {
    frequency[val] = (frequency[val] || 0) + 1;
    if (frequency[val] > maxFreq) {
      maxFreq = frequency[val];
      mode = val;
    }
  });

  // Standard deviation
  const variance = data.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / data.length;
  const stdDev = Math.sqrt(variance);

  return {
    mean: parseFloat(mean.toFixed(2)),
    median,
    mode: maxFreq > 1 ? mode : null,
    stdDev: parseFloat(stdDev.toFixed(2)),
    variance: parseFloat(variance.toFixed(2)),
    min: Math.min(...data),
    max: Math.max(...data),
    count: data.length,
    sum
  };
}

/**
 * Normalize data to 0-1 range (Min-Max normalization)
 *
 * @param {Array<number>} data - Data to normalize
 * @returns {Array<number>} - Normalized data
 *
 * @example
 * const normalized = normalizeData([10, 20, 30, 40, 50]);
 * // [0, 0.25, 0.5, 0.75, 1]
 */
export function normalizeData(data) {
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min;

  if (range === 0) return data.map(() => 0);

  return data.map(val => (val - min) / range);
}

/**
 * Standardize data (Z-score normalization)
 *
 * @param {Array<number>} data - Data to standardize
 * @returns {Array<number>} - Standardized data
 *
 * @example
 * const standardized = standardizeData([10, 20, 30, 40, 50]);
 */
export function standardizeData(data) {
  const stats = calculateStatistics(data);
  return data.map(val => (val - stats.mean) / stats.stdDev);
}

/**
 * Detect outliers using IQR method
 *
 * @param {Array<number>} data - Data to analyze
 * @param {number} [threshold=1.5] - IQR multiplier
 * @returns {Object} - Outliers information
 *
 * @example
 * const outliers = detectOutliers([1, 2, 3, 4, 5, 100]);
 * // { outliers: [100], cleanData: [1, 2, 3, 4, 5], indices: [5] }
 */
export function detectOutliers(data, threshold = 1.5) {
  const sorted = [...data].sort((a, b) => a - b);
  const q1Index = Math.floor(sorted.length * 0.25);
  const q3Index = Math.floor(sorted.length * 0.75);

  const q1 = sorted[q1Index];
  const q3 = sorted[q3Index];
  const iqr = q3 - q1;

  const lowerBound = q1 - threshold * iqr;
  const upperBound = q3 + threshold * iqr;

  const outliers = [];
  const cleanData = [];
  const indices = [];

  data.forEach((val, idx) => {
    if (val < lowerBound || val > upperBound) {
      outliers.push(val);
      indices.push(idx);
    } else {
      cleanData.push(val);
    }
  });

  return {
    outliers,
    cleanData,
    indices,
    lowerBound,
    upperBound,
    q1,
    q3,
    iqr
  };
}

/**
 * Fill missing values in dataset
 *
 * @param {Array} data - Data with potential null/undefined values
 * @param {string} strategy - Fill strategy: 'mean', 'median', 'mode', 'forward', 'backward'
 * @returns {Array} - Data with filled values
 *
 * @example
 * const filled = fillMissingValues([1, null, 3, null, 5], 'mean');
 * // [1, 3, 3, 4, 5]
 */
export function fillMissingValues(data, strategy = 'mean') {
  const validData = data.filter(val => val !== null && val !== undefined && !isNaN(val));

  let fillValue;

  switch (strategy) {
    case 'mean': {
      const sum = validData.reduce((acc, val) => acc + val, 0);
      fillValue = sum / validData.length;
      break;
    }
    case 'median': {
      const sorted = [...validData].sort((a, b) => a - b);
      const mid = Math.floor(sorted.length / 2);
      fillValue = sorted.length % 2 === 0
        ? (sorted[mid - 1] + sorted[mid]) / 2
        : sorted[mid];
      break;
    }
    case 'mode': {
      const frequency = {};
      let maxFreq = 0;
      validData.forEach(val => {
        frequency[val] = (frequency[val] || 0) + 1;
        if (frequency[val] > maxFreq) {
          maxFreq = frequency[val];
          fillValue = val;
        }
      });
      break;
    }
    case 'forward': {
      let lastValid = validData[0];
      return data.map(val => {
        if (val !== null && val !== undefined && !isNaN(val)) {
          lastValid = val;
          return val;
        }
        return lastValid;
      });
    }
    case 'backward': {
      let nextValid = validData[validData.length - 1];
      return data.reverse().map(val => {
        if (val !== null && val !== undefined && !isNaN(val)) {
          nextValid = val;
          return val;
        }
        return nextValid;
      }).reverse();
    }
    default:
      fillValue = 0;
  }

  return data.map(val => (val === null || val === undefined || isNaN(val)) ? fillValue : val);
}

/**
 * Calculate correlation between two numeric arrays
 *
 * @param {Array<number>} x - First dataset
 * @param {Array<number>} y - Second dataset
 * @returns {number} - Pearson correlation coefficient (-1 to 1)
 *
 * @example
 * const correlation = calculateCorrelation([1, 2, 3, 4, 5], [2, 4, 6, 8, 10]);
 * // 1.0 (perfect positive correlation)
 */
export function calculateCorrelation(x, y) {
  if (x.length !== y.length) {
    throw new Error('Arrays must have the same length');
  }

  const n = x.length;
  const sumX = x.reduce((a, b) => a + b, 0);
  const sumY = y.reduce((a, b) => a + b, 0);
  const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
  const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);
  const sumY2 = y.reduce((sum, yi) => sum + yi * yi, 0);

  const numerator = n * sumXY - sumX * sumY;
  const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));

  return denominator === 0 ? 0 : numerator / denominator;
}

/**
 * Bin continuous data into discrete categories
 *
 * @param {Array<number>} data - Continuous data
 * @param {number} bins - Number of bins
 * @returns {Object} - Binned data and bin edges
 *
 * @example
 * const binned = binData([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 3);
 */
export function binData(data, bins) {
  const min = Math.min(...data);
  const max = Math.max(...data);
  const binWidth = (max - min) / bins;

  const edges = Array.from({ length: bins + 1 }, (_, i) => min + i * binWidth);
  const counts = new Array(bins).fill(0);
  const binnedData = data.map(val => {
    const binIndex = Math.min(Math.floor((val - min) / binWidth), bins - 1);
    counts[binIndex]++;
    return binIndex;
  });

  return {
    binnedData,
    edges,
    counts,
    binWidth
  };
}

export default {
  calculateStatistics,
  normalizeData,
  standardizeData,
  detectOutliers,
  fillMissingValues,
  calculateCorrelation,
  binData
};
