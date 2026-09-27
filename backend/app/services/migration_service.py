"""
Next-Gen Migration: AI-assisted schema mapping.

Only tab and column NAMES are sent to the model — never employee values —
so no personal data leaves the browser. The model classifies what each tab
is (worker data, retirees, pension, dependents, org lists…) and maps
columns to canonical HR fields; the frontend's rules engine keeps the
user's own choices and its confident matches.

ZERO DATA STORAGE: prompts and responses are not persisted.
"""
import json
from typing import Any, Dict, List

from app.services.ai_service import assistant_model, invoke_llm

MAX_SHEETS = 40
MAX_COLUMNS = 80

TAB_PURPOSES = [
    "worker", "job_history", "compensation_history", "one_time_payments", "bank_details",
    "payroll_balances", "addresses", "contacts", "terminations", "retirees", "pension",
    "dependents", "leave_balances", "work_permits", "benefits", "org_companies",
    "org_departments", "org_locations", "org_cost_centers", "org_jobs", "other",
]


def _clip(value: Any, limit: int = 120) -> str:
    return str(value if value is not None else "")[:limit]


def build_mapping_prompt(sheets: List[Dict[str, Any]], concepts: List[Dict[str, Any]], source_system: str) -> str:
    sheet_lines = []
    for s in sheets[:MAX_SHEETS]:
        cols = [_clip(c, 80) for c in (s.get("columns") or [])[:MAX_COLUMNS]]
        sheet_lines.append(f'- "{_clip(s.get("name"), 80)}": {json.dumps(cols)}')
    concept_lines = [f'- {_clip(c.get("id"), 40)}: {_clip(c.get("label"), 60)}' for c in concepts[:150]]
    return f"""You map HR data extract columns to canonical HR fields for a migration from {_clip(source_system, 40)} to SAP SuccessFactors.
Tabs and their column headers (values are not shown):
{chr(10).join(sheet_lines)}

Canonical fields (id: meaning):
{chr(10).join(concept_lines)}

Rules:
- First decide each tab's purpose, one of: {", ".join(TAB_PURPOSES)}.
- Map a column only when you are confident of its meaning. Leave out anything unclear.
- Each canonical field can be used at most once per tab.
- Use the tab's purpose: "Country" on a company list is company_country, on an address tab address_country.
  On a dependents, beneficiaries or emergency-contact tab, names and dates of birth belong to the dependent, NOT the employee: map only employee_id there.
  On a retirees tab, the retirement date is retirement_date and a pension amount is pension_payout_amount.
- Employee identifiers (Employee_ID, Worker ID, Person Number) are employee_id; a manager's identifier is manager_id.
Return ONLY JSON:
{{"tabs": [{{"sheet": tab name, "purpose": one purpose, "note": at most 12 words on what the tab holds}}],
 "mappings": [{{"sheet": tab name, "column": column header, "concept": canonical field id, "confidence": 0 to 1}}]}}"""


async def suggest_mapping(sheets: List[Dict[str, Any]], concepts: List[Dict[str, Any]], source_system: str) -> Dict[str, Any]:
    out = await invoke_llm(
        prompt=build_mapping_prompt(sheets, concepts, source_system),
        response_schema={"type": "json_object"},
        max_tokens=4000,
        model=assistant_model(),
    )
    if not isinstance(out, dict):
        raise ValueError("Mapping assistant did not return JSON")
    valid = {c.get("id") for c in concepts}
    mappings = [
        {"sheet": str(m.get("sheet")), "column": str(m.get("column")), "concept": m.get("concept"), "confidence": m.get("confidence")}
        for m in (out.get("mappings") or [])
        if isinstance(m, dict) and m.get("concept") in valid
    ]
    tabs = [
        {"sheet": str(t.get("sheet")), "purpose": t.get("purpose"), "note": _clip(t.get("note"), 120)}
        for t in (out.get("tabs") or [])
        if isinstance(t, dict) and t.get("purpose") in TAB_PURPOSES
    ]
    return {"mappings": mappings, "tabs": tabs}
