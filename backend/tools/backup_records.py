"""
Encrypted backup of the records meldra must be able to produce for compliance and legal purposes:
accounts, subscriptions and payments, sign-in and device records, consent records and API keys and
billing. Customer files are never stored, so there is nothing of theirs to back up; lakehouse data
(only when a customer chooses to store it) is not copied here.

The backup is one file, gzip-compressed JSON encrypted with AES-256-GCM. The key is derived from a
passphrase (scrypt); without the passphrase the file cannot be read, so keep the passphrase in a
password manager, never next to the backups.

    export DATABASE_URL=postgresql://...        # production database (read-only use)
    export BACKUP_PASSPHRASE=...                # long random passphrase
    python tools/backup_records.py backup --out meldra-records-2026-10-01.bak
    python tools/backup_records.py show meldra-records-2026-10-01.bak           # table names and row counts
    python tools/backup_records.py export meldra-records-2026-10-01.bak --out records.json   # decrypted JSON

The scheduled GitHub Actions workflow "Records backup" runs this weekly (see docs/DATA_PROTECTION.md).
"""
import argparse
import base64
import gzip
import json
import os
import secrets
import sys
from datetime import date, datetime
from decimal import Decimal

MAGIC = b"MELDRA-BAK1"
# Records kept for compliance and legal purposes. Short-lived data (sign-in codes, usage signals,
# activity, processing history, job results) is deliberately left out: it is deleted on a schedule.
TABLES = [
    "users",
    "subscriptions",
    "subscription_event_logs",
    "login_history",
    "user_sessions",
    "consent_log",
    "user_features",
    "feature_keys",
    "api_keys",
    "api_key_issuance_logs",
    "api_usage",
    "api_billing",
]


def _key(passphrase: str, salt: bytes) -> bytes:
    from cryptography.hazmat.primitives.kdf.scrypt import Scrypt
    return Scrypt(salt=salt, length=32, n=2 ** 15, r=8, p=1).derive(passphrase.encode())


def encrypt(data: bytes, passphrase: str) -> bytes:
    from cryptography.hazmat.primitives.ciphers.aead import AESGCM
    salt, nonce = secrets.token_bytes(16), secrets.token_bytes(12)
    return MAGIC + salt + nonce + AESGCM(_key(passphrase, salt)).encrypt(nonce, gzip.compress(data), MAGIC)


def decrypt(blob: bytes, passphrase: str) -> bytes:
    from cryptography.hazmat.primitives.ciphers.aead import AESGCM
    if not blob.startswith(MAGIC):
        raise SystemExit("Not a meldra records backup.")
    rest = blob[len(MAGIC):]
    salt, nonce, body = rest[:16], rest[16:28], rest[28:]
    try:
        return gzip.decompress(AESGCM(_key(passphrase, salt)).decrypt(nonce, body, MAGIC))
    except Exception:
        raise SystemExit("Wrong passphrase, or the file is damaged.")


def _jsonable(v):
    if isinstance(v, (datetime, date)):
        return v.isoformat()
    if isinstance(v, Decimal):
        return float(v)
    if isinstance(v, (bytes, bytearray, memoryview)):
        return base64.b64encode(bytes(v)).decode()
    return v


def dump(database_url: str) -> dict:
    from sqlalchemy import MetaData, create_engine, select

    engine = create_engine(database_url)
    meta = MetaData()
    meta.reflect(bind=engine, only=lambda name, _m: name in TABLES)
    out = {"created_at": datetime.utcnow().isoformat() + "Z", "format": 1, "tables": {}}
    with engine.connect() as conn:
        for name in TABLES:
            table = meta.tables.get(name)
            if table is None:
                out["tables"][name] = []
                continue
            rows = conn.execute(select(table)).mappings()
            out["tables"][name] = [{k: _jsonable(v) for k, v in row.items()} for row in rows]
    engine.dispose()
    return out


def _passphrase() -> str:
    p = os.environ.get("BACKUP_PASSPHRASE", "")
    if len(p) < 16:
        raise SystemExit("Set BACKUP_PASSPHRASE to a passphrase of at least 16 characters.")
    return p


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = ap.add_subparsers(dest="cmd", required=True)
    b = sub.add_parser("backup", help="write an encrypted backup of the records")
    b.add_argument("--out", required=True)
    s = sub.add_parser("show", help="list the tables and row counts in a backup")
    s.add_argument("file")
    e = sub.add_parser("export", help="decrypt a backup to JSON (handle the result as personal data)")
    e.add_argument("file")
    e.add_argument("--out", required=True)
    args = ap.parse_args()

    if args.cmd == "backup":
        url = os.environ.get("DATABASE_URL", "")
        if not url:
            raise SystemExit("Set DATABASE_URL.")
        if url.startswith("postgres://"):
            url = "postgresql://" + url[len("postgres://"):]
        data = dump(url)
        with open(args.out, "wb") as f:
            f.write(encrypt(json.dumps(data).encode(), _passphrase()))
        counts = {k: len(v) for k, v in data["tables"].items()}
        print(f"Backup written to {args.out}: {sum(counts.values())} rows", file=sys.stderr)
        for k, v in counts.items():
            print(f"  {k}: {v}", file=sys.stderr)
        return

    with open(args.file, "rb") as f:
        data = json.loads(decrypt(f.read(), _passphrase()))
    if args.cmd == "show":
        print(f"Created {data['created_at']}")
        for k, v in data["tables"].items():
            print(f"  {k}: {len(v)} rows")
    else:
        with open(args.out, "w") as f:
            json.dump(data, f, indent=1)
        print(f"Decrypted to {args.out}. It contains personal data: delete it when you are done.", file=sys.stderr)


if __name__ == "__main__":
    main()
