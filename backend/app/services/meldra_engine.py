"""
Ask meldra: one prompt for the whole platform.

The user says what they want in plain words (and may attach files). The planner
turns that into a short plan of meldra tools, with the instruction to hand each
tool, or asks one clarifying question, or answers a question about meldra.

The model sees the request, file NAMES and types, and spreadsheet column
HEADERS only, never file contents. Every tool id it returns is checked against
the catalog; if the AI is unavailable the keyword search picks the tool, so
the prompt box always does something useful.

ZERO DATA STORAGE: prompts and plans are not persisted.
"""
import json
from typing import Any, Dict, List, Optional

from app.services.ai_service import assistant_model, invoke_llm
from app.services.personalization import TOOLS, TOOLS_BY_ID

MAX_FILES = 10
MAX_HEADERS = 40
MAX_STEPS = 4

# What each tool takes and gives back, and what its instruction box is for.
# "prompt" is None when the tool has no free-text box to fill.
CAPABILITIES: Dict[str, Dict[str, Any]] = {
    "excel_to_ppt": {"accepts": "one Excel or CSV file", "gives": "a PowerPoint deck with charts, tables and KPI slides", "prompt": None},
    "filename_cleaner": {"accepts": "a ZIP or many files", "gives": "the same files renamed (clean, find/replace, prefixes)", "prompt": None},
    "pdf_editor": {"accepts": "a PDF or a photo of a form", "gives": "a filled or edited PDF; also merge and split", "prompt": None},
    "pdf_doc_converter": {"accepts": "PDF, Word, Excel or images", "gives": "the file converted to another format", "prompt": None},
    "ocr": {"accepts": "scanned PDFs or images", "gives": "editable text", "prompt": None},
    "file_analyzer": {"accepts": "one spreadsheet", "gives": "an AI summary, data quality notes and insights", "prompt": None},
    "pl_builder": {"accepts": "a trial balance spreadsheet, or a description", "gives": "a profit and loss statement", "prompt": "describe the P&L to build (company, period, lines)"},
    "reconciliation": {"accepts": "two files to compare (e.g. bank statement and ledger)", "gives": "matched rows and the differences", "prompt": None},
    "auto_standardize": {"accepts": "one messy spreadsheet", "gives": "cleaned data: formats, duplicates, casing fixed", "prompt": None},
    "unified_reporting": {"accepts": "exports from one or more systems (CSV/Excel)", "gives": "answers, charts and report packs across all of them", "prompt": "the business question or report to build, in plain words"},
    "migration": {"accepts": "an HR/ERP system extract (Excel tabs or CSVs)", "gives": "mapped, cleansed, load-ordered files for the target system", "prompt": None},
    "invoice_extractor": {"accepts": "invoice PDFs or photos", "gives": "header fields and line items in Excel", "prompt": None},
    "database_connection": {"accepts": "database connection details", "gives": "read-only query results", "prompt": None},
    "data_model_creator": {"accepts": "table lists or a description", "gives": "a data model (tables, keys, relationships) and SQL", "prompt": "describe the tables or business the model is for"},
    "agentic_ai": {"accepts": "a goal, optionally with a data file or document", "gives": "an AI agent that plans, runs the analysis steps and writes a report", "prompt": "the goal for the agent, specific and complete"},
    "web_scraper": {"accepts": "a public website URL", "gives": "the site's table or list data as CSV", "prompt": "the website URL to collect from"},
    "settings": {"accepts": "nothing", "gives": "profile, language, branding and devices", "prompt": None},
}


def _clip(value: Any, limit: int = 120) -> str:
    return str(value if value is not None else "")[:limit]


def catalog_text() -> str:
    lines = []
    for t in TOOLS:
        cap = CAPABILITIES.get(t.id, {})
        prompt = f" Instruction box: {cap['prompt']}." if cap.get("prompt") else " No instruction box."
        lines.append(f"- {t.id} — {t.title}: {t.description}. Takes {cap.get('accepts', 'files')}; gives {cap.get('gives', 'results')}.{prompt}")
    return "\n".join(lines)


def _files_text(files: List[Dict[str, Any]]) -> str:
    if not files:
        return "(no files attached)"
    out = []
    for i, f in enumerate(files[:MAX_FILES]):
        headers = [_clip(h, 40) for h in (f.get("headers") or [])[:MAX_HEADERS]]
        cols = f" columns: {json.dumps(headers)}" if headers else ""
        out.append(f"{i}. {_clip(f.get('name'), 100)} ({_clip(f.get('type'), 20)}){cols}")
    return "\n".join(out)


