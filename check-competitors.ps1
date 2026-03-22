#!/usr/bin/env pwsh
# WDHC Competitor Check Script
# Run this daily to monitor for emerging competitors

Write-Host "🚀 WDHC Competitor Monitoring System" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan

# Check if Node.js is installed
try {
    $nodeVersion = node --version
    Write-Host "✅ Node.js $nodeVersion detected" -ForegroundColor Green
} catch {
    Write-Host "❌ Node.js not found. Please install Node.js first." -ForegroundColor Red
    exit 1
}

# Change to script directory
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptDir

# Run the competitor monitor
Write-Host ""
Write-Host "🔍 Checking for emerging competitors..." -ForegroundColor Yellow

try {
    $result = node competitor-monitor.js
    Write-Host ""
    Write-Host "✅ Competitor check completed successfully!" -ForegroundColor Green
    
    # Open dashboard in default browser
    $dashboardPath = Join-Path $scriptDir "competitor-dashboard.html"
    if (Test-Path $dashboardPath) {
        Write-Host ""
        Write-Host "📊 Opening competitor dashboard..." -ForegroundColor Yellow
        Start-Process "file://$dashboardPath"
    }
    
} catch {
    Write-Host ""
    Write-Host "❌ Error running competitor monitor: $_" -ForegroundColor Red
    exit 1
}

# Show quick stats
$dataFile = Join-Path $scriptDir "competitor-alerts.json"
if (Test-Path $dataFile) {
    $data = Get-Content $dataFile | ConvertFrom-Json
    $competitorCount = $data.competitors.Count
    $lastCheck = $data.lastCheck
    
    Write-Host ""
    Write-Host "📊 Quick Stats:" -ForegroundColor Cyan
    Write-Host "   Total competitors detected: $competitorCount" -ForegroundColor White
    if ($lastCheck) {
        $lastCheckTime = [datetime]::Parse($lastCheck)
        $timeAgo = (Get-Date) - $lastCheckTime
        $hoursAgo = [math]::Floor($timeAgo.TotalHours)
        Write-Host "   Last check: $($lastCheckTime.ToString('g')) ($hoursAgo hours ago)" -ForegroundColor White
    }
}

Write-Host ""
Write-Host "🎯 Monitoring Terms:" -ForegroundColor Cyan
Write-Host "   1. `"dead hang championship`"" -ForegroundColor White
Write-Host "   2. `"dead hang competition`"" -ForegroundColor White
Write-Host "   3. `"dead hang leaderboard`"" -ForegroundColor White
Write-Host "   4. `"dead hang world record`"" -ForegroundColor White
Write-Host "   5. `"dead hang federation`"" -ForegroundColor White

Write-Host ""
Write-Host "💡 Tip: Run this script daily to stay ahead of competitors!" -ForegroundColor Yellow
Write-Host "   Use: .\setup-competitor-cron.ps1 to schedule automatic daily checks" -ForegroundColor Yellow