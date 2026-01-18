# Why developer.meldra.ai Is Not Working

**developer.meldra.ai** is the planned API portal for the Meldra API (document conversion, ZIP Cleaner, etc.). It is **not yet deployed or configured**, so the URL does not resolve or load.

## What’s needed for it to work

### 1. DNS

Add DNS records for the `meldra.ai` domain:

- **developer.meldra.ai**  
  - Type: `CNAME` or `A`  
  - Value: the host that will serve the developer portal (e.g. a Vercel project or your frontend host).

- **api.developer.meldra.ai** (optional, if you run a separate API)  
  - Type: `CNAME` or `A`  
  - Value: the host for the API (e.g. Railway or another backend).

Until these exist, `developer.meldra.ai` will not resolve (e.g. `DNS_PROBE_FINISHED_NXDOMAIN`).

### 2. Hosting

- **developer.meldra.ai (portal)**  
  - A separate app (e.g. Vercel project) with:
    - Docs for the Meldra API
    - API key signup/management
    - A simple “test” or “try it” flow

- **api.developer.meldra.ai (optional)**  
  - Only if you want a **separate** API for `X-API-Key` callers.  
  - Today, document conversion and ZIP Cleaner in the **in-app** flow use **insight.meldra.ai** → **insightsheet-production.up.railway.app** and do **not** use developer.meldra.ai.

### 3. In-app vs developer.meldra.ai

- **Document Converter (PDF/DOC/PPT)** and **ZIP Cleaner** work **in-app** without developer.meldra.ai or an API key. They use the Railway backend.
- **developer.meldra.ai** is for **programmatic** use: external apps calling the Meldra API with a paid API key. Until the portal and (optionally) api.developer.meldra.ai are deployed, that use is not available.

## What to do in the meantime

1. Use **Document Converter** and **ZIP Cleaner** in the app; no developer.meldra.ai or API key required.
2. For API access or when the portal is ready: contact **support@meldra.ai**.
3. When you’re ready to launch developer.meldra.ai: add the DNS records above and deploy the portal (and optional API) as in `MELDRA_DEVELOPER_API.md`.
