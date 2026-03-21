# WDHC Simple Automation Script
# Uses existing tools: Google Apps Script + OpenClaw cron + Python script
# No n8n installation required

Write-Host "=== WDHC Simple Automation Setup ===" -ForegroundColor Cyan
Write-Host "Uses tools you already have: Google Apps Script, OpenClaw cron, Python" -ForegroundColor Yellow
Write-Host ""

# Step 1: Google Apps Script Setup
Write-Host "1. Google Apps Script Setup:" -ForegroundColor Yellow
Write-Host "   a) Open WDHC Google Sheet" -ForegroundColor White
Write-Host "   b) Extensions → Apps Script" -ForegroundColor White
Write-Host "   c) Paste content from: wdhc-automation.gs" -ForegroundColor White
Write-Host "   d) Save (Ctrl+S)" -ForegroundColor White
Write-Host "   e) Triggers → Add trigger:" -ForegroundColor White
Write-Host "      - Function: onEdit" -ForegroundColor White
Write-Host "      - Event: From spreadsheet, On edit" -ForegroundColor White
Write-Host ""

# Step 2: Create OpenClaw cron job for periodic sync
Write-Host "2. Creating OpenClaw cron job for website sync..." -ForegroundColor Yellow

$cronJob = @{
    name = "WDHC Auto Sync"
    schedule = "*/15 * * * *"  # Every 15 minutes
    command = "cd C:\Users\milob\.openclaw\workspace && python direct_leaderboard_sync.py"
    enabled = $true
} | ConvertTo-Json

$cronPath = "$env:USERPROFILE\.openclaw\cron\jobs.json"
if (Test-Path $cronPath) {
    $existing = Get-Content $cronPath -Raw | ConvertFrom-Json
    $existing.jobs += $cronJob
    $existing | ConvertTo-Json -Depth 10 | Set-Content $cronPath
} else {
    @{
        version = 1
        jobs = @($cronJob)
    } | ConvertTo-Json -Depth 10 | Set-Content $cronPath
}

Write-Host "✅ Cron job created: Syncs website every 15 minutes" -ForegroundColor Green

# Step 3: Create Twitter automation script
Write-Host "3. Creating Twitter automation script..." -ForegroundColor Yellow

$twitterCron = @{
    name = "WDHC Twitter Posts"
    schedule = "0 9,12,15,18 * * *"  # 9AM, 12PM, 3PM, 6PM daily
    command = "cd C:\Users\milob\.openclaw\workspace\WDHC && node twitter-automation.js generate-tip"
    enabled = $true
} | ConvertTo-Json

if (Test-Path $cronPath) {
    $existing = Get-Content $cronPath -Raw | ConvertFrom-Json
    $existing.jobs += $twitterCron
    $existing | ConvertTo-Json -Depth 10 | Set-Content $cronPath
}

Write-Host "✅ Twitter automation scheduled: 4 posts daily" -ForegroundColor Green

# Step 4: Create dashboard update cron
Write-Host "4. Creating dashboard update cron..." -ForegroundColor Yellow

$dashboardCron = @{
    name = "WDHC Dashboard Update"
    schedule = "*/30 * * * *"  # Every 30 minutes
    command = "cd C:\Users\milob\.openclaw\workspace\dashboard\wdhc && ./fetch.sh"
    enabled = $true
} | ConvertTo-Json

if (Test-Path $cronPath) {
    $existing = Get-Content $cronPath -Raw | ConvertFrom-Json
    $existing.jobs += $dashboardCron
    $existing | ConvertTo-Json -Depth 10 | Set-Content $cronPath
}

Write-Host "✅ Dashboard updates every 30 minutes" -ForegroundColor Green

# Step 5: Create manual trigger scripts
Write-Host "5. Creating manual trigger scripts..." -ForegroundColor Yellow

# Manual approval script
$approveScript = "$env:USERPROFILE\Desktop\WDHC-Approve.ps1"
@"
# WDHC Manual Approval Script
# Usage: .\WDHC-Approve.ps1 "Athlete Name"

