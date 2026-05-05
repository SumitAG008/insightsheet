"""
Document Converter Service — in-app PDF, DOC, PPT conversions (no external API key).
"""
import io
import logging
import re
from datetime import datetime
from typing import Tuple, Optional

logger = logging.getLogger(__name__)

# Optional imports
try:
    from pdf2docx import Converter
    PDF2DOCX_AVAILABLE = True
except ImportError:
    PDF2DOCX_AVAILABLE = False

try:
    from docx import Document
    DOCX_AVAILABLE = True
except ImportError:
    DOCX_AVAILABLE = False

try:
    from docx.shared import Pt
    DOCX_SHARED_AVAILABLE = True
except ImportError:
    Pt = None
    DOCX_SHARED_AVAILABLE = False

try:
    import fitz  # PyMuPDF
    FITZ_AVAILABLE = True
except Exception:
    fitz = None
    FITZ_AVAILABLE = False

try:
    from pptx import Presentation
    PPTX_AVAILABLE = True
except ImportError:
    PPTX_AVAILABLE = False

try:
    from reportlab.lib.pagesizes import letter
    from reportlab.lib.styles import getSampleStyleSheet
    from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, PageBreak
    from reportlab.lib.units import inch
    REPORTLAB_AVAILABLE = True
except ImportError:
    REPORTLAB_AVAILABLE = False


try:
    import openpyxl
    from openpyxl.styles import Font, Alignment, PatternFill
    OPENPYXL_AVAILABLE = True
except Exception:
    openpyxl = None
    Font = None
    Alignment = None
    PatternFill = None
    OPENPYXL_AVAILABLE = False


try:
    from .ocr_service import OCRService, _looks_garbled_digital_text
    OCR_SERVICE_AVAILABLE = True
except Exception:
    OCR_SERVICE_AVAILABLE = False


def pdf_to_docx(pdf_bytes: bytes) -> Tuple[bytes, str]:
    """Convert PDF to .docx. Returns (docx_bytes, error). error is '' on success."""
    if not PDF2DOCX_AVAILABLE:
        return b'', "PDF to DOC requires pdf2docx. Install: pip install pdf2docx"
    try:
        docx_buf = io.BytesIO()
        import tempfile
        with tempfile.NamedTemporaryFile(suffix=".pdf", delete=True) as tmp_pdf:
            tmp_pdf.write(pdf_bytes)
            tmp_pdf.flush()
            cv = Converter(tmp_pdf.name)
            try:
                cv.convert(docx_buf, start=0, end=None)
            finally:
                cv.close()
        docx_buf.seek(0)
        return docx_buf.read(), ''
    except Exception as e:
        logger.exception("pdf_to_docx failed")
        return b'', str(e)


def _xlsx_autofit(ws) -> None:
    try:
        for column_cells in ws.columns:
            max_len = 0
            col_letter = None
            for cell in column_cells:
                col_letter = cell.column_letter
                v = cell.value
                if v is None:
                    continue
                s = str(v)
                if len(s) > max_len:
                    max_len = len(s)
            if col_letter:
                ws.column_dimensions[col_letter].width = min(max(10, max_len + 2), 60)
    except Exception:
        return


def _xlsx_add_title(ws, title: str) -> int:
    r = 1
    ws.cell(row=r, column=1, value=title)
    try:
        ws.cell(row=r, column=1).font = Font(bold=True, size=16)
    except Exception:
        pass
    r += 2
    return r


def _xlsx_add_kv(ws, row: int, key: str, val: str) -> int:
    ws.cell(row=row, column=1, value=key)
    ws.cell(row=row, column=2, value=val)
    try:
        ws.cell(row=row, column=1).font = Font(bold=True)
    except Exception:
        pass
    return row + 1


