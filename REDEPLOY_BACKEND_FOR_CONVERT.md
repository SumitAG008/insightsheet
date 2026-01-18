# Redeploy Backend for Document Converter and IP Lookup

The **Document Converter** (PDF→DOC, DOC→PDF, PPT→PDF) and **IP lookup** (for login/logout and activity) need the latest backend on Railway.

## 404 on `/api/convert/pdf-to-doc`

If the frontend shows **"Failed to fetch"** or the console reports **404** on `.../api/convert/pdf-to-doc`, the deployed backend does not yet have these routes.

## What to do

1. **Push the latest code** (including `backend/app/main.py`, `backend/app/services/document_converter_service.py`, `backend/requirements.txt`) to the `main` branch.
2. **Redeploy the backend on Railway** from that branch so it:
   - Installs `pdf2docx` (and existing deps) via `pip install -r requirements.txt`
   - Serves the new routes:
     - `POST /api/convert/pdf-to-doc`
     - `POST /api/convert/doc-to-pdf`
     - `POST /api/convert/ppt-to-pdf`
     - `POST /api/convert/pdf-to-ppt`
     - `GET /api/ip-lookup`
3. **Confirm `VITE_API_URL`** for the frontend (Vercel) points to the Railway backend URL, e.g. `https://insightsheet-production.up.railway.app`.

## CORS

The backend allows `https://insight.meldra.ai`. If the frontend origin changes, add it to `CORS_ORIGINS` or to `PRODUCTION_ORIGINS` in `backend/app/main.py`.

## IP lookup and ipapi.co CORS

The frontend no longer calls `https://ipapi.co/json/` from the browser (to avoid CORS). It uses `GET /api/ip-lookup`, which proxies to ipapi.co on the server. After redeploying, IP/location for login and activity should work without CORS errors.

### 429 Too Many Requests from ipapi.co

If logs show `ip-lookup proxy failed: 429 Client Error: Too Many Requests`, the backend now:

- **Uses the client’s IP** (`X-Forwarded-For` / `X-Real-IP`) when calling ipapi.co so lookups are per user.
- **Caches results for 1 hour** (in memory) to cut down on calls.
- **On 429:** tries **ip-api.com** as a fallback for that request; if that also fails, returns a neutral `{ "ip": null, "city": null, "country_name": null, "country_code": "XX" }` and logs at INFO instead of WARNING.

## Extended session for testing (fewer logins)

To stay logged in longer when testing, set these in the backend (e.g. Railway) environment:

- `DEV_EXTENDED_SESSION_EMAIL` = your email (e.g. `sumit@meldra.ai`)
- `ACCESS_TOKEN_EXPIRE_MINUTES_DEV` = `10080` (7 days) or e.g. `1440` (24 hours)

When that email logs in, the token and cookie use the extended lifetime. All other users keep the default 30 minutes.
