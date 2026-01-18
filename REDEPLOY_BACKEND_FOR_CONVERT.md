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
