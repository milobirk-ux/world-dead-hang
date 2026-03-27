# Simple WDHC Competitor Check Script
Write-Host "WDHC Competitor Monitoring System"
Write-Host "================================="

# Check Node.js
try {
    node --version > $null
    Write-Host "Node.js detected" -ForegroundColor Green
} catch {
    Write-Host "Node.js not found" -ForegroundColor Red
    exit 1
}

# Run monitor
Write-Host "Checking for competitors..."
node competitor-monitor.js

# Open dashboard
$dashboard = "competitor-dashboard.html"
if (Test-Path $dashboard) {
    Write-Host "Opening dashboard..." -ForegroundColor Yellow
    Start-Process "file://$PWD/$dashboard"
}

Write-Host "Done!" -ForegroundColor Green