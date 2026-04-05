"""
Excel to PowerPoint Service for InsightSheet-lite
Converts Excel files to professional PowerPoint presentations
"""
import openpyxl
from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.enum.shapes import MSO_SHAPE
from pptx.enum.text import PP_ALIGN
from pptx.chart.data import CategoryChartData
from pptx.enum.chart import XL_CHART_TYPE
from pptx.dml.color import RGBColor
import pandas as pd
from typing import List, Dict, Any, Optional, BinaryIO
import io
import logging
from datetime import datetime

from .excel_recalc_service import convert_spreadsheet_to_pdf_bytes

logger = logging.getLogger(__name__)


class ExcelToPPTService:
    """Service to convert Excel files to PowerPoint presentations"""

    def __init__(self):
        self.theme_colors = {
            'primary': RGBColor(99, 102, 241),  # Indigo
            'secondary': RGBColor(139, 92, 246),  # Purple
            'accent': RGBColor(236, 72, 153),  # Pink
            'success': RGBColor(16, 185, 129),  # Green
            'warning': RGBColor(245, 158, 11),  # Orange
            'dark': RGBColor(30, 41, 59),  # Slate
            'light': RGBColor(248, 250, 252),  # Light slate
        }

    async def convert_excel_to_ppt(
        self,
        excel_file: BinaryIO,
        filename: str,
        author_name: Optional[str] = None,
        last_modified_by: Optional[str] = None,
    ) -> bytes:
        """
        Convert Excel file to PowerPoint presentation

        Args:
            excel_file: Excel file binary data
            filename: Original filename

        Returns:
            bytes: PowerPoint file data
        """
        try:
            # Read Excel file
            excel_data = excel_file.read() if hasattr(excel_file, 'read') else excel_file
            workbook = openpyxl.load_workbook(io.BytesIO(excel_data), data_only=True)

            # Create PowerPoint presentation
            prs = Presentation()
            prs.slide_width = Inches(10)
            prs.slide_height = Inches(5.625)  # 16:9 aspect ratio

            try:
                cp = prs.core_properties
                cp.author = author_name or "Meldra"
                cp.last_modified_by = last_modified_by or (author_name or "Meldra")
                now = datetime.utcnow()
                cp.created = now
                cp.modified = now
            except Exception:
                pass

            # Add title slide
            self._add_title_slide(prs, filename)

            # Process each worksheet
            for sheet_name in workbook.sheetnames:
                logger.info(f"Processing sheet: {sheet_name}")
                worksheet = workbook[sheet_name]

                # Get data from worksheet
                data = self._extract_worksheet_data(worksheet)

                if not data['rows']:
                    logger.warning(f"Skipping empty sheet: {sheet_name}")
                    continue

                # Analyze data
                analysis = self._analyze_data(data)

                # Add section slide
                self._add_section_slide(prs, sheet_name, analysis)

                # Add data table slide
                self._add_data_table_slide(prs, sheet_name, data)

                # Add embedded images (including pasted charts/screenshots) as individual slides
                self._add_embedded_image_slides(prs, sheet_name, worksheet)

            # Fallback for real Excel chart objects: render workbook via LibreOffice and crop figures
            try:
                pdf_bytes, _ = convert_spreadsheet_to_pdf_bytes(excel_data, filename)
                if pdf_bytes:
                    self._add_rendered_figure_slides(prs, pdf_bytes)
            except Exception:
                pass

            # Save to bytes
            output = io.BytesIO()
            prs.save(output)
            output.seek(0)

            return output.read()

        except Exception as e:
            logger.error(f"Error converting Excel to PPT: {str(e)}")
            raise Exception(f"Excel to PPT conversion failed: {str(e)}")

    def _add_title_slide(self, prs: Presentation, filename: str):
        """Add title slide to presentation"""
        slide = prs.slides.add_slide(prs.slide_layouts[6])  # Blank layout

        # Background
        background = slide.background
        fill = background.fill
        fill.solid()
        fill.fore_color.rgb = self.theme_colors['dark']

        # Title
        title_box = slide.shapes.add_textbox(
            Inches(0.5), Inches(2), Inches(9), Inches(1)
        )
        title_frame = title_box.text_frame
        title_frame.text = "Excel Data Presentation"
        title_para = title_frame.paragraphs[0]
        title_para.font.size = Pt(40)
        title_para.font.bold = True
        title_para.font.color.rgb = RGBColor(255, 255, 255)
        title_para.alignment = PP_ALIGN.CENTER

        # Subtitle
        subtitle_box = slide.shapes.add_textbox(
            Inches(0.5), Inches(3.2), Inches(9), Inches(0.6)
        )
        subtitle_frame = subtitle_box.text_frame
        subtitle_frame.text = filename.replace('.xlsx', '').replace('.xls', '')
        subtitle_para = subtitle_frame.paragraphs[0]
        subtitle_para.font.size = Pt(24)
        subtitle_para.font.color.rgb = self.theme_colors['secondary']
        subtitle_para.alignment = PP_ALIGN.CENTER

        # Footer
        footer_box = slide.shapes.add_textbox(
            Inches(0.5), Inches(4.5), Inches(9), Inches(0.5)
        )
        footer_frame = footer_box.text_frame
        footer_frame.text = f"Generated by InsightSheet-lite\n{datetime.now().strftime('%Y-%m-%d %H:%M')}"
        footer_para = footer_frame.paragraphs[0]
        footer_para.font.size = Pt(14)
        footer_para.font.color.rgb = RGBColor(148, 163, 184)
        footer_para.alignment = PP_ALIGN.CENTER

    def _add_section_slide(self, prs: Presentation, sheet_name: str, analysis: Dict):
        """Add section slide for worksheet"""
        slide = prs.slides.add_slide(prs.slide_layouts[6])

        # Background
        background = slide.background
        fill = background.fill
        fill.solid()
        fill.fore_color.rgb = RGBColor(51, 65, 85)

        # Section title
        title_box = slide.shapes.add_textbox(
            Inches(0.5), Inches(2.5), Inches(9), Inches(1)
        )
        title_frame = title_box.text_frame
        title_frame.text = sheet_name
        title_para = title_frame.paragraphs[0]
        title_para.font.size = Pt(48)
        title_para.font.bold = True
        title_para.font.color.rgb = RGBColor(255, 255, 255)
        title_para.alignment = PP_ALIGN.CENTER

        # Stats
        stats_text = f"{len(analysis.get('chart_candidates', []))} charts • {analysis['row_count']} rows • {analysis['column_count']} columns"
        stats_box = slide.shapes.add_textbox(
            Inches(0.5), Inches(3.8), Inches(9), Inches(0.5)
        )
        stats_frame = stats_box.text_frame
        stats_frame.text = stats_text
        stats_para = stats_frame.paragraphs[0]
        stats_para.font.size = Pt(20)
        stats_para.font.color.rgb = self.theme_colors['secondary']
        stats_para.alignment = PP_ALIGN.CENTER

    def _add_data_table_slide(self, prs: Presentation, sheet_name: str, data: Dict):
        """Add data table slide"""
        slide = prs.slides.add_slide(prs.slide_layouts[6])

        # Title
        title_box = slide.shapes.add_textbox(
            Inches(0.5), Inches(0.3), Inches(9), Inches(0.5)
        )
        title_frame = title_box.text_frame
        title_frame.text = f"{sheet_name} - Data Overview"
        title_para = title_frame.paragraphs[0]
        title_para.font.size = Pt(28)
        title_para.font.bold = True
        title_para.font.color.rgb = self.theme_colors['dark']

        # Create table
        max_rows = min(len(data['rows']), 20)
        max_cols = min(len(data['headers']), 10)

        rows_count = max_rows + 1  # +1 for header
        cols_count = max_cols

        table = slide.shapes.add_table(
            rows_count, cols_count,
            Inches(0.4), Inches(1),
            Inches(9.2), Inches(4.2)
        ).table

        # Set column widths
        for col_idx in range(cols_count):
            table.columns[col_idx].width = Inches(9.2 / cols_count)

        # Add headers
        for col_idx in range(max_cols):
            cell = table.cell(0, col_idx)
            cell.text = str(data['headers'][col_idx])
            cell.fill.solid()
            cell.fill.fore_color.rgb = self.theme_colors['primary']
            paragraph = cell.text_frame.paragraphs[0]
            paragraph.font.size = Pt(10)
            paragraph.font.bold = True
            paragraph.font.color.rgb = RGBColor(255, 255, 255)

        # Add data rows
        for row_idx in range(max_rows):
            for col_idx in range(max_cols):
                cell = table.cell(row_idx + 1, col_idx)
                value = data['rows'][row_idx][col_idx] if col_idx < len(data['rows'][row_idx]) else ''
                cell.text = str(value) if value is not None else ''
                paragraph = cell.text_frame.paragraphs[0]
                paragraph.font.size = Pt(9)

    def _add_chart_slides(self, prs: Presentation, sheet_name: str, data: Dict, analysis: Dict):
        """Add chart slides for data visualization"""
        chart_types = [
            (XL_CHART_TYPE.BAR_CLUSTERED, "Bar Chart"),
            (XL_CHART_TYPE.LINE, "Line Chart"),
            (XL_CHART_TYPE.PIE, "Pie Chart"),
        ]

        numeric_cols = analysis['numeric_columns'][:3]  # Max 3 charts
        categorical_col = analysis['categorical_columns'][0] if analysis['categorical_columns'] else None

        if not categorical_col:
            return

        cat_idx = data['headers'].index(categorical_col['name'])

        for idx, num_col in enumerate(numeric_cols):
            if idx >= len(chart_types):
                break

            chart_type, chart_name = chart_types[idx]
            num_idx = data['headers'].index(num_col['name'])

            self._add_chart_slide(
                prs, sheet_name, data, cat_idx, num_idx,
                chart_type, chart_name, idx + 1, len(numeric_cols)
            )

    def _add_chart_slide(
        self, prs: Presentation, sheet_name: str, data: Dict,
        cat_idx: int, num_idx: int, chart_type, chart_name: str,
        chart_num: int, total_charts: int
    ):
        """Add individual chart slide"""
        slide = prs.slides.add_slide(prs.slide_layouts[6])

        # Title
        title_text = f"{sheet_name} - {chart_name} ({chart_num}/{total_charts})"
        title_box = slide.shapes.add_textbox(
            Inches(0.5), Inches(0.3), Inches(9), Inches(0.5)
        )
        title_frame = title_box.text_frame
        title_frame.text = title_text
        title_para = title_frame.paragraphs[0]
        title_para.font.size = Pt(24)
        title_para.font.bold = True

        # Prepare chart data
        chart_data = CategoryChartData()
        categories = []
        values = []

        # Aggregate data
        data_map = {}
        for row in data['rows'][:50]:  # Max 50 rows
            if cat_idx < len(row) and num_idx < len(row):
                category = str(row[cat_idx])[:30]
                try:
                    value = float(row[num_idx])
                    if category not in data_map:
                        data_map[category] = {'sum': 0, 'count': 0}
                    data_map[category]['sum'] += value
                    data_map[category]['count'] += 1
                except (ValueError, TypeError):
                    continue

        # Sort and limit
        sorted_data = sorted(
            [(k, v['sum'] / v['count']) for k, v in data_map.items()],
            key=lambda x: x[1],
            reverse=True
        )[:15]

        for category, value in sorted_data:
            categories.append(category)
            values.append(round(value, 2))

        chart_data.categories = categories

        chart_data.add_series(data['headers'][num_idx], values)

        # Add chart
        x, y, cx, cy = Inches(0.5), Inches(1), Inches(9), Inches(4)
        chart = slide.shapes.add_chart(
            chart_type, x, y, cx, cy, chart_data
        ).chart

        chart.has_legend = (chart_type == XL_CHART_TYPE.PIE)

    def _add_statistics_slide(self, prs: Presentation, sheet_name: str, data: Dict, analysis: Dict):
        """Add statistics slide"""
        slide = prs.slides.add_slide(prs.slide_layouts[6])

        # Title
        title_box = slide.shapes.add_textbox(
            Inches(0.5), Inches(0.3), Inches(9), Inches(0.5)
        )
        title_frame = title_box.text_frame
        title_frame.text = f"{sheet_name} - Statistical Summary"
        title_para = title_frame.paragraphs[0]
        title_para.font.size = Pt(28)
        title_para.font.bold = True

        # Create statistics table
        numeric_cols = analysis['numeric_columns'][:10]
        rows_count = len(numeric_cols) + 1
        cols_count = 6

        table = slide.shapes.add_table(
            rows_count, cols_count,
            Inches(1), Inches(1.2),
            Inches(8), Inches(4)
        ).table

        # Headers
        headers = ['Column', 'Average', 'Min', 'Max', 'Std Dev', 'Count']
        for col_idx, header in enumerate(headers):
            cell = table.cell(0, col_idx)
            cell.text = header
            cell.fill.solid()
            cell.fill.fore_color.rgb = self.theme_colors['primary']
            paragraph = cell.text_frame.paragraphs[0]
            paragraph.font.size = Pt(11)
            paragraph.font.bold = True
            paragraph.font.color.rgb = RGBColor(255, 255, 255)
            paragraph.alignment = PP_ALIGN.CENTER

        # Statistics data
        for row_idx, num_col in enumerate(numeric_cols):
            col_name = num_col['name']
            col_index = data['headers'].index(col_name)

            # Calculate statistics
            values = []
            for row in data['rows']:
                if col_index < len(row):
                    try:
                        val = float(row[col_index])
                        values.append(val)
                    except (ValueError, TypeError):
                        continue

            if values:
                stats = {
                    'Column': col_name[:25],
                    'Average': f"{sum(values) / len(values):.2f}",
                    'Min': f"{min(values):.2f}",
                    'Max': f"{max(values):.2f}",
                    'Std Dev': f"{pd.Series(values).std():.2f}",
                    'Count': str(len(values))
                }

                for col_idx, (key, value) in enumerate(stats.items()):
                    cell = table.cell(row_idx + 1, col_idx)
                    cell.text = value
                    paragraph = cell.text_frame.paragraphs[0]
                    paragraph.font.size = Pt(10)
                    paragraph.alignment = PP_ALIGN.CENTER

    def _extract_worksheet_data(self, worksheet) -> Dict:
        """Extract data from worksheet"""
        data = {
            'headers': [],
            'rows': []
        }

        # Get headers from first row
        first_row = list(worksheet.iter_rows(min_row=1, max_row=1, values_only=True))[0]
        data['headers'] = [str(h) if h is not None else f'Column{i}' for i, h in enumerate(first_row)]

        # Get data rows
        for row in worksheet.iter_rows(min_row=2, values_only=True):
            if any(cell is not None and str(cell).strip() for cell in row):
                data['rows'].append(list(row))

        return data

    def _analyze_data(self, data: Dict) -> Dict:
        """Analyze data to determine chart types and columns"""
        analysis = {
            'row_count': len(data['rows']),
            'column_count': len(data['headers']),
            'numeric_columns': [],
            'categorical_columns': [],
            'chart_candidates': []
        }

        for col_idx, header in enumerate(data['headers']):
            values = [row[col_idx] for row in data['rows'] if col_idx < len(row)]
            values = [v for v in values if v is not None]

            if not values:
                continue

            # Check if numeric
            numeric_count = 0
            for val in values:
                try:
                    float(val)
                    numeric_count += 1
                except (ValueError, TypeError):
                    pass

            is_numeric = numeric_count > len(values) * 0.7

            if is_numeric:
                analysis['numeric_columns'].append({
                    'name': header,
                    'index': col_idx
                })
            else:
                unique_count = len(set(str(v) for v in values))
                if 1 < unique_count <= 20:
                    analysis['categorical_columns'].append({
                        'name': header,
                        'index': col_idx,
                        'unique_count': unique_count
                    })

        return analysis


    def _add_embedded_image_slides(self, prs: Presentation, sheet_name: str, worksheet) -> None:
        """Add one slide per embedded image in the worksheet.

        This captures pasted charts/screenshots and any inserted pictures.
        """
        images = getattr(worksheet, "_images", None) or []
        if not images:
            return

        slide_w_in = 10.0
        slide_h_in = 5.625

        for idx, img in enumerate(images, start=1):
            try:
                img_bytes = None

                # openpyxl Image exposes a private _data() helper in most versions
                data_fn = getattr(img, "_data", None)
                if callable(data_fn):
                    img_bytes = data_fn()

                if not img_bytes:
                    # Some images may have a ref/path-like attribute
                    ref = getattr(img, "ref", None) or getattr(img, "path", None)
                    if ref:
                        try:
                            with open(ref, "rb") as f:
                                img_bytes = f.read()
                        except Exception:
                            img_bytes = None

                if not img_bytes:
                    continue

                blank = prs.slide_layouts[6]
                slide = prs.slides.add_slide(blank)

                # Title
                title_box = slide.shapes.add_textbox(Inches(0.5), Inches(0.25), Inches(9.0), Inches(0.5))
                title_frame = title_box.text_frame
                title_frame.text = f"{sheet_name} - Figure {idx}"
                title_para = title_frame.paragraphs[0]
                title_para.font.size = Pt(20)
                title_para.font.bold = True

                # Add image, fit-to-slide with margins
                stream = io.BytesIO(img_bytes)
                stream.seek(0)

                try:
                    from PIL import Image as PILImage
                    with PILImage.open(io.BytesIO(img_bytes)) as pil:
                        w_px, h_px = pil.size
                except Exception:
                    w_px, h_px = 0, 0

                # Layout region for image below title
                margin_l = 0.5
                margin_r = 0.5
                margin_top = 0.9
                margin_bottom = 0.5
                max_w = slide_w_in - margin_l - margin_r
                max_h = slide_h_in - margin_top - margin_bottom

                if w_px > 0 and h_px > 0:
                    # Use pixels ratio only; absolute PPI isn't needed
                    scale = min(max_w / float(w_px), max_h / float(h_px))
                    w_in = float(w_px) * scale
                    h_in = float(h_px) * scale
                else:
                    # Fallback: just fill the region
                    w_in, h_in = max_w, max_h

                left = margin_l + max((max_w - w_in) / 2.0, 0.0)
                top = margin_top + max((max_h - h_in) / 2.0, 0.0)

                slide.shapes.add_picture(
                    stream,
                    Inches(left),
                    Inches(top),
                    width=Inches(w_in),
                    height=Inches(h_in),
                )
            except Exception:
                # Best-effort: skip problematic images
                continue


    def _add_rendered_figure_slides(self, prs: Presentation, pdf_bytes: bytes) -> None:
        try:
            import fitz
        except Exception:
            return

        try:
            from PIL import Image as PILImage
        except Exception:
            return

        slide_w_in = 10.0
        slide_h_in = 5.625

        def _contiguous_runs(indices, min_len: int):
            if not indices:
                return []
            runs = []
            start = prev = indices[0]
            for v in indices[1:]:
                if v == prev + 1:
                    prev = v
                    continue
                if prev - start + 1 >= min_len:
                    runs.append((start, prev + 1))
                start = prev = v
            if prev - start + 1 >= min_len:
                runs.append((start, prev + 1))
            return runs

        def _split_by_whitespace_gaps(active_runs, gap_min: int):
            if not active_runs:
                return []
            out = []
            cur_y0, cur_y1 = active_runs[0]
            for y0, y1 in active_runs[1:]:
                if y0 - cur_y1 >= gap_min:
                    out.append((cur_y0, cur_y1))
                    cur_y0, cur_y1 = y0, y1
                else:
                    cur_y1 = max(cur_y1, y1)
            out.append((cur_y0, cur_y1))
            return out

        doc = None
        try:
            doc = fitz.open(stream=pdf_bytes, filetype="pdf")
            fig_num = 0
            matrix = fitz.Matrix(2.0, 2.0)

            for p_idx in range(len(doc)):
                page = doc[p_idx]
                pix = page.get_pixmap(matrix=matrix, alpha=False)
                if pix is None or pix.width <= 0 or pix.height <= 0:
                    continue

                try:
                    if pix.colorspace is None or pix.colorspace.n != 3:
                        pix = fitz.Pixmap(fitz.csRGB, pix)
                except Exception:
                    pass

                img = PILImage.frombytes("RGB", (pix.width, pix.height), pix.samples)

                target_w = 600
                scale = target_w / float(img.size[0]) if img.size[0] else 1.0
                small_h = max(int(img.size[1] * scale), 1)
                small = img.resize((target_w, small_h))

                px = small.load()
                w, h = small.size
                # Build a simple non-white mask
                mask = [bytearray(w) for _ in range(h)]
                row_counts = [0] * h
                col_counts = [0] * w
                for y in range(h):
                    row = mask[y]
                    cnt = 0
                    for x in range(w):
                        r, g, b = px[x, y]
                        v = 1 if (r < 248 or g < 248 or b < 248) else 0
                        row[x] = v
                        if v:
                            cnt += 1
                            col_counts[x] += 1
                    row_counts[y] = cnt

                # Identify horizontal content bands (separated by whitespace)
                active_rows = [y for y in range(h) if row_counts[y] > int(w * 0.03)]
                row_runs = _contiguous_runs(active_rows, min_len=8)
                bands = _split_by_whitespace_gaps(row_runs, gap_min=14)
                if not bands:
                    continue

                regions = []
                for by0, by1 in bands:
                    # Within each band, split into columns by whitespace
                    band_col_counts = [0] * w
                    for y in range(by0, by1):
                        row = mask[y]
                        for x in range(w):
                            if row[x]:
                                band_col_counts[x] += 1

                    active_cols = [x for x in range(w) if band_col_counts[x] > int((by1 - by0) * 0.03)]
                    col_runs = _contiguous_runs(active_cols, min_len=8)
                    cols = _split_by_whitespace_gaps(col_runs, gap_min=14)
                    if not cols:
                        continue

                    for cx0, cx1 in cols:
                        # Tighten bbox inside this cell by scanning for nonwhite
                        minx, miny, maxx, maxy = cx1, by1, cx0, by0
                        nonwhite = 0
                        for y in range(by0, by1):
                            row = mask[y]
                            for x in range(cx0, cx1):
                                if not row[x]:
                                    continue
                                nonwhite += 1
                                if x < minx:
                                    minx = x
                                if x > maxx:
                                    maxx = x
                                if y < miny:
                                    miny = y
                                if y > maxy:
                                    maxy = y

                        if nonwhite == 0 or maxx <= minx or maxy <= miny:
                            continue

                        # Expand bbox a bit
                        x0 = max(minx - 6, 0)
                        y0 = max(miny - 6, 0)
                        x1 = min(maxx + 7, w)
                        y1 = min(maxy + 7, h)

                        bw = x1 - x0
                        bh = y1 - y0
                        if bw < 90 or bh < 90:
                            continue

                        area = bw * bh
                        page_area = w * h
                        if area < page_area * 0.04:
                            continue
                        if area > page_area * 0.85:
                            continue

                        density = float(nonwhite) / float(max(area, 1))
                        if density > 0.75:
                            continue

                        regions.append((x0, y0, x1, y1))

                if not regions:
                    continue

                # Sort by reading order
                regions = sorted(regions, key=lambda t: (t[1], t[0]))[:12]

                for x0, y0, x1, y1 in regions:
                    fig_num += 1
                    sx0 = int(x0 / scale)
                    sy0 = int(y0 / scale)
                    sx1 = int(x1 / scale)
                    sy1 = int(y1 / scale)
                    sx0 = max(sx0 - 10, 0)
                    sy0 = max(sy0 - 10, 0)
                    sx1 = min(sx1 + 10, img.size[0])
                    sy1 = min(sy1 + 10, img.size[1])

                    crop = img.crop((sx0, sy0, sx1, sy1))
                    buf = io.BytesIO()
                    crop.save(buf, format="PNG")
                    crop_bytes = buf.getvalue()
                    if not crop_bytes:
                        continue

                    slide = prs.slides.add_slide(prs.slide_layouts[6])

                    title_box = slide.shapes.add_textbox(Inches(0.5), Inches(0.25), Inches(9.0), Inches(0.5))
                    title_frame = title_box.text_frame
                    title_frame.text = f"Figure {fig_num}"
                    title_para = title_frame.paragraphs[0]
                    title_para.font.size = Pt(20)
                    title_para.font.bold = True

                    # Fit image into remaining area
                    margin_l = 0.5
                    margin_r = 0.5
                    margin_top = 0.9
                    margin_bottom = 0.5
                    max_w = slide_w_in - margin_l - margin_r
                    max_h = slide_h_in - margin_top - margin_bottom
                    cw, ch = crop.size
                    if cw and ch:
                        s = min(max_w / float(cw), max_h / float(ch))
                        w_in = float(cw) * s
                        h_in = float(ch) * s
                    else:
                        w_in, h_in = max_w, max_h
                    left = margin_l + max((max_w - w_in) / 2.0, 0.0)
                    top = margin_top + max((max_h - h_in) / 2.0, 0.0)

                    stream = io.BytesIO(crop_bytes)
                    stream.seek(0)
                    slide.shapes.add_picture(stream, Inches(left), Inches(top), width=Inches(w_in), height=Inches(h_in))

        except Exception:
            return
        finally:
            try:
                if doc is not None:
                    doc.close()
            except Exception:
                pass
