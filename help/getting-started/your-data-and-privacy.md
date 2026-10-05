---
title: Your data and privacy
summary: How meldra Insight handles your files, where your data is kept and exactly what the AI sees.
category: Getting started
order: 2
updated: 2026-10-05
---

This article explains where your files go, what is kept and what is sent to the AI. Read it before you upload personal or confidential data.

## How files are handled

- File contents are processed in memory and discarded when the result is ready. They are not kept.
- Data is stored only if you choose to save it, and you can delete it at any time.
- Connections to Meldra are encrypted.
- Sign-in can require a one-time login code, and an account can be signed in on at most two devices.
- Records backups are encrypted.
- There is no advertising, and no third-party or cross-site tracking.
- You can access, correct, erase or export your personal data under UK GDPR. See the [Privacy Policy](https://insight.meldra.ai/privacy).

## Unified Reporting

### Where your data is kept

| How you add data | Where it is kept |
|---|---|
| Upload a CSV or Excel file | Read in your browser and kept in this browser's storage. The file is not uploaded to Meldra. |
| **Connect a database** | Rows are read through Meldra's server and kept in this browser. The password is used once to connect and is never stored. |
| **Connect an API** | Records are fetched through Meldra's server and kept in this browser. Credentials are used for that request and never stored. |
| **Store in the Meldra lakehouse** (only if offered on your account) | Stored on Meldra's servers until you delete it, so you can use it from any device. |

Your data, answers and dashboard stay in the browser until you remove them. To remove them, go to **Data sources** and select **Remove all data**. Signing out also clears what Unified Reporting and Migration kept in that browser.

> **Important:** Data you store in the Meldra lakehouse is kept on Meldra's servers until you delete it. Delete a source with its bin icon, or use **Remove all data**.

### What the AI sees

When you ask a question or build a report, the AI plans the chart from a description of your data, not from your rows. It receives:

- source names, system names, row counts and column names;
- the date range of your data;
- for columns with 12 or fewer different values (such as region or department), those values.

To write the short answer under a chart, the AI receives the question and the summarised result: the totals shown in the chart, at most 25 rows.

If the AI is not available, Meldra answers with built-in rules instead.

## Migration

- Your extract is read in your browser and kept in this browser's storage until you select **Start over** or sign out.
- The load files, ZIP and review workbook are built in your browser.
- The AI mapping sends only tab names and column names, never employee values.
- **Translate values with AI** runs only when you select it. It sends only the distinct values listed under **Value translations** (for example "Resigned"), never employee IDs, names or counts.

> **Important:** The ZIP and review workbook contain complete bank details when your extract has them. Bank numbers are masked on screen only. Store and share these files accordingly.

## Next steps

- [Add your data to Unified Reporting](/help/add-your-data)
- [Map fields](/help/map-fields)
