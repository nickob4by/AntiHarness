<#
.SYNOPSIS
    AntiHarness Automated 1-Click Installer & Runner for PowerShell
.DESCRIPTION
    Clones or updates the AntiHarness repository, installs all dependencies,
    builds the client, and automatically starts the development environment.
#>

$ErrorActionPreference = "Stop"

Write-Host "===================================================" -ForegroundColor Cyan
Write-Host "     🚀 AntiHarness Automated 1-Click Installer    " -ForegroundColor Cyan
Write-Host "===================================================" -ForegroundColor Cyan
Write-Host ""

# 1. Check Git
if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
    Write-Host "[ERROR] Git is not installed or not in PATH." -ForegroundColor Red
    Write-Host "Please install Git from https://git-scm.com/ and rerun." -ForegroundColor Yellow
    exit 1
}

# 2. Check Node & NPM
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "[ERROR] Node.js is not installed or not in PATH." -ForegroundColor Red
    Write-Host "Please install Node.js (v18+ recommended) from https://nodejs.org/ and rerun." -ForegroundColor Yellow
    exit 1
}

if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
    Write-Host "[ERROR] npm is not found in PATH." -ForegroundColor Red
    exit 1
}

# 3. Check Workspace Directory
$RepoUrl = "https://github.com/nickob4by/AntiHarness.git"
$TargetDir = "AntiHarness"

if ((Test-Path "client/package.json") -and (Test-Path "server/package.json")) {
    Write-Host "[*] Currently inside AntiHarness workspace." -ForegroundColor Green
} elseif (Test-Path "$TargetDir/client/package.json") {
    Write-Host "[*] Found existing $TargetDir directory. Entering..." -ForegroundColor Green
    Set-Location $TargetDir
} else {
    Write-Host "[*] Cloning AntiHarness repository from $RepoUrl..." -ForegroundColor Yellow
    git clone $RepoUrl $TargetDir
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[ERROR] Failed to clone repository." -ForegroundColor Red
        exit $LASTEXITCODE
    }
    Set-Location $TargetDir
}

# 4. Install Dependencies
Write-Host ""
Write-Host "[1/3] Installing root, server, and client dependencies..." -ForegroundColor Yellow
npm run install:all
if ($LASTEXITCODE -ne 0) {
    Write-Host "[!] Retrying sequential install..." -ForegroundColor Yellow
    npm install
    npm --prefix server install
    npm --prefix client install
}

# 5. Build Client
Write-Host ""
Write-Host "[2/3] Building client production bundle..." -ForegroundColor Yellow
npm --prefix client run build

# 6. Success & Launch Dev Server
Write-Host ""
Write-Host "===================================================" -ForegroundColor Green
Write-Host " [SUCCESS] AntiHarness is fully installed & ready!  " -ForegroundColor Green
Write-Host "===================================================" -ForegroundColor Green
Write-Host ""
Write-Host "Launching development environment: npm run dev" -ForegroundColor Cyan
Write-Host "Press Ctrl+C anytime to stop." -ForegroundColor Gray
Write-Host ""

npm run dev
