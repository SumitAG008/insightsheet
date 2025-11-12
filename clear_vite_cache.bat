@echo off
echo Clearing Vite cache and restarting frontend...
echo.

echo [1/4] Killing any running dev servers...
taskkill /F /IM node.exe 2>nul
timeout /t 2 /nobreak >nul

echo [2/4] Clearing Vite cache...
if exist node_modules\.vite rmdir /s /q node_modules\.vite
if exist dist rmdir /s /q dist

echo [3/4] Clearing browser cache instructions...
echo IMPORTANT: In your browser, press Ctrl+Shift+Delete and clear cache!
echo Or use Incognito mode (Ctrl+Shift+N)
echo.

echo [4/4] Starting frontend with fresh cache...
npm run dev

