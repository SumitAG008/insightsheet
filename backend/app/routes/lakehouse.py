"""
Lakehouse endpoints for Unified Reporting: store sources as Iceberg tables in the
customer's own namespace and aggregate them server-side.
Every call is scoped to the signed-in account's namespace.
"""
import logging
import os
import shutil
import tempfile
import time
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from fastapi.concurrency import run_in_threadpool
from pydantic import BaseModel, Field

from app.services.lakehouse import config
from app.services.lakehouse import query as lq
from app.services.lakehouse import sql as lsql
from app.services.lakehouse import store
from app.utils.auth import get_current_user

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/lakehouse", tags=["lakehouse"])
MAX_JSON_ROWS = 200_000


def _tenant(user: dict) -> str:
    # One namespace per account today; an organisation id can replace this for shared workspaces.
    return str(user.get("organization_id") or user.get("email") or "")


def _require():
    if not config.enabled():
        raise HTTPException(status_code=503, detail="The Meldra lakehouse is not configured on this server.")


def _fail(e: Exception, what: str):
    if isinstance(e, store.LakehouseError):
        raise HTTPException(status_code=400, detail=str(e))
    logger.error(f"Lakehouse {what} failed: {type(e).__name__}: {str(e)[:300]}")
    raise HTTPException(status_code=500, detail=f"The lakehouse could not {what}. Please try again.")


@router.get("/status")
async def status(current_user: dict = Depends(get_current_user)):
    return {**config.describe(), "max_upload_mb": config.max_upload_bytes() // (1024 * 1024)}


@router.get("/sources")
async def sources(current_user: dict = Depends(get_current_user)):
    _require()
    try:
        return {"sources": await run_in_threadpool(store.list_tables, _tenant(current_user))}
    except Exception as e:
        _fail(e, "list your sources")


@router.post("/upload")
async def upload(file: UploadFile = File(...), system: Optional[str] = Form(None), current_user: dict = Depends(get_current_user)):
    """Stream the upload to a temporary file (size-capped), then store it as Iceberg table(s)."""
    _require()
    limit = config.max_upload_bytes()
    suffix = os.path.splitext(file.filename or "")[1][:10]
    tmp = tempfile.NamedTemporaryFile(delete=False, suffix=suffix)
    size = 0
    try:
        with tmp:
            while chunk := await file.read(8 << 20):
                size += len(chunk)
                if size > limit:
                    raise HTTPException(status_code=413, detail=f"The file is larger than {limit // (1024 * 1024)} MB.")
                tmp.write(chunk)
        started = time.monotonic()
        added = await run_in_threadpool(store.ingest_file, _tenant(current_user), tmp.name, file.filename or "upload.csv", system)
        rows = sum(int(a.get("row_count") or 0) for a in added)
        logger.info(f"Lakehouse upload: {len(added)} table(s), {size} bytes, {rows} rows, stored in {time.monotonic() - started:.1f}s")
        return {"sources": added}
    except HTTPException:
        raise
    except Exception as e:
        _fail(e, "store the file")
    finally:
        os.unlink(tmp.name)


class RowsRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    system: Optional[str] = Field(None, max_length=120)
    kind: str = Field("file", max_length=20)
    columns: List[str] = Field(default_factory=list, max_length=1000)
    rows: List[Dict[str, Any]] = Field(..., max_length=MAX_JSON_ROWS)
    origin: Optional[Dict[str, Any]] = None
    replace_table: Optional[str] = Field(None, max_length=80)


@router.post("/rows")
async def store_rows(req: RowsRequest, current_user: dict = Depends(get_current_user)):
    """Store rows already in the browser (an API pull, a database query, or a source moved to Meldra)."""
    _require()
    origin = req.origin if isinstance(req.origin, dict) else None
    if origin:
        # Settings only: anything that looks like a secret is dropped before it is written.
        from app.services.connector_auth import SECRET_FIELDS
        auth = origin.get("auth")
        if isinstance(auth, dict):
            origin = {**origin, "auth": {k: v for k, v in auth.items() if k not in SECRET_FIELDS and k != "certificate"}}
        for k in ("password", "token", "client_secret", "private_key", "refresh_token"):
            origin.pop(k, None)
    try:
        src = await run_in_threadpool(store.ingest_rows, _tenant(current_user), req.name, req.system or req.name, req.columns, req.rows,
                                      req.kind if req.kind in ("file", "api", "database", "sample") else "file", origin, req.replace_table)
        return {"source": src}
    except Exception as e:
        _fail(e, "store the rows")


class PatchRequest(BaseModel):
    system: Optional[str] = Field(None, max_length=120)
    name: Optional[str] = Field(None, max_length=200)
    columns: Optional[List[Dict[str, Any]]] = Field(None, max_length=1000)


@router.patch("/sources/{table}")
async def patch_source(table: str, req: PatchRequest, current_user: dict = Depends(get_current_user)):
    _require()
    try:
        return {"source": await run_in_threadpool(store.update_table, _tenant(current_user), table, req.model_dump(exclude_none=True))}
    except Exception as e:
        _fail(e, "save your changes")


@router.delete("/sources/{table}")
async def delete_source(table: str, current_user: dict = Depends(get_current_user)):
    _require()
    try:
        await run_in_threadpool(store.drop_table, _tenant(current_user), table)
        return {"deleted": table}
    except Exception as e:
        _fail(e, "delete the source")


@router.delete("/sources")
async def delete_all(current_user: dict = Depends(get_current_user)):
    """Remove every table this account stored (data files included)."""
    _require()
    try:
        return {"deleted": await run_in_threadpool(store.drop_all, _tenant(current_user))}
    except Exception as e:
        _fail(e, "delete your data")


@router.get("/sources/{table}/preview")
async def preview(table: str, limit: int = 50, current_user: dict = Depends(get_current_user)):
    _require()
    try:
        return await run_in_threadpool(store.preview, _tenant(current_user), table, limit)
    except Exception as e:
        _fail(e, "show the rows")


class SqlRequest(BaseModel):
    sql: str = Field(..., min_length=1, max_length=lsql.MAX_SQL)
    tables: Dict[str, str] = Field(..., min_length=1, max_length=lsql.MAX_TABLES)


@router.post("/sql")
async def run_sql(req: SqlRequest, current_user: dict = Depends(get_current_user)):
    """Run the customer's own SELECT over their stored sources (read-only, own tables only)."""
    _require()
    try:
        return await run_in_threadpool(lsql.run_sql, _tenant(current_user), req.sql, req.tables)
    except Exception as e:
        _fail(e, "run the query")


class AggregateRequest(BaseModel):
    series: List[Dict[str, Any]] = Field(..., min_length=1, max_length=lq.MAX_SERIES)


@router.post("/aggregate")
async def aggregate(req: AggregateRequest, current_user: dict = Depends(get_current_user)):
    _require()
    try:
        return {"results": await run_in_threadpool(lq.aggregate, _tenant(current_user), req.series)}
    except Exception as e:
        _fail(e, "calculate the answer")


class LinksRequest(BaseModel):
    tables: List[str] = Field(..., max_length=20)


@router.post("/suggest-links")
async def suggest_links(req: LinksRequest, current_user: dict = Depends(get_current_user)):
    _require()
    try:
        return {"links": await run_in_threadpool(lq.suggest_links, _tenant(current_user), req.tables)}
    except Exception as e:
        _fail(e, "suggest links")
