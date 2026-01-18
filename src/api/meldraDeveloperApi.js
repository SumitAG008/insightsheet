/**
 * developer.meldra.ai API client — for external/API use only.
 *
 * Used when calling Meldra from your own apps (requires Meldra API key via developer.meldra.ai).
 * The in-app Document Converter and ZIP Cleaner do NOT use this module; they use the main
 * backend with your Meldra login (JWT) and require no API key.
 * Base URL: VITE_MELDRA_DEVELOPER_API_URL or https://api.developer.meldra.ai
 */

const BASE = typeof import.meta !== 'undefined' && import.meta.env?.VITE_MELDRA_DEVELOPER_API_URL
  ? import.meta.env.VITE_MELDRA_DEVELOPER_API_URL
  : 'https://api.developer.meldra.ai';

function getApiKey() {
  return typeof window !== 'undefined' ? localStorage.getItem('meldra_api_key') : null;
}

/**
 * @param {string} path - e.g. /v1/convert/pdf-to-doc
 * @param {FormData} form
 * @param {string} apiKey
 * @returns {Promise<Blob>}
 */
async function _postFile(path, form, apiKey) {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'X-API-Key': apiKey },
    body: form,
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(t || `HTTP ${res.status}`);
  }
  return res.blob();
}

/**
 * PDF → DOC (Word). Requires developer.meldra.ai and Meldra API key (paid).
 * @param {File} file - .pdf
 * @param {string} [apiKey] - defaults to localStorage meldra_api_key
 * @returns {Promise<Blob>} - .docx
 */
export async function convertPdfToDoc(file, apiKey = getApiKey()) {
  if (!apiKey) throw new Error('Meldra API key required. Add it in Security → Meldra API Key. Get your key at developer.meldra.ai (paid).');
  const form = new FormData();
  form.append('file', file);
  return _postFile('/v1/convert/pdf-to-doc', form, apiKey);
}

/**
 * DOC/DOCX → PDF. Requires developer.meldra.ai and Meldra API key (paid).
 * @param {File} file - .doc or .docx
 * @param {string} [apiKey] - defaults to localStorage meldra_api_key
 * @returns {Promise<Blob>} - .pdf
 */
export async function convertDocToPdf(file, apiKey = getApiKey()) {
  if (!apiKey) throw new Error('Meldra API key required. Add it in Security → Meldra API Key. Get your key at developer.meldra.ai (paid).');
  const form = new FormData();
  form.append('file', file);
  return _postFile('/v1/convert/doc-to-pdf', form, apiKey);
}

/**
 * PPT/PPTX → PDF. Requires developer.meldra.ai and Meldra API key (paid).
 * @param {File} file - .ppt or .pptx
 * @param {string} [apiKey] - defaults to localStorage meldra_api_key
 * @returns {Promise<Blob>} - .pdf
 */
export async function convertPptToPdf(file, apiKey = getApiKey()) {
  if (!apiKey) throw new Error('Meldra API key required. Add it in Security → Meldra API Key. Get your key at developer.meldra.ai (paid).');
  const form = new FormData();
  form.append('file', file);
  return _postFile('/v1/convert/ppt-to-pdf', form, apiKey);
}

/**
 * PDF → PPT/PPTX. Requires developer.meldra.ai and Meldra API key (paid).
 * @param {File} file - .pdf
 * @param {string} [apiKey] - defaults to localStorage meldra_api_key
 * @returns {Promise<Blob>} - .pptx
 */
export async function convertPdfToPpt(file, apiKey = getApiKey()) {
  if (!apiKey) throw new Error('Meldra API key required. Add it in Security → Meldra API Key. Get your key at developer.meldra.ai (paid).');
  const form = new FormData();
  form.append('file', file);
  return _postFile('/v1/convert/pdf-to-ppt', form, apiKey);
}

/**
 * ZIP Cleaner via developer.meldra.ai. Requires Meldra API key (paid).
 * @param {File} file - .zip
 * @param {object} [options] - { allowedCharacters, replacementCharacter, ... }
 * @param {string} [apiKey] - defaults to localStorage meldra_api_key
 * @returns {Promise<Blob>} - processed .zip
 */
export async function zipClean(file, options = {}, apiKey = getApiKey()) {
  if (!apiKey) throw new Error('Meldra API key required. Add it in Security → Meldra API Key. Get your key at developer.meldra.ai (paid).');
  const form = new FormData();
  form.append('file', file);
  if (options && typeof options === 'object') {
    form.append('options', JSON.stringify(options));
  }
  return _postFile('/v1/zip/clean', form, apiKey);
}

export { getApiKey, BASE };