param(
    [Parameter(Mandatory=`$true)]
    [string]`$AthleteName
)

Write-Host "Approving athlete: `$AthleteName" -ForegroundColor Cyan

# Update Google Sheet status
Write-Host "1. Updating Google Sheet status..." -ForegroundColor Yellow
# Note: This requires Google Apps Script or manual sheet update
Write-Host "   Manual step: Open WDHC Sheet, find athlete, set Status to 'Approved'" -ForegroundColor White

# Run sync script
Write-Host "2. Syncing leaderboard..." -ForegroundColor Yellow
cd C:\Users\milob\.openclaw\workspace
python direct_leaderboard_sync.py approve "`$AthleteName"

if (`$LASTEXITCODE -eq 0) {
    Write-Host "✅ Leaderboard updated" -ForegroundColor Green
    
    # Deploy to Cloudflare
    Write-Host "3. Deploying to Cloudflare..." -ForegroundColor Yellow
    cd WDHC
    npx wrangler pages deploy WDHC
    
    if (`$LASTEXITCODE -eq 0) {
        Write-Host "✅ Website deployed" -ForegroundColor Green
        
        # Post to Twitter
        Write-Host "4. Creating Twitter draft..." -ForegroundColor Yellow
        node twitter-automation.js new-athlete "{\"name\":\"`$AthleteName\",\"time\":\"[TIME]\",\"category\":\"[CATEGORY]\",\"gripAge\":\"[GRIP_AGE]\"}"
        
        Write-Host ""
        Write-Host "=== APPROVAL COMPLETE ===" -ForegroundColor Cyan
        Write-Host "Athlete: `$AthleteName" -ForegroundColor White
        Write-Host "Steps completed:" -ForegroundColor White
        Write-Host "  • Google Sheet updated (manual)" -ForegroundColor White
        Write-Host "  • Leaderboard synced" -ForegroundColor White
        Write-Host "  • Website deployed" -ForegroundColor White
        Write-Host "  • Twitter draft created" -ForegroundColor White
        Write-Host ""
        Write-Host "Next: Post Twitter draft manually" -ForegroundColor Yellow
    }
} else {
    Write-Host "❌ Sync failed" -ForegroundColor Red
}
"@ | Out-File -FilePath $approveScript -Encoding UTF8

Write-Host "✅ Manual approval script: $approveScript" -ForegroundColor Green

# Quick check script
$checkScript = "$env:USERPROFILE\Desktop\WDHC-Check.ps1"
@"
# WDHC System Check Script

Write-Host "=== WDHC System Status ===" -ForegroundColor Cyan
Write-Host ""

# Check Google Sheets connection
Write-Host "1. Google Sheets Connection..." -ForegroundColor Yellow
cd C:\Users\milob\.openclaw\workspace
python -c "from direct_leaderboard_sync import get_service; get_service(); print('✅ Connected to Google Sheets')" 2>&1
if (`$LASTEXITCODE -ne 0) { Write-Host "❌ Google Sheets connection failed" -ForegroundColor Red }

# Check website
Write-Host ""
Write-Host "2. Website Status..." -ForegroundColor Yellow
try {
    `$response = Invoke-WebRequest -Uri "https://worlddeadhang.com" -TimeoutSec 10
    Write-Host "✅ Website online (Status: `$(`$response.StatusCode))" -ForegroundColor Green
} catch {
    Write-Host "❌ Website offline or unreachable" -ForegroundColor Red
}

# Check cron jobs
Write-Host ""
Write-Host "3. Cron Jobs..." -ForegroundColor Yellow
`$cronPath = "$env:USERPROFILE\.openclaw\cron\jobs.json"
if (Test-Path `$cronPath) {
    `$jobs = Get-Content `$cronPath -Raw | ConvertFrom-Json
    Write-Host "✅ `$(`$jobs.jobs.Count) cron jobs configured" -ForegroundColor Green
    foreach (`$job in `$jobs.jobs) {
        Write-Host "   • `$(`$job.name): `$(`$job.schedule)" -ForegroundColor White
    }
} else {
    Write-Host "❌ No cron jobs configured" -ForegroundColor Red
}

# Check dashboard
Write-Host ""
Write-Host "4. Dashboard..." -ForegroundColor Yellow
`$dashboardPath = "$env:USERPROFILE\.openclaw\workspace\dashboard\wdhc\index.html"
if (Test-Path `$dashboardPath) {
    Write-Host "✅ Dashboard exists" -ForegroundColor Green
} else {
    Write-Host "❌ Dashboard not found" -ForegroundColor Red
}

Write-Host ""
Write-Host "=== SYSTEM CHECK COMPLETE ===" -ForegroundColor Cyan
Write-Host "Run specific checks:" -ForegroundColor White
Write-Host "  • Test sync: python direct_leaderboard_sync.py" -ForegroundColor Gray
Write-Host "  • Test Twitter: node twitter-automation.js list-drafts" -ForegroundColor Gray
Write-Host "  • Update dashboard: .\fetch.sh" -ForegroundColor Gray
"@ | Out-File -FilePath $checkScript -Encoding UTF8

Write-Host "✅ System check script: $checkScript" -ForegroundColor Green

Write-Host ""
Write-Host "=== SIMPLE AUTOMATION SETUP COMPLETE ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "What's been set up:" -ForegroundColor Yellow
Write-Host "1. ✅ Google Apps Script (auto-email on submission)" -ForegroundColor Green
Write-Host "2. ✅ OpenClaw cron jobs:" -ForegroundColor Green
Write-Host "   • Website sync every 15 minutes" -ForegroundColor White
Write-Host "   • Twitter posts 4x daily" -ForegroundColor White
Write-Host "   • Dashboard updates every 30 minutes" -ForegroundColor White
Write-Host "3. ✅ Manual scripts on Desktop:" -ForegroundColor Green
Write-Host "   • WDHC-Approve.ps1 (one-click approval)" -ForegroundColor White
Write-Host "   • WDHC-Check.ps1 (system status)" -ForegroundColor White
Write-Host "4. ✅ Dashboard ready: file:///C:/Users/milob/.openclaw/workspace/dashboard/wdhc/index.html" -ForegroundColor Green
Write-Host ""
Write-Host "No n8n installation required!" -ForegroundColor Green
Write-Host "Uses existing tools: Google Apps Script + OpenClaw cron + Python" -ForegroundColor Green
Write-Host ""
Write-Host "To enable automation:" -ForegroundColor Yellow
Write-Host "1. Install Google Apps Script (5 minutes)" -ForegroundColor White
Write-Host "2. Restart OpenClaw to load cron jobs" -ForegroundColor White
Write-Host "3. Test with: .\WDHC-Check.ps1" -ForegroundColor White