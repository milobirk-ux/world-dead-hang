# WDHC Daily Update Task Setup
# Creates a Windows Scheduled Task to update the submissions dashboard daily

param(
    [string]$TaskName = "WDHC Daily Submissions Update",
    [string]$WorkspacePath = "C:\Users\milob\.openclaw\workspace\WDHC",
    [string]$PowerShellPath = "C:\Windows\System32\WindowsPowerShell\v1.0\powershell.exe",
    [string]$ScriptPath = "C:\Users\milob\.openclaw\workspace\WDHC\daily-submissions-update.ps1",
    [string]$RunAt = "06:00"  # 6:00 AM daily
)

# Check if running as administrator
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host "This script requires administrator privileges." -ForegroundColor Red
    Write-Host "Please run PowerShell as Administrator and try again." -ForegroundColor Yellow
    exit 1
}

# Verify paths exist
if (-not (Test-Path $ScriptPath)) {
    Write-Host "Error: Script not found at $ScriptPath" -ForegroundColor Red
    exit 1
}

if (-not (Test-Path $PowerShellPath)) {
    Write-Host "Error: PowerShell not found at $PowerShellPath" -ForegroundColor Red
    exit 1
}

Write-Host "Setting up WDHC Daily Submissions Update Task..." -ForegroundColor Cyan
Write-Host "Task Name: $TaskName" -ForegroundColor Yellow
Write-Host "Run Time: $RunAt daily" -ForegroundColor Yellow
Write-Host "Script: $ScriptPath" -ForegroundColor Yellow

# Create the scheduled task action
$action = New-ScheduledTaskAction `
    -Execute $PowerShellPath `
    -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$ScriptPath`"" `
    -WorkingDirectory $WorkspacePath

# Create the scheduled task trigger (daily at specified time)
$trigger = New-ScheduledTaskTrigger `
    -Daily `
    -At $RunAt

# Set task settings
$settings = New-ScheduledTaskSettingsSet `
    -AllowStartIfOnBatteries `
    -DontStopIfGoingOnBatteries `
    -StartWhenAvailable `
    -RunOnlyIfNetworkAvailable `
    -WakeToRun `
    -RestartCount 3 `
    -RestartInterval (New-TimeSpan -Minutes 5)

# Set task principal (run with highest privileges)
$principal = New-ScheduledTaskPrincipal `
    -UserId "SYSTEM" `
    -LogonType ServiceAccount `
    -RunLevel Highest

# Register the task
try {
    Register-ScheduledTask `
        -TaskName $TaskName `
        -Action $action `
        -Trigger $trigger `
        -Settings $settings `
        -Principal $principal `
        -Description "Updates WDHC Submissions Tracker dashboard with daily data" `
        -Force
    
    Write-Host "`n✅ Scheduled task created successfully!" -ForegroundColor Green
    Write-Host "Task will run daily at $RunAt" -ForegroundColor Green
    
    # Display task information
    Write-Host "`nTask Details:" -ForegroundColor Cyan
    $task = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
    if ($task) {
        Write-Host "  Name: $($task.TaskName)"
        Write-Host "  State: $($task.State)"
        Write-Host "  Last Run: $($task.LastRunTime)"
        Write-Host "  Next Run: $($task.NextRunTime)"
    }
    
    # Create a test shortcut for manual runs
    $shortcutPath = Join-Path $WorkspacePath "Run-Daily-Update.lnk"
    $WshShell = New-Object -ComObject WScript.Shell
    $Shortcut = $WshShell.CreateShortcut($shortcutPath)
    $Shortcut.TargetPath = $PowerShellPath
    $Shortcut.Arguments = "-NoProfile -ExecutionPolicy Bypass -File `"$ScriptPath`""
    $Shortcut.WorkingDirectory = $WorkspacePath
    $Shortcut.Description = "Run WDHC Daily Submissions Update"
    $Shortcut.Save()
    
    Write-Host "`n✅ Created manual run shortcut: $shortcutPath" -ForegroundColor Green
    
    # Create a simple batch file for testing
    $batchContent = @"
@echo off
echo Running WDHC Daily Submissions Update...
powershell -NoProfile -ExecutionPolicy Bypass -File "daily-submissions-update.ps1"
pause
"@
    
    $batchPath = Join-Path $WorkspacePath "run-update.bat"
    Set-Content -Path $batchPath -Value $batchContent -Encoding ASCII
    
    Write-Host "✅ Created test batch file: $batchPath" -ForegroundColor Green
    
    # Instructions
    Write-Host "`n📋 Next Steps:" -ForegroundColor Cyan
    Write-Host "1. Test the update manually by running: .\run-update.bat" -ForegroundColor White
    Write-Host "2. Check the log file: submissions-update.log" -ForegroundColor White
    Write-Host "3. The task will run automatically at $RunAt daily" -ForegroundColor White
    Write-Host "4. To modify the schedule: Task Scheduler -> Task Scheduler Library -> $TaskName" -ForegroundColor White
    
} catch {
    Write-Host "`n❌ Error creating scheduled task:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    exit 1
}

Write-Host "`nSetup completed!" -ForegroundColor Green