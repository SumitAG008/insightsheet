"""
Excel to PowerPoint Converter - Enhanced Windows Version
Uses Excel COM automation to export actual chart images with complete data extraction.
Requires: pywin32 (pip install pywin32), Windows OS, Microsoft Excel
"""

import os
import sys
import tempfile
import shutil
from typing import Tuple, BinaryIO, Union
import io
import logging

try:
    import win32com.client
    from win32com.client import constants as c
    WIN32_AVAILABLE = True
except ImportError:
    WIN32_AVAILABLE = False

from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.enum.text import PP_ALIGN
from pptx.dml.color import RGBColor
import pandas as pd
import openpyxl

logger = logging.getLogger(__name__)


class WindowsExcelToPPTConverter:
    """Enhanced Windows converter with complete data table extraction."""

    def __init__(self):
        if not WIN32_AVAILABLE:
            raise ImportError("pywin32 is required for Windows Excel conversion. Install with: pip install pywin32")

        self.excel = None
        self.workbook = None
        self.workbook_openpyxl = None
        self.temp_dir = None
        self.temp_excel_path = None

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        self.cleanup()

    def cleanup(self):
        """Close Excel and cleanup temp files."""
        try:
            if self.workbook:
                self.workbook.Close(SaveChanges=False)
            if self.excel:
                self.excel.Quit()
        except:
            pass

        try:
            if self.temp_dir and os.path.exists(self.temp_dir):
                shutil.rmtree(self.temp_dir)
        except:
            pass

    async def convert_to_ppt(
        self,
        file_data: Union[BinaryIO, bytes],
        filename: str
    ) -> bytes:
        """
        Convert Excel file to PowerPoint using Windows COM automation.

        Args:
            file_data: File binary data
            filename: Original filename

        Returns:
            bytes: PowerPoint file data
        """
        try:
            # Create temp directory
            self.temp_dir = tempfile.mkdtemp()

            # Read file data
            if hasattr(file_data, 'read'):
                file_bytes = file_data.read()
            else:
                file_bytes = file_data

            # Save to temp file (COM requires file path)
            self.temp_excel_path = os.path.join(self.temp_dir, filename)
            with open(self.temp_excel_path, 'wb') as f:
                f.write(file_bytes)

            logger.info(f"Processing Excel file with Windows COM: {filename}")

            # Load Excel with COM
            self.load_excel()

            # Also load with openpyxl for better data access
            self.workbook_openpyxl = openpyxl.load_workbook(self.temp_excel_path, data_only=True)

            # Create PowerPoint presentation
            prs = Presentation()
            prs.slide_width = Inches(10)
            prs.slide_height = Inches(7.5)

            # Add title slide
            self._add_title_slide(prs, filename)

            # Process each worksheet
            for sheet_idx in range(1, self.workbook.Worksheets.Count + 1):
                worksheet = self.workbook.Worksheets(sheet_idx)
                self._process_sheet(prs, worksheet)

            # Save to bytes
            output = io.BytesIO()
            prs.save(output)
            output.seek(0)

            logger.info(f"Successfully converted {filename} to PowerPoint")
            return output.read()

        except Exception as e:
            logger.error(f"Error converting file with Windows COM: {str(e)}")
            raise Exception(f"Windows Excel to PPT conversion failed: {str(e)}")
        finally:
            self.cleanup()

    def load_excel(self):
        """Load Excel using COM automation."""
        try:
            self.excel = win32com.client.Dispatch("Excel.Application")
            self.excel.Visible = False
            self.excel.DisplayAlerts = False
            self.workbook = self.excel.Workbooks.Open(self.temp_excel_path)
            logger.info(f"Loaded Excel file with {self.workbook.Worksheets.Count} sheet(s)")
        except Exception as e:
            logger.error(f"Error loading Excel file: {e}")
            raise

    def _add_title_slide(self, prs: Presentation, filename: str):
        """Add title slide to presentation."""
        slide_layout = prs.slide_layouts[0]
        slide = prs.slides.add_slide(slide_layout)
        slide.shapes.title.text = "Excel Charts Presentation"
        if len(slide.placeholders) > 1:
            slide.placeholders[1].text = f"Generated from: {filename}"

    def _add_section_slide(self, prs: Presentation, sheet_name: str, chart_count: int):
        """Add section header slide for each sheet."""
        slide_layout = prs.slide_layouts[6]  # Blank layout
        slide = prs.slides.add_slide(slide_layout)

        # Add title
        title_box = slide.shapes.add_textbox(Inches(1), Inches(2.5), Inches(8), Inches(1))
        title_frame = title_box.text_frame
        title_frame.text = f"Sheet: {sheet_name}"
        title_frame.paragraphs[0].font.size = Pt(44)
        title_frame.paragraphs[0].font.bold = True
        title_frame.paragraphs[0].alignment = PP_ALIGN.CENTER

        # Add summary
        summary_box = slide.shapes.add_textbox(Inches(2), Inches(4), Inches(6), Inches(1))
        summary_frame = summary_box.text_frame
        summary_frame.text = f"{chart_count} chart(s)"
        summary_frame.paragraphs[0].font.size = Pt(24)
        summary_frame.paragraphs[0].alignment = PP_ALIGN.CENTER

    def _export_chart_as_image(self, chart_object, chart_index: int, sheet_name: str) -> str:
        """Export chart as image file."""
        try:
            image_path = os.path.join(self.temp_dir, f"chart_{sheet_name}_{chart_index}.png")
            chart_object.Export(image_path)
            return image_path
        except Exception as e:
            logger.warning(f"Could not export chart as image: {e}")
            return None

    def _get_full_data_range(self, chart_object, sheet_name: str) -> pd.DataFrame:
        """Extract the FULL data range including headers, totals, and percentages."""
        try:
            # Try to get the source data range from the chart
            source_data = None
            try:
                source_data = chart_object.SourceData
                if source_data:
                    address = source_data.Address
                    logger.info(f"Chart source data range: {address}")
            except:
                pass

            # If we have source data range, extract it
            if source_data:
                try:
                    address = source_data.Address

                    # Parse the address to get cell range
                    if '!' in address:
                        range_part = address.split('!')[-1]
                    else:
                        range_part = address

                    # Remove $ signs
                    range_part = range_part.replace('$', '')

                    # Use openpyxl to get the data with formulas evaluated
                    ws_openpyxl = self.workbook_openpyxl[sheet_name]

                    # Get all data from the range
                    data_rows = []
                    for row in ws_openpyxl[range_part]:
                        row_data = []
                        for cell in row:
                            value = cell.value
                            # Format numbers nicely
                            if isinstance(value, float):
                                # Check if it's a percentage (between 0 and 1)
                                if 0 <= value <= 1 and cell.number_format and '%' in str(cell.number_format):
                                    row_data.append(f"{value*100:.1f}%")
                                else:
                                    row_data.append(f"{value:.2f}" if value % 1 != 0 else int(value))
                            else:
                                row_data.append(value if value is not None else "")
                        data_rows.append(row_data)

                    if data_rows:
                        # First row is headers
                        headers = [str(h) if h else f"Col{i+1}" for i, h in enumerate(data_rows[0])]

                        # Rest is data
                        if len(data_rows) > 1:
                            df = pd.DataFrame(data_rows[1:], columns=headers)
                            return df

                except Exception as e:
                    logger.warning(f"Error extracting from source range: {e}")

            # Fallback: Get data from series
            return self._get_chart_series_data(chart_object)

        except Exception as e:
            logger.warning(f"Could not extract full data range: {e}")
            return pd.DataFrame()

    def _get_chart_series_data(self, chart_object) -> pd.DataFrame:
        """Fallback method to get data from chart series."""
        try:
            data = {}
            categories = []

            for series_idx in range(1, chart_object.SeriesCollection().Count + 1):
                series = chart_object.SeriesCollection(series_idx)
                series_name = series.Name if series.Name else f"Series {series_idx}"

                try:
                    values = list(series.Values)
                    data[series_name] = values

                    if series_idx == 1 and hasattr(series, 'XValues'):
                        try:
                            categories = list(series.XValues)
                        except:
                            categories = list(range(1, len(values) + 1))
                except:
                    pass

            if data:
                if categories and len(categories) == len(next(iter(data.values()))):
                    df = pd.DataFrame(data, index=categories)
                else:
                    df = pd.DataFrame(data)
                return df

        except Exception as e:
            logger.warning(f"Could not extract series data: {e}")

        return pd.DataFrame()

    def _add_table_to_slide(self, slide, df: pd.DataFrame, left: float, top: float, width: float):
        """Add a nicely formatted data table to a slide."""
        if df.empty:
            return

        rows, cols = df.shape
        if rows == 0 or cols == 0:
            return

        # Limit table size to fit on slide
        max_rows = min(rows, 15)
        max_cols = min(cols, 12)

        # Calculate table dimensions
        height = Inches(min(0.25 * (max_rows + 1), 2.5))

        # Add table
        table = slide.shapes.add_table(
            rows=max_rows + 1,  # +1 for header row
            cols=max_cols,
            left=Inches(left),
            top=Inches(top),
            width=Inches(width),
            height=height
        ).table

        # Add column headers
        for col_idx in range(max_cols):
            if col_idx < len(df.columns):
                cell = table.cell(0, col_idx)
                header_text = str(df.columns[col_idx])
                cell.text = header_text[:25]  # Limit text length

                # Format header
                cell.text_frame.paragraphs[0].font.size = Pt(9)
                cell.text_frame.paragraphs[0].font.bold = True
                cell.text_frame.paragraphs[0].alignment = PP_ALIGN.CENTER

                # Set cell background color (light gray)
                cell.fill.solid()
                cell.fill.fore_color.rgb = RGBColor(220, 220, 220)

        # Add data rows
        for row_idx in range(max_rows):
            if row_idx < len(df):
                for col_idx in range(max_cols):
                    if col_idx < len(df.columns):
                        cell = table.cell(row_idx + 1, col_idx)
                        value = df.iloc[row_idx, col_idx]

                        # Format the cell value
                        if pd.notna(value):
                            cell.text = str(value)[:20]
                        else:
                            cell.text = ""

                        # Format text
                        cell.text_frame.paragraphs[0].font.size = Pt(8)

                        # Right align numbers, left align text
                        if isinstance(value, (int, float)):
                            cell.text_frame.paragraphs[0].alignment = PP_ALIGN.RIGHT
                        else:
                            cell.text_frame.paragraphs[0].alignment = PP_ALIGN.LEFT

    def _add_chart_slide(self, prs: Presentation, sheet_name: str, chart_object,
                         chart_index: int, total_charts: int):
        """Add a slide with chart image and complete data table."""
        slide_layout = prs.slide_layouts[6]  # Blank layout
        slide = prs.slides.add_slide(slide_layout)

        # Add title
        title_box = slide.shapes.add_textbox(Inches(0.5), Inches(0.2), Inches(9), Inches(0.5))
        title_frame = title_box.text_frame
        title_frame.text = f"{sheet_name} - Chart {chart_index}/{total_charts}"
        title_frame.paragraphs[0].font.size = Pt(24)
        title_frame.paragraphs[0].font.bold = True

        # Export and add chart image
        image_path = self._export_chart_as_image(chart_object, chart_index, sheet_name)
        if image_path and os.path.exists(image_path):
            try:
                left = Inches(1.5)
                top = Inches(0.8)
                width = Inches(7)
                slide.shapes.add_picture(image_path, left, top, width=width)
                logger.info(f"Added chart image: {sheet_name} - Chart {chart_index}/{total_charts}")
            except Exception as e:
                logger.warning(f"Could not add chart image: {e}")

        # Get and add FULL data table
        logger.info(f"Extracting data table for chart {chart_index}...")
        df = self._get_full_data_range(chart_object, sheet_name)

        if not df.empty:
            # Add data label
            label_box = slide.shapes.add_textbox(Inches(0.5), Inches(4.5), Inches(9), Inches(0.3))
            label_frame = label_box.text_frame
            label_frame.text = "Chart Data (including all columns, totals, and percentages):"
            label_frame.paragraphs[0].font.size = Pt(11)
            label_frame.paragraphs[0].font.bold = True

            # Add table
            self._add_table_to_slide(slide, df, left=0.5, top=4.9, width=9)
            logger.info(f"Added data table with {len(df.columns)} columns and {len(df)} rows")
        else:
            logger.warning(f"No data table extracted for chart {chart_index}")

    def _process_sheet(self, prs: Presentation, worksheet):
        """Process a single Excel sheet."""
        sheet_name = worksheet.Name
        logger.info(f"Processing sheet: {sheet_name}")

        chart_count = worksheet.ChartObjects().Count

        if chart_count == 0:
            logger.info(f"No charts found in sheet: {sheet_name}")
            return

        # Add section slide
        self._add_section_slide(prs, sheet_name, chart_count)

        # Process each chart
        for chart_idx in range(1, chart_count + 1):
            try:
                chart_obj = worksheet.ChartObjects(chart_idx)
                chart = chart_obj.Chart
                self._add_chart_slide(prs, sheet_name, chart, chart_idx, chart_count)
            except Exception as e:
                logger.error(f"Error processing chart {chart_idx}: {e}")


def is_windows_converter_available() -> bool:
    """Check if Windows COM converter is available."""
    if not WIN32_AVAILABLE:
        return False

    if sys.platform != 'win32':
        return False

    # Try to create Excel instance
    try:
        excel = win32com.client.Dispatch("Excel.Application")
        excel.Quit()
        return True
    except:
        return False
