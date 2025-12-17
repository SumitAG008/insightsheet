/**
 * Meldra Integrations
 *
 * This file exports core integrations from the Meldra library.
 * For advanced AI, ML, UI, and backend utilities, import from @/lib/meldra
 *
 * @example
 * import { InvokeLLM } from '@/api/integrations';
 * // or for full library access:
 * import { core, ai, ml, ui, backend } from '@/lib/meldra';
 */

import { core } from '@/lib/meldra';

export const Core = core.Core;

export const InvokeLLM = core.InvokeLLM;

export const SendEmail = core.SendEmail;

export const UploadFile = core.UploadFile;

export const GenerateImage = core.GenerateImage;

export const ExtractDataFromUploadedFile = core.ExtractDataFromUploadedFile;

export const CreateFileSignedUrl = core.CreateFileSignedUrl;

export const UploadPrivateFile = core.UploadPrivateFile;






