@echo off
setlocal enabledelayedexpansion

echo ===================================================
echo     🔄 AntiHarness 1-Click Smart Auto-Updater
echo ===================================================
echo.

:: 1. Navigate to AntiHarness directory if running from outside
if not exist "client\package.json" (
    if exist "AntiHarness\client\package.json" (
        echo [*] Entering AntiHarness directory...
        cd AntiHarness
    ) else (
        echo [ERROR] AntiHarness directory not found!
        echo Please run install.bat first or run this script from inside the repository.
        pause
        exit /b 1
    )
)

:: 2. Pull latest changes
echo [1/4] Pulling latest updates from GitHub (main)...
git pull origin main
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Git pull failed! Please check your internet connection or git status.
    pause
    exit /b %ERRORLEVEL%
)

:: 3. Update dependencies
echo.
echo [2/4] Updating root, server, and client dependencies...
call npm run install:all
if %ERRORLEVEL% NEQ 0 (
    echo [WARNING] npm run install:all had errors, attempting manual sequential install...
    call npm install
    call npm --prefix server install
    call npm --prefix client install
)

:: 4. Rebuild client
echo.
echo [3/4] Building latest client assets...
call npm --prefix client run build

:: 5. Done
echo.
echo [4/4] Update completed successfully!
echo ===================================================
echo [SUCCESS] AntiHarness is updated to the latest version!
echo ===================================================
echo.
echo Starting AntiHarness development server...
echo Launching: npm run dev
echo.
call npm run dev
