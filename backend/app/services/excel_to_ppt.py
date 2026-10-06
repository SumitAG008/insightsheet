"""
Excel to PowerPoint Service for InsightSheet-lite
Converts Excel files to professional PowerPoint presentations

CHANGELOG (fixes applied):
- FIX 1: Light royal colour scheme instead of dark backgrounds
- FIX 2: Trim trailing empty columns from tables (no more "Col10" overflow slides)
- FIX 3: Smarter header detection - skip title rows, detect actual column headers
- FIX 4: Actually call _add_chart_slides() to create native editable PPT charts
- FIX 5: Read Excel chart metadata and rebuild as native python-pptx charts
- FIX 6: Limit table to actual used columns (no fixed 10-col chunks)
- FIX 7: Improved _wipe_cells_for_vision() to actually hide cell text
- FIX 8: Reduced slide count by eliminating empty overflow slides
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
        # FIX 1: Light royal eye-soothing colour palette
        self.theme_colors = {
            'primary': RGBColor(67, 97, 238),       # Royal blue #4361EE
            'secondary': RGBColor(114, 137, 218),    # Soft periwinkle #7289DA
            'accent': RGBColor(76, 110, 245),        # Bright royal #4C6EF5
            'success': RGBColor(16, 185, 129),       # Green
            'warning': RGBColor(245, 158, 11),       # Orange
            'dark': RGBColor(30, 58, 95),            # Navy text #1E3A5F
            'light': RGBColor(238, 242, 255),        # Soft lavender bg #EEF2FF
            'section_bg': RGBColor(238, 242, 255),   # Section slide bg #EEF2FF
            'title_bg': RGBColor(238, 242, 255),     # Title slide bg #EEF2FF
            'white': RGBColor(255, 255, 255),
            'text_secondary': RGBColor(100, 116, 139),  # Slate gray
            'table_alt_row': RGBColor(241, 245, 249),   # Very light gray #F1F5F9
            'table_border': RGBColor(226, 232, 240),     # Light border #E2E8F0
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
        """
        try:
            excel_data = excel_file.read() if hasattr(excel_file, 'read') else excel_file
            workbook = openpyxl.load_workbook(io.BytesIO(excel_data), data_only=True)

            prs = Presentation()
            prs.slide_width = Inches(10)
            prs.slide_height = Inches(5.625)

            try:
                cp = prs.core_properties
                cp.author = author_name or "meldra"
                cp.last_modified_by = last_modified_by or (author_name or "meldra")
                now = datetime.utcnow()
                cp.created = now
                cp.modified = now
            except Exception:
                pass

            # Add title slide
            self._add_title_slide(prs, filename)

            # --- Render charts via vision pipeline ---
            rendered_pages = None
            vision_excel_data = excel_data
            try:
                vision_excel_data = self._wipe_cells_for_vision(excel_data)
                pdf_bytes, _ = convert_spreadsheet_to_pdf_bytes(vision_excel_data, filename)
                if pdf_bytes:
                    rendered_pages = self._render_pdf_pages_to_images(pdf_bytes)
            except Exception as e:
                logger.warning(f"PDF rendering failed: {e}")
                rendered_pages = None

            if not rendered_pages:
                try:
                    png_pages, _msg = convert_spreadsheet_to_png_images(vision_excel_data, filename)
                    if png_pages:
                        rendered_pages = png_pages
                except Exception:
                    rendered_pages = None

            # --- Process each worksheet ---
            fig_num = 0

            for sheet_idx, sheet_name in enumerate(workbook.sheetnames):
                logger.info(f"Processing sheet: {sheet_name}")
                worksheet = workbook[sheet_name]

                # Extract data tables
                tables = self._extract_worksheet_data(worksheet)

                if not tables:
                    logger.warning(f"Skipping empty sheet: {sheet_name}")
                    continue

                # Analyze largest table
                largest_table = max(tables, key=lambda t: len(t['rows']))
                analysis = self._analyze_data(largest_table)

                # FIX: Count actual Excel charts for this sheet
                excel_charts = getattr(worksheet, "_charts", None) or []
                analysis['chart_candidates'] = excel_charts

                # Add section slide
                self._add_section_slide(prs, sheet_name, analysis)

                # Add data table slides (with trimming)
                for idx, t_data in enumerate(tables):
                    if t_data['headers'] and t_data['rows']:
                        t_name = sheet_name if len(tables) == 1 else f"{sheet_name} (Table {idx+1})"
                        self._add_data_table_slide(prs, t_name, t_data)

                # FIX 4: Actually create native charts from Excel chart metadata
                if excel_charts:
                    self._add_native_chart_slides(prs, sheet_name, worksheet, excel_charts)

                # Add embedded images (pasted charts/screenshots)
                self._add_embedded_image_slides(prs, sheet_name, worksheet)

            # Process rendered pages for visual chart extraction (fallback)
            if rendered_pages:
                logger.info(f"Processing {len(rendered_pages)} rendered pages for visual elements")
                for p_idx, p in enumerate(rendered_pages):
                    fig_num = self._add_rendered_figure_slides_from_page_image(
                        prs, f"Visual Extract", p, fig_num
                    )

            # Save
            output = io.BytesIO()
            prs.save(output)
            output.seek(0)
            return output.read()

        except Exception as e:
            logger.error(f"Error converting Excel to PPT: {str(e)}")
            raise Exception(f"Excel to PPT conversion failed: {str(e)}")

    # ================================================================
    # FIX 1: Light royal colour scheme for title & section slides
    # ================================================================

    def _add_title_slide(self, prs: Presentation, filename: str):
        """Add title slide - light royal background"""
        slide = prs.slides.add_slide(prs.slide_layouts[6])

        # FIX: Light lavender background instead of dark
        background = slide.background
        fill = background.fill
        fill.solid()
        fill.fore_color.rgb = self.theme_colors['title_bg']

        # Title - navy text on light bg
        title_box = slide.shapes.add_textbox(
            Inches(0.5), Inches(2), Inches(9), Inches(1)
        )
        title_frame = title_box.text_frame
        title_frame.text = "Excel Data Presentation"
        title_para = title_frame.paragraphs[0]
        title_para.font.size = Pt(40)
        title_para.font.bold = True
        title_para.font.color.rgb = self.theme_colors['dark']  # Navy text
        title_para.alignment = PP_ALIGN.CENTER

        # Subtitle
        subtitle_box = slide.shapes.add_textbox(
            Inches(0.5), Inches(3.2), Inches(9), Inches(0.6)
        )
        subtitle_frame = subtitle_box.text_frame
        subtitle_frame.text = filename.replace('.xlsx', '').replace('.xls', '')
        subtitle_para = subtitle_frame.paragraphs[0]
        subtitle_para.font.size = Pt(24)
        subtitle_para.font.color.rgb = self.theme_colors['primary']  # Royal blue
        subtitle_para.alignment = PP_ALIGN.CENTER

        # Footer
        footer_box = slide.shapes.add_textbox(
            Inches(0.5), Inches(4.5), Inches(9), Inches(0.5)
        )
        footer_frame = footer_box.text_frame
        footer_frame.text = f"Generated by InsightSheet-lite\n{datetime.now().strftime('%Y-%m-%d %H:%M')}"
        footer_para = footer_frame.paragraphs[0]
        footer_para.font.size = Pt(14)
        footer_para.font.color.rgb = self.theme_colors['text_secondary']
        footer_para.alignment = PP_ALIGN.CENTER

    def _add_section_slide(self, prs: Presentation, sheet_name: str, analysis: Dict):
        """Add section slide - light royal background"""
        slide = prs.slides.add_slide(prs.slide_layouts[6])

        # FIX: Light lavender background instead of dark slate
        background = slide.background
        fill = background.fill
        fill.solid()
        fill.fore_color.rgb = self.theme_colors['section_bg']

        # Section title - navy text
        title_box = slide.shapes.add_textbox(
            Inches(0.5), Inches(2.5), Inches(9), Inches(1)
        )
        title_frame = title_box.text_frame
        title_frame.text = sheet_name
        title_para = title_frame.paragraphs[0]
        title_para.font.size = Pt(48)
        title_para.font.bold = True
        title_para.font.color.rgb = self.theme_colors['dark']  # Navy text
        title_para.alignment = PP_ALIGN.CENTER

        # Stats - royal blue accent
        charts_count = len(analysis.get('chart_candidates', []))
        stats_parts = []
        if charts_count > 0:
            stats_parts.append(f"{charts_count} chart(s)")
        stats_parts.append(f"{analysis['row_count']} rows")
        stats_parts.append(f"{analysis['column_count']} columns")
        stats_text = " \u2022 ".join(stats_parts)

        stats_box = slide.shapes.add_textbox(
            Inches(0.5), Inches(3.8), Inches(9), Inches(0.5)
        )
        stats_frame = stats_box.text_frame
        stats_frame.text = stats_text
        stats_para = stats_frame.paragraphs[0]
        stats_para.font.size = Pt(20)
        stats_para.font.color.rgb = self.theme_colors['primary']  # Royal blue
        stats_para.alignment = PP_ALIGN.CENTER

    # ================================================================
    # FIX 2 & 3: Smarter table extraction and trimming
    # ================================================================

    def _extract_worksheet_data(self, worksheet) -> list:
        """Extract data from worksheet into separate tables with smart header detection."""
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
                    # FIX 3: Smarter header detection
                    # Count how many cells actually have values
                    non_empty_count = sum(1 for h in row if h is not None and str(h).strip())
                    total_cells = len(row)

                    # If only 1-2 cells have values in a wide row, it's likely a title row, not headers
                    if non_empty_count <= 2 and total_cells > 4:
                        # This is a title/label row - store it but keep looking for real headers
                        current_table['title'] = str(row[0]) if row[0] else ''
                        # Don't set is_first_row = False yet, next row might be the real header
                    else:
                        # FIX: Use actual cell values, only fallback to Col{i} for truly None cells
                        # But also skip generating Col{i} for trailing None cells
                        headers = []
                        last_non_empty = -1
                        for i, h in enumerate(row):
                            if h is not None and str(h).strip():
                                last_non_empty = i
                        
                        for i, h in enumerate(row):
                            if i > last_non_empty:
                                break  # FIX 2: Don't include trailing empty columns
                            if h is not None and str(h).strip():
                                headers.append(str(h))
                            else:
                                headers.append(f'Col{i}')

                        current_table['headers'] = headers
                        is_first_row = False
                else:
                    # FIX 2: Trim row to match header count (no trailing empties)
                    row_data = list(row[:len(current_table['headers'])])
                    current_table['rows'].append(row_data)

        if current_table['headers'] or current_table['rows']:
            has_data = any(
                str(cell).strip()
                for row in current_table['rows']
                for cell in row
                if cell is not None
            )
            if has_data:
                tables.append(current_table)

        # FIX 2: Post-process - trim trailing empty columns from each table
        valid_tables = []
        for table in tables:
            table = self._trim_empty_columns(table)
            has_data = any(
                str(cell).strip()
                for row in table['rows']
                for cell in row
                if cell is not None
            )
            if has_data and table['headers']:
                valid_tables.append(table)

        return valid_tables

    def _trim_empty_columns(self, table: Dict) -> Dict:
        """FIX 2: Remove trailing columns that are completely empty across all rows."""
        headers = table.get('headers', [])
        rows = table.get('rows', [])
        if not headers or not rows:
            return table

        num_cols = len(headers)
        # Find the last column that has any non-empty data
        last_used_col = -1
        for col_idx in range(num_cols):
            # Check header
            if headers[col_idx] and not headers[col_idx].startswith('Col'):
                last_used_col = col_idx
                continue
            # Check data rows
            for row in rows:
                if col_idx < len(row) and row[col_idx] is not None and str(row[col_idx]).strip():
                    last_used_col = col_idx
                    break

        if last_used_col < 0:
            return table

        # Trim
        trim_to = last_used_col + 1
        table['headers'] = headers[:trim_to]
        table['rows'] = [row[:trim_to] for row in rows]
        return table

    # ================================================================
    # FIX 6: Table slide with smart column limits (no empty overflow)
    # ================================================================

    def _add_data_table_slide(self, prs: Presentation, sheet_name: str, data: Dict):
        """Add data table slide(s) with smart column handling."""
        headers = list(data.get('headers') or [])
        rows = list(data.get('rows') or [])
        if not headers:
            return

        rows_per_slide = 18
        cols_per_slide = 10

        total_rows = len(rows)
        total_cols = len(headers)

        row_start = 0
        while row_start < max(total_rows, 1):
            row_end = min(row_start + rows_per_slide, total_rows)
            col_start = 0
            while col_start < total_cols:
                col_end = min(col_start + cols_per_slide, total_cols)

                # FIX 6: Skip this column chunk if ALL columns in range are empty
                chunk_has_data = False
                for c_i in range(col_start, col_end):
                    if headers[c_i] and not headers[c_i].startswith('Col'):
                        chunk_has_data = True
                        break
                    for row in rows[row_start:row_end]:
                        if c_i < len(row) and row[c_i] is not None and str(row[c_i]).strip():
                            chunk_has_data = True
                            break
                    if chunk_has_data:
                        break

                if not chunk_has_data:
                    col_start += cols_per_slide
                    continue

                slide = prs.slides.add_slide(prs.slide_layouts[6])

                # Title
                title_box = slide.shapes.add_textbox(
                    Inches(0.5), Inches(0.3), Inches(9), Inches(0.5)
                )
                title_frame = title_box.text_frame
                title_frame.text = f"{sheet_name} - Data Overview"
                title_para = title_frame.paragraphs[0]
                title_para.font.size = Pt(24)
                title_para.font.bold = True
                title_para.font.color.rgb = self.theme_colors['dark']

                # Subtitle with row/col info
                sub_box = slide.shapes.add_textbox(
                    Inches(0.5), Inches(0.72), Inches(9), Inches(0.3)
                )
                sub_frame = sub_box.text_frame
                shown_rows = f"rows {row_start + 1}-{row_end}" if total_rows else "no data rows"
                sub_frame.text = f"Showing {shown_rows}"
                sub_para = sub_frame.paragraphs[0]
                sub_para.font.size = Pt(11)
                sub_para.font.color.rgb = self.theme_colors['text_secondary']

                page_rows = rows[row_start:row_end] if total_rows else []
                rows_count = (len(page_rows) if page_rows else 0) + 1
                cols_count = max(col_end - col_start, 1)

                table = slide.shapes.add_table(
                    rows_count, cols_count,
                    Inches(0.4), Inches(1.05),
                    Inches(9.2), Inches(4.2)
                ).table

                for col_idx in range(cols_count):
                    table.columns[col_idx].width = Inches(9.2 / cols_count)

                # Header row - royal blue
                for col_idx in range(cols_count):
                    cell = table.cell(0, col_idx)
                    cell.text = str(headers[col_start + col_idx])
                    cell.fill.solid()
                    cell.fill.fore_color.rgb = self.theme_colors['primary']
                    paragraph = cell.text_frame.paragraphs[0]
                    paragraph.font.size = Pt(10)
                    paragraph.font.bold = True
                    paragraph.font.color.rgb = self.theme_colors['white']

                # Data rows with alternating shading
                for r_i, row in enumerate(page_rows, start=1):
                    for c_i in range(cols_count):
                        cell = table.cell(r_i, c_i)
                        src_idx = col_start + c_i
                        value = row[src_idx] if src_idx < len(row) else ''
                        cell.text = str(value) if value is not None else ''

                        # Alternating row colours
                        if r_i % 2 == 0:
                            cell.fill.solid()
                            cell.fill.fore_color.rgb = self.theme_colors['table_alt_row']

                        paragraph = cell.text_frame.paragraphs[0]
                        paragraph.font.size = Pt(9)
                        paragraph.font.color.rgb = self.theme_colors['dark']

                col_start += cols_per_slide
            row_start += rows_per_slide

    # ================================================================
    # FIX 4 & 5: Native chart creation from Excel chart metadata
    # ================================================================

    def _add_native_chart_slides(self, prs: Presentation, sheet_name: str,
                                  worksheet, excel_charts: list):
        """
        FIX 4: Read Excel chart metadata via openpyxl and recreate as
        native editable python-pptx charts. Fully generic — works with any spreadsheet.
        """
        for ch_idx, chart_obj in enumerate(excel_charts):
            try:
                chart_class = chart_obj.__class__.__name__
                pptx_chart_type = self._map_chart_type(chart_class)
                if pptx_chart_type is None:
                    logger.info(f"Unsupported chart type: {chart_class}, skipping native render")
                    continue

                # Read barDir from actual chart object for BarChart
                bar_dir = getattr(chart_obj, 'barDir', None)
                grouping = getattr(chart_obj, 'grouping', None)

                title_text = self._extract_chart_title(chart_obj, ch_idx + 1)

                series_data = self._extract_chart_series(chart_obj, worksheet)
                if not series_data:
                    logger.warning(f"No series data for chart {ch_idx + 1} in {sheet_name}")
                    continue

                self._build_chart_slide(prs, sheet_name, title_text,
                                        pptx_chart_type, series_data, chart_class,
                                        bar_dir=bar_dir, grouping=grouping)

            except Exception as e:
                logger.warning(f"Failed to create native chart {ch_idx + 1} in {sheet_name}: {e}")
                continue

    def _map_chart_type(self, class_name: str):
        """Map openpyxl chart class name to python-pptx chart type."""
        mapping = {
            'BarChart': XL_CHART_TYPE.BAR_CLUSTERED,
            'BarChart3D': XL_CHART_TYPE.BAR_CLUSTERED,
            'LineChart': XL_CHART_TYPE.LINE,
            'LineChart3D': XL_CHART_TYPE.LINE,
            'PieChart': XL_CHART_TYPE.PIE,
            'PieChart3D': XL_CHART_TYPE.PIE,
            'AreaChart': XL_CHART_TYPE.AREA,
            'AreaChart3D': XL_CHART_TYPE.AREA,
            'ScatterChart': XL_CHART_TYPE.XY_SCATTER,
            'DoughnutChart': XL_CHART_TYPE.DOUGHNUT,
            'RadarChart': XL_CHART_TYPE.RADAR,
        }
        return mapping.get(class_name)

    def _extract_chart_title(self, chart_obj, fallback_idx: int) -> str:
        """Extract title text from an openpyxl chart object."""
        try:
            t = getattr(chart_obj, "title", None)
            if t is None:
                return f"Chart {fallback_idx}"
            tx = getattr(t, "tx", None) if hasattr(t, "tx") else t
            if tx is None:
                return f"Chart {fallback_idx}"
            # Try rich text
            rich = getattr(tx, "rich", None)
            if rich and hasattr(rich, "p"):
                parts = []
                for p in rich.p:
                    for r in (p.r or []):
                        if r.t:
                            parts.append(r.t)
                if parts:
                    return " ".join(parts)
            # Try strRef
            str_ref = getattr(tx, "strRef", None)
            if str_ref and str_ref.strCache and str_ref.strCache.pt:
                return str_ref.strCache.pt[0].v
        except Exception:
            pass
        return f"Chart {fallback_idx}"

    def _extract_chart_series(self, chart_obj, worksheet) -> list:
        """
        Generic extraction of series data from ANY openpyxl chart object.
        Handles: BarChart, LineChart, PieChart, AreaChart, ScatterChart, DoughnutChart, etc.
        Returns list of dicts: [{'name': str, 'categories': [...], 'values': [...]}]
        """
        is_scatter = chart_obj.__class__.__name__ == 'ScatterChart'
        series_list = []

        try:
            for s in chart_obj.series:
                # --- Series name ---
                name = "Series"
                try:
                    tx = getattr(s, "tx", None)
                    if tx:
                        str_ref = getattr(tx, "strRef", None)
                        if str_ref and str_ref.strCache and str_ref.strCache.pt:
                            name = str_ref.strCache.pt[0].v
                except Exception:
                    pass

                # --- Extract values ---
                values = []
                if is_scatter:
                    # Scatter charts use yVal for values
                    try:
                        yval = getattr(s, "yVal", None)
                        if yval and hasattr(yval, "numRef") and yval.numRef and yval.numRef.numCache:
                            values = [float(pt.v) for pt in yval.numRef.numCache.pt if pt.v is not None]
                    except Exception:
                        pass
                else:
                    try:
                        val_ref = getattr(s, "val", None)
                        if val_ref and hasattr(val_ref, "numRef") and val_ref.numRef:
                            cache = val_ref.numRef.numCache
                            if cache and cache.pt:
                                values = [float(pt.v) for pt in cache.pt if pt.v is not None]
                    except Exception:
                        pass

                # --- Extract categories ---
                categories = []
                if is_scatter:
                    # Scatter charts use xVal for categories (numeric x-axis)
                    try:
                        xval = getattr(s, "xVal", None)
                        if xval and hasattr(xval, "numRef") and xval.numRef and xval.numRef.numCache:
                            categories = [str(pt.v) for pt in xval.numRef.numCache.pt if pt.v is not None]
                    except Exception:
                        pass
                else:
                    try:
                        cat_ref = getattr(s, "cat", None) or getattr(chart_obj, "cat", None)
                        if cat_ref:
                            if hasattr(cat_ref, "strRef") and cat_ref.strRef:
                                cache = cat_ref.strRef.strCache
                                if cache and cache.pt:
                                    categories = [pt.v for pt in cache.pt]
                            elif hasattr(cat_ref, "numRef") and cat_ref.numRef:
                                cache = cat_ref.numRef.numCache
                                if cache and cache.pt:
                                    raw_cats = [pt.v for pt in cache.pt]
                                    # Auto-detect Excel date serial numbers and convert
                                    categories = self._maybe_convert_date_categories(raw_cats)
                    except Exception:
                        pass

                if values:
                    if not categories:
                        categories = [f"Item {i+1}" for i in range(len(values))]
                    series_list.append({
                        'name': name,
                        'categories': categories[:len(values)],
                        'values': values,
                    })
        except Exception as e:
            logger.warning(f"Error extracting chart series: {e}")

        return series_list

    def _maybe_convert_date_categories(self, raw_values: list) -> list:
        """
        If categories look like Excel date serial numbers (e.g. 43101 = Jan 2018),
        convert them to readable month-year labels. Otherwise return as-is.
        """
        from datetime import timedelta
        try:
            nums = [float(v) for v in raw_values if v is not None]
            if not nums:
                return [str(v) for v in raw_values]
            # Excel date serials for years 2000-2040 are roughly 36526 to 51135
            if all(20000 < n < 60000 for n in nums):
                base = datetime(1899, 12, 30)
                return [(base + timedelta(days=int(n))).strftime("%b %Y") for n in nums]
        except Exception:
            pass
        return [str(v) for v in raw_values]

    def _build_chart_slide(self, prs: Presentation, sheet_name: str,
                            title_text: str, chart_type, series_data: list,
                            chart_class: str, bar_dir: str = None,
                            grouping: str = None):
        """Build a slide with a native python-pptx chart. Fully generic."""
        slide = prs.slides.add_slide(prs.slide_layouts[6])

        # Title
        title_box = slide.shapes.add_textbox(
            Inches(0.5), Inches(0.25), Inches(9), Inches(0.5)
        )
        title_frame = title_box.text_frame
        title_frame.text = f"{sheet_name} - {title_text}"
        title_para = title_frame.paragraphs[0]
        title_para.font.size = Pt(20)
        title_para.font.bold = True
        title_para.font.color.rgb = self.theme_colors['dark']

        # Determine actual chart type from barDir and grouping
        actual_type = chart_type
        if chart_class in ('BarChart', 'BarChart3D'):
            if bar_dir == 'col':
                # "col" direction = vertical column chart
                if grouping == 'stacked':
                    actual_type = XL_CHART_TYPE.COLUMN_STACKED
                elif grouping == 'percentStacked':
                    actual_type = XL_CHART_TYPE.COLUMN_STACKED_100
                else:
                    actual_type = XL_CHART_TYPE.COLUMN_CLUSTERED
            else:
                # "bar" direction = horizontal bar chart
                if grouping == 'stacked':
                    actual_type = XL_CHART_TYPE.BAR_STACKED
                elif grouping == 'percentStacked':
                    actual_type = XL_CHART_TYPE.BAR_STACKED_100
                else:
                    actual_type = XL_CHART_TYPE.BAR_CLUSTERED

        # Build chart data
        chart_data = CategoryChartData()

        if series_data:
            chart_data.categories = series_data[0]['categories']
            for s in series_data:
                vals = s['values']
                cats_len = len(series_data[0]['categories'])
                if len(vals) < cats_len:
                    vals = vals + [0] * (cats_len - len(vals))
                elif len(vals) > cats_len:
                    vals = vals[:cats_len]
                chart_data.add_series(s['name'], vals)

        # Add chart to slide
        x, y, cx, cy = Inches(0.5), Inches(0.9), Inches(9), Inches(4.3)
        try:
            chart_shape = slide.shapes.add_chart(
                actual_type, x, y, cx, cy, chart_data
            )
            chart = chart_shape.chart

            # Show legend when multiple series
            chart.has_legend = len(series_data) > 1
            if chart.has_legend:
                chart.legend.include_in_layout = False

        except Exception as e:
            logger.warning(f"Failed to add chart: {e}")
            err_box = slide.shapes.add_textbox(Inches(1), Inches(2.5), Inches(8), Inches(1))
            err_frame = err_box.text_frame
            err_frame.text = f"Chart could not be rendered: {str(e)}"

    # ================================================================
    # Existing methods (kept intact with minor fixes)
    # ================================================================

    def _add_chart_slides(self, prs: Presentation, sheet_name: str, data: Dict, analysis: Dict):
        """Add chart slides for data visualization (fallback for sheets without Excel charts)"""
        chart_types = [
            (XL_CHART_TYPE.COLUMN_CLUSTERED, "Bar Chart"),
            (XL_CHART_TYPE.LINE, "Line Chart"),
            (XL_CHART_TYPE.PIE, "Pie Chart"),
        ]

        numeric_cols = analysis['numeric_columns'][:3]
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

        title_text = f"{sheet_name} - {chart_name} ({chart_num}/{total_charts})"
        title_box = slide.shapes.add_textbox(
            Inches(0.5), Inches(0.3), Inches(9), Inches(0.5)
        )
        title_frame = title_box.text_frame
        title_frame.text = title_text
        title_para = title_frame.paragraphs[0]
        title_para.font.size = Pt(24)
        title_para.font.bold = True
        title_para.font.color.rgb = self.theme_colors['dark']

        chart_data = CategoryChartData()
        data_map = {}
        for row in data['rows'][:50]:
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

        sorted_data = sorted(
            [(k, v['sum'] / v['count']) for k, v in data_map.items()],
            key=lambda x: x[1],
            reverse=True
        )[:15]

        categories = [c for c, _ in sorted_data]
        values = [round(v, 2) for _, v in sorted_data]

        chart_data.categories = categories
        chart_data.add_series(data['headers'][num_idx], values)

        x, y, cx, cy = Inches(0.5), Inches(1), Inches(9), Inches(4)
        chart = slide.shapes.add_chart(
            chart_type, x, y, cx, cy, chart_data
        ).chart

        chart.has_legend = (chart_type == XL_CHART_TYPE.PIE)

    def _add_statistics_slide(self, prs: Presentation, sheet_name: str, data: Dict, analysis: Dict):
        """Add statistics slide"""
        slide = prs.slides.add_slide(prs.slide_layouts[6])

        title_box = slide.shapes.add_textbox(
            Inches(0.5), Inches(0.3), Inches(9), Inches(0.5)
        )
        title_frame = title_box.text_frame
        title_frame.text = f"{sheet_name} - Statistical Summary"
        title_para = title_frame.paragraphs[0]
        title_para.font.size = Pt(28)
        title_para.font.bold = True
        title_para.font.color.rgb = self.theme_colors['dark']

        numeric_cols = analysis['numeric_columns'][:10]
        rows_count = len(numeric_cols) + 1
        cols_count = 6

        table = slide.shapes.add_table(
            rows_count, cols_count,
            Inches(1), Inches(1.2),
            Inches(8), Inches(4)
        ).table

        stat_headers = ['Column', 'Average', 'Min', 'Max', 'Std Dev', 'Count']
        for col_idx, header in enumerate(stat_headers):
            cell = table.cell(0, col_idx)
            cell.text = header
            cell.fill.solid()
            cell.fill.fore_color.rgb = self.theme_colors['primary']
            paragraph = cell.text_frame.paragraphs[0]
            paragraph.font.size = Pt(11)
            paragraph.font.bold = True
            paragraph.font.color.rgb = self.theme_colors['white']
            paragraph.alignment = PP_ALIGN.CENTER

        for row_idx, num_col in enumerate(numeric_cols):
            col_name = num_col['name']
            col_index = data['headers'].index(col_name)

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
        """Add one slide per embedded image in the worksheet."""
        images = getattr(worksheet, "_images", None) or []
        if not images:
            return

        slide_w_in = 10.0
        slide_h_in = 5.625

        for idx, img in enumerate(images, start=1):
            try:
                img_bytes = None
                data_fn = getattr(img, "_data", None)
                if callable(data_fn):
                    img_bytes = data_fn()

                if not img_bytes:
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

                title_box = slide.shapes.add_textbox(Inches(0.5), Inches(0.25), Inches(9.0), Inches(0.5))
                title_frame = title_box.text_frame
                title_frame.text = f"{sheet_name} - Figure {idx}"
                title_para = title_frame.paragraphs[0]
                title_para.font.size = Pt(20)
                title_para.font.bold = True
                title_para.font.color.rgb = self.theme_colors['dark']

                stream = io.BytesIO(img_bytes)
                stream.seek(0)

                try:
                    from PIL import Image as PILImage
                    with PILImage.open(io.BytesIO(img_bytes)) as pil:
                        w_px, h_px = pil.size
                except Exception:
                    w_px, h_px = 0, 0

                margin_l = 0.5
                margin_r = 0.5
                margin_top = 0.9
                margin_bottom = 0.5
                max_w = slide_w_in - margin_l - margin_r
                max_h = slide_h_in - margin_top - margin_bottom

                if w_px > 0 and h_px > 0:
                    scale = min(max_w / float(w_px), max_h / float(h_px))
                    w_in = float(w_px) * scale
                    h_in = float(h_px) * scale
                else:
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
                continue

    # ================================================================
    # FIX 7: Improved vision wipe - actually hide cell text
    # ================================================================

    def _wipe_cells_for_vision(self, excel_bytes: bytes) -> bytes:
        """
        Modifies xlsx to hide cell text (white font on white bg) and disable gridlines.
        Charts keep their own formatting so they remain visible.
        """
        import zipfile
        import re
        out_io = io.BytesIO()
        try:
            with zipfile.ZipFile(io.BytesIO(excel_bytes), 'r') as zin:
                with zipfile.ZipFile(out_io, 'w') as zout:
                    for item in zin.infolist():
                        content = zin.read(item.filename)

                        if item.filename.startswith('xl/worksheets/sheet') and item.filename.endswith('.xml'):
                            # Disable gridlines
                            content = re.sub(b'showGridLines="1"', b'showGridLines="0"', content)
                            if b'showGridLines=' not in content:
                                content = content.replace(b'<sheetView ', b'<sheetView showGridLines="0" ')

                        if item.filename == 'xl/styles.xml':
                            # FIX 7: Make all font colors white so cell text is invisible
                            # Replace all <color rgb="..."/> in font definitions with white
                            content = re.sub(
                                b'<color rgb="[0-9A-Fa-f]{8}"/>',
                                b'<color rgb="FFFFFFFF"/>',
                                content
                            )
                            # Also replace theme-based colors in fonts
                            content = re.sub(
                                b'<color theme="[0-9]+"',
                                b'<color rgb="FFFFFFFF"',
                                content
                            )

                        zout.writestr(item.filename, content, compress_type=zipfile.ZIP_DEFLATED)
            return out_io.getvalue()
        except Exception as e:
            logger.warning(f"Wipe cells failed: {e}")
            return excel_bytes

    def _render_pdf_pages_to_images(self, pdf_bytes: bytes) -> list:
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
                title_para.font.color.rgb = self.theme_colors['dark']

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

            active_rows = [y for y in range(h) if row_counts[y] > int(w * 0.03)]
            row_runs = _contiguous_runs(active_rows, min_len=8)
            bands = _split_by_whitespace_gaps(row_runs, gap_min=50)
            if not bands:
                return fig_num

            regions = []
            for by0, by1 in bands:
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

                    x0 = max(minx - 6, 0)
                    y0 = max(miny - 6, 0)
                    x1 = min(maxx + 7, w)
                    y1 = min(maxy + 7, h)

                    bw = x1 - x0
                    bh = y1 - y0
                    if bw < 90 or bh < 90:
                        continue

                    area = bw * bh
                    if area < 15000:
                        continue

                    regions.append((x0, y0, x1, y1))

            if not regions:
                return fig_num

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

                if std < 10.0:
                    continue

                score = std
                scored.append((score, crop))

            if not scored:
                return fig_num

            scored.sort(key=lambda t: t[0], reverse=True)
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
                title_para.font.color.rgb = self.theme_colors['dark']

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
