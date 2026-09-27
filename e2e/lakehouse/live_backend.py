"""
Run the real Meldra backend against a real Apache Polaris catalog for the lakehouse
end-to-end test. Only two things are replaced: sign-in (everyone is e2e@example.com)
and the AI model's reply for the report builder (a fixed design, as the model would
return it), so the test does not need an OpenAI key. Prompts containing "without AI"
make the report builder fail, to exercise the rule-based fallback.
Test use only.
"""
import os
import sys
import tempfile

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "..", "..", "backend"))
os.environ.setdefault("DATABASE_URL", f"sqlite:///{tempfile.gettempdir()}/meldra_lake_e2e.db")
os.environ.setdefault("LAKEHOUSE_CATALOG", "rest")
os.environ.setdefault("POLARIS_URI", "http://localhost:8181/api/catalog")
os.environ.setdefault("POLARIS_CREDENTIAL", "root:s3cr3t")
os.environ.setdefault("POLARIS_WAREHOUSE", "meldra")
os.environ.setdefault("POLARIS_ACCESS_DELEGATION", "none")
os.environ.setdefault("LAKEHOUSE_NAMESPACE_PREFIX", "e2e")

import uvicorn  # noqa: E402

from app import main  # noqa: E402

AI_REPORT = {
    "title": "Workforce cost and revenue",
    "summary": "Headcount, cost per head and revenue by department, with spend mix and the sales funnel.",
    "tiles": [
        {"title": "Headline", "chart": "number", "groupBy": None, "series": [
            {"view": "employees", "measure": None, "agg": "count", "filters": [{"dim": "status", "op": "eq", "value": "Active"}], "label": "Active headcount"},
            {"view": "invoices", "measure": "amount", "agg": "sum", "label": "Invoiced"}]},
        {"title": "Cost per head by department", "chart": "combo", "groupBy": "department", "series": [
            {"view": "employees", "measure": "salary", "agg": "sum", "filters": [{"dim": "status", "op": "eq", "value": "Active"}], "label": "Salaries"},
            {"view": "employees", "measure": None, "agg": "count", "filters": [{"dim": "status", "op": "eq", "value": "Active"}], "label": "Headcount"}],
         "derived": [{"label": "Salary per head", "numerator": [0], "denominator": 1}]},
        {"title": "Supplier spend by category", "chart": "treemap", "groupBy": "category", "series": [{"view": "supplier_spend", "measure": "amount", "agg": "sum", "label": "Spend"}]},
        {"title": "Pipeline by stage", "chart": "funnel", "groupBy": "stage", "series": [{"view": "opportunities", "measure": "amount", "agg": "sum", "label": "Pipeline"}]},
        {"title": "Orders by month, 3-month rolling", "chart": "area", "groupBy": "month", "window": 3, "series": [{"view": "sales_orders", "measure": "amount", "agg": "sum", "label": "Orders"}]},
        {"title": "Expenses by department and category", "chart": "heatmap", "groupBy": "department", "splitBy": "category", "series": [{"view": "expenses", "measure": "amount", "agg": "sum", "label": "Expenses"}]},
    ],
}


async def fake_build_report(request, catalog, tiles=6):
    if "without ai" in request.lower():
        raise RuntimeError("AI unavailable (test)")
    views = {v["name"] for v in catalog.get("views", [])}
    assert {"employees", "invoices", "expenses"} <= views, views  # the model only ever sees the catalog
    return AI_REPORT


main.build_report = fake_build_report
main.app.dependency_overrides[main.get_current_user] = lambda: {"email": "e2e@example.com"}
uvicorn.run(main.app, host="127.0.0.1", port=8001, log_level="warning")
