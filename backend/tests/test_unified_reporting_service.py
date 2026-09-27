from app.services.unified_reporting_service import build_insight_prompt, build_plan_prompt

CATALOG = {
    "today": "2026-09-26",
    "data_range": "2025-10 to 2026-09",
    "currency": "GBP",
    "views": [
        {
            "name": "employees",
            "system": "SuccessFactors",
            "description": "One row per employee.",
            "dimensions": ["department", "status"],
            "measures": ["salary"],
        }
    ],
    "shared_dimensions": ["department", "month"],
    "known_values": ["department (employees): Sales, Engineering"],
    "notes": ["Employee status is \"Active\" or \"Left\"."],
}


def test_plan_prompt_lists_catalog_and_rules():
    prompt = build_plan_prompt("Cost per employee by department", "Headcount by department", CATALOG)
    assert "- employees (from SuccessFactors)" in prompt
    assert "Dimensions: department, status." in prompt
    assert '"derived"' in prompt
    assert '"clarify"' in prompt
    assert "Headcount by department" in prompt
    assert "combined on them): department, month." in prompt
    assert "Money is in GBP." in prompt
    assert prompt.rstrip().endswith("Question: Cost per employee by department")


def test_plan_prompt_clips_oversized_catalog():
    big = dict(CATALOG, views=[dict(CATALOG["views"][0], description="x" * 5000)] * 50)
    prompt = build_plan_prompt("q", None, big)
    assert prompt.count("(from SuccessFactors)") == 20
    assert "x" * 401 not in prompt


def test_insight_prompt_limits_rows():
    rows = [[f"D{i}", i] for i in range(100)]
    prompt = build_insight_prompt("Headcount by department", ["department", "Headcount"], rows, None)
    assert '"D24"' in prompt
    assert '"D25"' not in prompt


def test_insight_prompt_uses_data_currency():
    prompt = build_insight_prompt("Revenue by region", ["region", "Revenue"], [["North", 10]], None, "$")
    assert "$1.2M" in prompt
    assert "GBP" not in prompt


def test_plan_prompt_describes_analysis_options():
    prompt = build_plan_prompt("Expenses vs last year", None, CATALOG)
    for token in ('"splitBy"', '"compare"', '"prior_year"', '"window"', '"share"', '"heatmap"', '"waterfall"'):
        assert token in prompt
    assert '{"dim": "month", "op": "gte", "value": "2026-01"}' in prompt
