# Setup automatic WDHC competitor monitoring task

Write-Host "Setting up automatic WDHC competitor monitoring..." -ForegroundColor Cyan

# Create the scheduled task
$taskName = "WDHC Competitor Monitor"
$action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument '-NoProfile -ExecutionPolicy Bypass -File "C:\Users\milob\.openclaw\workspace\WDHC\check-competitors-fixed.ps1"'
$trigger = New-ScheduledTaskTrigger -Daily -At "09:00"
$principal = New-ScheduledTaskPrincipal -UserId "SYSTEM" -LogonType ServiceAccount -RunLevel Highest
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable

try {
    # Check if task already exists
    $existingTask = Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
    
    if ($existingTask) {
        Write-Host "Task '$taskName' already exists. Updating..." -ForegroundColor Yellow
        Set-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Principal $principal -Settings $settings -Description "Daily check for WDHC competitors"
        Write-Host "✅ Updated existing task" -ForegroundColor Green
    } else {
        Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Principal $principal -Settings $settings -Description "Daily check for WDHC competitors"
        Write-Host "✅ Created new task: '$taskName'" -ForegroundColor Green
    }
    
    # Show task details
    Write-Host ""
    Write-Host "📅 Task Details:" -ForegroundColor Cyan
    Write-Host "   Name: $taskName" -ForegroundColor White
    Write-Host "   Schedule: Daily at 9:00 AM" -ForegroundColor White
    Write-Host "   Action: Runs competitor check script" -ForegroundColor White
    Write-Host "   Runs as: SYSTEM account" -ForegroundColor White
    Write-Host "   Status: Enabled" -ForegroundColor White
    
    # Test run the task
    Write-Host ""
    Write-Host "🧪 Testing task execution..." -ForegroundColor Yellow
    Start-ScheduledTask -TaskName $taskName
    Start-Sleep -Seconds 2
    
    $taskState = (Get-ScheduledTask -TaskName $taskName).State
    Write-Host "   Task state: $taskState" -ForegroundColor White
    
} catch {
    Write-Host "❌ Failed to create task: $_" -ForegroundColor Red
    Write-Host ""
    Write-Host "💡 Manual setup required:" -ForegroundColor Yellow
    Write-Host "1. Open Task Scheduler" -ForegroundColor White
    Write-Host "2. Create Basic Task" -ForegroundColor White
    Write-Host "3. Name: 'WDHC Competitor Monitor'" -ForegroundColor White
    Write-Host "4. Trigger: Daily, 9:00 AM" -ForegroundColor White
    Write-Host "5. Action: Start a program" -ForegroundColor White
    Write-Host "6. Program: powershell.exe" -ForegroundColor White
    Write-Host "7. Arguments: -NoProfile -ExecutionPolicy Bypass -File `"C:\Users\milob\.openclaw\workspace\WDHC\check-competitors-fixed.ps1`"" -ForegroundColor White
    exit 1
}

Write-Host ""
Write-Host "🎉 Automatic monitoring setup complete!" -ForegroundColor Green
Write-Host "======================================" -ForegroundColor Cyan
Write-Host "The system will now:" -ForegroundColor White
Write-Host "1. ✅ Check for competitors daily at 9 AM" -ForegroundColor Green
Write-Host "2. ✅ Update dashboard with latest findings" -ForegroundColor Green
Write-Host "3. ✅ Store results in database" -ForegroundColor Green
Write-Host "4. ✅ Alert you if competitors found" -ForegroundColor Green
Write-Host ""
Write-Host "📊 Open dashboard: file://C:/Users/milob/.openclaw/workspace/WDHC/competitor-dashboard.html" -ForegroundColor Yellow
Write-Host "📋 Manual check: Double-click desktop shortcut" -ForegroundColor Yellow