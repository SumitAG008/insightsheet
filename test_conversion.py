#!/usr/bin/env python3
"""
Test Excel to PPT conversion - Diagnose backend vs standalone difference
"""
import sys
import os
import asyncio

# Add backend to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))

from app.services.excel_to_ppt import ExcelToPPTService

async def test_conversion():
    """Test the conversion exactly as the backend would."""

    # Use the test file
    input_file = "Ch_01_ChartEssentials_test.xlsx"
    output_file = "test_backend_output.pptx"

    if not os.path.exists(input_file):
        print(f"❌ Input file not found: {input_file}")
        return

    print("="*70)
    print("Testing Excel to PPT Conversion (Backend Method)")
    print("="*70)

    # Create service instance
    service = ExcelToPPTService()

    # Read file
    print(f"\n📁 Reading: {input_file}")
    with open(input_file, 'rb') as f:
        file_data = f.read()

    print(f"   File size: {len(file_data):,} bytes")

    # Convert
    print(f"\n🔄 Converting to PowerPoint...")
    try:
        result = await service.convert_to_ppt(file_data, input_file)

        # Save result
        with open(output_file, 'wb') as f:
            f.write(result)

        print(f"\n✅ SUCCESS!")
        print(f"   Output: {output_file}")
        print(f"   Size: {len(result):,} bytes")
        print(f"\n" + "="*70)
        print("Compare these files:")
        print(f"  1. {output_file} (backend method)")
        print(f"  2. Ch_01_ChartEssentials_test_presentation (3).pptx (expected)")
        print("="*70)

    except Exception as e:
        print(f"\n❌ ERROR: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_conversion())
