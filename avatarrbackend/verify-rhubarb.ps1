# Verify Rhubarb Lip Sync Installation
Write-Host "Checking for Rhubarb Lip Sync..." -ForegroundColor Cyan

$paths = @(
    ".\rhubarb\rhubarb.exe",
    ".\rhubarb.exe",
    "rhubarb.exe"
)

$found = $false
foreach ($path in $paths) {
    if (Test-Path $path) {
        Write-Host "✓ Found Rhubarb at: $path" -ForegroundColor Green
        Write-Host "Testing version..." -ForegroundColor Cyan
        & $path --version
        $found = $true
        break
    }
}

if (-not $found) {
    Write-Host "✗ Rhubarb NOT found!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please download from: https://github.com/DanielSWolf/rhubarb-lip-sync/releases" -ForegroundColor Yellow
    Write-Host "Then place rhubarb.exe in: .\rhubarb\rhubarb.exe" -ForegroundColor Yellow
}