def build_plan_prompt(request: str, files: List[Dict[str, Any]], page: Optional[str] = None) -> str:
    return f"""You are the command engine of meldra (insight.meldra.ai), a privacy-first data platform.
Turn the user's request into a plan using ONLY these tools:
{catalog_text()}

The user is on page: {_clip(page or "/", 60)}
Attached files (names and column headers only; contents are never shown):
{_files_text(files)}

User request: \"\"\"{_clip(request, 1000)}\"\"\"

Decide ONE kind:
- "plan": 1 to {MAX_STEPS} steps, in order, when tools can do it. Prefer ONE step; use more only when the output of one tool feeds the next (e.g. invoice_extractor then reconciliation).
  For each step give the tool id, the files it uses (indexes into the attached list), and "instruction": the text to put in that tool's instruction box,
  rewritten to be specific and complete (keep the user's names, periods and numbers; never invent data). Use "" when the tool has no instruction box.
  Add "why": at most 15 words on what this step does for the user.
- "clarify": the request is too vague to pick a tool, or needs a file that is missing. Ask ONE short question.
- "answer": a question about meldra itself (what it can do, privacy, how a tool works). Answer in at most 4 sentences using the tool list.
Never suggest tools outside the list. If nothing fits, use "answer" and say what meldra can do instead.
Return ONLY JSON:
{{"kind": "plan"|"clarify"|"answer", "summary": at most 15 words restating the goal,
 "steps": [{{"tool": tool id, "files": [indexes], "instruction": text, "why": text}}],
 "question": text or null, "answer": text or null}}"""


def validate_plan(out: Any, file_count: int) -> Dict[str, Any]:
    """Keep only known tools and attached file indexes; fall back to a question when nothing usable remains."""
    if not isinstance(out, dict):
        raise ValueError("Planner did not return JSON")
    kind = out.get("kind")
    summary = _clip(out.get("summary"), 160)
    if kind == "answer" and out.get("answer"):
        return {"kind": "answer", "summary": summary, "answer": _clip(out.get("answer"), 1200), "steps": []}
    if kind == "clarify" and out.get("question"):
        return {"kind": "clarify", "summary": summary, "question": _clip(out.get("question"), 300), "steps": []}
    steps = []
    for s in (out.get("steps") or [])[:MAX_STEPS]:
        if not isinstance(s, dict) or s.get("tool") not in TOOLS_BY_ID:
            continue
        idx = [i for i in (s.get("files") or []) if isinstance(i, int) and 0 <= i < file_count]
        has_box = bool(CAPABILITIES.get(s["tool"], {}).get("prompt"))
        steps.append({
            "tool": s["tool"],
            "files": sorted(set(idx)),
            "instruction": _clip(s.get("instruction"), 1000) if has_box else "",
            "why": _clip(s.get("why"), 160),
        })
    if not steps:
        return {"kind": "clarify", "summary": summary, "question": "Which kind of task is this: a report, a file conversion, a clean-up, a comparison or a migration?", "steps": []}
    return {"kind": "plan", "summary": summary, "steps": steps}


def fallback_plan(request: str, ranked: List[dict], file_count: int) -> Dict[str, Any]:
    """Without the AI: open the best keyword match with the request as its instruction."""
    if not ranked:
        return {"kind": "clarify", "summary": "", "question": "I couldn't match that to a tool. Could you say it another way, e.g. \"excel to ppt\" or \"compare two files\"?", "steps": [], "source": "search"}
    tool = ranked[0]["id"]
    has_box = bool(CAPABILITIES.get(tool, {}).get("prompt"))
    return {
        "kind": "plan",
        "summary": "",
        "steps": [{"tool": tool, "files": list(range(file_count)), "instruction": _clip(request, 1000) if has_box else "", "why": ranked[0].get("description", "")}],
        "source": "search",
    }


async def plan_request(request: str, files: List[Dict[str, Any]], page: Optional[str] = None) -> Dict[str, Any]:
    out = await invoke_llm(
        prompt=build_plan_prompt(request, files, page),
        response_schema={"type": "json_object"},
        max_tokens=1500,
        model=assistant_model(),
    )
    plan = validate_plan(out, min(len(files), MAX_FILES))
    plan["source"] = "ai"
    return plan
