# Simple Desktop Shortcut Creator for WDHC
Write-Host "Creating WDHC Desktop Shortcut..."

$desktop = [Environment]::GetFolderPath("Desktop")
$shortcut = Join-Path $desktop "WDHC Competitor Check.lnk"
$target = "C:\Windows\System32\cmd.exe"
$workingDir = "C:\Users\milob\.openclaw\workspace\WDHC"
$arguments = "/c `"cd `"$workingDir`" && check-competitors.bat`""

try {
    $shell = New-Object -ComObject WScript.Shell
    $link = $shell.CreateShortcut($shortcut)
    $link.TargetPath = $target
    $link.Arguments = $arguments
    $link.WorkingDirectory = $workingDir
    $link.Description = "WDHC Competitor Monitoring System"
    $link.IconLocation = "C:\Windows\System32\SHELL32.dll,21"
    $link.Save()
    
    Write-Host "SUCCESS: Shortcut created on desktop"
    Write-Host "Location: $shortcut"
    
    # Test it
    if (Test-Path $shortcut) {
        Write-Host "Shortcut verified - ready to use"
    }
} catch {
    Write-Host "ERROR: $($_.Exception.Message)"
}

Write-Host ""
Write-Host "Next: Double-click the desktop shortcut to check competitors"
Write-Host "Then configure Telegram alerts for instant notifications"