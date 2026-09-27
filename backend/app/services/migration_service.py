"""
Next-Gen Migration: AI-assisted schema mapping.

Only sheet and column NAMES are sent to the model — never employee values —
so no personal data leaves the browser. The frontend's rules engine maps
first; this refines columns it could not place confidently.

ZERO DATA STORAGE: prompts and responses are not persisted.
"""
import json
from typing import Any, Dict, List

from app.services.ai_service import invoke_llm

MAX_SHEETS = 40
MAX_COLUMNS = 80


def _clip(value: Any, limit: int = 120) -> str:
    return str(value if value is not None else "")[:limit]


def build_mapping_prompt(sheets: List[Dict[str, Any]], concepts: List[Dict[str, Any]], source_system: str) -> str:
    sheet_lines = []
    for s in sheets[:MAX_SHEETS]:
        cols = [_clip(c, 80) for c in (s.get("columns") or [])[:MAX_COLUMNS]]
        sheet_lines.append(f'- "{_clip(s.get("name"), 80)}": {json.dumps(cols)}')
    concept_lines = [f'- {_clip(c.get("id"), 40)}: {_clip(c.get("label"), 60)}' for c in concepts[:120]]
    return f"""You map HR data extract columns to canonical HR fields for a migration from {_clip(source_system, 40)} to SAP SuccessFactors.
Sheets and their column headers (values are not shown):
{chr(10).join(sheet_lines)}

Canonical fields (id: meaning):
{chr(10).join(concept_lines)}

Rules:
- Map a column only when you are confident of its meaning. Leave out anything unclear.
- Each canonical field can be used at most once per sheet.
- Use the sheet's purpose: "Country" on a company list is company_country, on an address sheet address_country.
- Employee identifiers (Employee_ID, Worker ID, Person Number) are employee_id; a manager's identifier is manager_id.
Return ONLY JSON: {{"mappings": [{{"sheet": sheet name, "column": column header, "concept": canonical field id, "confidence": 0 to 1}}]}}"""


async def suggest_mapping(sheets: List[Dict[str, Any]], concepts: List[Dict[str, Any]], source_system: str) -> List[Dict[str, Any]]:
    out = await invoke_llm(
        prompt=build_mapping_prompt(sheets, concepts, source_system),
        response_schema={"type": "json_object"},
        max_tokens=3000,
    )
    mappings = out.get("mappings") if isinstance(out, dict) else None
    if not isinstance(mappings, list):
        raise ValueError("Mapping assistant did not return a mappings list")
    valid = {c.get("id") for c in concepts}
    return [
        {"sheet": str(m.get("sheet")), "column": str(m.get("column")), "concept": m.get("concept"), "confidence": m.get("confidence")}
        for m in mappings
        if isinstance(m, dict) and m.get("concept") in valid
    ]
