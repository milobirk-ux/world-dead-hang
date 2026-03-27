# Setup daily competitor monitoring
Write-Host "Setting up WDHC Daily Competitor Check" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$checkScript = Join-Path $scriptDir "check-competitors-fixed.ps1"

# Create batch file for Task Scheduler
$batchContent = @"
@echo off
cd /d "$scriptDir"
powershell -NoProfile -ExecutionPolicy Bypass -File "check-competitors-fixed.ps1"
"@

$batchFile = Join-Path $scriptDir "daily-competitor-check.bat"
Set-Content -Path $batchFile -Value $batchContent

Write-Host "Created batch file: $batchFile" -ForegroundColor Green

# Instructions for manual Task Scheduler setup
Write-Host ""
Write-Host "📅 MANUAL TASK SCHEDULER SETUP:" -ForegroundColor Yellow
Write-Host "1. Open Task Scheduler" -ForegroundColor White
Write-Host "2. Click 'Create Basic Task'" -ForegroundColor White
Write-Host "3. Name: 'WDHC Competitor Monitor'" -ForegroundColor White
Write-Host "4. Trigger: Daily, 9:00 AM" -ForegroundColor White
Write-Host "5. Action: Start a program" -ForegroundColor White
Write-Host "6. Program: $batchFile" -ForegroundColor White
Write-Host "7. Finish" -ForegroundColor White

Write-Host ""
Write-Host "🎯 QUICK TEST:" -ForegroundColor Yellow
Write-Host "Run this command to test now:" -ForegroundColor White
Write-Host "  .\check-competitors-fixed.ps1" -ForegroundColor Green

Write-Host ""
Write-Host "📊 DASHBOARD:" -ForegroundColor Yellow
Write-Host "Open: file://$scriptDir/competitor-dashboard.html" -ForegroundColor White

Write-Host ""
Write-Host "✅ Setup complete! Follow the instructions above to schedule daily checks." -ForegroundColor Green