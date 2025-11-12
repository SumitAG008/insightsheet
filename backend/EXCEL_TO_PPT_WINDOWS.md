# Excel to PPT - Windows Enhanced Mode

## Overview

InsightSheet includes **two conversion modes** for Excel to PowerPoint:

1. **Windows Enhanced Mode** (Recommended for Windows users)
   - Uses Excel COM automation
   - Exports **actual chart images** from Excel
   - Extracts **complete data** (headers, totals, percentages)
   - Evaluates formulas automatically
   - **Best quality and fidelity**

2. **Cross-Platform Mode** (Fallback)
   - Works on Windows, Mac, Linux
   - Recreates charts programmatically
   - Good for basic conversions
   - No Excel installation required

## Windows Enhanced Mode Setup

### Requirements

- Windows OS
- Microsoft Excel installed (any recent version)
- Python package: `pywin32`

### Installation

```bash
pip install pywin32
```

### Verification

The backend will automatically detect if Windows Enhanced Mode is available:

```bash
python -m uvicorn app.main:app --reload
```

Look for this log message:
```
✓ Windows Excel COM converter is available - will use for .xlsx/.xls files with charts
```

If you see:
```
⚠ Windows Excel COM converter not available - using cross-platform fallback
```

Then either:
- `pywin32` is not installed
- Microsoft Excel is not installed
- You're not on Windows

## Features Comparison

| Feature | Windows Enhanced | Cross-Platform |
|---------|-----------------|----------------|
| **Chart Images** | ✅ Actual Excel charts | ❌ Recreated programmatically |
| **Data Extraction** | ✅ Complete (headers, totals, %) | ⚠️ Basic |
| **Formula Evaluation** | ✅ Automatic | ⚠️ Manual |
| **Multi-sheet Support** | ✅ Yes | ✅ Yes |
| **Chart Types** | ✅ All Excel types | ⚠️ Limited |
| **OS Compatibility** | Windows only | Windows, Mac, Linux |
| **Excel Required** | Yes | No |

## How It Works

1. **Upload Excel file** via the web interface
2. **Backend auto-detects** the best conversion mode
3. **Windows Enhanced Mode** (if available):
   - Saves Excel file temporarily
   - Opens with Excel COM automation
   - Exports each chart as high-quality PNG
   - Extracts complete data ranges with formulas evaluated
   - Creates PowerPoint with actual chart images + data tables
4. **Cross-Platform Mode** (fallback):
   - Parses Excel with openpyxl
   - Analyzes data for chart creation
   - Recreates charts in PowerPoint programmatically

## Testing

### Test Windows Enhanced Mode

```python
from app.services.excel_to_ppt_windows import is_windows_converter_available

if is_windows_converter_available():
    print("✓ Windows Enhanced Mode is ready!")
else:
    print("✗ Windows Enhanced Mode not available")
```

### Test Conversion

```bash
# From backend directory
python -c "
from app.services.excel_to_ppt import ExcelToPPTService
import asyncio

async def test():
    service = ExcelToPPTService()
    with open('test.xlsx', 'rb') as f:
        result = await service.convert_to_ppt(f, 'test.xlsx')
    with open('output.pptx', 'wb') as f:
        f.write(result)
    print('✓ Conversion successful!')

asyncio.run(test())
"
```

## Troubleshooting

### Error: "pywin32 not available"

**Solution:**
```bash
pip install pywin32
```

### Error: "Excel.Application not found"

**Solution:**
- Install Microsoft Excel
- Make sure Excel is properly registered
- Run `pip install pywin32` after installing Excel

### Error: "Permission denied"

**Solution:**
- Close any open Excel instances
- Run the backend as administrator (if needed)
- Check antivirus settings

### Charts not exporting

**Solution:**
- Ensure Excel has permission to create temp files
- Check that charts exist in the Excel file
- Try opening the file manually in Excel first

## Configuration

The backend automatically selects the best converter. To force cross-platform mode even on Windows:

```python
# In app/services/excel_to_ppt.py, set:
WINDOWS_CONVERTER_AVAILABLE = False
```

## Supported File Types

Both modes support:
- `.xlsx` - Modern Excel format
- `.xls` - Legacy Excel format
- `.csv` - Comma-separated values
- `.pdf` - PDF with tables

**Note:** Windows Enhanced Mode only applies to `.xlsx` and `.xls` files with charts.

## Performance

- **Windows Enhanced Mode**: Slower (uses Excel automation) but best quality
- **Cross-Platform Mode**: Faster but lower quality charts

Typical conversion times:
- Small file (1-5 charts): 5-10 seconds
- Medium file (6-20 charts): 15-30 seconds
- Large file (20+ charts): 30-60 seconds

## Security

- Excel files are processed in temporary directories
- Temporary files are automatically cleaned up
- Excel runs in invisible mode (no UI)
- No changes are made to original files

## Support

For issues specific to Windows Enhanced Mode:
1. Check Excel is installed and working
2. Verify `pywin32` is installed
3. Check Windows Event Viewer for Excel errors
4. Try the conversion with a simple test file first

For general conversion issues:
1. Check the file format is supported
2. Ensure the file is not corrupted
3. Check backend logs for errors
4. Try the cross-platform mode as fallback
