"""
OCR Service for InsightSheet-lite / Meldra
Extracts text from images (JPG, PNG, WebP, BMP, TIFF, GIF) and exports to editable DOC or PDF.
- Form mode: form-like structure (sections, labels, tables, checkboxes) in document flow.
- Layout mode: places text at original (x,y) so output matches the image layout (exactly editable).
"""
import io
import re
import logging
from typing import Union, BinaryIO, List, Dict, Any, Tuple, Optional

logger = logging.getLogger(__name__)

# Optional imports - fail gracefully if not available
try:
    import pytesseract
    from pytesseract import Output
    from PIL import Image
    PYTESSERACT_AVAILABLE = True
except ImportError:
    PYTESSERACT_AVAILABLE = False
    Output = None

try:
    from docx import Document
    from docx.shared import Pt
    DOCX_AVAILABLE = True
except ImportError:
    DOCX_AVAILABLE = False
    Pt = None

try:
    from reportlab.lib.pagesizes import letter
    from reportlab.lib.styles import getSampleStyleSheet
    from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table as RlTable, TableStyle
    from reportlab.pdfgen import canvas as pdf_canvas
    from reportlab.lib import colors
    from reportlab.lib.units import inch
    REPORTLAB_AVAILABLE = True
except ImportError:
    REPORTLAB_AVAILABLE = False
    pdf_canvas = None


# Placeholder for fillable "field" so user can type over it in Word/PDF
FIELD_PLACEHOLDER = "________________"


def _normalize_ocr_text(s: str) -> str:
    """
    Fix common OCR mistakes: checkboxes [) [|] -> [ ], stray | -> I, border/garbage.
    """
    if not s or not isinstance(s, str):
        return s
    # [| confirm / [| consent -> I confirm / I consent
    s = re.sub(r'\[\s*\|(\s+[a-z])', r'I\1', s)
    # [) [|] [ )] etc (checkbox misreads) -> [ ] (do not consume trailing space)
    s = re.sub(r'\[\s*[\)\|]\]?', '[ ]', s)
    # | at word start when followed by lowercase: "| confirm" -> "I confirm", ". | consent" -> ". I consent"
    s = re.sub(r'(\s|^)\|(\s*[a-z])', r'\1I\2', s)
    return s


def _is_border_or_noise(s: str) -> bool:
    """True if the line is likely a table border, rule, or OCR garbage (e.g. "a a -----", "|")."""
    if not s or not isinstance(s, str):
        return True
    t = s.strip()
    if not t:
        return True
    # Mostly dashes, pipes, dots, underscores, equals
    if re.match(r'^[\s\-=\|\.\*#_]+$', t):
        return True
    # Very short non-word
    if len(t) <= 4 and not re.search(r'[a-zA-Z]{2,}', t):
        return True
    # Lines that are mostly dashes/equals with no real words (e.g. "a a -----", table borders)
    if re.search(r'[-=]{3,}', t) and not re.search(r'[a-zA-Z]{2,}', t):
        return True
    return False


def _split_into_columns(line: str) -> List[str]:
    """Split a line by tabs or 2+ spaces into columns."""
    if '\t' in line:
        return [c.strip() for c in line.split('\t') if c.strip()]
    return [c.strip() for c in re.split(r'  +', line) if c.strip()]


