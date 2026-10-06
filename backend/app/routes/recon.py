"""
Reconciliation v2 API. Files are read in memory and never stored. Open items carry forward through
a file the user downloads and brings back next month, not through server storage.

  GET  /api/recon/presets                 the ready-made reconciliations
  GET  /api/recon/sample/{country}/{side} sample files (uk|in, a|b)
  POST /api/recon/inspect                 one file → its columns, the detected roles and a preview
  POST /api/recon/run                     two files (+ last month's open items) → matches and exceptions
                                          output=json | xlsx (report) | open_items (csv)
  POST /api/recon/explain                 Claude explains the exceptions and suggests candidate matches
"""
from __future__ import annotations

import json
from datetime import date
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from fastapi.concurrency import run_in_threadpool
from fastapi.responses import Response
from pydantic import BaseModel, Field

from app.services import ai_service
from app.services.recon import engine, parse, presets, report, samples
from app.services.recon import explain as recon_explain
from app.utils.auth import get_current_user

router = APIRouter(prefix="/api/recon", tags=["reconciliation"])
MAX_BYTES = 25 * 1024 * 1024
MAX_ROWS = 100_000


async def _read(upload: UploadFile) -> bytes:
    data = await upload.read(MAX_BYTES + 1)
    if len(data) > MAX_BYTES:
        raise HTTPException(status_code=413, detail=f"{upload.filename} is larger than 25 MB.")
    return data


def _table(filename: str, content: bytes):
    try:
        headers, rows = parse.read_table(filename, content)
    except Exception:  # noqa: BLE001
        raise HTTPException(status_code=400, detail=f"{filename} could not be read. Upload .xlsx, .xls or .csv.")
    if len(rows) > MAX_ROWS:
        raise HTTPException(status_code=400, detail=f"{filename} has more than {MAX_ROWS:,} rows.")
    return headers, rows


@router.get("/presets")
def get_presets(current_user: dict = Depends(get_current_user)):
    return {"presets": presets.PRESETS, "passes": [{"id": p, "label": engine.PASS_TEXT[p]} for p in engine.PASSES]}


@router.get("/sample/{country}/{side}")
def get_sample(country: str, side: str, current_user: dict = Depends(get_current_user)):
    if country not in samples.SAMPLES or side not in ("a", "b"):
        raise HTTPException(status_code=404, detail="No such sample.")
    name, content = samples.SAMPLES[country]()[side]
    return Response(content, media_type="text/csv", headers={"Content-Disposition": f'attachment; filename="{name}"'})


@router.post("/inspect")
async def inspect(file: UploadFile = File(...), current_user: dict = Depends(get_current_user)):
    content = await _read(file)
    headers, rows = await run_in_threadpool(_table, file.filename or "file.csv", content)
    roles = parse.detect_roles(headers, rows)
    norm, skipped = parse.normalise(rows, roles, "X")
    dates = sorted(r["date"] for r in norm if r["date"])
    return {
        "filename": file.filename, "headers": headers, "rows": len(rows), "roles": roles,
        "preview": [{h: (None if r.get(h) is None else str(r.get(h))) for h in headers} for r in rows[:6]],
        "readable": len(norm), "skipped": len(skipped), "from": dates[0] if dates else None, "to": dates[-1] if dates else None,
        "total": round(sum(r["amount"] for r in norm), 2),
    }


def _options(cfg: Dict[str, Any]) -> engine.Options:
    p = presets.PRESET_BY_ID.get(cfg.get("preset") or "", {})
    o = {**{k: p[k] for k in ("factor", "date_window", "ref_window", "fuzzy_window", "many_window", "tol_pct") if k in p}, **(cfg.get("options") or {})}
    forced = [(list(x.get("a") or []), list(x.get("b") or [])) for x in (cfg.get("forced") or []) if isinstance(x, dict)]
    try:
        return engine.Options(
            factor=o.get("factor") if o.get("factor") in (1, -1) else None,
            tol_abs=float(o.get("tol_abs") or 0), tol_pct=float(o.get("tol_pct") or 0),
            date_window=int(o.get("date_window", 3)), ref_window=int(o.get("ref_window", 60)), fuzzy_window=int(o.get("fuzzy_window", 31)),
            many_window=int(o.get("many_window", 31)), max_parts=max(2, min(int(o.get("max_parts", 6)), 10)),
            passes=[x for x in (o.get("passes") or engine.PASSES) if x in engine.PASSES],
            fee_limit=float(o.get("fee_limit", 50)), period_end=o.get("period_end") or None, forced=forced,
        )
    except (TypeError, ValueError):
        raise HTTPException(status_code=400, detail="Some reconciliation settings are not numbers.")


