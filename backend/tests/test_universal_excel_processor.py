import io

import openpyxl

from app.services.universal_excel_processor import UniversalExcelProcessor


def _build_workbook_bytes() -> bytes:
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "financial_summary"

    # Simple wide-matrix: category + months
    ws.append(["Salesperson", "Jan-25", "Feb-25", "Mar-25", "Apr-25"])
    ws.append(["Alice", 10, 12, 15, 14])
    ws.append(["Bob", 8, 9, 7, 10])
    ws.append(["Charlie", 20, 22, 18, 25])

    buf = io.BytesIO()
    wb.save(buf)
    return buf.getvalue()


def test_process_universal_contract_shape():
    b = _build_workbook_bytes()
    p = UniversalExcelProcessor(b, filename="sample.xlsx")
    try:
        result = p.process_universal()
    finally:
        p.close()

    assert isinstance(result, dict)

    # Contract shape
    for k in ["filename", "file_size_mb", "diagnostics", "charts", "sheet_insights", "status", "total_charts"]:
        assert k in result

    assert isinstance(result["diagnostics"], dict)
    assert "sheets" in result["diagnostics"]
    assert isinstance(result["diagnostics"]["sheets"], list)

    assert isinstance(result["charts"], list)
    assert isinstance(result["sheet_insights"], list)
    assert isinstance(result["status"], str)