def _detect_tables_from_words(
    words: List[Dict[str, Any]],
    gap_px: int = 20,
) -> List[Dict[str, Any]]:
    """
    Cluster words into rows by line_num, split into columns by horizontal gaps.
    Returns: [{ "rows": [[c1,c2,...],...], "block_num", "line_start", "line_end", "left", "top", "width", "height" }]
    """
    if not words:
        return []

    # Group by (block_num, line_num), sort
    by_line: Dict[Tuple[int, int], List[Dict]] = {}
    for w in words:
        key = (w.get('block_num', 0), w.get('line_num', 0))
        by_line.setdefault(key, []).append(w)

    tables: List[Dict[str, Any]] = []
    sorted_keys = sorted(by_line.keys())
    i = 0
    while i < len(sorted_keys):
        key = sorted_keys[i]
        line_words = sorted(by_line[key], key=lambda w: w.get('left', 0))
        block_num, line_num = key

        # Column boundaries: gap > gap_px
        cells: List[str] = []
        curr: List[str] = []
        prev_right = -1000
        for w in line_words:
            left = w.get('left', 0)
            width = w.get('width', 0)
            txt = (w.get('text') or '').strip()
            if left - prev_right > gap_px and curr:
                cells.append(_normalize_ocr_text(' '.join(curr)))
                curr = []
            curr.append(txt)
            prev_right = left + width
        if curr:
            cells.append(_normalize_ocr_text(' '.join(curr)))

        # Need 2+ columns to be a table row
        if len(cells) < 2:
            i += 1
            continue

        table_rows = [cells]
        table_keys = [key]
        j = i + 1
        while j < len(sorted_keys):
            nkey = sorted_keys[j]
            nblock, nline = nkey
            nwords = sorted(by_line[nkey], key=lambda w: w.get('left', 0))
            ncells = []
            ncurr = []
            npr = -1000
            for w in nwords:
                left = w.get('left', 0)
                width = w.get('width', 0)
                txt = (w.get('text') or '').strip()
                if left - npr > gap_px and ncurr:
                    ncells.append(_normalize_ocr_text(' '.join(ncurr)))
                    ncurr = []
                ncurr.append(txt)
                npr = left + width
            if ncurr:
                ncells.append(_normalize_ocr_text(' '.join(ncurr)))

            if len(ncells) < 2:
                break
            if abs(len(ncells) - len(cells)) > 1:
                break
            table_rows.append(ncells)
            table_keys.append(nkey)
            j += 1

        if len(table_rows) >= 2:
            # Normalize row lengths
            max_cols = max(len(r) for r in table_rows)
            for r in table_rows:
                while len(r) < max_cols:
                    r.append("")
            # Bbox from first/last words
            all_ws = []
            for k in table_keys:
                all_ws.extend(by_line[k])
            left = min(w.get('left', 0) for w in all_ws)
            top = min(w.get('top', 0) for w in all_ws)
            right = max(w.get('left', 0) + w.get('width', 0) for w in all_ws)
            bottom = max(w.get('top', 0) + w.get('height', 0) for w in all_ws)
            tables.append({
                "rows": table_rows,
                "block_num": block_num,
                "line_start": line_num,
                "line_end": table_keys[-1][1],
                "left": left,
                "top": top,
                "width": max(1, right - left),
                "height": max(1, bottom - top),
            })
            i = j
        else:
            i += 1

    return tables


