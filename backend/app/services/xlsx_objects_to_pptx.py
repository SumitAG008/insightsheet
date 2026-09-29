"""
Excel workbook -> PowerPoint, one slide per chart or picture, charts kept as native editable charts.

Excel and PowerPoint store charts in the same DrawingML chart format, so instead of re-drawing a
chart (and losing its formatting), each chart part is copied from the workbook into the
presentation together with everything it references (style, colours, pictures used as fills,
shapes drawn on the chart). The source workbook is embedded so "Edit Data" works in PowerPoint.
Pictures are copied as the original image files. Newer Excel chart types (treemap, sunburst,
waterfall, histogram, box & whisker, funnel: "chartEx") are copied the same way.

Only the workbook's package structure is read; openpyxl is not used, because it drops the
chartEx types and silently skips charts it cannot parse.
"""
from __future__ import annotations

import copy
import hashlib
import io
import posixpath
import re
import zipfile
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Tuple

from lxml import etree
from pptx import Presentation
from pptx.opc.constants import RELATIONSHIP_TYPE as RT
from pptx.opc.package import Part
from pptx.oxml import parse_xml
from pptx.opc.packuri import PackURI
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN
from pptx.util import Emu, Inches, Pt

from .xlsx_tables import SheetTable, find_tables

NS = {
    "main": "http://schemas.openxmlformats.org/spreadsheetml/2006/main",
    "r": "http://schemas.openxmlformats.org/officeDocument/2006/relationships",
    "rel": "http://schemas.openxmlformats.org/package/2006/relationships",
    "ct": "http://schemas.openxmlformats.org/package/2006/content-types",
    "xdr": "http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing",
    "a": "http://schemas.openxmlformats.org/drawingml/2006/main",
    "c": "http://schemas.openxmlformats.org/drawingml/2006/chart",
    "cx": "http://schemas.microsoft.com/office/drawing/2014/chartex",
    "mc": "http://schemas.openxmlformats.org/markup-compatibility/2006",
    "p": "http://schemas.openxmlformats.org/presentationml/2006/main",
}
R_NS = NS["r"]
CHART_URI = "http://schemas.openxmlformats.org/drawingml/2006/chart"
CHARTEX_URI = "http://schemas.microsoft.com/office/drawing/2014/chartex"
RT_CHARTEX = "http://schemas.microsoft.com/office/2014/relationships/chartEx"
RT_PACKAGE = "http://schemas.openxmlformats.org/officeDocument/2006/relationships/package"
RT_CHARTSHEET = "http://schemas.openxmlformats.org/officeDocument/2006/relationships/chartsheet"
RT_DRAWING = "http://schemas.openxmlformats.org/officeDocument/2006/relationships/drawing"
CT_XLSX = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"

EMU_PER_PX = 9525
EMU_PER_PT = 12700
SLIDE_W, SLIDE_H = Inches(13.333), Inches(7.5)
MAX_EMBED_BYTES = 3 * 1024 * 1024  # each chart embeds its own copy for "Edit Data", so keep it small


@dataclass
class WorkbookObject:
    sheet: str
    kind: str  # "chart", "chartex" or "picture"
    part: str  # path of the chart / image inside the workbook
    width: int  # EMU, as placed on the sheet
    height: int
    order: Tuple[int, int]  # (row, col) of the top-left corner, for reading order
    name: str = ""
    title: str = ""


@dataclass
class ConversionReport:
    sheets: List[str] = field(default_factory=list)
    charts: int = 0
    chartex: int = 0
    pictures: int = 0
    tables: int = 0
    table_slides: int = 0
    tables_cut: List[str] = field(default_factory=list)
    skipped: List[str] = field(default_factory=list)
    duplicates_skipped: List[str] = field(default_factory=list)
    empty_skipped: List[str] = field(default_factory=list)
    data_embedded: bool = False

    def as_dict(self) -> dict:
        return {
            "sheets": self.sheets,
            "charts": self.charts,
            "new_chart_types": self.chartex,
            "pictures": self.pictures,
            "tables": self.tables,
            "table_slides": self.table_slides,
            "tables_cut": self.tables_cut,
            "skipped": self.skipped,
            "duplicates_skipped": self.duplicates_skipped,
            "empty_charts_skipped": self.empty_skipped,
            "edit_data_available": self.data_embedded,
        }


class _Workbook:
    """Read-only view of an .xlsx package."""

    def __init__(self, data: bytes):
        self.data = data
        self.zip = zipfile.ZipFile(io.BytesIO(data))
        self.names = set(self.zip.namelist())
        ct = etree.fromstring(self.zip.read("[Content_Types].xml"))
        self.ct_override = {o.get("PartName").lstrip("/"): o.get("ContentType") for o in ct.findall("ct:Override", NS)}
        self.ct_default = {d.get("Extension").lower(): d.get("ContentType") for d in ct.findall("ct:Default", NS)}
        book = etree.fromstring(self.zip.read("xl/workbook.xml"))
        self.defined_names = {
            d.get("name"): (d.text or "").strip()
            for d in book.findall("main:definedNames/main:definedName", NS)
            if d.get("localSheetId") is None
        }

    def xml(self, path: str):
        return etree.fromstring(self.zip.read(path))

    def content_type(self, path: str) -> str:
        return self.ct_override.get(path) or self.ct_default.get(posixpath.splitext(path)[1][1:].lower(), "application/octet-stream")

    def rels(self, path: str) -> Dict[str, Tuple[str, str, bool]]:
        """rId -> (type, absolute target, external) for a part."""
        rels_path = posixpath.join(posixpath.dirname(path), "_rels", posixpath.basename(path) + ".rels")
        if rels_path not in self.names:
            return {}
        out = {}
        for r in self.xml(rels_path).findall("rel:Relationship", NS):
            external = r.get("TargetMode") == "External"
            target = r.get("Target")
            if not external:
                target = target.lstrip("/") if target.startswith("/") else posixpath.normpath(posixpath.join(posixpath.dirname(path), target))
            out[r.get("Id")] = (r.get("Type"), target, external)
        return out


