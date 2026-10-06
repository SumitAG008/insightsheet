# meldra lakehouse (Unified Reporting)

Unified Reporting can keep every source (uploads, database queries, API pulls) in the
**meldra lakehouse** instead of the browser:

```
 Files / PostgreSQL / MySQL / SQL Server / REST, OData, GraphQL, SOAP APIs
        │ upload or pull (streamed as Apache Arrow record batches)
        ▼
 Typing + profiling (DuckDB, same rules as the browser)  →  Apache Iceberg table per source
        │                                                    (one namespace per account)
        ▼                                                    catalog: Apache Polaris (REST)
 Questions / reports: spec from the AI or rules (browser)  →  /api/lakehouse/aggregate
        │  Iceberg scan (column projection, date pruning) → Arrow stream → DuckDB
        ▼
 Per-group totals → ratios, rolling windows, comparisons, share, charts (browser, same code for all data)
```

The AI only ever sees column names and a few example values, never rows.

## Configuration (backend environment variables)

**Production: Apache Polaris.** Deploy Polaris as a service (a container, e.g. on Railway or
Kubernetes) with a persistent metastore (Postgres) and object storage (S3, Cloudflare R2, GCS or ADLS).
Create a catalog (e.g. `meldra`) and a service principal whose role has
`CATALOG_MANAGE_CONTENT` on it. Polaris vends short-lived storage credentials per table, so
the meldra backend never holds bucket keys.

```
LAKEHOUSE_CATALOG=rest
POLARIS_URI=https://polaris.internal.example.com/api/catalog
POLARIS_CREDENTIAL=<client_id>:<client_secret>
POLARIS_WAREHOUSE=meldra
```

**Starter: no extra service.** An Iceberg SQL catalog in the app's own Postgres, with data on a
Railway volume or in a bucket.

```
LAKEHOUSE_CATALOG=sql
LAKEHOUSE_CATALOG_URI=postgresql+psycopg2://…        # the DATABASE_URL in SQLAlchemy form
LAKEHOUSE_WAREHOUSE=file:///data/lakehouse            # mount a Railway volume at /data, or s3://bucket/prefix
```

**Optional settings:**
- `LAKEHOUSE_NAMESPACE_PREFIX=prod`: separates environments that share one catalog.
- `LAKEHOUSE_MAX_UPLOAD_MB=1024`: the largest file a user can upload.
- `LAKEHOUSE_DUCKDB_MEMORY=1GB`: DuckDB's memory cap; larger work spills to a temporary directory.
- `LAKEHOUSE_SQL_TIMEOUT=30`: seconds a customer's own SQL query may run before it is stopped.

Without `LAKEHOUSE_CATALOG` the lakehouse is off and Unified Reporting keeps data in the
browser exactly as before. The frontend needs no change; it asks `/api/lakehouse/status`.

API connector settings (see CONNECTOR_SECURITY.md): `CONNECTOR_EGRESS_PROXY`,
`CONNECTOR_EGRESS_IPS`, and `CONNECTOR_CA_BUNDLE` for proxies that inspect TLS.

## Security and data handling

- **Tenant isolation:** each account's tables live in its own Iceberg namespace. The namespace is
  derived on the server from the signed-in account, never taken from the request. Table and column
  names are validated against the stored profile, and filter values are bound parameters.
- **Deletion:** deleting a source, or "Remove all data", removes every file the table owns: data
  files of all snapshots, manifests, metadata history and the profile. meldra deletes them itself
  because Polaris 1.3's background purge task was found to fail. Tested: zero files remain.
- **Secrets:** connector credentials are never stored. Only non-secret settings (address, token URL,
  client ID) are kept with the source, for refresh.
- **Encryption at rest:** provided by the object store (e.g. S3 SSE-KMS). Use TLS to Polaris and the store.

## Customer SQL (the Query panel)

Every chart has a **Query** panel: the tables, columns, lookups and joins it uses, and the SQL that
gives exactly its numbers. Customers can edit that SQL, run it and use the result in the chart.
The same SQL runs in both places, because each source is presented as a table named like the source,
with its own column names, numbers as numbers and `month` from its date column:
- sources kept in the browser: SQLite in the browser (sql.js); the data never leaves the device;
- sources in the lakehouse: `POST /api/lakehouse/sql` runs it in DuckDB over the Iceberg tables.

Guard rails for `/api/lakehouse/sql`:
- one read-only `SELECT` (or `WITH … SELECT`), checked by DuckDB's parser; PRAGMA, COPY, ATTACH and
  anything that writes are refused;
- only the signed-in account's tables are loaded, and only the ones the query names;
- file, network and extension access are switched off and the configuration locked before it runs;
- the query runs on its own thread, so DuckDB cannot resolve names to in-process Python objects;
- time limit (`LAKEHOUSE_SQL_TIMEOUT`), 5,000 result rows, and the DuckDB memory cap.

The generated SQL is tested to give the browser engine's numbers on 20 answer shapes, in SQLite
(`src/lib/unifiedReporting/sqlQuery.test.js`) and in DuckDB over Iceberg (`tests/test_lakehouse_sql.py`).

## Performance (measured)

On a 5,000,000-row, 203 MB CSV with messy money values and dates, uploaded through the browser:
- Stored in 21 s.
- Month by department across all rows: 0.4 s.
- A filtered question: 0.2 s.
- Peak backend memory: about 350 MB.

Totals match an independent calculation exactly.

## Tests

- **Backend:** `tests/test_lakehouse.py`, run on the SQL catalog, and on a real Polaris when
  `POLARIS_TEST_URI` is set. Also `tests/test_lakehouse_endpoints.py`.
- **`e2e/lakehouse`:** the UI, backend and Polaris, 29 checks. These include answer parity with
  the browser engine on 12 kinds of answer, and a 5M-row upload.
- **`e2e/multisource`:** a real PostgreSQL database, an Excel workbook and a live public API,
  combined in the UI and checked against the sources, 16 checks.
