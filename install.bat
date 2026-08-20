@echo off
setlocal enabledelayedexpansion

echo ===================================================
echo     🚀 AntiHarness Automated 1-Click Installer
echo ===================================================
echo.

:: 1. Check Git
where git >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Git is not installed or not in PATH!
    echo Please install Git from https://git-scm.com/
    pause
    exit /b 1
)

:: 2. Check Node & NPM
where node >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Node.js is not installed or not in PATH!
    echo Please install Node.js (v18+ recommended) from https://nodejs.org/
    pause
    exit /b 1
)

where npm >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] npm is not found in PATH!
    pause
    exit /b 1
)

:: 3. Check if we are already inside AntiHarness repo or need to clone
if exist "client\package.json" if exist "server\package.json" (
    echo [*] Detected AntiHarness workspace in current directory.
    goto :INSTALL_DEPS
)

if exist "AntiHarness\client\package.json" (
    echo [*] AntiHarness directory found. Entering directory...
    cd AntiHarness
    goto :INSTALL_DEPS
)

echo [*] Cloning AntiHarness repository from GitHub...
git clone https://github.com/nickob4by/AntiHarness.git AntiHarness
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Failed to clone repository! Check your internet connection.
    pause
    exit /b %ERRORLEVEL%
)
cd AntiHarness

:INSTALL_DEPS
echo.
echo [1/3] Installing root, server, and client dependencies...
call npm run install:all
if %ERRORLEVEL% NEQ 0 (
    echo [WARNING] install:all had errors, attempting manual sequential install...
    call npm install
    call npm --prefix server install
    call npm --prefix client install
)

echo.
echo [2/3] Building client production bundle...
call npm --prefix client run build

echo.
echo [3/3] Installation & build complete!
echo ===================================================
echo  AntiHarness is ready! Starting dev server now...
echo ===================================================
echo.
echo Launching: npm run dev
echo.
call npm run dev
