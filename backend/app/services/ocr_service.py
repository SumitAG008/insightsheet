"""
OCR Service for InsightSheet-lite / Meldra
Extracts text from images (JPG, PNG, WebP, BMP, TIFF, GIF) and exports to editable DOC or PDF.
Form-aware: preserves sections, label/field lines, tables, and checkboxes so output looks like
the original form and is editable (fill-in underlines, tables, checkbox placeholders).
"""
import io
import re
import logging
from typing import Union, BinaryIO, List, Dict, Any

logger = logging.getLogger(__name__)

# Optional imports - fail gracefully if not available
try:
    import pytesseract
    from PIL import Image
    PYTESSERACT_AVAILABLE = True
except ImportError:
    PYTESSERACT_AVAILABLE = False

try:
    from docx import Document
    DOCX_AVAILABLE = True
except ImportError:
    DOCX_AVAILABLE = False

try:
    from reportlab.lib.pagesizes import letter
    from reportlab.lib.styles import getSampleStyleSheet
    from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table as RlTable, TableStyle
    from reportlab.lib import colors
    from reportlab.lib.units import inch
    REPORTLAB_AVAILABLE = True
except ImportError:
    REPORTLAB_AVAILABLE = False


# Placeholder for fillable "field" so user can type over it in Word/PDF
FIELD_PLACEHOLDER = "________________"


def _split_into_columns(line: str) -> List[str]:
    """Split a line by tabs or 2+ spaces into columns."""
    if '\t' in line:
        return [c.strip() for c in line.split('\t') if c.strip()]
    return [c.strip() for c in re.split(r'  +', line) if c.strip()]


def _parse_form_like_text(text: str) -> List[Dict[str, Any]]:
    """
    Parse OCR text into structure: section, label (with optional fill line), table, checkbox, paragraph.
    Produces a list of blocks that text_to_docx and text_to_pdf can render in a form-like way.
    """
    blocks: List[Dict[str, Any]] = []
    lines = [ln.rstrip() for ln in text.splitlines()]

    i = 0
    while i < len(lines):
        ln = lines[i]
        if not ln:
            i += 1
            continue

        # --- Section header: "1) Personal Details" or "2. Work History"
        if re.match(r'^\d+[\).]\s*\S', ln):
            blocks.append({"type": "section", "text": ln})
            i += 1
            continue

        # --- "Label: O O O" on one line -> emit label and checkbox
        if ':' in ln and re.search(r'[Oo]\s+[Oo]\s+[Oo]|[\u2610\u25A1]\s+[\u2610\u25A1]\s+[\u2610\u25A1]', ln):
            idx = ln.index(':')
            left, right = ln[: idx + 1], ln[idx + 1 :].strip()
            if len(left) < 80 and re.search(r'[Oo]\s+[Oo]\s+[Oo]', right):
                blocks.append({"type": "label", "text": left})
                i += 1
                continue

        # --- Checkbox: "[ ] A [ ] B [ ] C" (form-style) or "O O O", "☐ ☐ ☐"; or "Full-time Part-time Contractor" followed by "O O O"
        parts = [x.strip() for x in re.split(r'\[\s*\]', ln) if x.strip()]
        if 2 <= len(parts) <= 6 and all(len(p) < 30 for p in parts):
            blocks.append({"type": "checkbox", "options": parts})
            i += 1
            continue
        checkbox_match = re.search(r'[Oo]\s+[Oo]\s+[Oo]|[\u2610\u25A1]\s+[\u2610\u25A1]\s+[\u2610\u25A1]', ln)
        if checkbox_match or (re.match(r'^[\sOo\u2610\u25A1]+$', ln) and len(ln.strip()) >= 3):
            # Try to get option labels from previous line
            opts: List[str] = []
            if i > 0 and lines[i - 1]:
                prev = lines[i - 1]
                # "Employment Type: O O O" -> label stays, we use generic
                if prev.endswith(':'):
                    opts = ["Option 1", "Option 2", "Option 3"]
                else:
                    # "Full-time Part-time Contractor" -> use these
                    opts = [w for w in re.split(r'\s+', prev) if len(w) > 1 and not re.match(r'^[Oo\u2610\u25A1]+$', w)]
            if not opts or len(opts) > 6:
                opts = ["Option 1", "Option 2", "Option 3"]
            blocks.append({"type": "checkbox", "options": opts[:5]})
            i += 1
            continue

        # If this line looks like option labels and next is "O O O", we'll handle on next iter; here treat as paragraph if not like a header
        next_is_oo = i + 1 < len(lines) and bool(re.search(r'[Oo]\s+[Oo]\s+[Oo]', lines[i + 1]))
        if next_is_oo and 2 <= len(re.split(r'\s+', ln)) <= 5 and not ln.endswith(':'):
            opts = [w for w in re.split(r'\s+', ln) if len(w) > 1]
            if opts:
                blocks.append({"type": "checkbox", "options": opts})
                i += 2  # skip next "O O O" line
                continue

        # --- Table: 2+ consecutive lines with same number of columns (2–8) when split by tab or 2+ spaces
        cols = _split_into_columns(ln)
        if len(cols) >= 2 and len(cols) <= 8:
            table_rows = [cols]
            j = i + 1
            while j < len(lines) and lines[j]:
                next_cols = _split_into_columns(lines[j])
                if 2 <= len(next_cols) <= 8 and (len(next_cols) == len(cols) or abs(len(next_cols) - len(cols)) <= 1):
                    table_rows.append(next_cols)
                    j += 1
                else:
                    break
            # Require at least 2 rows to treat as table
            if len(table_rows) >= 2:
                # Normalize row lengths to max
                max_cols = max(len(r) for r in table_rows)
                for r in table_rows:
                    while len(r) < max_cols:
                        r.append("")
                blocks.append({"type": "table", "rows": table_rows})
                i = j
                continue

        # --- Label (ends with :) + fill line: "Full Name:", "Email:", etc. Add an editable underline.
        if ln.endswith(':') and len(ln) < 100 and not re.match(r'^\d+[\).]', ln):
            blocks.append({"type": "label", "text": ln})
            i += 1
            continue

        # --- Empty or underline-only line after a label: already handled by label. Skip.
        if not ln.strip() or re.match(r'^[\s_\-\.]+$', ln):
            i += 1
            continue

        # --- Normal paragraph
        blocks.append({"type": "paragraph", "text": ln})
        i += 1

    return blocks


