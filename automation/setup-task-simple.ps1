# Simple task setup script
Write-Host "Setting up automatic WDHC competitor monitoring..."

# Create task using schtasks command
$command = 'schtasks /create /tn "WDHC Competitor Monitor" /tr "powershell.exe -NoProfile -ExecutionPolicy Bypass -File \"C:\Users\milob\.openclaw\workspace\WDHC\check-competitors-fixed.ps1\"" /sc daily /st 09:00 /ru SYSTEM /f'
Write-Host "Running: $command"
cmd /c $command

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Task created successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "📅 Task Details:" -ForegroundColor Cyan
    Write-Host "   Name: WDHC Competitor Monitor" -ForegroundColor White
    Write-Host "   Schedule: Daily at 9:00 AM" -ForegroundColor White
    Write-Host "   Action: Runs competitor check" -ForegroundColor White
    Write-Host "   Status: Active" -ForegroundColor White
} else {
    Write-Host "❌ Failed to create task" -ForegroundColor Red
    Write-Host ""
    Write-Host "Manual setup required:" -ForegroundColor Yellow
    Write-Host "1. Open Task Scheduler" -ForegroundColor White
    Write-Host "2. Create Basic Task" -ForegroundColor White
    Write-Host "3. Name: WDHC Competitor Monitor" -ForegroundColor White
    Write-Host "4. Trigger: Daily, 9:00 AM" -ForegroundColor White
    Write-Host "5. Action: Start a program" -ForegroundColor White
    Write-Host "6. Program: powershell.exe" -ForegroundColor White
    Write-Host "7. Arguments: -NoProfile -ExecutionPolicy Bypass -File C:\Users\milob\.openclaw\workspace\WDHC\check-competitors-fixed.ps1" -ForegroundColor White
}

Write-Host ""
Write-Host "Automatic monitoring will run daily at 9 AM starting tomorrow." -ForegroundColor Green