@router.post("/run")
async def run(
    file_a: UploadFile = File(...),
    file_b: UploadFile = File(...),
    open_items: Optional[UploadFile] = File(None),
    config: str = Form("{}"),
    output: str = Form("json"),
    explanations: str = Form(""),
    current_user: dict = Depends(get_current_user),
):
    try:
        cfg = json.loads(config or "{}")
    except ValueError:
        raise HTTPException(status_code=400, detail="config must be JSON")
    a_bytes, b_bytes = await _read(file_a), await _read(file_b)
    carried = {"A": [], "B": []}
    if open_items is not None and open_items.filename:
        try:
            carried = report.read_open_items(open_items.filename, await _read(open_items))
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e))

    def work():
        ha, ra = _table(file_a.filename or "a.csv", a_bytes)
        hb, rb = _table(file_b.filename or "b.csv", b_bytes)
        roles_a = {**parse.detect_roles(ha, ra), **{k: v for k, v in (cfg.get("roles_a") or {}).items() if k in parse.ROLES}}
        roles_b = {**parse.detect_roles(hb, rb), **{k: v for k, v in (cfg.get("roles_b") or {}).items() if k in parse.ROLES}}
        for side, roles, headers, name in (("A", roles_a, ha, file_a.filename), ("B", roles_b, hb, file_b.filename)):
            for k, v in roles.items():
                if v and v not in headers:
                    roles[k] = None
            if not (roles.get("amount") or roles.get("debit") or roles.get("credit")):
                raise HTTPException(status_code=400, detail=f"No amount column found in {name}. Choose it on the column step.")
        a_rows, skip_a = parse.normalise(ra, roles_a, "A")
        b_rows, skip_b = parse.normalise(rb, roles_b, "B")
        a_rows += carried["A"]
        b_rows += carried["B"]
        result = engine.reconcile(a_rows, b_rows, _options(cfg))
        result["skipped"] = (skip_a + skip_b)[:200]
        result["roles"] = {"a": roles_a, "b": roles_b}
        result["carried"] = {"a": len(carried["A"]), "b": len(carried["B"])}
        dates = sorted(r["date"] for r in a_rows + b_rows if r["date"])
        result["as_of"] = cfg.get("options", {}).get("period_end") or (dates[-1] if dates else date.today().isoformat())
        rows = {r["id"]: {k: r.get(k) for k in ("id", "side", "date", "amount", "reference", "description", "counterparty", "source_row", "carried")} for r in a_rows + b_rows}
        return result, a_rows, b_rows, rows

    result, a_rows, b_rows, rows = await run_in_threadpool(work)
    labels = {"a": cfg.get("label_a") or "Side A", "b": cfg.get("label_b") or "Side B"}
    if output == "xlsx":
        expl = json.loads(explanations) if explanations else None
        data = await run_in_threadpool(report.workbook, result, a_rows, b_rows, labels, result["as_of"], expl)
        return Response(data, media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                        headers={"Content-Disposition": 'attachment; filename="reconciliation.xlsx"'})
    if output == "open_items":
        return Response(report.open_items_csv(result, result["as_of"]), media_type="text/csv",
                        headers={"Content-Disposition": f'attachment; filename="open_items_{result["as_of"]}.csv"'})
    result["rows"] = rows
    return result


class ExplainIn(BaseModel):
    exceptions: List[Dict[str, Any]] = Field(default_factory=list)
    label_a: str = "Side A"
    label_b: str = "Side B"
    region: str = "the UK or India"


@router.post("/explain")
async def explain(body: ExplainIn, current_user: dict = Depends(get_current_user)):
    if not body.exceptions:
        return {"items": [], "summary": "", "explained": 0, "sent": 0}
    try:
        return await recon_explain.explain(body.exceptions, body.label_a, body.label_b, body.region)
    except ai_service.AIServiceError as e:
        raise HTTPException(status_code=503, detail=f"AI is unavailable: {ai_service.explain_ai_error(e)}. The engine’s own notes are still shown.")
