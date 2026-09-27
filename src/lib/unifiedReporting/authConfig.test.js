import { describe, it, expect } from 'vitest';
import { publicAuth, withClientAuth } from './authConfig';

describe('connector auth settings', () => {
  it('keeps only non-secret settings for a later refresh', () => {
    const auth = {
      type: 'oauth2_saml_bearer', token_url: 'https://api4.successfactors.com/oauth/token', client_id: 'KEY', company_id: 'ACME',
      subject: 'apiuser', private_key: '-----BEGIN PRIVATE KEY-----x', passphrase: 'p', certificate: 'c', assertion: 'a',
      client_secret: 's', refresh_token: 'r', password: 'pw', token: 't', key_value: 'k',
    };
    expect(publicAuth(auth)).toEqual({ type: 'oauth2_saml_bearer', token_url: 'https://api4.successfactors.com/oauth/token', client_id: 'KEY', company_id: 'ACME', subject: 'apiuser' });
  });

  it('fills in the client authentication method', () => {
    expect(withClientAuth({ type: 'oauth2_saml_bearer' }).client_auth).toBe('none');
    expect(withClientAuth({ type: 'oauth2_client_credentials' }).client_auth).toBe('client_secret_post');
    expect(withClientAuth({ type: 'oauth2_client_credentials', client_auth: 'private_key_jwt' }).client_auth).toBe('private_key_jwt');
    expect(withClientAuth({ type: 'basic' })).toEqual({ type: 'basic' });
  });
});
