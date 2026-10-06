"""
Unified Reporting service.

Turns a business question into a query *spec* over the unified model, and
writes the plain-English answer for a computed result.

The planner only ever sees catalog metadata (views, dimensions, measures and a
few known values), never rows. The spec it returns is validated again by the
frontend engine, which alone decides how systems are aggregated and joined.

ZERO DATA STORAGE: prompts and responses are not persisted.
"""
import json
from typing import Any, Dict, List, Optional

from app.services.ai_service import assistant_model, invoke_llm

MAX_VIEWS = 20
MAX_LIST = 40
MAX_TEXT = 400


def _clip(value: Any, limit: int = MAX_TEXT) -> str:
    return str(value if value is not None else "")[:limit]


def _clip_list(values: Any, limit: int = MAX_LIST) -> List[str]:
    if not isinstance(values, list):
        return []
    return [_clip(v, 120) for v in values[:limit]]


SPEC_SCHEMA = """{"title": short answer title,
 "chart": "bar"|"line"|"area"|"combo"|"pie"|"treemap"|"funnel"|"radar"|"scatter"|"table"|"number"|"heatmap"|"waterfall",
 "groupBy": one dimension that every series has, or null for totals,
 "splitBy": optional second dimension to split a single series by (for example expenses by department split by category), or null,
 "filters": [{"dim": dimension, "op": "eq"|"neq"|"gte"|"lte", "value": string}] applied to every series whose view has that dimension,
 "compare": "prior_year"|"prior_period"|null (only with groupBy "month"),
 "window": rolling months 2 to 24 or null (only with groupBy "month"),
 "share": true to add each group's share of the total,
 "series": [{"view": view name, "measure": measure name or null to count rows, "agg": "sum"|"count"|"avg"|"min"|"max", "filters": [{"dim": dimension, "op": "eq"|"neq"|"gte"|"lte", "value": string}], "label": short series name}],
 "derived": [{"label": short name, "numerator": [series indexes to add, 0-based], "denominator": series index or null}],
 "sort": "desc"|"asc"|"label", "limit": 3 to 25,
 "followups": [three short, specific next questions a manager might ask]}"""

SPEC_RULES = """- Use up to 4 series. Use 2 or more only to combine systems, and they must all share groupBy (for example orders vs invoices by customer, or headcount vs expenses by department).
- Never average ratios row by row. For ratios such as cost per head, return the totals as series and a "derived" entry, e.g. salaries, expenses and spend over headcount.
- Chart from the shape of the answer, or exactly the chart the user names: one breakdown and one number gives bar; time (groupBy "month") gives line, or area for volumes; two numbers with different units over the same breakdown (e.g. revenue and margin %) gives combo (first series bars, the rest lines); parts of a whole with 6 or fewer groups can be pie, with many groups treemap; stages in order (pipeline, recruiting) gives funnel; several numbers compared across a few items gives radar; two or three numbers per item compared against each other gives scatter (x, y, and bubble size).
- Use "splitBy" only with exactly one series and no derived metrics; a grid of two breakdowns can use chart "heatmap". "waterfall" suits one additive series (sum or count) showing how groups build up to a total.
- For "vs last year", "year over year" or "month over month" use groupBy "month" with "compare"; for "rolling", "trailing" or "moving" totals use "window"; for "share", "% of total" or "contribution" use "share": true. Date ranges are filters on month, e.g. {"dim": "month", "op": "gte", "value": "2026-01"}."""


def build_plan_prompt(question: str, previous_question: Optional[str], catalog: Dict[str, Any]) -> str:
    views = catalog.get("views") if isinstance(catalog.get("views"), list) else []
    view_lines = []
    for v in views[:MAX_VIEWS]:
        if not isinstance(v, dict):
            continue
        view_lines.append(
            f"- {_clip(v.get('name'), 40)} (from {_clip(v.get('system'), 40)}): {_clip(v.get('description'))} "
            f"Dimensions: {', '.join(_clip_list(v.get('dimensions')))}. "
            f"Measures: {', '.join(_clip_list(v.get('measures')))}."
        )
    known = "\n".join(_clip_list(catalog.get("known_values")))
    notes = " ".join(_clip_list(catalog.get("notes"), 10))
    shared = ", ".join(_clip_list(catalog.get("shared_dimensions"))) or "none"
    currency = _clip(catalog.get("currency"), 4)
    prev = (
        f'The previous question was: "{_clip(previous_question, 300)}". Treat short follow-ups as refinements of it.\n'
        if previous_question
        else ""
    )

    return f"""You are meldra, an analytics assistant for business users. Turn the question into a query spec over meldra's unified data model, which combines tables exported from several business systems. Data covers {_clip(catalog.get('data_range'), 40)}. Today is {_clip(catalog.get('today'), 20)}.{f" Money is in {currency}." if currency else ""}
Views (one per source table):
{chr(10).join(view_lines)}
Shared dimensions (present in two or more views, so views can be combined on them): {shared}.
Known values:
{known}
{notes}
Return ONLY a JSON object:
{SPEC_SCHEMA}
Rules:
{SPEC_RULES}
- If the question is ambiguous in a way that changes the numbers (for example "cost" could mean salaries only or fully loaded cost), return {{"clarify": one short question, "options": [2 to 4 short answers]}} instead.
- If the question needs data these views don't have, or two things share no dimension, return {{"cannot": one friendly sentence naming what's missing and suggesting the closest question that can be answered}}.
{prev}Question: {_clip(question, 500)}"""


