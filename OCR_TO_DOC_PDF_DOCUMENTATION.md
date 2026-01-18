# OCR to DOC & OCR to PDF — Feature Documentation

This document describes the **OCR to DOC** and **OCR to PDF** feature added to InsightSheet-lite / Meldra. Users can upload any image (scans, photos, forms, screenshots), extract text via OCR, edit it, save a draft, and download as an editable Word document (.docx) or searchable PDF.

---

## Table of Contents

1. [Overview](#overview)
2. [User Flow](#user-flow)
3. [Backend Changes](#backend-changes)
4. [Frontend Changes](#frontend-changes)
5. [API Reference](#api-reference)
6. [Dependencies](#dependencies)
7. [Deployment & Tesseract](#deployment--tesseract)
8. [File Checklist](#file-checklist)
9. [Troubleshooting](#troubleshooting)

---

## Overview

| Item | Details |
|------|---------|
| **Feature** | OCR to DOC, OCR to PDF |
| **Input** | Images: JPG, JPEG, PNG, WebP, BMP, TIFF, TIF, GIF |
| **Output** | Editable .docx (Word) or .pdf (searchable/selectable text) |
| **Auth** | Required (JWT); uses `get_current_user` |
| **File size** | 10 MB (free), 500 MB (premium); same as other file tools |
| **Storage** | Zero: files and OCR text are not stored; only processing history is logged |

---

## User Flow

1. **Upload** — User selects an image (scan, photo, form, screenshot).
2. **Run OCR** — Backend extracts text with Tesseract; frontend shows it in an editable text area.
3. **Edit / Fill** — User can correct OCR mistakes or fill in blanks.
4. **Save** — Optional: saves current text to `sessionStorage` as a draft for the session.
5. **Download** — User picks **Download as DOC** or **Download as PDF**; backend generates a **form-like** file (sections, fill-in lines, tables, checkboxes) from the (possibly edited) text so the output resembles the original form and can be completed in Word or a PDF viewer.

---

## Backend Changes

### 1. New Service: `backend/app/services/ocr_service.py`

| Method | Purpose |
|--------|---------|
| `extract_text(image_data)` | Runs Tesseract OCR on image bytes/file-like; returns plain text. |
| `text_to_docx(text, title)` | Builds a .docx from text using `python-docx`. **Form-aware:** preserves sections, label+underline fields, tables, and checkbox placeholders (☐) so the output is editable like the original form. |
| `text_to_pdf(text, title)` | Builds a .pdf from text using `reportlab` (text is selectable/searchable). **Form-aware:** same structure as DOCX—sections, fill-in underlines, tables, and ☐ checkboxes. |
| `is_ocr_available()` | Class method: checks if `pytesseract` and Tesseract binary are available. |

**Constants**

- `ALLOWED_IMAGE_EXTENSIONS`: `{'.jpg', '.jpeg', '.png', '.webp', '.bmp', '.tiff', '.tif', '.gif'}`

**Error handling**

- `pytesseract.TesseractNotFoundError` → `RuntimeError` with install instructions.
- Missing `python-docx` or `reportlab` → `RuntimeError` in `text_to_docx` / `text_to_pdf`.

---

### 2. New Endpoints in `backend/app/main.py`

#### `POST /api/files/ocr-extract`

- **Auth:** Required.
- **Body:** `multipart/form-data` with `file` (image).
- **Response:** `{"text": "<extracted text>"}`.
- **Behavior:**
  - Validates extension against `OCRService.ALLOWED_IMAGE_EXTENSIONS`.
  - Applies subscription-based file size limit (10 MB / 500 MB).
  - Logs `FileProcessingHistory` with `processing_type="ocr_extract"`.
- **Errors:** 400 (invalid type), 413 (size), 503 (Tesseract/deps missing), 500 (other).

#### `POST /api/files/ocr-export`

- **Auth:** Required.
- **Body:** JSON  
  `{ "text": string, "format": "doc" | "pdf", "title"?: string }`
- **Response:** Binary file (`.docx` or `.pdf`) with `Content-Disposition: attachment`.
- **Behavior:**
  - Builds .docx or .pdf from `text` and optional `title`.
  - Logs `FileProcessingHistory` with `processing_type="ocr_to_doc"` or `"ocr_to_pdf"`.
- **Errors:** 400 (`format` not `doc`/`pdf`), 500 (other).

**Pydantic model:**

```python
class OCRExportRequest(BaseModel):
    text: str
    format: str   # "doc" or "pdf"
    title: Optional[str] = "OCR Document"
```

---

### 3. `backend/requirements.txt`

Added:

```
reportlab==4.2.5
pytesseract==0.3.13
python-docx==1.1.2
```

`Pillow` was already present; it is used by `ocr_service` for image handling.

---

### 4. `backend/Dockerfile`

- `tesseract-ocr` added to `apt-get install` so OCR works in Docker/Railway (or similar):

```dockerfile
RUN apt-get update && apt-get install -y \
    gcc g++ libpq-dev libmagic1 \
    tesseract-ocr \
    && rm -rf /var/lib/apt/lists/*
```

---

## Frontend Changes

### 1. New Page: `src/pages/OCRConverter.jsx`

- **Route:** `/OCRConverter` and `/ocrconverter` (both in `index.jsx`).
- **Nav:** "OCR to DOC/PDF" with `ScanLine` icon in `Layout.jsx` (desktop and mobile).

**State:** `file`, `extracting`, `ocrDone`, `text`, `exporting`, `error`, `user`, `subscription`, `saved`.

**Actions:**

- `handleFileChange` — Validates image type and size; sets `file`, clears `text` and `ocrDone`.
- `handleRunOCR` — Calls `backendApi.files.ocrExtract(file)`, sets `text` and `ocrDone`.
- `handleSave` — Writes `{ t: text }` to `sessionStorage` under `meldra_ocr_draft`; shows “Saved” briefly.
- `handleExport(format)` — Calls `backendApi.files.ocrExport({ text, format, title })`, then `downloadBlob` with `generateDownloadFilename`.
- `handleReset` — Clears `file`, `text`, `ocrDone`, `error`, `sessionStorage` draft, and file input.

**UI:** Upload zone → file info + “Run OCR” → editable `Textarea` + Save + “Download as DOC” + “Download as PDF” + “New image”. File size alert reflects free (10 MB) vs premium (500 MB).

---

### 2. `src/api/meldraClient.js` — `backendApi.files`

**`ocrExtract(file)`**

- `POST /api/files/ocr-extract` with `FormData` `{ file }`.
- Returns `response.json()` → `{ text }`.
- On non-OK: throws `Error(err.detail || 'OCR extraction failed')`.

**`ocrExport({ text, format, title })`**

- `POST /api/files/ocr-export` with JSON `{ text: text || '', format, title: title || 'OCR Document' }`.
- Returns `response.blob()`.
- On non-OK: throws `Error(err.detail || 'OCR export failed')`.

---

### 3. `src/pages/index.jsx`

- Import: `import OCRConverter from "./OCRConverter";`
- `PAGES.OCRConverter = OCRConverter;`
- Routes:
  - `<Route path="/OCRConverter" element={<ProtectedRoute><OCRConverter /></ProtectedRoute>} />`
  - `<Route path="/ocrconverter" element={<ProtectedRoute><OCRConverter /></ProtectedRoute>} />`

---

### 4. `src/pages/Layout.jsx`

- Import: `ScanLine` from `lucide-react`.
- New nav link (desktop and mobile):  
  `to={createPageUrl('OCRConverter')}`  
  Label: **OCR to DOC/PDF**  
  Icon: `ScanLine`

---

## API Reference

| Endpoint | Method | Auth | Request | Response |
|----------|--------|------|---------|----------|
| `/api/files/ocr-extract` | POST | Bearer | `file` (image) | `{ "text": "..." }` |
| `/api/files/ocr-export` | POST | Bearer | `{ "text", "format": "doc"\|"pdf", "title"? }` | .docx or .pdf binary |

---

## Dependencies

| Package | Version | Role |
|---------|---------|------|
| `pytesseract` | 0.3.13 | Python wrapper for Tesseract OCR |
| `Pillow` | (existing) | Image loading for `pytesseract` |
| `python-docx` | 1.1.2 | Generate .docx |
| `reportlab` | 4.2.5 | Generate .pdf |

**System:** Tesseract OCR binary must be installed (see [Deployment & Tesseract](#deployment--tesseract)).

---

## Deployment & Tesseract

- **Docker (e.g. Railway):** `tesseract-ocr` in `Dockerfile` is enough.
- **Linux (apt):**  
  `sudo apt-get install tesseract-ocr`
- **macOS:**  
  `brew install tesseract`
- **Windows (local dev):**  
  Install from [Tesseract at UB-Mannheim](https://github.com/UB-Mannheim/tesseract/wiki) and ensure `tesseract` is on `PATH`.

If Tesseract is missing, `ocr-extract` returns **503** with a message that Tesseract must be installed.

---

## File Checklist

| Path | Change |
|------|--------|
| `OCR_TO_DOC_PDF_DOCUMENTATION.md` | **New** — This documentation |
| `README.md` | **Modified** — OCR to DOC/PDF in Features + link to this doc |
| `backend/app/services/ocr_service.py` | **New** — OCR + DOC/PDF generation |
| `backend/app/main.py` | **Modified** — import `OCRService`, `OCRExportRequest`, `POST /api/files/ocr-extract`, `POST /api/files/ocr-export` |
| `backend/requirements.txt` | **Modified** — `pytesseract`, `python-docx`, `reportlab` |
| `backend/Dockerfile` | **Modified** — `tesseract-ocr` in apt install |
| `src/pages/OCRConverter.jsx` | **New** — OCR UI page |
| `src/api/meldraClient.js` | **Modified** — `files.ocrExtract`, `files.ocrExport` |
| `src/pages/index.jsx` | **Modified** — `OCRConverter` import, `PAGES`, routes |
| `src/pages/Layout.jsx` | **Modified** — `ScanLine` import, “OCR to DOC/PDF” nav links |

---

## Troubleshooting

| Issue | What to check |
|-------|----------------|
| **503 / Tesseract not installed** | Install Tesseract (see above); in Docker, ensure `tesseract-ocr` is in the image. |
| **400 Invalid file type** | Use only: .jpg, .jpeg, .png, .webp, .bmp, .tiff, .tif, .gif. |
| **413 File too large** | Respect 10 MB (free) or 500 MB (premium). |
| **OCR returns empty or poor text** | Improve image (resolution, contrast, orientation). Tesseract uses `--psm 6`; for forms, `--psm 3` can be tried in `ocr_service.extract_text` (edit `config`). |
| **Export fails (500)** | Backend logs: `OCR export error`. Confirm `python-docx` and `reportlab` are installed. |
| **“OCR extraction failed” in UI** | Network/backend reachable? `VITE_API_URL` correct? 401/403? Check browser Network tab and backend logs. |

---

## Summary

The OCR to DOC/PDF feature adds:

- **Backend:** `ocr_service.py`, two API routes, new deps, and Tesseract in Docker.
- **Frontend:** `OCRConverter.jsx`, `meldraClient` `ocrExtract`/`ocrExport`, routes, and nav.

Flow: **Upload image → Run OCR → Edit → (optional) Save draft → Download as DOC or PDF.** All processing is in-memory; only `FileProcessingHistory` is persisted.