def _text(el) -> str:
    return "".join(t.text or "" for t in el.iter("{%s}t" % NS["a"])).strip() if el is not None else ""


def _chart_title(wb: _Workbook, obj: WorkbookObject) -> str:
    root = wb.xml(obj.part)
    if obj.kind == "chart":
        if root.find(".//c:autoTitleDeleted[@val='1']", NS) is not None:
            return ""
        title = root.find(".//c:chart/c:title", NS)
        text = _text(title)
        if not text and title is not None:  # title taken from a cell: use its stored value
            text = " ".join(v.text or "" for v in title.iterfind(".//c:v", NS)).strip()
        if not text and title is not None:
            # An automatic title: Excel shows the series name when the chart has one series.
            series = root.findall(".//c:plotArea/*/c:ser", NS)
            if len(series) == 1:
                text = " ".join(v.text or "" for v in series[0].iterfind("c:tx//c:v", NS)).strip()
        return text
    return _text(root.find(".//cx:chart/cx:title", NS))


def _sheet_geometry(wb: _Workbook, sheet_path: str):
    """Column widths (EMU) and row heights (EMU) of a worksheet, for sizing cell-anchored objects."""
    if sheet_path not in wb.names or "worksheets/" not in sheet_path:
        return (lambda c: 64 * EMU_PER_PX), (lambda r: 20 * EMU_PER_PX)
    root = wb.xml(sheet_path)
    fmt = root.find("main:sheetFormatPr", NS)
    default_w = float(fmt.get("defaultColWidth") or 0) if fmt is not None else 0
    base_w = float(fmt.get("baseColWidth") or 8) if fmt is not None else 8
    default_w_px = int(default_w * 7 + 5) if default_w else int(base_w * 7 + 12)
    default_h_pt = float(fmt.get("defaultRowHeight") or 15) if fmt is not None else 15
    widths: Dict[int, int] = {}
    for col in root.findall("main:cols/main:col", NS):
        w = float(col.get("width") or 0)
        hidden = col.get("hidden") in ("1", "true")
        for c in range(int(col.get("min")), int(col.get("max")) + 1):
            widths[c - 1] = 0 if hidden else int(w * 7 + 5) * EMU_PER_PX
    heights: Dict[int, int] = {}
    for row in root.iterfind("main:sheetData/main:row", NS):
        if row.get("ht"):
            heights[int(row.get("r")) - 1] = int(float(row.get("ht")) * EMU_PER_PT)
    return (lambda c: widths.get(c, default_w_px * EMU_PER_PX)), (lambda r: heights.get(r, int(default_h_pt * EMU_PER_PT)))


def _anchor_size(anchor, col_w, row_h) -> Tuple[int, int, Tuple[int, int]]:
    tag = etree.QName(anchor).localname
    frm = anchor.find("xdr:from", NS)
    order = (0, 0)
    if frm is not None:
        fc, fr = int(frm.findtext("xdr:col", "0", NS)), int(frm.findtext("xdr:row", "0", NS))
        order = (fr, fc)
    if tag == "twoCellAnchor":
        to = anchor.find("xdr:to", NS)
        fc, fco = int(frm.findtext("xdr:col", "0", NS)), int(frm.findtext("xdr:colOff", "0", NS))
        fr, fro = int(frm.findtext("xdr:row", "0", NS)), int(frm.findtext("xdr:rowOff", "0", NS))
        tc, tco = int(to.findtext("xdr:col", "0", NS)), int(to.findtext("xdr:colOff", "0", NS))
        tr, tro = int(to.findtext("xdr:row", "0", NS)), int(to.findtext("xdr:rowOff", "0", NS))
        w = sum(col_w(c) for c in range(fc, tc)) - fco + tco
        h = sum(row_h(r) for r in range(fr, tr)) - fro + tro
        return max(w, 1), max(h, 1), order
    ext = anchor.find("xdr:ext", NS)
    if ext is not None:
        return int(ext.get("cx")), int(ext.get("cy")), order
    return 16 * 64 * EMU_PER_PX, 20 * 20 * EMU_PER_PX, order


def _objects_in(node, drawing_rels) -> List[Tuple[str, str, str]]:
    """(kind, part path, name) for every chart/picture under a drawing node, groups flattened."""
    found = []
    for el in node.iter():
        if not isinstance(el.tag, str):
            continue
        local = etree.QName(el).localname
        if local == "graphicData":
            uri = el.get("uri")
            child = el.find("c:chart", NS) if uri == CHART_URI else el.find("cx:chart", NS) if uri == CHARTEX_URI else None
            if child is not None:
                rel = drawing_rels.get(child.get("{%s}id" % R_NS))
                if rel:
                    frame = el.getparent().getparent()
                    cnv = frame.find(".//xdr:cNvPr", NS)
                    found.append(("chart" if uri == CHART_URI else "chartex", rel[1], cnv.get("name", "") if cnv is not None else ""))
        elif local == "pic" and etree.QName(el).namespace == NS["xdr"]:
            blip = el.find(".//a:blip", NS)
            rid = blip.get("{%s}embed" % R_NS) if blip is not None else None
            rel = drawing_rels.get(rid) if rid else None
            if rel and not rel[2]:
                cnv = el.find(".//xdr:cNvPr", NS)
                found.append(("picture", rel[1], cnv.get("name", "") if cnv is not None else ""))
    # An mc:AlternateContent (how Excel wraps chartEx) holds the object twice: keep the first per part.
    seen, unique = set(), []
    for item in found:
        if item[1] not in seen:
            seen.add(item[1])
            unique.append(item)
    return unique


