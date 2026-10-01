"""
Turn a non-editable PDF, scan or photo of a form into a fillable PDF, and read the data out of forms.

Fillable PDF: the output looks exactly like the original (the original page is kept as it is, or the
photo becomes the page), with PDF form fields placed where the blanks are, so the form can be typed
into in any PDF reader (Edge, Chrome, Acrobat, Preview), printed once and signed. Scanned pages also
get an invisible text layer, so they can be searched and copied. Password restrictions on editing are
removed; a PDF that needs a password to open is refused.

Blanks are found from the page itself:
- ruled lines with a label next to them ("Name ______", a signature line with "Signature" below),
- empty boxes and empty table cells, and the free part of a cell that holds only a label,
- a label ending in ":" followed by empty space,
- runs of underscores or dots typed as text,
- small square check boxes.

Form data: the same reading of the page returns label/value pairs (fields already filled in a PDF
form, "Label: value" text, values written on lines and in table cells), for APIs that pull data out of
forms, statements and letters.

Nothing is stored; everything happens in memory.
"""
import io
import logging
import re
import statistics
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional, Tuple

import fitz  # PyMuPDF
import numpy as np
from PIL import Image, ImageOps, ImageSequence

from app.services.ocr_service import (
    OCR_DEFAULT_LANG,
    TESSERACT_TIMEOUT_SECONDS,
    _is_supported_ocr_lang,
    _looks_garbled_digital_text,
    _normalize_ocr_lang,
    _pdf_has_meaningful_text,
)

try:
    import cv2
except Exception:  # pragma: no cover - optional speed-up / better box detection
    cv2 = None

try:
    import pytesseract
    from pytesseract import Output
except Exception:  # pragma: no cover
    pytesseract = None
    Output = None

logger = logging.getLogger(__name__)

IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".bmp", ".tif", ".tiff", ".gif"}
SUPPORTED_LABEL = "PDF, JPG, JPEG, PNG, WEBP, BMP, TIFF or GIF"
DPI = 200  # page rendering for line/box detection and OCR
PX = 72.0 / DPI  # one rendered pixel in PDF points
MAX_FIELDS_PER_PAGE = 300
_BLANK_GLYPHS = re.compile(r"^[_.…\-–—]{4,}$")
_JUNK_WORD = re.compile(r"^[|\[\](){}=~_.,:;'`\"-]+$")


class FillableError(ValueError):
    """A problem the person can act on (wrong file type, password, unreadable file)."""


@dataclass
class Word:
    x0: float
    y0: float
    x1: float
    y1: float
    text: str

    @property
    def h(self) -> float:
        return self.y1 - self.y0

    @property
    def cx(self) -> float:
        return (self.x0 + self.x1) / 2

    @property
    def cy(self) -> float:
        return (self.y0 + self.y1) / 2


@dataclass
class Field:
    rect: fitz.Rect
    kind: str  # text, multiline, checkbox
    label: str = ""
    source: str = ""  # line, box, colon, dots, checkbox
    page: int = 0
    name: str = ""


@dataclass
class PageGeometry:
    width: float
    height: float
    words: List[Word]
    hlines: List[fitz.Rect]
    vlines: List[fitz.Rect]
    boxes: List[fitz.Rect]
    checkboxes: List[fitz.Rect]
    scanned: bool
    existing: List[fitz.Rect] = field(default_factory=list)
    ticked: List[bool] = field(default_factory=list)  # one per check box: marked on the page


# --------------------------------------------------------------------------- opening files

def open_as_pdf(data: bytes, filename: str = "") -> fitz.Document:
    """Open a PDF, or turn an image (one page per frame) into a PDF whose pages are the image."""
    if not data:
        raise FillableError("The file is empty.")
    name = (filename or "").lower()
    ext = name[name.rfind("."):] if "." in name else ""
    if data[:5] == b"%PDF-" or ext == ".pdf":
        try:
            doc = fitz.open(stream=data, filetype="pdf")
        except Exception:
            raise FillableError("This PDF could not be read. It may be damaged.")
        if doc.needs_pass and not doc.authenticate(""):
            doc.close()
            raise FillableError("This PDF needs a password to open. Open it, save a copy without the password, and try again.")
        if len(doc) == 0:
            raise FillableError("This PDF has no pages.")
        return doc
    try:
        img = Image.open(io.BytesIO(data))
        img.load()
    except Exception:
        raise FillableError(f"Unsupported file. Upload a {SUPPORTED_LABEL} file.")
    doc = fitz.open()
    for frame in ImageSequence.Iterator(img):
        frame = ImageOps.exif_transpose(frame.copy())
        if frame.mode not in ("RGB", "L"):
            frame = frame.convert("RGB")
        w, h = frame.size
        dpi = (frame.info.get("dpi") or (0, 0))[0] or 0
        if not dpi or dpi < 50 or dpi > 1200:
            # Unknown resolution (photos): fit the longer side to A4.
            dpi = max(w, h) / (842 / 72.0)
        page = doc.new_page(width=w * 72.0 / dpi, height=h * 72.0 / dpi)
        buf = io.BytesIO()
        frame.save(buf, format="PNG")
        page.insert_image(page.rect, stream=buf.getvalue())
        if img.format == "GIF":
            break  # animated GIFs: first frame only
    return doc


