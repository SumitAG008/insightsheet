"""
AI for meldra Legal, on Claude (app.services.ai_service). Three jobs:

  extract_order    Read an order sheet / daily order (text from OCR or paste): next date, outcome, stage,
                   judge, a short summary and the next steps. A regex fallback finds the next date when AI is off.
  ask              Answer a question about the firm's own diary (in English or Hindi), only from the rows given.
  summarise        Summarise a judgment's text in three lines plus the holding, quoting the original.

Rules for every prompt: answer only from the material supplied, say "not in the material" otherwise, never
invent a case or citation, and never present the answer as legal advice.
"""
from __future__ import annotations

import json
import re
from datetime import date
from typing import Any, Dict, List, Optional

from app.services import ai_service

GROUND_RULES = (
    "You are the legal operations assistant inside meldra Legal, used by law firms in {country}. "
    "Use ONLY the material given below. If the answer is not in it, say so plainly. "
    "Never invent cases, citations, dates or sections. You do not give legal advice; you organise the firm's information. "
    "{language_rule}"
)
LANG = {
    "en": "Reply in clear British English.",
    "hi": "Reply in Hindi (Devanagari script) using standard Hindi legal terms (e.g. अग्रिम जमानत, वादी, प्रतिवादी, लिखित कथन). "
          "Keep case names, citations, section numbers and quotations exactly as in the original English.",
}

_DATE_RE = re.compile(
    r"(?:next\s+date|list(?:ed)?\s+(?:on|again\s+on)|adjourned\s+to|re-?notify\s+on|put\s+up\s+on|fixed\s+for|on|अगली\s+तारीख)\D{0,25}"
    r"(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})",
    re.I,
)


def _rules(country: str, language: str) -> str:
    return GROUND_RULES.format(country="India" if country == "IN" else "the United Kingdom", language_rule=LANG.get(language, LANG["en"]))


def fallback_next_date(text: str) -> Optional[str]:
    """The last 'next date / listed on / adjourned to dd/mm/yyyy' in the text."""
    best = None
    for m in _DATE_RE.finditer(text or ""):
        d, mo, y = int(m.group(1)), int(m.group(2)), int(m.group(3))
        y = y + 2000 if y < 100 else y
        try:
            best = date(y, mo, d).isoformat()
        except ValueError:
            continue
    return best


def _outcome_guess(text: str) -> Optional[str]:
    t = (text or "").lower()
    for word, code in (("judgment reserved", "reserved"), ("reserved", "reserved"), ("disposed", "disposed"), ("dismissed", "disposed"),
                       ("allowed", "disposed"), ("part heard", "part_heard"), ("not reached", "not_reached"), ("adjourned", "adjourned"),
                       ("list again", "adjourned"), ("renotify", "adjourned"), ("heard", "heard")):
        if word in t:
            return code
    return None


async def extract_order(text: str, country: str, language: str = "en", stages: Optional[List[str]] = None) -> Dict[str, Any]:
    text = (text or "").strip()[:30000]
    fallback = {"next_date": fallback_next_date(text), "outcome": _outcome_guess(text), "stage": None, "judge": None,
                "summary": "", "next_steps": [], "method": "rules"}
    if not text:
        return fallback
    prompt = (
        _rules(country, language)
        + "\n\nTask: read this court order / order sheet and return JSON with keys: "
        '"next_date" (YYYY-MM-DD or null), "outcome" (one of adjourned, heard, part_heard, reserved, disposed, not_reached, or null), '
        f'"stage" (one of {", ".join(stages or [])}, or null), "judge" (string or null), "item_no" (string or null), '
        '"summary" (2-3 sentences), "next_steps" (list of short action items for the firm), '
        '"evidence" (the exact sentence from the order that states the next date, or null). '
        "Dates in Indian and UK orders are day/month/year.\n\nORDER:\n" + text
    )
    try:
        data = await ai_service.invoke_llm(prompt, response_schema={"type": "object"}, max_tokens=4000)
        if not isinstance(data, dict):
            return fallback
        out = {**fallback, **{k: data.get(k) for k in ("next_date", "outcome", "stage", "judge", "item_no", "summary", "next_steps", "evidence")}}
        if out.get("next_date"):
            try:
                date.fromisoformat(str(out["next_date"]))
            except ValueError:
                out["next_date"] = fallback["next_date"]
        out["method"] = "ai"
        return out
    except Exception as e:  # noqa: BLE001 - AI off or failing: the rules result is still useful
        fallback["ai_error"] = ai_service.explain_ai_error(e)
        return fallback


