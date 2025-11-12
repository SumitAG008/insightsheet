"""
Excel to PPT Service Factory
Auto-detects and returns the best available Excel to PPT converter
"""
import sys
import logging

logger = logging.getLogger(__name__)


def get_excel_to_ppt_service():
    """
    Return the best available Excel to PPT service

    Priority:
    1. Windows COM (if on Windows with Excel) - Highest quality
    2. openpyxl-based (cross-platform fallback) - Good quality

    Returns:
        Service instance with convert_excel_to_ppt(file, filename) method
    """
    # Try Windows COM first (only on Windows)
    if sys.platform == 'win32':
        try:
            from app.services.excel_to_ppt_windows import WindowsExcelToPPTService
            logger.info("✅ Using Windows COM Excel service (95% accuracy, high quality)")
            return WindowsExcelToPPTService()
        except Exception as e:
            logger.warning(f"⚠️ Windows COM not available: {e}")
            logger.info("Falling back to openpyxl service")

    # Fallback to openpyxl-based service
    from app.services.excel_to_ppt import ExcelToPPTService
    logger.info("✅ Using openpyxl Excel service (cross-platform, good quality)")
    return ExcelToPPTService()


def is_windows_com_available():
    """Check if Windows COM is available"""
    if sys.platform != 'win32':
        return False

    try:
        import win32com.client
        return True
    except ImportError:
        return False