def _build_structured_workbook_xlsx(
    source_filename: str,
    source_type: str,
    narrative_text: str,
    tables: Optional[list] = None,
) -> Tuple[bytes, str]:
    if not OPENPYXL_AVAILABLE:
        return b"", "Excel export requires openpyxl. Install: pip install openpyxl"

    try:
        wb = openpyxl.Workbook()
        ws_summary = wb.active
        ws_summary.title = "Summary"

        row = _xlsx_add_title(ws_summary, "Converted Workbook")
        row = _xlsx_add_kv(ws_summary, row, "Source file", source_filename or "file")
        row = _xlsx_add_kv(ws_summary, row, "Source type", source_type or "unknown")
        row = _xlsx_add_kv(ws_summary, row, "Generated", datetime.utcnow().isoformat() + "Z")

        row += 1
        ws_summary.cell(row=row, column=1, value="Sheets")
        try:
            ws_summary.cell(row=row, column=1).font = Font(bold=True)
        except Exception:
            pass
        row += 1
        ws_summary.cell(row=row, column=1, value="Narrative")
        ws_summary.cell(row=row, column=2, value="All extracted text preserved")
        row += 1

        ws_narr = wb.create_sheet("Narrative")
        ws_narr.append(["Section", "Subsection", "Paragraph", "Text", "Source"])
        try:
            for c in range(1, 6):
                ws_narr.cell(row=1, column=c).font = Font(bold=True)
                ws_narr.cell(row=1, column=c).fill = PatternFill("solid", fgColor="E8EEF9")
        except Exception:
            pass

        paragraphs = [p.strip() for p in (narrative_text or "").split("\n") if p.strip()]
        if not paragraphs:
            paragraphs = ["(No text extracted)"]
        for idx, p in enumerate(paragraphs, start=1):
            ws_narr.append(["", "", idx, p, source_type])

        _xlsx_autofit(ws_narr)

        t_list = tables or []
        for t_i, t_rows in enumerate(t_list, start=1):
            name = f"Table_{t_i}"
            ws_t = wb.create_sheet(name)
            if t_rows:
                for r in t_rows:
                    ws_t.append(list(r))
            else:
                ws_t.append(["(Empty table)"])
            _xlsx_autofit(ws_t)
            ws_summary.cell(row=row, column=1, value=name)
            ws_summary.cell(row=row, column=2, value="Extracted table")
            row += 1

        ws_fig = wb.create_sheet("Figures_Images")
        ws_fig.append(["Figure ID", "Section", "Page", "Notes"])
        ws_fig.append(["(not_available)", "", "", "Images/charts preservation is not implemented in this MVP."])
        _xlsx_autofit(ws_fig)
        ws_summary.cell(row=row, column=1, value="Figures_Images")
        ws_summary.cell(row=row, column=2, value="Placeholder")

        _xlsx_autofit(ws_summary)

        buf = io.BytesIO()
        wb.save(buf)
        buf.seek(0)
        return buf.read(), ""
    except Exception as e:
        logger.exception("build structured xlsx failed")
        return b"", str(e)


def docx_to_xlsx_structured(docx_bytes: bytes, source_filename: str = "") -> Tuple[bytes, str]:
    if not DOCX_AVAILABLE:
        return b"", "DOCX to XLSX requires python-docx"
    try:
        doc = Document(io.BytesIO(docx_bytes))
        parts = []
        for p in doc.paragraphs:
            t = (p.text or "").strip()
            if t:
                parts.append(t)

        tables = []
        for table in doc.tables:
            t_rows = []
            for row in table.rows:
                row_vals = []
                for cell in row.cells:
                    row_vals.append((cell.text or "").strip())
                if row_vals:
                    t_rows.append(row_vals)
            if t_rows:
                tables.append(t_rows)

        return _build_structured_workbook_xlsx(
            source_filename=source_filename,
            source_type="docx",
            narrative_text="\n".join(parts),
            tables=tables,
        )
    except Exception as e:
        logger.exception("docx_to_xlsx_structured failed")
        return b"", str(e)


