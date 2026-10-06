---
title: Extract invoices and receipts
summary: Unlock the Invoices and Receipts module with a feature key, then pull header fields and line items from an invoice into CSV and JSON.
category: PDF and documents
order: 4
updated: 2026-10-06
---

This article shows how to unlock the Invoices & Receipts module and extract data from an invoice or receipt. You get the header fields and the line items as CSV files, and a full report as JSON.

## Before you start

The Invoices & Receipts module is not enabled by default and is not part of a plan. You need a feature key. Ask support or your administrator for an invoices module key.

The page is not in the top menu. Go to `/InvoiceExtractor` on your meldra Insight address.

## Check your access

The page does not check your access when it opens. It shows "Access not checked yet."

1. Select **Refresh Access**.
2. Read the status next to the button:
   - **Module enabled**: you can extract invoices.
   - **Module locked**: you need to redeem a feature key.

## Redeem a feature key

1. Under **Unlock with feature key**, paste your key. Keys start with `fk_`.
2. Select **Redeem**.

When the key works, a message says "Unlocked" and the status changes to **Module enabled**.

A key can be used only once. Some keys are issued for one email address, and some have an end date. Access ends when the key's end date passes.

| Message | Meaning |
|---|---|
| "Invalid key" | The key was not recognised. Check that you pasted all of it. |
| "Key already redeemed" | The key has been used. Ask for a new one. |
| "Key expired" | The key is past its end date. Ask for a new one. |
| "Key not valid for this user" | The key was issued for a different email address. |

## Extract an invoice or receipt

1. Under **File (required)**, choose a PDF or an image of the invoice or receipt.
2. Optional: change the **Filename override (optional)**. It is filled in with your file's name.
3. Optional: change **Max pages**. The default is 25 and the most is 200.
4. Select **Run**. A message says "Job started" and the page shows the **Job ID**.
5. Select **Refresh** to see the **Status**. It moves from `queued` to `running`, then to `succeeded` or `failed`. Select **Refresh** again until the job finishes.

> **Important:** meldra uses the end of the file name to decide how to read the file. If you change **Filename override (optional)**, keep the same ending, for example `.pdf` for a PDF.

## How meldra reads the invoice

For a PDF, meldra copies the text from the file. If there is very little text, for example in a scan, it reads the pages with OCR instead. Images are always read with OCR. meldra's AI then picks out the invoice fields and line items from the text.

This runs on meldra's servers.

## Download the results

When the status is `succeeded`, select:

- **Download Header CSV**: one row with `vendor_name`, `invoice_number`, `invoice_date`, `currency`, `subtotal`, `tax` and `total`.
- **Download Line Items CSV**: one row per line, with `description`, `quantity`, `unit_price` and `amount`.
- **Download Report JSON**: the invoice data plus a report on the extraction. If the subtotal, tax and total were all found, the report says whether the total matches subtotal plus tax.

A field that was not found is left empty.

> **Note:** Results are kept on meldra's servers for a limited time only. After that, the job shows "Job expired" and you need to run it again.

## Troubleshooting

| Problem | What to do |
|---|---|
| **Run** is greyed out | Select **Refresh Access**. If the status is **Module locked**, redeem a feature key. |
| "Feature not enabled: invoice_extractor" | Your access has ended, for example because the key passed its end date. Ask for a new key. |
| The status is `failed` | Read the message under the status. "Unable to extract readable text from document" means the text could not be read. Try a sharper scan. |
| The CSV files are empty | Open the report JSON. If `llm_error` has a value, the AI step failed. Run the job again later. |
| "Job expired" | Run the file again. |

## Next steps

- [Read scanned documents with OCR](/help/read-scanned-documents-ocr)
- [Convert documents](/help/convert-documents)
