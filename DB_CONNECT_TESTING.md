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

## 4. Notes

- **Zero storage:** Connection details and query results stay in your browser session only; they are cleared on logout.
- **Neon:** Prefer the pooled connection string. If your URL has `&channel_binding=require`, the backend may need to strip that; the **Host** you enter never includes `?` or `&`.
- **Never commit:** Do not add your real connection URL, host, or password to the repository or to any file under version control.