# --------------------------------------------------------------------------- reading a page

def _render_gray(page: fitz.Page) -> np.ndarray:
    pix = page.get_pixmap(dpi=DPI, colorspace=fitz.csGRAY, alpha=False)
    arr = np.frombuffer(pix.samples, dtype=np.uint8).reshape(pix.height, pix.stride)[:, : pix.width]
    return np.ascontiguousarray(arr)


def _to_page(page: fitz.Page, x0: float, y0: float, x1: float, y1: float) -> fitz.Rect:
    """Pixel box on the rendered (as displayed) page -> rectangle in the page's own coordinates."""
    r = fitz.Rect(x0 * PX, y0 * PX, x1 * PX, y1 * PX)
    if page.rotation:
        r = r * page.derotation_matrix
        r.normalize()
    return r


def _digital_words(page: fitz.Page) -> Optional[List[Word]]:
    if not _pdf_has_meaningful_text(page):
        return None
    raw = page.get_text("words") or []
    text = " ".join(w[4] for w in raw)
    if not text.strip() or _looks_garbled_digital_text(text):
        return None
    return [Word(w[0], w[1], w[2], w[3], w[4]) for w in raw if str(w[4]).strip()]


def _ocr_words(page: fitz.Page, gray: np.ndarray, lang: str, fix=None) -> List[Word]:
    if pytesseract is None:
        raise FillableError("Text recognition (OCR) is not available on this server.")
    try:
        d = pytesseract.image_to_data(
            Image.fromarray(gray), lang=lang, config="--psm 11", output_type=Output.DICT,
            timeout=max(30, TESSERACT_TIMEOUT_SECONDS * 3),
        )
    except pytesseract.TesseractNotFoundError:
        raise FillableError("Text recognition (OCR) is not installed on this server.")
    except RuntimeError as e:
        if "timeout" in str(e).lower():
            raise FillableError("Reading this page took too long. Try a clearer or smaller scan.")
        raise
    words = []
    for i, t in enumerate(d["text"]):
        t = (t or "").strip()
        try:
            conf = float(d["conf"][i])
        except (TypeError, ValueError):
            conf = -1
        if not t or (conf < 35 and not _BLANK_GLYPHS.match(t)):
            continue
        if _JUNK_WORD.match(t) and not _BLANK_GLYPHS.match(t):
            continue
        box = (d["left"][i], d["top"][i], d["left"][i] + d["width"][i], d["top"][i] + d["height"][i])
        r = _to_page(page, *(fix.back(*box) if fix is not None else box))
        words.append(Word(r.x0, r.y0, r.x1, r.y1, t))
    return words


def _segments(mask: np.ndarray, axis: int, min_len: int, max_thick: int) -> List[Tuple[int, int, int, int]]:
    """Long thin runs of ink: axis 1 = horizontal lines, axis 0 = vertical. Returns pixel boxes."""
    out = []
    if cv2 is not None:
        n, _, stats, _ = cv2.connectedComponentsWithStats(mask, connectivity=8)
        for i in range(1, n):
            x, y, w, h, _a = stats[i]
            if axis == 1 and w >= min_len and h <= max_thick:
                out.append((x, y, x + w, y + h))
            if axis == 0 and h >= min_len and w <= max_thick:
                out.append((x, y, x + w, y + h))
        return out
    # numpy fallback: scan rows (or columns) for long runs, then merge neighbouring rows.
    m = mask > 0 if axis == 1 else (mask > 0).T
    runs = []
    for r in range(m.shape[0]):
        row = np.concatenate(([0], m[r].astype(np.int8), [0]))
        d = np.diff(row)
        starts, ends = np.where(d == 1)[0], np.where(d == -1)[0]
        for s, e in zip(starts, ends):
            if e - s >= min_len:
                runs.append([r, s, e])
    merged: List[List[int]] = []
    for r, s, e in runs:
        for mrg in merged:
            if r - mrg[1] <= 1 and min(e, mrg[3]) - max(s, mrg[2]) > 0.8 * min(e - s, mrg[3] - mrg[2]):
                mrg[1], mrg[2], mrg[3] = r, min(s, mrg[2]), max(e, mrg[3])
                break
        else:
            merged.append([r, r, s, e])
    for r0, r1, s, e in merged:
        if r1 - r0 + 1 <= max_thick:
            out.append((s, r0, e, r1 + 1) if axis == 1 else (r0, s, r1 + 1, e))
    return out


def _binarize(gray: np.ndarray) -> np.ndarray:
    if cv2 is not None:
        return cv2.adaptiveThreshold(gray, 255, cv2.ADAPTIVE_THRESH_MEAN_C, cv2.THRESH_BINARY_INV, 31, 15)
    return np.where(gray < 150, 255, 0).astype(np.uint8)


