"""Plan limits: one table, environment overrides, licence overrides, and per-file checks."""
import io

import pytest
from fastapi import HTTPException

from app.services import file_limits
from app.services.plan_limits import (
    SERVER_CEILINGS,
    UNLIMITED,
    describe_limits,
    merge_overrides,
    normalize_plan,
    plan_limits,
)


def test_plans_match_the_published_table():
    free, pro, team = plan_limits("free", env={}), plan_limits("pro", env={}), plan_limits("team", env={})
    assert (free["file_size_mb"], pro["file_size_mb"], team["file_size_mb"]) == (10, 50, 100)
    assert (free["spreadsheet_rows"], pro["spreadsheet_rows"], team["spreadsheet_rows"]) == (50_000, 300_000, 1_000_000)
    assert (free["pdf_pages"], free["ocr_pages"]) == (50, 5)
    assert (pro["pdf_pages"], pro["ocr_pages"]) == (300, 50)
    assert (team["pdf_pages"], team["ocr_pages"]) == (1_000, 100)
    assert (free["conversions_per_month"], pro["conversions_per_month"], team["conversions_per_month"]) == (20, 500, 2_000)
    assert (free["ai_queries_per_month"], pro["ai_queries_per_month"], team["ai_queries_per_month"]) == (20, 300, 1_000)
    # Every higher plan is at least as generous as the one below it.
    order = ["free", "pro", "team", "business"]
    for lower, higher in zip(order, order[1:]):
        lo, hi = plan_limits(lower, env={}), plan_limits(higher, env={})
        assert all(hi[k] >= lo[k] for k in lo), (lower, higher)


def test_older_plan_names_map_to_current_plans():
    assert normalize_plan("premium") == "pro"
    assert normalize_plan("premium_yearly") == "pro"
    assert normalize_plan("enterprise") == "business"
    assert normalize_plan("standard") == "free"
    assert normalize_plan(None) == "free"
    assert normalize_plan("something-else") == "free"


def test_environment_overrides_and_server_ceilings():
    env = {"LIMIT_FREE_FILE_SIZE_MB": "15", "LIMIT_PRO_AI_QUERIES_PER_MONTH": "unlimited", "LIMIT_TEAM_PDF_PAGES": "999999"}
    assert plan_limits("free", env=env)["file_size_mb"] == 15
    assert plan_limits("pro", env=env)["ai_queries_per_month"] == UNLIMITED
    assert plan_limits("team", env=env)["pdf_pages"] == SERVER_CEILINGS["pdf_pages"]  # never above what a server can do


def test_licence_overrides_only_known_keys_and_respect_ceilings():
    base = plan_limits("team", env={})
    merged = merge_overrides(base, '{"conversions_per_month": 10000, "file_size_mb": "unlimited", "nonsense": 5}')
    assert merged["conversions_per_month"] == 10_000
    assert merged["file_size_mb"] == SERVER_CEILINGS["file_size_mb"]
    assert "nonsense" not in merged
    assert merge_overrides(base, "not json") == base


def test_public_table_lists_every_plan():
    table = describe_limits()
    assert list(table["plans"]) == ["free", "pro", "team", "business"]
    assert set(table["keys"]) == set(table["plans"]["free"]["limits"])


def _pdf(pages: int) -> bytes:
    from reportlab.pdfgen import canvas

    buf = io.BytesIO()
    c = canvas.Canvas(buf)
    for i in range(pages):
        c.drawString(100, 750, f"page {i + 1}")
        c.showPage()
    c.save()
    return buf.getvalue()


def _xlsx(rows: int) -> bytes:
    from openpyxl import Workbook

    wb = Workbook()
    ws = wb.active
    for i in range(rows):
        ws.append([i, f"row {i}"])
    buf = io.BytesIO()
    wb.save(buf)
    return buf.getvalue()


def test_pdf_pages_and_spreadsheet_rows_are_counted():
    assert file_limits.count_pdf_pages(_pdf(3)) == 3
    assert file_limits.count_spreadsheet_rows(_xlsx(12), "a.xlsx") == 12
    assert file_limits.count_spreadsheet_rows(b"a,b\n1,2\n3,4", "a.csv") == 3
    assert file_limits.count_spreadsheet_rows(b"hello", "notes.docx") is None


def test_check_file_turns_away_files_over_the_plan():
    limits = {"file_size_mb": 1, "pdf_pages": 2, "spreadsheet_rows": 10}
    file_limits.check_file(limits, _pdf(2), "ok.pdf")
    file_limits.check_file(limits, _xlsx(10), "ok.xlsx")

    with pytest.raises(HTTPException) as e:
        file_limits.check_file(limits, _pdf(3), "big.pdf", "the Free plan")
    assert e.value.status_code == 413 and "3 pages" in e.value.detail and "Free plan" in e.value.detail

    with pytest.raises(HTTPException) as e:
        file_limits.check_file(limits, _xlsx(11), "big.xlsx")
    assert e.value.status_code == 413 and "10 rows" in e.value.detail

    with pytest.raises(HTTPException) as e:
        file_limits.check_file(limits, b"x" * (1024 * 1024 + 1), "big.csv")
    assert e.value.status_code == 413 and "1MB" in e.value.detail

    # Unlimited means no check at all.
    file_limits.check_file({"file_size_mb": -1, "pdf_pages": -1, "spreadsheet_rows": -1}, _pdf(3), "any.pdf")


def test_ocr_page_cap_takes_the_smallest():
    assert file_limits.ocr_page_cap({"ocr_pages": 5}, None, 25) == 5
    assert file_limits.ocr_page_cap({"ocr_pages": 50}, 10, 25) == 10
    assert file_limits.ocr_page_cap({"ocr_pages": 100}, None, 25) == 25
    assert file_limits.ocr_page_cap({"ocr_pages": -1}, None, 25) == 25
