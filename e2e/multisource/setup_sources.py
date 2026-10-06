"""
Real source systems for the multi-source test.

1. API (live, on the internet): the npm registry search API. Nothing to set up; the
   test connects to it from the meldra UI. This script only reads it once to learn
   real package names so the other systems refer to the same packages.
2. Database: a real PostgreSQL server with an IT-finance schema (software usage per
   team, licence invoices), and a read-only user for meldra.
3. Spreadsheet: team budgets as an Excel workbook (team, department, budget).

Everything is deterministic given the package names, so the test can compute every
expected number independently (straight from PostgreSQL and the workbook).
Usage: python3 setup_sources.py <work dir>   (needs PostgreSQL 16 binaries; run as root, uses the postgres user)
"""
import json
import os
import random
import subprocess
import sys
import urllib.request
from datetime import date

WORK = os.path.abspath(sys.argv[1] if len(sys.argv) > 1 else "/tmp/meldra-multisource")
PG_BIN = os.environ.get("PG_BIN", "/usr/lib/postgresql/16/bin")
PG_PORT = os.environ.get("PG_PORT", "5433")
PG_DATA = os.path.join(WORK, "pgdata")
os.makedirs(WORK, exist_ok=True)


def _password(name):
    """Generated on first run and kept in the work directory (outside the repo); never written in code."""
    import secrets
    path = os.path.join(WORK, f"{name}.pw")
    if not os.path.exists(path):
        with open(path, "w") as f:
            f.write(secrets.token_urlsafe(18))
        os.chmod(path, 0o600)
    return open(path).read().strip()


ADMIN_PASSWORD = _password("admin")
READER_PASSWORD = _password("reader")


def sh(cmd, user="postgres", **kw):
    return subprocess.run(["su", user, "-c", cmd] if user else cmd, check=True, capture_output=True, text=True, **kw).stdout


def psql(sql=None, db="postgres", file=None):
    """Run SQL as the admin over TCP (no shell, so nothing in the SQL is expanded)."""
    args = [f"{PG_BIN}/psql", "-h", "127.0.0.1", "-p", PG_PORT, "-U", "postgres", "-d", db, "-v", "ON_ERROR_STOP=1", "-q"]
    args += ["-f", file] if file else ["-c", sql]
    return subprocess.run(args, check=True, capture_output=True, text=True, env={**os.environ, "PGPASSWORD": ADMIN_PASSWORD}).stdout


# ---------- 1. package names from the live API ----------
ctx = None
if os.environ.get("REQUESTS_CA_BUNDLE") or os.path.exists("/root/.ccr/ca-bundle.crt"):
    import ssl
    ctx = ssl.create_default_context(cafile=os.environ.get("REQUESTS_CA_BUNDLE", "/root/.ccr/ca-bundle.crt"))
with urllib.request.urlopen("https://registry.npmjs.org/-/v1/search?text=keywords:chart&size=100", context=ctx, timeout=30) as r:
    objects = json.load(r)["objects"]
packages = [o["package"]["name"] for o in objects][:30]
print(f"API: {len(packages)} package names from registry.npmjs.org (e.g. {', '.join(packages[:4])})")

# ---------- 2. PostgreSQL ----------
os.makedirs(WORK, exist_ok=True)
subprocess.run(["chown", "-R", "postgres:postgres", WORK], check=True)
if not os.path.exists(os.path.join(PG_DATA, "PG_VERSION")):
    pwfile = os.path.join(WORK, "initdb.pw")
    open(pwfile, "w").write(ADMIN_PASSWORD + "\n")
    subprocess.run(["chown", "postgres:postgres", pwfile], check=True)
    sh(f"{PG_BIN}/initdb -D {PG_DATA} -U postgres --auth-host=scram-sha-256 --auth-local=trust --pwfile={pwfile}")
    os.remove(pwfile)
status = subprocess.run(["su", "postgres", "-c", f"{PG_BIN}/pg_ctl -D {PG_DATA} status"], capture_output=True, text=True)
if status.returncode != 0:
    sh(f"{PG_BIN}/pg_ctl -D {PG_DATA} -o '-p {PG_PORT} -k /tmp' -l {WORK}/pg.log start -w")