def read_workbook_objects(wb: _Workbook, report: ConversionReport) -> List[WorkbookObject]:
    book = wb.xml("xl/workbook.xml")
    book_rels = wb.rels("xl/workbook.xml")
    objects: List[WorkbookObject] = []
    for sheet in book.findall("main:sheets/main:sheet", NS):
        name = sheet.get("name")
        rel = book_rels.get(sheet.get("{%s}id" % R_NS))
        if not rel or sheet.get("state") in ("hidden", "veryHidden"):
            continue
        sheet_path = rel[1]
        report.sheets.append(name)
        col_w, row_h = _sheet_geometry(wb, sheet_path)
        for d_type, d_path, d_ext in wb.rels(sheet_path).values():
            if d_type != RT_DRAWING or d_ext or d_path not in wb.names:
                continue
            drawing = wb.xml(d_path)
            d_rels = wb.rels(d_path)
            for anchor in drawing:
                if not isinstance(anchor.tag, str) or etree.QName(anchor).localname not in ("twoCellAnchor", "oneCellAnchor", "absoluteAnchor"):
                    continue
                w, h, order = _anchor_size(anchor, col_w, row_h)
                if rel[0] == RT_CHARTSHEET:
                    w, h = SLIDE_W, SLIDE_H
                for kind, part, obj_name in _objects_in(anchor, d_rels):
                    if part not in wb.names:
                        report.skipped.append(f"{name}: {obj_name or part} (missing part)")
                        continue
                    objects.append(WorkbookObject(name, kind, part, w, h, order, obj_name))
    return objects


class _Copier:
    """Copies workbook parts (and everything they reference) into the presentation package."""

    def __init__(self, wb: _Workbook, package):
        self.wb = wb
        self.package = package
        self.copied: Dict[str, Part] = {}
        self.counters: Dict[str, int] = {}
        self.embedded: Optional[Part] = None

    def _new_name(self, src: str) -> PackURI:
        folder = "ppt/charts" if "/charts/" in src else "ppt/media" if "/media/" in src else "ppt/drawings" if "/drawings/" in src else "ppt/embeddings"
        stem, ext = posixpath.splitext(posixpath.basename(src))
        stem = re.sub(r"\d+$", "", stem) or "part"
        existing = {str(p.partname) for p in self.package.iter_parts()}
        n = self.counters.get(folder + stem, 0)
        while True:
            n += 1
            name = f"/{folder}/{stem}{n}{ext}"
            if name not in existing:
                self.counters[folder + stem] = n
                return PackURI(name)

    def copy(self, src: str) -> Part:
        if src in self.copied:
            return self.copied[src]
        blob = self.wb.zip.read(src)
        part = Part(self._new_name(src), self.wb.content_type(src), self.package, blob)
        self.copied[src] = part
        rid_map = {}
        for rid, (rtype, target, external) in self.wb.rels(src).items():
            if external:
                rid_map[rid] = part.rels.get_or_add_ext_rel(rtype, target)
            elif target in self.wb.names:
                rid_map[rid] = part.relate_to(self.copy(target), rtype)
        if rid_map and blob.lstrip().startswith(b"<"):
            root = etree.fromstring(blob)
            for el in root.iter():
                for attr, value in list(el.attrib.items()):
                    if attr.startswith("{%s}" % R_NS) and value in rid_map:
                        el.set(attr, rid_map[value])
            part._blob = etree.tostring(root, xml_declaration=True, encoding="UTF-8", standalone=True)
        return part

    def workbook_part(self) -> Part:
        """A fresh embedded copy of the workbook: PowerPoint gives every chart its own."""
        self.embed_count = getattr(self, "embed_count", 0) + 1
        return Part(PackURI(f"/ppt/embeddings/Microsoft_Excel_Worksheet{self.embed_count}.xlsx"), CT_XLSX, self.package, self.wb.data)

    def attach_chart_data(self, chart_part: Part, chartex: bool = False) -> None:
        """Point a chart at an embedded copy of the workbook so PowerPoint's "Edit Data" opens it."""
        root = etree.fromstring(chart_part.blob)
        if chartex:
            data = root.find("cx:chartData", NS)
            if data is None or data.find("cx:externalData", NS) is not None:
                return
            rid = chart_part.relate_to(self.workbook_part(), RT_PACKAGE)
            ext = etree.Element("{%s}externalData" % NS["cx"], nsmap={"cx": NS["cx"], "r": R_NS})
            ext.set("{%s}id" % R_NS, rid)
            ext.set("{%s}autoUpdate" % NS["cx"], "0")
            data.insert(0, ext)
            chart_part._blob = etree.tostring(root, xml_declaration=True, encoding="UTF-8", standalone=True)
            return
        if root.find("c:externalData", NS) is not None:
            return
        rid = chart_part.relate_to(self.workbook_part(), RT_PACKAGE)
        ext = etree.Element("{%s}externalData" % NS["c"], nsmap={"c": NS["c"], "r": R_NS})
        ext.set("{%s}id" % R_NS, rid)
        etree.SubElement(ext, "{%s}autoUpdate" % NS["c"]).set("val", "0")
        # Schema order: ... c:chart, c:spPr, c:txPr, c:externalData, c:printSettings, c:userShapes
        anchor = None
        for tag in ("txPr", "spPr", "chart"):
            anchor = root.find("c:%s" % tag, NS)
            if anchor is not None:
                break
        if anchor is not None:
            anchor.addnext(ext)
        else:
            root.append(ext)
        chart_part._blob = etree.tostring(root, xml_declaration=True, encoding="UTF-8", standalone=True)


def _parse_ref(ref: str) -> Optional[Tuple[str, str]]:
    """'Sheet 1'!$B$2:$B$7 -> ("Sheet 1", "B2:B7"). None for anything more complex."""
    ref = (ref or "").strip().lstrip("(").rstrip(")")
    if "!" not in ref or "," in ref:
        return None
    sheet, rng = ref.rsplit("!", 1)
    if sheet.startswith("'") and sheet.endswith("'"):
        sheet = sheet[1:-1].replace("''", "'")
    return sheet, rng.replace("$", "")


