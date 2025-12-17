/**
 * Meldra Library
 *
 * A comprehensive library for AI, ML, UI, and backend utilities
 * built specifically for the Meldra platform and InsightSheet application.
 *
 * @module meldra
 * @version 1.0.0
 * @author Meldra Team
 *
 * @example
 * import { core, ai, ml, ui, backend } from '@/lib/meldra';
 *
 * // Use LLM
 * const response = await core.InvokeLLM({ prompt: '...' });
 *
 * // Generate schema with AI
 * const schema = await ai.generateDatabaseSchema('Create an e-commerce database');
 *
 * // Process data with ML
 * const stats = ml.calculateStatistics([1, 2, 3, 4, 5]);
 *
 * // Format for UI
 * const formatted = ui.formatCurrency(1234.56);
 *
 * // Backend utilities
 * const paginated = backend.paginateData(data, 1, 10);
 */

// Core Integrations
import * as coreIntegrations from './core/integrations';

// AI Utilities
import * as aiLLM from './ai/llm';

// ML Utilities
import * as mlDataProcessing from './ml/data-processing';

// UI Utilities
import * as uiFormatters from './ui/formatters';

// Backend Utilities
import * as backendAPI from './backend/api';

/**
 * Core integrations for Meldra platform
 * Includes: InvokeLLM, SendEmail, UploadFile, GenerateImage, etc.
 */
export const core = coreIntegrations;

/**
 * AI utilities for working with Large Language Models
 * Includes: generateDatabaseSchema, analyzeData, generateSQL, etc.
 */
export const ai = aiLLM;

/**
 * Machine Learning and data processing utilities
 * Includes: calculateStatistics, normalizeData, detectOutliers, etc.
 */
export const ml = mlDataProcessing;

/**
 * UI formatting and display utilities
 * Includes: formatNumber, formatCurrency, formatDate, etc.
 */
export const ui = uiFormatters;

/**
 * Backend API utilities
 * Includes: createResponse, paginateData, validateRequiredFields, etc.
 */
export const backend = backendAPI;

/**
 * Meldra client instance
 */
export { meldraAi } from '@/api/meldraClient';

/**
 * Default export with all modules
 */
export default {
  core,
  ai,
  ml,
  ui,
  backend
};
