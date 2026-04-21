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

from .excel_recalc_service import convert_spreadsheet_to_pdf_bytes, convert_spreadsheet_to_png_images

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

            rendered_pages = None
            try:
                # To prevent the vision engine from extracting spreadsheet tables as images and 
                # to eliminate background gridlines, we surgically modify the Excel zip in-memory 
                # to make all cell fonts and backgrounds pure white, and disable gridlines.
                # Charts maintain their own formatting XMLs, so they remain fully visible.
                vision_excel_data = self._wipe_cells_for_vision(excel_data)
                
                pdf_bytes, _ = convert_spreadsheet_to_pdf_bytes(vision_excel_data, filename)
                if pdf_bytes:
                    rendered_pages = self._render_pdf_pages_to_images(pdf_bytes)
            except Exception as e:
                logger.warning(f"PDF rendering failed: {e}")
                rendered_pages = None

            # Fallback: if PDF->image rendering isn't available (e.g. PyMuPDF missing),
            # use LibreOffice's direct PNG export.
            if not rendered_pages:
                try:
                    png_pages, _msg = convert_spreadsheet_to_png_images(vision_excel_data, filename)
                    if png_pages:
                        rendered_pages = png_pages
                except Exception:
                    rendered_pages = None

            # Process each worksheet
            fig_num = 0

            for sheet_idx, sheet_name in enumerate(workbook.sheetnames):
                logger.info(f"Processing sheet: {sheet_name}")
                worksheet = workbook[sheet_name]

                # Get data from worksheet
                tables = self._extract_worksheet_data(worksheet)

                if not tables:
                    logger.warning(f"Skipping empty sheet: {sheet_name}")
                    continue

                # Analyze largest table
                largest_table = max(tables, key=lambda t: len(t['rows']))
                analysis = self._analyze_data(largest_table)

                # Add section slide
                self._add_section_slide(prs, sheet_name, analysis)

                # Add data table slides for each distinct table
                for idx, t_data in enumerate(tables):
                    if t_data['headers'] and t_data['rows']:
                        t_name = sheet_name if len(tables) == 1 else f"{sheet_name} (Table {idx+1})"
                        self._add_data_table_slide(prs, t_name, t_data)

                # Add embedded images (including pasted charts/screenshots) as individual slides
                self._add_embedded_image_slides(prs, sheet_name, worksheet)

                # We will process rendered_pages globally at the end to avoid duplication
                pass

            # Process all rendered pages once at the end to extract visual elements (charts/tables)
            if rendered_pages:
                logger.info(f"Processing {len(rendered_pages)} rendered pages for visual elements")
                for p_idx, p in enumerate(rendered_pages):
                    fig_num = self._add_rendered_figure_slides_from_page_image(
                        prs, f"Visual Extract", p, fig_num
                    )

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
        """Add data table slide(s)."""

        headers = list(data.get('headers') or [])
        rows = list(data.get('rows') or [])
        if not headers:
            return

        rows_per_slide = 20
        cols_per_slide = 10

        total_rows = len(rows)
        total_cols = len(headers)

        row_start = 0
        while row_start < max(total_rows, 1):
            row_end = min(row_start + rows_per_slide, total_rows)
            col_start = 0
            while col_start < total_cols:
                col_end = min(col_start + cols_per_slide, total_cols)

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

                sub_box = slide.shapes.add_textbox(
                    Inches(0.5), Inches(0.75), Inches(9), Inches(0.3)
                )
                sub_frame = sub_box.text_frame
                shown_rows = f"rows {row_start + 1}-{row_end}" if total_rows else "no data rows"
                shown_cols = f"cols {col_start + 1}-{col_end}"
                sub_frame.text = f"Showing {shown_rows}, {shown_cols}"
                sub_para = sub_frame.paragraphs[0]
                sub_para.font.size = Pt(12)
                sub_para.font.color.rgb = RGBColor(100, 116, 139)

                page_rows = rows[row_start:row_end] if total_rows else []
                rows_count = (len(page_rows) if page_rows else 0) + 1
                cols_count = max(col_end - col_start, 1)

                table = slide.shapes.add_table(
                    rows_count, cols_count,
                    Inches(0.4), Inches(1.1),
                    Inches(9.2), Inches(4.1)
                ).table

                # Set column widths
                for col_idx in range(cols_count):
                    table.columns[col_idx].width = Inches(9.2 / cols_count)

                for col_idx in range(cols_count):
                    cell = table.cell(0, col_idx)
                    cell.text = str(headers[col_start + col_idx])
                    cell.fill.solid()
                    cell.fill.fore_color.rgb = self.theme_colors['primary']
                    paragraph = cell.text_frame.paragraphs[0]
                    paragraph.font.size = Pt(10)
                    paragraph.font.bold = True
                    paragraph.font.color.rgb = RGBColor(255, 255, 255)

                for r_i, row in enumerate(page_rows, start=1):
                    for c_i in range(cols_count):
                        cell = table.cell(r_i, c_i)
                        src_idx = col_start + c_i
                        value = row[src_idx] if src_idx < len(row) else ''
                        cell.text = str(value) if value is not None else ''
                        paragraph = cell.text_frame.paragraphs[0]
                        paragraph.font.size = Pt(9)

                col_start += cols_per_slide
            row_start += rows_per_slide

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

    def _extract_worksheet_data(self, worksheet) -> list:
        """Extract data from worksheet into separate tables (blocks)"""
        tables = []
        current_table = {'headers': [], 'rows': []}
        is_first_row = True

        for row in worksheet.iter_rows(min_row=1, values_only=True):
            is_empty = not any(cell is not None and str(cell).strip() for cell in row)
            
            if is_empty:
                if not is_first_row and (current_table['headers'] or current_table['rows']):
                    tables.append(current_table)
                    current_table = {'headers': [], 'rows': []}
                    is_first_row = True
            else:
                if is_first_row:
                    current_table['headers'] = [str(h) if h is not None else f'Col{i}' for i, h in enumerate(row)]
                    is_first_row = False
                else:
                    current_table['rows'].append(list(row))
                    
        if current_table['headers'] or current_table['rows']:
            tables.append(current_table)

        return tables

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

    def _wipe_cells_for_vision(self, excel_bytes: bytes) -> bytes:
        """
        Surgically modifies the xlsx zip file to make all cell text and backgrounds pure white
        and disables gridlines. This forces LibreOffice to render an empty white page with 
        only charts, shapes, and pictures visible, perfectly isolating them for the vision engine.
        """
        import zipfile
        import re
        out_io = io.BytesIO()
        try:
            with zipfile.ZipFile(io.BytesIO(excel_bytes), 'r') as zin:
                with zipfile.ZipFile(out_io, 'w') as zout:
                    for item in zin.infolist():
                        content = zin.read(item.filename)
                        
                        if item.filename == 'xl/styles.xml':
                            # Force all fonts to white
                            content = re.sub(b'<color [^>]*/>', b'<color rgb="FFFFFFFF"/>', content)
                            content = re.sub(b'<color [^>]*>.*?</color>', b'<color rgb="FFFFFFFF"/>', content)
                            
                            # Force all pattern fills to white
                            content = re.sub(b'<fgColor [^>]*/>', b'<fgColor rgb="FFFFFFFF"/>', content)
                            content = re.sub(b'<bgColor [^>]*/>', b'<bgColor rgb="FFFFFFFF"/>', content)
                            
                            # Remove cell borders
                            for tag in [b'left', b'right', b'top', b'bottom', b'diagonal']:
                                content = re.sub(b'<' + tag + b' [^>]*/>', b'<' + tag + b'/>', content)
                                content = re.sub(b'<' + tag + b' [^>]*>.*?</' + tag + b'>', b'<' + tag + b'/>', content)
                                
                        elif item.filename.startswith('xl/worksheets/sheet') and item.filename.endswith('.xml'):
                            # Disable gridlines on all worksheets
                            content = re.sub(b'showGridLines="1"', b'showGridLines="0"', content)
                            if b'showGridLines=' not in content:
                                content = content.replace(b'<sheetView ', b'<sheetView showGridLines="0" ')
                                
                        zout.writestr(item, content)
            return out_io.getvalue()
        except Exception as e:
            logger.warning(f"Wipe cells failed: {e}")
            return excel_bytes
        try:
            import fitz
        except Exception:
            return None

        try:
            from PIL import Image as PILImage
        except Exception:
            return None

        try:
            doc = fitz.open(stream=pdf_bytes, filetype="pdf")
            try:
                pages = []
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
                    pages.append(PILImage.frombytes("RGB", (pix.width, pix.height), pix.samples))
                return pages
            finally:
                doc.close()
        except Exception:
            return None


    def _add_chart_slides_from_anchors(self, prs: Presentation, sheet_name: str, worksheet, page_img, fig_num: int) -> int:
        try:
            from PIL import ImageStat as PILImageStat
        except Exception:
            return fig_num

        if isinstance(page_img, (list, tuple)):
            page_imgs = [p for p in page_img if p is not None]
        else:
            page_imgs = [page_img] if page_img is not None else []
        if not page_imgs:
            return fig_num

        charts = getattr(worksheet, "_charts", None) or []
        if not charts:
            return fig_num

        def _excel_col_width_to_px(width_chars: float) -> int:
            # Approximation used by Excel: https://support.microsoft.com/en-us/office/column-widths-0c8b6b40-1f70-4aa2-a34a-8c7b81b6f6c2
            # pixels = trunc(((256*width + trunc(128/7))/256) * 7)
            try:
                w = float(width_chars)
            except Exception:
                w = 8.43
            if w <= 0:
                w = 8.43
            return int((((256.0 * w + int(128.0 / 7.0)) / 256.0) * 7.0))

        def _col_width_px(col_letter: str) -> float:
            try:
                w = worksheet.column_dimensions[col_letter].width
            except Exception:
                w = None
            if not w:
                w = 8.43
            return float(_excel_col_width_to_px(w))

        def _row_height_px(row_idx: int) -> float:
            try:
                h = worksheet.row_dimensions[row_idx].height
            except Exception:
                h = None
            if not h:
                h = 15.0
            return float(h) * (96.0 / 72.0)

        def _emu_to_px(emu: int) -> float:
            # 1 inch = 914400 EMU, assume 96 dpi
            return float(emu or 0) / (914400.0 / 96.0)

        def _cell_xy_px(col_idx_1: int, row_idx_1: int) -> tuple:
            x = 0.0
            for c in range(1, max(col_idx_1, 1)):
                x += _col_width_px(openpyxl.utils.get_column_letter(c))
            y = 0.0
            for r in range(1, max(row_idx_1, 1)):
                y += _row_height_px(r)
            return x, y

        def _tighten_to_nonwhite(img_in, threshold: int = 254, pad: int = 20):
            try:
                w0, h0 = img_in.size
                if w0 <= 0 or h0 <= 0:
                    return img_in
                px = img_in.load()

                def row_nonwhite(y):
                    for x in range(w0):
                        r, g, b = px[x, y]
                        if r < threshold or g < threshold or b < threshold:
                            return True
                    return False

                def col_nonwhite(x):
                    for y in range(h0):
                        r, g, b = px[x, y]
                        if r < threshold or g < threshold or b < threshold:
                            return True
                    return False

                top = 0
                while top < h0 and not row_nonwhite(top):
                    top += 1
                bottom = h0 - 1
                while bottom > top and not row_nonwhite(bottom):
                    bottom -= 1
                left = 0
                while left < w0 and not col_nonwhite(left):
                    left += 1
                right = w0 - 1
                while right > left and not col_nonwhite(right):
                    right -= 1

                left = max(left - pad, 0)
                top = max(top - pad, 0)
                right = min(right + pad, w0 - 1)
                bottom = min(bottom + pad, h0 - 1)

                if right - left < 40 or bottom - top < 40:
                    return img_in
                return img_in.crop((left, top, right + 1, bottom + 1))
            except Exception:
                return img_in

        try:
            dim = getattr(worksheet, "calculate_dimension", None)
            dim = dim() if callable(dim) else None
        except Exception:
            dim = None

        try:
            from openpyxl.utils.cell import range_boundaries
        except Exception:
            range_boundaries = None

        if dim and range_boundaries and ":" in dim:
            try:
                min_col, min_row, max_col, max_row = range_boundaries(dim)
                sheet_cols = max(int(max_col or 1), 1)
                sheet_rows = max(int(max_row or 1), 1)
            except Exception:
                sheet_cols = max(int(getattr(worksheet, "max_column", 1) or 1), 1)
                sheet_rows = max(int(getattr(worksheet, "max_row", 1) or 1), 1)
        else:
            sheet_cols = max(int(getattr(worksheet, "max_column", 1) or 1), 1)
            sheet_rows = max(int(getattr(worksheet, "max_row", 1) or 1), 1)
        sheet_w_px = 0.0
        for c in range(1, sheet_cols + 1):
            sheet_w_px += _col_width_px(openpyxl.utils.get_column_letter(c))
        sheet_h_px = 0.0
        for r in range(1, sheet_rows + 1):
            sheet_h_px += _row_height_px(r)

        if sheet_w_px <= 0 or sheet_h_px <= 0:
            return fig_num

        slide_w_in = 10.0
        slide_h_in = 5.625

        added = 0
        for ch in charts:
            try:
                title = None
                try:
                    t = getattr(ch, "title", None)
                    title = getattr(t, "tx", None)
                    if title and getattr(title, "rich", None) and title.rich.p and title.rich.p[0].r:
                        title = title.rich.p[0].r[0].t
                except Exception:
                    title = None
                if not title:
                    title = f"Chart {added + 1}"

                a = getattr(ch, "anchor", None)
                fr = getattr(a, "_from", None)
                to = getattr(a, "_to", None)
                if fr is None:
                    continue

                c0 = int(getattr(fr, "col", 0)) + 1
                r0 = int(getattr(fr, "row", 0)) + 1
                x0, y0 = _cell_xy_px(c0, r0)
                try:
                    x0 += _emu_to_px(int(getattr(fr, "colOff", 0) or 0))
                    y0 += _emu_to_px(int(getattr(fr, "rowOff", 0) or 0))
                except Exception:
                    pass

                if to is not None:
                    c1 = int(getattr(to, "col", c0)) + 1
                    r1 = int(getattr(to, "row", r0)) + 1
                    x1, y1 = _cell_xy_px(max(c1, c0 + 1), max(r1, r0 + 1))
                    try:
                        x1 += _emu_to_px(int(getattr(to, "colOff", 0) or 0))
                        y1 += _emu_to_px(int(getattr(to, "rowOff", 0) or 0))
                    except Exception:
                        pass
                else:
                    ext = getattr(a, "ext", None)
                    if ext:
                        x1 = x0 + _emu_to_px(getattr(ext, "cx", 0) or 0)
                        y1 = y0 + _emu_to_px(getattr(ext, "cy", 0) or 0)
                    else:
                        c1 = c0 + 8
                        r1 = r0 + 18
                        x1, y1 = _cell_xy_px(max(c1, c0 + 1), max(r1, r0 + 1))

                best_crop = None
                best_score = -1.0
                for img in page_imgs:
                    try:
                        img_w, img_h = img.size
                        if img_w <= 0 or img_h <= 0:
                            continue
                        scale_x = float(img_w) / float(sheet_w_px)
                        scale_y = float(img_h) / float(sheet_h_px)

                        px0 = int(max(min(x0 * scale_x, img_w - 1), 0))
                        py0 = int(max(min(y0 * scale_y, img_h - 1), 0))
                        px1 = int(max(min(x1 * scale_x, img_w), px0 + 1))
                        py1 = int(max(min(y1 * scale_y, img_h), py0 + 1))

                        pad = 40
                        px0 = max(px0 - pad, 0)
                        py0 = max(py0 - pad, 0)
                        px1 = min(px1 + pad, img_w)
                        py1 = min(py1 + pad, img_h)

                        crop = img.crop((px0, py0, px1, py1))
                        crop = _tighten_to_nonwhite(crop)
                        cw, chh = crop.size
                        if cw < 160 or chh < 160:
                            continue

                        try:
                            stat = PILImageStat.Stat(crop)
                            std = sum(stat.stddev) / max(len(stat.stddev), 1)
                        except Exception:
                            std = 0.0

                        score = float(std) + (float(cw * chh) / 1_000_000.0)
                        if score > best_score:
                            best_score = score
                            best_crop = crop
                    except Exception:
                        continue

                if best_crop is None or best_score < 5.0:
                    continue

                crop = best_crop
                cw, chh = crop.size

                fig_num += 1
                added += 1

                buf = io.BytesIO()
                crop.save(buf, format="PNG")
                img_bytes = buf.getvalue()
                if not img_bytes:
                    continue

                slide = prs.slides.add_slide(prs.slide_layouts[6])
                title_box = slide.shapes.add_textbox(Inches(0.5), Inches(0.25), Inches(9.0), Inches(0.5))
                title_frame = title_box.text_frame
                title_frame.text = f"{sheet_name} - {title}"
                title_para = title_frame.paragraphs[0]
                title_para.font.size = Pt(20)
                title_para.font.bold = True

                margin_l = 0.5
                margin_r = 0.5
                margin_top = 0.9
                margin_bottom = 0.5
                max_w = slide_w_in - margin_l - margin_r
                max_h = slide_h_in - margin_top - margin_bottom
                s = min(max_w / float(cw), max_h / float(chh))
                w_in = float(cw) * s
                h_in = float(chh) * s
                left = margin_l + max((max_w - w_in) / 2.0, 0.0)
                top = margin_top + max((max_h - h_in) / 2.0, 0.0)

                stream = io.BytesIO(img_bytes)
                stream.seek(0)
                slide.shapes.add_picture(stream, Inches(left), Inches(top), width=Inches(w_in), height=Inches(h_in))
            except Exception:
                continue

        return fig_num


    def _add_rendered_figure_slides_from_page_image(self, prs: Presentation, sheet_name: str, page_img, fig_num: int) -> int:
        try:
            from PIL import ImageStat as PILImageStat
        except Exception:
            return fig_num

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

        try:
            img = page_img
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
            bands = _split_by_whitespace_gaps(row_runs, gap_min=50)
            if not bands:
                return fig_num

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
                cols = _split_by_whitespace_gaps(col_runs, gap_min=50)
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
                    # Removed upper bound on area so full-page charts are captured

                    density = float(nonwhite) / float(max(area, 1))
                    # Allow denser regions, e.g., for heavy text tables
                    if density > 0.90:
                        continue

                    regions.append((x0, y0, x1, y1))

            if not regions:
                return fig_num

            # Score and select best regions to avoid table fragments / strips
            scored = []
            for x0, y0, x1, y1 in regions:
                sx0 = int(x0 / scale)
                sy0 = int(y0 / scale)
                sx1 = int(x1 / scale)
                sy1 = int(y1 / scale)
                sx0 = max(sx0 - 10, 0)
                sy0 = max(sy0 - 10, 0)
                sx1 = min(sx1 + 10, img.size[0])
                sy1 = min(sy1 + 10, img.size[1])
                crop = img.crop((sx0, sy0, sx1, sy1))

                cw, ch = crop.size
                if cw <= 0 or ch <= 0:
                    continue
                ar = float(cw) / float(ch)
                if ar < 0.35 or ar > 3.5:
                    continue

                try:
                    stat = PILImageStat.Stat(crop)
                    std = sum(stat.stddev) / max(len(stat.stddev), 1)
                except Exception:
                    std = 0.0

                # Region density already filtered; prefer higher color variance
                score = std
                scored.append((score, crop))

            if not scored:
                return fig_num

            scored.sort(key=lambda t: t[0], reverse=True)
            # Take all good regions found by the vision algorithm
            best = [c for _s, c in scored]

            for crop in best:
                fig_num += 1
                buf = io.BytesIO()
                crop.save(buf, format="PNG")
                crop_bytes = buf.getvalue()
                if not crop_bytes:
                    continue

                slide = prs.slides.add_slide(prs.slide_layouts[6])

                title_box = slide.shapes.add_textbox(Inches(0.5), Inches(0.25), Inches(9.0), Inches(0.5))
                title_frame = title_box.text_frame
                title_frame.text = f"{sheet_name} - Figure {fig_num}"
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
            return fig_num

        return fig_num
