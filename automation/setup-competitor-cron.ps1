#!/usr/bin/env pwsh
# Setup daily competitor monitoring cron job

Write-Host "🛠️  Setting up WDHC Competitor Monitoring Schedule" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$checkScript = Join-Path $scriptDir "check-competitors.ps1"

# Check if script exists
if (-not (Test-Path $checkScript)) {
    Write-Host "❌ check-competitors.ps1 not found!" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Found check script: $checkScript" -ForegroundColor Green

# Create scheduled task for daily execution at 9 AM
$taskName = "WDHC Competitor Monitor"
$taskDescription = "Daily check for emerging dead hang competitors"
$taskAction = New-ScheduledTaskAction -Execute "PowerShell.exe" -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$checkScript`""
$taskTrigger = New-ScheduledTaskTrigger -Daily -At 9:00AM
$taskPrincipal = New-ScheduledTaskPrincipal -UserId "SYSTEM" -LogonType ServiceAccount -RunLevel Highest
$taskSettings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable

try {
    # Check if task already exists
    $existingTask = Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
    
    if ($existingTask) {
        Write-Host "⚠️  Task '$taskName' already exists. Updating..." -ForegroundColor Yellow
        Set-ScheduledTask -TaskName $taskName -Action $taskAction -Trigger $taskTrigger -Principal $taskPrincipal -Settings $taskSettings -Description $taskDescription
        Write-Host "✅ Updated existing scheduled task" -ForegroundColor Green
    } else {
        Register-ScheduledTask -TaskName $taskName -Action $taskAction -Trigger $taskTrigger -Principal $taskPrincipal -Settings $taskSettings -Description $taskDescription
        Write-Host "✅ Created new scheduled task: '$taskName'" -ForegroundColor Green
    }
    
    Write-Host "`n📅 Task Details:" -ForegroundColor Cyan
    Write-Host "   Name: $taskName" -ForegroundColor White
    Write-Host "   Schedule: Daily at 9:00 AM" -ForegroundColor White
    Write-Host "   Action: Run check-competitors.ps1" -ForegroundColor White
    Write-Host "   Runs as: SYSTEM account" -ForegroundColor White
    
    # Test run the task
    Write-Host "`n🧪 Testing the task..." -ForegroundColor Yellow
    Start-ScheduledTask -TaskName $taskName
    Start-Sleep -Seconds 2
    
    $taskState = (Get-ScheduledTask -TaskName $taskName).State
    Write-Host "   Task state: $taskState" -ForegroundColor White
    
    # Create shortcut for manual runs
    $shortcutPath = Join-Path $scriptDir "Check Competitors.lnk"
    $WshShell = New-Object -ComObject WScript.Shell
    $Shortcut = $WshShell.CreateShortcut($shortcutPath)
    $Shortcut.TargetPath = "PowerShell.exe"
    $Shortcut.Arguments = "-NoProfile -ExecutionPolicy Bypass -File `"$checkScript`""
    $Shortcut.WorkingDirectory = $scriptDir
    $Shortcut.IconLocation = "$env:SystemRoot\System32\WindowsPowerShell\v1.0\powershell.exe"
    $Shortcut.Description = "WDHC Competitor Monitor"
    $Shortcut.Save()
    
    Write-Host "`n📋 Created desktop shortcut: $shortcutPath" -ForegroundColor Green
    
} catch {
    Write-Host "❌ Failed to create scheduled task: $_" -ForegroundColor Red
    Write-Host "`n💡 Alternative: Manual setup instructions:" -ForegroundColor Yellow
    Write-Host "   1. Open Task Scheduler" -ForegroundColor White
    Write-Host "   2. Create Basic Task" -ForegroundColor White
    Write-Host "   3. Name: 'WDHC Competitor Monitor'" -ForegroundColor White
    Write-Host "   4. Trigger: Daily, 9:00 AM" -ForegroundColor White
    Write-Host "   5. Action: Start program" -ForegroundColor White
    Write-Host "   6. Program: PowerShell.exe" -ForegroundColor White
    Write-Host "   7. Arguments: -NoProfile -ExecutionPolicy Bypass -File `"$checkScript`"" -ForegroundColor White
    exit 1
}

# Run initial check
Write-Host "`n🚀 Running initial competitor check..." -ForegroundColor Cyan
try {
    & $checkScript
} catch {
    Write-Host "❌ Initial check failed: $_" -ForegroundColor Red
}

Write-Host "`n🎉 Setup complete!" -ForegroundColor Green
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "The system will now:" -ForegroundColor White
Write-Host "1. ✅ Check for competitors daily at 9 AM" -ForegroundColor Green
Write-Host "2. ✅ Alert you via Telegram if competitors found" -ForegroundColor Green
Write-Host "3. ✅ Update dashboard with latest findings" -ForegroundColor Green
Write-Host "`n📊 Open dashboard: file://$scriptDir/competitor-dashboard.html" -ForegroundColor Yellow
Write-Host "📋 Manual check: Double-click 'Check Competitors.lnk'" -ForegroundColor Yellow