psql("DROP DATABASE IF EXISTS it_finance")
psql("CREATE DATABASE it_finance")
psql(f"DO $$ BEGIN IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'meldra_reader') THEN CREATE ROLE meldra_reader LOGIN PASSWORD '{READER_PASSWORD}'; END IF; END $$")
psql(f"ALTER ROLE meldra_reader LOGIN PASSWORD '{READER_PASSWORD}'")

rng = random.Random(7)
teams = ["FIN-01", "FIN-02", "SAL-01", "SAL-02", "HR-01", "ENG-01", "ENG-02", "ENG-03", "OPS-01", "MKT-01"]
usage, invoices = [], []
uid = 1
for i, pkg in enumerate(packages):
    for team in rng.sample(teams, 1 + i % 3):
        seats = rng.randint(2, 60)
        cost = round(seats * rng.choice([12.5, 18.0, 24.99, 40.0]) * 12, 2)
        renew = date(2026, 1 + rng.randrange(12), 1 + rng.randrange(28))
        usage.append((uid, team, pkg, seats, cost, rng.random() < 0.4, renew))
        uid += 1
for n, (_, team, pkg, seats, cost, _, _) in enumerate(usage):
    for month in range(1, 10):  # Jan–Sep 2026, monthly licence invoices
        invoices.append((f"INV-{n:04d}-{month:02d}", pkg, team, date(2026, month, 5), round(cost / 12 * (1 + rng.uniform(-0.05, 0.05)), 2)))

def values(rows):
    def lit(v):
        if isinstance(v, bool):
            return "true" if v else "false"
        if isinstance(v, (int, float)):
            return str(v)
        return "'" + str(v).replace("'", "''") + "'"
    return ",".join("(" + ",".join(lit(x) for x in r) + ")" for r in rows)

schema = f"""
CREATE TABLE software_usage (usage_id int PRIMARY KEY, team_code text NOT NULL, package_name text NOT NULL, seats int NOT NULL,
  licence_cost_gbp numeric(12,2) NOT NULL, support_contract boolean NOT NULL, renewal_date date NOT NULL);
CREATE TABLE licence_invoices (invoice_no text PRIMARY KEY, package_name text NOT NULL, team_code text NOT NULL, invoice_date date NOT NULL, amount_gbp numeric(12,2) NOT NULL);
INSERT INTO software_usage VALUES {values(usage)};
INSERT INTO licence_invoices VALUES {values(invoices)};
GRANT CONNECT ON DATABASE it_finance TO meldra_reader;
GRANT USAGE ON SCHEMA public TO meldra_reader;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO meldra_reader;
"""
with open(os.path.join(WORK, "schema.sql"), "w") as f:
    f.write(schema)
psql(db="it_finance", file=os.path.join(WORK, "schema.sql"))
print(f"PostgreSQL: it_finance on 127.0.0.1:{PG_PORT} (software_usage {len(usage)} rows, licence_invoices {len(invoices)} rows); read-only user meldra_reader")

# ---------- 3. Excel ----------
from openpyxl import Workbook
wb = Workbook()
ws = wb.active
ws.title = "Teams"
ws.append(["Team Code", "Team Name", "Department", "Cost Centre", "Annual Software Budget (£)", "Headcount"])
dept = {"FIN": "Finance", "SAL": "Sales", "HR": "People", "ENG": "Engineering", "OPS": "Operations", "MKT": "Marketing"}
for t in teams:
    ws.append([t, f"{dept[t.split('-')[0]]} team {t[-1]}", dept[t.split("-")[0]], f"CC{100 + teams.index(t)}", 20000 + 7500 * teams.index(t), 5 + 3 * teams.index(t)])
xlsx = os.path.join(WORK, "team_budgets.xlsx")
wb.save(xlsx)
print(f"Excel: {xlsx} ({len(teams)} teams)")

json.dump({"packages": packages, "pg": {"host": "127.0.0.1", "port": PG_PORT, "database": "it_finance", "user": "meldra_reader", "password": READER_PASSWORD},
           "xlsx": xlsx, "psql": f"{PG_BIN}/psql"}, open(os.path.join(WORK, "sources.json"), "w"), indent=1)
