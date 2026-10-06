---
title: Use the meldra API
summary: Get an API key, authenticate with the X-API-Key header and call the document conversion and FileName Cleaner endpoints from your own apps.
category: Data and integrations
order: 4
updated: 2026-10-06
---

The meldra API lets your own apps convert documents and clean file names in ZIP archives. This article explains how to get a key, how to authenticate and how to make your first request.

> **Note:** You do not need an API key to use Document Converter or FileName Cleaner inside meldra Insight. They work with your meldra sign-in. The API is only for calling meldra from your own apps.

## What the API does

| Endpoint | What it does |
|---|---|
| `POST /v1/convert/pdf-to-doc` | Converts a PDF to a Word (.docx) file. |
| `POST /v1/convert/doc-to-pdf` | Converts a .doc or .docx file to PDF. |
| `POST /v1/convert/ppt-to-pdf` | Converts a .ppt or .pptx file to PDF. |
| `POST /v1/convert/pdf-to-ppt` | Converts a PDF to PowerPoint (.pptx), one slide per page. |
| `POST /v1/zip/clean` | Cleans the file names inside a ZIP archive. It does not change the file contents. |

Every endpoint takes the file as `multipart/form-data` in a field called `file`, and returns the converted file.

## Open the developer page

Select **Developers** in the navigation bar at the top of the page. The same page is available at developer.meldra.ai.

## Get an API key

There are two kinds of key.

### Sandbox key

A sandbox key lets you try the API. You need a meldra account with a verified email address. Each account can have one sandbox key.

1. Sign in to meldra.
2. On the **Developers** page, under **Sandbox API key (self-serve)**, select **Request Sandbox Key**.
3. Your key appears under **Your sandbox API key (shown once)**, with the **Base URL** to use with it. Select **Copy key** and store it somewhere safe.

meldra also emails the key to your verified email address.

> **Important:** The full key is shown only once. After that, **My API keys (prefix only)** shows just the start of each key. Select **Refresh keys** to update the list.

### Production key

Production use needs a paid API key.

1. Email support@meldra.ai with the subject "meldra API Key Request". You can also select **Request API Key** on the **Developers** page.
2. Include your name, company, intended use and expected usage volume.
3. You receive an email with your key, the base URL to use, and your rate limits and quotas.

## Authenticate

Send your key in the `X-API-Key` header with every request:

```
X-API-Key: your_api_key_here
```

Use the base URL that came with your key. The production base URL is `https://api.developer.meldra.ai`.

> **Tip:** Never put API keys in source code or version control. Keep them in environment variables or a secrets vault.

## Make your first request

This example converts `document.pdf` to Word and saves the result as `document.docx`:

```
curl -X POST "https://api.developer.meldra.ai/v1/convert/pdf-to-doc" \
  -H "X-API-Key: your_api_key_here" \
  -F "file=@document.pdf" \
  -o document.docx
```

To clean file names in a ZIP archive, send the archive to `/v1/zip/clean`. You can add an `options` field with JSON settings:

```
curl -X POST "https://api.developer.meldra.ai/v1/zip/clean" \
  -H "X-API-Key: your_api_key_here" \
  -F "file=@archive.zip" \
  -F 'options={"allowedChars":"a-z0-9-_","replaceChar":"_","removeSpaces":true,"maxLength":255}' \
  -o archive-clean.zip
```

## Test the API in your browser

1. On the **Developers** page, go to **Test API Endpoints**.
2. Enter your key in **API Key (Required)**.
3. Choose an endpoint in **Select Endpoint** and choose a **File**.
4. Select **Test API**.

To see every endpoint in detail, select **Download OpenAPI spec**.

## Status codes

| Code | Meaning |
|---|---|
| 200 | Success. The response is the converted file. |
| 400 | The file is missing or in the wrong format, or the options JSON is invalid. |
| 401 | The API key is missing or invalid. |
| 429 | Rate limit exceeded. Wait and try again. |
| 500 | Server error. Try again, or contact support@meldra.ai. |

## Next steps

- [Sign-in and security](/help/sign-in-and-security)
- [Plans and limits](/help/plans-and-limits)