class OCRService:
    """Service for OCR: image -> text, and text -> editable DOC/PDF with form-like layout."""

    # Image extensions we support
    ALLOWED_IMAGE_EXTENSIONS = {'.jpg', '.jpeg', '.png', '.webp', '.bmp', '.tiff', '.tif', '.gif'}

    def __init__(self):
        if not PYTESSERACT_AVAILABLE:
            raise RuntimeError(
                "OCR dependencies missing. Install: pip install pytesseract Pillow. "
                "Also install Tesseract: https://github.com/tesseract-ocr/tesseract (e.g. apt-get install tesseract-ocr)"
            )

    def extract_text(self, image_data: Union[bytes, BinaryIO]) -> str:
        """
        Run OCR on an image and return extracted text.

        Args:
            image_data: Raw image bytes or file-like object.

        Returns:
            Extracted text as string.
        """
        if not PYTESSERACT_AVAILABLE:
            raise RuntimeError("pytesseract or Pillow not installed.")

        data = image_data.read() if hasattr(image_data, 'read') else image_data
        img = Image.open(io.BytesIO(data))

        # Convert to RGB if necessary (e.g. RGBA, P)
        if img.mode not in ('RGB', 'L'):
            img = img.convert('RGB')

        try:
            # PSM 6 = Assume a single uniform block of text (default for documents)
            # PSM 4 = Assume a single column of variable-size text (helps forms with multiple blocks)
            # PSM 3 = Fully automatic; can help noisy/form layouts
            text = pytesseract.image_to_string(img, lang='eng', config='--psm 6')
            return (text or '').strip()
        except pytesseract.TesseractNotFoundError:
            logger.error("Tesseract OCR is not installed or not in PATH.")
            raise RuntimeError(
                "Tesseract OCR is not installed. Please install Tesseract: "
                "https://github.com/tesseract-ocr/tesseract - e.g. 'apt-get install tesseract-ocr' on Linux, "
                "or download from GitHub on Windows."
            )
        except Exception as e:
            logger.error(f"OCR extraction error: {e}")
            raise

    def text_to_docx(self, text: str, title: str = "OCR Document") -> bytes:
        """
        Create an editable Word document from text, preserving form-like structure:
        sections, label+underline for fields, tables, and checkbox placeholders.
        """
        if not DOCX_AVAILABLE:
            raise RuntimeError("python-docx is not installed. Install: pip install python-docx")

        doc = Document()
        doc.add_heading(title, level=0)

        blocks = _parse_form_like_text(text)
        if not blocks:
            doc.add_paragraph("(No text extracted)")

        for b in blocks:
            t = b.get("type")
            if t == "section":
                doc.add_heading(b["text"], level=1)
            elif t == "label":
                p = doc.add_paragraph()
                p.add_run(b["text"] + " ")
                r = p.add_run(FIELD_PLACEHOLDER)
                r.underline = True
            elif t == "checkbox":
                opts = b.get("options", ["Option 1", "Option 2", "Option 3"])
                doc.add_paragraph("  ".join("[ ] " + o for o in opts))
            elif t == "table":
                rows = b.get("rows", [])
                if not rows:
                    continue
                nr, nc = len(rows), max(len(r) for r in rows) if rows else 0
                if nc == 0:
                    continue
                table = doc.add_table(rows=nr, cols=nc)
                table.style = 'Table Grid'
                for ri, row in enumerate(rows):
                    for cj, cell_text in enumerate(row):
                        if cj < nc:
                            table.rows[ri].cells[cj].text = (cell_text or "").strip()
            elif t == "paragraph":
                doc.add_paragraph(b.get("text", ""))

        buf = io.BytesIO()
        doc.save(buf)
        buf.seek(0)
        return buf.read()

    def text_to_pdf(self, text: str, title: str = "OCR Document") -> bytes:
        """
        Create an editable PDF from text, preserving form-like structure:
        sections, label+underline for fields, tables, and checkbox placeholders.
        """
        if not REPORTLAB_AVAILABLE:
            raise RuntimeError("reportlab is not installed. Install: pip install reportlab")

        buf = io.BytesIO()
        doc = SimpleDocTemplate(
            buf,
            pagesize=letter,
            rightMargin=inch,
            leftMargin=inch,
            topMargin=inch,
            bottomMargin=inch,
            title=title,
        )
        styles = getSampleStyleSheet()
        story = []

        story.append(Paragraph(title, styles['Title']))
        story.append(Spacer(1, 12))

        blocks = _parse_form_like_text(text)
        if not blocks:
            story.append(Paragraph("(No text extracted)", styles['Normal']))

        for b in blocks:
            t = b.get("type")
            if t == "section":
                story.append(Paragraph(self._escape(b["text"]), styles['Heading1']))
                story.append(Spacer(1, 6))
            elif t == "label":
                s = self._escape(b["text"]) + " <u>" + FIELD_PLACEHOLDER + "</u>"
                story.append(Paragraph(s, styles['Normal']))
                story.append(Spacer(1, 4))
            elif t == "checkbox":
                opts = b.get("options", ["Option 1", "Option 2", "Option 3"])
                s = "  ".join("[ ] " + self._escape(o) for o in opts)
                story.append(Paragraph(s, styles['Normal']))
                story.append(Spacer(1, 4))
            elif t == "table":
                rows = b.get("rows", [])
                if not rows:
                    continue
                nc = max(len(r) for r in rows)
                # Normalize
                for r in rows:
                    while len(r) < nc:
                        r.append("")
                # ReportLab Table needs list of lists of strings; escape for Paragraph later we use plain
                data = [[self._escape(c or "") for c in row] for row in rows]
                tbl = RlTable(data)
                tbl.setStyle(TableStyle([
                    ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
                    ('FONTSIZE', (0, 0), (-1, -1), 9),
                    ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
                ]))
                story.append(tbl)
                story.append(Spacer(1, 8))
            elif t == "paragraph":
                s = self._escape(b.get("text", ""))
                story.append(Paragraph(s, styles['Normal']))
                story.append(Spacer(1, 6))

        doc.build(story)
        buf.seek(0)
        return buf.read()

    @staticmethod
    def _escape(s: str) -> str:
        return (s or "").replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")

    @classmethod
    def is_ocr_available(cls) -> bool:
        """Check if OCR (pytesseract + Tesseract) is available."""
        if not PYTESSERACT_AVAILABLE:
            return False
        try:
            pytesseract.get_tesseract_version()
            return True
        except Exception:
            return False
