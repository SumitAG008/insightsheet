"""
OCR Service for InsightSheet-lite / Meldra
Extracts text from images (JPG, PNG, WebP, BMP, TIFF, GIF) and exports to editable DOC or PDF.
"""
import io
import logging
from typing import Union, BinaryIO

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
    from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer
    from reportlab.lib.units import inch
    REPORTLAB_AVAILABLE = True
except ImportError:
    REPORTLAB_AVAILABLE = False


class OCRService:
    """Service for OCR: image -> text, and text -> editable DOC/PDF."""

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
            # Use PSM 3 (fully automatic) if 6 gives poor results on forms
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
        Create an editable Word document from text.

        Args:
            text: Plain text content (paragraphs separated by newlines).
            title: Optional title for the document.

        Returns:
            .docx file as bytes.
        """
        if not DOCX_AVAILABLE:
            raise RuntimeError("python-docx is not installed. Install: pip install python-docx")

        doc = Document()
        doc.add_heading(title, level=0)

        # Split into paragraphs (double newline = new para; single newline = line break in same para)
        blocks = [b.strip() for b in text.split('\n\n') if b.strip()]
        if not blocks:
            # No double newlines: treat each line as a paragraph
            blocks = [line.strip() for line in text.split('\n') if line.strip()]
        if not blocks:
            doc.add_paragraph("(No text extracted)")

        for block in blocks:
            # Replace single \n with space for one paragraph, or add as separate paras
            lines = [l.strip() for l in block.split('\n') if l.strip()]
            para_text = ' '.join(lines) if lines else block
            doc.add_paragraph(para_text)

        buf = io.BytesIO()
        doc.save(buf)
        buf.seek(0)
        return buf.read()

    def text_to_pdf(self, text: str, title: str = "OCR Document") -> bytes:
        """
        Create an editable PDF (with text layer) from text.
        The PDF is searchable and text can be selected/copied in viewers.

        Args:
            text: Plain text content.
            title: Optional title (metadata).

        Returns:
            .pdf file as bytes.
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

        # Split into paragraphs
        blocks = [b.strip() for b in text.split('\n\n') if b.strip()]
        if not blocks:
            blocks = [line.strip() for line in text.split('\n') if line.strip()]
        if not blocks:
            story.append(Paragraph("(No text extracted)", styles['Normal']))

        for block in blocks:
            lines = [l.strip() for l in block.split('\n') if l.strip()]
            para_text = ' '.join(lines) if lines else block
            # Escape XML-like chars for ReportLab
            para_text = para_text.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')
            story.append(Paragraph(para_text, styles['Normal']))
            story.append(Spacer(1, 6))

        doc.build(story)
        buf.seek(0)
        return buf.read()

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
