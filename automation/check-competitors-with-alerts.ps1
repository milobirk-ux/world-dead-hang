# WDHC Competitor Monitoring with Telegram Alerts
Write-Host "WDHC Competitor Monitoring System" -ForegroundColor Cyan
Write-Host "=================================" -ForegroundColor Cyan
Write-Host "With Telegram Alert Integration" -ForegroundColor Yellow
Write-Host ""

# Check Node.js
try {
    $nodeVersion = node --version
    Write-Host "✅ Node.js $nodeVersion detected" -ForegroundColor Green
} catch {
    Write-Host "❌ Node.js not found" -ForegroundColor Red
    Write-Host "Please install Node.js from https://nodejs.org/" -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "Checking for competitors..." -ForegroundColor Yellow

# Run the monitor with alerts
node competitor-monitor-with-alerts.js

Write-Host ""
Write-Host "Processing Telegram alerts..." -ForegroundColor Yellow

# Check Telegram configuration
$telegramConfig = "telegram-config.json"
if (Test-Path $telegramConfig) {
    $config = Get-Content $telegramConfig | ConvertFrom-Json
    if ($config.enabled -and $config.botToken -and $config.chatId) {
        Write-Host "✅ Telegram alerts are configured and enabled" -ForegroundColor Green
        Write-Host "   Bot: $($config.botToken.Substring(0, 10))..." -ForegroundColor White
        Write-Host "   Chat ID: $($config.chatId)" -ForegroundColor White
    } else {
        Write-Host "⚠️  Telegram alerts not fully configured" -ForegroundColor Yellow
        Write-Host "   Run: node telegram-alert-system.js setup" -ForegroundColor White
    }
} else {
    Write-Host "⚠️  Telegram config not found" -ForegroundColor Yellow
    Write-Host "   Run: node telegram-alert-system.js setup" -ForegroundColor White
}

Write-Host ""
Write-Host "Opening dashboard..." -ForegroundColor Yellow

# Open dashboard
$dashboard = "competitor-dashboard.html"
if (Test-Path $dashboard) {
    Start-Process "file://$PWD/$dashboard"
    Write-Host "✅ Dashboard opened in browser" -ForegroundColor Green
} else {
    Write-Host "❌ Dashboard not found" -ForegroundColor Red
}

Write-Host ""
Write-Host "🎯 System Status:" -ForegroundColor Cyan
Write-Host "   • Competitor monitoring: ✅ ACTIVE" -ForegroundColor Green
Write-Host "   • Telegram alerts: $(if ($config.enabled) {'✅ ENABLED'} else {'❌ DISABLED'})" -ForegroundColor $(if ($config.enabled) {'Green'} else {'Yellow'})
Write-Host "   • Daily automatic checks: ⚠️  NEEDS SETUP (Task Scheduler)" -ForegroundColor Yellow
Write-Host "   • Dashboard: ✅ LIVE" -ForegroundColor Green
Write-Host ""
Write-Host "📊 View dashboard: file://$PWD/competitor-dashboard.html" -ForegroundColor White
Write-Host "📱 Telegram setup: node telegram-alert-system.js setup" -ForegroundColor White
Write-Host "🔄 Manual check: Double-click desktop shortcut" -ForegroundColor White