class _CellValues:
    """Cell values of the workbook (the last calculated results, not formulas), loaded on first use."""

    def __init__(self, data: bytes):
        self.data = data
        self._wb = None

    def workbook(self):
        if self._wb is None:
            import openpyxl

            self._wb = openpyxl.load_workbook(io.BytesIO(self.data), data_only=True)
        return self._wb

    def grid(self, ref: str) -> Optional[List[list]]:
        """Values of a range as rows of cells."""
        parsed = _parse_ref(ref)
        if not parsed:
            return None
        if self._wb is None:
            import openpyxl

            self._wb = openpyxl.load_workbook(io.BytesIO(self.data), data_only=True)
        sheet, rng = parsed
        if sheet not in self._wb.sheetnames:
            return None
        cells = self._wb[sheet][rng]
        if not isinstance(cells, tuple):
            return [[cells.value]]
        if cells and not isinstance(cells[0], tuple):  # a single row or column comes back flat
            return [[c.value] for c in cells] if ":" in rng and rng.split(":")[0].rstrip("0123456789") == rng.split(":")[1].rstrip("0123456789") else [[c.value for c in cells]]
        return [[c.value for c in row] for row in cells]

    def get(self, ref: str) -> Optional[list]:
        parsed = _parse_ref(ref)
        if not parsed:
            return None
        if self._wb is None:
            import openpyxl

            self._wb = openpyxl.load_workbook(io.BytesIO(self.data), data_only=True)
        sheet, rng = parsed
        if sheet not in self._wb.sheetnames:
            return None
        cells = self._wb[sheet][rng]
        if not isinstance(cells, tuple):
            return [cells.value]
        flat = []
        for row in cells:
            flat.extend(c.value for c in (row if isinstance(row, tuple) else (row,)))
        return flat


def _is_number(v) -> bool:
    try:
        float(str(v).replace(",", ""))
        return True
    except ValueError:
        return False


def _fill_missing_caches(root, values: _CellValues) -> bool:
    """
    PowerPoint draws a chart from the values stored in it. Files written by tools other than
    Excel often store only the cell references, which would show an empty chart, so fill the
    values in from the cells. Charts that already carry values are left as they are.
    """
    from datetime import date, datetime

    c = "{%s}" % NS["c"]
    changed = False
    for ref in list(root.iter(c + "numRef", c + "strRef")):
        f = ref.find(c + "f")
        is_num = ref.tag == c + "numRef"
        cache = ref.find(c + ("numCache" if is_num else "strCache"))
        if f is None or (cache is not None and cache.find(c + "pt") is not None):
            continue
        cells = values.get(f.text)
        if cells is None:
            continue
        if is_num and ref.getparent() is not None and ref.getparent().tag == c + "cat" and any(
            isinstance(v, str) and v.strip() and not _is_number(v) for v in cells
        ):
            # Text categories (e.g. month names) written as a number reference: store them as text.
            ref.tag = c + "strRef"
            is_num = False
            cache = ref.find(c + "numCache")
        if cache is not None:
            ref.remove(cache)
        cache = etree.Element(c + ("numCache" if is_num else "strCache"))
        if is_num:
            etree.SubElement(cache, c + "formatCode").text = "General"
        etree.SubElement(cache, c + "ptCount").set("val", str(len(cells)))
        for i, v in enumerate(cells):
            if v is None or v == "":
                continue
            if is_num:
                if isinstance(v, (datetime, date)):
                    from openpyxl.utils.datetime import to_excel

                    v = to_excel(v)
                if isinstance(v, bool) or not isinstance(v, (int, float)):
                    try:
                        v = float(str(v).replace(",", ""))
                    except ValueError:
                        continue
            pt = etree.SubElement(cache, c + "pt")
            pt.set("idx", str(i))
            etree.SubElement(pt, c + "v").text = repr(v) if isinstance(v, float) else str(v)
        f.addnext(cache)
        changed = True
    return changed


def _fill_chartex_data(root, wb: "_Workbook", values: _CellValues) -> bool:
    """
    Excel's newer chart types (treemap, sunburst, waterfall, histogram, box & whisker, funnel)
    point at their data through hidden workbook names (_xlchart.v1.N) and store no values, which
    PowerPoint can't resolve. Replace each name with its range and store the values in the chart.
    Hierarchical categories (several columns) become one level per column, leaf level first.
    """
    cx = "{%s}" % NS["cx"]
    changed = False
    for f in root.iter(cx + "f"):
        name = (f.text or "").strip()
        if name in wb.defined_names:
            f.text = wb.defined_names[name]
            changed = True
    for dim in list(root.iter(cx + "strDim", cx + "numDim")):
        f = dim.find(cx + "f")
        if f is None or dim.find(cx + "lvl") is not None:
            continue
        rows = values.grid(f.text or "")
        if not rows:
            continue
        is_num = dim.tag == cx + "numDim"
        columns = list(zip(*rows)) if rows else []
        anchor = f
        for col in (columns if is_num else list(reversed(columns))):
            lvl = etree.Element(cx + "lvl")
            lvl.set("ptCount", str(len(col)))
            if is_num:
                lvl.set("formatCode", "General")
            for i, v in enumerate(col):
                if v is None or v == "":
                    continue
                if is_num:
                    try:
                        v = float(str(v).replace(",", ""))
                    except ValueError:
                        continue
                    text = repr(v) if not float(v).is_integer() else str(int(v))
                else:
                    text = str(v)
                pt = etree.SubElement(lvl, cx + "pt")
                pt.set("idx", str(i))
                pt.text = text
            anchor.addnext(lvl)
            anchor = lvl
        changed = True
    return changed


def _fit(w: int, h: int, box_w: int, box_h: int) -> Tuple[int, int]:
    scale = min(box_w / w, box_h / h)
    return int(w * scale), int(h * scale)


