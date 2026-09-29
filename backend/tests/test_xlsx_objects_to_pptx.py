"""Excel -> PowerPoint with charts copied as native charts and pictures at full quality."""
import io
import os
import tempfile
import zipfile

import openpyxl
import pytest
from openpyxl.chart import BarChart, Reference
from openpyxl.drawing.image import Image as XLImage
from PIL import Image
from pptx import Presentation

from app.services.xlsx_objects_to_pptx import convert_workbook_objects


def _png(color, size=(240, 120)):
    b = io.BytesIO()
    Image.new("RGB", size, color).save(b, "PNG")
    b.seek(0)
    return b


def _bar(ws, title, grouping="clustered"):
    c = BarChart()
    c.title = title
    c.grouping = grouping
    if grouping == "stacked":
        c.overlap = 100
    c.add_data(Reference(ws, min_col=2, min_row=1, max_col=3, max_row=7), titles_from_data=True)
    c.set_categories(Reference(ws, min_col=1, min_row=2, max_row=7))
    return c


def _workbook() -> bytes:
    wb = openpyxl.Workbook()
    rows = [["Month", "North", "South"]] + [[f"M{i}", i * 10, i * 7] for i in range(1, 7)]

    sales = wb.active
    sales.title = "Sales"
    for r in rows:
        sales.append(r)
    sales.add_chart(_bar(sales, "Sales by region"), "E2")
    sales.add_chart(_bar(sales, "Sales by region", "stacked"), "E20")  # same data, looks different
    sales.add_image(XLImage(_png("navy")), "N2")  # logo

    copy = wb.create_sheet("Copy")
    for r in rows:
        copy.append(r)
    copy.add_chart(_bar(copy, "Sales by region"), "E2")  # same chart, same numbers, other tab
    copy.add_image(XLImage(_png("navy")), "N2")  # the same logo again
    copy.add_image(XLImage(_png("orange", (400, 400))), "N20")  # a different picture

    empty = wb.create_sheet("Empty")
    empty.add_chart(BarChart(), "B2")  # a chart frame with no data

    wb.create_sheet("Notes")["A1"] = "no charts here"
    out = io.BytesIO()
    wb.save(out)
    return out.getvalue()


def test_every_chart_and_picture_once_on_its_own_slide():
    deck, report = convert_workbook_objects(_workbook(), title="Quarterly pack")
    assert report["charts"] == 2  # clustered + stacked; the copy on "Copy" is the same chart
    assert report["pictures"] == 2  # logo once + the orange picture
    assert len(report["duplicates_skipped"]) == 2
    assert report["empty_charts_skipped"] == ["Empty: Chart 1"] or len(report["empty_charts_skipped"]) == 1
    assert report["skipped"] == []

    prs = Presentation(io.BytesIO(deck))
    charts = [sh for s in prs.slides for sh in s.shapes if sh.has_chart]
    pictures = [sh for s in prs.slides for sh in s.shapes if sh.shape_type == 13]
    assert len(charts) == 2 and len(pictures) == 2
    # Native, editable charts: the plotted values and grouping come through unchanged.
    groupings = sorted(c.chart.plots[0]._element.find(
        "{http://schemas.openxmlformats.org/drawingml/2006/chart}grouping").get("val") for c in charts)
    assert groupings == ["clustered", "stacked"]
    assert list(charts[0].chart.plots[0].series[0].values) == [10, 20, 30, 40, 50, 60]
    assert list(charts[0].chart.plots[0].categories) == ["M1", "M2", "M3", "M4", "M5", "M6"]
    headings = [sh.text_frame.text for s in prs.slides for sh in s.shapes if sh.has_text_frame and sh.text_frame.text]
    chart_headings = [h for h in headings if h.startswith("Sales by region")]
    assert chart_headings == ["Sales by region (1 of 2)", "Sales by region (2 of 2)"]
    # Every object fits inside the slide.
    for sh in charts + pictures:
        assert 0 <= sh.left and sh.left + sh.width <= prs.slide_width
        assert 0 <= sh.top and sh.top + sh.height <= prs.slide_height


def test_pictures_keep_original_quality_and_shape():
    deck, _ = convert_workbook_objects(_workbook())
    prs = Presentation(io.BytesIO(deck))
    pics = [sh for s in prs.slides for sh in s.shapes if sh.shape_type == 13]
    square = [p for p in pics if Image.open(io.BytesIO(p.image.blob)).size == (400, 400)]
    assert square, "the original image file is used, not a re-render"
    assert abs(square[0].width - square[0].height) <= 2  # aspect ratio kept


def test_edit_data_workbook_is_embedded():
    deck, report = convert_workbook_objects(_workbook())
    assert report["edit_data_available"]
    names = zipfile.ZipFile(io.BytesIO(deck)).namelist()
    assert any(n.startswith("ppt/embeddings/") and n.endswith(".xlsx") for n in names)
    assert sum(1 for n in names if n.startswith("ppt/embeddings/")) == report["charts"]  # one per chart, as PowerPoint does


def test_keep_duplicates_option():
    _, report = convert_workbook_objects(_workbook(), keep_duplicates=True)
    assert report["charts"] == 3 and report["pictures"] == 3


def test_workbook_without_charts_returns_none():
    wb = openpyxl.Workbook()
    wb.active["A1"] = 1
    out = io.BytesIO()
    wb.save(out)
    deck, report = convert_workbook_objects(out.getvalue())
    assert deck is None and report["charts"] == 0


