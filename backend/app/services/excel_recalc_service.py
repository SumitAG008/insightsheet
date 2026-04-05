import os
import shutil
import subprocess
import tempfile
from typing import Optional, Tuple


def _find_soffice_exe() -> Optional[str]:
    # Common names on Windows and Linux
    for name in ("soffice", "soffice.exe", "soffice.com", "libreoffice"):
        p = shutil.which(name)
        if p:
            return p

    # Common install locations in Debian/Ubuntu containers
    candidates = (
        "/usr/bin/soffice",
        "/usr/bin/libreoffice",
        "/usr/lib/libreoffice/program/soffice",
        "/opt/libreoffice/program/soffice",
    )
    for p in candidates:
        try:
            if os.path.exists(p) and os.access(p, os.X_OK):
                return p
        except Exception:
            continue

    return None


def recalc_xlsx_with_libreoffice_bytes(
    content: bytes,
    filename: str,
    timeout_seconds: int = 60,
) -> Tuple[Optional[bytes], str]:
    """Best-effort server-side recalculation using LibreOffice headless.

    Returns (bytes|None, message).

    Notes:
    - This does NOT store anything permanently. It uses a temp directory and cleans up.
    - This is intended for generating cached results for formulas so openpyxl data_only reads real numbers.
    """

    exe = _find_soffice_exe()
    if not exe:
        return None, "LibreOffice (soffice) not found on server"

    base = os.path.basename(filename or "workbook.xlsx")
    if not base.lower().endswith((".xlsx", ".xls")):
        base = base + ".xlsx"

    with tempfile.TemporaryDirectory(prefix="insightsheet_recalc_") as td:
        in_path = os.path.join(td, base)
        with open(in_path, "wb") as f:
            f.write(content)

        out_dir = os.path.join(td, "out")
        os.makedirs(out_dir, exist_ok=True)

        # LibreOffice CLI conversion triggers calculation for many workbooks.
        cmd = [
            exe,
            "--headless",
            "--nologo",
            "--nofirststartwizard",
            "--norestore",
            "--convert-to",
            "xlsx",
            "--outdir",
            out_dir,
            in_path,
        ]

        try:
            subprocess.run(
                cmd,
                cwd=td,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                timeout=timeout_seconds,
                check=False,
                creationflags=subprocess.CREATE_NO_WINDOW if os.name == "nt" else 0,
            )
        except subprocess.TimeoutExpired:
            return None, f"LibreOffice recalculation timed out after {timeout_seconds}s"
        except Exception as e:
            return None, f"LibreOffice recalculation failed to start: {str(e)}"

        # Output filename typically mirrors input base name with .xlsx
        stem = os.path.splitext(base)[0]
        out_path = os.path.join(out_dir, stem + ".xlsx")
        if not os.path.exists(out_path):
            # Some LO versions may alter naming; pick the first xlsx
            for fn in os.listdir(out_dir):
                if fn.lower().endswith(".xlsx"):
                    out_path = os.path.join(out_dir, fn)
                    break

        if not os.path.exists(out_path):
            return None, "LibreOffice did not produce an output .xlsx"

        try:
            with open(out_path, "rb") as f:
                out_bytes = f.read()
            if not out_bytes:
                return None, "LibreOffice produced an empty output"
            return out_bytes, "ok"
        except Exception as e:
            return None, f"Failed reading recalculated workbook: {str(e)}"


def convert_spreadsheet_to_pdf_bytes(
    content: bytes,
    filename: str,
    timeout_seconds: int = 90,
) -> Tuple[Optional[bytes], str]:
    """Convert spreadsheet bytes (xlsx/xls/csv) to PDF using LibreOffice headless.

    This is intended for *visual fidelity* conversions (charts/images/layout), e.g.
    Spreadsheet -> PDF -> PPT (as rendered images).

    Returns (pdf_bytes|None, message)
    """

    exe = _find_soffice_exe()
    if not exe:
        return None, "LibreOffice (soffice) not found on server"

    base = os.path.basename(filename or "workbook.xlsx")
    if not base.lower().endswith((".xlsx", ".xls", ".csv")):
        base = base + ".xlsx"

    with tempfile.TemporaryDirectory(prefix="insightsheet_xlsx_pdf_") as td:
        in_path = os.path.join(td, base)
        with open(in_path, "wb") as f:
            f.write(content)

        out_dir = os.path.join(td, "out")
        os.makedirs(out_dir, exist_ok=True)

        cmd = [
            exe,
            "--headless",
            "--nologo",
            "--nofirststartwizard",
            "--norestore",
            "--convert-to",
            "pdf",
            "--outdir",
            out_dir,
            in_path,
        ]

        try:
            subprocess.run(
                cmd,
                cwd=td,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                timeout=timeout_seconds,
                check=False,
                creationflags=subprocess.CREATE_NO_WINDOW if os.name == "nt" else 0,
            )
        except subprocess.TimeoutExpired:
            return None, f"LibreOffice PDF conversion timed out after {timeout_seconds}s"
        except Exception as e:
            return None, f"LibreOffice PDF conversion failed to start: {str(e)}"

        stem = os.path.splitext(base)[0]
        out_path = os.path.join(out_dir, stem + ".pdf")
        if not os.path.exists(out_path):
            for fn in os.listdir(out_dir):
                if fn.lower().endswith(".pdf"):
                    out_path = os.path.join(out_dir, fn)
                    break

        if not os.path.exists(out_path):
            return None, "LibreOffice did not produce an output PDF"

        try:
            with open(out_path, "rb") as f:
                out_bytes = f.read()
            if not out_bytes:
                return None, "LibreOffice produced an empty PDF"
            return out_bytes, "ok"
        except Exception as e:
            return None, f"Failed reading converted PDF: {str(e)}"
