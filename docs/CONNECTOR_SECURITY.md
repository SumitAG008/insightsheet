# Meldra connectors: authentication and security

How Meldra Unified Reporting connects to enterprise systems (SAP SuccessFactors, S/4HANA,
Microsoft 365, Workday, Salesforce, QuickBooks, Stripe, Kyriba and any REST/OData/GraphQL/SOAP API),
written for customer security reviews.

## No IP allowlisting needed

Meldra signs in with **tokens**, not network location. The customer grants access by registering
Meldra as an OAuth client (usually with an X.509 certificate). Access can be scoped, rotated and
revoked in the customer's own admin console, and does not depend on Meldra's server IP.

| Method | Standard | Typical systems | Secret held by Meldra |
|---|---|---|---|
| OAuth 2.0 SAML 2.0 bearer | RFC 7522 | SAP SuccessFactors, SAP BTP, S/4HANA | None stored: assertion signed per request with the customer's key |
| OAuth 2.0 JWT bearer | RFC 7523 §2.1 | Salesforce, Google service accounts | None stored: JWT signed per request |
| OAuth 2.0 client credentials + private_key_jwt | RFC 6749 §4.4, RFC 7523 §2.2 | Microsoft Entra ID / Graph, SAP BTP, Auth0, Okta | None stored: certificate-based client assertion (x5t thumbprint) |
| OAuth 2.0 client credentials + client secret | RFC 6749 §4.4 | Kyriba, S/4HANA communication arrangements | None stored |
| OAuth 2.0 refresh token | RFC 6749 §6 | Workday API clients, QuickBooks (rotating) | None stored: a rotated token is shown to the user once |
| Bearer token / API key / Basic | RFC 6750 / RFC 7617 | Stripe restricted keys, legacy APIs | None stored |

A pre-signed SAML assertion from the customer's own IdP can also be passed in, so the private key
never has to be given to Meldra.

If a system still requires a fixed source IP, set `CONNECTOR_EGRESS_PROXY` (an outbound proxy
with static IPs) and `CONNECTOR_EGRESS_IPS` (the IPs to show customers) on the backend. The
connector form then lists those IPs.

## Controls

| Area | Control | Where |
|---|---|---|
| Credentials | Keys, secrets and tokens are used for one request, kept only in memory, never written to the database, logs or browser storage. Only the non-secret settings (token URL, client ID, subject) are kept so a source can be refreshed. | `connector_auth.py`, `authConfig.js publicAuth()` |
| Error handling | Errors show the standard OAuth error code; any secret the user sent is redacted; key parsing errors never echo the key; malformed auth is rejected without echoing it. | `api_connector_service.redact()`, `main.py` |
| Assertions | SAML: RSA-SHA256, exclusive C14N, enveloped signature after Issuer, 5-minute validity, audience and recipient restricted. JWT: 5-minute expiry, unique `jti`, RS/PS/ES algorithms. | `connector_auth.py` |
| Transport | HTTPS only with certificate verification; target and token hosts must resolve to public IPs and requests are pinned to the checked IP (no SSRF or DNS rebinding); no redirects; paging links must stay on the same host so credentials are never sent elsewhere. | `api_connector_service.check_url()` |
| Abuse limits | Signed-in users only; 30 pulls per user per 10 minutes; 50 MB per response, 200 MB and 500 pages per pull, 150 s total. | `allow_call()`, constants |
| Audit | Each pull is recorded as a user activity; logs contain the host name only (no paths, queries or data). | `main.py` |
| Data residency | Records go to the user's browser and stay there (IndexedDB); they are deleted on logout or session expiry. The AI planner sees column names only. | `storage.js`, `clearAppData.js` |

## Testing

- `backend/tests/test_connector_auth.py`: every grant, run against mock token endpoints that verify
  signatures with the certificate (SAML with signxml, JWTs with PyJWT), tampering detection,
  encrypted keys, token rotation, redaction, rate limit, Stripe paging.
- `backend/tests/test_connector_endpoints.py`: the real FastAPI endpoints, covering login required, 400/422
  without echoing secrets, the 429 rate limit, and a full SuccessFactors SAML bearer flow.
- `e2e/connector-auth/`: a browser run of the real UI against the real backend with only the
  external IdPs simulated. It checks SuccessFactors, Microsoft Graph and QuickBooks, rejection
  messages, and that no secret reaches browser storage or the server log.

## Not yet covered

- Mutual TLS (client certificates on the API call itself) and the OAuth authorization-code flow
  (interactive user consent).
- Tested against simulated identity providers only; each real tenant (SuccessFactors, Entra ID,
  Salesforce, Workday) must be tried once with the customer before go-live.
- Single sign-on into Meldra itself (SAML 2.0 / OIDC) is a separate item (PLT-09).
