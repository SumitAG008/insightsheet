# What we can say about Meldra (and what we can't)

Every claim in marketing, sales, the website and videos must be on the "Say" list or be checked against the
code first. Source for the privacy lines: `docs/DATA_PROTECTION.md`. Source for speed: `docs/benchmark-results.md`.

## Name
- The product is **Meldra** (meldra.ai, app at insight.meldra.ai). Tagline: **Data Made Simple**.
- Don't use "InsightSheet" or "InsightSheet-lite" in anything customer-facing.

## Say
| Topic | Approved wording |
|---|---|
| Privacy, short | **Your files are never stored.** |
| Privacy, one line | Spreadsheet analysis runs in your browser. Tools that need our server process your file in memory and discard it. We never keep your files, their names or their contents, only your account, sign-in and billing records. |
| AI and privacy | AI features send our AI provider only what the task needs (for example column names, or the text of a document you ask about). The provider does not train on it. |
| Speed | Excel to PowerPoint **in seconds** (1.6–5.8 s for files up to about 5 MB in our benchmark). |
| Ask Meldra | Tell Meldra what you need in your own words; it picks the right tool, sets it up with your files and you check the result. |
| Migration | Map, clean and check an HR system extract and get load-ready **SAP SuccessFactors** files. The AI sees column names only; employee data stays in the browser. |
| Unified Reporting | Combine exports from several systems (files, databases or APIs) and ask questions across them in plain English. |
| Free plan | Free for 60 days: every tool, 20 tool runs a month, 2 AI questions a day, files up to 10 MB, exports watermarked. |
| Deletion | Delete your account any time in Settings. |

## Don't say (not true today, or not proven)
| Claim | Why not |
|---|---|
| "Zero data retention", "nothing is stored", "deleted immediately" | Account, billing and sign-in records are kept; invoice extraction results are kept 6 hours; lakehouse data is kept if the customer opts in. Say "your files are never stored". |
| "100% in RAM", "never written to disk" | Some jobs use temporary files on the server (see DATA_PROTECTION.md). |
| "Zero AI training" as a blanket promise / "AI never sees your data" | The AI provider receives what the task needs and keeps it up to 30 days for abuse monitoring. Say "doesn't train on it". |
| "GDPR compliant", "CISO approved", "SOC 2", "ISO 27001" | No certification or audit yet. Say what we do (above) and link the Privacy page. |
| "In 5 seconds flat", "10,000+ rows in 5 seconds" | Not measured that way. Say "in seconds". |
| "Universal migration to any system" | The target today is SAP SuccessFactors only. |
| "Predictive ML" or "forecasting" in Unified Reporting | Unified Reporting doesn't forecast. The Dashboard does have forecast charts: say "forecast charts" there. |
| "Self-learning", "fully autonomous" | The AI Agent plans and runs steps you asked for; it doesn't learn between sessions. |
| Customer quotes, logos or ratings | Only with real, written permission from that customer. |
