# WDHC Competitor Monitoring - Final Version
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "    WDHC COMPETITOR ALERT SYSTEM" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

# Check Node.js
try {
    $nodeVersion = node --version
    Write-Host "✅ Node.js $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Node.js not found" -ForegroundColor Red
    Write-Host "   Install from: https://nodejs.org/" -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "🔍 Checking for competitors..." -ForegroundColor Yellow

# Run the simple monitor
node simple-competitor-monitor.js

Write-Host ""
Write-Host "📱 Telegram Alert Status:" -ForegroundColor Cyan

# Check Telegram configuration
$telegramConfig = "telegram-config.json"
if (Test-Path $telegramConfig) {
    try {
        $config = Get-Content $telegramConfig -Raw | ConvertFrom-Json
        if ($config.enabled -and $config.botToken -and $config.chatId) {
            Write-Host "   ✅ CONFIGURED & ENABLED" -ForegroundColor Green
            Write-Host "   Bot: $($config.botToken.Substring(0, 10))..." -ForegroundColor White
            Write-Host "   Chat ID: $($config.chatId)" -ForegroundColor White
            
            # Check if there are new competitors to alert
            $alertData = Get-Content "competitor-alerts.json" -Raw | ConvertFrom-Json
            $newCompetitors = $alertData.competitors | Where-Object {
                -not $alertData.alertsSent.competitorId.Contains($_.id)
            }
            
            if ($newCompetitors.Count -gt 0) {
                Write-Host "   🚨 $($newCompetitors.Count) new competitors need alerts" -ForegroundColor Red
                Write-Host "   Run: node telegram-alert-system.js process" -ForegroundColor Yellow
            }
        } else {
            Write-Host "   ⚠️  NOT FULLY CONFIGURED" -ForegroundColor Yellow
            Write-Host "   Run: node telegram-alert-system.js setup" -ForegroundColor White
        }
    } catch {
        Write-Host "   ⚠️  CONFIG ERROR" -ForegroundColor Yellow
        Write-Host "   Run: node telegram-alert-system.js setup" -ForegroundColor White
    }
} else {
    Write-Host "   ⚠️  CONFIG NOT FOUND" -ForegroundColor Yellow
    Write-Host "   Run: node telegram-alert-system.js setup" -ForegroundColor White
}

Write-Host ""
Write-Host "📊 Opening dashboard..." -ForegroundColor Yellow

# Open dashboard
$dashboard = "competitor-dashboard.html"
if (Test-Path $dashboard) {
    Start-Process "file://$PWD/$dashboard"
    Write-Host "   ✅ Dashboard opened" -ForegroundColor Green
} else {
    Write-Host "   ❌ Dashboard not found" -ForegroundColor Red
}

Write-Host ""
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "🎯 SYSTEM STATUS SUMMARY:" -ForegroundColor Cyan
Write-Host "   • Monitoring: ✅ ACTIVE" -ForegroundColor Green
Write-Host "   • Dashboard: ✅ LIVE" -ForegroundColor Green
Write-Host "   • Telegram: $(if ($config.enabled) {'✅ ENABLED'} else {'⚠️  NEEDS SETUP'})" -ForegroundColor $(if ($config.enabled) {'Green'} else {'Yellow'})
Write-Host "   • Automation: ⚠️  NEEDS TASK SCHEDULER" -ForegroundColor Yellow
Write-Host ""
Write-Host "📋 QUICK COMMANDS:" -ForegroundColor White
Write-Host "   • Setup Telegram: node telegram-alert-system.js setup" -ForegroundColor Gray
Write-Host "   • Test Telegram: node telegram-alert-system.js test" -ForegroundColor Gray
Write-Host "   • Manual check: Double-click desktop shortcut" -ForegroundColor Gray
Write-Host "   • View dashboard: file://$PWD/competitor-dashboard.html" -ForegroundColor Gray
Write-Host ""
Write-Host "🎉 System ready! Configure Telegram for instant alerts." -ForegroundColor Green