def _compact_matter(m: Dict[str, Any]) -> Dict[str, Any]:
    keep = ("id", "title", "client", "court_name", "stage", "status", "lawyer_email", "next_hearing", "filed_on", "reference",
            "fees_billed", "fees_collected", "sections", "opposing_counsel")
    return {k: m.get(k) for k in keep if m.get(k) not in (None, "", [])}


async def ask(question: str, country: str, language: str, matters: List[Dict[str, Any]], hearings: List[Dict[str, Any]],
              tasks: List[Dict[str, Any]], today: date) -> Dict[str, Any]:
    material = {
        "today": today.isoformat(),
        "matters": [_compact_matter(m) for m in matters[:400]],
        "recent_hearings": [{k: h.get(k) for k in ("matter_id", "date", "outcome", "next_date", "purpose")} for h in hearings[:600]],
        "open_tasks": [{k: t.get(k) for k in ("matter_id", "title", "due_date", "kind", "assignee_email")} for t in tasks if not t["done"]][:300],
    }
    prompt = (
        _rules(country, language)
        + "\n\nTask: answer the lawyer's question from the firm's diary below. Return JSON with keys "
        '"answer" (short, direct), "matter_ids" (ids you used), "follow_ups" (up to 3 suggested next questions, same language). '
        f"\n\nQUESTION: {question.strip()[:2000]}\n\nDIARY (JSON):\n{json.dumps(material, default=str)}"
    )
    data = await ai_service.invoke_llm(prompt, response_schema={"type": "object"}, max_tokens=4000)
    if not isinstance(data, dict):
        data = {"answer": str(data)}
    valid = {m["id"] for m in matters}
    data["matter_ids"] = [i for i in (data.get("matter_ids") or []) if isinstance(i, int) and i in valid]
    data.setdefault("follow_ups", [])
    return data


async def summarise(text: str, country: str, language: str, title: str = "") -> Dict[str, Any]:
    body = (text or "").strip()
    if not body:
        raise ValueError("There is no judgment text to summarise.")
    prompt = (
        _rules(country, language)
        + "\n\nTask: summarise this judgment for a busy lawyer. Return JSON with keys "
        '"summary" (3 lines), "holding" (one sentence), "key_paragraphs" (up to 3 objects: {"para": paragraph number or null, '
        '"quote": exact words from the text, under 60 words}), "statutes" (sections discussed), "outcome" (allowed/dismissed/etc. or null). '
        "Quotes must be copied exactly from the text.\n\n"
        f"TITLE: {title}\n\nJUDGMENT TEXT:\n{body[:120000]}"
    )
    data = await ai_service.invoke_llm(prompt, response_schema={"type": "object"}, max_tokens=6000)
    if not isinstance(data, dict):
        data = {"summary": str(data)}
    # Keep only quotes that really appear in the text.
    flat = re.sub(r"\s+", " ", body).lower()
    kept = []
    for kp in data.get("key_paragraphs") or []:
        q = re.sub(r"\s+", " ", str((kp or {}).get("quote") or "")).strip()
        if q and q.lower()[:80] in flat:
            kept.append(kp)
    data["key_paragraphs"] = kept
    data["note"] = "AI summary. Read the judgment before relying on it."
    return data
