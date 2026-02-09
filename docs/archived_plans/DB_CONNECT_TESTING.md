# How to Test DB Connect (PostgreSQL / Neon)

Use this guide to test the **Database Connection** page with your own PostgreSQL (e.g. Neon). **Do not put your real connection URL or password in the code or in this repo.**

---

## 1. Open DB Connect

- Log in at **insight.meldra.ai** (or your local app).
- Go to **Data & Schema → DB Connect** (or **Database Connection**).

---

## 2. Connection form (PostgreSQL)

1. **Database Type:** **PostgreSQL**
2. **Host:** From your URL, use only the hostname.  
   - Example: if your URL is  
     `postgresql://user:pass@ep-xxxxx-pooler.region.aws.neon.tech/neondb?sslmode=require`  
     then **Host** = `ep-xxxxx-pooler.region.aws.neon.tech`
3. **Port:** `5432` (Neon and most Postgres)
4. **Database Name:** The DB name in the URL (e.g. `neondb`)
5. **Username:** Your DB user
6. **Password:** Your DB password
7. **SSL Mode:** `require` (Neon needs SSL)

---

## 3. Test Connection

- Click **Test Connection**.
- If it succeeds, you can open **Schema**, run **Query**, and view **Data**.
- If it fails, check:
  - Host, port, database, user, password
  - For Neon: use the **pooler** host (often `-pooler` in the hostname) and `sslmode=require`
  - Firewall / IP allowlist on Neon (if enabled)

---

## 4. Sample SELECT queries to test

After **Test Connection** succeeds, open the **Query** tab and try these (they work on any PostgreSQL, including Neon):

**Basic check**
```sql
SELECT 1 AS test;
```

**Current database and user**
```sql
SELECT current_database() AS db, current_user AS usr;
```

**PostgreSQL version**
```sql
SELECT version();
```

**List your tables (in the `public` schema)**
```sql
SELECT table_schema, table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;
```

**Row count for one table** (replace `your_table` with a real table from the list above)
```sql
SELECT COUNT(*) FROM your_table;
```

---

## 5. DB Connect and Data Model Creator (DB Schema) working together

You can **build a schema in Data Model Creator from your connected database**:

1. In **DB Connect**, run **Test Connection** so the connection is active.
2. Go to **Data & Schema → Data Model Creator** (DB Schema).
3. Click **Import** → **From DB Connect**.
4. Tables, columns, primary keys, and **foreign key relationships** from your live DB are imported into the visual schema.

The list-tables query and the **Schema** tab in DB Connect use the same metadata that powers **From DB Connect**. For PostgreSQL, foreign keys are included so relationships appear in the canvas.

---

## 6. Notes

- **Zero storage:** Connection details and query results stay in your browser session only; they are cleared on logout.
- **Neon:** Prefer the pooled connection string. If your URL has `&channel_binding=require`, the backend may need to strip that; the **Host** you enter never includes `?` or `&`.
- **Never commit:** Do not add your real connection URL, host, or password to the repository or to any file under version control.

- **DB Schema from live DB:** Use **Import → From DB Connect** in Data Model Creator after connecting in DB Connect. Tested with PostgreSQL; other supported DB types (MySQL, etc.) import tables and columns; relationships are added for PostgreSQL.