def pdf_to_xlsx_structured(pdf_bytes: bytes, source_filename: str = "") -> Tuple[bytes, str]:
    try:
        text = ""
        try:
            import pdfplumber
            pages_text = []
            with pdfplumber.open(io.BytesIO(pdf_bytes)) as pdf:
                for p in pdf.pages[:25]:
                    t = (p.extract_text() or "").strip()
                    if t:
                        pages_text.append(t)
            text = "\n".join(pages_text).strip()
        except Exception:
            text = ""

        if not text and FITZ_AVAILABLE and fitz is not None:
            try:
                doc = fitz.open(stream=pdf_bytes, filetype="pdf")
                pages_text = []
                for i in range(min(doc.page_count, 25)):
                    pages_text.append((doc.load_page(i).get_text("text") or "").strip())
                doc.close()
                text = "\n".join([t for t in pages_text if t]).strip()
            except Exception:
                text = ""

        if not text:
            text = "(No text extracted from PDF)"

        return _build_structured_workbook_xlsx(
            source_filename=source_filename,
            source_type="pdf",
            narrative_text=text,
            tables=[],
        )
    except Exception as e:
        logger.exception("pdf_to_xlsx_structured failed")
        return b"", str(e)


def pptx_to_xlsx_structured(pptx_bytes: bytes, source_filename: str = "") -> Tuple[bytes, str]:
    if not PPTX_AVAILABLE:
        return b"", "PPTX to XLSX requires python-pptx"
    try:
        prs = Presentation(io.BytesIO(pptx_bytes))
        parts = []
        for idx, slide in enumerate(prs.slides[:200], start=1):
            slide_parts = []
            for shape in slide.shapes:
                if not getattr(shape, "has_text_frame", False):
                    continue
                t = (getattr(shape, "text", None) or "").strip()
                if t:
                    slide_parts.append(t)
            if slide_parts:
                parts.append(f"Slide {idx}: " + " | ".join(slide_parts))
        text = "\n".join(parts).strip() or "(No text extracted from PPTX)"
        return _build_structured_workbook_xlsx(
            source_filename=source_filename,
            source_type="pptx",
            narrative_text=text,
            tables=[],
        )
    except Exception as e:
        logger.exception("pptx_to_xlsx_structured failed")
        return b"", str(e)


def _docx_to_text(docx_bytes: bytes) -> str:
    if not DOCX_AVAILABLE:
        return ""
    try:
        doc = Document(io.BytesIO(docx_bytes))
        parts = []
        for p in doc.paragraphs:
            t = (p.text or "").strip()
            if t:
                parts.append(t)
        for table in doc.tables:
            for row in table.rows:
                for cell in row.cells:
                    t = (cell.text or "").strip()
                    if t:
                        parts.append(t)
        return "\n".join(parts).strip()
    except Exception:
        return ""


def pdf_to_docx_exact(pdf_bytes: bytes, max_pages: int = 25) -> Tuple[bytes, str]:
    if not DOCX_AVAILABLE or not DOCX_SHARED_AVAILABLE or Pt is None:
        return b'', "Exact PDF to DOC requires python-docx. Install: pip install python-docx"
    if not FITZ_AVAILABLE or fitz is None:
        return b'', "Exact PDF to DOC requires PyMuPDF. Install: pip install PyMuPDF"

    try:
        doc = Document()
        if doc.sections:
            s0 = doc.sections[0]
            s0.left_margin = s0.right_margin = s0.top_margin = s0.bottom_margin = Pt(10)

        pdf = fitz.open(stream=pdf_bytes, filetype="pdf")
        try:
            n_pages = min(len(pdf), max_pages)
            for i in range(n_pages):
                page = pdf[i]
                pix = page.get_pixmap(dpi=200, alpha=False)
                img_bytes = pix.tobytes("png")
                page_w, page_h = float(pix.width), float(pix.height)
                if page_w <= 0 or page_h <= 0:
                    page_w, page_h = 1000.0, 1400.0

                s = doc.sections[0] if i == 0 else doc.add_section(1)
                s.left_margin = s.right_margin = s.top_margin = s.bottom_margin = Pt(10)
                target_w = 612.0
                scale = target_w / page_w
                s.page_width = Pt(target_w)
                s.page_height = Pt(max(792.0, page_h * scale))

                p = doc.add_paragraph()
                r = p.add_run()
                r.add_picture(io.BytesIO(img_bytes), width=Pt(target_w - 20))
        finally:
            pdf.close()

        buf = io.BytesIO()
        doc.save(buf)
        buf.seek(0)
        return buf.read(), ''
    except Exception as e:
        logger.exception("pdf_to_docx_exact failed")
        return b'', str(e)


