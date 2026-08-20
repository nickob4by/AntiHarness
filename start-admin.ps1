# AntiHarness Administrator Launcher (PowerShell)
$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin) {
    Write-Host "[AntiHarness] Requesting Administrator Elevation..." -ForegroundColor Cyan
    Start-Process pwsh -ArgumentList "-NoExit", "-ExecutionPolicy", "Bypass", "-Command", "Set-Location -Path '$PSScriptRoot'; npm run dev" -Verb RunAs -ErrorAction SilentlyContinue
    if (-not $?) {
        Start-Process powershell -ArgumentList "-NoExit", "-ExecutionPolicy", "Bypass", "-Command", "Set-Location -Path '$PSScriptRoot'; npm run dev" -Verb RunAs
    }
    exit
}

Write-Host "[AntiHarness] Launching with Full Administrator Privileges..." -ForegroundColor Green
Set-Location -Path $PSScriptRoot
npm run dev
