<#
.SYNOPSIS
    AntiHarness 1-Click Smart Auto-Updater for PowerShell
.DESCRIPTION
    Checks if repository exists, pulls latest code, updates all dependencies,
    builds the client, and launches the development server.
#>

$ErrorActionPreference = "Stop"

Write-Host "===================================================" -ForegroundColor Cyan
Write-Host "     🔄 AntiHarness 1-Click Smart Auto-Updater     " -ForegroundColor Cyan
Write-Host "===================================================" -ForegroundColor Cyan
Write-Host ""

# 1. Directory Detection
$TargetDir = "AntiHarness"
if (-not (Test-Path "client/package.json")) {
    if (Test-Path "$TargetDir/client/package.json") {
        Write-Host "[*] Entering $TargetDir directory..." -ForegroundColor Green
        Set-Location $TargetDir
    } else {
        Write-Host "[ERROR] AntiHarness directory not found." -ForegroundColor Red
        Write-Host "Please run install.ps1 first or run this script from inside the repository." -ForegroundColor Yellow
        exit 1
    }
}

# 2. Pull Updates
Write-Host "[1/4] Pulling latest updates from GitHub (main)..." -ForegroundColor Yellow
git pull origin main
if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Git pull failed! Please check your internet connection or git status." -ForegroundColor Red
    exit $LASTEXITCODE
}

# 3. Update Dependencies
Write-Host ""
Write-Host "[2/4] Updating root, server, and client dependencies..." -ForegroundColor Yellow
npm run install:all
if ($LASTEXITCODE -ne 0) {
    Write-Host "[!] Retrying sequential install..." -ForegroundColor Yellow
    npm install
    npm --prefix server install
    npm --prefix client install
}

# 4. Rebuild Client
Write-Host ""
Write-Host "[3/4] Building latest client assets..." -ForegroundColor Yellow
npm --prefix client run build

# 5. Done & Auto Start
Write-Host ""
Write-Host "===================================================" -ForegroundColor Green
Write-Host "[SUCCESS] AntiHarness is updated to the latest version!" -ForegroundColor Green
Write-Host "===================================================" -ForegroundColor Green
Write-Host ""
Write-Host "Starting development environment: npm run dev" -ForegroundColor Cyan
Write-Host "Press Ctrl+C anytime to stop." -ForegroundColor Gray
Write-Host ""

npm run dev