def pdf_to_docx_smart(pdf_bytes: bytes, ocr_lang: str = None, mode: Optional[str] = None) -> Tuple[bytes, str]:
    m = (mode or "auto").strip().lower()
    if m not in ("auto", "editable", "exact"):
        m = "auto"

    if m == "exact":
        return pdf_to_docx_exact(pdf_bytes)

    docx_bytes, err = pdf_to_docx(pdf_bytes)
    low_fidelity = False
    if not err and docx_bytes:
        extracted = _docx_to_text(docx_bytes)
        if extracted:
            words = [w for w in re.split(r"\s+", extracted.strip()) if w]
            if len(extracted.strip()) < 200 or len(words) < 40:
                extracted = ""
                low_fidelity = True
            try:
                if extracted and (not _looks_garbled_digital_text(extracted)):
                    return docx_bytes, ''
            except Exception:
                return docx_bytes, ''
        else:
            low_fidelity = True

    if m == "editable" and (docx_bytes and not err):
        return docx_bytes, ''

    if m == "auto" and low_fidelity:
        exact_bytes, exact_err = pdf_to_docx_exact(pdf_bytes)
        if not exact_err and exact_bytes:
            return exact_bytes, ''

    if not OCR_SERVICE_AVAILABLE:
        return docx_bytes, err or "PDF to DOC conversion produced unreadable output and OCR fallback is unavailable"

    try:
        svc = OCRService()
        extracted = svc.extract_pdf_with_layout(pdf_bytes, max_pages=25, ocr_lang=ocr_lang)
        pages = extracted.get("pages") or []
        out = svc.text_to_docx_layout_pages(pages, title="Converted Document")
        return out, ''
    except Exception as e:
        logger.exception("pdf_to_docx_smart OCR fallback failed")
        return b'', str(e)


def _sanitize_for_reportlab(s: str) -> str:
    """Escape and clean text for ReportLab Paragraph to avoid XML/parse errors."""
    if s is None:
        return ''
    t = str(s).replace('\x00', '').replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')
    return t


def _convert_to_pdf_libreoffice(content: bytes, ext: str) -> Tuple[Optional[bytes], str]:
    """Convert document to PDF using LibreOffice headless for exact formatting."""
    try:
        import os
        from app.services.excel_recalc_service import _find_soffice_exe
        exe = _find_soffice_exe()
        if not exe:
            return None, "LibreOffice not found"
        import tempfile, subprocess
        with tempfile.TemporaryDirectory(prefix="insightsheet_doc_pdf_") as td:
            in_path = os.path.join(td, f"document{ext}")
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
            subprocess.run(
                cmd,
                cwd=td,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                timeout=90,
                check=False,
                creationflags=subprocess.CREATE_NO_WINDOW if os.name == "nt" else 0,
            )
            out_path = os.path.join(out_dir, "document.pdf")
            if not os.path.exists(out_path):
                for fn in os.listdir(out_dir):
                    if fn.lower().endswith(".pdf"):
                        out_path = os.path.join(out_dir, fn)
                        break
            if os.path.exists(out_path):
                with open(out_path, "rb") as f:
                    out_bytes = f.read()
                if out_bytes:
                    return out_bytes, ''
        return None, "No output from LibreOffice"
    except Exception as e:
        return None, str(e)


