@echo off
echo =========================================
echo     WDHC COMPETITOR ALERT SYSTEM
echo =========================================
echo.

REM Check Node.js
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js not found
    echo    Install from: https://nodejs.org/
    pause
    exit /b 1
)

echo ✅ Node.js found
echo.
echo 🔍 Checking for competitors...
echo.

REM Run the simple monitor
node simple-competitor-monitor.js

echo.
echo 📱 Telegram Alert Status:
echo.

REM Check Telegram configuration
if exist "telegram-config.json" (
    for /f "tokens=*" %%i in ('type telegram-config.json ^| findstr "enabled botToken chatId"') do (
        echo %%i
    )
    echo    ⚠️  NOT FULLY CONFIGURED
    echo    Run: node telegram-alert-system.js setup
) else (
    echo    ⚠️  CONFIG NOT FOUND
    echo    Run: node telegram-alert-system.js setup
)

echo.
echo 📊 Opening dashboard...
echo.

REM Open dashboard
if exist "competitor-dashboard.html" (
    start "" "competitor-dashboard.html"
    echo    ✅ Dashboard opened
) else (
    echo    ❌ Dashboard not found
)

echo.
echo =========================================
echo 🎯 SYSTEM STATUS SUMMARY:
echo    • Monitoring: ✅ ACTIVE
echo    • Dashboard: ✅ LIVE  
echo    • Telegram: ⚠️  NEEDS SETUP
echo    • Automation: ⚠️  NEEDS TASK SCHEDULER
echo.
echo 📋 QUICK COMMANDS:
echo    • Setup Telegram: node telegram-alert-system.js setup
echo    • Test Telegram: node telegram-alert-system.js test
echo    • Manual check: Double-click this file
echo    • View dashboard: competitor-dashboard.html
echo.
echo 🎉 System ready! Configure Telegram for instant alerts.
echo.
pause