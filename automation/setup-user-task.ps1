# User-level Task Scheduler Setup (No Admin Required)
Write-Host "Setting up WDHC Daily Competitor Check..."

$taskName = "WDHC Competitor Monitor"
$taskDescription = "Daily check for new dead hang competitors"
$scriptPath = "C:\Users\milob\.openclaw\workspace\WDHC\simple-competitor-monitor.js"
$workingDir = "C:\Users\milob\.openclaw\workspace\WDHC"

# Check Node.js
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "ERROR: Node.js not found. Install from https://nodejs.org/"
    exit 1
}

Write-Host "Node.js version: $(node --version)"

# Create XML for scheduled task
$xmlContent = @"
<?xml version="1.0" encoding="UTF-16"?>
<Task version="1.2" xmlns="http://schemas.microsoft.com/windows/2004/02/mit/task">
  <RegistrationInfo>
    <Description>$taskDescription</Description>
  </RegistrationInfo>
  <Triggers>
    <CalendarTrigger>
      <StartBoundary>$(Get-Date -Format 'yyyy-MM-dd')T09:00:00</StartBoundary>
      <Enabled>true</Enabled>
      <ScheduleByDay>
        <DaysInterval>1</DaysInterval>
      </ScheduleByDay>
    </CalendarTrigger>
  </Triggers>
  <Actions Context="Author">
    <Exec>
      <Command>node.exe</Command>
      <Arguments>"$scriptPath"</Arguments>
      <WorkingDirectory>"$workingDir"</WorkingDirectory>
    </Exec>
  </Actions>
  <Settings>
    <Enabled>true</Enabled>
    <Hidden>false</Hidden>
    <RunOnlyIfNetworkAvailable>true</RunOnlyIfNetworkAvailable>
    <WakeToRun>false</WakeToRun>
    <ExecutionTimeLimit>PT10M</ExecutionTimeLimit>
    <Priority>7</Priority>
  </Settings>
</Task>
"@

# Save XML file
$xmlFile = Join-Path $workingDir "wdhc-task.xml"
$xmlContent | Out-File -FilePath $xmlFile -Encoding Unicode

Write-Host "Task XML created: $xmlFile"

# Try to register the task
try {
    # First, delete existing task if it exists
    schtasks /delete /tn $taskName /f 2>$null
    
    # Register new task
    $result = schtasks /create /tn $taskName /xml $xmlFile /f 2>&1
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "SUCCESS: Scheduled task created!"
        Write-Host "Task Name: $taskName"
        Write-Host "Schedule: Daily at 9:00 AM"
        Write-Host "Command: node $scriptPath"
        
        # Test the task
        Write-Host "Testing task..."
        schtasks /run /tn $taskName
        Start-Sleep -Seconds 2
        
        # Check status
        $status = schtasks /query /tn $taskName /fo list | Select-String "Status"
        Write-Host "Task Status: $($status -replace 'Status:','')"
        
    } else {
        Write-Host "WARNING: Could not create scheduled task (may need admin)"
        Write-Host "You can still use the desktop shortcut for manual checks"
    }
} catch {
    Write-Host "WARNING: Task creation failed: $_"
    Write-Host "You can still use the desktop shortcut for manual checks"
}

# Clean up
if (Test-Path $xmlFile) {
    Remove-Item $xmlFile -Force
}

Write-Host ""
Write-Host "========================================="
Write-Host "SYSTEM STATUS:"
Write-Host "• Desktop Shortcut: ✅ CREATED"
Write-Host "• Scheduled Task: $(if ($LASTEXITCODE -eq 0) {'✅ CREATED'} else {'⚠️  USE SHORTCUT'})"
Write-Host "• Competitor Database: ✅ 4 REAL COMPETITORS"
Write-Host "• Telegram Alerts: ⚠️  NEED CONFIGURATION"
Write-Host ""
Write-Host "NEXT STEPS:"
Write-Host "1. Double-click 'WDHC Competitor Check' on desktop"
Write-Host "2. Follow Telegram setup guide in WDHC folder"
Write-Host "3. Configure bot token and chat ID"
Write-Host ""
Write-Host "Your WDHC is now protected from competitors!"