def docx_to_pdf(docx_bytes: bytes) -> Tuple[bytes, str]:
    """Convert .docx to PDF. Returns (pdf_bytes, error)."""
    # Attempt LibreOffice conversion for exact formatting
    lo_bytes, lo_err = _convert_to_pdf_libreoffice(docx_bytes, ".docx")
    if lo_bytes:
        return lo_bytes, ''
    
    logger.error(f"docx_to_pdf LibreOffice conversion failed: {lo_err}")
    return b'', "PDF Conversion Engine (LibreOffice) is unavailable or failed to process the document. Please ensure it is installed or wait for deployment."


def pptx_to_pdf(pptx_bytes: bytes) -> Tuple[bytes, str]:
    """Convert .pptx to PDF (one page per slide, text only). Returns (pdf_bytes, error)."""
    # Attempt LibreOffice conversion for exact formatting
    lo_bytes, lo_err = _convert_to_pdf_libreoffice(pptx_bytes, ".pptx")
    if lo_bytes:
        return lo_bytes, ''

    logger.error(f"pptx_to_pdf LibreOffice conversion failed: {lo_err}")
    return b'', "PDF Conversion Engine (LibreOffice) is unavailable or failed to process the presentation."


def pdf_to_pptx(pdf_bytes: bytes) -> Tuple[bytes, str]:
    """Convert PDF to .pptx: one slide per page, each page rendered as an image. Uses PyMuPDF and python-pptx."""
    if not PPTX_AVAILABLE:
        return b'', "PDF to PPT requires python-pptx"
    try:
        import fitz  # PyMuPDF
    except ImportError:
        return b'', "PDF to PPT requires PyMuPDF. Install: pip install PyMuPDF"
    try:
        doc = fitz.open(stream=pdf_bytes, filetype="pdf")
        if len(doc) == 0:
            doc.close()
            return b'', "PDF has no pages."

        prs = Presentation()
        # EMU: 914400 per inch (OOXML)
        EMU_PER_INCH = 914400
        slide_w_inch = prs.slide_width / EMU_PER_INCH
        slide_h_inch = prs.slide_height / EMU_PER_INCH
        from pptx.util import Inches

        pictures_added = 0
        # Use a matrix-based render (more reliable across PyMuPDF versions than dpi=...)
        render_scale = 2.0  # ~144dpi equivalent depending on page size
        matrix = fitz.Matrix(render_scale, render_scale)

        for i in range(len(doc)):
            page = doc[i]
            blank = prs.slide_layouts[6]  # Blank
            slide = prs.slides.add_slide(blank)

            pix = page.get_pixmap(matrix=matrix, alpha=False)
            # Normalize colorspace to RGB to avoid some viewers showing blank images
            try:
                if pix.colorspace is None or pix.colorspace.n != 3:
                    pix = fitz.Pixmap(fitz.csRGB, pix)
            except Exception:
                pass

            img_bytes = pix.tobytes("png")
            if not img_bytes:
                continue

            stream = io.BytesIO(img_bytes)
            stream.seek(0)

            # Infer physical size relative to slide
            # Default slide is 10 x 7.5 inches; compute scaling from rendered pixel dimensions.
            # 96 PPI is a pragmatic baseline; exact PPI isn't critical because we fit-to-slide.
            ppi = 96.0
            img_w_inch = pix.width / ppi
            img_h_inch = pix.height / ppi
            scale = min(slide_w_inch / img_w_inch, slide_h_inch / img_h_inch) if img_w_inch and img_h_inch else 1.0
            w = img_w_inch * scale
            h = img_h_inch * scale
            left = max((slide_w_inch - w) / 2.0, 0.0)
            top = max((slide_h_inch - h) / 2.0, 0.0)

            slide.shapes.add_picture(stream, Inches(left), Inches(top), width=Inches(w), height=Inches(h))
            pictures_added += 1

        doc.close()

        if pictures_added == 0:
            return b'', "PDF to PPT produced no renderable pages (no images added)."

        buf = io.BytesIO()
        prs.save(buf)
        buf.seek(0)
        return buf.read(), ''
    except Exception as e:
        logger.exception("pdf_to_pptx failed")
        return b'', str(e)