def _graphic_frame_xml(shape_id: int, name: str, x: int, y: int, cx: int, cy: int, rid: str, chartex: bool) -> str:
    uri = CHARTEX_URI if chartex else CHART_URI
    inner = (f'<cx:chart xmlns:cx="{NS["cx"]}" r:id="{rid}"/>' if chartex else f'<c:chart xmlns:c="{NS["c"]}" r:id="{rid}"/>')
    frame = (
        f'<p:graphicFrame xmlns:p="{NS["p"]}" xmlns:a="{NS["a"]}" xmlns:r="{R_NS}">'
        f'<p:nvGraphicFramePr><p:cNvPr id="{shape_id}" name="{_xml_attr(name)}"/><p:cNvGraphicFramePr/><p:nvPr/></p:nvGraphicFramePr>'
        f'<p:xfrm><a:off x="{x}" y="{y}"/><a:ext cx="{cx}" cy="{cy}"/></p:xfrm>'
        f'<a:graphic><a:graphicData uri="{uri}">{inner}</a:graphicData></a:graphic></p:graphicFrame>'
    )
    if not chartex:
        return frame
    # PowerPoint 2016+ reads the chartEx; older versions show the fallback text instead.
    fallback = (
        f'<p:sp xmlns:p="{NS["p"]}" xmlns:a="{NS["a"]}"><p:nvSpPr><p:cNvPr id="{shape_id}" name="{_xml_attr(name)}"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr>'
        f'<p:spPr><a:xfrm><a:off x="{x}" y="{y}"/><a:ext cx="{cx}" cy="{cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></p:spPr>'
        f'<p:txBody><a:bodyPr anchor="ctr"/><a:lstStyle/><a:p><a:pPr algn="ctr"/><a:r><a:rPr lang="en-US"/>'
        f'<a:t>This chart needs PowerPoint 2016 or later.</a:t></a:r></a:p></p:txBody></p:sp>'
    )
    return (
        f'<mc:AlternateContent xmlns:mc="{NS["mc"]}" xmlns:cx1="http://schemas.microsoft.com/office/drawing/2015/9/8/chartex">'
        f'<mc:Choice Requires="cx1">{frame}</mc:Choice><mc:Fallback>{fallback}</mc:Fallback></mc:AlternateContent>'
    )


def _xml_attr(s: str) -> str:
    return (s or "").replace("&", "&amp;").replace('"', "&quot;").replace("<", "&lt;").replace(">", "&gt;")


def _is_empty_chart(wb: _Workbook, obj: WorkbookObject) -> bool:
    """A chart frame with no data series (an empty placeholder left on the sheet)."""
    if obj.kind == "picture":
        return False
    root = wb.xml(obj.part)
    if obj.kind == "chart":
        return root.find(".//c:ser", NS) is None
    return root.find(".//cx:series", NS) is None


def _signature(wb: _Workbook, obj: WorkbookObject) -> str:
    """
    Identity of what a viewer sees. Pictures: the image bytes. Charts: the whole chart
    definition (type, grouping, style, titles, plotted values) with only the cell addresses and
    Excel's internal IDs removed, so a chart copied to another tab that plots the same numbers
    matches, while a stacked and a clustered version of the same data do not.
    """
    blob = wb.zip.read(obj.part)
    if obj.kind == "picture":
        return "pic:" + hashlib.sha256(blob).hexdigest()
    root = etree.fromstring(blob)
    for el in list(root.iter()):
        if not isinstance(el.tag, str):
            continue
        local = etree.QName(el).localname
        if local in ("f", "extLst", "externalData") and el.getparent() is not None:
            el.getparent().remove(el)
    return f"{obj.kind}:" + hashlib.sha256(etree.tostring(root, method="c14n")).hexdigest()


FOOTER_H = Inches(0.3)
TABLE_ROWS_PER_SLIDE = 15
TABLE_COLS_PER_SLIDE = 10
TABLE_MAX_ROWS = 200


def _add_heading(slide, text: str, margin: int, width: int, title_h: int) -> None:
    tb = slide.shapes.add_textbox(margin, Inches(0.25), width, title_h)
    tb.text_frame.word_wrap = True
    tb.text_frame.text = text
    run = tb.text_frame.paragraphs[0].runs[0]
    run.font.size = Pt(24 if len(text) <= 60 else 20)
    run.font.bold = True


def _add_table_slides(prs, blank, table: SheetTable, heading: str, margin: int, title_h: int) -> int:
    """A table as native PowerPoint table slides: long tables continue with the header repeated,
    wide tables are split with the first column repeated. Returns the number of slides added."""
    header, body = table.rows[0], table.rows[1:]
    n_cols = len(header)
    col_groups = [list(range(n_cols))]
    if n_cols > TABLE_COLS_PER_SLIDE:
        step = TABLE_COLS_PER_SLIDE - 1
        col_groups = [[0] + list(range(i, min(i + step, n_cols))) for i in range(1, n_cols, step)]
    row_pages = [body[i:i + TABLE_ROWS_PER_SLIDE] for i in range(0, len(body), TABLE_ROWS_PER_SLIDE)] or [[]]
    pages = [(rows, cols) for cols in col_groups for rows in row_pages]
    box_w = prs.slide_width - 2 * margin
    box_h = prs.slide_height - title_h - 2 * margin - FOOTER_H
    added = 0
    for n, (rows, cols) in enumerate(pages, start=1):
        slide = prs.slides.add_slide(blank)
        _add_heading(slide, heading + (f" ({n} of {len(pages)})" if len(pages) > 1 else ""), margin, box_w, title_h)
        grid = [header] + rows
        # Larger text for smaller tables; the whole table always fits the slide.
        size = 18 if len(grid) <= 8 else 16 if len(grid) <= 12 else 14
        if len(cols) > 6:
            size -= 2
        if len(cols) > 8:
            size -= 2
        font = Pt(size)
        row_h = min(int(font * 2.0), int(box_h / len(grid)))
        height = row_h * len(grid)
        # Column widths follow the longest text in each column; narrow tables are not stretched.
        char_w = int(font * 0.62)
        lengths = [max(4, min(40, max(len(r[c].text) for r in grid))) for c in cols]
        widths = [max(Inches(0.8), l * char_w + Inches(0.3)) for l in lengths]
        if sum(widths) > box_w:
            scale = box_w / sum(widths)
            widths = [int(w * scale) for w in widths]
        table_w = sum(widths)
        left = margin + (box_w - table_w) // 2
        shape = slide.shapes.add_table(len(grid), len(cols), left, title_h + margin, table_w, height)
        tbl = shape.table
        for j, w in enumerate(widths):
            tbl.columns[j].width = w
        for i, row in enumerate(grid):
            tbl.rows[i].height = row_h
            for j, c in enumerate(cols):
                src = row[c]
                cell = tbl.cell(i, j)
                cell.text = src.text
                cell.margin_top = cell.margin_bottom = Inches(0.03)
                para = cell.text_frame.paragraphs[0]
                para.alignment = PP_ALIGN.RIGHT if src.numeric and j > 0 else PP_ALIGN.LEFT
                for run in para.runs:
                    run.font.size = font
                    run.font.bold = i == 0 or src.bold
        added += 1
    if table.total_rows > len(body):
        note = slide.shapes.add_textbox(margin, prs.slide_height - margin - FOOTER_H, box_w, Inches(0.3))
        note.text_frame.text = f"Showing the first {len(body)} of {table.total_rows} rows."
        note.text_frame.paragraphs[0].runs[0].font.size = Pt(11)
        note.text_frame.paragraphs[0].runs[0].font.color.rgb = RGBColor(0x59, 0x59, 0x59)
    return added


