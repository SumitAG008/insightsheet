"""
Claude explains exceptions and suggests matches.

The engine has already found up to three candidates for each exception. Claude sees only the
unmatched items (date, amount, reference, a trimmed description) and those candidates, and may only
pick from them: it cannot invent a match. Its suggestions are applied by the engine when a person
accepts them ("forced" pairs), so the result stays deterministic and auditable.
"""
from __future__ import annotations

import json
from typing import Any, Dict, List

from app.services import ai_service

MAX_ITEMS = 60

PROMPT = (
    "You help an accountant finish a reconciliation between '{a}' (side A) and '{b}' (side B) in {region}. "
    "Below are the items that did not match automatically, each with up to three candidate items from the other side "
    "that the matching engine found. For each exception, explain in one plain sentence what most likely happened "
    "(e.g. bank charge, partial or short payment, TDS deducted, timing difference, duplicate entry, payment covering "
    "several invoices, FX difference, entry missing in the books) and what the accountant should do. If one or more "
    "candidates clearly belong to it, suggest them by id. Only use ids that appear in the candidates. Never invent "
    "items, amounts or ids. If unsure, say so and suggest nothing.\n"
    'Return JSON: {{"items": [{{"id": "...", "explanation": "...", "action": "...", "suggest": ["candidate ids"], '
    '"confidence": "high|medium|low"}}], "summary": "two or three sentences for the reconciliation sign-off"}}\n\n'
    "EXCEPTIONS:\n{data}"
)


def _compact(e: Dict[str, Any]) -> Dict[str, Any]:
    return {
        "id": e["id"], "side": e["side"], "date": e["date"], "amount": e["amount"], "reference": (e.get("reference") or "")[:60],
        "description": (e.get("description") or "")[:120], "engine_note": e.get("hint"),
        "candidates": [{k: c.get(k) for k in ("id", "date", "amount", "reference", "description", "difference", "days_apart")} for c in e.get("candidates", [])],
    }


async def explain(exceptions: List[Dict[str, Any]], a_label: str, b_label: str, region: str = "the UK or India") -> Dict[str, Any]:
    items = sorted(exceptions, key=lambda e: -abs(e.get("amount") or 0))[:MAX_ITEMS]
    prompt = PROMPT.format(a=a_label, b=b_label, region=region, data=json.dumps([_compact(e) for e in items], default=str))
    data = await ai_service.invoke_llm(prompt, response_schema={"type": "object"}, max_tokens=8000)
    if not isinstance(data, dict):
        data = {}
    allowed = {e["id"]: {c["id"] for c in e.get("candidates", [])} for e in items}
    out = []
    for it in data.get("items") or []:
        if not isinstance(it, dict) or it.get("id") not in allowed:
            continue
        sug = [s for s in (it.get("suggest") or []) if s in allowed[it["id"]]]  # only engine-found candidates
        out.append({"id": it["id"], "explanation": str(it.get("explanation") or "")[:400], "action": str(it.get("action") or "")[:300],
                    "suggest": sug, "confidence": it.get("confidence") if it.get("confidence") in ("high", "medium", "low") else "low"})
    return {"items": out, "summary": str(data.get("summary") or "")[:800], "explained": len(out), "sent": len(items),
            "note": "Claude saw only the unmatched items and their candidates. Suggestions are applied only when you accept them."}
