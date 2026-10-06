"""The showcase pack (public/sample-data) gives the results its demo script promises.

The files are built by scripts/build_showcase.py. These tests run them through the same services
the product uses, so a change that alters a demo result fails here before it reaches a customer.
"""
import asyncio
import io
from pathlib import Path

import pandas as pd
import pytest

from app.services.file_analyzer import FileAnalyzerService
from app.services.reconciliation_service import ReconcileOptions, ReconciliationService
from app.services.standardize_service import StandardizeOptions, StandardizeService, _parse_date_cell, text_variants

PACK = Path(__file__).resolve().parents[2] / "public" / "sample-data"
COMPLEX = PACK / "complex"

pytestmark = pytest.mark.skipif(not PACK.exists(), reason="showcase pack not built")


def read(path: Path) -> bytes:
    return path.read_bytes()


def analyse(name: str):
    async def no_ai(*_a, **_k):
        return {}

    svc = FileAnalyzerService()
    svc._generate_ai_summary = no_ai
    return asyncio.run(svc.analyze_excel_file(io.BytesIO(read(PACK / name)), name))


def test_bank_vs_cash_book_finds_every_planted_difference():
    _, s = ReconciliationService().reconcile(
        "cash-book-september.xlsx", read(COMPLEX / "cash-book-september.xlsx"),
        "bank-statement-september.csv", read(COMPLEX / "bank-statement-september.csv"),
        "Reference", "Reference", "Amount", "Amount", ReconcileOptions(tolerance=0.01),
    )
    # 3 typed amounts and 1 payment entered twice; 3 bank charges not in the book; 6 not yet cleared.
    # The two penny differences match within the 0.01 tolerance; padded references still match.
    assert s["counts"] == {"matched": 170, "mismatch": 4, "missing_on_left": 3, "missing_on_right": 6, "total_keys": 183}


def test_bank_vs_cash_book_without_tolerance_shows_the_pennies():
    _, s = ReconciliationService().reconcile(
        "cash-book-september.xlsx", read(COMPLEX / "cash-book-september.xlsx"),
        "bank-statement-september.csv", read(COMPLEX / "bank-statement-september.csv"),
        "Reference", "Reference", "Amount", "Amount", ReconcileOptions(tolerance=0),
    )
    assert s["counts"]["mismatch"] == 6


def test_intercompany_balances_disagree_in_four_places():
    _, s = ReconciliationService().reconcile(
        "intercompany-uk.xlsx", read(COMPLEX / "intercompany-uk.xlsx"),
        "intercompany-de.xlsx", read(COMPLEX / "intercompany-de.xlsx"),
        "IC reference", "IC reference", "Amount GBP", "Amount GBP",
    )
    assert s["counts"] == {"matched": 37, "mismatch": 2, "missing_on_left": 1, "missing_on_right": 1, "total_keys": 41}


def test_messy_pack_check_finds_the_problems():
    sheets = {s["name"]: s for s in analyse("complex/messy-management-pack.xlsx")["sheets"]}
    assert sheets["Notes (blank)"]["row_count"] == 0
    sales = sheets["Regional sales"]
    assert sales["row_count"] == 152  # the title rows above the table are skipped
    assert sales["duplicate_rows"] == 2
    cols = {c["name"]: c for c in sales["columns"]}
    assert cols["Amount"]["type"] == "numeric"
    assert cols["Amount"]["null_count"] == 1
    assert cols["Region"]["inconsistent_values"] == [[" north ", "North"]]
    assert cols["Discount %"]["type"] == "numeric"  # numbers are never mistaken for dates


def test_messy_pack_cleans_the_table_not_the_cover():
    out, s = StandardizeService().standardize(
        "messy-management-pack.xlsx", read(COMPLEX / "messy-management-pack.xlsx"), StandardizeOptions(unify_text=True)
    )
    assert s["sheet"] == "Regional sales"
    assert s["duplicate_rows_removed"] == 2
    assert s["text_values_unified"] == 1
    df = pd.read_excel(io.BytesIO(out))
    assert sorted(df["region"].unique()) == ["North", "South", "West"]
    assert str(df["order_date"].dtype).startswith("datetime64")
    assert df["order_date"].min() >= pd.Timestamp("2026-07-01")  # day-first: 03/07/2026 is 3 July
    assert df["order_date"].max() <= pd.Timestamp("2026-09-30")
    assert (df["amount"] < 0).sum() == 4  # credit notes in brackets


def test_a_named_tab_can_be_cleaned():
    _, s = StandardizeService().standardize(
        "messy-management-pack.xlsx", read(COMPLEX / "messy-management-pack.xlsx"), StandardizeOptions(sheet="P&L")
    )
    assert s["sheet"] == "P&L" and s["rows_after"] == 5


def test_dates_read_day_first_unless_the_column_says_otherwise():
    assert _parse_date_cell("03/07/2026").month == 7
    assert _parse_date_cell("07/23/2026", month_first=True).day == 23
    assert _parse_date_cell("2026-09-01").day == 1
    assert _parse_date_cell("not a date") == "not a date"


def test_text_variants_only_for_short_lists():
    assert text_variants(["North", "North", "north", "South"]) == {"north": "North"}
    assert text_variants([f"Customer {i}" for i in range(200)]) == {}


@pytest.mark.parametrize(
    "name,tab,rows",
    [
        ("law-firm-hartwell-lane.xlsx", "Time entries", 1000),  # the check reads the first 1,000 rows
        ("finance-northbridge-group.xlsx", "Group P&L", 8),
        ("university-ashford.xlsx", "Students", 900),
        ("insurance-kingsmere-claims.xlsx", "Claims", 640),
        ("manufacturing-corran-precision.xlsx", "Production", 528),
        ("hr-fernhill-people.xlsx", "Employees", 125),
    ],
)
def test_industry_samples_check_cleanly(name, tab, rows):
    sheets = {s["name"]: s for s in analyse(name)["sheets"]}
    assert sheets[tab]["row_count"] == rows
    assert sheets[tab]["duplicate_rows"] == 0
    assert sheets[tab]["data_quality_score"] >= 80
