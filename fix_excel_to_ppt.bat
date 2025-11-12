@echo off
echo ========================================================================
echo Excel to PPT Quality Fix - Installing Windows COM Converter
echo ========================================================================
echo.

echo Step 1: Installing pywin32...
echo.
pip install pywin32
echo.

if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Failed to install pywin32
    echo Try: pip install --upgrade pip
    echo Then run this script again
    pause
    exit /b 1
)

echo ========================================================================
echo Step 2: Testing if Windows COM converter is now available...
echo ========================================================================
echo.

python diagnose_converter.py

echo.
echo ========================================================================
echo Step 3: Next Steps
echo ========================================================================
echo.
echo 1. RESTART your backend server (Ctrl+C, then restart)
echo 2. Look for: "Windows Excel COM converter is available"
echo 3. Upload your Excel file via the web app
echo 4. You should now get high-quality conversions!
echo.
echo ========================================================================
pause
