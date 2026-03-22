# Update desktop shortcut to use alert system
$WshShell = New-Object -ComObject WScript.Shell
$shortcutPath = "$env:USERPROFILE\Desktop\Check WDHC Competitors.lnk"

if (Test-Path $shortcutPath) {
    $Shortcut = $WshShell.CreateShortcut($shortcutPath)
    $Shortcut.TargetPath = "powershell.exe"
    $Shortcut.Arguments = '-NoProfile -ExecutionPolicy Bypass -File "C:\Users\milob\.openclaw\workspace\WDHC\check-competitors-with-alerts.ps1"'
    $Shortcut.WorkingDirectory = "C:\Users\milob\.openclaw\workspace\WDHC"
    $Shortcut.IconLocation = "C:\Windows\System32\WindowsPowerShell\v1.0\powershell.exe"
    $Shortcut.Description = "WDHC Competitor Monitor with Telegram Alerts"
    $Shortcut.Save()
    
    Write-Host "✅ Desktop shortcut updated to use alert system" -ForegroundColor Green
} else {
    Write-Host "❌ Shortcut not found at $shortcutPath" -ForegroundColor Red
}