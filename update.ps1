Write-Host "===================================================" -ForegroundColor Cyan
Write-Host "       AntiHarness 1-Click Auto-Updater (PS)       " -ForegroundColor Cyan
Write-Host "===================================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "[1/4] Pulling latest updates from GitHub (main)..." -ForegroundColor Yellow
git pull origin main
if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Git pull failed! Please check your internet connection or git status." -ForegroundColor Red
    exit $LASTEXITCODE
}

Write-Host ""
Write-Host "[2/4] Installing / updating root dependencies..." -ForegroundColor Yellow
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Root npm install failed!" -ForegroundColor Red
    exit $LASTEXITCODE
}

Write-Host ""
Write-Host "[3/4] Installing backend & frontend dependencies..." -ForegroundColor Yellow
npm --prefix server install
npm --prefix client install

Write-Host ""
Write-Host "[4/4] Building latest client assets..." -ForegroundColor Yellow
npm --prefix client run build

Write-Host ""
Write-Host "===================================================" -ForegroundColor Green
Write-Host "[SUCCESS] AntiHarness is updated to the latest version!" -ForegroundColor Green
Write-Host "===================================================" -ForegroundColor Green
Write-Host ""
Write-Host "You can start AntiHarness now with: npm run dev" -ForegroundColor Cyan
