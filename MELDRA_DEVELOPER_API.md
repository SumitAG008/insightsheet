# developer.meldra.ai — API Endpoints for Meldra App

The app calls **developer.meldra.ai** (or `VITE_MELDRA_DEVELOPER_API_URL`) for:

- **PDF → DOC** and **DOC → PDF**
- **ZIP Cleaner** (optional; app also supports in-browser ZIP processing)

These endpoints require a **Meldra API key** (paid). Users set the key in **Security → Meldra API Key**.

---

## Base URL

- Production: `https://api.developer.meldra.ai`  
- Override: `VITE_MELDRA_DEVELOPER_API_URL` in the frontend env.

---

## Authentication

All requests must include:

```http
X-API-Key: <meldra_api_key>
```

---

## 1. PDF to DOC

- **URL:** `POST /v1/convert/pdf-to-doc`
- **Body:** `multipart/form-data` with:
  - `file`: PDF file (binary)
- **Response:** `200` with body = `.docx` binary (Content-Disposition or `application/vnd.openxmlformats-officedocument.wordprocessingml.document`).
- **Errors:** `4xx`/`5xx` with body as plain text or JSON `{ "detail": "..." }`.

---

## 2. DOC to PDF

- **URL:** `POST /v1/convert/doc-to-pdf`
- **Body:** `multipart/form-data` with:
  - `file`: `.doc` or `.docx` file (binary)
- **Response:** `200` with body = `.pdf` binary.
- **Errors:** same as above.

---

## 3. ZIP Cleaner (optional)

- **URL:** `POST /v1/zip/clean`
- **Body:** `multipart/form-data` with:
  - `file`: ZIP file (binary)
  - `options`: (optional) JSON string, e.g.  
    `{"allowedCharacters":"...","replacementCharacter":"-","disallowedCharacters":"",...}`
- **Response:** `200` with body = processed ZIP (binary).
- **Errors:** same as above.

The Meldra app’s **ZIP Cleaner** page can use this when “Meldra API” is enabled and a key is set. The in-browser implementation remains the default.

---

## Client usage

- **PDF↔DOC:** `src/api/meldraDeveloperApi.js` → `convertPdfToDoc`, `convertDocToPdf`.
- **ZIP:** `zipClean(file, options, apiKey)` — used when/if the FilenameCleaner “Meldra API” mode is implemented.

---

## Implementing the backend

You can:

1. **Run a separate service** at `api.developer.meldra.ai` that implements these routes and validates `X-API-Key` (e.g. against your DB or a key store), or  
2. **Add these routes to your existing backend** (e.g. FastAPI on Railway) and set `VITE_MELDRA_DEVELOPER_API_URL` to that base URL.

For PDF↔DOC you’ll need a library such as `pdf2docx` / `python-docx` / `reportlab` or a similar stack, depending on the runtime. For ZIP, use your existing ZIP logic and apply the `options` (allowed chars, replacement, etc.) to filenames inside the archive.