RT_THEME = "http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme"


def _use_workbook_theme(prs, wb: "_Workbook") -> bool:
    """
    Charts mostly say "accent colour 2" or "body font" rather than a fixed colour or font, and
    that is looked up in the document's theme. Give the presentation the workbook's colour and
    font scheme so every chart is painted exactly as in Excel (slide styling uses fixed colours).
    """
    theme_path = next((t for (rt, t, ext) in wb.rels("xl/workbook.xml").values() if rt == RT_THEME and not ext), None)
    if not theme_path or theme_path not in wb.names:
        return False
    src = wb.xml(theme_path)
    part = prs.slide_master.part.part_related_by(RT.THEME)
    dst = etree.fromstring(part.blob)
    changed = False
    for tag in ("clrScheme", "fontScheme"):
        new = src.find(".//a:themeElements/a:%s" % tag, NS)
        old = dst.find(".//a:themeElements/a:%s" % tag, NS)
        if new is not None and old is not None:
            old.getparent().replace(old, copy.deepcopy(new))
            changed = True
    if changed:
        part._blob = etree.tostring(dst, xml_declaration=True, encoding="UTF-8", standalone=True)
    return changed


def convert_workbook_objects(
    xlsx_bytes: bytes, title: str = "", embed_data: bool = True, keep_duplicates: bool = False,
    include_tables: bool = True, branding: Optional["Branding"] = None,
) -> Tuple[Optional[bytes], dict]:
    """
    Build a presentation with a section slide per tab and one slide per chart or picture.
    A chart or picture that looks the same as an earlier one (e.g. a logo on every tab, or a
    chart copied to several tabs) appears once unless keep_duplicates is set.
    Returns (pptx bytes, report). pptx bytes is None when the workbook has no charts or pictures.
    """
    wb = _Workbook(xlsx_bytes)
    report = ConversionReport()
    objects = read_workbook_objects(wb, report)
    kept = []
    for o in objects:
        try:
            empty = _is_empty_chart(wb, o)
        except Exception:
            empty = False
        if empty:
            report.empty_skipped.append(f"{o.sheet}: {o.name or o.kind}")
        else:
            kept.append(o)
    objects = kept
    if not keep_duplicates:
        seen: Dict[str, WorkbookObject] = {}
        unique = []
        for o in sorted(objects, key=lambda o: (report.sheets.index(o.sheet), o.order)):
            try:
                sig = _signature(wb, o)
            except Exception:
                sig = o.part
            if sig in seen:
                first = seen[sig]
                report.duplicates_skipped.append(f"{o.sheet}: {o.name or o.kind} (same as {first.sheet}: {first.name or first.kind})")
                continue
            seen[sig] = o
            unique.append(o)
        objects = unique

    cell_values = _CellValues(xlsx_bytes)
    tables: List[SheetTable] = []
    if include_tables:
        try:
            book = cell_values.workbook()
            for sheet in report.sheets:
                if sheet in book.sheetnames and hasattr(book[sheet], "iter_rows"):
                    for t in find_tables(book[sheet], sheet, max_rows=TABLE_MAX_ROWS):
                        tables.append(t)
                        if t.total_rows > len(t.rows) - 1:
                            report.tables_cut.append(f"{sheet}: first {len(t.rows) - 1} of {t.total_rows} rows")
        except Exception as e:
            report.skipped.append(f"tables ({type(e).__name__}: {e})")
    if not objects and not tables:
        return None, report.as_dict()

    prs = Presentation()
    prs.slide_width, prs.slide_height = SLIDE_W, SLIDE_H
    blank = prs.slide_layouts[6]
    title_layout = prs.slide_layouts[0]
    copier = _Copier(wb, prs.part.package)
    try:
        _use_workbook_theme(prs, wb)
    except Exception as e:  # the charts still work, with the presentation's default palette
        report.skipped.append(f"workbook theme ({type(e).__name__})")
    embed = embed_data and len(xlsx_bytes) <= MAX_EMBED_BYTES

    cover_slides = set()
    if title:
        s = prs.slides.add_slide(title_layout)
        cover_slides.add(s.slide_id)
        s.shapes.title.text = title
        n_charts = sum(1 for o in objects if o.kind != "picture")
        n_pics = len(objects) - n_charts
        parts = [f"{n} {w}{'s' if n != 1 else ''}" for n, w in ((len(tables), "table"), (n_charts, "chart"), (n_pics, "picture")) if n]
        s.placeholders[1].text = f"{', '.join(parts)} from {len({o.sheet for o in objects} | {t.sheet for t in tables})} tabs"

    for o in objects:
        if o.kind != "picture":
            try:
                o.title = _chart_title(wb, o)
            except Exception:
                o.title = ""
    # Every slide heading must be unique: a title used on several tabs gets the tab name,
    # and one used more than once on the same tab gets a number.
    title_tabs: Dict[str, set] = {}
    for o in objects:
        if o.title:
            title_tabs.setdefault(o.title, set()).add(o.sheet)
    same_tab: Dict[Tuple[str, str], int] = {}
    for o in objects:
        if o.title:
            same_tab[(o.title, o.sheet)] = same_tab.get((o.title, o.sheet), 0) + 1
    seen_tab: Dict[Tuple[str, str], int] = {}

    margin, title_h = Inches(0.4), Inches(0.8)
    box_w, box_h = SLIDE_W - 2 * margin, SLIDE_H - title_h - 2 * margin - FOOTER_H
    by_sheet: Dict[str, list] = {}
    for o in objects:
        by_sheet.setdefault(o.sheet, []).append(o)
    for t in tables:
        by_sheet.setdefault(t.sheet, []).append(t)

    for sheet in report.sheets:
        # Tables first, then charts and pictures, each in reading order on the sheet.
        items = sorted(by_sheet.get(sheet, []), key=lambda o: (not isinstance(o, SheetTable), o.order))
        if not items:
            continue
        if len(by_sheet) > 1:
            sec = prs.slides.add_slide(title_layout)
            cover_slides.add(sec.slide_id)
            sec.shapes.title.text = sheet
            n_t = sum(1 for i in items if isinstance(i, SheetTable))
            n_o = len(items) - n_t
            sec.placeholders[1].text = ", ".join(
                f"{n} {w}{'s' if n != 1 else ''}" for n, w in ((n_t, "table"), (n_o, "chart" if all(getattr(i, "kind", "") != "picture" for i in items) else "chart or picture")) if n
            )
        n = 0
        for obj in items:
            if isinstance(obj, SheetTable):
                heading = obj.title or f"{sheet} — table"
                if obj.title and obj.title != sheet and sum(1 for t in tables if t.title == obj.title) > 1:
                    heading += f" — {sheet}"
                try:
                    report.table_slides += _add_table_slides(prs, blank, obj, heading, margin, title_h)
                    report.tables += 1
                except Exception as e:
                    report.skipped.append(f"{sheet}: table ({type(e).__name__}: {e})")
                continue
            n += 1
            try:
                slide = prs.slides.add_slide(blank)
                if obj.title:
                    heading = obj.title
                    if len(title_tabs[obj.title]) > 1:
                        heading += f" — {sheet}"
                    key = (obj.title, sheet)
                    if same_tab[key] > 1:
                        seen_tab[key] = seen_tab.get(key, 0) + 1
                        heading += f" ({seen_tab[key]} of {same_tab[key]})"
                else:
                    heading = f"{sheet} — {'Picture' if obj.kind == 'picture' else 'Chart'} {n}"
                _add_heading(slide, heading, margin, box_w, title_h)

                cx, cy = _fit(obj.width, obj.height, box_w, box_h)
                x = margin + (box_w - cx) // 2
                y = title_h + margin + (box_h - cy) // 2
                if obj.kind == "picture":
                    slide.shapes.add_picture(io.BytesIO(wb.zip.read(obj.part)), Emu(x), Emu(y), Emu(cx), Emu(cy))
                    report.pictures += 1
                    continue
                part = copier.copy(obj.part)
                root = etree.fromstring(part.blob)
                if obj.kind == "chart":
                    _fill_missing_caches(root, cell_values)
                    for ps in root.findall("c:printSettings", NS):  # Excel-only; PowerPoint charts have none
                        root.remove(ps)
                else:
                    _fill_chartex_data(root, wb, cell_values)
                part._blob = etree.tostring(root, xml_declaration=True, encoding="UTF-8", standalone=True)
                if embed:
                    copier.attach_chart_data(part, chartex=obj.kind == "chartex")
                    report.data_embedded = True
                rid = slide.part.relate_to(part, RT.CHART if obj.kind == "chart" else RT_CHARTEX)
                shape_id = max((sp.shape_id for sp in slide.shapes), default=1) + 1
                frame = parse_xml(_graphic_frame_xml(shape_id, obj.name or heading, x, y, cx, cy, rid, obj.kind == "chartex"))
                slide.shapes._spTree.append(frame)
                if obj.kind == "chart":
                    report.charts += 1
                else:
                    report.chartex += 1
            except Exception as e:  # one bad object must not lose the rest of the deck
                report.skipped.append(f"{sheet}: {obj.name or obj.part} ({type(e).__name__}: {e})")

    apply_branding(prs, branding or Branding(), cover_slides)
    out = io.BytesIO()
    prs.save(out)
    return out.getvalue(), report.as_dict()


