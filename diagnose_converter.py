#!/usr/bin/env python3
"""
Diagnostic Script - Check Excel to PPT Converter Status
"""
import sys
import os

print("="*70)
print("Excel to PPT Converter Diagnostic")
print("="*70)

# 1. Check Python version
print(f"\n1. Python Version: {sys.version}")

# 2. Check platform
print(f"\n2. Platform: {sys.platform}")
is_windows = sys.platform == 'win32'
print(f"   Is Windows: {is_windows}")

# 3. Check pywin32
try:
    import win32com.client
    pywin32_available = True
    print(f"\n3. pywin32: ✅ Installed")
except ImportError as e:
    pywin32_available = False
    print(f"\n3. pywin32: ❌ Not installed")
    print(f"   Error: {e}")

# 4. Check Excel (if Windows and pywin32)
excel_available = False
if is_windows and pywin32_available:
    try:
        excel = win32com.client.Dispatch("Excel.Application")
        excel_version = excel.Version
        excel.Quit()
        excel_available = True
        print(f"\n4. Microsoft Excel: ✅ Installed")
        print(f"   Version: {excel_version}")
    except Exception as e:
        print(f"\n4. Microsoft Excel: ❌ Not found")
        print(f"   Error: {e}")
else:
    print(f"\n4. Microsoft Excel: ⏭️ Skipped (not Windows or no pywin32)")

# 5. Check backend modules
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))

try:
    from app.services.excel_to_ppt import ExcelToPPTService, WINDOWS_CONVERTER_AVAILABLE
    print(f"\n5. Backend Module: ✅ Loaded")
    print(f"   WINDOWS_CONVERTER_AVAILABLE: {WINDOWS_CONVERTER_AVAILABLE}")
except Exception as e:
    print(f"\n5. Backend Module: ❌ Error")
    print(f"   Error: {e}")
    sys.exit(1)

# 6. Check Windows converter module
if WINDOWS_CONVERTER_AVAILABLE:
    try:
        from app.services.excel_to_ppt_windows import WindowsExcelToPPTConverter, is_windows_converter_available
        windows_ready = is_windows_converter_available()
        print(f"\n6. Windows COM Converter: ✅ Available")
        print(f"   Ready to use: {windows_ready}")
    except Exception as e:
        print(f"\n6. Windows COM Converter: ❌ Error")
        print(f"   Error: {e}")
else:
    print(f"\n6. Windows COM Converter: ⏭️ Not available (will use cross-platform)")

# 7. Summary
print("\n" + "="*70)
print("SUMMARY")
print("="*70)

if WINDOWS_CONVERTER_AVAILABLE:
    print("✅ Windows COM Converter will be used")
    print("   - Actual chart images exported from Excel")
    print("   - Complete data extraction")
    print("   - Best quality conversions")
else:
    print("ℹ️  Cross-Platform Converter will be used")
    print("   - Charts recreated programmatically")
    print("   - Basic data extraction")
    print("   - Good quality (not best)")

print("\nTo enable Windows COM Converter:")
print("  1. Be on Windows")
print("  2. Install: pip install pywin32")
print("  3. Install Microsoft Excel")

print("="*70)