def build_insight_prompt(
    question: str, columns: List[str], rows: List[List[Any]], notes: Optional[str], currency: Optional[str] = None
) -> str:
    safe_rows = rows[:25] if isinstance(rows, list) else []
    note = f"\nNote: {_clip(notes, 600)} Mention this in one short clause." if notes else ""
    money = _clip(currency, 4)
    return f"""Write 2 or 3 short sentences for a business manager answering: "{_clip(question, 500)}". Lead with the direct answer, name the biggest and smallest values, and point out one thing worth acting on. If two series are compared, comment on the gap between them. Write large numbers compactly, like {money}1.2M or {money}340K. No markdown, no preamble.
Columns: {' | '.join(_clip_list(columns, 10))}
Rows: {json.dumps(safe_rows, default=str)[:6000]}{note}"""


async def plan_report(question: str, previous_question: Optional[str], catalog: Dict[str, Any]) -> Dict[str, Any]:
    prompt = build_plan_prompt(question, previous_question, catalog or {})
    spec = await invoke_llm(prompt=prompt, response_schema={"type": "json_object"}, max_tokens=1200, model=assistant_model())
    if not isinstance(spec, dict):
        raise ValueError("Planner did not return a JSON object")
    return spec


async def write_insight(
    question: str, columns: List[str], rows: List[List[Any]], notes: Optional[str] = None, currency: Optional[str] = None
) -> str:
    text = await invoke_llm(prompt=build_insight_prompt(question, columns, rows, notes, currency), max_tokens=300, model=assistant_model())
    return str(text or "").strip()


MAX_TILES = 8


def _catalog_text(catalog: Dict[str, Any]) -> str:
    views = catalog.get("views") if isinstance(catalog.get("views"), list) else []
    lines = []
    for v in views[:MAX_VIEWS]:
        if isinstance(v, dict):
            lines.append(
                f"- {_clip(v.get('name'), 40)} (from {_clip(v.get('system'), 40)}): {_clip(v.get('description'))} "
                f"Dimensions: {', '.join(_clip_list(v.get('dimensions')))}. Measures: {', '.join(_clip_list(v.get('measures')))}."
            )
    currency = _clip(catalog.get("currency"), 4)
    return (
        f"Data covers {_clip(catalog.get('data_range'), 40)}. Today is {_clip(catalog.get('today'), 20)}.{f' Money is in {currency}.' if currency else ''}\n"
        f"Views (one per source table):\n{chr(10).join(lines)}\n"
        f"Shared dimensions (views can be combined on them): {', '.join(_clip_list(catalog.get('shared_dimensions'))) or 'none'}.\n"
        f"Known values:\n{chr(10).join(_clip_list(catalog.get('known_values')))}\n"
        f"{' '.join(_clip_list(catalog.get('notes'), 10))}"
    )


def build_report_prompt(request: str, catalog: Dict[str, Any], tiles: int = 6) -> str:
    n = max(2, min(MAX_TILES, int(tiles or 6)))
    return f"""You are meldra, an analytics assistant. Design a report that answers the request below using ONLY the data described. Pick the {n} most useful charts at most: start with the headline numbers (chart "number" with groupBy null), then the breakdowns and trends that explain them, combining systems where they share a dimension.
{_catalog_text(catalog or {})}
Return ONLY a JSON object:
{{"title": report title, "summary": one or two sentences on what the report shows and for whom,
 "tiles": [up to {n} chart specs, each one:
{SPEC_SCHEMA}
 ]}}
Rules for every tile:
{SPEC_RULES}
- Each tile answers a different question; no two tiles show the same numbers the same way.
- Leave "followups" empty in tiles.
- If the data cannot support the request, return {{"cannot": one friendly sentence naming what is missing and what report is possible instead}}.
Request: {_clip(request, 600)}"""


async def build_report(request: str, catalog: Dict[str, Any], tiles: int = 6) -> Dict[str, Any]:
    out = await invoke_llm(prompt=build_report_prompt(request, catalog or {}, tiles), response_schema={"type": "json_object"},
                           max_tokens=3500, model=assistant_model())
    if not isinstance(out, dict):
        raise ValueError("Report builder did not return a JSON object")
    if isinstance(out.get("tiles"), list):
        out["tiles"] = [t for t in out["tiles"] if isinstance(t, dict)][:MAX_TILES]
    return out

