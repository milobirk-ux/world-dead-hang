# Create Desktop Shortcut for WDHC Competitor Check
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "    WDHC DESKTOP SHORTCUT CREATOR" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

$desktopPath = [Environment]::GetFolderPath("Desktop")
$shortcutPath = Join-Path $desktopPath "WDHC Competitor Check.lnk"
$targetPath = "C:\Windows\System32\cmd.exe"
$workingDir = "C:\Users\milob\.openclaw\workspace\WDHC"
$arguments = "/c `"cd `"$workingDir`" && check-competitors.bat`""

Write-Host "📁 Creating shortcut on desktop..." -ForegroundColor Yellow

try {
    $WshShell = New-Object -ComObject WScript.Shell
    $shortcut = $WshShell.CreateShortcut($shortcutPath)
    $shortcut.TargetPath = $targetPath
    $shortcut.Arguments = $arguments
    $shortcut.WorkingDirectory = $workingDir
    $shortcut.Description = "WDHC Competitor Monitoring System"
    $shortcut.IconLocation = "C:\Windows\System32\SHELL32.dll,21"  # Magnifying glass icon
    $shortcut.Save()
    
    Write-Host "✅ Shortcut created successfully!" -ForegroundColor Green
    Write-Host "   Location: $shortcutPath" -ForegroundColor White
    Write-Host "   Target: $targetPath" -ForegroundColor Gray
    Write-Host "   Working directory: $workingDir" -ForegroundColor Gray
    Write-Host ""
    
    Write-Host "🎯 What the shortcut does:" -ForegroundColor White
    Write-Host "   • Checks for new competitors" -ForegroundColor Gray
    Write-Host "   • Updates dashboard" -ForegroundColor Gray
    Write-Host "   • Shows Telegram status" -ForegroundColor Gray
    Write-Host "   • Opens competitor dashboard" -ForegroundColor Gray
    Write-Host ""
    
    Write-Host "💡 Usage:" -ForegroundColor Yellow
    Write-Host "   • Double-click shortcut anytime" -ForegroundColor White
    Write-Host "   • Run daily to stay protected" -ForegroundColor White
    Write-Host "   • Configure Telegram for instant alerts" -ForegroundColor White
    Write-Host ""
    
    # Test the shortcut
    Write-Host "🔧 Testing shortcut..." -ForegroundColor Yellow
    if (Test-Path $shortcutPath) {
        Write-Host "✅ Shortcut verified" -ForegroundColor Green
    } else {
        Write-Host "⚠️  Shortcut created but not found" -ForegroundColor Yellow
    }
    
} catch {
    Write-Host "❌ Error creating shortcut: $_" -ForegroundColor Red
}

Write-Host ""
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "🎯 NEXT STEPS:" -ForegroundColor Cyan
Write-Host "   1. Double-click the desktop shortcut" -ForegroundColor White
Write-Host "   2. Configure Telegram alerts" -ForegroundColor White
Write-Host "   3. Set up automatic daily checks" -ForegroundColor White
Write-Host ""
Write-Host "📋 Files in WDHC folder:" -ForegroundColor Gray
Write-Host "   • check-competitors.bat - Main checker" -ForegroundColor Gray
Write-Host "   • TELEGRAM-SETUP-GUIDE.md - Setup instructions" -ForegroundColor Gray
Write-Host "   • competitor-dashboard.html - Live dashboard" -ForegroundColor Gray
Write-Host "   • setup-windows-task.ps1 - Automatic scheduler" -ForegroundColor Gray
Write-Host ""
Write-Host "🎉 Ready to protect WDHC from competitors!" -ForegroundColor Green
Write-Host ""
pause