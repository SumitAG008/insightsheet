"""
Lakehouse settings (environment variables).

Production (recommended): Apache Polaris as the Iceberg REST catalog, data in
object storage (S3 / R2 / GCS / ADLS). Polaris vends short-lived storage
credentials, so the backend never holds bucket keys.
    LAKEHOUSE_CATALOG=rest
    POLARIS_URI=https://polaris.example.com/api/catalog
    POLARIS_CREDENTIAL=<client_id>:<client_secret>   (a Polaris service principal)
    POLARIS_WAREHOUSE=meldra                          (the Polaris catalog name)
    POLARIS_SCOPE=PRINCIPAL_ROLE:ALL                  (optional)
    POLARIS_ACCESS_DELEGATION=vended-credentials      (default; "none" for file:// test warehouses)

Starter (no extra service): Iceberg SQL catalog in a database plus a warehouse
directory or bucket, e.g. the app's Postgres and a Railway volume.
    LAKEHOUSE_CATALOG=sql
    LAKEHOUSE_CATALOG_URI=postgresql+psycopg2://…   (default: sqlite file in the warehouse)
    LAKEHOUSE_WAREHOUSE=file:///data/lakehouse       (or s3://bucket/prefix)

Common:
    LAKEHOUSE_NAMESPACE_PREFIX=prod     (optional; separates environments sharing a catalog)
    LAKEHOUSE_MAX_UPLOAD_MB=1024
When LAKEHOUSE_CATALOG is not set the lakehouse is off and Unified Reporting
keeps data in the browser only.
"""
import os
from typing import Any, Dict


def catalog_kind() -> str:
    return (os.environ.get("LAKEHOUSE_CATALOG") or "").strip().lower()


def enabled() -> bool:
    return catalog_kind() in ("rest", "sql")


def max_upload_bytes() -> int:
    try:
        mb = int(os.environ.get("LAKEHOUSE_MAX_UPLOAD_MB") or 1024)
    except ValueError:
        mb = 1024
    return max(1, mb) * 1024 * 1024


def namespace_prefix() -> str:
    raw = (os.environ.get("LAKEHOUSE_NAMESPACE_PREFIX") or "").strip().lower()
    return "".join(ch for ch in raw if ch.isalnum() or ch == "_")[:20]


def catalog_properties() -> Dict[str, Any]:
    kind = catalog_kind()
    if kind == "rest":
        props = {
            "type": "rest",
            "uri": os.environ.get("POLARIS_URI", ""),
            "warehouse": os.environ.get("POLARIS_WAREHOUSE", ""),
            "scope": os.environ.get("POLARIS_SCOPE") or "PRINCIPAL_ROLE:ALL",
        }
        # Ask Polaris for short-lived, table-scoped storage credentials ("none" for file:// test warehouses).
        delegation = (os.environ.get("POLARIS_ACCESS_DELEGATION") or "vended-credentials").strip()
        if delegation.lower() != "none":
            props["header.X-Iceberg-Access-Delegation"] = delegation
        if os.environ.get("POLARIS_CREDENTIAL"):
            props["credential"] = os.environ["POLARIS_CREDENTIAL"]
        if os.environ.get("POLARIS_TOKEN"):
            props["token"] = os.environ["POLARIS_TOKEN"]
        return props
    if kind == "sql":
        warehouse = os.environ.get("LAKEHOUSE_WAREHOUSE") or "file:///tmp/meldra-lakehouse"
        uri = os.environ.get("LAKEHOUSE_CATALOG_URI")
        if not uri:
            path = warehouse[len("file://"):] if warehouse.startswith("file://") else "/tmp/meldra-lakehouse"
            os.makedirs(path, exist_ok=True)
            uri = f"sqlite:///{path}/catalog.db"
        return {"type": "sql", "uri": uri, "warehouse": warehouse}
    raise RuntimeError("The lakehouse is not configured (set LAKEHOUSE_CATALOG).")


def describe() -> Dict[str, Any]:
    """Safe summary for the UI: never includes credentials."""
    kind = catalog_kind()
    if kind == "rest":
        return {"enabled": True, "catalog": "Apache Polaris (Iceberg REST)", "warehouse": os.environ.get("POLARIS_WAREHOUSE", "")}
    if kind == "sql":
        return {"enabled": True, "catalog": "Iceberg SQL catalog", "warehouse": "configured"}
    return {"enabled": False}
