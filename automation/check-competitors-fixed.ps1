# Fixed WDHC Competitor Check Script
Write-Host "WDHC Competitor Monitoring System" -ForegroundColor Cyan
Write-Host "=================================" -ForegroundColor Cyan

# Check Node.js
try {
    $nodeVersion = node --version
    Write-Host "Node.js $nodeVersion detected" -ForegroundColor Green
} catch {
    Write-Host "Node.js not found" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Checking for competitors..." -ForegroundColor Yellow

# Run the simple monitor
node competitor-monitor-simple.js

Write-Host ""
Write-Host "Opening dashboard..." -ForegroundColor Yellow

# Open dashboard
$dashboard = "competitor-dashboard.html"
if (Test-Path $dashboard) {
    Start-Process "file://$PWD/$dashboard"
}

Write-Host ""
Write-Host "Done! Dashboard opened in browser." -ForegroundColor Green