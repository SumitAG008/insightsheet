from app.services.meldra_engine import CAPABILITIES, build_plan_prompt, catalog_text, fallback_plan, validate_plan
from app.services.personalization import TOOLS


def test_every_tool_has_capabilities_in_the_catalog():
    assert {t.id for t in TOOLS} == set(CAPABILITIES)
    text = catalog_text()
    for t in TOOLS:
        assert f"- {t.id} — {t.title}" in text


def test_prompt_shows_file_names_and_headers_only():
    prompt = build_plan_prompt("compare bank to ledger", [{"name": "bank.csv", "type": "csv", "headers": ["Date", "Amount"]}], "/dashboard")
    assert '0. bank.csv (csv) columns: ["Date", "Amount"]' in prompt
    assert "compare bank to ledger" in prompt and '"kind"' in prompt


def test_plan_keeps_known_tools_and_attached_files_only():
    plan = validate_plan({"kind": "plan", "summary": "Extract then reconcile", "steps": [
        {"tool": "invoice_extractor", "files": [0, 5], "instruction": "ignored, no box", "why": "Read invoices"},
        {"tool": "made_up_tool", "files": [0]},
        {"tool": "unified_reporting", "files": [1], "instruction": "Revenue by region, Q3 2026", "why": "Answer the question"},
    ]}, file_count=2)
    assert [s["tool"] for s in plan["steps"]] == ["invoice_extractor", "unified_reporting"]
    assert plan["steps"][0] == {"tool": "invoice_extractor", "files": [0], "instruction": "", "why": "Read invoices"}
    assert plan["steps"][1]["instruction"] == "Revenue by region, Q3 2026"


def test_plan_without_usable_steps_becomes_a_question():
    assert validate_plan({"kind": "plan", "steps": [{"tool": "nope"}]}, 0)["kind"] == "clarify"
    assert validate_plan({"kind": "answer", "answer": "meldra never stores files."}, 0)["answer"] == "meldra never stores files."


def test_fallback_uses_best_search_match():
    plan = fallback_plan("revenue by region", [{"id": "unified_reporting", "description": "Combine exports"}], 1)
    assert plan["steps"][0] == {"tool": "unified_reporting", "files": [0], "instruction": "revenue by region", "why": "Combine exports"}
    assert fallback_plan("??", [], 0)["kind"] == "clarify"
