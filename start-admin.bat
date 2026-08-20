@echo off
:: AntiHarness Administrator Launcher
:: Automatically requests Administrator privileges if not already elevated

NET SESSION >nul 2>&1
IF %ERRORLEVEL% EQU 0 (
    echo [AntiHarness] Running with Administrator Privileges...
    cd /d "%~dp0"
    npm run dev
) ELSE (
    echo [AntiHarness] Elevating to Administrator...
    powershell -NoProfile -ExecutionPolicy Bypass -Command "Start-Process -Verb RunAs cmd.exe -ArgumentList '/k cd /d """%~dp0""" && npm run dev'"
    exit /b
)
