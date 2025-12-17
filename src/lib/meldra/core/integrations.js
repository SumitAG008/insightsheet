/**
 * Meldra Core Integrations Library
 *
 * This module provides core integration functionalities for the Meldra platform,
 * including LLM invocations, email sending, file operations, and more.
 *
 * @module meldra/core/integrations
 */

import { meldraAi } from '@/api/meldraClient';

/**
 * Core integrations namespace
 */
export const Core = meldraAi.integrations.Core;

/**
 * Invoke Large Language Model (LLM) for AI-powered operations
 *
 * @param {Object} params - LLM invocation parameters
 * @param {string} params.prompt - The prompt to send to the LLM
 * @param {string} [params.model='gpt-4o-mini'] - The model to use
 * @param {number} [params.temperature=0.7] - Temperature for response randomness (0-1)
 * @param {number} [params.max_tokens=1000] - Maximum tokens in response
 * @returns {Promise<string>} - The LLM response
 *
 * @example
 * const response = await InvokeLLM({
 *   prompt: 'Generate a database schema for an e-commerce platform',
 *   model: 'gpt-4o-mini',
 *   temperature: 0.7,
 *   max_tokens: 2000
 * });
 */
export const InvokeLLM = meldraAi.integrations.Core.InvokeLLM;

/**
 * Send email through Meldra platform
 *
 * @param {Object} params - Email parameters
 * @param {string} params.to - Recipient email address
 * @param {string} params.subject - Email subject
 * @param {string} params.body - Email body (supports HTML)
 * @param {string} [params.from] - Sender email address
 * @returns {Promise<Object>} - Email send result
 *
 * @example
 * await SendEmail({
 *   to: 'user@example.com',
 *   subject: 'Welcome to InsightSheet',
 *   body: '<h1>Welcome!</h1><p>Thank you for signing up.</p>'
 * });
 */
export const SendEmail = meldraAi.integrations.Core.SendEmail;

/**
 * Upload file to Meldra platform storage
 *
 * @param {Object} params - Upload parameters
 * @param {File|Blob} params.file - The file to upload
 * @param {string} [params.folder] - Optional folder path
 * @returns {Promise<Object>} - Upload result with file URL
 *
 * @example
 * const result = await UploadFile({
 *   file: fileBlob,
 *   folder: 'schemas'
 * });
 * console.log(result.url);
 */
export const UploadFile = meldraAi.integrations.Core.UploadFile;

/**
 * Generate AI image from text description
 *
 * @param {Object} params - Image generation parameters
 * @param {string} params.prompt - Text description of the image
 * @param {string} [params.size='1024x1024'] - Image size
 * @param {number} [params.n=1] - Number of images to generate
 * @returns {Promise<Object>} - Generated image result
 *
 * @example
 * const image = await GenerateImage({
 *   prompt: 'A futuristic database visualization with purple and pink gradients',
 *   size: '1024x1024'
 * });
 */
export const GenerateImage = meldraAi.integrations.Core.GenerateImage;

/**
 * Extract structured data from uploaded files (CSV, Excel, JSON, etc.)
 *
 * @param {Object} params - Extraction parameters
 * @param {string} params.fileUrl - URL of the uploaded file
 * @param {string} [params.format] - Expected file format
 * @returns {Promise<Object>} - Extracted data structure
 *
 * @example
 * const data = await ExtractDataFromUploadedFile({
 *   fileUrl: 'https://storage.example.com/file.csv',
 *   format: 'csv'
 * });
 */
export const ExtractDataFromUploadedFile = meldraAi.integrations.Core.ExtractDataFromUploadedFile;

/**
 * Create a signed URL for secure file access
 *
 * @param {Object} params - Signed URL parameters
 * @param {string} params.fileKey - File key/path
 * @param {number} [params.expiresIn=3600] - URL expiration time in seconds
 * @returns {Promise<string>} - Signed URL
 *
 * @example
 * const signedUrl = await CreateFileSignedUrl({
 *   fileKey: 'schemas/ecommerce-schema.json',
 *   expiresIn: 7200 // 2 hours
 * });
 */
export const CreateFileSignedUrl = meldraAi.integrations.Core.CreateFileSignedUrl;

/**
 * Upload private file with restricted access
 *
 * @param {Object} params - Private upload parameters
 * @param {File|Blob} params.file - The file to upload
 * @param {string} [params.folder] - Optional folder path
 * @param {Array<string>} [params.allowedUsers] - Users who can access the file
 * @returns {Promise<Object>} - Upload result with file info
 *
 * @example
 * const result = await UploadPrivateFile({
 *   file: sensitiveFile,
 *   folder: 'private/schemas',
 *   allowedUsers: ['user@example.com']
 * });
 */
export const UploadPrivateFile = meldraAi.integrations.Core.UploadPrivateFile;

/**
 * Default export containing all core integrations
 */
export default {
  Core,
  InvokeLLM,
  SendEmail,
  UploadFile,
  GenerateImage,
  ExtractDataFromUploadedFile,
  CreateFileSignedUrl,
  UploadPrivateFile
};