# ---------------------------------------------------------------- branding

THEMES = {
    # background, text, muted text, accent, table band
    "light": ("FFFFFF", "1F2937", "6B7280", "2563EB", "F3F4F6"),
    "dark": ("0F172A", "F1F5F9", "94A3B8", "38BDF8", "1E293B"),
    "corporate": ("FFFFFF", "0F172A", "64748B", "0B3D91", "EEF2F7"),
    "warm": ("FFFBF5", "3B2A1A", "8B7355", "C2410C", "FDF1E4"),
    "green": ("F8FBF8", "1B2E1F", "5B7560", "15803D", "E8F3EA"),
}
FONTS = ["Calibri", "Arial", "Segoe UI", "Verdana", "Tahoma", "Trebuchet MS", "Georgia", "Times New Roman", "Garamond", "Aptos"]


@dataclass
class Branding:
    theme: str = "light"
    brand_color: Optional[str] = None  # hex such as "#0B3D91"
    font: str = "Calibri"
    company: str = ""
    logo: Optional[bytes] = None  # PNG/JPEG bytes, already validated

    def colors(self):
        bg, text, muted, accent, band = THEMES.get(self.theme, THEMES["light"])
        if self.brand_color and re.fullmatch(r"#?[0-9A-Fa-f]{6}", self.brand_color.strip()):
            accent = self.brand_color.strip().lstrip("#").upper()
        return [RGBColor.from_string(c) for c in (bg, text, muted, accent, band)]


def _on_color(rgb: RGBColor) -> RGBColor:
    r, g, b = rgb[0], rgb[1], rgb[2]
    return RGBColor(0x11, 0x18, 0x27) if (0.299 * r + 0.587 * g + 0.114 * b) > 170 else RGBColor(0xFF, 0xFF, 0xFF)


