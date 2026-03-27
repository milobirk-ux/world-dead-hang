# WDHC Windows Task Scheduler Setup
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "    WDHC DAILY COMPETITOR CHECK" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

# Check if running as administrator
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")
if (-not $isAdmin) {
    Write-Host "❌ Please run as Administrator" -ForegroundColor Red
    Write-Host "   Right-click PowerShell -> Run as Administrator" -ForegroundColor Yellow
    pause
    exit 1
}

Write-Host "✅ Running as Administrator" -ForegroundColor Green
Write-Host ""

# Task details
$taskName = "WDHC Competitor Monitor"
$taskDescription = "Daily check for new dead hang competitors"
$scriptPath = "C:\Users\milob\.openclaw\workspace\WDHC\simple-competitor-monitor.js"
$workingDir = "C:\Users\milob\.openclaw\workspace\WDHC"
$nodePath = "node.exe"

# Check if Node.js exists
if (-not (Test-Path (Get-Command node -ErrorAction SilentlyContinue).Source)) {
    Write-Host "❌ Node.js not found in PATH" -ForegroundColor Red
    Write-Host "   Install from: https://nodejs.org/" -ForegroundColor Yellow
    pause
    exit 1
}

Write-Host "✅ Node.js found: $(node --version)" -ForegroundColor Green
Write-Host ""

# Create scheduled task
try {
    Write-Host "🔧 Creating scheduled task..." -ForegroundColor Yellow
    
    # Delete existing task if it exists
    $existingTask = Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
    if ($existingTask) {
        Write-Host "   Removing existing task..." -ForegroundColor Gray
        Unregister-ScheduledTask -TaskName $taskName -Confirm:$false
    }
    
    # Create task action
    $action = New-ScheduledTaskAction -Execute $nodePath -Argument $scriptPath -WorkingDirectory $workingDir
    
    # Create task trigger (daily at 9:00 AM)
    $trigger = New-ScheduledTaskTrigger -Daily -At "9:00AM"
    
    # Create task settings
    $settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable -RunOnlyIfNetworkAvailable
    
    # Register the task
    Register-ScheduledTask -TaskName $taskName -Description $taskDescription -Action $action -Trigger $trigger -Settings $settings -RunLevel Highest
    
    Write-Host "✅ Task created successfully!" -ForegroundColor Green
    Write-Host "   Name: $taskName" -ForegroundColor White
    Write-Host "   Schedule: Daily at 9:00 AM" -ForegroundColor White
    Write-Host "   Command: node $scriptPath" -ForegroundColor White
    Write-Host ""
    
    # Test the task
    Write-Host "🔧 Testing task..." -ForegroundColor Yellow
    Start-ScheduledTask -TaskName $taskName
    Start-Sleep -Seconds 2
    
    $taskState = (Get-ScheduledTask -TaskName $taskName).State
    Write-Host "✅ Task state: $taskState" -ForegroundColor Green
    
} catch {
    Write-Host "❌ Error creating task: $_" -ForegroundColor Red
    pause
    exit 1
}

Write-Host ""
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "🎯 TASK SCHEDULER SETUP COMPLETE" -ForegroundColor Cyan
Write-Host ""
Write-Host "📋 What happens now:" -ForegroundColor White
Write-Host "   • Daily at 9:00 AM: System checks for competitors" -ForegroundColor Gray
Write-Host "   • If new competitors: Telegram alerts sent" -ForegroundColor Gray
Write-Host "   • Dashboard updated automatically" -ForegroundColor Gray
Write-Host ""
Write-Host "🔧 Manual commands:" -ForegroundColor White
Write-Host "   • Run now: Start-ScheduledTask -TaskName '$taskName'" -ForegroundColor Gray
Write-Host "   • View status: Get-ScheduledTask -TaskName '$taskName'" -ForegroundColor Gray
Write-Host "   • Delete task: Unregister-ScheduledTask -TaskName '$taskName'" -ForegroundColor Gray
Write-Host ""
Write-Host "💡 Next step: Configure Telegram alerts" -ForegroundColor Yellow
Write-Host "   Run: node telegram-alert-system.js setup" -ForegroundColor White
Write-Host ""
Write-Host "🎉 WDHC is now protected by automated competitor monitoring!" -ForegroundColor Green
Write-Host ""
pause