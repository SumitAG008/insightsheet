---
title: Read scanned documents with OCR
summary: Turn a scan or photo of a form into a fillable PDF, pull out the filled-in values, or get its text as Word or PDF.
category: PDF and documents
order: 3
updated: 2026-10-06
---

This article shows how to use the Fillable PDF & Form Reader. It reads PDFs you cannot type into, scans and photos, and gives you a fillable PDF, the form's values or editable text.

## Upload your document

1. Select **File Conversion** in the top menu, then **OCR to DOC/PDF**.
2. Select **Upload Image / PDF** and choose your file.
3. Choose the **OCR language**: **English** or **Hindi + English**.

You can upload a PDF, including a locked or scanned one, or an image: JPG, JPEG, PNG, WebP, BMP, TIFF or GIF. The box at the top of the page shows the largest file your plan allows.

> **Tip:** For photos, lay the page flat, use good light and keep the whole form in view. Choose **Hindi + English** for bilingual documents to avoid garbled text.

To choose a different file, select **Remove**.

Then choose one of the three actions below.

## Make a fillable PDF

1. Select **Make fillable PDF**.
2. Wait while meldra reads the document. Scans and photos take a few seconds per page.

meldra finds the blanks, such as lines, empty boxes, table cells, gaps after a label and tick boxes, and adds boxes you can type into. The page keeps its original look. Scanned pages also get a text layer, so you can search them.

The file downloads as your file name followed by `_fillable.pdf`. A message says how many text boxes and tick boxes were added, on how many pages.

Open the file in Edge, Chrome or Adobe Reader, select a blank and type. To fill it in meldra instead, follow the link to the PDF Editor in the message. See [Edit, fill, merge and split PDFs](/help/edit-pdfs).

> **Note:** If no blanks were found, use your PDF reader's "Add text" tool, or **Add text** in meldra's PDF Editor, to type anywhere on the page.

## Read the data from a filled-in form

1. Select **Read form data**.
2. Wait while meldra reads the document.

A table lists each **Label**, its **Value** and the **Page** it is on. The heading says how many values were found.

To download the values, select **CSV** or **JSON**. The JSON file also holds the full text of the document. If no label and value pairs were recognised, the full text is still in the JSON download.

## Extract and edit the text

1. Select **Extract & edit text**.
2. Read and correct the text in the box under **Editable text — edit, then Save or Download**.
3. Choose how to lay out the download in **Export as**:
   - **Layout (match image)**: keeps the positions of the original.
   - **Form (sections, tables, fields)**: a flowing document with sections, labels and tables.
4. Optional: tick **Exact copy (PDF looks like the original image)** to get a PDF that looks exactly like the original. This applies to **Download as PDF** only.
5. Select **Download as DOC** for a Word `.docx` file, or **Download as PDF**.

> **Important:** Corrections you type in the text box are used only when **Export as** is **Form (sections, tables, fields)**. **Layout (match image)** and **Exact copy** are built from the text as it was read.

Select **Save** to keep your text while you work in this browser tab. Select **New file** to clear everything and start again.

## Page limits

- **Make fillable PDF** and **Read form data** work on documents of up to 25 pages. A longer document is refused with a message that gives the page count.
- **Extract & edit text** reads up to 25 pages of a PDF, or fewer if your plan's **Scanned pages read by OCR per file** is lower.

**Make fillable PDF** and **Read form data** each count towards your monthly **Conversions and file jobs**. See [Plans and limits](/help/plans-and-limits).

## Where your file is processed

All three actions upload the file to meldra for reading. The page states that your file is processed in memory and never stored.

## Troubleshooting

| Problem | What to do |
|---|---|
| "Please select an image or PDF…" | Choose one of the file types listed above. |
| The file exceeds your size limit | Use a smaller file. See [Plans and limits](/help/plans-and-limits). |
| "This PDF needs a password to open." | Open it, save a copy without the password, and upload the copy. |
| "This document is taking too long." | Try fewer pages or a clearer scan. |
| The text is garbled | Choose **Hindi + English** if the document uses both languages, or use a sharper scan. |

## Next steps

- [Edit, fill, merge and split PDFs](/help/edit-pdfs)
- [Extract invoices and receipts](/help/extract-invoices-and-receipts)
