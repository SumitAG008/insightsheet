---
title: Convert documents
summary: Turn a PDF into a Word or PowerPoint file, or a Word or PowerPoint file into a PDF.
category: PDF and documents
order: 1
updated: 2026-10-06
---

This article shows how to convert a file with the Document Converter. You can convert between PDF, Word and PowerPoint in four directions.

## What you can convert

| Option | File you upload | File you get |
|---|---|---|
| **PDF to DOC** | PDF (`.pdf`) | Word (`.docx`) |
| **DOC to PDF** | Word (`.docx`) | PDF (`.pdf`) |
| **PPT to PDF** | PowerPoint (`.pptx`) | PDF (`.pdf`) |
| **PDF to PPT** | PDF (`.pdf`) | PowerPoint (`.pptx`) |

Only `.docx` and `.pptx` files can be uploaded for Word and PowerPoint. Older `.doc` and `.ppt` files are not accepted.

## Convert a file

1. Select **File Conversion** in the top menu, then **Document Converter (PDF / DOC / PPT)**.
2. Choose an option: **PDF to DOC**, **DOC to PDF**, **PPT to PDF** or **PDF to PPT**.
3. Select the upload area. It says **Upload PDF**, **Upload Word (.docx)** or **Upload PowerPoint (.pptx)**, depending on the option. The line under it shows the file type you will get.
4. Choose your file. Its name appears under the upload area.
5. For **PDF to DOC** only, choose the **OCR language**: **English** or **Hindi + English**.
6. Select **Convert & Download**.

The converted file downloads automatically. Its name is your original file name with the date and time added.

> **Note:** You must be logged in. If you are not, the page shows **Log in** and **Convert & Download** is not available.

## PDFs that are scanned or use unusual fonts

When you convert **PDF to DOC**, meldra first copies the text from the PDF. If the result is unreadable or almost empty, for example because the PDF is a scan or uses custom fonts, meldra reads the pages with OCR instead. OCR reads up to 25 pages.

> **Tip:** Choose **Hindi + English** for documents that mix the two languages. This avoids garbled text.

## Where your file is processed

Conversions run on meldra's servers. The page states that your file is not stored. No API key is needed; the converter uses your meldra login.

## Limits and watermarks

Each successful conversion counts towards your monthly **Conversions and file jobs**. Your plan also sets the largest file you can upload and the number of pages a PDF can have. See [Plans and limits](/help/plans-and-limits).

> **Note:** On the Free plan, PDF and PowerPoint files you download carry a "meldra.ai" watermark. Word files from **PDF to DOC** do not.

## Troubleshooting

| Message | What to do |
|---|---|
| "You are not logged in. Please log in to use Document Converter." | Select **Log in**, then try again. |
| "Your session may have expired. Please log in again." | Log in again, then try again. |
| The file is too large for your plan | Use a smaller file, or check your limits in [Plans and limits](/help/plans-and-limits). |
| "Converter is temporarily unavailable. Please refresh and try again." | Refresh the page and convert again. |
| "You have used all … conversions for this month." | Wait until the 1st of the month, or upgrade your plan. |

## Next steps

- [Edit, fill, merge and split PDFs](/help/edit-pdfs)
- [Read scanned documents with OCR](/help/read-scanned-documents-ocr)