def _line_masks(bw: np.ndarray) -> Tuple[np.ndarray, np.ndarray]:
    h, w = bw.shape
    if cv2 is None:
        return bw, bw
    hk = cv2.getStructuringElement(cv2.MORPH_RECT, (max(25, w // 45), 1))
    vk = cv2.getStructuringElement(cv2.MORPH_RECT, (1, max(25, h // 70)))
    horiz = cv2.morphologyEx(bw, cv2.MORPH_OPEN, hk)
    vert = cv2.morphologyEx(bw, cv2.MORPH_OPEN, vk)
    return horiz, vert


def _boxes(horiz: np.ndarray, vert: np.ndarray) -> List[Tuple[int, int, int, int]]:
    """Closed rectangles drawn with lines: empty boxes and table cells (pixel boxes)."""
    if cv2 is None:
        return []
    grid = cv2.dilate(cv2.bitwise_or(horiz, vert), np.ones((3, 3), np.uint8))
    inside = cv2.bitwise_not(grid)
    n, _, stats, _ = cv2.connectedComponentsWithStats(inside, connectivity=4)
    H, W = grid.shape
    out = []
    for i in range(1, n):
        x, y, w, h, area = stats[i]
        if x <= 1 or y <= 1 or x + w >= W - 1 or y + h >= H - 1:
            continue  # the page background
        if w < 0.22 * DPI or h < 0.1 * DPI or w * h > 0.6 * W * H:
            continue
        if area < 0.8 * w * h:
            continue  # not a rectangle
        out.append((x, y, x + w, y + h))
    return out


def _checkboxes(bw: np.ndarray) -> List[Tuple[int, int, int, int, bool]]:
    """Small hollow squares with straight sides."""
    if cv2 is None:
        return []
    lo, hi = int(0.06 * DPI), int(0.28 * DPI)
    contours, _ = cv2.findContours(bw, cv2.RETR_LIST, cv2.CHAIN_APPROX_SIMPLE)
    out = []
    for c in contours:
        x, y, w, h = cv2.boundingRect(c)
        if not (lo <= w <= hi and lo <= h <= hi and 0.7 <= w / float(h) <= 1.43):
            continue
        if cv2.contourArea(cv2.convexHull(c)) < 0.88 * w * h:
            continue  # round (O, 0, Q): a square fills its bounding box
        roi = bw[y:y + h, x:x + w] > 0
        t = max(1, min(w, h) // 8)
        sides = [roi[:t].any(axis=0).mean(), roi[-t:].any(axis=0).mean(),
                 roi[:, :t].any(axis=1).mean(), roi[:, -t:].any(axis=1).mean()]
        if min(sides) < 0.85:
            continue
        k = t + 1
        corners = [roi[:k, :k].mean(), roi[:k, -k:].mean(), roi[-k:, :k].mean(), roi[-k:, -k:].mean()]
        if min(corners) < 0.3:
            continue  # rounded corners: a letter O or 0, not a box
        inner = roi[t + 1:h - t - 1, t + 1:w - t - 1]
        if inner.size and inner.mean() > 0.6:
            continue  # a solid square, not a box
        if any(abs(x - a) < 3 and abs(y - b) < 3 for a, b, *_ in out):
            continue  # inner and outer edge of the same square
        out.append((x, y, x + w, y + h, bool(inner.size and inner.mean() > 0.08)))
    return out


def _skew_angle(bw: np.ndarray) -> float:
    """Tilt of a scan or photo in degrees, from its long horizontal strokes (0 when unknown)."""
    if cv2 is None:
        return 0.0
    k = cv2.getStructuringElement(cv2.MORPH_RECT, (max(25, bw.shape[1] // 30), 1))
    mask = cv2.dilate(bw, np.ones((5, 1), np.uint8))  # tolerate stair-stepped tilted lines
    mask = cv2.morphologyEx(mask, cv2.MORPH_OPEN, k)
    n, labels, stats, _ = cv2.connectedComponentsWithStats(mask, connectivity=8)
    angles = []
    for i in range(1, n):
        x, y, w, h, _a = stats[i]
        if w < bw.shape[1] * 0.12 or h > w * 0.12:
            continue
        ys, xs = np.where(labels[y:y + h, x:x + w] == i)
        if len(xs) < 20:
            continue
        slope = np.polyfit(xs.astype(float), ys.astype(float), 1)[0]
        angles.append(float(np.degrees(np.arctan(slope))))
    if len(angles) < 2:
        return 0.0
    return float(np.median(angles))


class _Unskew:
    """Straighten a tilted page image, and map boxes found on it back to the original image."""

    def __init__(self, gray: np.ndarray):
        self.inv = None
        self.gray = gray
        angle = _skew_angle(_binarize(gray))
        if cv2 is None or not (0.15 <= abs(angle) <= 8):
            return
        h, w = gray.shape
        m = cv2.getRotationMatrix2D((w / 2, h / 2), angle, 1.0)
        self.gray = cv2.warpAffine(gray, m, (w, h), flags=cv2.INTER_LINEAR, borderValue=255)
        self.inv = cv2.invertAffineTransform(m)

    def back(self, x0: float, y0: float, x1: float, y1: float) -> Tuple[float, float, float, float]:
        if self.inv is None:
            return x0, y0, x1, y1
        cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
        nx = self.inv[0, 0] * cx + self.inv[0, 1] * cy + self.inv[0, 2]
        ny = self.inv[1, 0] * cx + self.inv[1, 1] * cy + self.inv[1, 2]
        return nx - (x1 - x0) / 2, ny - (y1 - y0) / 2, nx + (x1 - x0) / 2, ny + (y1 - y0) / 2


def read_page(page: fitz.Page, lang: str) -> PageGeometry:
    words = _digital_words(page)
    scanned = words is None
    gray = _render_gray(page)
    fix = _Unskew(gray) if scanned else _Unskew.__new__(_Unskew)
    if not scanned:
        fix.inv, fix.gray = None, gray
    gray = fix.gray
    to_page = lambda b: _to_page(page, *fix.back(*b))  # noqa: E731
    bw = _binarize(gray)
    horiz, vert = _line_masks(bw)
    if scanned:
        # Ruled lines and cell borders confuse OCR; read the text with them whitened out.
        text_img = gray.copy()
        if cv2 is not None:
            text_img[cv2.dilate(cv2.bitwise_or(horiz, vert), np.ones((3, 3), np.uint8)) > 0] = 255
        words = _ocr_words(page, text_img, lang, fix)
    hlines = [to_page(b) for b in _segments(horiz, 1, int(0.35 * DPI), int(0.04 * DPI) + 2)]
    vlines = [to_page(b) for b in _segments(vert, 0, int(0.25 * DPI), int(0.04 * DPI) + 2)]
    boxes = [to_page(b) for b in _boxes(horiz, vert)]
    found = _checkboxes(bw)
    checks = [to_page(b[:4]) for b in found]
    ticked = [b[4] for b in found]
    existing = [w.rect for w in (page.widgets() or [])]
    r = page.rect
    return PageGeometry(r.width, r.height, words, hlines, vlines, boxes, checks, scanned, existing, ticked)


# --------------------------------------------------------------------------- finding blanks

def _overlap(a: fitz.Rect, b: fitz.Rect) -> float:
    """Intersection area as a share of the smaller rectangle."""
    i = fitz.Rect(a) & b
    if i.is_empty:
        return 0.0
    small = min(a.get_area(), b.get_area()) or 1.0
    return i.get_area() / small


def _text_lines(words: List[Word]) -> List[List[Word]]:
    lines: List[List[Word]] = []
    for w in sorted(words, key=lambda w: (w.cy, w.x0)):
        for ln in lines:
            ref = ln[-1]
            if abs(w.cy - ref.cy) < 0.5 * max(ref.h, w.h):
                ln.append(w)
                break
        else:
            lines.append([w])
    for ln in lines:
        ln.sort(key=lambda w: w.x0)
    return lines


def _label_left(words: List[Word], x: float, y0: float, y1: float, max_gap: float) -> str:
    """Words just left of x on the band y0..y1, read right to left until a wide gap."""
    band = [w for w in words if w.x1 <= x + 2 and min(w.y1, y1) - max(w.y0, y0) > 0.3 * w.h]
    band.sort(key=lambda w: w.x1, reverse=True)
    picked, edge = [], x
    for w in band:
        if edge - w.x1 > max_gap:
            break
        if _BLANK_GLYPHS.match(w.text):
            break
        picked.append(w)
        edge = w.x0
        if len(picked) >= 6:
            break
    return " ".join(w.text for w in reversed(picked))


def _label_below(words: List[Word], r: fitz.Rect, depth: float) -> str:
    below = [w for w in words if r.y1 - 1 <= w.y0 <= r.y1 + depth and w.x1 > r.x0 and w.x0 < r.x1]
    if not below:
        return ""
    top = min(w.y0 for w in below)
    return " ".join(w.text for w in sorted(below, key=lambda w: w.x0) if w.y0 < top + 0.6 * below[0].h)


def _clean_label(s: str) -> str:
    s = re.sub(r"[_.…:]+$", "", (s or "").strip()).strip(" :-–—*")
    return re.sub(r"\s+", " ", s)[:80]


def _free_intervals(x0: float, x1: float, blocks: List[Tuple[float, float]]) -> List[Tuple[float, float]]:
    out, cur = [], x0
    for a, b in sorted(blocks):
        if b <= cur:
            continue
        if a > cur:
            out.append((cur, min(a, x1)))
        cur = max(cur, b)
        if cur >= x1:
            break
    if cur < x1:
        out.append((cur, x1))
    return [(a, b) for a, b in out if b > a]


def _real_checkboxes(g: PageGeometry) -> List[fitz.Rect]:
    """Drop squares that are really letters (O, D, 0...) inside printed words."""
    out = []
    for c in g.checkboxes:
        hit = False
        for w in g.words:
            wr = fitz.Rect(w.x0, w.y0, w.x1, w.y1)
            # A square inside a real, longer word is a letter of it (the O of "FORM"). OCR often
            # reads a real box as junk ("(CC", "[]") or glues it onto the next word; those stay boxes.
            letters = re.sub(r"[^A-Za-z]", "", w.text)
            if len(letters) >= 3 and letters == w.text.strip(".,:;") and wr.width > 1.6 * c.width and _overlap(wr, c) > 0.6:
                hit = True
                break
        if not hit:
            out.append(c)
    return out


def find_fields(g: PageGeometry) -> List[Field]:
    checks = _real_checkboxes(g)
    # Words drawn over a check box (OCR reads the square as "O", "(J", "[]") are not text.
    words = [w for w in g.words if not _BLANK_GLYPHS.match(w.text)
             and not any(_overlap(fitz.Rect(w.x0, w.y0, w.x1, w.y1), c) > 0.4 for c in checks)]
    heights = [w.h for w in words if w.h > 2]
    med_h = statistics.median(heights) if heights else 10.0
    heading = lambda w: w.h > 1.35 * med_h  # noqa: E731  titles are not labels
    fh = min(22.0, max(12.0, med_h * 1.6))  # height of a one-line field
    min_w = max(24.0, 2.2 * med_h)
    fields: List[Field] = []

    def words_in(r: fitz.Rect) -> List[Word]:
        return [w for w in words if r.contains(fitz.Point(w.cx, w.cy))]

    def add(rect: fitz.Rect, kind: str, label: str, source: str) -> None:
        rect = fitz.Rect(rect)
        if rect.width < 6 or rect.height < 6:
            return
        rect = rect & fitz.Rect(0, 0, g.width, g.height)
        for f in fields:
            if _overlap(f.rect, rect) > 0.3:
                return
        for r in g.existing:
            if _overlap(r, rect) > 0.3:
                return
        if kind != "checkbox":
            for w in words:
                wr = fitz.Rect(w.x0, w.y0, w.x1, w.y1)
                i = wr & rect
                if not i.is_empty and i.get_area() > 0.25 * wr.get_area():
                    return  # never cover printed text
        fields.append(Field(rect, kind, _clean_label(label), source))

    # 1. Empty boxes and table cells; a cell holding only a label gets the free space beside or below it.
    def cell_text(b: fitz.Rect) -> str:
        return " ".join(w.text for w in sorted(words_in(b), key=lambda w: (round(w.cy / med_h), w.x0)))

    def left_neighbour(box: fitz.Rect) -> Optional[fitz.Rect]:
        cands = [b for b in g.boxes if abs(b.x1 - box.x0) < 6 and abs(b.y0 - box.y0) < 4 and abs(b.y1 - box.y1) < 4]
        return cands[0] if cands else None

    def right_neighbour_empty(box: fitz.Rect) -> bool:
        return any(abs(b.x0 - box.x1) < 6 and abs(b.y0 - box.y0) < 4 and abs(b.y1 - box.y1) < 4 and not words_in(b)
                   for b in g.boxes)

    for box in sorted(g.boxes, key=lambda b: (bool(words_in(b)), b.y0, b.x0)):
        if any(b != box and box.contains(b) and b.get_area() > 0.2 * box.get_area() for b in g.boxes):
            continue  # an outer frame around other boxes
        inner = fitz.Rect(box.x0 + 2, box.y0 + 2, box.x1 - 2, box.y1 - 2)
        inside = words_in(box)
        if not inside:
            nb = left_neighbour(box)
            left_label = cell_text(nb) if nb else _label_left(words, box.x0, box.y0, box.y1, 6 * med_h)
            above = [w for w in words if box.y0 - 2.2 * med_h <= w.y1 <= box.y0 + 1 and w.x0 < box.x1 and w.x1 > box.x0]
            label = left_label or " ".join(w.text for w in sorted(above, key=lambda w: w.x0))
            add(inner, "multiline" if box.height > 2.2 * fh else "text", label, "box")
            continue
        right = max(w.x1 for w in inside)
        bottom = max(w.y1 for w in inside)
        label = " ".join(w.text for w in sorted(inside, key=lambda w: (round(w.cy / med_h), w.x0)))
        if right_neighbour_empty(box):
            continue  # a label cell: its value goes in the empty cell beside it
        if box.height < 2.6 * fh and box.x1 - right > max(min_w, 0.35 * box.width):
            add(fitz.Rect(right + 3, inner.y0, inner.x1, inner.y1), "text", label, "box")
        elif box.y1 - bottom > 1.4 * fh:
            add(fitz.Rect(inner.x0, bottom + 2, inner.x1, inner.y1), "multiline" if box.y1 - bottom > 2.4 * fh else "text", label, "box")

    # 2. Ruled lines: the free space just above the line, next to a label.
    for ln in sorted(g.hlines, key=lambda r: (r.y0, r.x0)):
        edge = sum(max(0.0, min(ln.x1, b.x1 + 3) - max(ln.x0, b.x0 - 3)) for b in g.boxes
                   if min(abs(ln.y0 - b.y0), abs(ln.y1 - b.y1), abs(ln.y0 - b.y1), abs(ln.y1 - b.y0)) < 4)
        if edge >= 0.7 * ln.width:
            continue  # edge of boxes or a table, handled above
        y1 = ln.y0 - 0.5
        y0 = y1 - fh
        blocks = [(w.x0 - 2, w.x1 + 2) for w in g.words if min(w.y1, y1) - max(w.y0, y0) > 0.4 * w.h]
        blocks += [(v.x0 - 1, v.x1 + 1) for v in g.vlines if v.y0 < y1 and v.y1 > y0]
        short = ln.width < 0.5 * g.width
        for a, b in _free_intervals(ln.x0, ln.x1, blocks):
            if b - a < min_w:
                continue
            r = fitz.Rect(a + 1, y0, b - 1, y1)
            label = _label_left([w for w in words if not heading(w)], a + 2, y0, y1 + 2, 3 * med_h)
            if label and not short and not label.endswith(":"):
                label = ""  # a long rule after plain text is a separator, not a blank
            if not label and short:
                # A signature-style line: its caption sits under the start of the line.
                below = [w for w in words if not heading(w) and a - 2 <= w.x0 <= a + 0.4 * (b - a)]
                label = _label_below(below, fitz.Rect(a, y0, b, ln.y1), 1.6 * fh)
            if label or short:
                add(r, "text", label, "line")

    # 3. Typed blanks: "_____" or "......" written as text.
    for w in g.words:
        if _BLANK_GLYPHS.match(w.text) and w.x1 - w.x0 >= min_w:
            y1 = w.y1 + 1
            add(fitz.Rect(w.x0, y1 - fh, w.x1, y1), "text", _label_left(words, w.x0, w.y0, w.y1, 3 * med_h), "dots")

    # 4. "Label:" followed by empty space on the same line, up to the form's right margin.
    margin = max([w.x1 for w in g.words] + [r.x1 for r in g.hlines] + [b.x1 for b in g.boxes] + [0.0])
    margin = margin if margin > 0.5 * g.width else g.width - 24
    for line in _text_lines(words):
        for i, w in enumerate(line):
            if not w.text.endswith(":") or len(w.text) < 2:
                continue
            nxt = line[i + 1].x0 if i + 1 < len(line) else margin
            stops = [v.x0 for v in g.vlines if v.x0 > w.x1 and v.y0 < w.y1 and v.y1 > w.y0]
            stops += [c.x0 for c in checks if c.x0 > w.x1 and c.y0 < w.y1 and c.y1 > w.y0]
            if any(w.y1 - 2 <= b.y0 <= w.y1 + 2 * fh and b.x0 <= w.x1 and b.x1 >= w.x0 for b in g.boxes):
                continue  # a heading for the box below it
            end = min([nxt] + stops) - 3
            if end - (w.x1 + 4) >= max(min_w, 3 * med_h):
                pad = 0.25 * w.h
                lab = _label_left(words, w.x1, w.y0, w.y1, 3 * med_h)
                add(fitz.Rect(w.x1 + 4, w.y0 - pad, end, w.y1 + pad), "text", lab, "colon")

    # 5. Check boxes.
    for c in checks:
        if any(_overlap(c, f.rect) > 0.3 for f in fields):
            continue
        label = ""
        cy = (c.y0 + c.y1) / 2
        nxt = min([o.x0 for o in checks if o.x0 > c.x1 and abs((o.y0 + o.y1) / 2 - cy) < med_h] + [c.x1 + 14 * med_h])
        right = [w for w in words if c.x1 - 1 <= w.x0 < nxt and abs(w.cy - cy) < med_h]
        right.sort(key=lambda w: w.x0)
        picked = []
        for w in right:
            if picked and w.x0 - picked[-1].x1 > 1.5 * med_h:
                break
            picked.append(w)
        label = " ".join(w.text for w in picked[:5])
        if not label:
            label = _label_left(words, c.x0, c.y0, c.y1, 2 * med_h)
        add(fitz.Rect(c.x0 + 0.5, c.y0 + 0.5, c.x1 - 0.5, c.y1 - 0.5), "checkbox", label, "checkbox")

    fields.sort(key=lambda f: (round(f.rect.y0 / 4), f.rect.x0))
    return fields[:MAX_FIELDS_PER_PAGE]


# --------------------------------------------------------------------------- writing the fillable PDF

def _add_text_layer(page: fitz.Page, words: List[Word]) -> None:
    """Invisible text over a scanned page so it can be searched and copied."""
    for w in words:
        if _BLANK_GLYPHS.match(w.text):
            continue
        try:
            w.text.encode("latin-1")
        except UnicodeEncodeError:
            continue  # the built-in font only covers Latin text
        size = max(4.0, w.h * 0.85)
        try:
            page.insert_text(fitz.Point(w.x0, w.y1 - 0.15 * w.h), w.text, fontsize=size, fontname="helv", render_mode=3)
        except Exception:
            pass


def _unique(name: str, used: Dict[str, int]) -> str:
    base = re.sub(r"[^A-Za-z0-9 _-]", "", name).strip().replace(" ", "_")[:40] or "field"
    used[base] = used.get(base, 0) + 1
    return base if used[base] == 1 else f"{base}_{used[base]}"


def make_fillable_pdf(data: bytes, filename: str = "", ocr_lang: Optional[str] = None, max_pages: int = 25) -> Tuple[bytes, Dict[str, Any]]:
    """Return (fillable PDF bytes, report)."""
    lang = _normalize_ocr_lang(ocr_lang)
    if not _is_supported_ocr_lang(lang):
        lang = OCR_DEFAULT_LANG
    doc = open_as_pdf(data, filename)
    try:
        if len(doc) > max_pages:
            raise FillableError(f"This document has {len(doc)} pages; the limit is {max_pages}.")
        used: Dict[str, int] = {}
        report = {"pages": len(doc), "scanned_pages": 0, "fields": 0, "checkboxes": 0,
                  "already_fillable_fields": 0, "field_list": []}
        for pno in range(len(doc)):
            page = doc[pno]
            g = read_page(page, lang)
            report["already_fillable_fields"] += len(g.existing)
            if g.scanned:
                report["scanned_pages"] += 1
                _add_text_layer(page, g.words)
            n = 0
            for f in find_fields(g):
                f.page = pno + 1
                n += 1
                f.name = _unique(f.label or f"p{pno + 1}_field_{n}", used)
                wdg = fitz.Widget()
                wdg.rect = f.rect
                wdg.field_name = f.name
                wdg.field_label = f.label or f.name
                wdg.border_width = 0
                if f.kind == "checkbox":
                    wdg.field_type = fitz.PDF_WIDGET_TYPE_CHECKBOX
                    wdg.field_value = False
                    report["checkboxes"] += 1
                else:
                    wdg.field_type = fitz.PDF_WIDGET_TYPE_TEXT
                    wdg.text_font = "Helv"
                    wdg.text_color = (0, 0, 0.55)
                    if f.kind == "multiline":
                        wdg.field_flags |= fitz.PDF_TX_FIELD_IS_MULTILINE
                        wdg.text_fontsize = min(11, max(8, f.rect.height / 4))
                    else:
                        # Narrow blanks shrink the text to fit (size 0 = automatic).
                        wdg.text_fontsize = 0 if f.rect.width < 100 else max(7.0, min(11.0, f.rect.height * 0.62))
                    report["fields"] += 1
                page.add_widget(wdg)
                report["field_list"].append({"name": f.name, "label": f.label, "page": f.page, "type": f.kind})
        out = doc.tobytes(garbage=3, deflate=True, encryption=fitz.PDF_ENCRYPT_NONE)
        return out, report
    finally:
        doc.close()


# --------------------------------------------------------------------------- reading form data

def _checkbox_label(words: List[Word], c: fitz.Rect, checks: List[fitz.Rect], med_h: float) -> str:
    cy = (c.y0 + c.y1) / 2
    nxt = min([o.x0 for o in checks if o.x0 > c.x1 and abs((o.y0 + o.y1) / 2 - cy) < med_h] + [c.x1 + 14 * med_h])
    right = sorted([w for w in words if c.x1 - 1 <= w.x0 < nxt and abs(w.cy - cy) < med_h], key=lambda w: w.x0)
    picked: List[Word] = []
    for w in right:
        if picked and w.x0 - picked[-1].x1 > 1.5 * med_h:
            break
        picked.append(w)
    return " ".join(w.text for w in picked[:5])


def _values_on_page(page: fitz.Page, g: PageGeometry) -> List[Dict[str, Any]]:
    checks = _real_checkboxes(g)
    ticked = g.ticked or [False] * len(g.checkboxes)
    tick = [ticked[i] for i, c in enumerate(g.checkboxes) if any(c is k for k in checks)]
    words = [w for w in g.words if not _BLANK_GLYPHS.match(w.text)
             and not any(_overlap(fitz.Rect(w.x0, w.y0, w.x1, w.y1), c) > 0.4 for c in checks)]
    heights = [w.h for w in words if w.h > 2]
    med_h = statistics.median(heights) if heights else 10.0
    pairs: List[Dict[str, Any]] = []
    taken: List[fitz.Rect] = []
    used: set = set()

    def inside(b: fitz.Rect) -> List[Word]:
        return sorted([w for w in words if b.contains(fitz.Point(w.cx, w.cy))], key=lambda w: (round(w.cy / med_h), w.x0))

    def keep(label: str, value: str, rect: fitz.Rect, source: str, value_words=()) -> None:
        label, value = _clean_label(label), (value or "").strip()
        if not label or not value or any(_overlap(rect, t) > 0.5 for t in taken):
            return
        taken.append(fitz.Rect(rect))
        used.update(id(w) for w in value_words)
        pairs.append({"label": label, "value": value, "source": source,
                      "box": [round(rect.x0, 1), round(rect.y0, 1), round(rect.x1, 1), round(rect.y1, 1)]})

    # 1. Values already typed into PDF form fields.
    for wdg in page.widgets() or []:
        val = wdg.field_value
        if wdg.field_type == fitz.PDF_WIDGET_TYPE_CHECKBOX:
            val = "Yes" if val not in (False, "Off", "", None) else "No"
        keep(wdg.field_label or wdg.field_name or "", str(val or ""), wdg.rect, "form_field")
    has_form = bool(pairs)

    # 2. Tables: a label cell followed by a value cell; a box holding a value under its heading.
    for b in sorted(g.boxes, key=lambda b: (round(b.y0 / 3), b.x0)):
        if any(o is not b and b.contains(o) for o in g.boxes):
            continue  # an outer frame
        val = inside(b)
        if not val or any(_overlap(b, t) > 0.5 for t in taken):
            continue
        left = [a for a in g.boxes if abs(a.x1 - b.x0) < 6 and abs(a.y0 - b.y0) < 4 and abs(a.y1 - b.y1) < 4]
        if left:
            lab = inside(left[0])
            if lab:
                keep(" ".join(w.text for w in lab), " ".join(w.text for w in val), b, "table", val)
                used.update(id(w) for w in lab)
            continue
        if any(abs(a.x0 - b.x1) < 6 and abs(a.y0 - b.y0) < 4 for a in g.boxes):
            continue  # a label cell; its value is in the next cell
        above = sorted([w for w in words if b.y0 - 2.2 * med_h <= w.y1 <= b.y0 + 1 and w.x0 < b.x1 and w.x1 > b.x0],
                       key=lambda w: w.x0)
        if above:
            keep(" ".join(w.text for w in above), " ".join(w.text for w in val), b, "box", val)
            used.update(id(w) for w in above)

    # 3. Check boxes printed on the page: ticked or not (PDF form check boxes were read above).
    if not has_form:
        for c, t in zip(checks, tick):
            lab = _checkbox_label(words, c, checks, med_h)
            if lab and not any(_overlap(c, r) > 0.3 for r in taken):
                keep(lab, "Yes" if t else "No", c, "checkbox")
                cy = (c.y0 + c.y1) / 2
                used.update(id(w) for w in words if w.text in lab.split() and abs(w.cy - cy) < med_h and w.x0 >= c.x1 - 1)

    # 4. "Label: value" on one line, up to the next "Other label:" or check box.
    for line in _text_lines([w for w in words if id(w) not in used]):
        i = 0
        while i < len(line):
            w = line[i]
            if w.text.endswith(":") and len(w.text) > 1:
                stops = [c.x0 for c in checks if c.x0 > w.x1 and c.y0 < w.y1 and c.y1 > w.y0]
                limit = min(stops) if stops else float("inf")
                j = i + 1
                vals: List[Word] = []
                while j < len(line) and not (line[j].text.endswith(":") and len(line[j].text) > 1) and line[j].x0 < limit:
                    if vals and line[j].x0 - vals[-1].x1 > 4 * med_h:
                        break
                    vals.append(line[j])
                    j += 1
                if vals:
                    lab = _label_left(words, w.x1, w.y0, w.y1, 2 * med_h)
                    r = fitz.Rect(vals[0].x0, min(v.y0 for v in vals), vals[-1].x1, max(v.y1 for v in vals))
                    keep(lab, " ".join(v.text for v in vals), r, "label_colon", vals)
                i = max(j, i + 1)
            else:
                i += 1

    # 5. Values written on ruled lines (not table or box borders), labelled to their left or below.
    for ln in g.hlines:
        edge = sum(max(0.0, min(ln.x1, b.x1 + 3) - max(ln.x0, b.x0 - 3)) for b in g.boxes
                   if min(abs(ln.y0 - b.y0), abs(ln.y1 - b.y1), abs(ln.y0 - b.y1), abs(ln.y1 - b.y0)) < 4)
        if edge >= 0.7 * ln.width:
            continue
        band = fitz.Rect(ln.x0, ln.y0 - 1.8 * med_h, ln.x1, ln.y0 + 0.4 * med_h)
        on = sorted([w for w in words if id(w) not in used and band.contains(fitz.Point(w.cx, w.cy))], key=lambda w: w.x0)
        if not on:
            continue
        lab = _label_left(words, ln.x0 + 2, band.y0, band.y1, 3 * med_h)
        if not lab:
            below = [w for w in words if ln.x0 - 2 <= w.x0 <= ln.x0 + 0.4 * ln.width]
            lab = _label_below(below, ln, 2.2 * med_h)
        keep(lab, " ".join(w.text for w in on), band, "line", on)
    return pairs


def extract_form_data(data: bytes, filename: str = "", ocr_lang: Optional[str] = None, max_pages: int = 25) -> Dict[str, Any]:
    """Label/value pairs and the full text of a form, statement or letter (PDF or image)."""
    lang = _normalize_ocr_lang(ocr_lang)
    if not _is_supported_ocr_lang(lang):
        lang = OCR_DEFAULT_LANG
    doc = open_as_pdf(data, filename)
    try:
        if len(doc) > max_pages:
            raise FillableError(f"This document has {len(doc)} pages; the limit is {max_pages}.")
        pages = []
        for pno in range(len(doc)):
            page = doc[pno]
            g = read_page(page, lang)
            text = "\n".join(" ".join(w.text for w in ln) for ln in _text_lines(g.words))
            fields = _values_on_page(page, g)
            for f in fields:
                f["page"] = pno + 1
            pages.append({"page": pno + 1, "scanned": g.scanned, "text": text, "fields": fields})
        return {
            "page_count": len(pages),
            "fields": [f for p in pages for f in p["fields"]],
            "text": "\n\n".join(p["text"] for p in pages),
            "pages": pages,
        }
    finally:
        doc.close()