def _parse_form_like_text(text: str) -> List[Dict[str, Any]]:
    """
    Parse OCR text into structure: section, label (with optional fill line), table, checkbox, paragraph.
    Normalizes OCR noise ([) -> [ ], | -> I) and drops border/garbage lines.
    """
    blocks: List[Dict[str, Any]] = []
    raw = [ln.rstrip() for ln in text.splitlines()]
    lines = []
    for ln in raw:
        n = _normalize_ocr_text(ln)
        if not _is_border_or_noise(n):
            lines.append(n)

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

    def extract_with_layout(self, image_data: Union[bytes, BinaryIO]) -> Dict[str, Any]:
        """
        Run OCR and return text plus per-line bounding boxes so export can preserve layout.
        Returns: { "text": str, "layout": [{"text", "left", "top", "width", "height"}], "image_width": int, "image_height": int }
        """
        if not PYTESSERACT_AVAILABLE:
            raise RuntimeError("pytesseract or Pillow not installed.")

        data = image_data.read() if hasattr(image_data, 'read') else image_data
        img = Image.open(io.BytesIO(data))
        iw, ih = img.size

        if img.mode not in ('RGB', 'L'):
            img = img.convert('RGB')

        try:
            d = pytesseract.image_to_data(img, lang='eng', config='--psm 6', output_type=Output.DICT)
        except pytesseract.TesseractNotFoundError:
            logger.error("Tesseract OCR is not installed or not in PATH.")
            raise RuntimeError(
                "Tesseract OCR is not installed. Please install Tesseract: "
                "https://github.com/tesseract-ocr/tesseract"
            )

        n = len(d['text'])
        words: List[Dict[str, Any]] = []
        lines_map: Dict[Tuple[int, int], Dict[str, Any]] = {}

        for i in range(n):
            t = (d['text'][i] or '').strip()
            if not t:
                continue
            key = (d['block_num'][i], d['line_num'][i])
            words.append({
                'text': t, 'left': d['left'][i], 'top': d['top'][i],
                'width': d['width'][i], 'height': d['height'][i],
                'line_num': d['line_num'][i], 'block_num': d['block_num'][i],
            })
            if key not in lines_map:
                lines_map[key] = {'texts': [], 'left': [], 'top': [], 'width': [], 'height': []}
            lines_map[key]['texts'].append(t)
            lines_map[key]['left'].append(d['left'][i])
            lines_map[key]['top'].append(d['top'][i])
            lines_map[key]['width'].append(d['width'][i])
            lines_map[key]['height'].append(d['height'][i])

        tables = _detect_tables_from_words(words)

        layout = []
        for key in sorted(lines_map.keys()):
            arr = lines_map[key]
            raw_text = ' '.join(arr['texts'])
            text = _normalize_ocr_text(raw_text)
            if _is_border_or_noise(text):
                continue
            left = min(arr['left'])
            top = min(arr['top'])
            right = max(l + w for l, w in zip(arr['left'], arr['width']))
            bottom = max(t + h for t, h in zip(arr['top'], arr['height']))
            layout.append({
                'text': text,
                'left': int(left),
                'top': int(top),
                'width': int(right - left),
                'height': int(bottom - top),
                'line_num': key[1],
                'block_num': key[0],
            })

        # Reconstruct text for backward compatibility (form mode / editing); use normalized
        text = '\n'.join(ln['text'] for ln in layout) if layout else _normalize_ocr_text(
            pytesseract.image_to_string(img, lang='eng', config='--psm 6').strip()
        )

        return {
            'text': text,
            'layout': layout,
            'image_width': iw,
            'image_height': ih,
            'tables': tables,
        }

    def _layout_to_page_scale(self, image_width: int, image_height: int) -> Tuple[float, float, float, float]:
        """Fit image to letter; return (scale, page_w_pt, page_h_pt, _). scale keeps aspect."""
        pw, ph = letter
        if not image_width or not image_height:
            return 1.0, float(pw), float(ph), 1.0
        scale_x = pw / image_width
        scale_y = ph / image_height
        scale = min(scale_x, scale_y)
        return scale, image_width * scale, image_height * scale, scale

    def text_to_pdf_layout(
        self,
        layout: List[Dict[str, Any]],
        image_width: int,
        image_height: int,
        title: str = "OCR Document",
        tables: Optional[List[Dict[str, Any]]] = None,
    ) -> bytes:
        """
        PDF with text placed at original (x,y). Tables are drawn as grids with cell text.
        """
        if not REPORTLAB_AVAILABLE or pdf_canvas is None:
            raise RuntimeError("reportlab is not installed. Install: pip install reportlab")

        scale, page_w, page_h, _ = self._layout_to_page_scale(image_width, image_height)
        buf = io.BytesIO()
        c = pdf_canvas.Canvas(buf, pagesize=(page_w, page_h))
        c.setTitle(title or "OCR Document")
        tables = tables or []
        drawn = set()  # (block_num, line_start)

        def _find_table(bnum: int, lnum: int):
            for t in tables:
                if t.get('block_num') == bnum and t.get('line_start', 0) <= lnum <= t.get('line_end', 0):
                    return t
            return None

        def _draw_table(t: Dict[str, Any]):
            rows = t.get('rows') or []
            if not rows:
                return
            nr, nc = len(rows), max(len(r) for r in rows) if rows else 0
            if nc == 0:
                return
            left = t.get('left', 0) * scale
            top_img = t.get('top', 0)
            w = max(1, t.get('width', 1)) * scale
            h = max(1, t.get('height', 1)) * scale
            row_h = h / nr
            col_w = w / nc
            # PDF y: image top is at page_h - top_img*scale; bottom of table is at page_h - (top_img+h)*scale
            for ri, row in enumerate(rows):
                for cj, cell in enumerate(row):
                    if cj >= nc:
                        break
                    x = left + cj * col_w + 2
                    y_bottom = page_h - (top_img + (ri + 1) * row_h) * scale
                    c.setFont("Helvetica", max(6, min(10, row_h * 0.6)))
                    c.drawString(x, y_bottom, (str(cell) or "")[:80])
            # Grid
            for i in range(nc + 1):
                cx = left + i * col_w
                c.line(cx, page_h - (top_img + h) * scale, cx, page_h - top_img * scale)
            for i in range(nr + 1):
                cy = page_h - (top_img + i * row_h) * scale
                c.line(left, cy, left + w, cy)

        for ln in layout:
            bnum = ln.get('block_num', 0)
            lnum = ln.get('line_num', 0)
            t = _find_table(bnum, lnum)
            if t:
                key = (t.get('block_num', 0), t.get('line_start', 0))
                if key not in drawn:
                    _draw_table(t)
                    drawn.add(key)
                continue
            left = ln.get('left', 0)
            top = ln.get('top', 0)
            width = ln.get('width', 0)
            height = ln.get('height', 12)
            text = (ln.get('text') or '').strip()
            if not text:
                continue
            x_pt = left * scale
            y_pt = page_h - (top + height) * scale
            font_size = max(6, min(14, height * scale))
            c.setFont("Helvetica", font_size)
            c.drawString(x_pt, y_pt, text[:500])

        c.save()
        buf.seek(0)
        return buf.read()

    def text_to_docx_layout(
        self,
        layout: List[Dict[str, Any]],
        image_width: int,
        image_height: int,
        title: str = "OCR Document",
        tables: Optional[List[Dict[str, Any]]] = None,
    ) -> bytes:
        """
        DOCX that approximates original positions. Tables are added as real Word tables.
        """
        if not DOCX_AVAILABLE or Pt is None:
            raise RuntimeError("python-docx is not installed. Install: pip install python-docx")

        scale, page_w, page_h, _ = self._layout_to_page_scale(image_width, image_height)
        doc = Document()
        doc.add_heading(title or "OCR Document", level=0)

        tables = tables or []
        drawn = set()

        def _find_table(bnum: int, lnum: int):
            for t in tables:
                if t.get('block_num') == bnum and t.get('line_start', 0) <= lnum <= t.get('line_end', 0):
                    return t
            return None

        prev_bottom = 0
        for ln in layout:
            bnum = ln.get('block_num', 0)
            lnum = ln.get('line_num', 0)
            t = _find_table(bnum, lnum)
            if t:
                key = (t.get('block_num', 0), t.get('line_start', 0))
                if key not in drawn:
                    rows = t.get('rows') or []
                    if rows:
                        nc = max(len(r) for r in rows)
                        tbl = doc.add_table(rows=len(rows), cols=nc)
                        tbl.style = 'Table Grid'
                        for ri, row in enumerate(rows):
                            for cj, cell in enumerate(row):
                                if cj < nc:
                                    tbl.rows[ri].cells[cj].text = (str(cell) or "").strip()
                    drawn.add(key)
                continue
            text = (ln.get('text') or '').strip()
            if not text:
                continue
            left = ln.get('left', 0)
            top = ln.get('top', 0)
            height = ln.get('height', 12)
            bottom = top + height

            p = doc.add_paragraph(text)
            p.paragraph_format.left_indent = Pt(max(0, left * scale))
            gap = (top - prev_bottom) * scale if prev_bottom else top * scale
            p.paragraph_format.space_before = Pt(max(0, min(gap, 72)))
            prev_bottom = bottom

        buf = io.BytesIO()
        doc.save(buf)
        buf.seek(0)
        return buf.read()

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