def _style_runs(frame, font: str, color: RGBColor, size=None, bold=None) -> None:
    for p in frame.paragraphs:
        for r in p.runs:
            r.font.name = font
            r.font.color.rgb = color
            if size is not None:
                r.font.size = size
            if bold is not None:
                r.font.bold = bold


def apply_branding(prs, brand: Branding, cover_slides: set) -> None:
    """Theme, brand colour, font, logo and footer on every slide. Charts keep their Excel look."""
    from pptx.enum.shapes import MSO_SHAPE

    bg, text, muted, accent, band = brand.colors()
    font = brand.font if brand.font in FONTS else "Calibri"
    on_accent = _on_color(accent)
    logo_size = None
    if brand.logo:
        from PIL import Image

        with Image.open(io.BytesIO(brand.logo)) as im:
            logo_size = im.size
    W, H = prs.slide_width, prs.slide_height
    total = len(prs.slides)
    for number, slide in enumerate(prs.slides, start=1):
        fill = slide.background.fill
        fill.solid()
        fill.fore_color.rgb = bg
        cover = slide.slide_id in cover_slides
        if cover:
            bar = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, 0, 0, Inches(0.35), H)
            bar.fill.solid()
            bar.fill.fore_color.rgb = accent
            bar.line.fill.background()
            for ph in slide.placeholders:
                idx = ph.placeholder_format.idx
                _style_runs(ph.text_frame, font, text if idx == 0 else muted, bold=True if idx == 0 else None)
            if logo_size:
                h = Inches(1.0)
                w = int(h * logo_size[0] / logo_size[1])
                if w > Inches(3):
                    w, h = Inches(3), int(Inches(3) * logo_size[1] / logo_size[0])
                slide.shapes.add_picture(io.BytesIO(brand.logo), W - w - Inches(0.6), Inches(0.5), w, h)
            continue
        logo_w = 0
        if logo_size:
            h = Inches(0.5)
            logo_w = min(int(h * logo_size[0] / logo_size[1]), Inches(2))
            h = int(logo_w * logo_size[1] / logo_size[0])
            slide.shapes.add_picture(io.BytesIO(brand.logo), W - logo_w - Inches(0.4), Inches(0.3), logo_w, h)
        for shape in list(slide.shapes):
            if shape.has_text_frame and shape.top == Inches(0.25):  # the slide heading
                if logo_w:
                    shape.width = W - Inches(0.8) - logo_w - Inches(0.3)
                _style_runs(shape.text_frame, font, text)
                line = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(0.4), Inches(1.0), Inches(1.2), Inches(0.06))
                line.fill.solid()
                line.fill.fore_color.rgb = accent
                line.line.fill.background()
            elif shape.has_text_frame:
                _style_runs(shape.text_frame, font, muted)
            elif shape.has_table:
                tbl = shape.table
                tbl.first_row = True
                tbl.horz_banding = False
                for i, row in enumerate(tbl.rows):
                    for cell in row.cells:
                        cell.fill.solid()
                        cell.fill.fore_color.rgb = accent if i == 0 else (band if i % 2 == 0 else bg)
                        _style_runs(cell.text_frame, font, on_accent if i == 0 else text)
        footer_y = H - Inches(0.35)
        if brand.company:
            fb = slide.shapes.add_textbox(Inches(0.4), footer_y, W // 2, Inches(0.3))
            fb.text_frame.text = brand.company
            _style_runs(fb.text_frame, font, muted, size=Pt(10))
        nb = slide.shapes.add_textbox(W - Inches(1.4), footer_y, Inches(1.0), Inches(0.3))
        nb.text_frame.text = f"{number} / {total}"
        nb.text_frame.paragraphs[0].alignment = PP_ALIGN.RIGHT
        _style_runs(nb.text_frame, font, muted, size=Pt(10))


def validate_logo(data: bytes, max_bytes: int = 2 * 1024 * 1024) -> bytes:
    """A logo upload as PNG bytes; raises ValueError for anything that isn't a normal image."""
    from PIL import Image

    if not data or len(data) > max_bytes:
        raise ValueError("The logo must be an image of 2 MB or less")
    try:
        with Image.open(io.BytesIO(data)) as im:
            if im.format not in ("PNG", "JPEG", "GIF", "BMP", "WEBP"):
                raise ValueError("The logo must be a PNG, JPG, GIF, BMP or WebP image")
            if im.width * im.height > 25_000_000:
                raise ValueError("The logo image is too large")
            im.load()
            out = io.BytesIO()
            (im.convert("RGBA") if im.mode not in ("RGB", "RGBA") else im).save(out, "PNG")
            return out.getvalue()
    except ValueError:
        raise
    except Exception:
        raise ValueError("The logo could not be read as an image")


def csv_to_xlsx(csv_bytes: bytes) -> bytes:
    """A CSV as a one-sheet workbook with typed values (numbers as numbers), for table slides."""
    import csv
    import openpyxl
    from openpyxl.styles import Font

    text = None
    for enc in ("utf-8-sig", "cp1252", "latin-1"):
        try:
            text = csv_bytes.decode(enc)
            break
        except UnicodeDecodeError:
            continue
    sample = text[:20000]
    try:
        dialect = csv.Sniffer().sniff(sample, delimiters=",;\t|")
    except csv.Error:
        dialect = csv.excel
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Data"
    for i, row in enumerate(csv.reader(io.StringIO(text), dialect)):
        out = []
        for v in row:
            v = v.strip()
            num = v.replace(",", "") if dialect.delimiter != "," else v
            try:
                out.append(int(num) if re.fullmatch(r"-?\d{1,15}", num) else float(num) if re.fullmatch(r"-?\d*\.\d+|-?\d+\.\d*", num) else v)
            except ValueError:
                out.append(v)
        ws.append(out)
        if i == 0:
            for cell in ws[1]:
                cell.font = Font(bold=True)
        if i >= 20000:
            break
    buf = io.BytesIO()
    wb.save(buf)
    return buf.getvalue()
