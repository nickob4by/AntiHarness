@echo off
setlocal enabledelayedexpansion

echo ===================================================
echo        AntiHarness 1-Click Auto-Updater
echo ===================================================
echo.

echo [1/4] Pulling latest updates from GitHub (main)...
git pull origin main
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Git pull failed! Please check your internet connection or git status.
    pause
    exit /b %ERRORLEVEL%
)

echo.
echo [2/4] Installing / updating root dependencies...
call npm install
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Root npm install failed!
    pause
    exit /b %ERRORLEVEL%
)

echo.
echo [3/4] Installing backend & frontend dependencies...
call npm --prefix server install
call npm --prefix client install

echo.
echo [4/4] Building latest client assets...
call npm --prefix client run build

echo.
echo ===================================================
echo [SUCCESS] AntiHarness is updated to the latest version!
echo ===================================================
echo.
echo You can start AntiHarness now with:
echo    npm run dev
echo.
pause
