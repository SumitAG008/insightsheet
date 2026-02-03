# Multi-Format AI Ingestion (DOCX/XLSX/PPTX/MD/PDF)

## What problem this solves
The product previously accepted mainly tabular uploads (CSV/XLSX/XLS) for AI analysis. This change adds **safe server-side ingestion** for common document formats so users can attach files to AI entry points without converting them manually.

Supported document formats:
- `.pdf`
- `.docx`
- `.pptx`
- `.md`
- `.xlsx` / `.xls`

## Backend changes

### New service
- **File:** `backend/app/services/ingestion_service.py`
- **Purpose:** Extract text/tables from uploaded documents with limits (size/rows/sheets/pages) and build a prompt block that can be appended to an LLM prompt.

### New in-app (JWT) multipart endpoints
These endpoints keep existing JSON endpoints intact and add *new* `*-with-file` routes:

1) **LLM Invoke with File**
- `POST /api/integrations/llm/invoke-with-file`
- `multipart/form-data` fields:
  - `prompt` (string)
  - `add_context_from_internet` (bool, optional)
  - `response_json_schema` (stringified JSON, optional)
  - `file` (UploadFile)
- Response: JSON with model response.

2) **Support Chat with File**
- `POST /api/support/chat-with-file`
- `multipart/form-data` fields:
  - `message` (string)
  - `page` (string, optional)
  - `file` (UploadFile)
- Response: JSON with assistant answer.

3) **Generate P&L with File**
- `POST /api/files/generate-pl-with-file`
- `multipart/form-data` fields:
  - `prompt` (string)
  - `context_json` (stringified JSON, optional)
  - `file` (UploadFile)
- Response: XLSX as a streamed file download.

### New developer (API-key) endpoints
These are for external customers using API keys (used by the Developer Portal testing console):

1) **Developer AI Invoke with File**
- `POST /api/developer/ai/invoke-with-file`
- Fields: `api_key`, `prompt`, `add_context_from_internet` (optional), `response_json_schema` (optional), `file`
- Response: JSON

2) **Developer Support Chat with File**
- `POST /api/developer/support/chat-with-file`
- Fields: `api_key`, `message`, `page` (optional), `file`
- Response: JSON

3) **Developer Generate P&L with File**
- `POST /api/developer/files/generate-pl-with-file`
- Fields: `api_key`, `prompt`, `context_json` (optional), `file`
- Response: XLSX download

### Important operational behavior
- File size limits enforced by plan (standard vs premium/enterprise).
- Existing quota/email verification logic is enforced on in-app endpoints.

## Frontend changes

### API client
- **File:** `src/api/meldraClient.js`
- Added multipart methods:
  - `backendApi.llm.invokeWithFile`
  - `backendApi.support.chatWithFile`
  - `backendApi.files.generatePLWithFile`

### Upload component
- **File:** `src/components/upload/FileUploadZone.jsx`
- Added `acceptedFormats` prop.
- CSV/XLSX/XLS are parsed in-browser as before.
- Non-tabular formats (`pdf/docx/pptx/md`) are **passed through** without parsing so the page can call the `*-with-file` endpoints.

### AgenticAI page
- **File:** `src/pages/AgenticAI.jsx`
- Single upload control accepts: `.csv, .xlsx, .xls, .docx, .pptx, .md, .pdf`.
- Shows badge:
  - **Local tabular** for CSV/Excel
  - **Server-ingested document** for doc/ppt/pdf/md

### Support chat widget
- **File:** `src/components/SupportChatWidget.jsx`
- Optional file attachment that switches to `chatWithFile`.

### P&L builder
- **File:** `src/pages/PLBuilder.jsx`
- Optional file attachment that switches to `generatePLWithFile`.

### Developer Portal testing console
- **File:** `src/components/ApiTestingConsole.jsx`
- Added test options for:
  - AI Invoke with File
  - Support Chat with File
  - Generate P&L with File

## Deployment notes (why UI may still look old)
If you still see only `.CSV/.XLSX/.XLS` on the UI, it usually means:
- The domain is pointing to a different Vercel project than the one deploying the latest commit, OR
- Browser cache/service worker is serving an older build.

Recommended checks:
- In Vercel, confirm `insight.meldra.ai` is attached to the project deploying commits `db3a86c` / `1eabe1b`.
- Hard refresh: `Ctrl + Shift + R`
- Clear site data for `insight.meldra.ai` and reload.
