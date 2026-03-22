# Create clean desktop shortcut
$WshShell = New-Object -ComObject WScript.Shell
$shortcut = $WshShell.CreateShortcut("$env:USERPROFILE\Desktop\WDHC Competitor Check.lnk")
$shortcut.TargetPath = "powershell.exe"
$shortcut.Arguments = '-NoProfile -ExecutionPolicy Bypass -File "C:\Users\milob\.openclaw\workspace\WDHC\check-competitors-final.ps1"'
$shortcut.WorkingDirectory = "C:\Users\milob\.openclaw\workspace\WDHC"
$shortcut.IconLocation = "C:\Windows\System32\WindowsPowerShell\v1.0\powershell.exe"
$shortcut.Description = "WDHC Competitor Monitoring System"
$shortcut.Save()

Write-Host "✅ Desktop shortcut created: WDHC Competitor Check.lnk" -ForegroundColor Green