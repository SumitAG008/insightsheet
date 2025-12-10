@echo off
echo ========================================
echo Frontend Complete Reset
echo ========================================
echo.

echo [1/6] Killing all Node processes...
taskkill /F /IM node.exe 2>nul
timeout /t 2 /nobreak >nul

echo [2/6] Verifying .env file...
if not exist .env (
    echo ERROR: .env file not found!
    echo Creating .env file now...
    (
    echo VITE_API_URL=http://localhost:8001
    echo VITE_APP_NAME=InsightSheet-lite
    echo VITE_APP_DOMAIN=meldra.ai
    ) > .env
)
echo .env contents:
type .env
echo.

echo [3/6] Clearing all cache directories...
if exist node_modules\.vite (
    echo Removing node_modules\.vite...
    rmdir /s /q node_modules\.vite
)
if exist dist (
    echo Removing dist...
    rmdir /s /q dist
)
if exist .vite (
    echo Removing .vite...
    rmdir /s /q .vite
)

echo [4/6] Clearing browser cache...
echo.
echo *** IMPORTANT ***
echo Please clear your browser cache:
echo   1. Press Ctrl+Shift+Delete
echo   2. Select "Cached images and files"
echo   3. Click "Clear data"
echo.
echo OR use Incognito mode (Ctrl+Shift+N)
echo.
pause

echo [5/6] Starting frontend with fresh build...
echo.
echo You should see this in the terminal output:
echo   "VITE ready in XXX ms"
echo.

npm run dev