os.environ.setdefault("DATABASE_URL", f"sqlite:///{os.path.join(tempfile.gettempdir(), 'meldra_connector_endpoints.db')}")


def test_endpoint_uses_native_charts_and_watermark_keeps_them():
    main = pytest.importorskip("app.main", reason="full backend dependencies not installed")
    from fastapi.testclient import TestClient

    main.init_db()
    main.app.dependency_overrides[main.get_current_user] = lambda: {"email": "ppt-test@example.com", "full_name": "T"}
    try:
        r = TestClient(main.app).post(
            "/api/files/excel-to-ppt",
            files={"file": ("pack.xlsx", _workbook(), "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")},
        )
    finally:
        main.app.dependency_overrides.clear()
    assert r.status_code == 200, r.text
    prs = Presentation(io.BytesIO(r.content))
    assert sum(1 for s in prs.slides for sh in s.shapes if sh.has_chart) == 2


# ---------------------------------------------------------------- tables, CSV, a real Excel workbook

from app.services.xlsx_objects_to_pptx import csv_to_xlsx  # noqa: E402
from app.services.xlsx_tables import format_cell, format_number  # noqa: E402

FIXTURE = os.path.join(os.path.dirname(__file__), "fixtures", "chart_essentials.xlsx")


@pytest.mark.parametrize("value,fmt,expected", [
    (1592398, "#,##0", "1,592,398"),
    (0.331, "0.0%", "33.1%"),
    (1234.5, '"$"#,##0.00', "$1,234.50"),
    (1234.5, "[$£-809]#,##0.00", "£1,234.50"),
    (-1234.5, "#,##0.00;(#,##0.00)", "(1,234.50)"),
    (2500000, '#,##0,"K"', "2,500K"),
    (42, "General", "42"),
    (0.125, "General", "0.125"),
])
def test_excel_number_formats(value, fmt, expected):
    assert format_number(value, fmt) == expected


def test_excel_date_formats():
    from datetime import datetime, time

    assert format_cell(datetime(2018, 1, 1), "mmm-yyyy")[0] == "Jan-2018"
    assert format_cell(datetime(2024, 3, 9), "dd/mm/yyyy")[0] == "09/03/2024"
    assert format_cell(datetime(2024, 3, 9), "m/d/yyyy")[0] == "3/9/2024"
    assert format_cell(time(0, 45, 49), "h:mm:ss")[0] == "0:45:49"


def _slides_text(deck):
    prs = Presentation(io.BytesIO(deck))
    out = []
    for s in prs.slides:
        kinds = ["table" if sh.has_table else "chart" if sh.has_chart else "picture" if sh.shape_type == 13 else None for sh in s.shapes]
        out.append([k for k in kinds if k])
    return prs, out


def test_real_workbook_every_chart_table_and_new_chart_type():
    deck, report = convert_workbook_objects(open(FIXTURE, "rb").read(), title="Chart Essentials")
    assert report["charts"] == 26 and report["new_chart_types"] == 2
    assert len(report["empty_charts_skipped"]) == 2 and report["skipped"] == []
    assert report["tables"] == 14
    prs, kinds = _slides_text(deck)
    # A slide holds a table or a chart, never both.
    assert all(len(set(k)) <= 1 for k in kinds)
    # Treemap/sunburst: hidden-name references resolved and the values stored in the chart.
    z = zipfile.ZipFile(io.BytesIO(deck))
    for n in [n for n in z.namelist() if n.startswith("ppt/charts/chartEx") and n.endswith(".xml")]:
        x = z.read(n).decode()
        assert "_xlchart" not in x and x.count("<cx:lvl") >= 2 and "<cx:pt " in x
    assert not any(b"printSettings" in z.read(n) for n in z.namelist() if n.startswith("ppt/charts/chart"))
    # Headings: the YearData pie is titled by its only series, as Excel shows it.
    headings = [sh.text_frame.text for s in prs.slides for sh in s.shapes if sh.has_text_frame]
    assert "Domestic" in headings
    # Tables keep Excel's formatting.
    cells = [c.text for s in prs.slides for sh in s.shapes if sh.has_table for r in sh.table.rows for c in r.cells]
    assert "1,592,398" in cells and "33.1%" in cells and "Jan-2018" in cells


def test_tables_come_before_charts_on_each_tab():
    deck, _ = convert_workbook_objects(open(FIXTURE, "rb").read())
    _, kinds = _slides_text(deck)
    flat = [k[0] for k in kinds if k]
    # Within the run of slides for a tab, no table appears after a chart. Tab dividers reset the run.
    prs = Presentation(io.BytesIO(deck))
    seen_chart = False
    for s in prs.slides:
        k = [("t" if sh.has_table else "c" if sh.has_chart else None) for sh in s.shapes]
        k = [x for x in k if x]
        if not k:
            seen_chart = False  # tab divider
            continue
        if k[0] == "c":
            seen_chart = True
        else:
            assert not seen_chart


def test_csv_becomes_table_slides_without_invented_charts():
    rows = ["Region,Month,Revenue"] + [f"R{i % 3},M{i},{1000 + i * 37}" for i in range(40)]
    deck, report = convert_workbook_objects(csv_to_xlsx("\n".join(rows).encode()), title="Revenue")
    assert report["charts"] == 0 and report["tables"] == 1 and report["table_slides"] == 3  # 40 rows, 15 per slide
    prs, kinds = _slides_text(deck)
    headers = [sh.table.cell(0, 0).text for s in prs.slides for sh in s.shapes if sh.has_table]
    assert headers == ["Region"] * 3  # header repeated on every page
