# Create desktop shortcut for WDHC Competitor Monitor
$WshShell = New-Object -ComObject WScript.Shell
$Shortcut = $WshShell.CreateShortcut("$env:USERPROFILE\Desktop\Check WDHC Competitors.lnk")
$Shortcut.TargetPath = "powershell.exe"
$Shortcut.Arguments = '-NoProfile -ExecutionPolicy Bypass -File "C:\Users\milob\.openclaw\workspace\WDHC\check-competitors-fixed.ps1"'
$Shortcut.WorkingDirectory = "C:\Users\milob\.openclaw\workspace\WDHC"
$Shortcut.IconLocation = "C:\Windows\System32\WindowsPowerShell\v1.0\powershell.exe"
$Shortcut.Description = "WDHC Competitor Monitor"
$Shortcut.Save()

Write-Host "✅ Desktop shortcut created: Check WDHC Competitors.lnk" -ForegroundColor Green