/**
 * Connector authentication settings shared by the UI.
 * Secrets are sent once to the backend and never kept (mirrors SECRET_FIELDS in
 * backend/app/services/connector_auth.py).
 */
export const AUTH_LABEL = {
  oauth2_client_credentials: 'OAuth 2.0 client credentials',
  oauth2_saml_bearer: 'OAuth 2.0 SAML 2.0 bearer (certificate)',
  oauth2_jwt_bearer: 'OAuth 2.0 JWT bearer (certificate)',
  oauth2_refresh_token: 'OAuth 2.0 refresh token',
  basic: 'User name and password',
  bearer: 'Bearer token / access token',
  api_key: 'API key',
  none: 'None',
};
export const TOKEN_TYPES = ['oauth2_client_credentials', 'oauth2_refresh_token', 'oauth2_jwt_bearer', 'oauth2_saml_bearer'];

/** Auth fields that must never be kept after the request (mirrors SECRET_FIELDS in the backend). */
export const SECRET_AUTH_FIELDS = ['password', 'token', 'key_value', 'client_secret', 'refresh_token', 'private_key', 'passphrase', 'assertion', 'certificate'];
export const publicAuth = (auth) => Object.fromEntries(Object.entries(auth || {}).filter(([k]) => !SECRET_AUTH_FIELDS.includes(k)));

export const SAML_OR_JWT = ['oauth2_jwt_bearer', 'oauth2_saml_bearer'];

/** Default client authentication when the user didn't choose one. */
export function withClientAuth(auth) {
  if (!TOKEN_TYPES.includes(auth.type) || auth.client_auth) return auth;
  return { ...auth, client_auth: SAML_OR_JWT.includes(auth.type) ? 'none' : 'client_secret_post' };
}
