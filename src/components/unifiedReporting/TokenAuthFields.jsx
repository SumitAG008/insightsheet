import { useRef } from 'react';
import PropTypes from 'prop-types';
import { SAML_OR_JWT } from '@/lib/unifiedReporting/authConfig';

const input = 'w-full rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-900';
const label = 'block text-xs font-medium text-slate-600 dark:text-slate-300';

const CLIENT_AUTH = {
  client_secret_post: 'Client secret (in request body)',
  client_secret_basic: 'Client secret (HTTP Basic header)',
  private_key_jwt: 'Private key / certificate (signed JWT)',
  none: 'None (identified by the assertion)',
};

function Field({ name, hint, children, wide }) {
  return (
    <label className={`${label} ${wide ? 'sm:col-span-2' : ''}`}>
      <span className="mb-1 block">{name}{hint && <span className="font-normal text-slate-400"> · {hint}</span>}</span>
      {children}
    </label>
  );
}
Field.propTypes = { name: PropTypes.string.isRequired, hint: PropTypes.string, children: PropTypes.node, wide: PropTypes.bool };

/** A PEM key or certificate: paste it or load it from a file (read in the browser, sent once, never kept). */
function PemField({ name, value, onChange, placeholder }) {
  const file = useRef(null);
  return (
    <Field name={name} wide>
      <div className="flex gap-2">
        <textarea className={`${input} min-h-[64px] flex-1 font-mono text-[11px]`} value={value || ''} placeholder={placeholder} spellCheck={false} autoComplete="off" onChange={(e) => onChange(e.target.value)} />
        <div className="flex flex-col gap-1">
          <input ref={file} type="file" accept=".pem,.key,.crt,.cer,.txt" className="hidden" onChange={async (e) => { const f = e.target.files?.[0]; if (f) onChange(await f.text()); e.target.value = ''; }} />
          <button type="button" className="rounded-md border border-slate-200 px-2 py-1 text-xs hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800" onClick={() => file.current?.click()}>From file</button>
          {value && <button type="button" className="rounded-md px-2 py-1 text-xs text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800" onClick={() => onChange('')}>Clear</button>}
        </div>
      </div>
    </Field>
  );
}
PemField.propTypes = { name: PropTypes.string.isRequired, value: PropTypes.string, onChange: PropTypes.func.isRequired, placeholder: PropTypes.string };

/** Fields for the OAuth 2.0 token grants; auth holds the values, a(patch) updates them. */
export default function TokenAuthFields({ auth, a }) {
  const t = auth.type;
  const assertionGrant = SAML_OR_JWT.includes(t);
  const clientAuth = auth.client_auth || (assertionGrant ? 'none' : 'client_secret_post');
  const needsKey = assertionGrant ? !(t === 'oauth2_saml_bearer' && auth.assertion) : clientAuth === 'private_key_jwt';
  const withSecret = clientAuth === 'client_secret_post' || clientAuth === 'client_secret_basic';
  const pw = (k) => ({ type: 'password', autoComplete: 'new-password', value: auth[k] || '', onChange: (e) => a({ [k]: e.target.value }) });
  const tx = (k) => ({ value: auth[k] || '', onChange: (e) => a({ [k]: e.target.value }) });
  return (
    <>
      <Field name="Token URL" wide><input className={`${input} font-mono text-xs`} {...tx('token_url')} placeholder="https://…/oauth/token" spellCheck={false} /></Field>
      <Field name={t === 'oauth2_saml_bearer' ? 'Client ID (API key)' : t === 'oauth2_jwt_bearer' ? 'Client ID (consumer key)' : 'Client ID'}><input className={input} autoComplete="off" {...tx('client_id')} /></Field>
      <Field name="Client authentication">
        <select className={input} value={clientAuth} onChange={(e) => a({ client_auth: e.target.value })}>
          {Object.entries(CLIENT_AUTH).filter(([k]) => assertionGrant || k !== 'none').map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </Field>
      {withSecret && <Field name="Client secret" wide><input className={input} {...pw('client_secret')} /></Field>}
      {t === 'oauth2_refresh_token' && <Field name="Refresh token" wide><input className={input} {...pw('refresh_token')} /></Field>}
      {assertionGrant && (
        <>
          <Field name={t === 'oauth2_saml_bearer' ? 'Subject (user ID)' : 'Subject (user name)'}><input className={input} autoComplete="off" {...tx('subject')} /></Field>
          <Field name="Assertion audience"><input className={input} {...tx('audience')} placeholder="token URL if empty" /></Field>
        </>
      )}
      {t === 'oauth2_saml_bearer' && (
        <>
          <Field name="Issuer"><input className={input} {...tx('issuer')} placeholder="client ID if empty" /></Field>
          <Field name="Company ID" hint="SuccessFactors"><input className={input} {...tx('company_id')} /></Field>
          <label className="flex items-center gap-2 text-xs text-slate-600 sm:col-span-2 dark:text-slate-300">
            <input type="checkbox" className="h-3.5 w-3.5 accent-blue-600" checked={Boolean(auth.api_key_attribute)} onChange={(e) => a({ api_key_attribute: e.target.checked })} />
            Add the client ID as the <code>api_key</code> attribute (required by SuccessFactors)
          </label>
        </>
      )}
      {needsKey && (
        <>
          <PemField name="Private key (PEM)" value={auth.private_key} onChange={(v) => a({ private_key: v })} placeholder="-----BEGIN PRIVATE KEY-----" />
          <Field name="Key passphrase" hint="if encrypted"><input className={input} {...pw('passphrase')} /></Field>
          {t !== 'oauth2_saml_bearer' && (
            <Field name="Signing algorithm">
              <select className={input} value={auth.algorithm || 'RS256'} onChange={(e) => a({ algorithm: e.target.value })}>
                {['RS256', 'RS384', 'RS512', 'PS256', 'ES256'].map((x) => <option key={x}>{x}</option>)}
              </select>
            </Field>
          )}
          <PemField name="Certificate (PEM)" value={auth.certificate} onChange={(v) => a({ certificate: v })} placeholder="-----BEGIN CERTIFICATE----- (optional; Entra ID needs it for the thumbprint)" />
          {t !== 'oauth2_saml_bearer' && <Field name="Key ID (kid)" hint="optional"><input className={input} {...tx('key_id')} /></Field>}
        </>
      )}
      {t === 'oauth2_saml_bearer' && (
        <Field name="Pre-signed SAML assertion" hint="optional, from your IdP (base64); replaces the key" wide>
          <input className={`${input} font-mono text-xs`} {...pw('assertion')} />
        </Field>
      )}
      {!assertionGrant && (
        <>
          <Field name="Scope" hint="optional"><input className={input} {...tx('scope')} /></Field>
          <Field name="Audience / resource" hint="optional"><input className={input} {...tx('audience')} /></Field>
        </>
      )}
      {assertionGrant && <Field name="Scope" hint="optional"><input className={input} {...tx('scope')} /></Field>}
    </>
  );
}
TokenAuthFields.propTypes = { auth: PropTypes.object.isRequired, a: PropTypes.func.isRequired };
