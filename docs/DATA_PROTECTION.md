# Data protection: what Meldra keeps, where, for how long, and how it is backed up

The rule: **customer files and their contents are never stored**. Meldra keeps only account, sign-in/device
(IP) and billing records, plus a few short-lived records listed below that are deleted on a schedule.

## 1. What is stored

| Record | What it holds | Where | Kept for | Backed up |
|---|---|---|---|---|
| Account (`users`) | E-mail, name, password hash | Neon (database) | Until the account is deleted | Yes |
| Subscription and payments (`subscriptions`, `subscription_event_logs`, `api_billing`) | Plan, usage counts, payment references; IP and browser at plan changes | Neon | Account lifetime; paid records as long as tax law requires (6–10 years) | Yes |
| Signed-in devices (`user_sessions`) | Device label, IP, city/country | Neon | 30 days after the device signs out | Yes |
| Sign-in history (`login_history`) | Sign-ins and failures, IP, city/country, browser | Neon | 90 days | Yes |
| Consent records (`consent_log`) | Cookie choice, IP, browser | Neon | 2 years (proof of consent) | Yes |
| API keys and API usage (`api_keys`, `api_key_issuance_logs`, `api_usage`) | Key hash, request counts and sizes, IP | Neon | Account lifetime | Yes |
| Usage for suggestions (`user_activities`, `learning_signals`) | Which tools are used and search words, never file contents | Neon | 90 / 180 days | No |
| Processing history (`file_processing_history`) | Tool used, file **type** (e.g. `.xlsx`) and size; never the name or contents | Neon | Until sign-out, at most 7 days | No |
| Invoice extraction results | Extracted invoice fields (so the person can download them) | Neon + server temp folder | Until the job expires (6 hours) | No |
| Sign-in codes | Hashed one-time code | Neon | 1 day after expiry | No |
| Lakehouse (Unified Reporting) | Data a customer **chooses** to store | Iceberg warehouse | Until the customer deletes it or the account | No |

Not stored anywhere: uploaded files, converted files, file names, spreadsheet or document contents, AI prompts and answers.
Files are processed in memory and the memory is released after each request.

Server logs (Railway) contain no file names or contents. They do contain e-mail addresses with some events (sign-ins, AI use), for security; Railway keeps logs for a limited period set by its plan.

## 2. Outside services that see data

| Provider | What it sees | Notes |
|---|---|---|
| Railway | Requests while they are processed | Hosting; nothing written to disk except temporary job files above |
| Neon | The records in section 1 | Database; has its own restore history (see section 4) |
| Vercel | Website requests | Frontend hosting |
| Resend | E-mail address, sign-in codes | E-mail delivery |
| OpenAI | Text sent by AI features (question, column names, sample rows, document text for invoice/AI ingestion) | Not used for training; kept up to 30 days for abuse monitoring. For zero retention, apply to OpenAI for Zero Data Retention |
| OCR.space | Images, only if `OCR_SPACE_API_KEY` is set and our own OCR fails | Remove the key to keep all OCR on our server |

## 3. Deleting an account (right to erasure)

Settings → **Delete my account** (password and the word DELETE). It removes the account and everything in
section 1, and the customer's lakehouse tables. Paid billing records are kept as the law requires, with the IP
address and browser removed. API: `POST /api/account/delete`. Code: `backend/app/services/account_erasure.py`.

Backups are not edited after a deletion; they expire after 90 days, so the person disappears from backups within
90 days. This is the usual approach under GDPR and is stated on the Privacy page.

## 4. Backups

Two layers:

1. **Neon restore history** (point-in-time restore of the whole database). Check the window in the Neon console →
   your project → Settings → Storage / History retention, and set it to at least 7 days on a paid plan.
2. **Weekly encrypted backup of the records** (GitHub Actions workflow "Records backup",
   `.github/workflows/records-backup.yml`, script `backend/tools/backup_records.py`). It copies only the tables
   marked "Backed up" above, encrypts them with AES-256-GCM using a passphrase, and keeps each backup 90 days.

**Set it up once (GitHub → repository → Settings → Secrets and variables → Actions → New repository secret):**
- `BACKUP_DATABASE_URL`: the Neon connection string. Prefer a read-only role:
  in the Neon SQL editor run
  `CREATE ROLE meldra_backup LOGIN PASSWORD '<new password>'; GRANT pg_read_all_data TO meldra_backup;`
  and use that role in the URL.
- `BACKUP_PASSPHRASE`: a long random passphrase (e.g. 6+ random words). Store it in your password manager.
  **Without it no backup can be read.**

Then GitHub → Actions → "Records backup" → Run workflow, to test. Until both secrets are set the workflow skips.

**Read or restore a backup:** download the artifact from the workflow run, then

```bash
export BACKUP_PASSPHRASE=...
python backend/tools/backup_records.py show meldra-records-2026-10-05.bak
python backend/tools/backup_records.py export meldra-records-2026-10-05.bak --out records.json
```

`records.json` is personal data: use it for the request at hand (an authority's request, a dispute, a restore)
and delete it afterwards.

## 5. Before launch

- Set the two backup secrets and run the workflow once.
- Check Neon's history retention.
- Decide on OCR.space: keep `OCR_SPACE_API_KEY` unset if no file should leave our server for OCR.
- If customers must have zero retention at OpenAI too, request Zero Data Retention from OpenAI, or turn AI
  features off for those customers.
- Keep the lakehouse (`LAKEHOUSE_CATALOG`) unset unless you want customers to be able to store data on purpose.
