import { meldraAi } from './meldraClient';

import { core } from '@/lib/meldra';

export const Core = core.Core;

export const InvokeLLM = core.InvokeLLM;

export const Core = meldraAi.integrations.Core;

export const InvokeLLM = meldraAi.integrations.Core.InvokeLLM;

export const SendEmail = meldraAi.integrations.Core.SendEmail;

export const UploadFile = meldraAi.integrations.Core.UploadFile;

export const GenerateImage = meldraAi.integrations.Core.GenerateImage;

export const ExtractDataFromUploadedFile = meldraAi.integrations.Core.ExtractDataFromUploadedFile;

export const CreateFileSignedUrl = meldraAi.integrations.Core.CreateFileSignedUrl;

export const UploadPrivateFile = meldraAi.integrations.Core.UploadPrivateFile;






